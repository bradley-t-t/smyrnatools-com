import APIUtility from '../utils/APIUtility'
import resolveEntityId, { requireEntityId } from '../utils/EntityIdUtility'
import { supabase } from './DatabaseService'
import { RegionService } from './RegionService'
const USER_FUNCTION = '/user-service'
const PROFILES_TABLE = 'users_profiles'
const USER_ID_REQUIRED = 'User ID is required'
const SESSION_KEY = 'smyrna_session'
const SESSION_FALLBACK_KEY = 'userId'
const UNKNOWN_USER = { id: 'unknown', name: 'Unknown User' }
const DEFAULT_ROLE_NAME = 'User'
const ALWAYS_PERMITTED = 'my_account.view'
const ALL_REGIONS_PERMISSION = 'regions.select.all'
/** Centralized API helper for all user-service endpoints. */
const postUser = (endpoint, body, options) => APIUtility.post(`${USER_FUNCTION}/${endpoint}`, body, options)
const resolveUser = (userId) => requireEntityId(userId, USER_ID_REQUIRED)
const fallbackName = (userId) => `User ${userId.slice(0, 8)}`
/**
 * Fetches a single profile field directly from the database.
 * More efficient than fetching entire profile records when only one field is needed.
 */
const fetchProfileField = async (userId, field) => {
    if (!userId) return ''
    try {
        const { data, error } = await supabase
            .from(PROFILES_TABLE)
            .select(field)
            .eq('id', resolveEntityId(userId))
            .maybeSingle()
        if (error) throw error
        return data?.[field] || ''
    } catch {
        return ''
    }
}
/** Shared guard + postUser pattern for permission-check endpoints. */
const checkPermission = async (userId, endpoint, payload) => {
    if (!userId) return false
    const { json } = await postUser(endpoint, { ...payload, userId: resolveEntityId(userId) })
    return !!json
}
/** Safely fetches regions, returning empty array on failure. */
const safelyFetchRegions = async (fetcher) => {
    try {
        return await fetcher()
    } catch {
        return []
    }
}
/** Matches a profile region string against all available regions by code or name. */
const findMatchingRegion = (normalizedInput, allRegions) =>
    allRegions.find((r) => {
        const code = String(r.regionCode || '')
            .toLowerCase()
            .trim()
        const name = String(r.regionName || '')
            .toLowerCase()
            .trim()
        return code === normalizedInput || name === normalizedInput
    })
/** Throws the first error found in an array of Supabase query results. */
const throwFirstError = (results) => {
    const firstError = results.find((r) => r.error)?.error
    if (firstError) throw firstError
}
/**
 * Centralized user management service.
 * Handles authentication state, profiles, roles, permissions, and region access.
 */
