import { useEffect } from 'react'

import { getSessionUserId } from '../../services/SessionService'
import { SESSION_INVALID_EVENT } from '../../utils/APIUtility'
import { SESSION_STORAGE_KEYS } from '../constants/authConstants'

const safeSessionStorageRemove = (key) => {
    try {
        sessionStorage.removeItem(key)
    } catch {}
}

const safeSessionStorageSet = (key, value) => {
    try {
        sessionStorage.setItem(key, value)
    } catch {}
}

/**
 * Manages authentication session lifecycle on app mount.
 *
 * Mirrors three flavors of "user is no longer signed in" into App.jsx's local
 * `userId` state so the router falls back to LoginView immediately instead of
 * letting the broken view tree render against a dead session:
 *   - `authSignOut`               — user clicked Sign Out (clean)
 *   - `authSuccess`               — user just signed in (rehydrate userId)
 *   - `SESSION_INVALID_EVENT`     — server rejected the session OR client
 *                                   credentials are missing mid-session
 *                                   (APIUtility fires this on any 401 from a
 *                                   non-public endpoint or on missing-cookie
 *                                   pre-flight bail)
 *
 * Without the SESSION_INVALID_EVENT listener, AuthContext.user goes to null
 * but App.jsx's `userId` keeps its stale value, so views keep rendering and
 * keep hitting authenticated endpoints — every call 401s, nothing works, and
 * the only escape is a hard refresh.
 *
 * @param {Function} setSessionChecked - Called with `true` once the initial session restore attempt finishes.
 */
export function useAuthSession(setUserId, setIsGuestOnly, setRolesLoaded, setSelectedView, setSessionChecked) {
    useEffect(() => {
        const initSession = () => {
            const userId = getSessionUserId()
            if (userId) {
                setUserId(userId)
                // Successfully restored — wipe any stale "session expired"
                // banner so it doesn't show on the next forced logout.
                safeSessionStorageRemove(SESSION_STORAGE_KEYS.SESSION_EXPIRED_BANNER)
            }
            setSessionChecked(true)
        }
        const handleAuthSuccess = (event) => {
            const userId = event.detail?.userId || getSessionUserId()
            if (userId) {
                setUserId(userId)
                safeSessionStorageRemove(SESSION_STORAGE_KEYS.SESSION_EXPIRED_BANNER)
            }
        }
        const handleSignOut = () => {
            // Explicit sign-out is intentional, not an expiry — clear any
            // pending banner so LoginView doesn't tell the user their
            // session expired when they just clicked Sign Out.
            safeSessionStorageRemove(SESSION_STORAGE_KEYS.SESSION_EXPIRED_BANNER)
            setUserId(null)
            setSelectedView({ initialStatusFilter: null, view: 'Dashboard' })
            setIsGuestOnly(false)
            setRolesLoaded(false)
        }
        const handleSessionInvalid = () => {
            // Set the one-shot banner flag BEFORE clearing user state so
            // LoginView can pick it up on its very next mount.
            safeSessionStorageSet(SESSION_STORAGE_KEYS.SESSION_EXPIRED_BANNER, '1')
            setUserId(null)
            setSelectedView({ initialStatusFilter: null, view: 'Dashboard' })
            setIsGuestOnly(false)
            setRolesLoaded(false)
            // Mark session-checked so App.jsx renders LoginView immediately
            // instead of a blank screen waiting for the initial probe.
            setSessionChecked(true)
        }
        initSession()
        window.addEventListener('authSuccess', handleAuthSuccess)
        window.addEventListener('authSignOut', handleSignOut)
        window.addEventListener(SESSION_INVALID_EVENT, handleSessionInvalid)
        return () => {
            window.removeEventListener('authSuccess', handleAuthSuccess)
            window.removeEventListener('authSignOut', handleSignOut)
            window.removeEventListener(SESSION_INVALID_EVENT, handleSessionInvalid)
        }
    }, [setUserId, setIsGuestOnly, setRolesLoaded, setSelectedView, setSessionChecked])
}
