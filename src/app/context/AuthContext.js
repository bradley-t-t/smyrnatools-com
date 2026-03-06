import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { supabase } from '../../services/DatabaseService'
import APIUtility from '../../utils/APIUtility'
import { SESSION_STORAGE_KEYS } from '../constants/auth'
import { getBrowserMetadata } from '../utils/BrowserDetection'

const AUTH_FUNCTION = '/auth-service'
const SESSION_EXPIRY_DAYS = 2

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

function generateSessionId() {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

function storeUserId(userId) {
    sessionStorage.setItem(SESSION_STORAGE_KEYS.USER_ID, userId)
    localStorage.setItem(SESSION_STORAGE_KEYS.SESSION_KEY, userId)
}

function clearAllSessionData() {
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.USER_ID)
    localStorage.removeItem(SESSION_STORAGE_KEYS.SESSION_KEY)
    localStorage.removeItem(SESSION_STORAGE_KEYS.SESSION_ID)
    localStorage.removeItem(SESSION_STORAGE_KEYS.CACHED_PLANTS)
    localStorage.removeItem(SESSION_STORAGE_KEYS.USER_ROLE)
}

function getStoredUserId() {
    return (
        sessionStorage.getItem(SESSION_STORAGE_KEYS.USER_ID) ||
        localStorage.getItem(SESSION_STORAGE_KEYS.SESSION_KEY) ||
        null
    )
}

/** Creates a database-tracked session record with browser metadata. */
async function createDbSession(userId) {
    const sessionId = generateSessionId()
    const { browser, os, device, userAgent } = getBrowserMetadata()
    const now = new Date().toISOString()

    try {
        const { error } = await supabase.from('users_sessions').upsert(
            {
                browser,
                created_at: now,
                device,
                id: sessionId,
                last_active: now,
                os,
                user_agent: userAgent,
                user_id: userId
            },
            { onConflict: 'id' }
        )

        if (!error) {
            localStorage.setItem(SESSION_STORAGE_KEYS.SESSION_ID, sessionId)
        }
    } catch {}

    storeUserId(userId)
}

/**
 * Validates the current session against the database.
 * Expires sessions older than the configured threshold and refreshes the last_active timestamp.
 */
async function validateDbSession() {
    const userId = getStoredUserId()
    if (!userId) return { userId: null, valid: false }

    const sessionId = localStorage.getItem(SESSION_STORAGE_KEYS.SESSION_ID)
    if (!sessionId) return { userId, valid: true }

    try {
        const { data, error } = await supabase
            .from('users_sessions')
            .select('id, last_active')
            .eq('id', sessionId)
            .eq('user_id', userId)
            .maybeSingle()

        if (error || !data) return { userId, valid: true }

        const lastActive = new Date(data.last_active)
        const expiryThreshold = new Date()
        expiryThreshold.setDate(expiryThreshold.getDate() - SESSION_EXPIRY_DAYS)

        if (lastActive < expiryThreshold) {
            clearAllSessionData()
            return { userId: null, valid: false }
        }

        // Fire-and-forget last_active refresh
        supabase
            .from('users_sessions')
            .update({ last_active: new Date().toISOString() })
            .eq('id', sessionId)
            .then(() => {})
            .catch(() => {})
        return { userId, valid: true }
    } catch {
        return { userId, valid: true }
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

    const restoreSession = useCallback(async () => {
        setLoading(true)
        setError(null)

        const { valid, userId } = await validateDbSession()
        if (!valid || !userId) {
            clearAllSessionData()
            setUser(null)
            setLoading(false)
            return false
        }

        try {
            const sessionId = localStorage.getItem(SESSION_STORAGE_KEYS.SESSION_ID)
            const { json } = await APIUtility.post(`${AUTH_FUNCTION}/restore-session`, { userId, sessionId })
            if (json.success && json.user) {
                setUser(json.user)
                storeUserId(userId)
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
    }, [restoreSession])

    const loadUserProfile = useCallback(async (userId) => {
        if (!userId) return
        try {
            const sessionId = localStorage.getItem(SESSION_STORAGE_KEYS.SESSION_ID)
            const { json } = await APIUtility.post(`${AUTH_FUNCTION}/load-profile`, { userId, sessionId })
            if (json.profile) {
                setUser((cu) => ({ ...cu, profile: json.profile }))
            }
        } catch {}
    }, [])

    const signIn = useCallback(
        async (email, password) => {
            setError(null)
            setLoading(true)
            try {
                const { res, json } = await APIUtility.post(`${AUTH_FUNCTION}/sign-in`, { email, password })

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

                setUser(json)
                await createDbSession(json.id)
                setLoading(false)

                window.dispatchEvent(new CustomEvent('authSuccess', { detail: { userId: json.id } }))
                setTimeout(() => loadUserProfile(json.id).catch(() => {}), 2000)
                return json
            } catch (e) {
                const errorMsg = e.message || 'An unknown error occurred during sign in'
                setError(errorMsg)
                setLoading(false)
                throw new Error(errorMsg)
            }
        },
        [loadUserProfile]
    )

    const signUp = useCallback(async (email, password, firstName, lastName) => {
        setError(null)
        setLoading(true)
        try {
            const { res, json } = await APIUtility.post(`${AUTH_FUNCTION}/sign-up`, {
                email,
                firstName,
                lastName,
                password
            })
            if (!res.ok) {
                setError(json.error || 'Sign up failed')
                setLoading(false)
                throw new Error(json.error || 'Sign up failed')
            }
            setUser(json)
            await createDbSession(json.id)
            setLoading(false)

            window.dispatchEvent(new CustomEvent('authSuccess', { detail: { userId: json.id } }))
            return json
        } catch (e) {
            setError(e.message)
            setLoading(false)
            throw e
        }
    }, [])

    const signOut = useCallback(async () => {
        const sessionId = localStorage.getItem(SESSION_STORAGE_KEYS.SESSION_ID)
        if (sessionId) {
            try {
                await supabase.from('users_sessions').delete().eq('id', sessionId)
            } catch {}
        }

        await APIUtility.post(`${AUTH_FUNCTION}/sign-out`).catch(() => {})
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
