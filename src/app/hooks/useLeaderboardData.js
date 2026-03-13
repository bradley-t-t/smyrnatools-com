import { useCallback, useEffect, useState } from 'react'

import { supabase } from '../../services/DatabaseService'
import { EquipmentService } from '../../services/EquipmentService'
import { MixerService } from '../../services/MixerService'
import { OperatorService } from '../../services/OperatorService'
import { PlantService } from '../../services/PlantService'
import { TractorService } from '../../services/TractorService'
import { TrailerService } from '../../services/TrailerService'
import LeaderboardsUtility from '../../utils/LeaderboardsUtility'
import { DEFAULT_FLEET_DATA } from '../constants/leaderboardConstants'
function getCurrentWeekStart() {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    return weekStart
}
function buildPlantMetrics(
    plantCode,
    plantName,
    plantReports,
    fleetCountsByPlant,
    hoursAdjustmentsByPlant,
    safetyByPlant,
    currentWeekStart
) {
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
    if (!metrics) return null
    return {
        plantCode,
        plantName,
        ...metrics,
        ...fleetData,
        helpDetails: hoursAdjustments,
        helpGiven: hoursAdjustments?.hoursSubtracted || 0,
        helpReceived: hoursAdjustments?.hoursAdded || 0,
        safetyReportsCount: safetyIncidents?.count || 0
    }
}
/**
 * Loads leaderboard rankings by aggregating weekly report data, fleet counts,
 * safety records, and hours adjustments across all plants in the selected region.
 */
export function useLeaderboardData(selectedRegionCode, selectedYear) {
    const [loading, setLoading] = useState(true)
    const [plantMetrics, setPlantMetrics] = useState([])
    const [hoursAdjustmentsData, setHoursAdjustmentsData] = useState({})
    const fetchData = useCallback(
        async (mounted) => {
            setLoading(true)
            try {
                if (!selectedRegionCode) {
                    if (mounted.current) {
                        setPlantMetrics([])
                        setLoading(false)
                    }
                    return
                }
                const selectedRegion = PlantService.getRegionByCode(selectedRegionCode)
                if (selectedRegion?.type !== 'Concrete') {
                    if (mounted.current) {
                        setPlantMetrics([])
                        setLoading(false)
                    }
                    return
                }
                const plantsInRegion = await PlantService.fetchRegionPlants(selectedRegionCode)
                if (!plantsInRegion?.length) {
                    if (mounted.current) {
                        setPlantMetrics([])
                        setLoading(false)
                    }
                    return
                }
                const plantCodesInRegion = plantsInRegion.map((p) => p.plantCode)
                const plantNames = Object.fromEntries(plantsInRegion.map((p) => [p.plantCode, p.plantName]))
                const extendedStartDate = new Date(selectedYear - 1, 11, 25)
                const extendedEndDate = new Date(selectedYear + 1, 0, 7, 23, 59, 59)
                const { data: profilesData, error: profilesError } = await supabase
                    .from('users_profiles')
                    .select('id, plant_code')
                    .in('plant_code', plantCodesInRegion)
                    .not('plant_code', 'is', null)
                if (profilesError) {
                    console.error('Error fetching profiles:', profilesError)
                    if (mounted.current) {
                        setPlantMetrics([])
                        setLoading(false)
                    }
                    return
                }
                const userIdsByPlant = profilesData.reduce((acc, p) => {
                    if (!acc[p.plant_code]) acc[p.plant_code] = []
                    acc[p.plant_code].push(p.id)
                    return acc
                }, {})
                const allUserIds = profilesData.map((p) => p.id)
                if (!allUserIds.length) {
                    if (mounted.current) {
                        setPlantMetrics([])
                        setLoading(false)
                    }
                    return
                }
                const [{ data: reports, error: reportsError }, { data: safetyReports }] = await Promise.all([
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
                if (reportsError) {
                    console.error('Error fetching reports:', reportsError)
                    if (mounted.current) {
                        setPlantMetrics([])
                        setLoading(false)
                    }
                    return
                }
                if (!mounted.current) return
                const hoursAdjustmentsByPlant = LeaderboardsUtility.calculateHoursAdjustments(
                    reports,
                    profilesData,
                    plantCodesInRegion
                )
                setHoursAdjustmentsData(hoursAdjustmentsByPlant)
                const safetyByPlant = LeaderboardsUtility.calculateSafetyIncidents(
                    safetyReports || [],
                    plantCodesInRegion
                )
                if (!reports?.length) {
                    if (mounted.current) {
                        setPlantMetrics([])
                        setLoading(false)
                    }
                    return
                }
                const currentWeekStart = getCurrentWeekStart()
                const filteredReports = reports.filter((report) => new Date(report.week) < currentWeekStart)
                if (!filteredReports.length) {
                    if (mounted.current) {
                        setPlantMetrics([])
                        setLoading(false)
                    }
                    return
                }
                const [mixersData, tractorsData, trailersData, equipmentData, operatorsData] = await Promise.all([
                    MixerService.getAllMixers().catch(() => []),
                    TractorService.getAllTractors().catch(() => []),
                    TrailerService.fetchTrailers().catch(() => []),
                    EquipmentService.getAllEquipments().catch(() => []),
                    OperatorService.getAllOperators().catch(() => [])
                ])
                const fleetCountsByPlant = LeaderboardsUtility.calculateFleetCounts(
                    plantCodesInRegion,
                    mixersData,
                    tractorsData,
                    trailersData,
                    equipmentData,
                    operatorsData
                )
                const plantMetricsArray = Object.keys(userIdsByPlant)
                    .map((plantCode) => {
                        const plantReports = filteredReports.filter((r) =>
                            userIdsByPlant[plantCode].includes(r.user_id)
                        )
                        return buildPlantMetrics(
                            plantCode,
                            plantNames[plantCode] || plantCode,
                            plantReports,
                            fleetCountsByPlant,
                            hoursAdjustmentsByPlant,
                            safetyByPlant,
                            currentWeekStart
                        )
                    })
                    .filter(Boolean)
                if (mounted.current) {
                    setPlantMetrics(plantMetricsArray)
                }
            } catch (error) {
                console.error('Error fetching leaderboard data:', error)
                if (mounted.current) {
                    setPlantMetrics([])
                }
            } finally {
                if (mounted.current) setLoading(false)
            }
        },
        [selectedRegionCode, selectedYear]
    )
    useEffect(() => {
        const mounted = { current: true }
        fetchData(mounted)
        return () => {
            mounted.current = false
        }
    }, [fetchData])
    return { hoursAdjustmentsData, loading, plantMetrics }
}
