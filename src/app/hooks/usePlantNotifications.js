import { useCallback, useEffect, useState } from 'react'

import { AIService } from '../../services/AIService'
import { supabase } from '../../services/DatabaseService'
import { RegionService } from '../../services/RegionService'
import DashboardUtility from '../../utils/DashboardUtility'
import LeaderboardsUtility from '../../utils/LeaderboardsUtility'
import VerifiedUtility from '../../utils/VerifiedUtility'
import { INITIAL_PLANT_NOTIFICATIONS } from '../constants/dashboardConstants'
const filterByPlantSet = (operators, plantSet, plantField, trainerField = null) =>
    operators.filter(
        (o) =>
            plantSet.size === 0 ||
            plantSet.has(String(o[plantField] || '').trim()) ||
            (trainerField && plantSet.has(String(o[trainerField] || '').trim()))
    )
/**
 * Computes per-plant notification alerts (unverified mixers, overdue service, pending operators,
 * unassigned operators, training operators, long-term shop assets, assets with most issues).
 */
export function usePlantNotifications({
    allEquipmentRef,
    allMixersRef,
    allOperatorsFullRef,
    allTractorsRef,
    allTrailersRef,
    assetIssueDetails,
    createFilterFn,
    dataReady,
    historyLoaded,
    historyRecordsRef,
    pendingStartOperators,
    plantSetRef,
    trainingOperators
}) {
    const [plantNotifications, setPlantNotifications] = useState(INITIAL_PLANT_NOTIFICATIONS)
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
        const pendingOps = filterByPlantSet(pendingStartOperators, plantSet, 'operatorPlant', 'trainerPlant').slice(
            0,
            5
        )
        const trainingOps = filterByPlantSet(trainingOperators, plantSet, 'operatorPlant', 'trainerPlant').slice(0, 5)
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
                return asset?.status !== 'Retired'
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
        assetIssueDetails,
        pendingStartOperators,
        trainingOperators,
        plantSetRef,
        createFilterFn,
        allMixersRef,
        allTractorsRef,
        allTrailersRef,
        allEquipmentRef,
        allOperatorsFullRef,
        historyRecordsRef
    ])
    return { filterByPlantSet, plantNotifications, setPlantNotifications }
}
/**
 * Calculates per-plant leaderboard efficiency metrics from weekly reports
 * and fleet data, enriching plants with rankings and yardage comparisons.
 */
