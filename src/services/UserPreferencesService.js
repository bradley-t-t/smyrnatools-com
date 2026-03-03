import APIUtility from '../utils/APIUtility'

/**
 * User preferences persistence service for saving and retrieving
 * per-user filter states (mixer filters, last-viewed filters) via the edge function.
 */
class UserPreferencesService {
    /** Fetches all stored preferences for a user. */
    static async getUserPreferences(userId) {
        if (!userId) throw new Error('User ID is required')
        const { res, json } = await APIUtility.post('/user-preferences-service/get', { userId })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch user preferences')
        return json?.data ?? null
    }

    /** Persists the user's mixer view filter configuration. */
    static async saveMixerFilters(userId, filters) {
        if (!userId) throw new Error('User ID is required')
        if (!filters) throw new Error('Filters are required')
        const response = await APIUtility.post('/user-preferences-service/save-mixer-filters', { filters, userId })
        if (!response.res.ok || response.json?.success !== true)
            throw new Error(response.json?.error || 'Failed to save mixer filters')
        return true
    }

    /** Persists the user's last-viewed filter configuration (cross-entity). */
    static async saveLastViewedFilters(userId, filters) {
        if (!userId) throw new Error('User ID is required')
        if (!filters) throw new Error('Filters are required')
        const response = await APIUtility.post('/user-preferences-service/save-last-viewed-filters', {
            filters,
            userId
        })
        if (!response.res.ok || response.json?.success !== true)
            throw new Error(response.json?.error || 'Failed to save last viewed filters')
        return true
    }
}

export { UserPreferencesService }
