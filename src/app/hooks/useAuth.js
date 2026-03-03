import { useEffect } from 'react'

/**
 * Manages authentication session lifecycle on app mount.
 * Restores sessions from storage, loads user roles, handles sign-in/sign-out events,
 * and gates guest-only users to a restricted view.
 */
export function useAuth(setUserId, setIsGuestOnly, setRolesLoaded, setSelectedView) {
    useEffect(() => {
        const initSession = async () => {
            const { AuthService } = await import('../../services/AuthService')
            if (AuthService.hasStoredSession()) {
                const restored = await AuthService.restoreSession()
                if (restored && AuthService.currentUser?.userId) {
                    setUserId(AuthService.currentUser.userId)
                }
            }
        }

        const handleAuthSuccess = (event) => {
            const userId =
                event.detail?.userId || localStorage.getItem('smyrna_session') || sessionStorage.getItem('userId')
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
    }, [setUserId, setIsGuestOnly, setRolesLoaded, setSelectedView])
}
