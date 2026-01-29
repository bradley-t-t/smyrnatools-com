import APIUtility from '../utils/APIUtility'
import { supabase } from './DatabaseService'
import { RegionService } from './RegionService'

const USER_FUNCTION = '/user-service'

class UserServiceImpl {
    constructor() {
        this.userProfileCache = new Map()
    }

    async getCurrentUser() {
        const userId = localStorage.getItem('smyrna_session') || sessionStorage.getItem('userId')
        if (!userId) return null
        return { id: userId }
    }

    async getUserById(userId) {
        if (!userId) return { id: 'unknown', name: 'Unknown User' }
        if (this.userProfileCache.has(userId)) {
            const cachedUser = this.userProfileCache.get(userId)
            return {
                id: userId,
                name: cachedUser.displayName || cachedUser.name || `User ${userId.slice(0, 8)}`,
                email: cachedUser.email
            }
        }
        const { json } = await APIUtility.post(`${USER_FUNCTION}/user-by-id`, { userId })
        if (!json || !json.id) {
            const basicUser = { id: userId, name: `User ${userId.slice(0, 8)}` }
            this.userProfileCache.set(userId, basicUser)
            return basicUser
        }
        this.userProfileCache.set(userId, json)
        return {
            id: json.id,
            name: json.name || json.email?.split('@')[0] || `User ${userId.slice(0, 8)}`,
            email: json.email
        }
    }

    async getUserDisplayName(userId) {
        if (!userId) return 'System'
        if (userId === 'anonymous') return 'Anonymous'
        const { json } = await APIUtility.post(`${USER_FUNCTION}/display-name`, { userId }, { skipAuthCheck: true })
        return json
    }

    async getUserWeight(userId) {
        if (!userId) return 0
        const { json } = await APIUtility.post(`${USER_FUNCTION}/highest-role`, { userId }, { skipAuthCheck: true })
        if (!json || typeof json.weight !== 'number') return 0
        return json.weight
    }
}

export const UserService = new UserServiceImpl()

UserService.userRolesCache = new Map()
UserService.rolesPermissionsCache = new Map()

UserService.clearCache = function () {
    this.userRolesCache.clear()
    this.rolesPermissionsCache.clear()
}

UserService.getAllRoles = async function () {
    const { json } = await APIUtility.post(`${USER_FUNCTION}/all-roles`)
    return json ?? []
}

UserService.getRoleById = async function (roleId) {
    if (!roleId) throw new Error('Role ID is required')
    const { json } = await APIUtility.post(`${USER_FUNCTION}/role-by-id`, { roleId })
    return json
}

UserService.getRoleByName = async function (roleName) {
    if (!roleName) throw new Error('Role name is required')
    const { json } = await APIUtility.post(`${USER_FUNCTION}/role-by-name`, { roleName })
    return json
}

UserService.getUserRoles = async function (userId) {
    if (!userId) throw new Error('User ID is required')
    const id = typeof userId === 'object' && userId.id ? userId.id : userId
    if (this.userRolesCache.has(id)) return this.userRolesCache.get(id)
    const { json } = await APIUtility.post(
        `${USER_FUNCTION}/user-roles`,
        { userId: id },
        {
            maxRetries: 3,
            retryDelay: 2000,
            skipAuthCheck: true
        }
    )
    const roles = json ?? []
    this.userRolesCache.set(id, roles)
    return roles
}

UserService.getUserProfile = async function (userId) {
    if (!userId) throw new Error('User ID is required')
    const id = typeof userId === 'object' && userId.id ? userId.id : userId
    const { json } = await APIUtility.post(`${USER_FUNCTION}/user-profile`, { userId: id })
    return json
}

UserService.getUserPermissions = async function (userId) {
    if (!userId) throw new Error('User ID is required')
    const id = typeof userId === 'object' && userId.id ? userId.id : userId
    const { json } = await APIUtility.post(`${USER_FUNCTION}/user-permissions`, { userId: id })
    return json ?? []
}

UserService.hasPermission = async function (userId, permission) {
    if (!userId || !permission) return false
    if (permission === 'my_account.view') return true
    const id = typeof userId === 'object' && userId.id ? userId.id : userId
    const { json } = await APIUtility.post(`${USER_FUNCTION}/has-permission`, { userId: id, permission })
    return !!json
}

UserService.hasAnyPermission = async function (userId, permissions) {
    if (!userId || !permissions?.length) return false
    const id = typeof userId === 'object' && userId.id ? userId.id : userId
    const { json } = await APIUtility.post(`${USER_FUNCTION}/has-any-permission`, { userId: id, permissions })
    return !!json
}

UserService.hasAllPermissions = async function (userId, permissions) {
    if (!userId || !permissions?.length) return false
    const id = typeof userId === 'object' && userId.id ? userId.id : userId
    const { json } = await APIUtility.post(`${USER_FUNCTION}/has-all-permissions`, { userId: id, permissions })
    return !!json
}

UserService.getMenuVisibility = async function (userId, requiredPermissions = {}) {
    if (!userId) return {}
    const id = typeof userId === 'object' && userId.id ? userId.id : userId
    const { json } = await APIUtility.post(`${USER_FUNCTION}/menu-visibility`, { userId: id, requiredPermissions })
    return json ?? {}
}

UserService.getHighestRole = async function (userId) {
    if (!userId) return null
    const id = typeof userId === 'object' && userId.id ? userId.id : userId
    const { json } = await APIUtility.post(`${USER_FUNCTION}/highest-role`, { userId: id }, { skipAuthCheck: true })
    return json
}

