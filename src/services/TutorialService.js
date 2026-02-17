import { supabase } from './DatabaseService'

const TUTORIAL_STORAGE_KEY = 'dismissed_tutorials'

const getUserId = () => {
    return localStorage.getItem('smyrna_session') || sessionStorage.getItem('userId') || null
}

export const TutorialService = {
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

    async resetAllTutorials() {
        localStorage.removeItem(TUTORIAL_STORAGE_KEY)

        try {
            const userId = getUserId()
            if (!userId) return true

            await supabase.from('users_tutorials').delete().eq('user_id', userId)

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
            const userId = getUserId()
            if (!userId) return true

            await supabase.from('users_tutorials').delete().eq('user_id', userId).eq('tutorial_id', tutorialId)

            return true
        } catch {
            return true
        }
    }
}

export default TutorialService
