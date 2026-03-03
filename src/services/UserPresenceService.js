import { supabase } from './DatabaseService'
import { RegionService } from './RegionService'
import { UserService } from './UserService'

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

    /** Ensures the current user has an online presence record, resolving the user ID if needed. */
    async ensureCurrentUserOnline() {
        if (!this.currentUserId) {
            try {
                const user = await UserService.getCurrentUser()
                if (user?.id) {
                    this.currentUserId = user.id
                }
            } catch {
                return false
            }
        }
        if (this.currentUserId) {
            await this.setUserOnline(this.currentUserId)
        }
        return !!this.currentUserId
    }

    /** Upserts a presence record marking the user as online. */
    async setUserOnline(userId) {
        if (!userId) return false
        try {
            const now = new Date().toISOString()
            await supabase.from('users_presence').upsert(
                {
                    is_online: true,
                    last_activity: now,
                    last_seen: now,
                    updated_at: now,
                    user_id: userId
                },
                { onConflict: 'user_id' }
            )
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

    /** Uses sendBeacon to mark the user offline on page unload (best-effort). */
    handleBeforeUnload() {
        if (this.currentUserId) {
            const now = new Date().toISOString()
            navigator.sendBeacon &&
                navigator.sendBeacon(
                    `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/users_presence?user_id=eq.${this.currentUserId}`,
                    JSON.stringify({ is_online: false, last_seen: now })
                )
        }
    }

    /** Handles browser online/offline events by toggling presence and heartbeat. */
    handleOnlineStatusChange(isOnline) {
        if (!this.currentUserId) return
        if (isOnline) {
            this.setUserOnline(this.currentUserId)
            this.startHeartbeat()
        } else {
            this.setUserOffline(this.currentUserId)
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval)
                this.heartbeatInterval = null
            }
        }
    }

    /**
     * Fetches all currently online users with their display names, roles, and region codes.
     * Ensures the current user is always included in the result set.
     */
    async getOnlineUsers() {
        try {
            await this.ensureCurrentUserOnline()

            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

            const { data: presences, error } = await supabase
                .from('users_presence')
                .select('user_id, last_seen, last_activity, is_online')
                .or(`is_online.eq.true,last_activity.gte.${fiveMinutesAgo}`)
                .order('last_activity', { ascending: false })
            if (error) return []

            const currentUserId = this.currentUserId
            let presenceList = presences || []

            if (currentUserId && !presenceList.some((p) => p.user_id === currentUserId)) {
                presenceList = [
                    ...presenceList,
                    {
                        is_online: true,
                        last_activity: new Date().toISOString(),
                        last_seen: new Date().toISOString(),
                        user_id: currentUserId
                    }
                ]
            }

            const users = []
            for (const presence of presenceList) {
                try {
                    const [name, rolesData, profile, userRoleWeight] = await Promise.all([
                        UserService.getUserDisplayName(presence.user_id),
                        UserService.getUserRoles(presence.user_id),
                        UserService.getUserProfile(presence.user_id).catch(() => null),
                        UserService.getUserWeight(presence.user_id).catch(() => 0)
                    ])

                    let roleNames = []
                    if (Array.isArray(rolesData)) {
                        roleNames = rolesData
                            .map((r) => {
                                if (typeof r === 'string') return r
                                if (r && typeof r === 'object' && r.name) return r.name
                                return null
                            })
                            .filter(Boolean)
                    }

                    let regionCode = null
                    if (profile) {
                        if (profile.regions && Array.isArray(profile.regions) && profile.regions.length > 0) {
                            regionCode = profile.regions[0]
                        } else if (profile.region_code) {
                            regionCode = profile.region_code
                        } else if (profile.regionCode) {
                            regionCode = profile.regionCode
                        } else if (profile.plant_code) {
                            try {
                                const regions = await RegionService.fetchRegionsByPlantCode(profile.plant_code)
                                if (regions && regions.length > 0) {
                                    regionCode = regions[0].regionCode || regions[0].region_code
                                }
                            } catch {}
                        }
                    }

                    users.push({
                        id: presence.user_id,
                        lastActivity: presence.last_activity,
                        lastSeen: presence.last_seen,
                        name,
                        regionCode,
                        roleWeight: userRoleWeight || 0,
                        roles: roleNames
                    })
                } catch {}
            }
            return users
        } catch {
            return []
        }
    }

    /** Registers a callback to be invoked when the online user list changes. */
    addListener(callback) {
        if (typeof callback === 'function') this.listeners.push(callback)
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter((listener) => listener !== callback)
    }

    /** Fetches online users and broadcasts to all registered listeners. */
    notifyListeners() {
        this.getOnlineUsers().then((users) => {
            this.listeners.forEach((listener) => {
                try {
                    listener(users)
                } catch {}
            })
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
