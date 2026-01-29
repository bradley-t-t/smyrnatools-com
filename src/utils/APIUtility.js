const EDGE_FUNCTIONS_URL = process.env.REACT_APP_EDGE_FUNCTIONS_URL
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY

const APIUtility = {
    async post(path, data, options = {}) {
        const token = SUPABASE_ANON_KEY
        const url = `${EDGE_FUNCTIONS_URL}${path}`
        const maxRetries = options.maxRetries || 2
        const retryDelay = options.retryDelay || 1000

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 30000)

                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                        ...(options.headers || {})
                    },
                    body: JSON.stringify(data),
                    keepalive: Boolean(options.keepalive),
                    signal: controller.signal
                })

                clearTimeout(timeoutId)

                const json = await res.json().catch(() => ({}))
                return { res, json }
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
                    return { res, json }
                }

                if (!isLastAttempt) {
                    await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)))
                }
            }
        }

        const res = { ok: false, status: 0 }
        const json = { error: 'Network request failed after multiple attempts.' }
        return { res, json }
    }
}

export default APIUtility
export { APIUtility }
