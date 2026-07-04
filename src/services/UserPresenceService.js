import APIUtility from '../utils/APIUtility'
import { detectDeviceType } from '../utils/DeviceUtility'
import {
    ACTIVITY_THROTTLE_MS,
    buildRoleColorMap,
    CLEANUP_INTERVAL_MS,
    extractRegionCode,
    extractRoleNames,
    getActiveDevices,
    HEARTBEAT_INTERVAL_MS,
    STALE_THRESHOLD
} from '../utils/UserPresenceUtility'
import { Database } from './DatabaseService'
import { PlantService } from './PlantService'
import { UserService } from './UserService'

const PRESENCE_FUNCTION = '/user-presence-service'

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

async function mergeActiveDevice(userId, device) {
    const hasCol = await checkActiveDevicesCol()
    if (!hasCol) return
    try {
        await APIUtility.post(`${PRESENCE_FUNCTION}/merge-device`, { device, userId })
    } catch (err) {
        console.error('Failed to merge active device:', err)
    }
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
        // Promise lock: concurrent callers (e.g. React StrictMode double-invoke)
        // share the same in-flight setup so we never subscribe the realtime
        // channel twice, which would throw "cannot add postgres_changes
        // callbacks after subscribe()".
        if (this._setupPromise) return this._setupPromise
        this._setupPromise = (async () => {
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
            } finally {
                this._setupPromise = null
            }
        })()
        return this._setupPromise
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
            await APIUtility.post(`${PRESENCE_FUNCTION}/update-activity`, { userId: this.currentUserId })
            mergeActiveDevice(this.currentUserId, detectDeviceType())
            const today = new Date().toISOString().split('T')[0]
            if (this.lastLoginDateWritten !== today) {
                this.lastLoginDateWritten = today
                try {
                    await APIUtility.post(`${PRESENCE_FUNCTION}/update-last-login`, {
                        date: today,
                        userId: this.currentUserId
                    })
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
        this._clearInterval('activityRefreshInterval')
        this.activityRefreshInterval = setInterval(() => {
            this.notifyListeners()
        }, CLEANUP_INTERVAL_MS)
    }

    async setUserOnline(userId) {
        if (!userId) return false
        try {
            await APIUtility.post(`${PRESENCE_FUNCTION}/set-online`, { userId })
            mergeActiveDevice(userId, detectDeviceType())
            return true
        } catch (err) {
            console.error('Failed to set user online:', err)
            return false
        }
    }

    async setUserOffline(userId) {
        if (!userId) return false
        try {
            await APIUtility.post(`${PRESENCE_FUNCTION}/set-offline`, { userId })
            return true
        } catch (err) {
            console.error('Failed to set user offline:', err)
            return false
        }
    }

    async updateHeartbeat() {
        if (!this.currentUserId) return false
        try {
            await APIUtility.post(`${PRESENCE_FUNCTION}/heartbeat`, { userId: this.currentUserId })
            return true
        } catch (err) {
            console.error('Failed to update heartbeat:', err)
            return false
        }
    }

    startHeartbeat() {
        this._clearInterval('heartbeatInterval')
        this.heartbeatInterval = setInterval(() => this.updateHeartbeat(), HEARTBEAT_INTERVAL_MS)
    }

    startCleanup() {
        this._clearInterval('cleanupInterval')
        this.cleanupInterval = setInterval(async () => {
            try {
                await APIUtility.post(`${PRESENCE_FUNCTION}/cleanup`, {})
                this.notifyListeners()
            } catch (err) {
                console.error('Failed to clean up stale presence records:', err)
            }
        }, CLEANUP_INTERVAL_MS)
    }

    handleBeforeUnload() {
        if (!this.currentUserId) return
        /* Routes through APIUtility so session credentials are attached.
         * `keepalive: true` lets the request finish after the page
         * unloads, the same as a sendBeacon would. */
        APIUtility.post(
            `${PRESENCE_FUNCTION}/set-offline`,
            { userId: this.currentUserId },
            { keepalive: true, maxRetries: 0 }
        ).catch((err) => console.error('Failed to set offline on beforeunload:', err))
    }

    handleOnlineStatusChange(isOnline) {
        if (!this.currentUserId) return
        if (isOnline) {
            this.setUserOnline(this.currentUserId)
            this.startHeartbeat()
        } else {
            this.setUserOffline(this.currentUserId)
            this._clearInterval('heartbeatInterval')
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

    _clearInterval(name) {
        if (this[name]) {
            clearInterval(this[name])
            this[name] = null
        }
    }

    cleanup() {
        this._clearInterval('heartbeatInterval')
        this._clearInterval('cleanupInterval')
        this._clearInterval('activityRefreshInterval')
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
