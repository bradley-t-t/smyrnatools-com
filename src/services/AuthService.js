import APIUtility from '../utils/APIUtility'
const AUTH_SERVICE_FUNCTION = '/auth-service'
const SESSION_KEY = 'smyrna_session'
const SESSION_ID_KEY = 'smyrna_session_id'
const SESSION_EXPIRY_DAYS = 7

/**
 * Secure wrapper around sessionStorage for sensitive auth tokens.
 * Validates values on read to guard against XSS-injected payloads.
 */
const SecureSessionStore = {
    _isValidTokenValue(value) {
        if (typeof value !== 'string' || !value) return false
        // Session IDs must be hex strings; user IDs must be UUID-like alphanumeric with hyphens
        return /^[a-zA-Z0-9-]+$/.test(value)
    },
    set(key, value) {
        if (!this._isValidTokenValue(value)) return
        try {
            sessionStorage.setItem(key, value)
        } catch {}
    },
    get(key) {
        try {
            const value = sessionStorage.getItem(key)
            return this._isValidTokenValue(value) ? value : null
        } catch {
            return null
        }
    },
    remove(key) {
        try {
            sessionStorage.removeItem(key)
        } catch {}
    }
}

/**
 * Authentication service managing sign-in, sign-up, sign-out, session persistence,
 * and credential updates. Tracks sessions in the database with browser/device metadata
 * and supports observer-pattern notifications for auth state changes.
 */
class AuthServiceImpl {
    currentUser = null
    isAuthenticated = false
    sessionValidated = false
    observers = []
    /** Generates a cryptographically random 64-character hex session ID. */
    _generateSessionId() {
        const array = new Uint8Array(32)
        crypto.getRandomValues(array)
        return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
    }
    /** Extracts browser, OS, and device type from the user-agent string. */
    _getBrowserInfo() {
        const ua = navigator.userAgent
        let browser = 'Unknown'
        let os = 'Unknown'
        let device = 'Desktop'
        if (ua.includes('Edg')) browser = 'Edge'
        else if (ua.includes('Chrome')) browser = 'Chrome'
        else if (ua.includes('Firefox')) browser = 'Firefox'
        else if (ua.includes('Safari')) browser = 'Safari'
        if (ua.includes('Windows')) os = 'Windows'
        else if (ua.includes('Mac')) os = 'macOS'
        else if (ua.includes('Linux')) os = 'Linux'
        else if (ua.includes('Android')) os = 'Android'
        else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
        if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) device = 'Mobile'
        else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet'
        return { browser, device, os, userAgent: ua }
    }
    /**
     * Creates a database-tracked session record with browser metadata via auth-service.
     * Falls back to local/session storage if the call fails.
     */
    async _createDbSession(userId) {
        const sessionId = this._generateSessionId()
        const { browser, os, device, userAgent } = this._getBrowserInfo()
        try {
            await APIUtility.post(
                `${AUTH_SERVICE_FUNCTION}/create-session`,
                {
                    browser,
                    device,
                    os,
                    sessionId,
                    userAgent,
                    userId
                },
                { skipAuthCheck: true }
            )
            SecureSessionStore.set(SESSION_KEY, userId)
            SecureSessionStore.set(SESSION_ID_KEY, sessionId)
        } catch {
            SecureSessionStore.set(SESSION_KEY, userId)
        }
    }
    /**
     * Validates the current session via auth-service.
     * Expires sessions older than SESSION_EXPIRY_DAYS (7).
     */
    async _validateDbSession() {
        const userId = SecureSessionStore.get(SESSION_KEY)
        const sessionId = SecureSessionStore.get(SESSION_ID_KEY)
        if (!userId) {
            return { userId: null, valid: false }
        }
        if (!sessionId) {
            return { userId: null, valid: false }
        }
        try {
            const { json } = await APIUtility.post(
                `${AUTH_SERVICE_FUNCTION}/validate-session`,
                { sessionId, userId },
                { skipAuthCheck: true }
            )
            if (!json?.valid) {
                this._clearSession()
                return { userId: null, valid: false }
            }
            return { userId, valid: true }
        } catch {
            return { userId: null, valid: false }
        }
    }
    /** Clears all local auth state from sessionStorage. */
    _clearSession() {
        SecureSessionStore.remove(SESSION_KEY)
        SecureSessionStore.remove(SESSION_ID_KEY)
        sessionStorage.removeItem('cachedPlants')
    }
    _getStoredUserId() {
        return SecureSessionStore.get(SESSION_KEY) || null
    }
    /** Authenticates a user with email/password and creates a tracked session. */
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
    /** Initializes a default user preferences row on first sign-up via preferences service. */
    async _createDefaultPreferencesRow(userId) {
        if (!userId) return
        try {
            const now = new Date().toISOString()
            const baseFilters = { searchText: '', selectedPlant: '', statusFilter: '', viewMode: 'grid' }
            const roleFilters = { roleFilter: '', searchText: '', selectedPlant: '', viewMode: 'grid' }
            await APIUtility.post(
                '/user-preferences-service/save-all',
                {
                    data: {
                        created_at: now,
                        default_view_mode: null,
                        equipment_filters: baseFilters,
                        last_viewed_filters: null,
                        manager_filters: roleFilters,
                        mixer_filters: baseFilters,
                        operator_filters: baseFilters,
                        tractor_filters: baseFilters,
                        trailer_filters: baseFilters,
                        updated_at: now
                    },
                    userId
                },
                { skipAuthCheck: true }
            )
        } catch {}
    }
    /** Registers a new user, creates a session, and initializes default preferences. */
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
    /** Signs out the user, removes the DB session record, and clears local state. */
    async signOut() {
        const sessionId = SecureSessionStore.get(SESSION_ID_KEY)
        if (sessionId) {
            await APIUtility.post(
                `${AUTH_SERVICE_FUNCTION}/delete-session`,
                { sessionId },
                { skipAuthCheck: true }
            ).catch(() => {})
        }
        try {
            await APIUtility.post(`${AUTH_SERVICE_FUNCTION}/sign-out`, {}, { skipAuthCheck: true })
        } catch (err) {
            console.error('Failed to call sign-out endpoint:', err)
        }
        this.currentUser = null
        this.isAuthenticated = false
        this.sessionValidated = false
        this._clearSession()
        this._notifyObservers()
    }
    /** Updates the authenticated user's email address. */
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
    /** Updates the authenticated user's password. */
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
    /**
     * Restores a session from local/session storage on app load.
     * Validates the stored session against the database before accepting it.
     */
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
    /** Registers a callback to be invoked on auth state changes. */
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
