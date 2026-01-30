import APIUtility from '../utils/APIUtility'
import { supabase } from './DatabaseService'

const AUTH_SERVICE_FUNCTION = '/auth-service'
const SESSION_KEY = 'smyrna_session'
const SESSION_ID_KEY = 'smyrna_session_id'

class AuthServiceImpl {
    currentUser = null
    isAuthenticated = false
    sessionValidated = false
    observers = []

    _generateSessionId() {
        const array = new Uint8Array(32)
        crypto.getRandomValues(array)
        return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
    }

    _getBrowserInfo() {
        const ua = navigator.userAgent
        let browser = 'Unknown'
        let os = 'Unknown'
        let device = 'Desktop'

        if (ua.includes('Chrome')) browser = 'Chrome'
        else if (ua.includes('Safari')) browser = 'Safari'
        else if (ua.includes('Firefox')) browser = 'Firefox'
        else if (ua.includes('Edge')) browser = 'Edge'

        if (ua.includes('Windows')) os = 'Windows'
        else if (ua.includes('Mac')) os = 'macOS'
        else if (ua.includes('Linux')) os = 'Linux'
        else if (ua.includes('Android')) os = 'Android'
        else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

        if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) device = 'Mobile'
        else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet'

        return { browser, device, os, userAgent: ua }
    }

    async _createDbSession(userId) {
        const sessionId = this._generateSessionId()
        const { browser, os, device, userAgent } = this._getBrowserInfo()

        try {
            const { error } = await supabase.from('users_sessions').upsert(
                {
                    browser,
                    created_at: new Date().toISOString(),
                    device,
                    id: sessionId,
                    last_active: new Date().toISOString(),
                    os,
                    user_agent: userAgent,
                    user_id: userId
                },
                { onConflict: 'id' }
            )

            if (error) {
                localStorage.setItem(SESSION_KEY, userId)
                sessionStorage.setItem('userId', userId)
                return
            }

            localStorage.setItem(SESSION_KEY, userId)
            localStorage.setItem(SESSION_ID_KEY, sessionId)
            sessionStorage.setItem('userId', userId)
        } catch {
            localStorage.setItem(SESSION_KEY, userId)
            sessionStorage.setItem('userId', userId)
        }
    }

    async _validateDbSession() {
        const userId = localStorage.getItem(SESSION_KEY)
        const sessionId = localStorage.getItem(SESSION_ID_KEY)

        if (!userId) {
            const sessionUserId = sessionStorage.getItem('userId')
            if (sessionUserId) {
                return { userId: sessionUserId, valid: true }
            }
            return { userId: null, valid: false }
        }

        if (!sessionId) {
            return { userId, valid: true }
        }

        try {
            const { data, error } = await supabase
                .from('users_sessions')
                .select('id, last_active')
                .eq('id', sessionId)
                .eq('user_id', userId)
                .maybeSingle()

            if (error || !data) {
                return { userId, valid: true }
            }

            const lastActive = new Date(data.last_active)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            if (lastActive < thirtyDaysAgo) {
                this._clearSession()
                return { userId: null, valid: false }
            }

            supabase
                .from('users_sessions')
                .update({ last_active: new Date().toISOString() })
                .eq('id', sessionId)
                .then(() => {})
                .catch(() => {})

            return { userId, valid: true }
        } catch {
            return { userId, valid: true }
        }
    }

    _clearSession() {
        localStorage.removeItem(SESSION_KEY)
        localStorage.removeItem(SESSION_ID_KEY)
        sessionStorage.removeItem('userId')
        localStorage.removeItem('cachedPlants')
    }

    _getStoredUserId() {
        return localStorage.getItem(SESSION_KEY) || sessionStorage.getItem('userId') || null
    }

    async signIn(email, password) {
        const { res, json } = await APIUtility.post(
            `${AUTH_SERVICE_FUNCTION}/sign-in`,
            {
                email,
                password
            },
            { skipAuthCheck: true }
        )
        if (!res.ok) throw new Error(json.error || 'Sign in failed')
        this.currentUser = { email: json.email, userId: json.userId }
        this.isAuthenticated = true
        this.sessionValidated = true
        await this._createDbSession(json.userId)
        this._notifyObservers()
        return this.currentUser
    }

    async _createDefaultPreferencesRow(userId) {
        if (!userId) return
        try {
            const now = new Date().toISOString()
            const baseFilters = { searchText: '', selectedPlant: '', statusFilter: '', viewMode: 'grid' }
            const roleFilters = { roleFilter: '', searchText: '', selectedPlant: '', viewMode: 'grid' }
            await supabase.from('users_preferences').upsert(
                {
                    created_at: now,
                    default_view_mode: null,
                    equipment_filters: baseFilters,
                    last_viewed_filters: null,
                    manager_filters: roleFilters,
                    mixer_filters: baseFilters,
                    operator_filters: baseFilters,
                    tractor_filters: baseFilters,
                    trailer_filters: baseFilters,
                    updated_at: now,
                    user_id: userId
                },
                { onConflict: 'user_id' }
            )
        } catch {}
    }

    async signUp(email, password, firstName, lastName) {
        const { res, json } = await APIUtility.post(
            `${AUTH_SERVICE_FUNCTION}/sign-up`,
            {
                email,
                firstName,
                lastName,
                password
            },
            { skipAuthCheck: true }
        )
        if (!res.ok) throw new Error(json.error || 'Sign up failed')
        this.currentUser = { email: json.email, userId: json.userId }
        this.isAuthenticated = true
        this.sessionValidated = true
        await this._createDbSession(json.userId)
        await this._createDefaultPreferencesRow(json.userId)
        this._notifyObservers()
        return this.currentUser
    }

    async signOut() {
        const sessionId = localStorage.getItem(SESSION_ID_KEY)
        if (sessionId) {
            try {
                await supabase.from('users_sessions').delete().eq('id', sessionId)
            } catch {}
        }
        try {
            await APIUtility.post(`${AUTH_SERVICE_FUNCTION}/sign-out`, {}, { skipAuthCheck: true })
        } catch {}
        this.currentUser = null
        this.isAuthenticated = false
        this.sessionValidated = false
        this._clearSession()
        this._notifyObservers()
    }

    async updateEmail(newEmail) {
        if (!this.currentUser) throw new Error('No authenticated user')
        const { res, json } = await APIUtility.post(
            `${AUTH_SERVICE_FUNCTION}/update-email`,
            {
                email: newEmail,
                userId: this.currentUser.userId
            },
            { skipAuthCheck: true }
        )
        if (!res.ok) throw new Error(json.error || 'Update email failed')
        this.currentUser.email = newEmail.trim().toLowerCase()
        this._notifyObservers()
        return true
    }

    async updatePassword(newPassword) {
        if (!this.currentUser) throw new Error('No authenticated user')
        const { res, json } = await APIUtility.post(
            `${AUTH_SERVICE_FUNCTION}/update-password`,
            {
                password: newPassword,
                userId: this.currentUser.userId
            },
            { skipAuthCheck: true }
        )
        if (!res.ok) throw new Error(json.error || 'Update password failed')
        return true
    }

    async restoreSession() {
        if (this.sessionValidated && this.isAuthenticated) {
            return true
        }

        const { valid, userId } = await this._validateDbSession()

        if (!valid || !userId) {
            this._clearSession()
            this.isAuthenticated = false
            this.currentUser = null
            this.sessionValidated = true
            return false
        }

        this.currentUser = { userId }
        this.isAuthenticated = true
        this.sessionValidated = true
        this._notifyObservers()
        return true
    }

    isLoggedIn() {
        return this.isAuthenticated && this.currentUser !== null
    }

    hasStoredSession() {
        return !!this._getStoredUserId()
    }

    addObserver(callback) {
        this.observers.push(callback)
    }

    removeObserver(callback) {
        this.observers = this.observers.filter((cb) => cb !== callback)
    }

    _notifyObservers() {
        this.observers.forEach((callback) =>
            callback({
                currentUser: this.currentUser,
                isAuthenticated: this.isAuthenticated
            })
        )
    }
}

export const AuthService = new AuthServiceImpl()
