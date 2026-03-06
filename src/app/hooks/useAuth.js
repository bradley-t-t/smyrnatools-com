import { useEffect } from 'react'

import { SESSION_STORAGE_KEYS } from '../constants/auth'
/**
 * Manages authentication session lifecycle on app mount.
 * Listens for sign-in/sign-out events dispatched by AuthContext
 * and gates guest-only users to a restricted view.
 * @param {Function} setSessionChecked - Called with `true` once the initial session restore attempt finishes.
 */
export function useAuthSession(setUserId, setIsGuestOnly, setRolesLoaded, setSelectedView, setSessionChecked) {
    useEffect(() => {
        const initSession = () => {
            const userId =
                sessionStorage.getItem(SESSION_STORAGE_KEYS.USER_ID) ||
                localStorage.getItem(SESSION_STORAGE_KEYS.SESSION_KEY)
            if (userId) setUserId(userId)
            setSessionChecked(true)
        }
        const handleAuthSuccess = (event) => {
            const userId =
                event.detail?.userId ||
                sessionStorage.getItem(SESSION_STORAGE_KEYS.USER_ID) ||
                localStorage.getItem(SESSION_STORAGE_KEYS.SESSION_KEY)
            if (userId) setUserId(userId)
        }
        const handleSignOut = () => {
            setUserId(null)
            setSelectedView({ initialStatusFilter: null, view: 'Dashboard' })
            setIsGuestOnly(false)
            setRolesLoaded(false)
        }
        initSession()
        window.addEventListener('authSuccess', handleAuthSuccess)
        window.addEventListener('authSignOut', handleSignOut)
        return () => {
            window.removeEventListener('authSuccess', handleAuthSuccess)
            window.removeEventListener('authSignOut', handleSignOut)
        }
    }, [setUserId, setIsGuestOnly, setRolesLoaded, setSelectedView, setSessionChecked])
}
