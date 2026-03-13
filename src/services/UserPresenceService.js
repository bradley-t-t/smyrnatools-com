import { detectDeviceType } from '../utils/DeviceUtility'
import { Database } from './DatabaseService'
import { PlantService } from './PlantService'
import { UserService } from './UserService'

let _hasActiveDevicesCol = null
async function checkActiveDevicesCol() {
    if (_hasActiveDevicesCol !== null) return _hasActiveDevicesCol
    try {
        const { error } = await Database.from('users_presence').select('active_devices').limit(0)
        _hasActiveDevicesCol = !error
    } catch (err) {
        console.error('Failed to check active_devices column:', err)
        _hasActiveDevicesCol = false
    }
    return _hasActiveDevicesCol
}

async function mergeActiveDevice(userId, device, now) {
    const hasCol = await checkActiveDevicesCol()
    if (!hasCol) return
    try {
        const { data } = await Database.from('users_presence')
            .select('active_devices')
            .eq('user_id', userId)
            .maybeSingle()
        const devices =
            data?.active_devices && typeof data.active_devices === 'object' ? { ...data.active_devices } : {}
        devices[device] = now
        await Database.from('users_presence').update({ active_devices: devices }).eq('user_id', userId)
    } catch (err) {
        console.error('Failed to merge active device:', err)
    }
}

/* ── Online users helpers (read side) ── */

const STALE_THRESHOLD = 5 * 60 * 1000
const HEARTBEAT_INTERVAL_MS = 30000
const ACTIVITY_THROTTLE_MS = 30000
const CLEANUP_INTERVAL_MS = 60000

function buildRoleColorMap(roles) {
    if (!roles?.length) return {}
    const sorted = [...roles].sort((a, b) => (b.weight || 0) - (a.weight || 0))
    return Object.fromEntries(
        sorted.map((role, index) => {
            const hue = sorted.length === 1 ? 0 : Math.round((index / (sorted.length - 1)) * 120)
            return [role.name.toLowerCase(), `hsl(${hue}, 72%, 42%)`]
        })
    )
}

function extractRegionCode(profile) {
    if (!profile) return null
    if (Array.isArray(profile.regions) && profile.regions.length > 0) return profile.regions[0]
    return profile.region_code || profile.regionCode || null
}

function extractRoleNames(rolesData) {
    if (!Array.isArray(rolesData)) return []
    return rolesData.map((r) => (typeof r === 'string' ? r : (r?.name ?? null))).filter(Boolean)
}

function getActiveDevices(activeDevices, isSelf) {
    const now = Date.now()
    const recentDevices =
        activeDevices && typeof activeDevices === 'object'
            ? Object.entries(activeDevices)
                  .filter(([, timestamp]) => timestamp && now - new Date(timestamp).getTime() < STALE_THRESHOLD)
                  .map(([type]) => type)
            : []
    if (isSelf) {
        const current = detectDeviceType()
        if (!recentDevices.includes(current)) recentDevices.push(current)
    }
    if (recentDevices.length === 0) recentDevices.push('desktop')
    return recentDevices.sort()
}

/**
 * Unified presence service combining write-side tracking (heartbeats, activity,
 * online/offline status) with read-side online-users list (fetching, caching,
 * role colors, region names).
 */
class UserPresenceService {
    constructor() {
        /* ── Write-side (presence tracking) state ── */
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

        /* ── Read-side (online users list) state ── */
        this.onlineUsers = []
        this.regionNames = {}
        this.roleColorMap = {}
        this.onlineUsersListeners = []
        this.isOnlineUsersInitialized = false
        this.isOnlineUsersLoading = true
        this._refreshing = false
        this._userMetaCache = {}
    }

    /* ════════════════════════════════════════════════════════════════════
     *  Write-side: presence tracking
     * ════════════════════════════════════════════════════════════════════ */

    async setup() {
        if (this.isSetup) return true
        try {
            const user = await UserService.getCurrentUser()
            if (!user?.id) return false
            this.currentUserId = user.id
            const subscription = Database.channel('presence_changes')
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
        } catch (err) {
            console.error('Failed to setup presence tracking:', err)
            return false
        }
    }

    setupActivityTracking() {
        document.addEventListener('click', this.onUserActivity)
        document.addEventListener('keydown', this.onUserActivity)
        document.addEventListener('mousemove', this.onUserActivity, { passive: true })
    }

    handlePresenceChange() {
        this.notifyListeners()
    }

    handleUserActivity() {
        const now = Date.now()
        if (now - this.lastActivityUpdate < ACTIVITY_THROTTLE_MS) return
        this.lastActivityUpdate = now
        this.updateActivity()
    }

    async updateActivity() {
        if (!this.currentUserId) return false
        try {
            const now = new Date().toISOString()
            await Database.from('users_presence')
                .update({ last_activity: now, last_seen: now, updated_at: now })
                .eq('user_id', this.currentUserId)
            mergeActiveDevice(this.currentUserId, detectDeviceType(), now)
            const today = now.split('T')[0]
            if (this.lastLoginDateWritten !== today) {
                this.lastLoginDateWritten = today
                try {
                    await Database.from('users').update({ last_login_at: today }).eq('id', this.currentUserId)
                } catch (err) {
                    console.error('Failed to update last_login_at:', err)
                }
            }
            return true
        } catch (err) {
            console.error('Failed to update activity:', err)
            return false
        }
    }

