const EDGE_FUNCTIONS_URL = process.env.REACT_APP_EDGE_FUNCTIONS_URL
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY
const REQUEST_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RETRIES = 2
const DEFAULT_RETRY_DELAY_MS = 1_000
const SESSION_KEY = 'smyrna_session'
const SESSION_ID_KEY = 'smyrna_session_id'

/** Builds custom session headers from localStorage for edge function authentication. */
const getSessionHeaders = () => {
    const headers = {}
    try {
        const userId = localStorage.getItem(SESSION_KEY)
        const sessionId = localStorage.getItem(SESSION_ID_KEY)
        if (userId) headers['X-User-Id'] = userId
        if (sessionId) headers['X-Session-Id'] = sessionId
    } catch {}
    return headers
}
/**
 * Builds a plain error response in the same shape as a successful response,
 * so callers never need to handle two different return shapes.
 */
const errorResponse = (message) => ({
    json: { error: message },
    res: { ok: false, status: 0 }
})
/**
 * Authenticated HTTP client for edge functions.
 *
 * Sends the anon key for database access and custom session headers
 * (X-User-Id, X-Session-Id) for user authentication. Requests are aborted
 * after REQUEST_TIMEOUT_MS. Failed attempts are retried with linear backoff
 * up to DEFAULT_MAX_RETRIES times (configurable via options).
 */
const APIUtility = {
    async post(path, data, options = {}) {
        const url = `${EDGE_FUNCTIONS_URL}${path}`
        const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
        const retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY_MS
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const isLastAttempt = attempt === maxRetries
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
            try {
                const res = await fetch(url, {
                    body: JSON.stringify(data),
                    headers: {
                        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        ...getSessionHeaders(),
                        ...(options.headers || {})
                    },
                    keepalive: Boolean(options.keepalive),
                    method: 'POST',
                    signal: controller.signal
                })
                clearTimeout(timeoutId)
                const json = await res.json().catch((error) => {
                    console.error('Failed to parse JSON response body:', error)
                    return {}
                })
                return { json, res }
            } catch (error) {
                clearTimeout(timeoutId)
                if (isLastAttempt) {
                    const message =
                        error.name === 'AbortError'
                            ? 'Request timed out. Please check your connection and try again.'
                            : error.message || 'Network request failed. Please check your connection.'
                    return errorResponse(message)
                }
                await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)))
            }
        }
        return errorResponse('Network request failed after multiple attempts.')
    }
}
export default APIUtility
export { APIUtility }