export function useLeaderboardMetrics({
    allEquipmentRef,
    allMixersRef,
    allOperatorsFullRef,
    allTractorsRef,
    allTrailersRef,
    dashboardPlant,
    dashboardRegionCode,
    dataReady,
    setPlantNotifications
}) {
    useEffect(() => {
        setPlantNotifications(INITIAL_PLANT_NOTIFICATIONS)
    }, [dashboardPlant, setPlantNotifications])
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
                const allMixers = allMixersRef.current || []
                const allTractors = allTractorsRef.current || []
                const allTrailers = allTrailersRef.current || []
                const allEquipment = allEquipmentRef.current || []
                const allOperatorsFull = allOperatorsFullRef.current || []
                const fleetCountsByPlant = LeaderboardsUtility.calculateFleetCounts(
                    plantCodesInRegion,
                    allMixers,
                    allTractors,
                    allTrailers,
                    allEquipment,
                    allOperatorsFull
                )
                // Build per-plant fleet status breakdowns for AI chat context
                const getPlant = (item) =>
                    item.assignedPlant || item.assigned_plant || item.plantCode || item.plant_code
                const statusCount = (items, plant, status) =>
                    items.filter((i) => getPlant(i) === plant && i.status === status && i.status !== 'Retired').length
                const fleetStatusByPlant = {}
                plantCodesInRegion.forEach((pc) => {
                    fleetStatusByPlant[pc] = {
                        mixersActive: statusCount(allMixers, pc, 'Active'),
                        mixersInShop: statusCount(allMixers, pc, 'In Shop'),
                        mixersSpare: statusCount(allMixers, pc, 'Spare'),
                        tractorsActive: statusCount(allTractors, pc, 'Active'),
                        tractorsInShop: statusCount(allTractors, pc, 'In Shop'),
                        trailersActive: statusCount(allTrailers, pc, 'Active'),
                        trailersInShop: statusCount(allTrailers, pc, 'In Shop')
                    }
                })
                const now = new Date()
                const currentWeekStart = new Date(now)
                currentWeekStart.setDate(now.getDate() - now.getDay())
                currentWeekStart.setHours(0, 0, 0, 0)
                const filteredReports = reports.filter((report) => new Date(report.week) < currentWeekStart)
                if (cancelled || !filteredReports.length) return
                const DEFAULT_FLEET_DATA = {
                    avgFleetCleanliness: 0,
                    equipment: 0,
                    mixerOperators: 1,
                    mixers: 0,
                    operators: 0,
                    totalAssets: 0,
                    tractors: 0,
                    trailers: 0
                }
                const plantMetricsArray = Object.keys(userIdsByPlant)
                    .map((plantCode) => {
                        const plantReports = filteredReports.filter((r) =>
                            userIdsByPlant[plantCode].includes(r.user_id)
                        )
                        const fleetData = fleetCountsByPlant[plantCode] || DEFAULT_FLEET_DATA
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
                        return metrics
                            ? {
                                  plantCode,
                                  ...metrics,
                                  ...fleetData,
                                  helpGiven: hoursAdjustments?.hoursSubtracted || 0,
                                  helpReceived: hoursAdjustments?.hoursAdded || 0,
                                  netHelp:
                                      (hoursAdjustments?.hoursSubtracted || 0) - (hoursAdjustments?.hoursAdded || 0),
                                  safetyReportsCount: safetyIncidents?.count || 0
                              }
                            : null
                    })
                    .filter(Boolean)
                const sortedByEfficiency = plantMetricsArray
                    .filter((p) => typeof p.avgEfficiency === 'number' && p.avgWeeklyHours > 0)
                    .sort((a, b) => b.avgEfficiency - a.avgEfficiency)
                const plantRank = sortedByEfficiency.findIndex((p) => p.plantCode === dashboardPlant) + 1
                const plantMetrics = sortedByEfficiency.find((p) => p.plantCode === dashboardPlant)
                if (cancelled || !plantMetrics) return
                const allPlantRankings = sortedByEfficiency.map((p, idx) => ({
                    adjustedYPH: p.avgYPH,
                    avgCleanliness: p.avgFleetCleanliness || 0,
                    efficiency: p.avgEfficiency,
                    fleet: fleetStatusByPlant[p.plantCode] || null,
                    helpGiven: p.helpGiven,
                    helpReceived: p.helpReceived,
                    loadsPerOperatorPerDay: p.loadsPerOperatorPerDay,
                    mixers: p.mixers || 0,
                    netHelp: p.netHelp,
                    operators: p.operators || 0,
                    plantCode: p.plantCode,
                    rank: idx + 1,
                    rawYPH: p.rawYPH,
                    safetyIncidents: p.safetyReportsCount || 0,
                    totalAssets: p.totalAssets || 0,
                    tractors: p.tractors || 0,
                    trailers: p.trailers || 0
                }))
                setPlantNotifications((prev) => ({
                    ...prev,
                    allPlantRankings,
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
        allOperatorsFullRef,
        setPlantNotifications
    ])
}
/**
 * Generates an AI-powered plant summary using fleet data, efficiency metrics,
 * and role context. Caches results per plant and supports regeneration.
 */
export function useAISummary({
    allMixersRef,
    createFilterFn,
    dashboardPlant,
    plantNotifications,
    plantSetRef,
    setPlantNotifications,
    userPlantCode,
    userRoleName,
    userRoleWeight
}) {
    const [forceRegenerateAI, setForceRegenerateAI] = useState(0)
    const handleRegenerateAISummary = useCallback(() => {
        if (!dashboardPlant) return
        DashboardUtility.clearAISummaryCache(dashboardPlant)
        setPlantNotifications((prev) => ({ ...prev, aiSummary: null, aiSummaryFailed: false, aiSummaryLoading: false }))
        setForceRegenerateAI((prev) => prev + 1)
    }, [dashboardPlant, setPlantNotifications])
    useEffect(() => {
        if (!plantNotifications.leaderboardMetrics || !dashboardPlant) return
        if (forceRegenerateAI === 0) {
            const cachedSummary = DashboardUtility.getAISummaryFromCache(dashboardPlant)
            if (cachedSummary) {
                updateAISummaryState(setPlantNotifications, cachedSummary, false)
                return
            }
        }
        let cancelled = false
        let failResetTimerId
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
                const countByRating = (rating) => activeMixers.filter((m) => m.cleanlinessRating === rating).length
                const summary = await AIService.generatePlantSummary({
                    assetsWithMostIssues: plantNotifications.assetsWithMostIssues,
                    fleetCleanliness: {
                        average: avgCleanliness,
                        breakdown: {
                            average: countByRating(3),
                            excellent: countByRating(5),
                            good: countByRating(4),
                            poor: activeMixers.filter((m) => m.cleanlinessRating > 0 && m.cleanlinessRating < 3).length,
                            unrated: activeMixers.filter((m) => !m.cleanlinessRating || m.cleanlinessRating === 0)
                                .length
                        },
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
                if (cancelled) return
                if (summary) {
                    DashboardUtility.setAISummaryToCache(dashboardPlant, summary)
                    updateAISummaryState(setPlantNotifications, summary, false)
                } else {
                    updateAISummaryState(setPlantNotifications, null, true)
                    failResetTimerId = setTimeout(() => {
                        if (!cancelled) setPlantNotifications((prev) => ({ ...prev, aiSummaryFailed: false }))
                    }, 3000)
                }
            } catch {
                if (!cancelled) {
                    updateAISummaryState(setPlantNotifications, null, true)
                    failResetTimerId = setTimeout(() => {
                        if (!cancelled) setPlantNotifications((prev) => ({ ...prev, aiSummaryFailed: false }))
                    }, 3000)
                }
            }
        }
        generateAISummary()
        return () => {
            cancelled = true
            clearTimeout(failResetTimerId)
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
        userRoleWeight,
        setPlantNotifications
    ])
    return { handleRegenerateAISummary }
}
/**
 * Generates an AI-powered region summary when no specific plant is selected.
 * Uses regional fleet stats and notification data to produce insights.
 */
export function useRegionalAISummary({
    dashboardPlant,
    dataReady,
    displayStats,
    plantNotifications,
    regionDisplayName,
    setRegionalAI,
    userRoleName,
    userRoleWeight
}) {
    const [forceRegenerate, setForceRegenerate] = useState(0)
    const regionCacheKey = `region_${regionDisplayName}`
    const handleRegenerateRegionalAI = useCallback(() => {
        DashboardUtility.clearAISummaryCache(regionCacheKey)
        setRegionalAI({ aiSummary: null, aiSummaryFailed: false, aiSummaryLoading: false })
        setForceRegenerate((prev) => prev + 1)
    }, [regionCacheKey, setRegionalAI])
    useEffect(() => {
        // Only run in regional mode (no specific plant selected)
        if (dashboardPlant) return
        if (!dataReady) return
        // Need at least some stats loaded
        if (!displayStats || displayStats.fleetTotal === 0) return
        if (forceRegenerate === 0) {
            const cachedSummary = DashboardUtility.getAISummaryFromCache(regionCacheKey)
            if (cachedSummary) {
                setRegionalAI({ aiSummary: cachedSummary, aiSummaryFailed: false, aiSummaryLoading: false })
                return
            }
        }
        let cancelled = false
        let failTimer
        async function generate() {
            setRegionalAI((prev) => ({ ...prev, aiSummaryFailed: false, aiSummaryLoading: true }))
            try {
                const summary = await AIService.generateRegionSummary({
                    notifications: plantNotifications,
                    plantCount: displayStats.operators?.total > 0 ? undefined : 0,
                    regionName: regionDisplayName,
                    stats: displayStats,
                    userContext: { roleName: userRoleName, roleWeight: userRoleWeight }
                })
                if (cancelled) return
                if (summary) {
                    DashboardUtility.setAISummaryToCache(regionCacheKey, summary)
                    setRegionalAI({ aiSummary: summary, aiSummaryFailed: false, aiSummaryLoading: false })
                } else {
                    setRegionalAI({ aiSummary: null, aiSummaryFailed: true, aiSummaryLoading: false })
                    failTimer = setTimeout(() => {
                        if (!cancelled) setRegionalAI((prev) => ({ ...prev, aiSummaryFailed: false }))
                    }, 3000)
                }
            } catch {
                if (!cancelled) {
                    setRegionalAI({ aiSummary: null, aiSummaryFailed: true, aiSummaryLoading: false })
                    failTimer = setTimeout(() => {
                        if (!cancelled) setRegionalAI((prev) => ({ ...prev, aiSummaryFailed: false }))
                    }, 3000)
                }
            }
        }
        generate()
        return () => {
            cancelled = true
            clearTimeout(failTimer)
        }
    }, [
        dashboardPlant,
        dataReady,
        displayStats,
        plantNotifications,
        regionDisplayName,
        forceRegenerate,
        userRoleName,
        userRoleWeight,
        setRegionalAI
    ])
    return { handleRegenerateRegionalAI }
}

const updateAISummaryState = (setPlantNotifications, aiSummary, failed) =>
    setPlantNotifications((prev) => ({
        ...prev,
        aiSummary,
        aiSummaryFailed: failed,
        aiSummaryLoading: false
    }))
