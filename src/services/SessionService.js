/**
 * In-memory store for the active user's session credentials and JWT.
 *
 * Session authentication primarily rides on HttpOnly cookies set by
 * auth-service. The browser sends them automatically on every request to
 * `db.smyrnatools.com` (via `credentials: 'include'`), so the session id
 * never enters JavaScript. The only thing JS has is a non-HttpOnly
 * `smyrna_auth=1` flag cookie used as a fast "probably-logged-in" hint.
 *
 * Memory-held `userId` is still useful for read-only display (Sentry user
 * scoping, "createdBy" stamps, etc.). It is populated by AuthContext on
 * boot via `/auth-service/whoami` and cleared on sign-out — NOT persisted.
 * If the tab is reloaded, AuthContext re-derives it from the cookie.
 *
 * The header/body credential surface (`__sessionUserId` / `__sessionId`,
 * `X-User-Id` / `X-Session-Id`) is retained for the localhost-dev path
 * where the cookie can't cross origins. It only gets populated when sign-in
 * explicitly returns a sessionId in the body and the caller asks
 * SessionService to remember it.
 */

// One-time cleanup: previous versions stored the session id and user id in
// localStorage. Cookies now own the session; the lingering keys would still
// satisfy the old "has-credentials" heuristic and confuse the new flow.
try {
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem('smyrnaSessionUserId')
        window.localStorage.removeItem('smyrnaSessionId')
    }
} catch {}

let currentJwt = null
let currentJwtExpiresAt = 0
let currentSessionUserId = null
let currentSessionId = null

let realtimeAuthApplier = null

/** Registers the realtime-auth applier (DatabaseService wires this up at module load). */
export const registerRealtimeAuthApplier = (applier) => {
    realtimeAuthApplier = typeof applier === 'function' ? applier : null
    if (realtimeAuthApplier) realtimeAuthApplier(currentJwt)
}

const applyRealtimeAuth = () => {
    if (realtimeAuthApplier) {
        try {
            realtimeAuthApplier(currentJwt)
        } catch {}
    }
}

/**
 * Updates any subset of the session fields. Pass an explicit `null`/`0` to
 * clear an individual field. No values are persisted — the cookie is the
 * source of truth across reloads.
 */
export const updateSession = ({ jwt, expiresAt, userId, sessionId } = {}) => {
    let jwtChanged = false
    if (jwt !== undefined) {
        const next = jwt || null
        if (next !== currentJwt) {
            currentJwt = next
            jwtChanged = true
        }
    }
    if (expiresAt !== undefined) currentJwtExpiresAt = expiresAt || 0
    if (userId !== undefined) currentSessionUserId = userId || null
    if (sessionId !== undefined) currentSessionId = sessionId || null
    if (jwtChanged) applyRealtimeAuth()
}

/** Clears every session field and resets realtime auth. */
export const clearSession = () => {
    const hadJwt = currentJwt !== null
    currentJwt = null
    currentJwtExpiresAt = 0
    currentSessionUserId = null
    currentSessionId = null
    if (hadJwt) applyRealtimeAuth()
}

export const getSessionJwt = () => currentJwt
export const getJwtExpiresAt = () => currentJwtExpiresAt
export const getSessionUserId = () => currentSessionUserId
export const getSessionId = () => currentSessionId

/**
 * Body fields recognised by `requireAuthenticated` on every edge function.
 * Empty when running off cookies — the dev path keeps these populated.
 */
export const getSessionCredentialFields = () => ({
    __sessionId: currentSessionId || undefined,
    __sessionUserId: currentSessionUserId || undefined
})
