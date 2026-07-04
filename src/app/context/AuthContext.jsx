import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

import {
    clearSession,
    getJwtExpiresAt,
    getSessionId,
    getSessionJwt,
    getSessionUserId,
    updateSession
} from '../../services/SessionService'
import APIUtility, { SESSION_INVALID_EVENT } from '../../utils/APIUtility'
import { getBrowserMetadata } from '../../utils/BrowserUtility'
import { SESSION_STORAGE_KEYS } from '../constants/authConstants'

const AUTH_FUNCTION = '/auth-service'

/* Re-mint the session JWT when it has less than this many seconds of life
 * left. With a 1h server-side TTL and a 10-minute floor we get ~5 silent
 * refreshes per active hour, well under the rate the auth-service can
 * handle and small enough that a tab waking from sleep almost always still
 * holds a usable token. */
const JWT_REFRESH_FLOOR_SECONDS = 600
const JWT_REFRESH_INTERVAL_MS = 60 * 1000
/* Visibility wake-up probe throttle. Tab focus / visibility events fire
 * dozens of times in a normal session — we only need one whoami probe per
 * 5 minutes to (a) confirm the session is still alive and (b) trigger the
 * server-side cookie re-issue that keeps the sliding 30-day window fresh. */
const VISIBILITY_PROBE_THROTTLE_MS = 5 * 60 * 1000

/**
 * Authentication context providing sign-in, sign-up, sign-out, session restoration,
 * credential updates, and profile management to the entire component tree.
 */
const AuthContext = createContext()
/** Hook to access the authentication context (user, loading, error, auth methods). */
export function useAuth() {
    return useContext(AuthContext)
}
// ── Private session helpers ───────────────────────────────────────────
function clearAllSessionData() {
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.CACHED_PLANTS)
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.USER_ROLE)
    clearSession()
}

/** Stores a freshly-minted JWT in memory and propagates it to the realtime channel. */
function applyJwt(jwt, expiresInSeconds) {
    if (!jwt) return
    const expiresAt = expiresInSeconds ? Date.now() + expiresInSeconds * 1000 : 0
    updateSession({ expiresAt, jwt })
}

/** Re-mints the session JWT against the current users_sessions row. Returns
 *  true on success. The cookie carries the actual session credentials, so
 *  refresh-token works whenever the cookie is present even if memory state
 *  is empty. */
async function refreshJwtIfPossible() {
    const userId = getSessionUserId()
    const sessionId = getSessionId()
    try {
        const { json, res } = await APIUtility.post(`${AUTH_FUNCTION}/refresh-token`, { sessionId, userId })
        if (!res.ok || !json?.jwt) return false
        applyJwt(json.jwt, json.expiresIn)
        return true
    } catch {
        return false
    }
}

/**
 * Asks the server who the cookie identifies. Returns the userId on success
 * or null. AuthContext uses this in place of the old localStorage probe.
 */
