import { supabase } from './DatabaseService'
import { UserService } from './UserService'

const TUTORIAL_STORAGE_KEY = 'dismissed_tutorials'

export const TutorialService = {
    async getDismissedTutorials() {
        const local = localStorage.getItem(TUTORIAL_STORAGE_KEY)
        const localDismissed = local ? JSON.parse(local) : []

        try {
            const user = await UserService.getCurrentUser()
            const userId = user?.id
            if (!userId) return localDismissed

            const { data, error } = await supabase.from('users_tutorials').select('tutorial_id').eq('user_id', userId)

            if (error) return localDismissed

            const dbDismissed = data ? data.map((d) => d.tutorial_id) : []
            const combined = [...new Set([...localDismissed, ...dbDismissed])]
            return combined
        } catch {
            return localDismissed
        }
    },

    async dismissTutorial(tutorialId) {
        const localDismissed = localStorage.getItem(TUTORIAL_STORAGE_KEY)
        const dismissed = localDismissed ? JSON.parse(localDismissed) : []
        if (!dismissed.includes(tutorialId)) {
            dismissed.push(tutorialId)
            localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(dismissed))
        }

        try {
            const user = await UserService.getCurrentUser()
            const userId = user?.id
            if (!userId) return true

            const { data: existing } = await supabase
                .from('users_tutorials')
                .select('id')
                .eq('user_id', userId)
                .eq('tutorial_id', tutorialId)
                .maybeSingle()

            if (existing) return true

            const { error } = await supabase.from('users_tutorials').insert({
                dismissed_at: new Date().toISOString(),
                tutorial_id: tutorialId,
                user_id: userId
            })

            if (error) throw error
            return true
        } catch {
            return true
        }
    },

    async resetTutorial(tutorialId) {
        const localDismissed = localStorage.getItem(TUTORIAL_STORAGE_KEY)
        const localList = localDismissed ? JSON.parse(localDismissed) : []
        const filtered = localList.filter((id) => id !== tutorialId)
        localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(filtered))

        try {
            const user = await UserService.getCurrentUser()
            const userId = user?.id
            if (!userId) return true

            await supabase.from('users_tutorials').delete().eq('user_id', userId).eq('tutorial_id', tutorialId)

            return true
        } catch {
            return true
        }
    },

    async resetAllTutorials() {
        localStorage.removeItem(TUTORIAL_STORAGE_KEY)

        try {
            const user = await UserService.getCurrentUser()
            const userId = user?.id
            if (!userId) return true

            await supabase.from('users_tutorials').delete().eq('user_id', userId)

            return true
        } catch {
            return true
        }
    }
}

export default TutorialService
