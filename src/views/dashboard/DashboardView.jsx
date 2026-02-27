import React, { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import PlantDropdownModal from '../../app/components/common/PlantDropdownModal'
import DashboardCharts from '../../app/components/dashboard/DashboardCharts'
import DashboardPlantSummary from '../../app/components/dashboard/DashboardPlantSummary'
import { CollapsibleTable } from '../../app/components/ui/CollapsibleTable'
import {
    AllocationPill,
    DashboardCard,
    FreightTypeBreakdown,
    MetricCard,
    SectionTitle,
    SkeletonMetricCard,
    StatusPill,
    TrailerTypeBreakdown
} from '../../app/components/ui/DashboardCards'
import {
    DASHBOARD_REFRESH_INTERVAL_MS,
    INITIAL_EXPANDED_SECTIONS,
    INITIAL_PLANT_NOTIFICATIONS,
    INITIAL_STATS,
    STATUS_COLORS
} from '../../app/constants/dashboardConstants'
import { usePreferences } from '../../app/context/PreferencesContext'
import { useDashboardAssets, useIssueCommentCounts, usePlantFilter } from '../../app/hooks/useDashboardData'
import { useAITypingEffect, useAnimatedStats, useDateFilter } from '../../app/hooks/useDashboardEffects'
import { useIsMobile } from '../../app/hooks/useIsMobile'
import { AIService } from '../../services/AIService'
import { supabase } from '../../services/DatabaseService'
import { RegionService } from '../../services/RegionService'
import { ReportService } from '../../services/ReportService'
import { UserService } from '../../services/UserService'
import DashboardUtility from '../../utils/DashboardUtility'
import LeaderboardsUtility from '../../utils/LeaderboardsUtility'
import VerifiedUtility from '../../utils/VerifiedUtility'
import EquipmentsView from '../equipment/EquipmentsView'
import MixersView from '../mixers/MixersView'
import OperatorsView from '../operators/OperatorsView'
import TractorsView from '../tractors/TractorsView'
import TrailersView from '../trailers/TrailersView'

export default function DashboardView() {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const isMobile = useIsMobile()

    const [refreshKey, setRefreshKey] = useState(0)
    const [stats, setStats] = useState(INITIAL_STATS)
    const [plantNotifications, setPlantNotifications] = useState(INITIAL_PLANT_NOTIFICATIONS)
    const [expandedSections, setExpandedSections] = useState(INITIAL_EXPANDED_SECTIONS)

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

    const [embeddedView, setEmbeddedView] = useState(null)
    const [embeddedViewSearch, setEmbeddedViewSearch] = useState('')

    const [trainingCollapsed, setTrainingCollapsed] = useState(true)
    const [pendingCollapsed, setPendingCollapsed] = useState(true)
    const [lightDutyCollapsed, setLightDutyCollapsed] = useState(true)

    const [statusHistoryData, setStatusHistoryData] = useState({
        equipment: [],
        mixers: [],
        pickups: [],
        tractors: [],
        trailers: []
    })
    const [historyLoaded, setHistoryLoaded] = useState(false)
    const [forceRegenerateAI, setForceRegenerateAI] = useState(0)

    const prevSnapshotRef = useRef(null)
    const initialLoadRef = useRef(true)
    const historyRecordsRef = useRef({ equipment: [], mixers: [], pickups: [], tractors: [], trailers: [] })
    const [, startTransition] = useTransition()
    const filterTimeoutRef = useRef(null)

    const { createFilterFn, plantSetRef, updatePlantSet } = usePlantFilter(
        dashboardRegionCode,
        dashboardPlant,
        regionPlants,
        allPlants
    )

    const {
        handleQuickDateFilter,
        historyEndDate,
        historyStartDate,
        setHistoryEndDate,
        setHistoryStartDate,
        setOldestHistoryDate
    } = useDateFilter()

    const computeStats = useCallback(() => {
        const region = RegionService.getRegionByCode(dashboardRegionCode)
        const isAggregate = region?.type === 'Aggregate'
        const plantSet = updatePlantSet(region?.type)
        const consider = createFilterFn(plantSet)

        const initTotals = () => ({
            active: 0,
            comments: 0,
            issues: 0,
            overdue: 0,
            shop: 0,
            spare: 0,
            total: 0,
            verified: 0
        })

        const mixersTotals = initTotals()
        const tractorsTotals = {
            ...initTotals(),
            freight: {
                Aggregate: { active: 0, shop: 0, spare: 0, total: 0 },
                Cement: { active: 0, shop: 0, spare: 0, total: 0 },
                'Dump Truck': { active: 0, shop: 0, spare: 0, total: 0 },
                Other: { active: 0, shop: 0, spare: 0, total: 0 }
            }
        }
        const trailersTotals = {
            ...initTotals(),
            trailerType: {
                Cement: { active: 0, shop: 0, spare: 0, total: 0 },
                'End Dump': { active: 0, shop: 0, spare: 0, total: 0 }
            }
        }
        const equipmentTotals = initTotals()
        const pickupsTotals = { active: 0, retired: 0, shop: 0, sold: 0, spare: 0, stationary: 0, total: 0 }
        const operatorsTotals = {
            active: 0,
            assigned: 0,
            lightDuty: 0,
            mixerAssigned: 0,
            pending: 0,
            total: 0,
            tractorAssigned: 0,
            unassigned: 0
        }

        const mixerAssignedIds = new Set()
        const tractorAssignedIds = new Set()
        const counts = countsRef.current

        let mixersAvailable = 0
        let tractorsAvailable = 0
        let trailersAvailable = 0
        let equipmentAvailable = 0
        let pickupsAvailable = 0

        const processAssetStatus = (asset, totals, countsKey, hasVerification = false) => {
            if (asset.status === 'Retired') return false
            totals.total++
            if (asset.status === 'Active') totals.active++
            else if (asset.status === 'Spare') totals.spare++
            else if (asset.status === 'In Shop') totals.shop++
            if (DashboardUtility.isServiceOverdue(asset.lastServiceDate)) totals.overdue++
            if (hasVerification && VerifiedUtility.isVerified(asset.updatedLast, asset.updatedAt, asset.updatedBy)) {
                totals.verified++
            }
            const assetCounts = counts[countsKey]?.[asset.id]
            if (assetCounts) {
                totals.issues += assetCounts.issues || 0
                totals.comments += assetCounts.comments || 0
            }
            return true
        }

        if (!isAggregate) {
            allMixersRef.current.forEach((m) => {
                if (!consider(m.plantCode)) return
                if (processAssetStatus(m, mixersTotals, 'mixers', true)) {
                    mixersAvailable++
                    if (m.assignedOperator) mixerAssignedIds.add(m.assignedOperator)
                }
            })
        }

        allTractorsRef.current.forEach((t) => {
            if (!consider(t.plantCode)) return
            if (t.status !== 'Retired') {
                tractorsTotals.total++
                tractorsAvailable++
                const freightType = t.freight && tractorsTotals.freight[t.freight] ? t.freight : 'Other'
                tractorsTotals.freight[freightType].total++
                if (t.status === 'Active') {
                    tractorsTotals.active++
                    tractorsTotals.freight[freightType].active++
                } else if (t.status === 'Spare') {
                    tractorsTotals.spare++
                    tractorsTotals.freight[freightType].spare++
                } else if (t.status === 'In Shop') {
                    tractorsTotals.shop++
                    tractorsTotals.freight[freightType].shop++
                }
                if (DashboardUtility.isServiceOverdue(t.lastServiceDate)) tractorsTotals.overdue++
                if (VerifiedUtility.isVerified(t.updatedLast, t.updatedAt, t.updatedBy)) tractorsTotals.verified++
                if (t.assignedOperator) tractorAssignedIds.add(t.assignedOperator)
                const tc = counts.tractors?.[t.id]
                if (tc) {
                    tractorsTotals.issues += tc.issues || 0
                    tractorsTotals.comments += tc.comments || 0
                }
            }
        })

        allTrailersRef.current.forEach((r) => {
            if (!consider(r.plantCode)) return
            if (r.status !== 'Retired') {
                trailersTotals.total++
                trailersAvailable++
                const tType = r.trailerType === 'End Dump' ? 'End Dump' : 'Cement'
                trailersTotals.trailerType[tType].total++
                if (r.status === 'Active') {
                    trailersTotals.active++
                    trailersTotals.trailerType[tType].active++
                } else if (r.status === 'Spare') {
                    trailersTotals.spare++
                    trailersTotals.trailerType[tType].spare++
                } else if (r.status === 'In Shop') {
                    trailersTotals.shop++
                    trailersTotals.trailerType[tType].shop++
                }
                if (DashboardUtility.isServiceOverdue(r.lastServiceDate)) trailersTotals.overdue++
                const rc = counts.trailers?.[r.id]
                if (rc) {
                    trailersTotals.issues += rc.issues || 0
                    trailersTotals.comments += rc.comments || 0
                }
            }
        })

        allEquipmentRef.current.forEach((e) => {
            if (!consider(e.plantCode)) return
            if (processAssetStatus(e, equipmentTotals, 'equipment')) equipmentAvailable++
        })

        allPickupsRef.current.forEach((p) => {
            if (!consider(p.plantCode)) return
            if (p.status !== 'Retired') {
                pickupsTotals.total++
                pickupsAvailable++
            }
            if (p.status === 'Active') pickupsTotals.active++
            else if (p.status === 'In Shop') pickupsTotals.shop++
            else if (p.status === 'Stationary') pickupsTotals.stationary++
            else if (p.status === 'Spare') pickupsTotals.spare++
            else if (p.status === 'Sold') pickupsTotals.sold++
            else if (p.status === 'Retired') pickupsTotals.retired++
        })

        allOperatorsRef.current.forEach((o) => {
            if (!consider(o.plantCode)) return
            operatorsTotals.total++
            if (o.status === 'Active') {
                operatorsTotals.active++
                if (mixerAssignedIds.has(o.employeeId)) {
                    operatorsTotals.assigned++
                    operatorsTotals.mixerAssigned++
                } else if (tractorAssignedIds.has(o.employeeId)) {
                    operatorsTotals.assigned++
                    operatorsTotals.tractorAssigned++
                } else {
                    operatorsTotals.unassigned++
                }
            } else if (o.status === 'Pending Start') {
                operatorsTotals.pending++
            } else if (o.status === 'Light Duty') {
                operatorsTotals.lightDuty++
            }
        })

        const calcPercent = (numerator, denominator) => (denominator ? Math.round((numerator / denominator) * 100) : 0)

        const mixersVerifiedPercent = calcPercent(mixersTotals.verified, mixersAvailable)
        const tractorsVerifiedPercent = calcPercent(tractorsTotals.verified, tractorsAvailable)

        const verifiedValues = []
        if (!isAggregate && mixersTotals.total) verifiedValues.push(mixersVerifiedPercent)
        if (tractorsTotals.total) verifiedValues.push(tractorsVerifiedPercent)
        const verificationAvg = verifiedValues.length
            ? Math.round(verifiedValues.reduce((a, b) => a + b, 0) / verifiedValues.length)
            : 0

        let openIssuesTotal = 0
        if (!isAggregate) openIssuesTotal += mixersTotals.issues
        openIssuesTotal += tractorsTotals.issues + trailersTotals.issues + equipmentTotals.issues

        let overdueTotal = 0
        if (!isAggregate) overdueTotal += mixersTotals.overdue
        overdueTotal += tractorsTotals.overdue + trailersTotals.overdue + equipmentTotals.overdue

        let fleetTotal = 0
        if (!isAggregate) fleetTotal += mixersTotals.total
        fleetTotal += tractorsTotals.total + trailersTotals.total + equipmentTotals.total + pickupsTotals.total

        const mixersAllocationPercent = calcPercent(mixersTotals.active, mixersAvailable)
        const tractorsAllocationPercent = calcPercent(tractorsTotals.active, tractorsAvailable)
        const trailersAllocationPercent = calcPercent(trailersTotals.active, trailersAvailable)
        const equipmentAllocationPercent = calcPercent(equipmentTotals.active, equipmentAvailable)
        const pickupsAllocationPercent = calcPercent(pickupsTotals.active + pickupsTotals.stationary, pickupsAvailable)

        let overallAvailable = tractorsAvailable + trailersAvailable + equipmentAvailable + pickupsAvailable
        let overallActiveNumerator =
            tractorsTotals.active +
            trailersTotals.active +
            equipmentTotals.active +
            pickupsTotals.active +
            pickupsTotals.stationary
        if (!isAggregate) {
            overallAvailable += mixersAvailable
            overallActiveNumerator += mixersTotals.active
        }
        const overallAllocationPercent = calcPercent(overallActiveNumerator, overallAvailable)

        setStats({
            equipment: { ...equipmentTotals, allocationPercent: equipmentAllocationPercent },
            fleetTotal,
            mixers: {
                ...mixersTotals,
                allocationPercent: mixersAllocationPercent,
                verifiedPercent: mixersVerifiedPercent
            },
            openIssuesTotal,
            operators: operatorsTotals,
            overallAllocationPercent,
            overdueTotal,
            pickups: { ...pickupsTotals, allocationPercent: pickupsAllocationPercent },
            tractors: {
                ...tractorsTotals,
                allocationPercent: tractorsAllocationPercent,
                verifiedPercent: tractorsVerifiedPercent
            },
            trailers: { ...trailersTotals, allocationPercent: trailersAllocationPercent },
            verificationAverage: verificationAvg
        })
        prevSnapshotRef.current = { fleet: fleetTotal }
    }, [dashboardRegionCode, updatePlantSet, createFilterFn])

    const {
        allEquipmentRef,
        allMixersRef,
        allOperatorsFullRef,
        allOperatorsRef,
        allPickupsRef,
        allTractorsRef,
        allTrailersRef,
        dataReady,
        error,
        lightDutyOperators,
        loading,
        pendingStartOperators,
        refreshing,
        setRefreshing,
        trainingOperators
    } = useDashboardAssets({ computeStats, refreshKey })

    const { assetIssueDetails, countsRef, fetchIssueCommentCounts } = useIssueCommentCounts({
        allEquipmentRef,
        allMixersRef,
        allTractorsRef,
        allTrailersRef,
        computeStats
    })

    const displayStats = useAnimatedStats(stats, regionPlantsLoaded, dashboardRegionCode)
    const { aiActionPlan, aiDisplayText, isTypingComplete, showActionPlan } = useAITypingEffect(
        plantNotifications.aiSummary,
        dashboardPlant
    )

    const applyFilters = useCallback(() => {
        if (loading) {
            computeStats()
            return
        }
        if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current)
        filterTimeoutRef.current = setTimeout(() => startTransition(() => computeStats()), 30)
    }, [computeStats, loading])

    useEffect(
        () => () => {
            if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current)
        },
        []
    )

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
                if ((!regionsList || !regionsList.length) && allFetched.length) regionsList = allFetched
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
        async function fetchRegionPlants() {
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
        fetchRegionPlants()
        return () => {
            cancelled = true
        }
    }, [dashboardRegionCode, setRefreshing])

    useEffect(() => {
        applyFilters()
    }, [dashboardPlant, regionPlants, applyFilters])
    useEffect(() => {
        if (!loading) fetchIssueCommentCounts()
    }, [stats.fleetTotal, loading, fetchIssueCommentCounts])

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

    useEffect(() => {
        if (!dataReady) return
        const plantSet = plantSetRef.current
        const consider = createFilterFn(plantSet)

        const unverifiedMixers = allMixersRef.current
            .filter(
                (m) =>
                    m.status !== 'Retired' &&
                    consider(m.plantCode) &&
                    !VerifiedUtility.isVerified(m.updatedLast, m.updatedAt, m.updatedBy)
            )
            .slice(0, 10)
            .map((m) => ({ id: m.id, plantCode: m.plantCode, truckNumber: m.truckNumber, type: 'Mixer' }))

        const filterByPlantSet = (operators, plantField, trainerField = null) =>
            operators.filter(
                (o) =>
                    plantSet.size === 0 ||
                    plantSet.has(String(o[plantField] || '').trim()) ||
                    (trainerField && plantSet.has(String(o[trainerField] || '').trim()))
            )

        const pendingOps = filterByPlantSet(pendingStartOperators, 'operatorPlant', 'trainerPlant').slice(0, 5)
        const trainingOps = filterByPlantSet(trainingOperators, 'operatorPlant', 'trainerPlant').slice(0, 5)

        const assetsWithIssues = assetIssueDetails
            .filter((a) => {
                if (!consider(a.plant)) return false
                const assetRefs = {
                    Equipment: allEquipmentRef,
                    Mixer: allMixersRef,
                    Tractor: allTractorsRef,
                    Trailer: allTrailersRef
                }
                const asset = assetRefs[a.type]?.current?.find((item) => item.id === a.assetId)
                return asset && asset.status !== 'Retired'
            })
            .reduce((acc, issue) => {
                const key = `${issue.type}-${issue.assetId}`
                if (!acc[key]) acc[key] = { ...issue, openIssueCount: 0, resolvedIssueCount: 0 }
                issue.resolved ? acc[key].resolvedIssueCount++ : acc[key].openIssueCount++
                return acc
            }, {})

        const topIssueAssets = Object.values(assetsWithIssues)
            .filter((a) => a.openIssueCount > 0)
            .sort((a, b) => b.openIssueCount - a.openIssueCount)
            .slice(0, 5)

        const totalOpenIssues = assetIssueDetails.filter((a) => !a.resolved && consider(a.plant)).length
        const totalResolvedIssues = assetIssueDetails.filter((a) => a.resolved && consider(a.plant)).length

        const getOverdueAssets = (assets, type, identifierField) =>
            assets
                .filter(
                    (a) =>
                        a.status !== 'Retired' &&
                        consider(a.plantCode) &&
                        DashboardUtility.isServiceOverdue(a.lastServiceDate)
                )
                .map((a) => ({
                    id: a.id,
                    identifier: a[identifierField],
                    lastServiceDate: a.lastServiceDate,
                    plantCode: a.plantCode,
                    type
                }))

        const overdueAssets = [
            ...getOverdueAssets(allMixersRef.current, 'Mixer', 'truckNumber'),
            ...getOverdueAssets(allTractorsRef.current, 'Tractor', 'truckNumber'),
            ...getOverdueAssets(allTrailersRef.current, 'Trailer', 'identifyingNumber'),
            ...getOverdueAssets(allEquipmentRef.current, 'Equipment', 'identifyingNumber')
        ].slice(0, 5)

        const longTermShop = [
            ...DashboardUtility.getLongTermShopAssets(
                allMixersRef.current,
                historyRecordsRef.current.mixers,
                'Mixer',
                'truckNumber',
                consider
            ),
            ...DashboardUtility.getLongTermShopAssets(
                allTractorsRef.current,
                historyRecordsRef.current.tractors,
                'Tractor',
                'truckNumber',
                consider
            )
        ]
            .sort((a, b) => b.daysInShop - a.daysInShop)
            .slice(0, 5)

        const filteredMixers = allMixersRef.current.filter((m) => m.status !== 'Retired' && consider(m.plantCode))
        const spareMixers = filteredMixers.filter((m) => m.status === 'Spare').length
        const inShopMixers = filteredMixers.filter((m) => m.status === 'In Shop').length
        const shopIssue =
            (spareMixers < 1 && inShopMixers >= 1) || inShopMixers > 2
                ? {
                      inShopCount: inShopMixers,
                      inShopMixers: filteredMixers
                          .filter((m) => m.status === 'In Shop')
                          .slice(0, 3)
                          .map((m) => m.truckNumber || 'Unknown'),
                      spareCount: spareMixers
                  }
                : null

        const filteredOperators = allOperatorsFullRef.current.filter(
            (o) => o.status === 'Active' && consider(o.plantCode)
        )
        const activeMixers = allMixersRef.current.filter((m) => m.status === 'Active' && consider(m.plantCode))
        const activeTractors = allTractorsRef.current.filter((t) => t.status === 'Active' && consider(t.plantCode))
        const assignedOperatorIds = new Set([
            ...activeMixers.map((m) => m.assignedOperator).filter(Boolean),
            ...activeTractors.map((t) => t.assignedOperator).filter(Boolean)
        ])
        const unassignedOps = filteredOperators
            .filter((o) => !assignedOperatorIds.has(o.employeeId))
            .slice(0, 5)
            .map((o) => ({ id: o.employeeId, name: o.name, plantCode: o.plantCode, position: o.position }))

        setPlantNotifications((prev) => ({
            ...prev,
            assetsWithMostIssues: topIssueAssets,
            longTermShopAssets: longTermShop,
            overdueService: overdueAssets,
            pendingOperators: pendingOps,
            shopIssue,
            totalOpenIssues,
            totalResolvedIssues,
            trainingOperators: trainingOps,
            unassignedOperators: unassignedOps,
            unverifiedMixers
        }))
    }, [
        dataReady,
        historyLoaded,
        dashboardPlant,
        regionPlants,
        assetIssueDetails,
        pendingStartOperators,
        trainingOperators,
        plantSetRef,
        createFilterFn,
        allMixersRef,
        allTractorsRef,
        allTrailersRef,
        allEquipmentRef,
        allOperatorsFullRef
    ])

    useEffect(() => {
        if (!dataReady || !dashboardPlant || !dashboardRegionCode) {
            setPlantNotifications((prev) => ({ ...prev, leaderboardMetrics: null }))
            return
        }

        let cancelled = false

        async function fetchLeaderboardMetrics() {
            try {
                const selectedYear = new Date().getFullYear()
                const plantsInRegion = await RegionService.fetchRegionPlants(dashboardRegionCode)
                if (cancelled || !plantsInRegion?.length) return

                const plantCodesInRegion = plantsInRegion.map((p) => p.plantCode)
                if (!plantCodesInRegion.includes(dashboardPlant)) return

                const extendedStartDate = new Date(selectedYear - 1, 11, 25)
                const extendedEndDate = new Date(selectedYear + 1, 0, 7, 23, 59, 59)

                const { data: profilesData } = await supabase
                    .from('users_profiles')
                    .select('id, plant_code')
                    .in('plant_code', plantCodesInRegion)
                    .not('plant_code', 'is', null)

                if (cancelled || !profilesData?.length) return

                const userIdsByPlant = {}
                profilesData.forEach((p) => {
                    if (!userIdsByPlant[p.plant_code]) userIdsByPlant[p.plant_code] = []
                    userIdsByPlant[p.plant_code].push(p.id)
                })

                const allUserIds = profilesData.map((p) => p.id)

                const [{ data: reports }, { data: safetyReports }] = await Promise.all([
                    supabase
                        .from('reports')
                        .select('*')
                        .eq('report_name', 'plant_manager')
                        .in('user_id', allUserIds)
                        .gte('week', extendedStartDate.toISOString())
                        .lte('week', extendedEndDate.toISOString()),
                    supabase
                        .from('reports')
                        .select('*')
                        .eq('report_name', 'safety_manager')
                        .gte('week', extendedStartDate.toISOString())
                        .lte('week', extendedEndDate.toISOString())
                ])

                if (cancelled || !reports?.length) return

                const hoursAdjustmentsByPlant = LeaderboardsUtility.calculateHoursAdjustments(
                    reports,
                    profilesData,
                    plantCodesInRegion
                )
                const safetyByPlant = LeaderboardsUtility.calculateSafetyIncidents(
                    safetyReports || [],
                    plantCodesInRegion
                )

                const fleetCountsByPlant = LeaderboardsUtility.calculateFleetCounts(
                    plantCodesInRegion,
                    allMixersRef.current || [],
                    allTractorsRef.current || [],
                    allTrailersRef.current || [],
                    allEquipmentRef.current || [],
                    allOperatorsFullRef.current || []
                )

                const now = new Date()
                const currentWeekStart = new Date(now)
                currentWeekStart.setDate(now.getDate() - now.getDay())
                currentWeekStart.setHours(0, 0, 0, 0)

                const filteredReports = reports.filter((report) => new Date(report.week) < currentWeekStart)

                if (cancelled || !filteredReports.length) return

                const plantMetricsArray = []

                for (const plantCode of Object.keys(userIdsByPlant)) {
                    const plantReports = filteredReports.filter((r) => userIdsByPlant[plantCode].includes(r.user_id))
                    const fleetData = fleetCountsByPlant[plantCode] || {
                        avgFleetCleanliness: 0,
                        equipment: 0,
                        mixerOperators: 1,
                        mixers: 0,
                        operators: 0,
                        totalAssets: 0,
                        tractors: 0,
                        trailers: 0
                    }

                    const hoursAdjustments = hoursAdjustmentsByPlant[plantCode] || null
                    const safetyIncidents = safetyByPlant[plantCode] || null

                    const metrics = LeaderboardsUtility.calculateMetrics(
                        plantReports,
                        fleetData.avgFleetCleanliness || 0,
                        fleetData.mixerOperators || 1,
                        currentWeekStart,
                        hoursAdjustments,
                        safetyIncidents
                    )

                    if (metrics) {
                        plantMetricsArray.push({
                            plantCode,
                            ...metrics,
                            ...fleetData,
                            helpGiven: hoursAdjustments?.hoursSubtracted || 0,
                            helpReceived: hoursAdjustments?.hoursAdded || 0,
                            netHelp: (hoursAdjustments?.hoursSubtracted || 0) - (hoursAdjustments?.hoursAdded || 0),
                            safetyReportsCount: safetyIncidents?.count || 0
                        })
                    }
                }

                const sortedByEfficiency = plantMetricsArray
                    .filter((p) => typeof p.avgEfficiency === 'number' && p.avgWeeklyHours > 0)
                    .sort((a, b) => b.avgEfficiency - a.avgEfficiency)

                const plantRank = sortedByEfficiency.findIndex((p) => p.plantCode === dashboardPlant) + 1
                const plantMetrics = sortedByEfficiency.find((p) => p.plantCode === dashboardPlant)

                if (cancelled || !plantMetrics) return

                setPlantNotifications((prev) => ({
                    ...prev,
                    leaderboardMetrics: {
                        adjustedYPH: plantMetrics.avgYPH,
                        avgCleanliness: plantMetrics.avgFleetCleanliness || 0,
                        efficiency: plantMetrics.avgEfficiency,
                        helpGiven: plantMetrics.helpGiven,
                        helpReceived: plantMetrics.helpReceived,
                        netHelp: plantMetrics.netHelp,
                        rank: plantRank,
                        rawYPH: plantMetrics.rawYPH,
                        safetyIncidents: plantMetrics.safetyReportsCount || 0,
                        totalPlants: sortedByEfficiency.length
                    }
                }))
            } catch {}
        }

        fetchLeaderboardMetrics()
        return () => {
            cancelled = true
        }
    }, [
        dataReady,
        dashboardPlant,
        dashboardRegionCode,
        allMixersRef,
        allTractorsRef,
        allTrailersRef,
        allEquipmentRef,
        allOperatorsFullRef
    ])

    const handleRegenerateAISummary = useCallback(() => {
        if (!dashboardPlant) return
        DashboardUtility.clearAISummaryCache(dashboardPlant)
        setPlantNotifications((prev) => ({ ...prev, aiSummary: null, aiSummaryFailed: false, aiSummaryLoading: false }))
        setForceRegenerateAI((prev) => prev + 1)
    }, [dashboardPlant])

    useEffect(() => {
        if (!plantNotifications.leaderboardMetrics || !dashboardPlant) return

        const skipCache = forceRegenerateAI > 0
        if (!skipCache) {
            const cachedSummary = DashboardUtility.getAISummaryFromCache(dashboardPlant)
            if (cachedSummary) {
                setPlantNotifications((prev) => ({
                    ...prev,
                    aiSummary: cachedSummary,
                    aiSummaryFailed: false,
                    aiSummaryLoading: false
                }))
                return
            }
        }

        let cancelled = false

        async function generateAISummary() {
            setPlantNotifications((prev) => ({ ...prev, aiSummaryFailed: false, aiSummaryLoading: true }))

            try {
                const plantSet = plantSetRef.current
                const consider = createFilterFn(plantSet)

                const activeMixers = allMixersRef.current.filter((m) => m.status === 'Active' && consider(m.plantCode))
                const mixersWithCleanliness = activeMixers.filter((m) => m.cleanlinessRating > 0)
                const avgCleanliness =
                    mixersWithCleanliness.length > 0
                        ? mixersWithCleanliness.reduce((sum, m) => sum + m.cleanlinessRating, 0) /
                          mixersWithCleanliness.length
                        : 0
                const cleanlinessBreakdown = {
                    average: activeMixers.filter((m) => m.cleanlinessRating === 3).length,
                    excellent: activeMixers.filter((m) => m.cleanlinessRating === 5).length,
                    good: activeMixers.filter((m) => m.cleanlinessRating === 4).length,
                    poor: activeMixers.filter((m) => m.cleanlinessRating > 0 && m.cleanlinessRating < 3).length,
                    unrated: activeMixers.filter((m) => !m.cleanlinessRating || m.cleanlinessRating === 0).length
                }

                const summary = await AIService.generatePlantSummary({
                    assetsWithMostIssues: plantNotifications.assetsWithMostIssues,
                    fleetCleanliness: {
                        average: avgCleanliness,
                        breakdown: cleanlinessBreakdown,
                        totalActiveMixers: activeMixers.length
                    },
                    issueSummary: {
                        openIssues: plantNotifications.totalOpenIssues,
                        resolvedIssues: plantNotifications.totalResolvedIssues
                    },
                    leaderboardMetrics: plantNotifications.leaderboardMetrics,
                    longTermShopAssets: plantNotifications.longTermShopAssets,
                    overdueService: plantNotifications.overdueService,
                    pendingOperators: plantNotifications.pendingOperators,
                    plantCode: dashboardPlant,
                    shopIssue: plantNotifications.shopIssue,
                    trainingOperators: plantNotifications.trainingOperators,
                    unassignedOperators: plantNotifications.unassignedOperators,
                    userContext: {
                        assignedPlant: userPlantCode,
                        isViewingOwnPlant: userPlantCode === dashboardPlant,
                        roleName: userRoleName,
                        roleWeight: userRoleWeight
                    }
                })

                if (!cancelled) {
                    if (summary) {
                        DashboardUtility.setAISummaryToCache(dashboardPlant, summary)
                        setPlantNotifications((prev) => ({
                            ...prev,
                            aiSummary: summary,
                            aiSummaryFailed: false,
                            aiSummaryLoading: false
                        }))
                    } else {
                        setPlantNotifications((prev) => ({
                            ...prev,
                            aiSummary: null,
                            aiSummaryFailed: true,
                            aiSummaryLoading: false
                        }))
                        setTimeout(() => {
                            if (!cancelled) {
                                setPlantNotifications((prev) => ({ ...prev, aiSummaryFailed: false }))
                            }
                        }, 3000)
                    }
                }
            } catch {
                if (!cancelled) {
                    setPlantNotifications((prev) => ({
                        ...prev,
                        aiSummary: null,
                        aiSummaryFailed: true,
                        aiSummaryLoading: false
                    }))
                    setTimeout(() => {
                        if (!cancelled) {
                            setPlantNotifications((prev) => ({ ...prev, aiSummaryFailed: false }))
                        }
                    }, 3000)
                }
            }
        }

        generateAISummary()
        return () => {
            cancelled = true
        }
    }, [
        dashboardPlant,
        plantNotifications.leaderboardMetrics,
        plantNotifications.totalOpenIssues,
        plantNotifications.totalResolvedIssues,
        forceRegenerateAI,
        plantSetRef,
        createFilterFn,
        allMixersRef,
        plantNotifications.assetsWithMostIssues,
        plantNotifications.longTermShopAssets,
        plantNotifications.overdueService,
        plantNotifications.pendingOperators,
        plantNotifications.shopIssue,
        plantNotifications.trainingOperators,
        plantNotifications.unassignedOperators,
        userPlantCode,
        userRoleName,
        userRoleWeight
    ])

    const fetchStatusHistory = useCallback(async () => {
        try {
            const [mixersHist, tractorsHist, trailersHist, equipmentHist, pickupsHist] = await Promise.all([
                supabase
                    .from('mixers_history')
                    .select('*')
                    .eq('field_name', 'status')
                    .order('changed_at', { ascending: true }),
                supabase
                    .from('tractors_history')
                    .select('*')
                    .eq('field_name', 'status')
                    .order('changed_at', { ascending: true }),
                supabase
                    .from('trailers_history')
                    .select('*')
                    .eq('field_name', 'status')
                    .order('changed_at', { ascending: true }),
                supabase
                    .from('heavy_equipment_history')
                    .select('*')
                    .eq('field_name', 'status')
                    .order('changed_at', { ascending: true }),
                supabase
                    .from('pickup_trucks_history')
                    .select('*')
                    .eq('field_name', 'status')
                    .order('changed_at', { ascending: true })
            ])

            historyRecordsRef.current = {
                equipment: equipmentHist.data || [],
                mixers: mixersHist.data || [],
                pickups: pickupsHist.data || [],
                tractors: tractorsHist.data || [],
                trailers: trailersHist.data || []
            }

            const region = RegionService.getRegionByCode(dashboardRegionCode)
            const plantSet = updatePlantSet(region?.type)
            const consider = createFilterFn(plantSet)

            const filterAssets = (assets) => assets.filter((a) => a.status !== 'Retired' && consider(a.plantCode))

            const filteredMixers = filterAssets(allMixersRef.current)
            const filteredTractors = filterAssets(allTractorsRef.current)
            const filteredTrailers = filterAssets(allTrailersRef.current)
            const filteredEquipment = filterAssets(allEquipmentRef.current)
            const filteredPickups = filterAssets(allPickupsRef.current)

            const filteredAssetIds = new Set([
                ...filteredMixers.map((m) => m.id),
                ...filteredTractors.map((t) => t.id),
                ...filteredTrailers.map((t) => t.id),
                ...filteredEquipment.map((e) => e.id),
                ...filteredPickups.map((p) => p.id)
            ])

            const filteredHistoryRecords = [
                ...(mixersHist.data || []).filter((h) => filteredAssetIds.has(h.mixer_id)),
                ...(tractorsHist.data || []).filter((h) => filteredAssetIds.has(h.tractor_id)),
                ...(trailersHist.data || []).filter((h) => filteredAssetIds.has(h.trailer_id)),
                ...(equipmentHist.data || []).filter((h) => filteredAssetIds.has(h.equipment_id)),
                ...(pickupsHist.data || []).filter((h) => filteredAssetIds.has(h.truck_id))
            ]

            let oldestDate = new Date()
            if (filteredHistoryRecords.length > 0) {
                const dates = filteredHistoryRecords.map((h) => new Date(h.changed_at))
                oldestDate = new Date(Math.min(...dates))
            } else {
                const filteredAssets = [
                    ...filteredMixers,
                    ...filteredTractors,
                    ...filteredTrailers,
                    ...filteredEquipment,
                    ...filteredPickups
                ]
                const creationDates = filteredAssets
                    .map((a) => a.createdAt || a.created_at)
                    .filter(Boolean)
                    .map((d) => new Date(d))
                if (creationDates.length > 0) oldestDate = new Date(Math.min(...creationDates))
            }

            const oldestDateStr = oldestDate.toISOString().split('T')[0]
            const todayStr = new Date().toISOString().split('T')[0]

            if (!historyStartDate && !historyEndDate) {
                setHistoryStartDate(oldestDateStr)
                setHistoryEndDate(todayStr)
            }

            setOldestHistoryDate(oldestDateStr)

            const startFilter = historyStartDate || oldestDateStr
            const endFilter = historyEndDate || todayStr

            setStatusHistoryData({
                equipment: DashboardUtility.calculateStatusDistribution(
                    filteredEquipment,
                    equipmentHist.data || [],
                    startFilter,
                    endFilter
                ),
                mixers: DashboardUtility.calculateStatusDistribution(
                    filteredMixers,
                    mixersHist.data || [],
                    startFilter,
                    endFilter
                ),
                pickups: DashboardUtility.calculateStatusDistribution(
                    filteredPickups,
                    pickupsHist.data || [],
                    startFilter,
                    endFilter
                ),
                tractors: DashboardUtility.calculateStatusDistribution(
                    filteredTractors,
                    tractorsHist.data || [],
                    startFilter,
                    endFilter
                ),
                trailers: DashboardUtility.calculateStatusDistribution(
                    filteredTrailers,
                    trailersHist.data || [],
                    startFilter,
                    endFilter
                )
            })
            setHistoryLoaded(true)
        } catch {}
    }, [
        dashboardRegionCode,
        historyStartDate,
        historyEndDate,
        updatePlantSet,
        createFilterFn,
        allMixersRef,
        allTractorsRef,
        allTrailersRef,
        allEquipmentRef,
        allPickupsRef,
        setHistoryStartDate,
        setHistoryEndDate,
        setOldestHistoryDate
    ])

    useEffect(() => {
        if (!loading && dataReady && allMixersRef.current.length > 0) fetchStatusHistory()
    }, [loading, dataReady, refreshKey, fetchStatusHistory, allMixersRef])

    useEffect(() => {
        if (!historyStartDate || !historyEndDate) return

        const today = new Date().toISOString().split('T')[0]
        let validatedStartDate = historyStartDate
        let validatedEndDate = historyEndDate

        if (historyEndDate > today) {
            validatedEndDate = today
            setHistoryEndDate(today)
        }

        if (historyStartDate >= validatedEndDate) {
            const endDate = new Date(validatedEndDate)
            endDate.setDate(endDate.getDate() - 1)
            validatedStartDate = endDate.toISOString().split('T')[0]
            setHistoryStartDate(validatedStartDate)
        }

        const region = RegionService.getRegionByCode(dashboardRegionCode)
        const plantSet = updatePlantSet(region?.type)
        const consider = createFilterFn(plantSet)
        const filterAssets = (assets) => assets.filter((a) => a.status !== 'Retired' && consider(a.plantCode))

        setStatusHistoryData({
            equipment: DashboardUtility.calculateStatusDistribution(
                filterAssets(allEquipmentRef.current),
                historyRecordsRef.current.equipment,
                validatedStartDate,
                validatedEndDate
            ),
            mixers: DashboardUtility.calculateStatusDistribution(
                filterAssets(allMixersRef.current),
                historyRecordsRef.current.mixers,
                validatedStartDate,
                validatedEndDate
            ),
            pickups: DashboardUtility.calculateStatusDistribution(
                filterAssets(allPickupsRef.current),
                historyRecordsRef.current.pickups,
                validatedStartDate,
                validatedEndDate
            ),
            tractors: DashboardUtility.calculateStatusDistribution(
                filterAssets(allTractorsRef.current),
                historyRecordsRef.current.tractors,
                validatedStartDate,
                validatedEndDate
            ),
            trailers: DashboardUtility.calculateStatusDistribution(
                filterAssets(allTrailersRef.current),
                historyRecordsRef.current.trailers,
                validatedStartDate,
                validatedEndDate
            )
        })
    }, [
        historyStartDate,
        historyEndDate,
        dashboardRegionCode,
        dashboardPlant,
        regionPlants,
        allPlants,
        updatePlantSet,
        createFilterFn,
        setHistoryStartDate,
        setHistoryEndDate,
        allMixersRef,
        allTractorsRef,
        allTrailersRef,
        allEquipmentRef,
        allPickupsRef
    ])

    const selectedRegion = RegionService.getRegionByCode(dashboardRegionCode)
    const isAggregate = selectedRegion?.type === 'Aggregate'
    const showSkeleton = !dataReady

    const regionDisplayName = (() => {
        const isOffice = selectedRegion?.type === 'Office'
        return isOffice
            ? 'Home Office'
            : dashboardRegionCode
              ? dashboardRegionName || dashboardRegionCode
              : hasAllRegionsPermission
                ? 'All Regions'
                : permittedRegions[0]?.regionName || 'Region'
    })()

    const heroRegionSub = (() => {
        const isOffice = selectedRegion?.type === 'Office'
        if (isOffice) {
            return `${totalRegionsExcludingOffice} Region${totalRegionsExcludingOffice !== 1 ? 's' : ''}, ${totalPlantsExcludingAggregate} Concrete Plant${totalPlantsExcludingAggregate !== 1 ? 's' : ''}, ${totalAggregateLocations} Aggregate Location${totalAggregateLocations !== 1 ? 's' : ''}`
        }
        const plantLabel = isAggregate ? 'Aggregate Location' : 'Concrete Plant'
        return dashboardPlant
            ? `${plantLabel} ${dashboardPlant}`
            : dashboardRegionCode
              ? `${regionPlants.length} ${plantLabel}${regionPlants.length !== 1 ? 's' : ''}`
              : `${allPlantsCount} ${plantLabel}${allPlantsCount !== 1 ? 's' : ''}`
    })()

    const onRefresh = () => {
        setRefreshing(true)
        setRefreshKey((prev) => prev + 1)
        setTimeout(() => setRefreshing(false), 1000)
    }

    const filterOperatorsByPlant = (operators, plantField, trainerField = null) => {
        const plantSet = plantSetRef.current
        if (plantSet.size === 0) return operators
        return operators.filter(
            (o) =>
                plantSet.has(String(o[plantField] || '').trim()) ||
                (trainerField && plantSet.has(String(o[trainerField] || '').trim()))
        )
    }

    const filteredTrainingOperators = filterOperatorsByPlant(trainingOperators, 'operatorPlant', 'trainerPlant')
    const filteredPendingStartOperators = filterOperatorsByPlant(pendingStartOperators, 'operatorPlant', 'trainerPlant')
    const filteredLightDutyOperators = filterOperatorsByPlant(lightDutyOperators, 'plant')

    const formatPendingDate = (d) => {
        if (!d) return '-'
        if (d.length === 10 && /\d{4}-\d{2}-\d{2}/.test(d)) return d
        try {
            return new Date(d).toISOString().slice(0, 10)
        } catch {
            return d
        }
    }

    return (
        <>
            <style>{`
                .content-area:has(.dashboard-full-width) { padding-left: 0 !important; padding-right: 0 !important; }
                @media (max-width: 767px) {
                    .dashboard-full-width .hidden-mobile { display: none !important; }
                    .dashboard-full-width .sm\\:flex { display: none !important; }
                    .dashboard-full-width .sm\\:inline { display: none !important; }
                }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>

            <div className="dashboard-full-width min-h-screen bg-slate-50 text-slate-900">
                <DashboardHeader
                    accentColor={accentColor}
                    isMobile={isMobile}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    dashboardRegionCode={dashboardRegionCode}
                    selectedRegion={selectedRegion}
                    dashboardPlant={dashboardPlant}
                    regionPlants={regionPlants}
                    setPlantModalOpen={setPlantModalOpen}
                />

                <div className={`mx-auto max-w-full ${isMobile ? 'p-3' : 'p-6'}`}>
                    {!showSkeleton && (isPlantManager || dashboardPlant) && (
                        <DashboardPlantSummary
                            dashboardPlant={dashboardPlant}
                            plantNotifications={plantNotifications}
                            expandedSections={expandedSections}
                            setExpandedSections={setExpandedSections}
                            setEmbeddedView={setEmbeddedView}
                            setEmbeddedViewSearch={setEmbeddedViewSearch}
                            aiDisplayText={aiDisplayText}
                            aiActionPlan={aiActionPlan}
                            isTypingComplete={isTypingComplete}
                            showActionPlan={showActionPlan}
                            handleRegenerateAISummary={handleRegenerateAISummary}
                            userRoleName={userRoleName}
                            userPlantCode={userPlantCode}
                            isPlantManager={isPlantManager}
                            isMobile={isMobile}
                        />
                    )}

                    <RegionOverviewCard
                        showSkeleton={showSkeleton}
                        regionDisplayName={regionDisplayName}
                        heroRegionSub={heroRegionSub}
                        displayStats={displayStats}
                        isMobile={isMobile}
                    />

                    {error && (
                        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl text-red-600 mb-6 px-5 py-4">
                            <span>{error}</span>
                            <button
                                onClick={() => setRefreshKey((v) => v + 1)}
                                className="bg-transparent border-none text-red-600 cursor-pointer font-semibold"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {showSkeleton ? (
                        <DashboardSkeleton isMobile={isMobile} />
                    ) : (
                        <div className={`grid ${isMobile ? 'gap-4' : 'gap-6'}`}>
                            <FleetOverviewSection
                                displayStats={displayStats}
                                stats={stats}
                                isAggregate={isAggregate}
                                selectedRegion={selectedRegion}
                                accentColor={accentColor}
                                isMobile={isMobile}
                            />

                            <DashboardCard>
                                <SectionTitle>Fleet Analytics</SectionTitle>
                                <DashboardCharts
                                    dashboardPlant={dashboardPlant}
                                    dashboardRegionCode={dashboardRegionCode}
                                    regionPlants={regionPlants}
                                    allPlants={allPlants}
                                    statusHistoryData={statusHistoryData}
                                    isAggregate={isAggregate}
                                    stats={stats}
                                />
                            </DashboardCard>

                            <PeopleSection
                                displayStats={displayStats}
                                isAggregate={isAggregate}
                                filteredTrainingOperators={filteredTrainingOperators}
                                filteredPendingStartOperators={filteredPendingStartOperators}
                                filteredLightDutyOperators={filteredLightDutyOperators}
                                trainingCollapsed={trainingCollapsed}
                                setTrainingCollapsed={setTrainingCollapsed}
                                pendingCollapsed={pendingCollapsed}
                                setPendingCollapsed={setPendingCollapsed}
                                lightDutyCollapsed={lightDutyCollapsed}
                                setLightDutyCollapsed={setLightDutyCollapsed}
                                formatPendingDate={formatPendingDate}
                                accentColor={accentColor}
                            />

                            <MaintenanceQualitySection
                                displayStats={displayStats}
                                isAggregate={isAggregate}
                                statusHistoryData={statusHistoryData}
                                handleQuickDateFilter={handleQuickDateFilter}
                                isMobile={isMobile}
                            />
                        </div>
                    )}
                </div>

                <PlantDropdownModal
                    isOpen={plantModalOpen}
                    onClose={() => setPlantModalOpen(false)}
                    plants={regionPlants}
                    onSelect={(plantCode) => setDashboardPlant(plantCode === 'All' ? '' : plantCode)}
                    showAllPlants={true}
                />

                {embeddedView && (
                    <EmbeddedViewModal
                        embeddedView={embeddedView}
                        embeddedViewSearch={embeddedViewSearch}
                        accentColor={accentColor}
                        onClose={() => {
                            setEmbeddedView(null)
                            setEmbeddedViewSearch('')
                        }}
                    />
                )}
            </div>
        </>
    )
}

function DashboardHeader({
    accentColor,
    isMobile,
    refreshing,
    onRefresh,
    dashboardRegionCode,
    selectedRegion,
    dashboardPlant,
    regionPlants,
    setPlantModalOpen
}) {
    return (
        <div
            className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm"
            style={{
                backgroundImage:
                    'linear-gradient(rgba(30, 58, 95, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 58, 95, 0.02) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                padding: isMobile ? '10px 12px' : '12px 16px'
            }}
        >
            <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3 mx-auto max-w-full">
                <h1 className={`font-bold text-slate-900 m-0 ${isMobile ? 'text-lg' : 'text-xl'}`}>Dashboard</h1>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={refreshing}
                        className="flex items-center justify-center gap-1.5 rounded-lg text-white text-sm font-medium px-3 py-2 min-w-9"
                        style={{
                            backgroundColor: accentColor,
                            cursor: refreshing ? 'not-allowed' : 'pointer',
                            opacity: refreshing ? 0.7 : 1
                        }}
                    >
                        <i
                            className="fas fa-sync-alt"
                            style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
                        />
                        <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                    {dashboardRegionCode && selectedRegion?.type !== 'Office' && (
                        <button
                            type="button"
                            onClick={() => setPlantModalOpen(true)}
                            disabled={refreshing}
                            className="bg-white border border-gray-300 rounded-lg text-gray-700 text-sm font-medium px-3 py-2 max-w-36 truncate cursor-pointer"
                        >
                            {dashboardPlant
                                ? regionPlants.find((p) => (p.plantCode || p.plant_code) === dashboardPlant)
                                      ?.plantName || dashboardPlant
                                : 'All Plants'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function RegionOverviewCard({ showSkeleton, regionDisplayName, heroRegionSub, displayStats, isMobile }) {
    return (
        <DashboardCard className="mb-6">
            <div className="mb-5">
                {showSkeleton ? (
                    <>
                        <div className="h-6 w-48 bg-slate-200 rounded-md mb-2" />
                        <div className="h-4 w-72 bg-slate-200 rounded-md" />
                    </>
                ) : (
                    <>
                        <h2 className="text-xl font-semibold text-slate-900 m-0 mb-1">{regionDisplayName}</h2>
                        <p className="text-sm text-slate-500 m-0">{heroRegionSub}</p>
                    </>
                )}
            </div>

            <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-4 gap-4'}`}>
                {showSkeleton ? (
                    [1, 2, 3, 4].map((i) => <SkeletonMetricCard key={i} />)
                ) : (
                    <>
                        <MetricCard label="Fleet Total" value={displayStats.fleetTotal} subtitle="Total Assets" />
                        <MetricCard
                            label="Asset Allocation"
                            value={`${displayStats.overallAllocationPercent}%`}
                            subtitle="Overall Allocation"
                        />
                        <MetricCard
                            label="Service Overdue"
                            value={displayStats.overdueTotal}
                            subtitle="Need Attention"
                        />
                        <MetricCard
                            label="Verification"
                            value={`${displayStats.verificationAverage}%`}
                            subtitle="Overall Verified"
                        />
                    </>
                )}
            </div>
        </DashboardCard>
    )
}

