import { DEFAULT_ACCENT_COLOR } from '../app/constants/themeConstants'
import { UserPreferencesService } from './UserPreferencesService'

/**
 * Process-wide cache for per-user accent colors so any avatar (presence
 * overlays, online list, conversation rows, comment threads, etc.) can
 * display each user with their own brand colour without each component
 * re-fetching `users_preferences` individually.
 *
 * Pending requests are coalesced — concurrent callers for the same id
 * receive the same in-flight promise. Successful lookups are cached for
 * the lifetime of the page; explicit `invalidate` calls (e.g. after the
 * current user changes their own accent) flush specific entries.
 *
 * Subscribers are notified whenever cached entries change so React
 * components can re-render once a previously-unknown accent resolves.
 */
class UserAccentServiceClass {
    constructor() {
        this._cache = new Map()
        this._pending = new Map()
        this._listeners = new Set()
        this._batchQueue = new Set()
        this._batchTimer = null
    }

    /** Returns the cached colour for `userId`, or `DEFAULT_ACCENT_COLOR` if unknown. */
    get(userId) {
        if (!userId) return DEFAULT_ACCENT_COLOR
        return this._cache.get(userId) || DEFAULT_ACCENT_COLOR
    }

    /** True when the cache already has a (possibly default) entry for `userId`. */
    has(userId) {
        return !!userId && this._cache.has(userId)
    }

    /** Manually seeds the cache (e.g. from a payload that already includes the colour). */
    set(userId, color) {
        if (!userId) return
        const next = color || DEFAULT_ACCENT_COLOR
        if (this._cache.get(userId) === next) return
        this._cache.set(userId, next)
        this._notify()
    }

    /** Drops a single entry so the next read triggers a refetch. */
    invalidate(userId) {
        if (!userId) return
        if (this._cache.delete(userId)) this._notify()
    }

    /**
     * Resolves the accent for `userId`. Coalesces concurrent in-flight
     * requests for the same id and micro-batches sibling lookups
     * scheduled in the same tick into a single edge-function call.
     */
    async ensure(userId) {
        if (!userId) return DEFAULT_ACCENT_COLOR
        if (this._cache.has(userId)) return this._cache.get(userId)
        if (this._pending.has(userId)) return this._pending.get(userId)
        const promise = new Promise((resolve) => {
            this._batchQueue.add({ resolve, userId })
            this._scheduleFlush()
        })
        this._pending.set(userId, promise)
        return promise
    }

    /** Resolves accents for many ids at once (single request). */
    async ensureMany(userIds) {
        const unique = [...new Set((userIds || []).filter(Boolean))]
        if (unique.length === 0) return {}
        const missing = unique.filter((id) => !this._cache.has(id))
        if (missing.length > 0) await this._fetchAndCache(missing)
        const result = {}
        for (const id of unique) result[id] = this.get(id)
        return result
    }

    subscribe(listener) {
        this._listeners.add(listener)
        return () => this._listeners.delete(listener)
    }

    _scheduleFlush() {
        if (this._batchTimer) return
        this._batchTimer = setTimeout(() => this._flush(), 0)
    }

    async _flush() {
        this._batchTimer = null
        const batch = [...this._batchQueue]
        this._batchQueue.clear()
        if (batch.length === 0) return
        const ids = [...new Set(batch.map((b) => b.userId))]
        await this._fetchAndCache(ids)
        for (const { resolve, userId } of batch) {
            this._pending.delete(userId)
            resolve(this.get(userId))
        }
    }

    async _fetchAndCache(userIds) {
        try {
            const map = await UserPreferencesService.getAccentColors(userIds)
            for (const id of userIds) this._cache.set(id, map[id] || DEFAULT_ACCENT_COLOR)
        } catch {
            for (const id of userIds) {
                if (!this._cache.has(id)) this._cache.set(id, DEFAULT_ACCENT_COLOR)
            }
        }
        this._notify()
    }

    _notify() {
        for (const listener of this._listeners) {
            try {
                listener()
            } catch {}
        }
    }
}

export const UserAccentService = new UserAccentServiceClass()
