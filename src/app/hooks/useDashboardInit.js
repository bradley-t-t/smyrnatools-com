import { useCallback, useEffect, useRef, useState } from 'react'

import { supabase } from '../../services/DatabaseService'
import { RegionService } from '../../services/RegionService'
import { ReportService } from '../../services/ReportService'
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
    const [dashboardPlant, setDashboardPlant] = useState('')
    const [regionPlantsLoaded, setRegionPlantsLoaded] = useState(false)
    const [plantModalOpen, setPlantModalOpen] = useState(false)
    const [isPlantManager, setIsPlantManager] = useState(false)
    const [userRoleWeight, setUserRoleWeight] = useState(0)
    const [userRoleName, setUserRoleName] = useState('')
    const [userPlantCode, setUserPlantCode] = useState('')
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
                const { data: sessionData } = await supabase.auth.getSession()
                const uid = sessionData?.session?.user?.id || sessionStorage.getItem('userId') || ''
                const allPerm = await UserService.hasPermission(uid, 'region.select.all').catch(() => false)
                if (cancelled) return
                setHasAllRegionsPermission(!!allPerm)
                const allFetched = await RegionService.fetchRegions().catch(() => [])
                let regionsList = await UserService.getPermittedRegions(uid).catch(() => [])
                if (!regionsList?.length && allFetched.length) regionsList = allFetched
                if (cancelled) return
                setPermittedRegions(regionsList)
                setTotalRegionsExcludingOffice(allFetched.filter((r) => r.type !== 'Office').length)
                const aggregateRegions = allFetched.filter((r) => r.type === 'Aggregate')
                const aggregatePlantsArrays = await Promise.all(
                    aggregateRegions.map((r) => RegionService.fetchRegionPlants(r.regionCode).catch(() => []))
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
            } catch {
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
                const list = await RegionService.fetchRegionPlants(dashboardRegionCode).catch(() => [])
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
        async function checkPlantManagerRole() {
            try {
                const { data: sessionData } = await supabase.auth.getSession()
                const uid = sessionData?.session?.user?.id || sessionStorage.getItem('userId') || ''
                if (!uid || cancelled) return
                const [roles, weight, profileData, highestRole] = await Promise.all([
                    UserService.getUserRoles(uid),
                    UserService.getUserWeight(uid),
                    supabase.from('users_profiles').select('plant_code').eq('id', uid).maybeSingle(),
                    UserService.getHighestRole(uid).catch(() => null)
                ])
                const isPM = roles?.some(
                    (r) =>
                        r?.name?.toLowerCase().includes('plant manager') ||
                        r?.name?.toLowerCase().includes('pm') ||
                        r?.name?.toLowerCase() === 'plant_manager'
                )
                if (!cancelled) {
                    setIsPlantManager(isPM)
                    setUserRoleWeight(weight || 0)
                    setUserRoleName(highestRole?.name || '')
                    setUserPlantCode(profileData?.data?.plant_code || '')
                    if (weight < 50 && profileData?.data?.plant_code) {
                        setDashboardPlant(profileData.data.plant_code)
                        plantSetRef.current = new Set([profileData.data.plant_code])
                    }
                }
            } catch {
                if (!cancelled) {
                    setIsPlantManager(false)
                    setUserRoleWeight(0)
                    setUserRoleName('')
                    setUserPlantCode('')
                }
            }
        }
        checkPlantManagerRole()
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
        isPlantManager,
        onRefresh,
        permittedRegions,
        plantModalOpen,
        refreshKey,
        refreshing,
        regionPlants,
        regionPlantsLoaded,
        setDashboardPlant,
        setPlantModalOpen,
        setRefreshKey,
        setRefreshing,
        totalAggregateLocations,
        totalPlantsExcludingAggregate,
        totalRegionsExcludingOffice,
        userPlantCode,
        userRoleName,
        userRoleWeight
    }
}
