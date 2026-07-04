interface CacheEntry<T> {
    expiresAt: number
    value: T
}

/** In-memory key-value cache with TTL-based expiration. */
const CacheUtility = {
    caches: {} as Record<string, CacheEntry<unknown>>,
    clear() {
        this.caches = {}
    },
    delete(key: string) {
        delete this.caches[key]
    },
    get<T = unknown>(key: string): T | null {
        const entry = this.caches[key] as CacheEntry<T> | undefined
        if (!entry) return null
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            delete this.caches[key]
            return null
        }
        return entry.value
    },
    has(key: string): boolean {
        return this.get(key) !== null
    },
    set<T>(key: string, value: T, ttlMs = 60000): T {
        if (!key) throw new Error('Key required')
        const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : 0
        this.caches[key] = { expiresAt, value }
        return value
    }
}
export default CacheUtility
export { CacheUtility }
