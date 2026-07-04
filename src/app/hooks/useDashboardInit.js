import { useCallback, useEffect, useRef, useState } from 'react'

import { Database } from '../../services/DatabaseService'
import { PlantService } from '../../services/PlantService'
import { ReportService } from '../../services/ReportService'
import { getSessionUserId } from '../../services/SessionService'
import { UserService } from '../../services/UserService'
import { DASHBOARD_REFRESH_INTERVAL_MS } from '../constants/dashboardConstants'

/**
 * Initializes the dashboard: resolves user permissions, loads permitted regions and plants,
 * sets up auto-refresh intervals, and determines the active region/plant scope.
 */
export function useDashboardInit({ plantSetRef, preferences }) {
    const [refreshKey, setRefreshKey] = useState(0)
    const [permittedRegions, setPermittedRegions] = useState([])
    const [hasAllRegionsPermission, setHasAllRegionsPermission] = useState(false)
    const [regionPlants, setRegionPlants] = useState([])
    const [allPlants, setAllPlants] = useState([])
    const [allPlantsCount, setAllPlantsCount] = useState(0)
    const [totalRegionsExcludingOffice, setTotalRegionsExcludingOffice] = useState(0)
    const [totalPlantsExcludingAggregate, setTotalPlantsExcludingAggregate] = useState(0)
    const [totalAggregateLocations, setTotalAggregateLocations] = useState(0)
    const [dashboardRegionCode, setDashboardRegionCode] = useState('')
    const [dashboardRegionName, setDashboardRegionName] = useState('')
    /** When the user has Home Office selected the plant-filter modal needs
     *  more than just `regionPlants` (which is empty for Office regions) —
     *  it needs a list of every region the user can drill into plus that
     *  region's plant codes so they can scope the dashboard by region /
     *  district / plant. We pre-fetch the plants for each permitted region
     *  on the first office-mode init and cache the result here. */
    const [regionGroups, setRegionGroups] = useState([])
    const [dashboardPlant, setDashboardPlant] = useState('')
    const [regionPlantsLoaded, setRegionPlantsLoaded] = useState(false)
    const [plantModalOpen, setPlantModalOpen] = useState(false)
    const [userPlantCode, setUserPlantCode] = useState('')
    const [userAdditionalPlants, setUserAdditionalPlants] = useState([])
    const [refreshing, setRefreshing] = useState(false)
    const initialLoadRef = useRef(true)
    useEffect(() => {
        let cancelled = false
        let intervalId
        async function initBase() {
            if (!initialLoadRef.current) return
            try {
                const fetchedPlants = await ReportService.fetchPlantsSorted().catch(() => [])
                if (cancelled) return
                setAllPlantsCount(Array.isArray(fetchedPlants) ? fetchedPlants.length : 0)
                setAllPlants(fetchedPlants)
                const { data: sessionData } = await Database.auth.getSession()
                const uid = sessionData?.session?.user?.id || getSessionUserId() || ''
                const allPerm = await UserService.hasPermission(uid, 'region.select.all').catch(() => false)
                if (cancelled) return
                setHasAllRegionsPermission(!!allPerm)
                const allFetched = await PlantService.fetchRegions().catch(() => [])
                let regionsList = await UserService.getPermittedRegions(uid).catch(() => [])
                if (!regionsList?.length && allFetched.length) regionsList = allFetched
                if (cancelled) return
                setPermittedRegions(regionsList)
                setTotalRegionsExcludingOffice(allFetched.filter((r) => r.type !== 'Office').length)
                const aggregateRegions = allFetched.filter((r) => r.type === 'Aggregate')
                const aggregatePlantsArrays = await Promise.all(
                    aggregateRegions.map((r) => PlantService.fetchRegionPlants(r.regionCode).catch(() => []))
                )
                const totalAggLocs = aggregatePlantsArrays.flat().length
                setTotalAggregateLocations(totalAggLocs)
                setTotalPlantsExcludingAggregate(fetchedPlants.length - totalAggLocs)
                const selectedCode = preferences.selectedRegion?.code
                if (selectedCode) {
                    setDashboardRegionCode(selectedCode)
                    setDashboardRegionName(preferences.selectedRegion?.name || '')
                } else if (regionsList.length) {
                    setDashboardRegionCode(regionsList[0].regionCode)
                    setDashboardRegionName(regionsList[0].regionName)
                }
            } catch (e) {
                console.error('Failed to initialize dashboard base data:', e)
            } finally {
                if (!cancelled) initialLoadRef.current = false
            }
        }
        initBase()
        intervalId = setInterval(() => setRefreshKey((v) => v + 1), DASHBOARD_REFRESH_INTERVAL_MS)
        return () => {
            cancelled = true
            if (intervalId) clearInterval(intervalId)
        }
    }, [preferences.selectedRegion])
    useEffect(() => {
        if (preferences.selectedRegion?.code) {
            setDashboardRegionCode((prev) => {
                if (prev !== preferences.selectedRegion.code) {
                    setDashboardRegionName(preferences.selectedRegion.name || '')
                    setDashboardPlant('')
                    return preferences.selectedRegion.code
                }
                return prev
            })
        }
    }, [preferences.selectedRegion])
    /** Build the region → plant-codes map the office-mode plant modal
     *  needs. Filters out Office-type regions (they don't own plants
     *  themselves) and any region with zero plants so the modal doesn't
     *  render empty groups. Fires whenever the permitted-regions list
     *  changes (initial load + permission/region churn). */
    useEffect(() => {
        let cancelled = false
        async function loadRegionGroups() {
            if (!permittedRegions?.length) {
                if (!cancelled) setRegionGroups([])
                return
            }
            const drillable = permittedRegions.filter((region) => (region.type || region.region_type) !== 'Office')
            const lists = await Promise.all(
                drillable.map(async (region) => {
                    const code = region.regionCode || region.region_code
                    if (!code) return null
                    const plants = await PlantService.fetchRegionPlants(code).catch(() => [])
                    const plantCodes = (plants || [])
                        .map((p) => String(p.plantCode || p.plant_code || '').trim())
                        .filter(Boolean)
                    if (!plantCodes.length) return null
                    // Roll up districts using the same plant→districts join
                    // PlantService.fetchRegionPlants returns. We pre-compute
                    // the (district → plant codes) map here so the office-mode
                    // modal can render districts nested under each region
                    // without re-walking the plants list every render.
                    const districtMap = new Map()
                    for (const plant of plants) {
                        const plantCode = String(plant.plantCode || plant.plant_code || '').trim()
                        if (!plantCode) continue
                        for (const d of plant.districts || []) {
                            const dname = typeof d === 'string' ? d : d?.name
                            if (!dname) continue
                            if (!districtMap.has(dname)) districtMap.set(dname, [])
                            districtMap.get(dname).push(plantCode)
                        }
                    }
                    const districts = Array.from(districtMap.entries())
                        .map(([name, codes]) => ({ name, plantCodes: codes }))
                        .sort((a, b) => a.name.localeCompare(b.name))
                    return {
                        code,
                        districts,
                        name: region.regionName || region.region_name || code,
                        plantCodes,
                        plants,
                        type: region.type || region.region_type || ''
                    }
                })
            )
            if (cancelled) return
            setRegionGroups(lists.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name)))
        }
        loadRegionGroups()
        return () => {
            cancelled = true
        }
    }, [permittedRegions])

    useEffect(() => {
        let cancelled = false
        async function fetchPlants() {
            if (!dashboardRegionCode) {
                setRegionPlants([])
                setRegionPlantsLoaded(false)
                return
            }
            setRegionPlantsLoaded(false)
            setRefreshing(true)
            try {
                const list = await PlantService.fetchRegionPlants(dashboardRegionCode).catch(() => [])
                if (cancelled) return
                setRegionPlants(list)
                setRegionPlantsLoaded(true)
            } finally {
                if (!cancelled) setRefreshing(false)
            }
        }
        fetchPlants()
        return () => {
            cancelled = true
        }
    }, [dashboardRegionCode])
    useEffect(() => {
        let cancelled = false
        async function loadProfilePlant() {
            try {
                const { data: sessionData } = await Database.auth.getSession()
                const uid = sessionData?.session?.user?.id || getSessionUserId() || ''
                if (!uid || cancelled) return
                const [weight, profileData, additionalPlants] = await Promise.all([
                    UserService.getUserWeight(uid),
                    Database.from('users_profiles').select('plant_code').eq('id', uid).maybeSingle(),
                    UserService.getAdditionalAssignedPlants(uid).catch(() => [])
                ])
                if (cancelled) return
                setUserPlantCode(profileData?.data?.plant_code || '')
                setUserAdditionalPlants(Array.isArray(additionalPlants) ? additionalPlants : [])
                if (weight < 50 && profileData?.data?.plant_code) {
                    setDashboardPlant(profileData.data.plant_code)
                    plantSetRef.current = new Set([profileData.data.plant_code])
                }
            } catch (e) {
                console.error('Failed to load user profile plant:', e)
                if (!cancelled) setUserPlantCode('')
            }
        }
        loadProfilePlant()
        return () => {
            cancelled = true
        }
    }, [plantSetRef])
    const onRefresh = useCallback(() => {
        setRefreshing(true)
        setRefreshKey((prev) => prev + 1)
        setTimeout(() => setRefreshing(false), 1000)
    }, [])
    return {
        allPlants,
        allPlantsCount,
        dashboardPlant,
        dashboardRegionCode,
        dashboardRegionName,
        hasAllRegionsPermission,
        onRefresh,
        permittedRegions,
        plantModalOpen,
        refreshKey,
        refreshing,
        regionGroups,
        regionPlants,
        regionPlantsLoaded,
        setDashboardPlant,
        setPlantModalOpen,
        setRefreshKey,
        totalAggregateLocations,
        totalPlantsExcludingAggregate,
        totalRegionsExcludingOffice,
        userAdditionalPlants,
        userPlantCode
    }
}
