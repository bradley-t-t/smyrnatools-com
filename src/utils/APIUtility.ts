// @ts-ignore
import { getSessionCredentialFields } from '../services/SessionService'

// @ts-ignore
const EDGE_FUNCTIONS_URL = import.meta.env.REACT_APP_EDGE_FUNCTIONS_URL
// @ts-ignore
const SUPABASE_ANON_KEY = import.meta.env.REACT_APP_SUPABASE_ANON_KEY
const REQUEST_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RETRIES = 2
const DEFAULT_RETRY_DELAY_MS = 1_000
const SESSION_INVALID_EVENT = 'auth:session-invalid'

/* Auth-service endpoints that legitimately run without an established session
 * (sign-in/up, the session bootstrap calls themselves, password recovery).
 * Every other path needs credentials in sessionStorage before we attempt the
 * network round-trip — calling them without creds just guarantees a 401 and
 * floods the console. */
const PUBLIC_AUTH_PATHS = new Set([
    '/auth-service/sign-in',
    '/auth-service/sign-up',
    '/auth-service/sign-out',
    '/auth-service/create-session',
    '/auth-service/validate-session',
    '/auth-service/restore-session',
    '/auth-service/refresh-token',
    '/auth-service/delete-session',
    '/auth-service/forgot-password',
    '/auth-service/reset-password',
    '/auth-service/load-profile',
    '/auth-service/whoami'
])

interface SessionCredentials {
    __sessionUserId?: string
    __sessionId?: string
}

interface APIResponse {
    json: Record<string, unknown>
    res: { ok: boolean; status: number }
}

interface PostOptions {
    headers?: Record<string, string>
    keepalive?: boolean
    maxRetries?: number
    retryDelay?: number
    timeout?: number
}

/** Reads in-memory session credentials for edge function authentication. */
const getSessionCredentials = (): SessionCredentials => getSessionCredentialFields()

/**
 * Reads the non-HttpOnly companion `smyrna_auth=1` flag cookie that the
 * server sets alongside the HttpOnly session cookies. The flag carries no
 * secret — it's just a fast client-side indicator of "the browser believes
 * it has a valid session." Used in the pre-flight bail so background pollers
 * stop hammering the API after sign-out, without us having to expose the
 * session id to JS.
 */
const hasAuthFlagCookie = (): boolean => {
    if (typeof document === 'undefined') return false
    return document.cookie.split(';').some((part) => part.trim().startsWith('smyrna_auth=1'))
}

/** Notifies the app that the current session is no longer accepted by the
 *  server. AuthContext listens for this and tears down user state so the
 *  next render bounces the user back to the login screen. */
const dispatchSessionInvalid = (reason: string): void => {
    try {
        window.dispatchEvent(new CustomEvent(SESSION_INVALID_EVENT, { detail: { reason } }))
    } catch {}
}

/**
 * Builds a plain error response in the same shape as a successful response,
 * so callers never need to handle two different return shapes.
 */
const errorResponse = (message: string, status = 0): APIResponse => ({
    json: { error: message },
    res: { ok: false, status }
})

/**
 * Authenticated HTTP client for edge functions.
 *
 * Sends the anon key for database access and custom session credentials
 * (X-User-Id / X-Session-Id headers + body fields) for user auth. Requests
 * are aborted after REQUEST_TIMEOUT_MS. Failed attempts are retried with
 * linear backoff up to DEFAULT_MAX_RETRIES times.
 *
 * On 401 responses or missing client credentials, broadcasts an
 * `auth:session-invalid` event so the AuthContext can clear user state
 * instead of letting every poller hammer the endpoint forever.
 */
const APIUtility = {
    async post(path: string, data?: Record<string, unknown>, options: PostOptions = {}): Promise<APIResponse> {
        const url = `${EDGE_FUNCTIONS_URL}${path}`
        const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
        const retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY_MS

        /* Primary auth is the HttpOnly session cookie ridden along by
         * `credentials: 'include'`. Header/body fallbacks (X-User-Id /
         * X-Session-Id and `__sessionUserId` / `__sessionId`) only get
         * populated when SessionService has in-memory credentials — which
         * happens on the localhost-dev path where cookies can't cross
         * origins, and during the transition window when older clients
         * still call `create-session` to seed memory. In production the
         * cookie alone authenticates every call. */
        const credentials = getSessionCredentials()
        const hasMemoryCredentials = Boolean(credentials.__sessionUserId && credentials.__sessionId)
        const hasSessionSignal = hasMemoryCredentials || hasAuthFlagCookie()

        /* Bail before the network call when no credential signal is
         * present AND the endpoint isn't an auth bootstrap path. Otherwise
         * background pollers flood the console with predictable 401s after
         * sign-out. */
        if (!hasSessionSignal && !PUBLIC_AUTH_PATHS.has(path)) {
            dispatchSessionInvalid('missing-credentials')
            return errorResponse('Unauthorized', 401)
        }

        const credentialHeaders: Record<string, string> = {}
        if (credentials.__sessionUserId) credentialHeaders['X-User-Id'] = credentials.__sessionUserId
        if (credentials.__sessionId) credentialHeaders['X-Session-Id'] = credentials.__sessionId

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const isLastAttempt = attempt === maxRetries
            const controller = new AbortController()
            const timeoutMs = options.timeout ?? REQUEST_TIMEOUT_MS
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
            try {
                const res = await fetch(url, {
                    body: JSON.stringify(hasMemoryCredentials ? { ...data, ...credentials } : (data ?? {})),
                    credentials: 'include',
                    headers: {
                        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        ...credentialHeaders,
                        ...(options.headers || {})
                    },
                    keepalive: Boolean(options.keepalive),
                    method: 'POST',
                    signal: controller.signal
                })
                clearTimeout(timeoutId)
                const json = await res.json().catch((error: Error) => {
                    console.error('Failed to parse JSON response body:', error)
                    return {}
                })
                /* A 401 from any non-auth endpoint means the server no
                 * longer accepts this session (row deleted, expired beyond
                 * the 7-day window, or never created). Stop retrying and
                 * tell the app to sign the user out. */
                if (res.status === 401 && !PUBLIC_AUTH_PATHS.has(path)) {
                    dispatchSessionInvalid('server-rejected')
                    return { json, res }
                }
                return { json, res }
            } catch (error) {
                clearTimeout(timeoutId)
                if (isLastAttempt) {
                    const err = error as Error & { name: string }
                    const message =
                        err.name === 'AbortError'
                            ? 'Request timed out. Please check your connection and try again.'
                            : err.message || 'Network request failed. Please check your connection.'
                    return errorResponse(message)
                }
                await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)))
            }
        }
        return errorResponse('Network request failed after multiple attempts.')
    }
}
export default APIUtility
export { APIUtility, SESSION_INVALID_EVENT }
export type { APIResponse, PostOptions }