async function whoami() {
    const hasMemory = Boolean(getSessionUserId())
    const hasCookie =
        typeof document !== 'undefined' && document.cookie.split(';').some((p) => p.trim().startsWith('smyrna_auth=1'))
    if (!hasMemory && !hasCookie) return null
    try {
        const { json, res } = await APIUtility.post(`${AUTH_FUNCTION}/whoami`)
        if (!res.ok || !json?.userId) return null
        return json.userId
    } catch {
        return null
    }
}
// ── Provider ──────────────────────────────────────────────────────────
/**
 * Authentication provider that wraps the app and supplies auth state and methods.
 * Restores sessions on mount, manages DB session records, and lazy-loads user profiles after sign-in.
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const profileTimerRef = useRef(null)

    const restoreSession = useCallback(async () => {
        setLoading(true)
        setError(null)
        const userId = await whoami()
        if (!userId) {
            clearAllSessionData()
            setUser(null)
            setLoading(false)
            return false
        }
        updateSession({ userId })
        try {
            const { json } = await APIUtility.post(`${AUTH_FUNCTION}/restore-session`, { userId })
            if (json.success && json.user) {
                if (json.jwt) applyJwt(json.jwt, json.expiresIn)
                else await refreshJwtIfPossible()
                setUser(json.user)
                window.dispatchEvent(new CustomEvent('authSuccess', { detail: { userId } }))
                setLoading(false)
                return true
            }
            clearAllSessionData()
            setUser(null)
            setLoading(false)
            return false
        } catch {
            clearAllSessionData()
            setUser(null)
            setLoading(false)
            return false
        }
    }, [])

    useEffect(() => {
        setLoading(true)
        restoreSession().finally(() => setLoading(false))
        return () => clearTimeout(profileTimerRef.current)
    }, [restoreSession])

    /* The edge-function client (APIUtility) fires this event when the
     * server returns 401 or when client-side credentials are missing. Both
     * mean the current session is no longer usable — drop user state so the
     * router falls back to the login screen and pollers (OperationsView schedule
     * probe, presence heartbeat, etc.) stop hammering authenticated
     * endpoints. clearAllSessionData wipes the stale credentials so the
     * next render starts from a clean slate. */
    useEffect(() => {
        const handleSessionInvalid = () => {
            clearAllSessionData()
            setUser(null)
            setLoading(false)
        }
        window.addEventListener(SESSION_INVALID_EVENT, handleSessionInvalid)
        return () => window.removeEventListener(SESSION_INVALID_EVENT, handleSessionInvalid)
    }, [])

    /* Silent token refresh — only runs when a JWT was actually minted at
     * login (which requires SUPABASE_JWT_SECRET on the edge function side).
     * If no JWT is present we skip entirely; the app falls through to the
     * anon key like it always has, and we don't spam refresh-token. */
    useEffect(() => {
        const tick = () => {
            const existingJwt = getSessionJwt()
            if (!existingJwt) return
            const secondsLeft = (getJwtExpiresAt() - Date.now()) / 1000
            if (secondsLeft > JWT_REFRESH_FLOOR_SECONDS) return
            refreshJwtIfPossible()
        }
        const interval = setInterval(tick, JWT_REFRESH_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [])

    /* Visibility wake-up probe. Catches two cases the JWT-refresh tick can't:
     *   1. Tab was hidden / laptop was closed for hours/days. On return, we
     *      need to verify the session is still alive BEFORE the user clicks
     *      something and gets a confusing broken-UI experience.
     *   2. Sliding cookie refresh — every successful whoami re-issues the
     *      session cookies with a fresh 30-day Max-Age, so any user who
     *      opens the app at least once a month effectively never has to
     *      re-authenticate due to cookie expiry.
     *
     * On a 401 we manually dispatch SESSION_INVALID_EVENT because whoami is
     * in APIUtility's PUBLIC_AUTH_PATHS allowlist — auto-dispatch is
     * suppressed for that path to avoid bouncing the LoginView itself when
     * a stale whoami fires after sign-out. */
    useEffect(() => {
        let lastProbeAt = 0
        const probe = async () => {
            if (typeof document === 'undefined') return
            if (document.visibilityState !== 'visible') return
            const hasCookie = document.cookie.split(';').some((part) => part.trim().startsWith('smyrna_auth=1'))
            const hasMemory = Boolean(getSessionUserId())
            if (!hasCookie && !hasMemory) return
            if (Date.now() - lastProbeAt < VISIBILITY_PROBE_THROTTLE_MS) return
            lastProbeAt = Date.now()
            const userId = await whoami()
            if (!userId) {
                window.dispatchEvent(new CustomEvent(SESSION_INVALID_EVENT, { detail: { reason: 'visibility-probe' } }))
            }
        }
        document.addEventListener('visibilitychange', probe)
        window.addEventListener('focus', probe)
        return () => {
            document.removeEventListener('visibilitychange', probe)
            window.removeEventListener('focus', probe)
        }
    }, [])

    const loadUserProfile = useCallback(async (userId) => {
        if (!userId) return
        try {
            const { json } = await APIUtility.post(`${AUTH_FUNCTION}/load-profile`, { userId })
            if (json.profile) {
                setUser((cu) => ({ ...cu, profile: json.profile }))
            }
        } catch {}
    }, [])

    /**
     * Records the just-signed-in user. Cookies were already set by the
     * server in the sign-in / sign-up response. The body also carries
     * `sessionId` so localhost-dev (where the cookie can't cross origins)
     * still has memory credentials to fall back on.
     */
    const acceptAuthResponse = useCallback((json) => {
        setUser(json)
        updateSession({ sessionId: json?.sessionId || null, userId: json?.id || null })
        if (json?.jwt) applyJwt(json.jwt, json.expiresIn)
    }, [])

    const signIn = useCallback(
        async (email, password) => {
            setError(null)
            setLoading(true)
            try {
                const { browser, os, device, userAgent } = getBrowserMetadata()
                const { res, json } = await APIUtility.post(`${AUTH_FUNCTION}/sign-in`, {
                    browser,
                    device,
                    email,
                    os,
                    password,
                    userAgent
                })
                if (!res.ok) {
                    const errorMsg = json?.error || json?.message || 'Invalid email or password'
                    setError(errorMsg)
                    setLoading(false)
                    throw new Error(errorMsg)
                }
                if (!json?.id) {
                    const errorMsg = 'Sign in failed - invalid response from server'
                    setError(errorMsg)
                    setLoading(false)
                    throw new Error(errorMsg)
                }
                acceptAuthResponse(json)
                setLoading(false)
                window.dispatchEvent(new CustomEvent('authSuccess', { detail: { userId: json.id } }))
                profileTimerRef.current = setTimeout(() => loadUserProfile(json.id).catch(() => {}), 2000)
                return json
            } catch (e) {
                const errorMsg = e.message || 'An unknown error occurred during sign in'
                setError(errorMsg)
                setLoading(false)
                throw new Error(errorMsg)
            }
        },
        [acceptAuthResponse, loadUserProfile]
    )
    const signUp = useCallback(
        async (email, password, firstName, lastName) => {
            setError(null)
            setLoading(true)
            try {
                const { browser, os, device, userAgent } = getBrowserMetadata()
                const { res, json } = await APIUtility.post(`${AUTH_FUNCTION}/sign-up`, {
                    browser,
                    device,
                    email,
                    firstName,
                    lastName,
                    os,
                    password,
                    userAgent
                })
                if (!res.ok) {
                    setError(json.error || 'Sign up failed')
                    setLoading(false)
                    throw new Error(json.error || 'Sign up failed')
                }
                acceptAuthResponse(json)
                setLoading(false)
                window.dispatchEvent(new CustomEvent('authSuccess', { detail: { userId: json.id } }))
                return json
            } catch (e) {
                setError(e.message)
                setLoading(false)
                throw e
            }
        },
        [acceptAuthResponse]
    )
    const signOut = useCallback(async () => {
        clearTimeout(profileTimerRef.current)
        // sign-out clears the cookies server-side and deletes the row tied
        // to the cookie. The body-side sessionId argument is only needed
        // on the localhost-dev fallback path; we send it when present.
        const sessionId = getSessionId()
        await APIUtility.post(`${AUTH_FUNCTION}/sign-out`, sessionId ? { sessionId } : undefined).catch(() => {})
        clearAllSessionData()
        setUser(null)
        window.dispatchEvent(new CustomEvent('authSignOut'))
        return true
    }, [])
    const updateProfile = useCallback(async (userId, firstName, lastName, plantCode) => {
        setError(null)
        setLoading(true)
        try {
            const { res, json } = await APIUtility.post(`${AUTH_FUNCTION}/update-profile`, {
                firstName,
                lastName,
                plantCode,
                userId
            })
            if (!res.ok || !json.success) {
                setError(json.error || 'Update profile failed')
                setLoading(false)
                throw new Error(json.error || 'Update profile failed')
            }
            setUser((cu) => ({ ...cu, profile: json.profile }))
            setLoading(false)
            return true
        } catch (e) {
            setError(e.message)
            setLoading(false)
            throw e
        }
    }, [])
    const updateEmail = useCallback(async (userId, newEmail) => {
        const { res, json } = await APIUtility.post(`${AUTH_FUNCTION}/update-email`, { email: newEmail, userId })
        if (!res.ok) throw new Error(json.error || 'Update email failed')
        setUser((cu) => ({ ...cu, email: newEmail.trim().toLowerCase() }))
        return true
    }, [])
    const updatePassword = useCallback(async (userId, newPassword) => {
        const { res, json } = await APIUtility.post(`${AUTH_FUNCTION}/update-password`, {
            password: newPassword,
            userId
        })
        if (!res.ok) throw new Error(json.error || 'Update password failed')
        return true
    }, [])
    /** Server-side current-password verification — keeps hashes off the client. */
    const verifyPassword = useCallback(async (userId, currentPassword) => {
        const { res, json } = await APIUtility.post(`${AUTH_FUNCTION}/verify-password`, { currentPassword, userId })
        if (!res.ok) throw new Error(json.error || 'Password verification failed')
        return true
    }, [])
    return (
        <AuthContext.Provider
            value={{
                error,
                isAuthenticated: !!user,
                loadUserProfile,
                loading,
                restoreSession,
                signIn,
                signOut,
                signUp,
                updateEmail,
                updatePassword,
                updateProfile,
                user,
                verifyPassword
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}