class UserServiceImpl {
    userProfileCache = new Map()
    userRolesCache = new Map()
    rolesPermissionsCache = new Map()
    clearCache() {
        this.userRolesCache.clear()
        this.rolesPermissionsCache.clear()
    }
    async getCurrentUser() {
        const userId = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_FALLBACK_KEY)
        return userId ? { id: userId } : null
    }
    async getUserById(userId) {
        if (!userId) return UNKNOWN_USER
        if (this.userProfileCache.has(userId)) {
            const cached = this.userProfileCache.get(userId)
            return {
                email: cached.email,
                id: userId,
                name: cached.displayName || cached.name || fallbackName(userId)
            }
        }
        const { json } = await postUser('user-by-id', { userId })
        if (!json?.id) {
            const basicUser = { id: userId, name: fallbackName(userId) }
            this.userProfileCache.set(userId, basicUser)
            return basicUser
        }
        this.userProfileCache.set(userId, json)
        return {
            email: json.email,
            id: json.id,
            name: json.name || json.email?.split('@')[0] || fallbackName(userId)
        }
    }
    async getUserDisplayName(userId) {
        if (!userId) return 'System'
        if (userId === 'anonymous') return 'Anonymous'
        const { json } = await postUser('display-name', { userId }, { skipAuthCheck: true })
        return json
    }
    async getUserWeight(userId) {
        if (!userId) return 0
        const { json } = await postUser('highest-role', { userId }, { skipAuthCheck: true })
        return typeof json?.weight === 'number' ? json.weight : 0
    }
    async getAllRoles() {
        const { json } = await postUser('all-roles')
        return Array.isArray(json) ? json : []
    }
    async getRoleById(roleId) {
        if (!roleId) throw new Error('Role ID is required')
        const { json } = await postUser('role-by-id', { roleId })
        return json
    }
    async getRoleByName(roleName) {
        if (!roleName) throw new Error('Role name is required')
        const { json } = await postUser('role-by-name', { roleName })
        return json
    }
    async getUserRoles(userId) {
        const id = resolveUser(userId)
        if (this.userRolesCache.has(id)) return this.userRolesCache.get(id)
        const { json } = await postUser(
            'user-roles',
            { userId: id },
            { maxRetries: 3, retryDelay: 2000, skipAuthCheck: true }
        )
        const roles = json ?? []
        this.userRolesCache.set(id, roles)
        return roles
    }
    async getUserProfile(userId) {
        const { json } = await postUser('user-profile', { userId: resolveUser(userId) })
        return json
    }
    async getUserPermissions(userId) {
        const { json } = await postUser('user-permissions', { userId: resolveUser(userId) })
        return json ?? []
    }
    async hasPermission(userId, permission) {
        if (!permission) return false
        if (permission === ALWAYS_PERMITTED) return true
        return checkPermission(userId, 'has-permission', { permission })
    }
    async hasAnyPermission(userId, permissions) {
        if (!permissions?.length) return false
        return checkPermission(userId, 'has-any-permission', { permissions })
    }
    async hasAllPermissions(userId, permissions) {
        if (!permissions?.length) return false
        return checkPermission(userId, 'has-all-permissions', { permissions })
    }
    async getMenuVisibility(userId, requiredPermissions = {}) {
        if (!userId) return {}
        const { json } = await postUser('menu-visibility', { requiredPermissions, userId: resolveEntityId(userId) })
        return json ?? {}
    }
    async getHighestRole(userId) {
        if (!userId) return null
        const { json } = await postUser('highest-role', { userId: resolveEntityId(userId) }, { skipAuthCheck: true })
        return json
    }
    async assignRole(userId, roleId) {
        if (!userId || !roleId) throw new Error('User ID and role ID are required')
        const id = resolveEntityId(userId)
        const { json } = await postUser('assign-role', { roleId, userId: id })
        this.userRolesCache.delete(id)
        return !!json
    }
    async removeRole(userId, roleId) {
        if (!userId || !roleId) throw new Error('User ID and role ID are required')
        const id = resolveEntityId(userId)
        await postUser('remove-role', { roleId, userId: id })
        this.userRolesCache.delete(id)
        return true
    }
    async createRole(name, permissions = [], weight = 0) {
        if (!name) throw new Error('Role name is required')
        const { json } = await postUser('create-role', { name, permissions, weight })
        this.clearCache()
        return json
    }
    async updateRole(roleId, updates) {
        if (!roleId || !updates) throw new Error('Role ID and updates are required')
        await postUser('update-role', { roleId, updates })
        this.clearCache()
        return true
    }
    async deleteRole(roleId) {
        if (!roleId) throw new Error('Role ID is required')
        await postUser('delete-role', { roleId })
        this.clearCache()
        return true
    }
    async getUserPlant(userId) {
        if (!userId) return null
        const { json } = await postUser('user-plant', { userId: resolveEntityId(userId) })
        return json ?? null
    }
    async getUserFirstName(userId) {
        return fetchProfileField(userId, 'first_name')
    }
    async getUserLastName(userId) {
        return fetchProfileField(userId, 'last_name')
    }
    async getAllUsersWithProfilesAndRoles() {
        const results = await Promise.all([
            supabase.from('users').select('id, email, last_login_at, created_at, updated_at'),
            supabase.from(PROFILES_TABLE).select('id, first_name, last_name, plant_code, created_at, updated_at'),
            supabase.from('users_permissions').select('user_id, role_id'),
            supabase.from('users_roles').select('id, name, weight')
        ])
        throwFirstError(results)
        const [{ data: users }, { data: profiles }, { data: permissions }, { data: rolesList }] = results
        return users.map((user) => {
            const profile = profiles.find((p) => p.id === user.id) ?? {}
            const permission = permissions.find((p) => p.user_id === user.id)
            const role = permission?.role_id ? rolesList.find((r) => r.id === permission.role_id) : null
            return {
                createdAt: user.created_at,
                email: user.email,
                firstName: profile.first_name || '',
                id: user.id,
                lastLoginAt: user.last_login_at || null,
                lastName: profile.last_name || '',
                plantCode: profile.plant_code || '',
                roleName: role?.name || DEFAULT_ROLE_NAME,
                roleWeight: role?.weight || 0,
                updatedAt: user.updated_at
            }
        })
    }
    /**
     * Resolves which regions a user is permitted to access.
     * Falls back through: all-regions permission → profile regions → plant code lookup.
     */
    async getPermittedRegions(userId) {
        if (!userId) return []
        const id = resolveEntityId(userId)
        const hasAllRegions = await this.hasPermission(id, ALL_REGIONS_PERMISSION).catch(() => false)
        if (hasAllRegions) return safelyFetchRegions(() => RegionService.fetchRegions())
        const { data: profile } = await supabase
            .from(PROFILES_TABLE)
            .select('plant_code, regions')
            .eq('id', id)
            .maybeSingle()
        const profileRegions = Array.isArray(profile?.regions)
            ? profile.regions.filter((r) => typeof r === 'string' && r.trim())
            : []
        if (!profileRegions.length) {
            if (!profile?.plant_code) return []
            return safelyFetchRegions(() => RegionService.fetchRegionsByPlantCode(profile.plant_code))
        }
        return safelyFetchRegions(async () => {
            const allRegions = await RegionService.fetchRegions()
            const addedCodes = new Set()
            const permitted = profileRegions.reduce((acc, regionStr) => {
                const match = findMatchingRegion(regionStr.toLowerCase().trim(), allRegions)
                if (match && !addedCodes.has(match.regionCode)) {
                    addedCodes.add(match.regionCode)
                    acc.push(match)
                }
                return acc
            }, [])
            if (permitted.length) return permitted
            if (profile?.plant_code) return RegionService.fetchRegionsByPlantCode(profile.plant_code)
            return []
        })
    }
}
export const UserService = new UserServiceImpl()
