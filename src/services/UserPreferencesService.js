import APIUtility from '../utils/APIUtility'
import { CacheUtility } from '../utils/CacheUtility'
import { detectPlatformType } from '../utils/DeviceUtility'
import { getSessionUserId } from './SessionService'

const PREFS_FUNCTION = '/user-preferences-service'
const TUTORIAL_STORAGE_KEY = 'dismissed_tutorials'
const VERSION_CACHE_KEY = 'app:version'
const VERSION_CACHE_TTL_MS = 60_000

/** Resolves the current user ID from the in-memory session. */
const getTutorialUserId = () => getSessionUserId()

/** Safely parses a JSON string, returning fallback on failure. */
function safeParseTutorialList(raw) {
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
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
    /**
     * Batch-fetches the public `accent_color` field for any set of users.
     * Returns a `{ userId: '#hex' | null }` map. Used to colour avatars in
     * presence overlays, online lists, and conversation rows with each
     * user's own brand colour.
     */
    static async getAccentColors(userIds) {
        if (!Array.isArray(userIds) || userIds.length === 0) return {}
        const { res, json } = await APIUtility.post('/user-preferences-service/get-accents', { userIds })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch accent colors')
        return json?.data ?? {}
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
        const dismissed = safeParseTutorialList(localStorage.getItem(TUTORIAL_STORAGE_KEY))
        if (!dismissed.includes(tutorialId)) {
            dismissed.push(tutorialId)
            localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(dismissed))
        }
        try {
            const userId = getTutorialUserId()
            if (!userId) return true
            await APIUtility.post(`${PREFS_FUNCTION}/dismiss-tutorial`, { tutorialId, userId })
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
        const localDismissed = safeParseTutorialList(localStorage.getItem(TUTORIAL_STORAGE_KEY))
        try {
            const userId = getTutorialUserId()
            if (!userId) return localDismissed
            const { json } = await APIUtility.post(`${PREFS_FUNCTION}/get-dismissed-tutorials`, { userId })
            const dbDismissed = json?.data || []
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
            const { json } = await APIUtility.post(`${PREFS_FUNCTION}/reset-all-tutorials`, { userId })
            return json?.success !== false
        } catch (err) {
            console.error('Exception in resetAllTutorials:', err)
            return false
        }
    }

    /** Resets a single tutorial's dismissal status for the current user. */
    static async resetTutorial(tutorialId) {
        const localList = safeParseTutorialList(localStorage.getItem(TUTORIAL_STORAGE_KEY))
        const filtered = localList.filter((id) => id !== tutorialId)
        localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(filtered))
        try {
            const userId = getTutorialUserId()
            if (!userId) return true
            const { json } = await APIUtility.post(`${PREFS_FUNCTION}/reset-tutorial`, { tutorialId, userId })
            return json?.success !== false
        } catch (err) {
            console.error('Exception in resetTutorial:', err)
            return false
        }
    }

    /**
     * Fetches the current app version from release.json with a 60-second cache TTL.
     * Falls back to an empty string on network or parse failure.
     */
    static async getVersion() {
        const cached = CacheUtility.get(VERSION_CACHE_KEY)
        if (cached) return cached
        try {
            const response = await fetch('/release.json', { cache: 'no-store' })
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
            const { json } = await APIUtility.post(`${PREFS_FUNCTION}/should-show-prompt`, { promptType, userId })
            return json?.show !== false
        } catch (err) {
            console.error('Error in shouldShowPrompt:', err)
            return true
        }
    }

    /** Records a user's prompt action (installed, dismissed_forever, remind_later) via upsert. */
    static async recordPromptAction(userId, promptType, action, deviceType = null) {
        if (!userId) return { error: 'No user ID', success: false }
        try {
            const { json } = await APIUtility.post(`${PREFS_FUNCTION}/record-prompt-action`, {
                action,
                deviceType,
                promptType,
                userId
            })
            if (!json?.success) {
                console.error('Error recording prompt action:', json?.error)
                return { error: json?.error, success: false }
            }
            return { data: json.data, success: true }
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
        return detectPlatformType()
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
