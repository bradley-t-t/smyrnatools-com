import APIUtility from '../utils/APIUtility'
import { supabase } from './DatabaseService'

const TUTORIAL_STORAGE_KEY = 'dismissed_tutorials'

/** Resolves the current user ID from local or session storage. */
const getTutorialUserId = () => {
    return localStorage.getItem('smyrna_session') || sessionStorage.getItem('userId') || null
}

/**
 * User preferences persistence service for saving and retrieving
 * per-user filter states (mixer filters, last-viewed filters) via the edge function.
 * Also handles tutorial dismissal tracking with localStorage + database sync.
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
    /**
     * Marks a tutorial as dismissed in both localStorage and the database.
     * Always returns true (fails gracefully if the DB write fails).
     */
    static async dismissTutorial(tutorialId) {
        const localDismissed = localStorage.getItem(TUTORIAL_STORAGE_KEY)
        const dismissed = localDismissed ? JSON.parse(localDismissed) : []
        if (!dismissed.includes(tutorialId)) {
            dismissed.push(tutorialId)
            localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(dismissed))
        }
        try {
            const userId = getTutorialUserId()
            if (!userId) return true
            const { data: userExists, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('id', userId)
                .maybeSingle()
            if (userError || !userExists) return true
            const { data: existing } = await supabase
                .from('users_tutorials')
                .select('id')
                .eq('user_id', userId)
                .eq('tutorial_id', tutorialId)
                .maybeSingle()
            if (existing) return true
            await supabase.from('users_tutorials').insert({
                dismissed_at: new Date().toISOString(),
                tutorial_id: tutorialId,
                user_id: userId
            })
            return true
        } catch {
            return true
        }
    }

    /**
     * Returns the merged set of dismissed tutorial IDs from localStorage and the database.
     * Falls back to localStorage-only if the DB query fails.
     */
    static async getDismissedTutorials() {
        const local = localStorage.getItem(TUTORIAL_STORAGE_KEY)
        const localDismissed = local ? JSON.parse(local) : []
        try {
            const userId = getTutorialUserId()
            if (!userId) return localDismissed
            const { data, error } = await supabase.from('users_tutorials').select('tutorial_id').eq('user_id', userId)
            if (error) return localDismissed
            const dbDismissed = data ? data.map((d) => d.tutorial_id) : []
            return [...new Set([...localDismissed, ...dbDismissed])]
        } catch {
            return localDismissed
        }
    }

    /** Resets all tutorial dismissals for the current user (localStorage + database). */
    static async resetAllTutorials() {
        localStorage.removeItem(TUTORIAL_STORAGE_KEY)
        try {
            const userId = getTutorialUserId()
            if (!userId) return true
            const { data: existing } = await supabase
                .from('users_tutorials')
                .select('id, tutorial_id')
                .eq('user_id', userId)
            if (!existing || existing.length === 0) return true
            const ids = existing.map((row) => row.id)
            const { error } = await supabase.from('users_tutorials').delete().in('id', ids)
            if (error) {
                console.error('Error deleting tutorials:', error)
                return false
            }
            return true
        } catch (err) {
            console.error('Exception in resetAllTutorials:', err)
            return false
        }
    }

    /** Resets a single tutorial's dismissal status for the current user. */
    static async resetTutorial(tutorialId) {
        const localDismissed = localStorage.getItem(TUTORIAL_STORAGE_KEY)
        const localList = localDismissed ? JSON.parse(localDismissed) : []
        const filtered = localList.filter((id) => id !== tutorialId)
        localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(filtered))
        try {
            const userId = getTutorialUserId()
            if (!userId) return true
            const { data: existing } = await supabase
                .from('users_tutorials')
                .select('id')
                .eq('user_id', userId)
                .eq('tutorial_id', tutorialId)
                .maybeSingle()
            if (!existing) return true
            const { error } = await supabase.from('users_tutorials').delete().eq('id', existing.id)
            if (error) {
                console.error('Error deleting tutorial:', error)
                return false
            }
            return true
        } catch (err) {
            console.error('Exception in resetTutorial:', err)
            return false
        }
    }
}
export { UserPreferencesService }
