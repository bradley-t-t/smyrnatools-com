import { useCallback, useEffect, useRef, useState } from 'react'

import { supabase } from '../../services/DatabaseService'
import { EquipmentService } from '../../services/EquipmentService'
import { MixerService } from '../../services/MixerService'
import { OperatorService } from '../../services/OperatorService'
import { PickupTruckService } from '../../services/PickupTruckService'
import { TractorService } from '../../services/TractorService'
import TrailerService from '../../services/TrailerService'
import DashboardUtility from '../../utils/DashboardUtility'
import GrammarUtility from '../../utils/GrammarUtility'
import { DASHBOARD_CACHE_KEY, DASHBOARD_CACHE_TTL_MS } from '../constants/dashboardConstants'

/**
 * Fetches and caches all fleet assets (mixers, tractors, trailers, equipment, operators, pickups)
 * for the dashboard, using localStorage cache with TTL to reduce API calls.
 * Subscribes to Supabase realtime for live updates.
 */
export function useDashboardAssets({
    allEquipmentRef,
    allMixersRef,
    allOperatorsRef,
    allPickupsRef,
    allTractorsRef,
    allTrailersRef,
    computeStats,
    refreshKey
}) {
    const [loading, setLoading] = useState(true)
    const [dataReady, setDataReady] = useState(false)
    const [error, setError] = useState('')
    const [lastUpdated, setLastUpdated] = useState(null)
    const [trainingOperators, setTrainingOperators] = useState([])
    const [pendingStartOperators, setPendingStartOperators] = useState([])
    const [lightDutyOperators, setLightDutyOperators] = useState([])
    const [refreshing, setRefreshing] = useState(false)

    const allOperatorsFullRef = useRef([])
    const initialLoadRef = useRef(true)

    useEffect(() => {
        let cancelled = false

        async function fetchAssets() {
            setError('')
            const now = Date.now()

            if (initialLoadRef.current) {
                try {
                    const raw = sessionStorage.getItem(DASHBOARD_CACHE_KEY)
                    if (raw) {
                        const parsed = JSON.parse(raw)
                        if (parsed && now - (parsed.savedAt || 0) < DASHBOARD_CACHE_TTL_MS) {
                            allMixersRef.current = (parsed.mixers || []).map(DashboardUtility.slimMixer)
                            allTractorsRef.current = (parsed.tractors || []).map(DashboardUtility.slimTractor)
                            allTrailersRef.current = (parsed.trailers || []).map(DashboardUtility.slimTrailer)
                            allEquipmentRef.current = (parsed.equipment || []).map(DashboardUtility.slimEquipment)
                            allPickupsRef.current = (parsed.pickups || []).map(DashboardUtility.slimPickup)
                            allOperatorsRef.current = (parsed.operators || []).map(DashboardUtility.slimOperator)
                            computeStats()
                            setLastUpdated(
                                parsed.lastUpdated ? new Date(parsed.lastUpdated) : new Date(parsed.savedAt || now)
                            )
                            setDataReady(true)
                            setLoading(false)
                        }
                    }
                } catch {}
            }

            setRefreshing(true)
            try {
                const [mix, trac, trail, equip, pick, ops] = await Promise.all([
                    MixerService.getAllMixers().catch(() => []),
                    TractorService.getAllTractors().catch(() => []),
                    TrailerService.fetchTrailers().catch(() => []),
                    EquipmentService.getAllEquipments().catch(() => []),
                    PickupTruckService.getAll().catch(() => []),
                    OperatorService.getAllOperators().catch(() => [])
                ])

                if (cancelled) return

                allMixersRef.current = mix.map(DashboardUtility.slimMixer)
                allTractorsRef.current = trac.map(DashboardUtility.slimTractor)
                allTrailersRef.current = trail.map(DashboardUtility.slimTrailer)
                allEquipmentRef.current = equip.map(DashboardUtility.slimEquipment)
                allPickupsRef.current = pick.map(DashboardUtility.slimPickup)
                allOperatorsFullRef.current = ops
                allOperatorsRef.current = ops.map(DashboardUtility.slimOperator)

                const operatorsById = new Map(ops.map((o) => [o.employeeId, o]))

                const training = ops
                    .filter((o) => o.status === 'Training')
                    .map((o) => {
                        const trainer = o.assignedTrainer ? operatorsById.get(o.assignedTrainer) : null
                        return {
                            id: o.employeeId,
                            operatorName: o.name || '',
                            operatorPlant: o.plantCode || '',
                            operatorPosition: o.position || '',
                            trainerName: trainer?.name || '',
                            trainerPlant: trainer?.plantCode || ''
                        }
                    })
                setTrainingOperators(training)

                const pending = ops
                    .filter((o) => o.status === 'Pending Start')
                    .map((o) => {
                        const trainer = o.assignedTrainer ? operatorsById.get(o.assignedTrainer) : null
                        return {
                            id: o.employeeId,
                            operatorName: o.name || '',
                            operatorPlant: o.plantCode || '',
                            pendingDate: o.pendingStartDate || '',
                            trainerPlant: trainer?.plantCode || ''
                        }
                    })
                setPendingStartOperators(pending)

                const lightDuty = ops
                    .filter((o) => o.status === 'Light Duty')
                    .map((o) => ({
                        id: o.employeeId,
                        operatorName: o.name || '',
                        plant: o.plantCode || ''
                    }))
                setLightDutyOperators(lightDuty)

                computeStats()
                const fetchedAt = new Date()
                setLastUpdated(fetchedAt)

                try {
                    sessionStorage.setItem(
                        DASHBOARD_CACHE_KEY,
                        JSON.stringify({
                            equipment: allEquipmentRef.current,
                            lastUpdated: fetchedAt.toISOString(),
                            mixers: allMixersRef.current,
                            operators: allOperatorsRef.current,
                            pickups: allPickupsRef.current,
                            savedAt: Date.now(),
                            tractors: allTractorsRef.current,
                            trailers: allTrailersRef.current
                        })
                    )
                } catch {}
            } catch {
                if (!cancelled) setError('Failed to load dashboard data')
            } finally {
                if (!cancelled) {
                    setLoading(false)
                    setRefreshing(false)
                    setTimeout(() => setDataReady(true), 300)
                }
            }
        }

        fetchAssets()
        return () => {
            cancelled = true
        }
    }, [refreshKey, computeStats])

    return {
        allOperatorsFullRef,
        dataReady,
        error,
        lastUpdated,
        lightDutyOperators,
        loading,
        pendingStartOperators,
        refreshing,
        setRefreshing,
        trainingOperators
    }
}

