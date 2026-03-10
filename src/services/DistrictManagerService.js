import { supabase } from './DatabaseService'
const ELIGIBLE_ROLES_TABLE = 'district_manager_eligible_roles'
const PLANTS_TABLE = 'district_manager_plants'
/**
 * Manages District Manager plant-responsibility assignments via direct Supabase queries.
 * Controls which roles are eligible and which plants each user is responsible for.
 */
class DistrictManagerServiceImpl {
    eligibleRolesCache = null
    userPlantsCache = new Map()
    // --- Eligible Roles ---
    async fetchEligibleRoles() {
        const { data, error } = await supabase
            .from(ELIGIBLE_ROLES_TABLE)
            .select('id, role_id, created_at, users_roles(id, name, weight)')
            .order('created_at')
        if (error) throw new Error('Failed to fetch eligible roles')
        this.eligibleRolesCache = data ?? []
        return this.eligibleRolesCache
    }
    async addEligibleRole(roleId) {
        if (!roleId) throw new Error('Role ID is required')
        const { error } = await supabase
            .from(ELIGIBLE_ROLES_TABLE)
            .insert({ created_at: new Date().toISOString(), role_id: roleId })
        if (error) throw new Error(error.code === '23505' ? 'Role is already eligible' : 'Failed to add eligible role')
        this.eligibleRolesCache = null
        return true
    }
    async removeEligibleRole(roleId) {
        if (!roleId) throw new Error('Role ID is required')
        const { error } = await supabase.from(ELIGIBLE_ROLES_TABLE).delete().eq('role_id', roleId)
        if (error) throw new Error('Failed to remove eligible role')
        this.eligibleRolesCache = null
        return true
    }
    async isRoleEligible(roleId) {
        if (!roleId) return false
        if (this.eligibleRolesCache) {
            return this.eligibleRolesCache.some((r) => r.role_id === roleId)
        }
        try {
            const { data, error } = await supabase
                .from(ELIGIBLE_ROLES_TABLE)
                .select('id')
                .eq('role_id', roleId)
                .maybeSingle()
            if (error) return false
            return !!data
        } catch {
            return false
        }
    }
    // --- User Plant Assignments ---
    async fetchUserPlants(userId) {
        if (!userId) throw new Error('User ID is required')
        if (this.userPlantsCache.has(userId)) return this.userPlantsCache.get(userId)
        const { data, error } = await supabase
            .from(PLANTS_TABLE)
            .select('id, user_id, plant_code, created_at')
            .eq('user_id', userId)
            .order('plant_code')
        if (error) throw new Error('Failed to fetch user plants')
        const plants = data ?? []
        this.userPlantsCache.set(userId, plants)
        return plants
    }
    async updateUserPlants(userId, plantCodes = []) {
        if (!userId) throw new Error('User ID is required')
        // Delete existing assignments
        const { error: deleteError } = await supabase.from(PLANTS_TABLE).delete().eq('user_id', userId)
        if (deleteError) throw new Error('Failed to clear existing assignments')
        // Insert new assignments
        const validCodes = plantCodes.filter((v) => typeof v === 'string' && v.trim())
        if (validCodes.length) {
            const now = new Date().toISOString()
            const rows = validCodes.map((code) => ({
                created_at: now,
                plant_code: code.trim(),
                user_id: userId
            }))
            const { error: insertError } = await supabase.from(PLANTS_TABLE).insert(rows)
            if (insertError) throw new Error('Failed to assign plants')
        }
        this.userPlantsCache.delete(userId)
        return true
    }
    getUserPlantCodes(userId) {
        const cached = this.userPlantsCache.get(userId)
        if (!cached) return []
        return cached.map((r) => r.plant_code)
    }
    clearCache() {
        this.eligibleRolesCache = null
        this.userPlantsCache.clear()
    }
}
export const DistrictManagerService = new DistrictManagerServiceImpl()
