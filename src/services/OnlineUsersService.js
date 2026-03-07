import { supabase } from './DatabaseService'
import { RegionService } from './RegionService'
import { UserPresenceService } from './UserPresenceService'
import { UserService } from './UserService'
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
function detectDeviceType() {
    if (typeof navigator === 'undefined') return 'desktop'
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') ? 'mobile' : 'desktop'
}
let _hasDeviceTypeColumn = null
async function checkHasDeviceType() {
    if (_hasDeviceTypeColumn !== null) return _hasDeviceTypeColumn
    try {
        const { error } = await supabase.from('users_presence').select('device_type').limit(0)
        _hasDeviceTypeColumn = !error
    } catch {
        _hasDeviceTypeColumn = false
    }
    return _hasDeviceTypeColumn
}
class OnlineUsersService {
    constructor() {
        this.users = []
        this.regionNames = {}
        this.roleColorMap = {}
        this.currentUserId = null
        this.listeners = []
        this.isInitialized = false
        this.isLoading = true
        this._refreshing = false
        this._userMetaCache = {}
    }
    async init() {
        if (this.isInitialized) return
        this.isInitialized = true
        try {
            const [currentUser, allRoles] = await Promise.all([
                UserService.getCurrentUser(),
                UserService.getAllRoles().catch(() => [])
            ])
            this.currentUserId = currentUser?.id || null
            this.roleColorMap = buildRoleColorMap(allRoles)
        } catch {}
        await this.refresh(true)
        UserPresenceService.addListener(() => this.refresh())
    }
    async refresh(force = false) {
        if (this._refreshing && !force) return
        this._refreshing = true
        try {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
            const hasCol = await checkHasDeviceType()
            const cols = hasCol
                ? 'user_id, last_seen, last_activity, is_online, device_type'
                : 'user_id, last_seen, last_activity, is_online'
            const { data: presences, error } = await supabase
                .from('users_presence')
                .select(cols)
                .or(`is_online.eq.true,last_activity.gte.${fiveMinutesAgo}`)
                .order('last_activity', { ascending: false })
            if (error) {
                this.isLoading = false
                this._notify()
                return
            }
            let presenceList = presences || []
            if (this.currentUserId && !presenceList.some((p) => p.user_id === this.currentUserId)) {
                presenceList = [
                    ...presenceList,
                    {
                        device_type: detectDeviceType(),
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
            this.users = presenceList
                .map((p) => {
                    const meta = this._userMetaCache[p.user_id] || {}
                    const isSelf = p.user_id === this.currentUserId
                    return {
                        deviceType: isSelf ? detectDeviceType() : p.device_type || 'desktop',
                        id: p.user_id,
                        isCurrentUser: p.user_id === this.currentUserId,
                        lastActivity: p.last_activity,
                        lastSeen: p.last_seen,
                        name: meta.name || 'Unknown User',
                        regionCode: meta.regionCode || null,
                        roleWeight: meta.roleWeight || 0,
                        roles: meta.roles || []
                    }
                })
                .sort((a, b) => (b.roleWeight || 0) - (a.roleWeight || 0))
            this.isLoading = false
            await this._resolveRegionNames(this.users)
            this._notify()
        } catch {
            this.isLoading = false
            this._notify()
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
                    const regions = await RegionService.fetchRegionsByPlantCode(profile.plant_code)
                    if (regions?.length > 0) regionCode = regions[0].regionCode || regions[0].region_code
                } catch {}
            }
            this._userMetaCache[userId] = {
                name,
                regionCode,
                roleWeight: roleWeight || 0,
                roles: extractRoleNames(rolesData)
            }
        } catch {
            this._userMetaCache[userId] = { name: 'Unknown User', regionCode: null, roleWeight: 0, roles: [] }
        }
    }
    async _resolveRegionNames(users) {
        const codes = [...new Set(users.map((u) => u.regionCode).filter(Boolean))]
        let changed = false
        for (const code of codes) {
            if (this.regionNames[code]) continue
            try {
                const region = await RegionService.fetchRegionByCode(code)
                this.regionNames[code] = region?.regionName || region?.region_name || code
            } catch {
                this.regionNames[code] = code
            }
            changed = true
        }
        if (changed) this._notify()
    }
    getUsers() {
        return this.users
    }
    getRegionNames() {
        return this.regionNames
    }
    getRoleColorMap() {
        return this.roleColorMap
    }
    getIsLoading() {
        return this.isLoading
    }
    addListener(cb) {
        if (typeof cb === 'function') this.listeners.push(cb)
    }
    removeListener(cb) {
        this.listeners = this.listeners.filter((l) => l !== cb)
    }
    _notify() {
        const snapshot = {
            isLoading: this.isLoading,
            regionNames: this.regionNames,
            roleColorMap: this.roleColorMap,
            users: this.users
        }
        this.listeners.forEach((cb) => {
            try {
                cb(snapshot)
            } catch {}
        })
    }
}
const instance = new OnlineUsersService()
export { instance as OnlineUsersService }
export default instance