UserService.assignRole = async function (userId, roleId) {
    if (!userId || !roleId) throw new Error('User ID and role ID are required')
    const id = typeof userId === 'object' && userId.id ? userId.id : userId
    const { json } = await APIUtility.post(`${USER_FUNCTION}/assign-role`, { userId: id, roleId })
    this.userRolesCache.delete(id)
    return !!json
}

UserService.removeRole = async function (userId, roleId) {
    if (!userId || !roleId) throw new Error('User ID and role ID are required')
    const id = typeof userId === 'object' && userId.id ? userId.id : userId
    await APIUtility.post(`${USER_FUNCTION}/remove-role`, { userId: id, roleId })
    this.userRolesCache.delete(id)
    return true
}

UserService.createRole = async function (name, permissions = [], weight = 0) {
    if (!name) throw new Error('Role name is required')
    const { json } = await APIUtility.post(`${USER_FUNCTION}/create-role`, { name, permissions, weight })
    this.clearCache()
    return json
}

UserService.updateRole = async function (roleId, updates) {
    if (!roleId || !updates) throw new Error('Role ID and updates are required')
    await APIUtility.post(`${USER_FUNCTION}/update-role`, { roleId, updates })
    this.clearCache()
    return true
}

UserService.deleteRole = async function (roleId) {
    if (!roleId) throw new Error('Role ID is required')
    await APIUtility.post(`${USER_FUNCTION}/delete-role`, { roleId })
    this.clearCache()
    return true
}

UserService.getUserPlant = async function (userId) {
    if (!userId) return null
    const id = typeof userId === 'object' && userId.id ? userId.id : userId
    const { json } = await APIUtility.post(`${USER_FUNCTION}/user-plant`, { userId: id })
    return json ?? null
}

UserService.getUserFirstName = async function (userId) {
    if (!userId) return ''
    const id = typeof userId === 'object' && userId.id ? userId.id : userId
    try {
        const { data, error } = await supabase.from('users_profiles').select('first_name').eq('id', id).maybeSingle()
        if (error) throw error
        return data?.first_name || ''
    } catch (err) {
        console.error('Error fetching user first name:', err)
        return ''
    }
}

UserService.getUserLastName = async function (userId) {
    if (!userId) return ''
    const id = typeof userId === 'object' && userId.id ? userId.id : userId
    try {
        const { data, error } = await supabase.from('users_profiles').select('last_name').eq('id', id).maybeSingle()
        if (error) throw error
        return data?.last_name || ''
    } catch (err) {
        console.error('Error fetching user last name:', err)
        return ''
    }
}

UserService.getAllUsersWithProfilesAndRoles = async function () {
    const [
        { data: users, error: usersError },
        { data: profiles, error: profilesError },
        { data: permissions, error: permissionsError },
        { data: rolesList, error: rolesError }
    ] = await Promise.all([
        supabase.from('users').select('id, email, created_at, updated_at'),
        supabase.from('users_profiles').select('id, first_name, last_name, plant_code, created_at, updated_at'),
        supabase.from('users_permissions').select('user_id, role_id'),
        supabase.from('users_roles').select('id, name, weight')
    ])
    if (usersError) throw usersError
    if (profilesError) throw profilesError
    if (permissionsError) throw permissionsError
    if (rolesError) throw rolesError
    const managersData = users.map((user) => {
        const profile = profiles.find((p) => p.id === user.id) || {}
        const permission = permissions.find((p) => p.user_id === user.id) || {}
        const role = permission.role_id ? rolesList.find((r) => r.id === permission.role_id) : null
        return {
            id: user.id,
            email: user.email,
            firstName: profile.first_name || '',
            lastName: profile.last_name || '',
            plantCode: profile.plant_code || '',
            roleName: role?.name || 'User',
            roleWeight: role?.weight || 0,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        }
    })
    return managersData
}

UserService.getPermittedRegions = async function (userId) {
    if (!userId) return []
    const id = typeof userId === 'object' && userId.id ? userId.id : userId
    const allPerm = await this.hasPermission(id, 'regions.select.all').catch(() => false)
    if (allPerm) {
        try {
            return await RegionService.fetchRegions()
        } catch {
            return []
        }
    }
    const { data: profile } = await supabase
        .from('users_profiles')
        .select('plant_code, regions')
        .eq('id', id)
        .maybeSingle()
    const profileRegions = Array.isArray(profile?.regions)
        ? profile.regions.filter((r) => typeof r === 'string' && r.trim())
        : []
    if (!profileRegions.length) {
        if (profile?.plant_code) {
            try {
                return await RegionService.fetchRegionsByPlantCode(profile.plant_code)
            } catch {
                return []
            }
        }
        return []
    }
    try {
        const allFetched = await RegionService.fetchRegions()
        const permitted = []
        const addedCodes = new Set()
        for (const pr of profileRegions) {
            const lowerPr = pr.toLowerCase().trim()
            for (const r of allFetched) {
                const code = String(r.regionCode || '')
                    .toLowerCase()
                    .trim()
                const name = String(r.regionName || '')
                    .toLowerCase()
                    .trim()
                if (code === lowerPr || name === lowerPr) {
                    if (!addedCodes.has(r.regionCode)) {
                        permitted.push(r)
                        addedCodes.add(r.regionCode)
                    }
                    break
                }
            }
        }
        if (permitted.length) return permitted
        if (profile?.plant_code) {
            return await RegionService.fetchRegionsByPlantCode(profile.plant_code)
        }
        return []
    } catch {
        return []
    }
}
