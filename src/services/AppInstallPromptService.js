import { supabase } from './DatabaseService'

/**
 * Manages PWA install prompt visibility and user dismissal preferences.
 * Persists prompt actions (installed, dismissed, remind-later) to the database
 * and respects a 7-day cool-down period for "remind later" dismissals.
 */
class AppInstallPromptServiceImpl {
    /** Determines whether the install prompt should be shown based on the user's prior actions. */
    async shouldShowPrompt(userId, promptType) {
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
    async recordPromptAction(userId, promptType, action, deviceType = null) {
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
    async markAsInstalled(userId, promptType, deviceType) {
        return this.recordPromptAction(userId, promptType, 'installed', deviceType)
    }

    /** Convenience shorthand for recording a "dismissed_forever" action. */
    async dismissForever(userId, promptType, deviceType) {
        return this.recordPromptAction(userId, promptType, 'dismissed_forever', deviceType)
    }

    /** Convenience shorthand for recording a "remind_later" action. */
    async remindLater(userId, promptType, deviceType) {
        return this.recordPromptAction(userId, promptType, 'remind_later', deviceType)
    }

    /** Detects the user's device type from the user-agent string. */
    detectDeviceType() {
        const ua = navigator.userAgent || navigator.vendor || window.opera

        if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
            return 'ios'
        }

        if (/android/i.test(ua)) {
            return 'android'
        }

        return 'desktop'
    }

    /** Returns true if the app is running in standalone (installed PWA) mode. */
    isStandalone() {
        return (
            window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone ||
            document.referrer.includes('android-app://')
        )
    }

    /** Returns true if the install prompt is allowed (i.e., not already in standalone mode). */
    canShowInstallPrompt() {
        return !this.isStandalone()
    }
}

export const AppInstallPromptService = new AppInstallPromptServiceImpl()
