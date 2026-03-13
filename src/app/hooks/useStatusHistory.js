import { useCallback, useEffect, useRef, useState } from 'react'

import { supabase } from '../../services/DatabaseService'
import { PlantService } from '../../services/PlantService'
import DashboardUtility from '../../utils/DashboardUtility'
const HISTORY_TABLES = [
    { idField: 'mixer_id', key: 'mixers', table: 'mixers_history' },
    { idField: 'tractor_id', key: 'tractors', table: 'tractors_history' },
    { idField: 'trailer_id', key: 'trailers', table: 'trailers_history' },
    { idField: 'equipment_id', key: 'equipment', table: 'heavy_equipment_history' },
    { idField: 'truck_id', key: 'pickups', table: 'pickup_trucks_history' }
]
const EMPTY_HISTORY = { equipment: [], mixers: [], pickups: [], tractors: [], trailers: [] }
const buildStatusDistribution = (assetRefs, historyRecords, filterAssets, startFilter, endFilter) => ({
    equipment: DashboardUtility.calculateStatusDistribution(
        filterAssets(assetRefs.equipment),
        historyRecords.equipment,
        startFilter,
        endFilter
    ),
    mixers: DashboardUtility.calculateStatusDistribution(
        filterAssets(assetRefs.mixers),
        historyRecords.mixers,
        startFilter,
        endFilter
    ),
    pickups: DashboardUtility.calculateStatusDistribution(
        filterAssets(assetRefs.pickups),
        historyRecords.pickups,
        startFilter,
        endFilter
    ),
    tractors: DashboardUtility.calculateStatusDistribution(
        filterAssets(assetRefs.tractors),
        historyRecords.tractors,
        startFilter,
        endFilter
    ),
    trailers: DashboardUtility.calculateStatusDistribution(
        filterAssets(assetRefs.trailers),
        historyRecords.trailers,
        startFilter,
        endFilter
    )
})
/**
 * Tracks asset status change history across all fleet types (mixers, tractors, trailers,
 * equipment, pickups) and computes status distributions for a given date range.
 */
export function useStatusHistory({
    allEquipmentRef,
    allMixersRef,
    allPickupsRef,
    allTractorsRef,
    allTrailersRef,
    createFilterFn,
    dashboardRegionCode,
    dataReady,
    historyEndDate,
    historyStartDate,
    loading,
    refreshKey,
    setHistoryEndDate,
    setHistoryStartDate,
    setOldestHistoryDate,
    updatePlantSet
}) {
    const [statusHistoryData, setStatusHistoryData] = useState(EMPTY_HISTORY)
    const [historyLoaded, setHistoryLoaded] = useState(false)
    const historyRecordsRef = useRef(EMPTY_HISTORY)
    const getFilteredAssets = useCallback(() => {
        const region = PlantService.getRegionByCode(dashboardRegionCode)
        const plantSet = updatePlantSet(region?.type)
        const consider = createFilterFn(plantSet)
        const filterAssets = (assets) => assets.filter((a) => a.status !== 'Retired' && consider(a.plantCode))
        return { consider, filterAssets }
    }, [dashboardRegionCode, updatePlantSet, createFilterFn])
    const getAssetRefs = useCallback(
        () => ({
            equipment: allEquipmentRef.current,
            mixers: allMixersRef.current,
            pickups: allPickupsRef.current,
            tractors: allTractorsRef.current,
            trailers: allTrailersRef.current
        }),
        [allMixersRef, allTractorsRef, allTrailersRef, allEquipmentRef, allPickupsRef]
    )
    const fetchStatusHistory = useCallback(async () => {
        try {
            const results = await Promise.all(
                HISTORY_TABLES.map(({ table }) =>
                    supabase.from(table).select('*').eq('field_name', 'status').order('changed_at', { ascending: true })
                )
            )
            const historyData = {}
            HISTORY_TABLES.forEach(({ key }, i) => {
                historyData[key] = results[i].data || []
            })
            historyRecordsRef.current = historyData
            const { filterAssets } = getFilteredAssets()
            const assetRefs = getAssetRefs()
            const filteredAssetSets = Object.fromEntries(
                Object.entries(assetRefs).map(([key, assets]) => [key, filterAssets(assets)])
            )
            const filteredAssetIds = new Set(
                Object.values(filteredAssetSets).flatMap((assets) => assets.map((a) => a.id))
            )
            const filteredHistoryRecords = HISTORY_TABLES.flatMap(({ idField, key }) =>
                historyData[key].filter((h) => filteredAssetIds.has(h[idField]))
            )
            let oldestDate = new Date()
            if (filteredHistoryRecords.length > 0) {
                oldestDate = new Date(Math.min(...filteredHistoryRecords.map((h) => new Date(h.changed_at))))
            } else {
                const allFiltered = Object.values(filteredAssetSets).flat()
                const creationDates = allFiltered
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
            setStatusHistoryData(
                buildStatusDistribution(filteredAssetSets, historyData, (a) => a, startFilter, endFilter)
            )
            setHistoryLoaded(true)
        } catch (e) {
            console.error('Failed to fetch status history:', e)
        }
    }, [
        historyStartDate,
        historyEndDate,
        getFilteredAssets,
        getAssetRefs,
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
        const { filterAssets } = getFilteredAssets()
        const assetRefs = getAssetRefs()
        setStatusHistoryData(
            buildStatusDistribution(
                assetRefs,
                historyRecordsRef.current,
                filterAssets,
                validatedStartDate,
                validatedEndDate
            )
        )
    }, [historyStartDate, historyEndDate, getFilteredAssets, getAssetRefs, setHistoryStartDate, setHistoryEndDate])
    return { historyLoaded, historyRecordsRef, statusHistoryData }
}
