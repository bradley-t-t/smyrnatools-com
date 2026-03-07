import { supabase } from './DatabaseService'
import { UserService } from './UserService'
function detectDeviceType() {
    if (typeof navigator === 'undefined') return 'desktop'
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') ? 'mobile' : 'desktop'
}
/**
 * Real-time user presence tracking service using Supabase.
 * Maintains online status via heartbeats (30s), detects stale sessions (5min),
 * tracks user activity (click/keydown/mousemove), and broadcasts presence changes
 * to registered listeners via Supabase realtime subscriptions.
 */
class UserPresenceService {
    constructor() {
        this.listeners = []
        this.subscriptions = []
        this.isSetup = false
        this.currentUserId = null
        this.heartbeatInterval = null
        this.cleanupInterval = null
        this.activityRefreshInterval = null
        this.lastActivityUpdate = 0
        this.lastLoginDateWritten = null
        this.onPresenceChange = this.handlePresenceChange.bind(this)
        this.onBeforeUnload = this.handleBeforeUnload.bind(this)
        this.onOnline = this.handleOnlineStatusChange.bind(this, true)
        this.onOffline = this.handleOnlineStatusChange.bind(this, false)
        this.onUserActivity = this.handleUserActivity.bind(this)
    }
    /**
     * Initializes presence tracking: subscribes to realtime changes,
     * sets the user online, starts heartbeat/cleanup intervals, and
     * registers activity and browser lifecycle event listeners.
     */
    async setup() {
        if (this.isSetup) return true
        try {
            const user = await UserService.getCurrentUser()
            if (!user?.id) return false
            this.currentUserId = user.id
            const subscription = supabase
                .channel('presence_changes')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'users_presence'
                    },
                    this.onPresenceChange
                )
                .subscribe()
            this.subscriptions.push(subscription)
            await this.setUserOnline(this.currentUserId)
            this.startHeartbeat()
            this.startCleanup()
            this.startActivityRefresh()
            this.setupActivityTracking()
            window.addEventListener('beforeunload', this.onBeforeUnload)
            window.addEventListener('online', this.onOnline)
            window.addEventListener('offline', this.onOffline)
            this.isSetup = true
            return true
        } catch {
            return false
        }
    }
    /** Registers DOM event listeners for user activity detection. */
    setupActivityTracking() {
        document.addEventListener('click', this.onUserActivity)
        document.addEventListener('keydown', this.onUserActivity)
        document.addEventListener('mousemove', this.onUserActivity, { passive: true })
    }
    /** Handles Supabase realtime presence change events by refreshing the online user list. */
    handlePresenceChange() {
        this.notifyListeners()
    }
    /** Throttled handler that updates last-activity timestamp (max once per 30s). */
    handleUserActivity() {
        const now = Date.now()
        if (now - this.lastActivityUpdate < 30000) return
        this.lastActivityUpdate = now
        this.updateActivity()
    }
    /** Writes the current timestamp to last_activity and last_seen in the database. */
    async updateActivity() {
        if (!this.currentUserId) return false
        try {
            const now = new Date().toISOString()
            await supabase
                .from('users_presence')
                .update({ last_activity: now, last_seen: now, updated_at: now })
                .eq('user_id', this.currentUserId)
            const today = now.split('T')[0]
            if (this.lastLoginDateWritten !== today) {
                this.lastLoginDateWritten = today
                supabase
                    .from('users')
                    .update({ last_login_at: today })
                    .eq('id', this.currentUserId)
                    .then(() => {})
                    .catch(() => {})
            }
            return true
        } catch {
            return false
        }
    }
    /** Starts a 60-second interval that notifies listeners of presence changes. */
    startActivityRefresh() {
        if (this.activityRefreshInterval) clearInterval(this.activityRefreshInterval)
        this.activityRefreshInterval = setInterval(() => {
            this.notifyListeners()
        }, 60000)
    }
    /** Upserts a presence record marking the user as online without resetting last_activity. */
    async setUserOnline(userId) {
        if (!userId) return false
        try {
            const now = new Date().toISOString()
            const { data: existing } = await supabase
                .from('users_presence')
                .select('user_id')
                .eq('user_id', userId)
                .maybeSingle()
            const device = detectDeviceType()
            if (existing) {
                await supabase
                    .from('users_presence')
                    .update({ device_type: device, is_online: true, last_seen: now, updated_at: now })
                    .eq('user_id', userId)
                    .catch(() =>
                        supabase
                            .from('users_presence')
                            .update({ is_online: true, last_seen: now, updated_at: now })
                            .eq('user_id', userId)
                    )
            } else {
                await supabase
                    .from('users_presence')
                    .insert({
                        device_type: device,
                        is_online: true,
                        last_activity: now,
                        last_seen: now,
                        updated_at: now,
                        user_id: userId
                    })
                    .catch(() =>
                        supabase.from('users_presence').insert({
                            is_online: true,
                            last_activity: now,
                            last_seen: now,
                            updated_at: now,
                            user_id: userId
                        })
                    )
            }
            return true
        } catch {
            return false
        }
    }
    /** Re-marks the user as online without updating last_activity (e.g. after network reconnect). */
    async setUserBackOnline(userId) {
        if (!userId) return false
        try {
            const now = new Date().toISOString()
            await supabase
                .from('users_presence')
                .update({ is_online: true, last_seen: now, updated_at: now })
                .eq('user_id', userId)
            return true
        } catch {
            return false
        }
    }
    /** Updates the presence record to mark the user as offline. */
    async setUserOffline(userId) {
        if (!userId) return false
        try {
            const now = new Date().toISOString()
            await supabase
                .from('users_presence')
                .update({ is_online: false, last_seen: now, updated_at: now })
                .eq('user_id', userId)
            return true
        } catch {
            return false
        }
    }
    /** Updates the heartbeat timestamp to prevent stale session cleanup. */
    async updateHeartbeat() {
        if (!this.currentUserId) return false
        try {
            const now = new Date().toISOString()
            await supabase
                .from('users_presence')
                .update({ last_seen: now, updated_at: now })
                .eq('user_id', this.currentUserId)
            return true
        } catch {
            return false
        }
    }
    /** Starts a 30-second heartbeat interval. */
    startHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)
        this.heartbeatInterval = setInterval(() => this.updateHeartbeat(), 30000)
    }
    /** Starts a 60-second cleanup interval that marks stale sessions (>5min) as offline. */
    startCleanup() {
        if (this.cleanupInterval) clearInterval(this.cleanupInterval)
        this.cleanupInterval = setInterval(async () => {
            try {
                const staleTime = new Date(Date.now() - 5 * 60 * 1000).toISOString()
                await supabase
                    .from('users_presence')
                    .update({ is_online: false, updated_at: new Date().toISOString() })
                    .eq('is_online', true)
                    .lt('last_seen', staleTime)
                this.notifyListeners()
            } catch {}
        }, 60000)
    }
    /** Uses fetch with keepalive to mark the user offline on page unload (best-effort). */
    handleBeforeUnload() {
        if (this.currentUserId) {
            const now = new Date().toISOString()
            fetch(`${process.env.REACT_APP_SUPABASE_URL}/rest/v1/users_presence?user_id=eq.${this.currentUserId}`, {
                body: JSON.stringify({ is_online: false, last_seen: now, updated_at: now }),
                headers: {
                    Authorization: `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    apikey: process.env.REACT_APP_SUPABASE_ANON_KEY
                },
                keepalive: true,
                method: 'PATCH'
            }).catch(() => {})
        }
    }
    /** Handles browser online/offline events by toggling presence and heartbeat. */
    handleOnlineStatusChange(isOnline) {
        if (!this.currentUserId) return
        if (isOnline) {
            this.setUserBackOnline(this.currentUserId)
            this.startHeartbeat()
        } else {
            this.setUserOffline(this.currentUserId)
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval)
                this.heartbeatInterval = null
            }
        }
    }
    /** Returns the count of currently online users (lightweight query for badge). */
    async getOnlineCount() {
        try {
            const { count, error } = await supabase
                .from('users_presence')
                .select('user_id', { count: 'exact', head: true })
                .eq('is_online', true)
            if (error) return 0
            return count || 0
        } catch {
            return 0
        }
    }
    /** Registers a callback to be invoked when the online user list changes. */
    addListener(callback) {
        if (typeof callback === 'function') this.listeners.push(callback)
    }
    removeListener(callback) {
        this.listeners = this.listeners.filter((listener) => listener !== callback)
    }
    /** Broadcasts a presence change signal to all registered listeners. */
    notifyListeners() {
        this.listeners.forEach((listener) => {
            try {
                listener()
            } catch {}
        })
    }
    /**
     * Tears down all intervals, event listeners, and Supabase subscriptions.
     * Should be called on app unmount or user sign-out.
     */
    cleanup() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval)
            this.heartbeatInterval = null
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval)
            this.cleanupInterval = null
        }
        if (this.activityRefreshInterval) {
            clearInterval(this.activityRefreshInterval)
            this.activityRefreshInterval = null
        }
        document.removeEventListener('click', this.onUserActivity)
        document.removeEventListener('keydown', this.onUserActivity)
        document.removeEventListener('mousemove', this.onUserActivity)
        window.removeEventListener('beforeunload', this.onBeforeUnload)
        window.removeEventListener('online', this.onOnline)
        window.removeEventListener('offline', this.onOffline)
        for (const sub of this.subscriptions) {
            try {
                supabase.removeChannel(sub)
            } catch {}
        }
        this.subscriptions = []
        this.listeners = []
        this.isSetup = false
        this.currentUserId = null
    }
}
const instance = new UserPresenceService()
export { instance as UserPresenceService }
export default instance