export function useIssueCommentCounts({
    allEquipmentRef,
    allMixersRef,
    allTractorsRef,
    allTrailersRef,
    computeStats,
    countsRef: externalCountsRef
}) {
    const internalCountsRef = useRef({ equipment: {}, mixers: {}, tractors: {}, trailers: {} })
    const countsRef = externalCountsRef || internalCountsRef
    const [assetIssueDetails, setAssetIssueDetails] = useState([])

    const fetchIssueCommentCounts = useCallback(async () => {
        try {
            const mixerIds = allMixersRef.current.map((m) => m.id).filter(Boolean)
            const tractorIds = allTractorsRef.current.map((t) => t.id).filter(Boolean)
            const trailerIds = allTrailersRef.current.map((t) => t.id).filter(Boolean)
            const equipmentIds = allEquipmentRef.current.map((e) => e.id).filter(Boolean)

            if (!mixerIds.length && !tractorIds.length && !trailerIds.length && !equipmentIds.length) return

            const [mMaint, mCom, tMaint, tCom, trMaint, trCom, eMaint, eCom] = await Promise.all([
                mixerIds.length
                    ? supabase.from('mixers_maintenance').select('*').in('mixer_id', mixerIds)
                    : Promise.resolve({ data: [] }),
                mixerIds.length
                    ? supabase.from('mixers_comments').select('id,mixer_id').in('mixer_id', mixerIds)
                    : Promise.resolve({ data: [] }),
                tractorIds.length
                    ? supabase.from('tractors_maintenance').select('*').in('tractor_id', tractorIds)
                    : Promise.resolve({ data: [] }),
                tractorIds.length
                    ? supabase.from('tractors_comments').select('id,tractor_id').in('tractor_id', tractorIds)
                    : Promise.resolve({ data: [] }),
                trailerIds.length
                    ? supabase.from('trailers_maintenance').select('*').in('trailer_id', trailerIds)
                    : Promise.resolve({ data: [] }),
                trailerIds.length
                    ? supabase.from('trailers_comments').select('id,trailer_id').in('trailer_id', trailerIds)
                    : Promise.resolve({ data: [] }),
                equipmentIds.length
                    ? supabase.from('heavy_equipment_maintenance').select('*').in('equipment_id', equipmentIds)
                    : Promise.resolve({ data: [] }),
                equipmentIds.length
                    ? supabase
                          .from('heavy_equipment_comments')
                          .select('id,equipment_id')
                          .in('equipment_id', equipmentIds)
                    : Promise.resolve({ data: [] })
            ])

            const counts = { equipment: {}, mixers: {}, tractors: {}, trailers: {} }
            const issueDetails = []

            const mixersMap = new Map(allMixersRef.current.map((a) => [a.id, a]))
            const tractorsMap = new Map(allTractorsRef.current.map((a) => [a.id, a]))
            const trailersMap = new Map(allTrailersRef.current.map((a) => [a.id, a]))
            const equipmentMap = new Map(allEquipmentRef.current.map((a) => [a.id, a]))

            const processMaintenanceRecords = (records, assetMap, assetType, idField, identifierField) => {
                const recordsList = records || []
                recordsList.forEach((record) => {
                    const isResolved = !!record.time_completed
                    const assetId = record[idField]

                    if (!isResolved) {
                        counts[assetType][assetId] = counts[assetType][assetId] || { comments: 0, issues: 0 }
                        counts[assetType][assetId].issues++
                    }

                    const asset = assetMap.get(assetId)
                    const identifier = asset?.[identifierField] || ''
                    const raw = record.description || record.issue || record.details || record.notes || ''
                    const desc = GrammarUtility.cleanDescription(raw || 'Issue')

                    issueDetails.push({
                        assetId,
                        description: desc || 'Issue',
                        identifier,
                        plant: asset?.plantCode || '',
                        resolved: isResolved,
                        type: assetType.charAt(0).toUpperCase() + assetType.slice(1, -1)
                    })
                })
            }

            const processCommentRecords = (records, assetType, idField) => {
                const recordsList = records || []
                recordsList.forEach((record) => {
                    const assetId = record[idField]
                    counts[assetType][assetId] = counts[assetType][assetId] || { comments: 0, issues: 0 }
                    counts[assetType][assetId].comments++
                })
            }

            processMaintenanceRecords(mMaint.data, mixersMap, 'mixers', 'mixer_id', 'truckNumber')
            processCommentRecords(mCom.data, 'mixers', 'mixer_id')

            processMaintenanceRecords(tMaint.data, tractorsMap, 'tractors', 'tractor_id', 'truckNumber')
            processCommentRecords(tCom.data, 'tractors', 'tractor_id')

            processMaintenanceRecords(trMaint.data, trailersMap, 'trailers', 'trailer_id', 'identifyingNumber')
            processCommentRecords(trCom.data, 'trailers', 'trailer_id')

            processMaintenanceRecords(eMaint.data, equipmentMap, 'equipment', 'equipment_id', 'identifyingNumber')
            processCommentRecords(eCom.data, 'equipment', 'equipment_id')

            countsRef.current = counts
            setAssetIssueDetails(issueDetails)
            computeStats()
        } catch {}
    }, [allMixersRef, allTractorsRef, allTrailersRef, allEquipmentRef, computeStats])

    return { assetIssueDetails, countsRef, fetchIssueCommentCounts }
}

export function usePlantFilter(dashboardRegionCode, dashboardPlant, regionPlants, allPlants) {
    const plantSetRef = useRef(new Set())

    const updatePlantSet = useCallback(
        (regionType) => {
            const isOffice = regionType === 'Office'
            const plantSet = new Set()

            if (isOffice) {
                allPlants.forEach((p) => {
                    const code = p.plantCode || p.plant_code
                    if (code) plantSet.add(String(code).trim())
                })
            } else if (dashboardPlant) {
                plantSet.add(String(dashboardPlant).trim())
            } else {
                const plants = regionPlants || []
                plants.forEach((p) => {
                    const code = p.plantCode || p.plant_code
                    if (code) plantSet.add(String(code).trim())
                })
            }

            plantSetRef.current = plantSet
            return plantSet
        },
        [dashboardPlant, regionPlants, allPlants]
    )

    const createFilterFn = useCallback((plantSet) => {
        const filterActive = plantSet.size > 0
        return (plantCode) => !filterActive || plantSet.has(String(plantCode || '').trim())
    }, [])

    return { createFilterFn, plantSetRef, updatePlantSet }
}