function FleetOverviewSection({ displayStats, stats, isAggregate, selectedRegion, accentColor, isMobile }) {
    return (
        <DashboardCard>
            <SectionTitle>Fleet Overview</SectionTitle>
            <div
                className={`grid ${isMobile ? 'gap-3' : 'gap-4'} ${isMobile ? 'grid-cols-1' : 'grid-cols-[repeat(auto-fit,minmax(280px,1fr))]'}`}
            >
                {!isAggregate && (
                    <MetricCard
                        label="Mixers"
                        value={displayStats.mixers.total}
                        icon="fa-truck"
                        iconBg="#dbeafe"
                        iconColor="#2563eb"
                        highlight={selectedRegion?.type === 'Concrete'}
                        accentColor={accentColor}
                    >
                        <StatusPill>Active {displayStats.mixers.active}</StatusPill>
                        <StatusPill>Spare {displayStats.mixers.spare}</StatusPill>
                        <StatusPill>In Shop {displayStats.mixers.shop}</StatusPill>
                        <AllocationPill percent={displayStats.mixers.allocationPercent} />
                    </MetricCard>
                )}

                <MetricCard
                    label="Tractors"
                    value={displayStats.tractors.total}
                    icon="fa-tractor"
                    iconBg="#dcfce7"
                    iconColor="#16a34a"
                    highlight={selectedRegion?.type === 'Aggregate'}
                    accentColor={accentColor}
                >
                    <StatusPill>Active {displayStats.tractors.active}</StatusPill>
                    <StatusPill>Spare {displayStats.tractors.spare}</StatusPill>
                    <StatusPill>In Shop {displayStats.tractors.shop}</StatusPill>
                    <AllocationPill percent={displayStats.tractors.allocationPercent} />
                    {displayStats.tractors.freight && (
                        <FreightTypeBreakdown freightData={displayStats.tractors.freight} isMobile={isMobile} />
                    )}
                </MetricCard>

                <MetricCard
                    label="Trailers"
                    value={displayStats.trailers.total}
                    icon="fa-trailer"
                    iconBg="#fef3c7"
                    iconColor="#d97706"
                >
                    <StatusPill>Active {displayStats.trailers.active}</StatusPill>
                    <StatusPill>Spare {displayStats.trailers.spare}</StatusPill>
                    <StatusPill>In Shop {displayStats.trailers.shop}</StatusPill>
                    <AllocationPill percent={displayStats.trailers.allocationPercent} />
                    {displayStats.trailers.trailerType && (
                        <TrailerTypeBreakdown trailerTypeData={displayStats.trailers.trailerType} isMobile={isMobile} />
                    )}
                </MetricCard>

                <MetricCard
                    label="Equipment"
                    value={displayStats.equipment.total}
                    icon="fa-snowplow"
                    iconBg="#f3e8ff"
                    iconColor="#9333ea"
                >
                    <StatusPill>Active {displayStats.equipment.active}</StatusPill>
                    <StatusPill>Spare {displayStats.equipment.spare}</StatusPill>
                    <StatusPill>In Shop {displayStats.equipment.shop}</StatusPill>
                    <AllocationPill percent={displayStats.equipment.allocationPercent} />
                </MetricCard>

                <MetricCard
                    label="Pickup Trucks"
                    value={stats.pickups.total}
                    icon="fa-truck-pickup"
                    iconBg="#fce7f3"
                    iconColor="#db2777"
                >
                    <StatusPill>Active {stats.pickups.active}</StatusPill>
                    <StatusPill>In Shop {stats.pickups.shop}</StatusPill>
                    <StatusPill>Stationary {stats.pickups.stationary}</StatusPill>
                </MetricCard>
            </div>
        </DashboardCard>
    )
}

