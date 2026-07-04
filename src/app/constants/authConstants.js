/** Centralized storage key constants for non-credential cached values.
 *  Session credentials (user id, session id, JWT) live in SessionService and
 *  are intentionally never persisted to sessionStorage. */
export const SESSION_STORAGE_KEYS = {
    CACHED_PLANTS: 'cachedPlants',
    /** One-shot flag set when a mid-session 401 / missing-credential event
     *  bounces the user to LoginView. LoginView consumes + clears it on
     *  mount and shows "Your session expired" so the user understands why
     *  they were just redirected. Cleared on explicit sign-out and on
     *  successful re-authentication. */
    SESSION_EXPIRED_BANNER: 'sessionExpiredBanner',
    USER_ROLE: 'userRole'
}
