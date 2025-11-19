const EDGE_FUNCTIONS_URL = process.env.REACT_APP_EDGE_FUNCTIONS_URL
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY

const APIUtility = {
    async post(path, data, options = {}) {
        const token = SUPABASE_ANON_KEY
        const url = `${EDGE_FUNCTIONS_URL}${path}`
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    ...(options.headers || {})
                },
                body: JSON.stringify(data),
                keepalive: Boolean(options.keepalive)
            })
            const json = await res.json().catch(() => ({}))
            return {res, json}
        } catch {
            const res = {ok: false, status: 0}
            const json = {}
            return {res, json}
        }
    }
}

export default APIUtility
export {APIUtility}