import APIUtility from '../utils/APIUtility'
import resolveEntityId, { requireEntityId } from '../utils/EntityIdUtility'
import { supabase } from './DatabaseService'
import { RegionService } from './RegionService'

const USER_FUNCTION = '/user-service'
const USERS_PROFILES_TABLE = 'users_profiles'
const USER_ID_REQUIRED = 'User ID is required'

const fallbackUserName = (userId) => `User ${userId.slice(0, 8)}`

const postUser = (endpoint, body, options) => APIUtility.post(`${USER_FUNCTION}/${endpoint}`, body, options)

const resolveUser = (userId) => requireEntityId(userId, USER_ID_REQUIRED)

const fetchProfileField = async (userId, field) => {
    if (!userId) return ''
    const id = resolveEntityId(userId)
    try {
        const { data, error } = await supabase.from(USERS_PROFILES_TABLE).select(field).eq('id', id).maybeSingle()
        if (error) throw error
        return data?.[field] || ''
    } catch {
        return ''
    }
}

class UserServiceImpl {
    constructor() {
        this.userProfileCache = new Map()
        this.userRolesCache = new Map()
        this.rolesPermissionsCache = new Map()
    }

    clearCache() {
        this.userRolesCache.clear()
        this.rolesPermissionsCache.clear()
    }

    async getCurrentUser() {
        const userId = localStorage.getItem('smyrna_session') || sessionStorage.getItem('userId')
        return userId ? { id: userId } : null
    }

    async getUserById(userId) {
        if (!userId) return { id: 'unknown', name: 'Unknown User' }

        if (this.userProfileCache.has(userId)) {
            const cached = this.userProfileCache.get(userId)
            return {
                email: cached.email,
                id: userId,
                name: cached.displayName || cached.name || fallbackUserName(userId)
            }
        }

        const { json } = await postUser('user-by-id', { userId })

        if (!json?.id) {
            const basicUser = { id: userId, name: fallbackUserName(userId) }
            this.userProfileCache.set(userId, basicUser)
            return basicUser
        }

        this.userProfileCache.set(userId, json)
        return {
            email: json.email,
            id: json.id,
            name: json.name || json.email?.split('@')[0] || fallbackUserName(userId)
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
        return json ?? []
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
        const id = resolveUser(userId)
        const { json } = await postUser('user-profile', { userId: id })
        return json
    }

    async getUserPermissions(userId) {
        const id = resolveUser(userId)
        const { json } = await postUser('user-permissions', { userId: id })
        return json ?? []
    }

    async hasPermission(userId, permission) {
        if (!userId || !permission) return false
        if (permission === 'my_account.view') return true
        const id = resolveEntityId(userId)
        const { json } = await postUser('has-permission', { permission, userId: id })
        return !!json
    }

    async hasAnyPermission(userId, permissions) {
        if (!userId || !permissions?.length) return false
        const id = resolveEntityId(userId)
        const { json } = await postUser('has-any-permission', { permissions, userId: id })
        return !!json
    }

    async hasAllPermissions(userId, permissions) {
        if (!userId || !permissions?.length) return false
        const id = resolveEntityId(userId)
        const { json } = await postUser('has-all-permissions', { permissions, userId: id })
        return !!json
    }

    async getMenuVisibility(userId, requiredPermissions = {}) {
        if (!userId) return {}
        const id = resolveEntityId(userId)
        const { json } = await postUser('menu-visibility', { requiredPermissions, userId: id })
        return json ?? {}
    }

    async getHighestRole(userId) {
        if (!userId) return null
        const id = resolveEntityId(userId)
        const { json } = await postUser('highest-role', { userId: id }, { skipAuthCheck: true })
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
        const id = resolveEntityId(userId)
        const { json } = await postUser('user-plant', { userId: id })
        return json ?? null
    }

    async getUserFirstName(userId) {
        return fetchProfileField(userId, 'first_name')
    }

    async getUserLastName(userId) {
        return fetchProfileField(userId, 'last_name')
    }

    async getAllUsersWithProfilesAndRoles() {
        const [
            { data: users, error: usersError },
            { data: profiles, error: profilesError },
            { data: permissions, error: permissionsError },
            { data: rolesList, error: rolesError }
        ] = await Promise.all([
            supabase.from('users').select('id, email, created_at, updated_at'),
            supabase.from(USERS_PROFILES_TABLE).select('id, first_name, last_name, plant_code, created_at, updated_at'),
            supabase.from('users_permissions').select('user_id, role_id'),
            supabase.from('users_roles').select('id, name, weight')
        ])

        if (usersError) throw usersError
        if (profilesError) throw profilesError
        if (permissionsError) throw permissionsError
        if (rolesError) throw rolesError

        return users.map((user) => {
            const profile = profiles.find((p) => p.id === user.id) ?? {}
            const permission = permissions.find((p) => p.user_id === user.id) ?? {}
            const role = permission.role_id ? rolesList.find((r) => r.id === permission.role_id) : null
            return {
                createdAt: user.created_at,
                email: user.email,
                firstName: profile.first_name || '',
                id: user.id,
                lastName: profile.last_name || '',
                plantCode: profile.plant_code || '',
                roleName: role?.name || 'User',
                roleWeight: role?.weight || 0,
                updatedAt: user.updated_at
            }
        })
    }

    async getPermittedRegions(userId) {
        if (!userId) return []
        const id = resolveEntityId(userId)

        const hasAllRegionsPermission = await this.hasPermission(id, 'regions.select.all').catch(() => false)
        if (hasAllRegionsPermission) {
            try {
                return await RegionService.fetchRegions()
            } catch {
                return []
            }
        }

        const { data: profile } = await supabase
            .from(USERS_PROFILES_TABLE)
            .select('plant_code, regions')
            .eq('id', id)
            .maybeSingle()

        const profileRegions = Array.isArray(profile?.regions)
            ? profile.regions.filter((r) => typeof r === 'string' && r.trim())
            : []

        if (!profileRegions.length) {
            if (!profile?.plant_code) return []
            try {
                return await RegionService.fetchRegionsByPlantCode(profile.plant_code)
            } catch {
                return []
            }
        }

        try {
            const allRegions = await RegionService.fetchRegions()
            const addedCodes = new Set()

            const permitted = profileRegions.reduce((acc, profileRegion) => {
                const normalizedProfileRegion = profileRegion.toLowerCase().trim()
                const match = allRegions.find((r) => {
                    const code = String(r.regionCode || '')
                        .toLowerCase()
                        .trim()
                    const name = String(r.regionName || '')
                        .toLowerCase()
                        .trim()
                    return code === normalizedProfileRegion || name === normalizedProfileRegion
                })
                if (match && !addedCodes.has(match.regionCode)) {
                    addedCodes.add(match.regionCode)
                    acc.push(match)
                }
                return acc
            }, [])

            if (permitted.length) return permitted
            if (profile?.plant_code) return await RegionService.fetchRegionsByPlantCode(profile.plant_code)
            return []
        } catch {
            return []
        }
    }
}

export const UserService = new UserServiceImpl()
