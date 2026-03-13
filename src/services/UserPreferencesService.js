import APIUtility from '../utils/APIUtility'
import { CacheUtility } from '../utils/CacheUtility'
import { supabase } from './DatabaseService'

const TUTORIAL_STORAGE_KEY = 'dismissed_tutorials'
const VERSION_CACHE_KEY = 'app:version'
const VERSION_CACHE_TTL_MS = 60_000

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

    /**
     * Fetches the current app version from nit.json with a 60-second cache TTL.
     * Falls back to an empty string on network or parse failure.
     */
    static async getVersion() {
        const cached = CacheUtility.get(VERSION_CACHE_KEY)
        if (cached) return cached
        try {
            const response = await fetch('/nit.json', { cache: 'no-store' })
            if (!response.ok) throw new Error('failed')
            const { version = '' } = await response.json()
            return CacheUtility.set(VERSION_CACHE_KEY, version, VERSION_CACHE_TTL_MS)
        } catch {
            return CacheUtility.set(VERSION_CACHE_KEY, '', VERSION_CACHE_TTL_MS)
        }
    }

    /** Determines whether the install prompt should be shown based on the user's prior actions. */
    static async shouldShowPrompt(userId, promptType) {
        if (!userId) return false
        try {
            const { data, error } = await supabase
                .from('app_install_prompts')
                .select('*')
                .eq('user_id', userId)
                .eq('prompt_type', promptType)
                .single()
            if (error && error.code !== 'PGRST116') {
                console.error('Error checking app install prompt:', error)
                return true
            }
            if (!data) return true
            if (data.action === 'dismissed_forever' || data.action === 'installed') {
                return false
            }
            if (data.action === 'remind_later' && data.reminded_at) {
                const remindedDate = new Date(data.reminded_at)
                const daysSinceReminder = (Date.now() - remindedDate.getTime()) / (1000 * 60 * 60 * 24)
                return daysSinceReminder >= 7
            }
            return false
        } catch (err) {
            console.error('Error in shouldShowPrompt:', err)
            return true
        }
    }

    /** Records a user's prompt action (installed, dismissed_forever, remind_later) via upsert. */
    static async recordPromptAction(userId, promptType, action, deviceType = null) {
        if (!userId) return { error: 'No user ID', success: false }
        try {
            const dataToUpsert = {
                action: action,
                device_type: deviceType,
                prompt_type: promptType,
                updated_at: new Date().toISOString(),
                user_id: userId
            }
            if (action === 'remind_later') {
                dataToUpsert.reminded_at = new Date().toISOString()
            }
            const { data, error } = await supabase
                .from('app_install_prompts')
                .upsert(dataToUpsert, {
                    onConflict: 'user_id,prompt_type'
                })
                .select()
                .single()
            if (error) {
                console.error('Error recording prompt action:', error)
                return { error, success: false }
            }
            return { data, success: true }
        } catch (err) {
            console.error('Error in recordPromptAction:', err)
            return { error: err, success: false }
        }
    }

    /** Convenience shorthand for recording an "installed" action. */
    static async markAsInstalled(userId, promptType, deviceType) {
        return UserPreferencesService.recordPromptAction(userId, promptType, 'installed', deviceType)
    }

    /** Convenience shorthand for recording a "dismissed_forever" action. */
    static async dismissForever(userId, promptType, deviceType) {
        return UserPreferencesService.recordPromptAction(userId, promptType, 'dismissed_forever', deviceType)
    }

    /** Convenience shorthand for recording a "remind_later" action. */
    static async remindLater(userId, promptType, deviceType) {
        return UserPreferencesService.recordPromptAction(userId, promptType, 'remind_later', deviceType)
    }

    /** Detects the user's device type from the user-agent string. */
    static detectDeviceType() {
        const ua = navigator.userAgent || navigator.vendor || window.opera
        if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios'
        if (/android/i.test(ua)) return 'android'
        return 'desktop'
    }

    /** Returns true if the app is running in standalone (installed PWA) mode. */
    static isStandalone() {
        return (
            window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone ||
            document.referrer.includes('android-app://')
        )
    }

    /** Returns true if the install prompt is allowed (i.e., not already in standalone mode). */
    static canShowInstallPrompt() {
        return !UserPreferencesService.isStandalone()
    }
}
export { UserPreferencesService }
