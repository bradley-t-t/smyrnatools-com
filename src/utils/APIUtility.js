import { Database } from '../services/DatabaseService'
const EDGE_FUNCTIONS_URL = process.env.REACT_APP_EDGE_FUNCTIONS_URL
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY
const REQUEST_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RETRIES = 2
const DEFAULT_RETRY_DELAY_MS = 1_000
/**
 * Resolves the current session's JWT. Falls back to the anon key if the
 * user is unauthenticated or the session cannot be read.
 */
const getAuthToken = async () => {
    try {
        const { data } = await Database.auth.getSession()
        if (data?.session?.access_token) return data.session.access_token
    } catch (error) {
        console.error('Failed to retrieve auth session, falling back to anon key:', error)
    }
    return SUPABASE_ANON_KEY
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
 * Each attempt fetches a fresh auth token so that retries succeed even if
 * the previous token expired mid-session. Requests are aborted after
 * REQUEST_TIMEOUT_MS. Failed attempts are retried with linear backoff up to
 * DEFAULT_MAX_RETRIES times (configurable via options).
 */
const APIUtility = {
    async post(path, data, options = {}) {
        const url = `${EDGE_FUNCTIONS_URL}${path}`
        const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
        const retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY_MS
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const isLastAttempt = attempt === maxRetries
            const token = await getAuthToken()
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
            try {
                const res = await fetch(url, {
                    body: JSON.stringify(data),
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
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