    startActivityRefresh() {
        if (this.activityRefreshInterval) clearInterval(this.activityRefreshInterval)
        this.activityRefreshInterval = setInterval(() => {
            this.notifyListeners()
        }, CLEANUP_INTERVAL_MS)
    }

    async setUserOnline(userId) {
        if (!userId) return false
        try {
            const now = new Date().toISOString()
            const { data: existing } = await Database.from('users_presence')
                .select('user_id')
                .eq('user_id', userId)
                .maybeSingle()
            if (existing) {
                await Database.from('users_presence')
                    .update({ is_online: true, last_seen: now, updated_at: now })
                    .eq('user_id', userId)
            } else {
                await Database.from('users_presence').insert({
                    is_online: true,
                    last_activity: now,
                    last_seen: now,
                    updated_at: now,
                    user_id: userId
                })
            }
            mergeActiveDevice(userId, detectDeviceType(), now)
            return true
        } catch (err) {
            console.error('Failed to set user online:', err)
            return false
        }
    }

    async setUserBackOnline(userId) {
        if (!userId) return false
        try {
            const now = new Date().toISOString()
            await Database.from('users_presence')
                .update({ is_online: true, last_seen: now, updated_at: now })
                .eq('user_id', userId)
            mergeActiveDevice(userId, detectDeviceType(), now)
            return true
        } catch (err) {
            console.error('Failed to set user back online:', err)
            return false
        }
    }

    async setUserOffline(userId) {
        if (!userId) return false
        try {
            const now = new Date().toISOString()
            await Database.from('users_presence')
                .update({ is_online: false, last_seen: now, updated_at: now })
                .eq('user_id', userId)
            return true
        } catch (err) {
            console.error('Failed to set user offline:', err)
            return false
        }
    }

    async updateHeartbeat() {
        if (!this.currentUserId) return false
        try {
            const now = new Date().toISOString()
            await Database.from('users_presence')
                .update({ last_seen: now, updated_at: now })
                .eq('user_id', this.currentUserId)
            return true
        } catch (err) {
            console.error('Failed to update heartbeat:', err)
            return false
        }
    }

    startHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)
        this.heartbeatInterval = setInterval(() => this.updateHeartbeat(), HEARTBEAT_INTERVAL_MS)
    }

    startCleanup() {
        if (this.cleanupInterval) clearInterval(this.cleanupInterval)
        this.cleanupInterval = setInterval(async () => {
            try {
                const staleTime = new Date(Date.now() - STALE_THRESHOLD).toISOString()
                await Database.from('users_presence')
                    .update({ is_online: false, updated_at: new Date().toISOString() })
                    .eq('is_online', true)
                    .lt('last_seen', staleTime)
                this.notifyListeners()
            } catch (err) {
                console.error('Failed to clean up stale presence records:', err)
            }
        }, CLEANUP_INTERVAL_MS)
    }

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
            }).catch((err) => console.error('Failed to set offline on beforeunload:', err))
        }
    }

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

    async getOnlineCount() {
        try {
            const { count, error } = await Database.from('users_presence')
                .select('user_id', { count: 'exact', head: true })
                .eq('is_online', true)
            if (error) return 0
            return count || 0
        } catch (err) {
            console.error('Failed to get online count:', err)
            return 0
        }
    }

    /** Presence-change listeners (write side) */
    addListener(callback) {
        if (typeof callback === 'function') this.listeners.push(callback)
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter((listener) => listener !== callback)
    }

    notifyListeners() {
        this.listeners.forEach((listener) => {
            try {
                listener()
            } catch (err) {
                console.error('Presence listener threw:', err)
            }
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
                Database.removeChannel(sub)
            } catch (err) {
                console.error('Failed to remove presence channel:', err)
            }
        }
        this.subscriptions = []
        this.listeners = []
        this.onlineUsersListeners = []
        this.isSetup = false
        this.currentUserId = null
    }

    /* ════════════════════════════════════════════════════════════════════
     *  Read-side: online users list (merged from OnlineUsersService)
     * ════════════════════════════════════════════════════════════════════ */

    async initOnlineUsers() {
        if (this.isOnlineUsersInitialized) return
        this.isOnlineUsersInitialized = true
        try {
            const [currentUser, allRoles] = await Promise.all([
                UserService.getCurrentUser(),
                UserService.getAllRoles().catch(() => [])
            ])
            this.currentUserId = currentUser?.id || null
            this.roleColorMap = buildRoleColorMap(allRoles)
        } catch (err) {
            console.error('Failed to initialize online users metadata:', err)
        }
        await this.refreshOnlineUsers(true)
        this.addListener(() => this.refreshOnlineUsers())
    }

    async refreshOnlineUsers(force = false) {
        if (this._refreshing && !force) return
        this._refreshing = true
        try {
            const fiveMinutesAgo = new Date(Date.now() - STALE_THRESHOLD).toISOString()
            const hasDevicesCol = await checkActiveDevicesCol()
            const cols = hasDevicesCol
                ? 'user_id, last_seen, last_activity, is_online, active_devices'
                : 'user_id, last_seen, last_activity, is_online'
            const { data: presences, error } = await Database.from('users_presence')
                .select(cols)
                .or(`is_online.eq.true,last_activity.gte.${fiveMinutesAgo}`)
                .order('last_activity', { ascending: false })
            if (error) {
                this.isOnlineUsersLoading = false
                this._notifyOnlineUsersListeners()
                return
            }
            let presenceList = presences || []
            if (this.currentUserId && !presenceList.some((p) => p.user_id === this.currentUserId)) {
                presenceList = [
                    ...presenceList,
                    {
                        active_devices: { [detectDeviceType()]: new Date().toISOString() },
                        is_online: true,
                        last_activity: new Date().toISOString(),
                        last_seen: new Date().toISOString(),
                        user_id: this.currentUserId
                    }
                ]
            }
            const uncached = presenceList.filter((p) => !this._userMetaCache[p.user_id])
            if (uncached.length > 0) {
                await Promise.all(uncached.map((p) => this._fetchAndCacheMeta(p.user_id)))
            }
            this.onlineUsers = presenceList
                .map((p) => {
                    const meta = this._userMetaCache[p.user_id] || {}
                    const isSelf = p.user_id === this.currentUserId
                    return {
                        activeDevices: getActiveDevices(p.active_devices, isSelf),
                        id: p.user_id,
                        isCurrentUser: isSelf,
                        lastActivity: p.last_activity,
                        lastSeen: p.last_seen,
                        name: meta.name || 'Unknown User',
                        regionCode: meta.regionCode || null,
                        roleWeight: meta.roleWeight || 0,
                        roles: meta.roles || []
                    }
                })
                .sort((a, b) => (b.roleWeight || 0) - (a.roleWeight || 0))
            this.isOnlineUsersLoading = false
            await this._resolveRegionNames(this.onlineUsers)
            this._notifyOnlineUsersListeners()
        } catch (err) {
            console.error('Failed to refresh online users:', err)
            this.isOnlineUsersLoading = false
            this._notifyOnlineUsersListeners()
        } finally {
            this._refreshing = false
        }
    }

    async _fetchAndCacheMeta(userId) {
        try {
            const [name, rolesData, profile, roleWeight] = await Promise.all([
                UserService.getUserDisplayName(userId),
                UserService.getUserRoles(userId),
                UserService.getUserProfile(userId).catch(() => null),
                UserService.getUserWeight(userId).catch(() => 0)
            ])
            let regionCode = extractRegionCode(profile)
            if (!regionCode && profile?.plant_code) {
                try {
                    const regions = await PlantService.fetchRegionsByPlantCode(profile.plant_code)
                    if (regions?.length > 0) regionCode = regions[0].regionCode || regions[0].region_code
                } catch (err) {
                    console.error(`Failed to resolve region for plant ${profile.plant_code}:`, err)
                }
            }
            this._userMetaCache[userId] = {
                name,
                regionCode,
                roleWeight: roleWeight || 0,
                roles: extractRoleNames(rolesData)
            }
        } catch (err) {
            console.error(`Failed to fetch metadata for user ${userId}:`, err)
            this._userMetaCache[userId] = { name: 'Unknown User', regionCode: null, roleWeight: 0, roles: [] }
        }
    }

    async _resolveRegionNames(users) {
        const codes = [...new Set(users.map((u) => u.regionCode).filter(Boolean))]
        let changed = false
        for (const code of codes) {
            if (this.regionNames[code]) continue
            try {
                const region = await PlantService.fetchRegionByCode(code)
                this.regionNames[code] = region?.regionName || region?.region_name || code
            } catch (err) {
                console.error(`Failed to resolve region name for ${code}:`, err)
                this.regionNames[code] = code
            }
            changed = true
        }
        if (changed) this._notifyOnlineUsersListeners()
    }

    getOnlineUsers() {
        return this.onlineUsers
    }

    getRegionNames() {
        return this.regionNames
    }

    getRoleColorMap() {
        return this.roleColorMap
    }

    getIsLoading() {
        return this.isOnlineUsersLoading
    }

    /** Online-users-list listeners (read side) */
    addOnlineUsersListener(callback) {
        if (typeof callback === 'function') this.onlineUsersListeners.push(callback)
    }

    removeOnlineUsersListener(callback) {
        this.onlineUsersListeners = this.onlineUsersListeners.filter((listener) => listener !== callback)
    }

    _notifyOnlineUsersListeners() {
        const snapshot = {
            isLoading: this.isOnlineUsersLoading,
            regionNames: this.regionNames,
            roleColorMap: this.roleColorMap,
            users: this.onlineUsers
        }
        this.onlineUsersListeners.forEach((callback) => {
            try {
                callback(snapshot)
            } catch (err) {
                console.error('Online users listener threw:', err)
            }
        })
    }
}

const instance = new UserPresenceService()
export { instance as UserPresenceService }
export default instance
