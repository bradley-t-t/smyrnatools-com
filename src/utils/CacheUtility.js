/** In-memory key-value cache with TTL-based expiration. */
const CacheUtility = {
    caches: {},
    clear() {
        this.caches = {}
    },
    delete(key) {
        delete this.caches[key]
    },
    get(key) {
        const entry = this.caches[key]
        if (!entry) return null
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            delete this.caches[key]
            return null
        }
        return entry.value
    },
    has(key) {
        return this.get(key) !== null
    },
    set(key, value, ttlMs = 60000) {
        if (!key) throw new Error('Key required')
        const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : 0
        this.caches[key] = { expiresAt, value }
        return value
    }
}

export default CacheUtility
export { CacheUtility }
