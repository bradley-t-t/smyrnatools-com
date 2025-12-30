import {supabase} from './DatabaseService'

class AppInstallPromptServiceImpl {
    async shouldShowPrompt(userId, promptType) {
        if (!userId) return false

        try {
            const {data, error} = await supabase
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

    async recordPromptAction(userId, promptType, action, deviceType = null) {
        if (!userId) return {success: false, error: 'No user ID'}

        try {
            const dataToUpsert = {
                user_id: userId,
                prompt_type: promptType,
                action: action,
                device_type: deviceType,
                updated_at: new Date().toISOString()
            }

            if (action === 'remind_later') {
                dataToUpsert.reminded_at = new Date().toISOString()
            }

            const {data, error} = await supabase
                .from('app_install_prompts')
                .upsert(dataToUpsert, {
                    onConflict: 'user_id,prompt_type'
                })
                .select()
                .single()

            if (error) {
                console.error('Error recording prompt action:', error)
                return {success: false, error}
            }

            return {success: true, data}
        } catch (err) {
            console.error('Error in recordPromptAction:', err)
            return {success: false, error: err}
        }
    }

    async markAsInstalled(userId, promptType, deviceType) {
        return this.recordPromptAction(userId, promptType, 'installed', deviceType)
    }

    async dismissForever(userId, promptType, deviceType) {
        return this.recordPromptAction(userId, promptType, 'dismissed_forever', deviceType)
    }

    async remindLater(userId, promptType, deviceType) {
        return this.recordPromptAction(userId, promptType, 'remind_later', deviceType)
    }

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

    isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone ||
            document.referrer.includes('android-app://')
    }

    canShowInstallPrompt() {
        return !this.isStandalone()
    }
}

export const AppInstallPromptService = new AppInstallPromptServiceImpl()