function PeopleSection({
    displayStats,
    isAggregate,
    filteredTrainingOperators,
    filteredPendingStartOperators,
    filteredLightDutyOperators,
    trainingCollapsed,
    setTrainingCollapsed,
    pendingCollapsed,
    setPendingCollapsed,
    lightDutyCollapsed,
    setLightDutyCollapsed,
    formatPendingDate,
    accentColor
}) {
    return (
        <DashboardCard>
            <SectionTitle>People</SectionTitle>
            <MetricCard
                label="Operators"
                value={displayStats.operators.total}
                icon="fa-users"
                iconBg="#e0f2fe"
                iconColor="#0284c7"
                className="mb-5"
            >
                <StatusPill>Active {displayStats.operators.active}</StatusPill>
                <StatusPill>Light Duty {displayStats.operators.lightDuty}</StatusPill>
                <StatusPill>Assigned {displayStats.operators.assigned}</StatusPill>
                {!isAggregate && <StatusPill>Mixers {displayStats.operators.mixerAssigned}</StatusPill>}
                <StatusPill>Tractors {displayStats.operators.tractorAssigned}</StatusPill>
                <StatusPill>Unassigned {displayStats.operators.unassigned}</StatusPill>
            </MetricCard>

            <CollapsibleTable
                title={`Operators In Training (${filteredTrainingOperators.length})`}
                collapsed={trainingCollapsed}
                onToggle={() => setTrainingCollapsed((v) => !v)}
                disabled={!filteredTrainingOperators.length}
                headers={['Plant (Training At)', 'Operator', 'Trainer', 'Position', 'Plant (Training For)']}
                rows={filteredTrainingOperators}
                renderRow={(r) => [
                    r.trainerPlant || '-',
                    r.operatorName || '-',
                    r.trainerName || '-',
                    r.operatorPosition || '-',
                    r.operatorPlant || '-'
                ]}
                accentColor={accentColor}
            />

            <CollapsibleTable
                title={`Pending Start Operators (${filteredPendingStartOperators.length})`}
                collapsed={pendingCollapsed}
                onToggle={() => setPendingCollapsed((v) => !v)}
                disabled={!filteredPendingStartOperators.length}
                headers={['Plant (Training At)', 'Operator', 'Plant (Training For)', 'Pending Start Date']}
                rows={filteredPendingStartOperators}
                renderRow={(r) => [
                    r.trainerPlant || '-',
                    r.operatorName || '-',
                    r.operatorPlant || '-',
                    formatPendingDate(r.pendingDate)
                ]}
                accentColor={accentColor}
            />

            <CollapsibleTable
                title={`Light Duty Operators (${filteredLightDutyOperators.length})`}
                collapsed={lightDutyCollapsed}
                onToggle={() => setLightDutyCollapsed((v) => !v)}
                disabled={!filteredLightDutyOperators.length}
                headers={['Plant', 'Operator']}
                rows={filteredLightDutyOperators}
                renderRow={(r) => [r.plant || '-', r.operatorName || '-']}
                accentColor={accentColor}
            />
        </DashboardCard>
    )
}

