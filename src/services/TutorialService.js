import { supabase } from './DatabaseService'
const TUTORIAL_STORAGE_KEY = 'dismissed_tutorials'
/** Resolves the current user ID from local or session storage. */
const getUserId = () => {
    return localStorage.getItem('smyrna_session') || sessionStorage.getItem('userId') || null
}
/**
 * Tutorial dismissal tracking service.
 * Persists dismissed tutorial IDs to both localStorage (for offline/fast access)
 * and the database (for cross-device sync). Supports per-tutorial and bulk reset.
 */
export const TutorialService = {
    /**
     * Marks a tutorial as dismissed in both localStorage and the database.
     * Always returns true (fails gracefully if the DB write fails).
     */
    async dismissTutorial(tutorialId) {
        const localDismissed = localStorage.getItem(TUTORIAL_STORAGE_KEY)
        const dismissed = localDismissed ? JSON.parse(localDismissed) : []
        if (!dismissed.includes(tutorialId)) {
            dismissed.push(tutorialId)
            localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(dismissed))
        }
        try {
            const userId = getUserId()
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
    },
    /**
     * Returns the merged set of dismissed tutorial IDs from localStorage and the database.
     * Falls back to localStorage-only if the DB query fails.
     */
    async getDismissedTutorials() {
        const local = localStorage.getItem(TUTORIAL_STORAGE_KEY)
        const localDismissed = local ? JSON.parse(local) : []
        try {
            const userId = getUserId()
            if (!userId) return localDismissed
            const { data, error } = await supabase.from('users_tutorials').select('tutorial_id').eq('user_id', userId)
            if (error) return localDismissed
            const dbDismissed = data ? data.map((d) => d.tutorial_id) : []
            return [...new Set([...localDismissed, ...dbDismissed])]
        } catch {
            return localDismissed
        }
    },
    /** Resets all tutorial dismissals for the current user (localStorage + database). */
    async resetAllTutorials() {
        localStorage.removeItem(TUTORIAL_STORAGE_KEY)
        try {
            const userId = getUserId()
            if (!userId) {
                return true
            }
            const { data: existing } = await supabase
                .from('users_tutorials')
                .select('id, tutorial_id')
                .eq('user_id', userId)
            if (!existing || existing.length === 0) {
                return true
            }
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
    },
    /** Resets a single tutorial's dismissal status for the current user. */
    async resetTutorial(tutorialId) {
        const localDismissed = localStorage.getItem(TUTORIAL_STORAGE_KEY)
        const localList = localDismissed ? JSON.parse(localDismissed) : []
        const filtered = localList.filter((id) => id !== tutorialId)
        localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(filtered))
        try {
            const userId = getUserId()
            if (!userId) {
                return true
            }
            const { data: existing } = await supabase
                .from('users_tutorials')
                .select('id')
                .eq('user_id', userId)
                .eq('tutorial_id', tutorialId)
                .maybeSingle()
            if (!existing) {
                return true
            }
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
export default TutorialService
