import { useCallback, useEffect, useMemo, useState } from 'react'

import { Database } from '../../services/DatabaseService'
import { PlantService } from '../../services/PlantService'
import { UserService } from '../../services/UserService'

/**
 * Resolves the active region code: prefers the user's selected region, then
 * falls back to the region associated with the user's assigned plant.
 */
async function resolveActiveRegionCode(preferenceRegionCode) {
    let regionCode = preferenceRegionCode || ''
    if (regionCode) return regionCode
    const user = await UserService.getCurrentUser()
    const uid = user?.id || ''
    if (!uid) return ''
    const profilePlant = await UserService.getUserPlant(uid)
    const plantCode =
        typeof profilePlant === 'string' ? profilePlant : profilePlant?.plant_code || profilePlant?.plantCode || ''
    if (!plantCode) return ''
    const regions = await PlantService.fetchRegionsByPlantCode(plantCode)
    const r = Array.isArray(regions) && regions.length ? regions[0] : null
    return r ? r.regionCode || r.region_code || '' : ''
}

/**
 * Loads the current user's highest role weight; falls back to 0 when the
 * lookup fails or while signed out.
 */
export function useCurrentUserRoleWeight(userId) {
    const [currentUserRoleWeight, setCurrentUserRoleWeight] = useState(0)
    const fetchCurrentUserRole = useCallback(
        async function fetchCurrentUserRole() {
            try {
                if (!userId) return
                const highestRole = await UserService.getHighestRole(userId)
                setCurrentUserRoleWeight(highestRole?.weight || 0)
            } catch {
                setCurrentUserRoleWeight(0)
            }
        },
        [userId]
    )
    return { currentUserRoleWeight, fetchCurrentUserRole }
}

/**
 * Loads the global plants list (full row data) used by the assignment cards
 * and the additional-plants chip strip.
 */
export function usePlants() {
    const [plants, setPlants] = useState([])
    async function fetchPlants() {
        try {
            const { data, error } = await Database.from('plants').select('*')
            if (error) throw error
            setPlants(data || [])
        } catch (error) {
            console.error('Failed to fetch plants for manager detail view:', error)
        }
    }
    return { fetchPlants, plants }
}

/**
 * Loads the full list of roles for the role select dropdown.
 */
export function useAvailableRoles() {
    const [availableRoles, setAvailableRoles] = useState([])
    async function fetchRoles() {
        try {
            const rolesData = await UserService.getAllRoles()
            setAvailableRoles(rolesData)
        } catch {
            setAvailableRoles([])
        }
    }
    return { availableRoles, fetchRoles }
}

/**
 * Tracks the set of plant codes scoped to the user's active region. Returns a
 * Set of normalized (uppercase, trimmed) codes.
 */
export function useRegionPlantCodes(selectedRegionCode, plantCode, setPlantCode) {
    const [regionPlantCodes, setRegionPlantCodes] = useState(new Set())

    useEffect(() => {
        let cancelled = false
        async function loadRegionPlants() {
            try {
                const regionCode = await resolveActiveRegionCode(selectedRegionCode)
                if (!regionCode) {
                    if (!cancelled) setRegionPlantCodes(new Set())
                    return
                }
                const regionPlants = await PlantService.fetchRegionPlants(regionCode)
                if (cancelled) return
                const codes = new Set(
                    regionPlants
                        .map((p) =>
                            String(p.plantCode || p.plant_code || '')
                                .trim()
                                .toUpperCase()
                        )
                        .filter(Boolean)
                )
                setRegionPlantCodes(codes)
                if (plantCode && !codes.has(String(plantCode).trim().toUpperCase())) setPlantCode(plantCode)
            } catch {
                if (!cancelled) setRegionPlantCodes(new Set())
            }
        }
        loadRegionPlants()
        return () => {
            cancelled = true
        }
    }, [selectedRegionCode, plantCode, setPlantCode])

    return regionPlantCodes
}

/**
 * Filters the global plant list by the user's active region. "Office" regions
 * see every plant; otherwise restricted to the region's plant codes. Always
 * sorted numerically by plant code.
 */
export function useFilteredPlants(plants, regionPlantCodes, regionType) {
    return useMemo(() => {
        const sortByCode = (a, b) =>
            parseInt(a.plant_code?.replace(/\D/g, '') || '0') - parseInt(b.plant_code?.replace(/\D/g, '') || '0')
        const allPlants = plants.slice().sort(sortByCode)
        if (regionType === 'Office') return allPlants
        if (!regionPlantCodes || regionPlantCodes.size === 0) return allPlants
        return plants
            .filter((p) =>
                regionPlantCodes.has(
                    String(p.plant_code || '')
                        .trim()
                        .toUpperCase()
                )
            )
            .sort(sortByCode)
    }, [plants, regionPlantCodes, regionType])
}

/**
 * Bulk-fetches the manager's profile, auth row, and permission/role rows.
 * Composes them into a normalized manager object the view consumes.
 */
export async function fetchManagerRecord(managerId) {
    const [
        { data: userData, error: userError },
        { data: profileData, error: profileError },
        { data: permissionData, error: permissionError }
    ] = await Promise.all([
        Database.from('users').select('id, email').eq('id', managerId).single(),
        Database.from('users_profiles').select('*').eq('id', managerId).single(),
        Database.from('users_permissions').select('role_id').eq('user_id', managerId).single()
    ])
    if (userError) throw userError
    if (profileError) throw profileError
    if (permissionError && permissionError.code !== 'PGRST116') throw permissionError
    let rName = 'User',
        roleId = null,
        roleWeight = 0
    if (permissionData?.role_id) {
        const { data: roleData, error: roleError } = await Database.from('users_roles')
            .select('name, id, weight')
            .eq('id', permissionData.role_id)
            .single()
        if (!roleError && roleData) {
            rName = roleData.name
            roleId = roleData.id
            roleWeight = roleData.weight || 0
        }
    }
    const additionalAssignedPlants = Array.isArray(profileData.additional_assigned_plants)
        ? profileData.additional_assigned_plants
        : []
    return {
        additionalAssignedPlants,
        createdAt: profileData.created_at,
        email: userData.email,
        firstName: profileData.first_name,
        id: managerId,
        lastName: profileData.last_name,
        plantCode: profileData.plant_code,
        roleId,
        roleName: rName,
        roleWeight,
        updatedAt: profileData.updated_at
    }
}
