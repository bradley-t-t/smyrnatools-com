import APIUtility from '../utils/APIUtility'
import { requireEntityId, resolveEntityId } from '../utils/BaseAssetUtility'
import { Database } from './DatabaseService'
import { PlantService } from './PlantService'
import { getSessionUserId } from './SessionService'

const USER_FUNCTION = '/user-service'
const PROFILES_TABLE = 'users_profiles'
const USER_ID_REQUIRED = 'User ID is required'
const DEFAULT_ROLE_NAME = 'User'
const ALWAYS_PERMITTED = 'my_account.view'
const ALL_REGIONS_PERMISSION = 'regions.select.all'
/** Role weight at or above which a user bypasses per-profile region scoping
 *  and gets every region in the top-bar selector regardless of their
 *  `profiles.regions` / `plant_code` configuration. Mirrors the operations
 *  contract that elevated roles (district managers and up) need fleet-wide
 *  visibility without an admin having to flip the all-regions permission
 *  on each one individually. */
const ALL_REGIONS_ROLE_WEIGHT_THRESHOLD = 70
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
        const { data, error } = await Database.from(PROFILES_TABLE)
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
/** Throws the first error found in an array of database query results. */
const throwFirstError = (results) => {
    const firstError = results.find((r) => r.error)?.error
    if (firstError) throw firstError
}
/**
 * Centralized user management service.
 * Handles authentication state, profiles, roles, permissions, and region access.
 */
class UserServiceImpl {
    userRolesCache = new Map()
    clearCache() {
        this.userRolesCache.clear()
    }
    async getCurrentUser() {
        const userId = getSessionUserId()
        return userId ? { id: userId } : null
    }
    async getUserDisplayName(userId) {
        if (!userId) return 'System'
        if (userId === 'anonymous') return 'Anonymous'
        const { json } = await postUser('display-name', { userId }, { skipAuthCheck: true })
        if (typeof json === 'string') return json
        const firstName = await fetchProfileField(userId, 'first_name')
        const lastName = await fetchProfileField(userId, 'last_name')
        const fullName = `${firstName} ${lastName}`.trim()
        return fullName || fallbackName(userId)
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
    async getHighestRole(userId) {
        if (!userId) return null
        const { json } = await postUser('highest-role', { userId: resolveEntityId(userId) }, { skipAuthCheck: true })
        return json
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
    async getUserPlant(userId) {
        if (!userId) return null
        const { json } = await postUser('user-plant', { userId: resolveEntityId(userId) })
        return json ?? null
    }
    async getMyPlant() {
        const { json } = await postUser('my-plant', {})
        return json ?? null
    }
    async getAdditionalAssignedPlants(userId) {
        if (!userId) return []
        const { json } = await postUser(
            'user-additional-plants',
            { userId: resolveEntityId(userId) },
            { maxRetries: 0 }
        )
        return Array.isArray(json) ? json : []
    }
    async getAllUsersWithProfilesAndRoles() {
        const results = await Promise.all([
            Database.from('users').select('id, email, last_login_at, created_at, updated_at'),
            Database.from(PROFILES_TABLE).select('*'),
            Database.from('users_permissions').select('user_id, role_id'),
            Database.from('users_roles').select('id, name, weight')
        ])
        throwFirstError(results)
        const [{ data: users }, { data: profiles }, { data: permissions }, { data: rolesList }] = results
        const profilesByUserId = new Map(profiles.map((p) => [p.id, p]))
        const permissionsByUserId = new Map(permissions.map((p) => [p.user_id, p]))
        const rolesById = new Map(rolesList.map((r) => [r.id, r]))
        return users.map((user) => {
            const profile = profilesByUserId.get(user.id) ?? {}
            const permission = permissionsByUserId.get(user.id)
            const role = permission?.role_id ? (rolesById.get(permission.role_id) ?? null) : null
            return {
                additionalAssignedPlants: Array.isArray(profile.additional_assigned_plants)
                    ? profile.additional_assigned_plants
                    : [],
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
        if (hasAllRegions) return safelyFetchRegions(() => PlantService.fetchRegions())
        // Role-weight bypass: users at or above the elevated threshold get every
        // region regardless of profile scoping. Runs after the explicit
        // permission check so the existing all-regions permission still wins —
        // this is an additional fast-path for the role hierarchy, not a
        // replacement.
        const highestRole = await this.getHighestRole(id).catch(() => null)
        const roleWeight = Number(highestRole?.weight) || 0
        if (roleWeight >= ALL_REGIONS_ROLE_WEIGHT_THRESHOLD) {
            return safelyFetchRegions(() => PlantService.fetchRegions())
        }
        const { data: profile } = await Database.from(PROFILES_TABLE)
            .select('plant_code, regions')
            .eq('id', id)
            .maybeSingle()
        const profileRegions = Array.isArray(profile?.regions)
            ? profile.regions.filter((r) => typeof r === 'string' && r.trim())
            : []
        if (!profileRegions.length) {
            if (!profile?.plant_code) return []
            return safelyFetchRegions(() => PlantService.fetchRegionsByPlantCode(profile.plant_code))
        }
        return safelyFetchRegions(async () => {
            const allRegions = await PlantService.fetchRegions()
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
            if (profile?.plant_code) return PlantService.fetchRegionsByPlantCode(profile.plant_code)
            return []
        })
    }
    async updateManager(userId, { profile, email, roleId }) {
        if (!userId) throw new Error(USER_ID_REQUIRED)
        await postUser('update-manager', { email, profile, roleId, userId: resolveEntityId(userId) })
        this.clearCache()
        return true
    }
    async deleteManager(userId) {
        if (!userId) throw new Error(USER_ID_REQUIRED)
        await postUser('delete-manager', { userId: resolveEntityId(userId) })
        this.clearCache()
        return true
    }
}
export const UserService = new UserServiceImpl()
