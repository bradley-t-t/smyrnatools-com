import { supabase } from '../services/DatabaseService'

const EDGE_FUNCTIONS_URL = process.env.REACT_APP_EDGE_FUNCTIONS_URL
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY

const getAuthToken = async () => {
    try {
        const { data } = await supabase.auth.getSession()
        if (data?.session?.access_token) return data.session.access_token
    } catch {}
    return SUPABASE_ANON_KEY
}

const APIUtility = {
    async post(path, data, options = {}) {
        const token = await getAuthToken()
        const url = `${EDGE_FUNCTIONS_URL}${path}`
        const maxRetries = options.maxRetries || 2
        const retryDelay = options.retryDelay || 1000

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 30000)

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

                const json = await res.json().catch(() => ({}))
                return { json, res }
            } catch (error) {
                const isLastAttempt = attempt === maxRetries

                if (isLastAttempt) {
                    const res = { ok: false, status: 0 }
                    const json = {
                        error:
                            error.name === 'AbortError'
                                ? 'Request timeout. Please check your connection and try again.'
                                : error.message || 'Network request failed. Please check your connection.'
                    }
                    return { json, res }
                }

                if (!isLastAttempt) {
                    await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)))
                }
            }
        }

        const res = { ok: false, status: 0 }
        const json = { error: 'Network request failed after multiple attempts.' }
        return { json, res }
    }
}

export default APIUtility
export { APIUtility }
