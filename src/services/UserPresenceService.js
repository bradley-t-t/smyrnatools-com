import {supabase} from './DatabaseService';
import {UserService} from './UserService';
import {RegionService} from './RegionService';

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

    async setup() {
        if (this.isSetup) return true
        try {
            const user = await UserService.getCurrentUser()
            if (!user?.id) return false
            this.currentUserId = user.id
            const subscription = supabase
                .channel('presence_changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'users_presence'
                }, this.onPresenceChange)
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

    setupActivityTracking() {
        document.addEventListener('click', this.onUserActivity)
        document.addEventListener('keydown', this.onUserActivity)
        document.addEventListener('mousemove', this.onUserActivity, {passive: true})
    }

    handleUserActivity() {
        const now = Date.now()
        if (now - this.lastActivityUpdate < 30000) return
        this.lastActivityUpdate = now
        this.updateActivity()
    }

    async updateActivity() {
        if (!this.currentUserId) return false
        try {
            const now = new Date().toISOString()
            await supabase
                .from('users_presence')
                .update({last_activity: now, last_seen: now, updated_at: now})
                .eq('user_id', this.currentUserId)
            return true
        } catch {
            return false
        }
    }

    startActivityRefresh() {
        if (this.activityRefreshInterval) clearInterval(this.activityRefreshInterval)
        this.activityRefreshInterval = setInterval(() => {
            this.notifyListeners()
        }, 60000)
    }

    async setUserOnline(userId) {
        if (!userId) return false
        try {
            const now = new Date().toISOString()
            await supabase
                .from('users_presence')
                .upsert({
                    user_id: userId,
                    is_online: true,
                    last_seen: now,
                    last_activity: now,
                    updated_at: now
                }, {onConflict: 'user_id'})
            return true
        } catch {
            return false
        }
    }

    async setUserOffline(userId) {
        if (!userId) return false
        try {
            const now = new Date().toISOString()
            await supabase
                .from('users_presence')
                .update({is_online: false, last_seen: now, updated_at: now})
                .eq('user_id', userId)
            return true
        } catch {
            return false
        }
    }

    async updateHeartbeat() {
        if (!this.currentUserId) return false
        try {
            const now = new Date().toISOString()
            await supabase
                .from('users_presence')
                .update({last_seen: now, updated_at: now})
                .eq('user_id', this.currentUserId)
            return true
        } catch {
            return false
        }
    }

    startHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)
        this.heartbeatInterval = setInterval(() => this.updateHeartbeat(), 30000)
    }

    startCleanup() {
        if (this.cleanupInterval) clearInterval(this.cleanupInterval)
        this.cleanupInterval = setInterval(async () => {
            try {
                const staleTime = new Date(Date.now() - 2 * 60 * 1000).toISOString()
                await supabase
                    .from('users_presence')
                    .update({is_online: false, updated_at: new Date().toISOString()})
                    .eq('is_online', true)
                    .lt('last_seen', staleTime)
                this.notifyListeners()
            } catch {
            }
        }, 60000)
    }

    handlePresenceChange() {
        this.notifyListeners()
    }

    handleBeforeUnload() {
        if (this.currentUserId) {
            const now = new Date().toISOString()
            navigator.sendBeacon && navigator.sendBeacon(
                `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/users_presence?user_id=eq.${this.currentUserId}`,
                JSON.stringify({is_online: false, last_seen: now})
            )
        }
    }

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

    async getOnlineUsers() {
        try {
            const {data: presences, error} = await supabase
                .from('users_presence')
                .select('user_id, last_seen, last_activity')
                .eq('is_online', true)
                .order('last_activity', {ascending: false})
            if (error) return []
            const users = []
            for (const presence of presences || []) {
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
                            .map(r => {
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
                            } catch {
                            }
                        }
                    }

                    users.push({
                        id: presence.user_id,
                        name,
                        roles: roleNames,
                        roleWeight: userRoleWeight || 0,
                        regionCode,
                        lastSeen: presence.last_seen,
                        lastActivity: presence.last_activity
                    })
                } catch {
                }
            }
            return users
        } catch {
            return []
        }
    }

    addListener(callback) {
        if (typeof callback === 'function') this.listeners.push(callback)
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback)
    }

    notifyListeners() {
        this.getOnlineUsers().then(users => {
            this.listeners.forEach(listener => {
                try {
                    listener(users)
                } catch {
                }
            })
        })
    }

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
            } catch {
            }
        }
        this.subscriptions = []
        this.listeners = []
        this.isSetup = false
        this.currentUserId = null
    }
}

const instance = new UserPresenceService()
export {instance as UserPresenceService}
export default instance