function MaintenanceQualitySection({ displayStats, isAggregate, statusHistoryData, handleQuickDateFilter, isMobile }) {
    const calcMetrics = (data) => {
        const active = data.find((d) => d.status === 'Active')?.days || 0
        const spare = data.find((d) => d.status === 'Spare')?.days || 0
        const inShop = data.find((d) => d.status === 'In Shop')?.days || 0
        const total = data.reduce((sum, d) => sum + d.days, 0)
        return {
            active: total > 0 ? Math.round((active / total) * 100) : 0,
            inShop: total > 0 ? Math.round((inShop / total) * 100) : 0,
            spare: total > 0 ? Math.round((spare / total) * 100) : 0
        }
    }

    const assets = [
        { name: 'Mixers', ...calcMetrics(statusHistoryData.mixers), show: !isAggregate },
        { name: 'Tractors', ...calcMetrics(statusHistoryData.tractors), show: true },
        { name: 'Trailers', ...calcMetrics(statusHistoryData.trailers), show: true },
        { name: 'Equipment', ...calcMetrics(statusHistoryData.equipment), show: true },
        { name: 'Pickups', ...calcMetrics(statusHistoryData.pickups), show: true }
    ].filter((a) => a.show)

    const chartData = [
        !isAggregate &&
            statusHistoryData.mixers?.length > 0 && {
                active: parseFloat(statusHistoryData.mixers.find((d) => d.status === 'Active')?.percentage || 0),
                inShop: parseFloat(statusHistoryData.mixers.find((d) => d.status === 'In Shop')?.percentage || 0),
                name: 'Mixers',
                spare: parseFloat(statusHistoryData.mixers.find((d) => d.status === 'Spare')?.percentage || 0),
                stationary: parseFloat(statusHistoryData.mixers.find((d) => d.status === 'Stationary')?.percentage || 0)
            },
        statusHistoryData.tractors?.length > 0 && {
            active: parseFloat(statusHistoryData.tractors.find((d) => d.status === 'Active')?.percentage || 0),
            inShop: parseFloat(statusHistoryData.tractors.find((d) => d.status === 'In Shop')?.percentage || 0),
            name: 'Tractors',
            spare: parseFloat(statusHistoryData.tractors.find((d) => d.status === 'Spare')?.percentage || 0),
            stationary: parseFloat(statusHistoryData.tractors.find((d) => d.status === 'Stationary')?.percentage || 0)
        },
        statusHistoryData.trailers?.length > 0 && {
            active: parseFloat(statusHistoryData.trailers.find((d) => d.status === 'Active')?.percentage || 0),
            inShop: parseFloat(statusHistoryData.trailers.find((d) => d.status === 'In Shop')?.percentage || 0),
            name: 'Trailers',
            spare: parseFloat(statusHistoryData.trailers.find((d) => d.status === 'Spare')?.percentage || 0),
            stationary: parseFloat(statusHistoryData.trailers.find((d) => d.status === 'Stationary')?.percentage || 0)
        },
        statusHistoryData.equipment?.length > 0 && {
            active: parseFloat(statusHistoryData.equipment.find((d) => d.status === 'Active')?.percentage || 0),
            inShop: parseFloat(statusHistoryData.equipment.find((d) => d.status === 'In Shop')?.percentage || 0),
            name: 'Equipment',
            spare: parseFloat(statusHistoryData.equipment.find((d) => d.status === 'Spare')?.percentage || 0),
            stationary: parseFloat(statusHistoryData.equipment.find((d) => d.status === 'Stationary')?.percentage || 0)
        },
        statusHistoryData.pickups?.length > 0 && {
            active: parseFloat(statusHistoryData.pickups.find((d) => d.status === 'Active')?.percentage || 0),
            inShop: parseFloat(statusHistoryData.pickups.find((d) => d.status === 'In Shop')?.percentage || 0),
            name: 'Pickups',
            spare: parseFloat(statusHistoryData.pickups.find((d) => d.status === 'Spare')?.percentage || 0),
            stationary: parseFloat(statusHistoryData.pickups.find((d) => d.status === 'Stationary')?.percentage || 0)
        }
    ].filter(Boolean)

    const HistoryTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null
        return (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3.5 py-2.5">
                <p className="text-sm font-semibold text-slate-900 m-0 mb-1.5">{label}</p>
                {payload
                    .filter((p) => p.value > 0)
                    .map((entry, index) => (
                        <p key={index} className="text-xs m-0.5" style={{ color: entry.color }}>
                            {entry.name}: {entry.value.toFixed(1)}%
                        </p>
                    ))}
            </div>
        )
    }

    return (
        <DashboardCard>
            <SectionTitle>Maintenance & Quality</SectionTitle>
            <div
                className={`grid ${isMobile ? 'gap-3' : 'gap-4'} ${isMobile ? 'grid-cols-1' : 'grid-cols-[repeat(auto-fit,minmax(250px,1fr))]'} mb-4 md:mb-6`}
            >
                <MetricCard
                    label="Service Overdue"
                    value={displayStats.overdueTotal}
                    icon="fa-exclamation-triangle"
                    iconBg="#fee2e2"
                    iconColor="#dc2626"
                >
                    {!isAggregate && <StatusPill>Mixers {displayStats.mixers.overdue}</StatusPill>}
                    <StatusPill>Tractors {displayStats.tractors.overdue}</StatusPill>
                    <StatusPill>Trailers {displayStats.trailers.overdue}</StatusPill>
                    <StatusPill>Equipment {displayStats.equipment.overdue}</StatusPill>
                </MetricCard>
                <MetricCard
                    label="Open Issues"
                    value={displayStats.openIssuesTotal}
                    icon="fa-wrench"
                    iconBg="#fef3c7"
                    iconColor="#f59e0b"
                >
                    {!isAggregate && <StatusPill>Mixers {displayStats.mixers.issues}</StatusPill>}
                    <StatusPill>Tractors {displayStats.tractors.issues}</StatusPill>
                    <StatusPill>Trailers {displayStats.trailers.issues}</StatusPill>
                    <StatusPill>Equipment {displayStats.equipment.issues}</StatusPill>
                </MetricCard>
            </div>

            <div className="border-t border-slate-200 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                    <h4 className="text-base font-semibold text-slate-900 m-0">Historical Status Distribution</h4>
                    <div className="flex flex-wrap items-center gap-2">
                        {['last-week', 'this-month', 'this-quarter', 'this-year', 'all'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => handleQuickDateFilter(filter)}
                                className="bg-slate-100 border-none rounded-md text-slate-600 text-xs font-medium px-3 py-1.5 cursor-pointer hover:bg-slate-200"
                            >
                                {filter
                                    .split('-')
                                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                    .join(' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div
                    className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-[repeat(auto-fit,minmax(140px,1fr))]'} gap-3 mb-4 md:mb-6`}
                >
                    {assets.map((asset, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                            <div className="text-sm font-semibold text-slate-600 mb-2.5">{asset.name}</div>
                            <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between text-xs">
                                    <span className="text-green-600">Active</span>
                                    <span className="font-semibold text-slate-900">{asset.active}%</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-purple-600">Spare</span>
                                    <span className="font-semibold text-slate-900">{asset.spare}%</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-blue-600">In Shop</span>
                                    <span className="font-semibold text-slate-900">{asset.inShop}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-2.5">
                    {chartData.length === 0 ? (
                        <div className="text-center py-5 text-slate-400 text-sm">No historical data available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={chartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    unit="%"
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    width={80}
                                />
                                <Tooltip content={<HistoryTooltip />} />
                                <Legend wrapperStyle={{ color: '#64748b', fontSize: 11 }} />
                                <Bar dataKey="active" stackId="a" fill={STATUS_COLORS.Active} name="Active" />
                                <Bar dataKey="spare" stackId="a" fill={STATUS_COLORS.Spare} name="Spare" />
                                <Bar dataKey="inShop" stackId="a" fill={STATUS_COLORS['In Shop']} name="In Shop" />
                                <Bar
                                    dataKey="stationary"
                                    stackId="a"
                                    fill={STATUS_COLORS.Stationary}
                                    name="Stationary"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </DashboardCard>
    )
}

function DashboardSkeleton({ isMobile }) {
    return (
        <div className="grid gap-6">
            <DashboardCard>
                <div className="h-5 w-36 bg-slate-200 rounded-md mb-5" />
                <div
                    className={`grid ${isMobile ? 'gap-3' : 'gap-4'} ${isMobile ? 'grid-cols-1' : 'grid-cols-[repeat(auto-fit,minmax(280px,1fr))]'}`}
                >
                    {[1, 2, 3, 4, 5].map((i) => (
                        <SkeletonMetricCard key={i} />
                    ))}
                </div>
            </DashboardCard>

            <DashboardCard>
                <div className="h-5 w-24 bg-slate-200 rounded-md mb-5" />
                <SkeletonMetricCard />
                <div className="mt-5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg mb-3 px-4 py-3.5">
                            <div className="h-4 w-48 bg-slate-200 rounded" />
                        </div>
                    ))}
                </div>
            </DashboardCard>

            <DashboardCard>
                <div className="h-5 w-48 bg-slate-200 rounded-md mb-5" />
                <div
                    className={`grid ${isMobile ? 'gap-3' : 'gap-4'} ${isMobile ? 'grid-cols-1' : 'grid-cols-[repeat(auto-fit,minmax(250px,1fr))]'} mb-4 md:mb-6`}
                >
                    {[1, 2].map((i) => (
                        <SkeletonMetricCard key={i} />
                    ))}
                </div>
            </DashboardCard>
        </div>
    )
}

function EmbeddedViewModal({ embeddedView, embeddedViewSearch, accentColor, onClose }) {
    const viewConfig = {
        equipment: { component: EquipmentsView, icon: 'fa-snowplow', title: 'Equipment' },
        mixers: { component: MixersView, icon: 'fa-truck-moving', title: 'Mixers' },
        operators: { component: OperatorsView, icon: 'fa-users', title: 'Operators' },
        tractors: { component: TractorsView, icon: 'fa-truck-front', title: 'Tractors' },
        trailers: { component: TrailersView, icon: 'fa-truck', title: 'Trailers' }
    }

    const config = viewConfig[embeddedView]
    if (!config) return null

    const ViewComponent = config.component

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-6xl h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div
                    className="flex items-center justify-between px-5 py-3 text-white flex-shrink-0"
                    style={{ backgroundColor: accentColor }}
                >
                    <div className="flex items-center gap-3">
                        <i className={`fas ${config.icon} text-lg`} />
                        <span className="font-semibold text-lg">{config.title}</span>
                        {embeddedViewSearch && (
                            <span className="px-2 py-0.5 bg-white/20 rounded text-sm">
                                Searching: {embeddedViewSearch}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <i className="fas fa-times text-lg" />
                    </button>
                </div>
                <div className="flex-1 overflow-auto">
                    <ViewComponent embedded={true} initialSearch={embeddedViewSearch} exactMatch={true} />
                </div>
            </div>
        </div>
    )
}
