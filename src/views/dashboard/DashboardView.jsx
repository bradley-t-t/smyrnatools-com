import React, {useCallback, useEffect, useRef, useState, useTransition} from 'react'
import {RegionService} from '../../services/RegionService'
import {MixerService} from '../../services/MixerService'
import {TractorService} from '../../services/TractorService'
import TrailerService from '../../services/TrailerService'
import {EquipmentService} from '../../services/EquipmentService'
import {PickupTruckService} from '../../services/PickupTruckService'
import {OperatorService} from '../../services/OperatorService'
import {ReportService} from '../../services/ReportService'
import {supabase} from '../../services/DatabaseService'
import VerifiedUtility from '../../utils/VerifiedUtility'
import {UserService} from '../../services/UserService'
import GrammarUtility from '../../utils/GrammarUtility'
import {usePreferences} from '../../app/context/PreferencesContext'
import PlantDropdownModal from '../../components/common/PlantDropdownModal'

export default function DashboardView() {
    const {preferences} = usePreferences()
    const [loading, setLoading] = useState(true)
    const [dataReady, setDataReady] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState('')
    const [permittedRegions, setPermittedRegions] = useState([])
    const [hasAllRegionsPermission, setHasAllRegionsPermission] = useState(false)
    const [regionPlants, setRegionPlants] = useState([])
    const [allPlantsCount, setAllPlantsCount] = useState(0)
    const [allPlants, setAllPlants] = useState([])
    const [totalRegionsExcludingOffice, setTotalRegionsExcludingOffice] = useState(0)
    const [totalPlantsExcludingAggregate, setTotalPlantsExcludingAggregate] = useState(0)
    const [totalAggregateLocations, setTotalAggregateLocations] = useState(0)
    const [dashboardRegionCode, setDashboardRegionCode] = useState('')
    const [dashboardRegionName, setDashboardRegionName] = useState('')
    const [dashboardPlant, setDashboardPlant] = useState('')
    const [lastUpdated, setLastUpdated] = useState(null)
    const [refreshKey, setRefreshKey] = useState(0)
    const [plantModalOpen, setPlantModalOpen] = useState(false)
    const [stats, setStats] = useState({
        mixers: {
            total: 0,
            active: 0,
            spare: 0,
            shop: 0,
            verified: 0,
            verifiedPercent: 0,
            issues: 0,
            comments: 0,
            overdue: 0,
            allocationPercent: 0
        },
        tractors: {
            total: 0,
            active: 0,
            spare: 0,
            shop: 0,
            verified: 0,
            verifiedPercent: 0,
            issues: 0,
            comments: 0,
            overdue: 0,
            allocationPercent: 0
        },
        trailers: {total: 0, active: 0, spare: 0, shop: 0, issues: 0, comments: 0, overdue: 0, allocationPercent: 0},
        equipment: {total: 0, active: 0, spare: 0, shop: 0, issues: 0, comments: 0, overdue: 0, allocationPercent: 0},
        pickups: {total: 0, active: 0, shop: 0, stationary: 0, spare: 0, sold: 0, retired: 0, allocationPercent: 0},
        operators: {
            total: 0,
            active: 0,
            lightDuty: 0,
            assigned: 0,
            mixerAssigned: 0,
            tractorAssigned: 0,
            unassigned: 0,
            pending: 0
        },
        fleetTotal: 0,
        openIssuesTotal: 0,
        overdueTotal: 0,
        verificationAverage: 0,
        overallAllocationPercent: 0
    })
    const [trainingOperators, setTrainingOperators] = useState([])
    const [trainingCollapsed, setTrainingCollapsed] = useState(true)
    const [pendingStartOperators, setPendingStartOperators] = useState([])
    const [pendingCollapsed, setPendingCollapsed] = useState(true)
    const [lightDutyOperators, setLightDutyOperators] = useState([])
    const [lightDutyCollapsed, setLightDutyCollapsed] = useState(true)
    const [assetIssueDetails, setAssetIssueDetails] = useState([])
    const [statusHistoryData, setStatusHistoryData] = useState({
        mixers: [],
        tractors: [],
        trailers: [],
        equipment: [],
        pickups: []
    })
    const [historyStartDate, setHistoryStartDate] = useState('')
    const [historyEndDate, setHistoryEndDate] = useState('')
    const [oldestHistoryDate, setOldestHistoryDate] = useState('')

    const allMixersRef = useRef([])
    const allTractorsRef = useRef([])
    const allTrailersRef = useRef([])
    const allEquipmentRef = useRef([])
    const allPickupsRef = useRef([])
    const allOperatorsRef = useRef([])
    const allOperatorsFullRef = useRef([])
    const prevSnapshotRef = useRef(null)
    const initialLoadRef = useRef(true)
    const [isFiltering, startTransition] = useTransition()
    const filterTimeoutRef = useRef(null)
    const plantSetRef = useRef(new Set())
    const countsRef = useRef({mixers: {}, tractors: {}, trailers: {}, equipment: {}})
    const historyRecordsRef = useRef({
        mixers: [],
        tractors: [],
        trailers: [],
        equipment: [],
        pickups: []
    })

    const slimMixer = useCallback(m => ({
        id: m.id,
        status: m.status,
        assignedOperator: m.assignedOperator,
        lastServiceDate: m.lastServiceDate,
        updatedLast: m.updatedLast,
        updatedAt: m.updatedAt,
        updatedBy: m.updatedBy,
        plantCode: m.assignedPlant || m.plantCode,
        truckNumber: m.truckNumber || m.truck_number || '',
        vin: m.vin || ''
    }), [])
    const slimTractor = useCallback(t => ({
        id: t.id,
        status: t.status,
        assignedOperator: t.assignedOperator,
        lastServiceDate: t.lastServiceDate,
        updatedLast: t.updatedLast,
        updatedAt: t.updatedAt,
        updatedBy: t.updatedBy,
        plantCode: t.assignedPlant || t.plantCode,
        truckNumber: t.truckNumber || t.truck_number || '',
        vin: t.vin || ''
    }), [])
    const slimTrailer = useCallback(t => ({
        id: t.id,
        status: t.status,
        lastServiceDate: t.lastServiceDate,
        plantCode: t.assignedPlant || t.plantCode,
        identifyingNumber: t.trailerNumber || t.trailer_number || t.truck_number || t.asset_number || ''
    }), [])
    const slimEquipment = useCallback(e => ({
        id: e.id,
        status: e.status,
        lastServiceDate: e.lastServiceDate,
        plantCode: e.assignedPlant || e.plantCode,
        identifyingNumber: e.identifyingNumber || e.identifying_number || e.asset_number || e.truck_number || ''
    }), [])
    const slimPickup = useCallback(p => ({id: p.id, status: p.status, plantCode: p.assignedPlant || p.plantCode}), [])
    const slimOperator = useCallback(o => ({id: o.id, employeeId: o.employeeId, status: o.status, plantCode: o.plantCode}), [])

    const isServiceOverdue = date => {
        if (!date) return false
        const diff = Math.ceil((Date.now() - new Date(date).getTime()) / 86400000)
        return diff > 90
    }

    const calculateStatusDistribution = useCallback((assets, historyRecords, filterStartDate = null, filterEndDate = null) => {
        const statusDaysMap = {}
        let totalDays = 0

        const normalizeDate = (dateStr, endOfDay = false) => {
            if (!dateStr) return null
            const parts = dateStr.split('-')
            if (endOfDay) {
                return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 23, 59, 59, 999))
            }
            return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0))
        }

        const rangeStart = filterStartDate ? normalizeDate(filterStartDate, false) : null
        const rangeEnd = filterEndDate ? normalizeDate(filterEndDate, true) : new Date()

        if (rangeEnd) {
            let earliestDataDate = null

            if (historyRecords.length > 0) {
                earliestDataDate = historyRecords
                    .filter(h => h.changed_at)
                    .map(h => new Date(h.changed_at))
                    .sort((a, b) => a - b)[0]
            }

            const earliestAssetCreationDate = assets
                .map(a => a.createdAt || a.created_at)
                .filter(d => d)
                .map(d => new Date(d))
                .sort((a, b) => a - b)[0]

            if (earliestAssetCreationDate) {
                if (!earliestDataDate || earliestAssetCreationDate < earliestDataDate) {
                    earliestDataDate = earliestAssetCreationDate
                }
            }

            if (earliestDataDate && rangeEnd < earliestDataDate) {
                return []
            }
        }

        assets.forEach(asset => {
            let assetHistory = historyRecords.filter(h =>
                h.mixer_id === asset.id ||
                h.tractor_id === asset.id ||
                h.trailer_id === asset.id ||
                h.equipment_id === asset.id ||
                h.truck_id === asset.id
            ).filter(h => h.field_name === 'status').sort((a, b) =>
                new Date(a.changed_at) - new Date(b.changed_at)
            )

            const currentStatus = asset.status || 'Unknown'
            const createdAt = asset.createdAt || asset.created_at
            const assetCreationDate = createdAt ? new Date(createdAt) : null

            if (assetCreationDate && rangeEnd && assetCreationDate > rangeEnd) {
                return
            }

            const earliestAssetHistory = assetHistory.length > 0
                ? new Date(assetHistory[0].changed_at)
                : null

            if (earliestAssetHistory && rangeEnd && earliestAssetHistory > rangeEnd) {
                return
            }

            if (!earliestAssetHistory && rangeEnd && rangeEnd < new Date()) {
                return
            }

            let effectiveStart = rangeStart
                ? (assetCreationDate && assetCreationDate > rangeStart ? assetCreationDate : rangeStart)
                : (assetCreationDate || new Date())

            if (earliestAssetHistory && assetHistory.length > 0 && effectiveStart < earliestAssetHistory) {
                effectiveStart = earliestAssetHistory
            }

            const effectiveEnd = rangeEnd

            if (effectiveStart > effectiveEnd) {
                return
            }

            let startingStatus = currentStatus
            let endingStatus = currentStatus

            if (assetHistory.length > 0) {
                if (rangeStart) {
                    const recordsBeforeOrAtStart = assetHistory.filter(h => new Date(h.changed_at) <= rangeStart)
                    if (recordsBeforeOrAtStart.length > 0) {
                        const lastRecordBeforeStart = recordsBeforeOrAtStart[recordsBeforeOrAtStart.length - 1]
                        startingStatus = lastRecordBeforeStart.new_value || currentStatus
                    } else if (assetHistory.length > 0) {
                        startingStatus = assetHistory[0].old_value || currentStatus
                    }
                }

                if (rangeEnd) {
                    const recordsBeforeOrAtEnd = assetHistory.filter(h => new Date(h.changed_at) <= rangeEnd)
                    if (recordsBeforeOrAtEnd.length > 0) {
                        const lastRecordBeforeEnd = recordsBeforeOrAtEnd[recordsBeforeOrAtEnd.length - 1]
                        endingStatus = lastRecordBeforeEnd.new_value || currentStatus
                    } else if (assetHistory.length > 0) {
                        endingStatus = assetHistory[0].old_value || currentStatus
                    }
                }
            }

            const recordsInRange = rangeStart && rangeEnd
                ? assetHistory.filter(h => {
                    const changedAt = new Date(h.changed_at)
                    return changedAt > rangeStart && changedAt <= rangeEnd
                })
                : assetHistory

            if (recordsInRange.length === 0) {
                const days = Math.max(1, Math.round((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24)))
                statusDaysMap[startingStatus] = (statusDaysMap[startingStatus] || 0) + days
                totalDays += days
            } else {
                let previousStatus = startingStatus
                let previousDate = effectiveStart

                recordsInRange.forEach(historyEntry => {
                    const changeDate = new Date(historyEntry.changed_at)
                    const daysDiff = Math.round((changeDate - previousDate) / (1000 * 60 * 60 * 24))

                    if (daysDiff > 0) {
                        statusDaysMap[previousStatus] = (statusDaysMap[previousStatus] || 0) + daysDiff
                        totalDays += daysDiff
                    }

                    previousStatus = historyEntry.new_value || endingStatus
                    previousDate = changeDate
                })

                const finalDays = Math.round((effectiveEnd - previousDate) / (1000 * 60 * 60 * 24))
                if (finalDays > 0) {
                    statusDaysMap[previousStatus] = (statusDaysMap[previousStatus] || 0) + finalDays
                    totalDays += finalDays
                }
            }
        })

        if (totalDays === 0) totalDays = 1

        const entries = Object.entries(statusDaysMap)
            .filter(([status]) => status !== 'Retired')
            .map(([status, days]) => ({
                status,
                days,
                percentage: ((days / totalDays) * 100).toFixed(1)
            }))
            .sort((a, b) => b.days - a.days)

        if (entries.length > 0) {
            const sum = entries.reduce((acc, item) => acc + parseFloat(item.percentage), 0)
            if (sum < 100) {
                const diff = (100 - sum).toFixed(1)
                entries[entries.length - 1].percentage = (parseFloat(entries[entries.length - 1].percentage) + parseFloat(diff)).toFixed(1)
            }
        }

        return entries
    }, [])

    const computeStats = useCallback(() => {
        const region = RegionService.getRegionByCode(dashboardRegionCode)
        const isOffice = region?.type === 'Office'
        const isAggregate = region?.type === 'Aggregate'
        const plantSet = new Set()
        if (isOffice) {
            allPlants.forEach(p => {
                const c = p.plantCode || p.plant_code
                if (c) plantSet.add(String(c).trim())
            })
        } else {
            if (dashboardPlant) plantSet.add(String(dashboardPlant).trim())
            else (regionPlants || []).forEach(p => {
                const c = p.plantCode || p.plant_code
                if (c) plantSet.add(String(c).trim())
            })
        }
        plantSetRef.current = plantSet
        const filterActive = plantSet.size > 0
        let mixersTotals = {total: 0, active: 0, spare: 0, shop: 0, verified: 0, issues: 0, comments: 0, overdue: 0}
        let tractorsTotals = {total: 0, active: 0, spare: 0, shop: 0, verified: 0, issues: 0, comments: 0, overdue: 0}
        let trailersTotals = {total: 0, active: 0, spare: 0, shop: 0, issues: 0, comments: 0, overdue: 0}
        let equipmentTotals = {total: 0, active: 0, spare: 0, shop: 0, issues: 0, comments: 0, overdue: 0}
        let pickupsTotals = {total: 0, active: 0, shop: 0, stationary: 0, spare: 0, sold: 0, retired: 0}
        let operatorsTotals = {
            total: 0,
            active: 0,
            lightDuty: 0,
            assigned: 0,
            mixerAssigned: 0,
            tractorAssigned: 0,
            unassigned: 0,
            pending: 0
        }
        const mixerAssignedIds = new Set()
        const tractorAssignedIds = new Set()
        const consider = plantCode => !filterActive || plantSet.has(String(plantCode || '').trim())
        const counts = countsRef.current
        let mixersAvailable = 0, tractorsAvailable = 0, trailersAvailable = 0, equipmentAvailable = 0, pickupsAvailable = 0
        if (!isAggregate) {
            for (const m of allMixersRef.current) {
                if (!consider(m.plantCode)) continue
                if (m.status !== 'Retired') {
                    mixersTotals.total++
                    mixersAvailable++
                }
                if (m.status === 'Active') mixersTotals.active++
                else if (m.status === 'Spare') mixersTotals.spare++
                else if (m.status === 'In Shop') mixersTotals.shop++
                if (isServiceOverdue(m.lastServiceDate)) mixersTotals.overdue++
                if (m.status !== 'Retired' && VerifiedUtility.isVerified(m.updatedLast, m.updatedAt, m.updatedBy)) mixersTotals.verified++
                if (m.assignedOperator) mixerAssignedIds.add(m.assignedOperator)
                const mc = counts.mixers[m.id]
                if (mc) {
                    mixersTotals.issues += mc.issues || 0
                    mixersTotals.comments += mc.comments || 0
                }
            }
        }
        for (const t of allTractorsRef.current) {
            if (!consider(t.plantCode)) continue
            if (t.status !== 'Retired') {
                tractorsTotals.total++
                tractorsAvailable++
            }
            if (t.status === 'Active') tractorsTotals.active++
            else if (t.status === 'Spare') tractorsTotals.spare++
            else if (t.status === 'In Shop') tractorsTotals.shop++
            if (isServiceOverdue(t.lastServiceDate)) tractorsTotals.overdue++
            if (t.status !== 'Retired' && VerifiedUtility.isVerified(t.updatedLast, t.updatedAt, t.updatedBy)) tractorsTotals.verified++
            if (t.assignedOperator) tractorAssignedIds.add(t.assignedOperator)
            const tc = counts.tractors[t.id]
            if (tc) {
                tractorsTotals.issues += tc.issues || 0
                tractorsTotals.comments += tc.comments || 0
            }
        }
        for (const r of allTrailersRef.current) {
            if (!consider(r.plantCode)) continue
            if (r.status !== 'Retired') {
                trailersTotals.total++
                trailersAvailable++
            }
            if (r.status === 'Active') trailersTotals.active++
            else if (r.status === 'Spare') trailersTotals.spare++
            else if (r.status === 'In Shop') trailersTotals.shop++
            if (isServiceOverdue(r.lastServiceDate)) trailersTotals.overdue++
            const rc = counts.trailers[r.id]
            if (rc) {
                trailersTotals.issues += rc.issues || 0
                trailersTotals.comments += rc.comments || 0
            }
        }
        for (const e of allEquipmentRef.current) {
            if (!consider(e.plantCode)) continue
            if (e.status !== 'Retired') {
                equipmentTotals.total++
                equipmentAvailable++
            }
            if (e.status === 'Active') equipmentTotals.active++
            else if (e.status === 'Spare') equipmentTotals.spare++
            else if (e.status === 'In Shop') equipmentTotals.shop++
            if (isServiceOverdue(e.lastServiceDate)) equipmentTotals.overdue++
            const ec = counts.equipment[e.id]
            if (ec) {
                equipmentTotals.issues += ec.issues || 0
                equipmentTotals.comments += ec.comments || 0
            }
        }
        for (const p of allPickupsRef.current) {
            if (!consider(p.plantCode)) continue
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
        }
        for (const o of allOperatorsRef.current) {
            if (!consider(o.plantCode)) continue
            operatorsTotals.total++
            if (o.status === 'Active') {
                operatorsTotals.active++
                if (mixerAssignedIds.has(o.employeeId)) {
                    operatorsTotals.assigned++
                    operatorsTotals.mixerAssigned++
                } else if (tractorAssignedIds.has(o.employeeId)) {
                    operatorsTotals.assigned++
                    operatorsTotals.tractorAssigned++
                } else operatorsTotals.unassigned++
            } else if (o.status === 'Pending Start') operatorsTotals.pending++
            else if (o.status === 'Light Duty') operatorsTotals.lightDuty++
        }
        const mixersVerifiedPercent = mixersAvailable ? Math.round((mixersTotals.verified / mixersAvailable) * 100) : 0
        const tractorsVerifiedPercent = tractorsAvailable ? Math.round((tractorsTotals.verified / tractorsAvailable) * 100) : 0
        const verifiedValues = []
        if (!isAggregate && mixersTotals.total) verifiedValues.push(mixersVerifiedPercent)
        if (tractorsTotals.total) verifiedValues.push(tractorsVerifiedPercent)
        const verificationAvg = verifiedValues.length ? Math.round(verifiedValues.reduce((a, b) => a + b, 0) / verifiedValues.length) : 0
        let openIssuesTotal = 0
        if (!isAggregate) openIssuesTotal += mixersTotals.issues
        openIssuesTotal += tractorsTotals.issues + trailersTotals.issues + equipmentTotals.issues
        let overdueTotal = 0
        if (!isAggregate) overdueTotal += mixersTotals.overdue
        overdueTotal += tractorsTotals.overdue + trailersTotals.overdue + equipmentTotals.overdue
        let fleetTotal = 0
        if (!isAggregate) fleetTotal += mixersTotals.total
        fleetTotal += tractorsTotals.total + trailersTotals.total + equipmentTotals.total + pickupsTotals.total
        const mixersAllocationPercent = mixersAvailable ? Math.round((mixersTotals.active / mixersAvailable) * 100) : 0
        const tractorsAllocationPercent = tractorsAvailable ? Math.round((tractorsTotals.active / tractorsAvailable) * 100) : 0
        const trailersAllocationPercent = trailersAvailable ? Math.round((trailersTotals.active / trailersAvailable) * 100) : 0
        const equipmentAllocationPercent = equipmentAvailable ? Math.round((equipmentTotals.active / equipmentAvailable) * 100) : 0
        const pickupsAllocationPercent = pickupsAvailable ? Math.round(((pickupsTotals.active + pickupsTotals.stationary) / pickupsAvailable) * 100) : 0
        let overallAvailable = 0
        if (!isAggregate) overallAvailable += mixersAvailable
        overallAvailable += tractorsAvailable + trailersAvailable + equipmentAvailable + pickupsAvailable
        let overallActiveNumerator = 0
        if (!isAggregate) overallActiveNumerator += mixersTotals.active
        overallActiveNumerator += tractorsTotals.active + trailersTotals.active + equipmentTotals.active + pickupsTotals.active + pickupsTotals.stationary
        const overallAllocationPercent = overallAvailable ? Math.round((overallActiveNumerator / overallAvailable) * 100) : 0
        setStats({
            mixers: {
                ...mixersTotals,
                verifiedPercent: mixersVerifiedPercent,
                allocationPercent: mixersAllocationPercent
            },
            tractors: {
                ...tractorsTotals,
                verifiedPercent: tractorsVerifiedPercent,
                allocationPercent: tractorsAllocationPercent
            },
            trailers: {...trailersTotals, allocationPercent: trailersAllocationPercent},
            equipment: {...equipmentTotals, allocationPercent: equipmentAllocationPercent},
            pickups: {...pickupsTotals, allocationPercent: pickupsAllocationPercent},
            operators: operatorsTotals,
            fleetTotal,
            openIssuesTotal,
            overdueTotal,
            verificationAverage: verificationAvg,
            overallAllocationPercent
        })
        prevSnapshotRef.current = {fleet: fleetTotal}
    }, [dashboardPlant, regionPlants, allPlants, dashboardRegionCode])

    const applyFilters = useCallback(() => {
        if (loading) {
            computeStats()
            return
        }
        if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current)
        filterTimeoutRef.current = setTimeout(() => startTransition(() => computeStats()), 30)
    }, [computeStats, loading])

    useEffect(() => () => {
        if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current)
    }, [])

    const fetchIssueCommentCounts = useCallback(async () => {
        try {
            const mixerIds = allMixersRef.current.map(m => m.id).filter(Boolean)
            const tractorIds = allTractorsRef.current.map(t => t.id).filter(Boolean)
            const trailerIds = allTrailersRef.current.map(t => t.id).filter(Boolean)
            const equipmentIds = allEquipmentRef.current.map(e => e.id).filter(Boolean)
            if (!mixerIds.length && !tractorIds.length && !trailerIds.length && !equipmentIds.length) return
            const [mMaint, mCom, tMaint, tCom, trMaint, trCom, eMaint, eCom] = await Promise.all([
                mixerIds.length ? supabase.from('mixers_maintenance').select('*').in('mixer_id', mixerIds).is('time_completed', null) : Promise.resolve({data: []}),
                mixerIds.length ? supabase.from('mixers_comments').select('id,mixer_id').in('mixer_id', mixerIds) : Promise.resolve({data: []}),
                tractorIds.length ? supabase.from('tractors_maintenance').select('*').in('tractor_id', tractorIds).is('time_completed', null) : Promise.resolve({data: []}),
                tractorIds.length ? supabase.from('tractors_comments').select('id,tractor_id').in('tractor_id', tractorIds) : Promise.resolve({data: []}),
                trailerIds.length ? supabase.from('trailers_maintenance').select('*').in('trailer_id', trailerIds).is('time_completed', null) : Promise.resolve({data: []}),
                trailerIds.length ? supabase.from('trailers_comments').select('id,trailer_id').in('trailer_id', trailerIds) : Promise.resolve({data: []}),
                equipmentIds.length ? supabase.from('heavy_equipment_maintenance').select('*').in('equipment_id', equipmentIds).is('time_completed', null) : Promise.resolve({data: []}),
                equipmentIds.length ? supabase.from('heavy_equipment_comments').select('id,equipment_id').in('equipment_id', equipmentIds) : Promise.resolve({data: []})
            ])
            const counts = {mixers: {}, tractors: {}, trailers: {}, equipment: {}}
            const issueDetails = []
            const mixersMap = new Map(allMixersRef.current.map(a => [a.id, a]))
            const tractorsMap = new Map(allTractorsRef.current.map(a => [a.id, a]))
            const trailersMap = new Map(allTrailersRef.current.map(a => [a.id, a]))
            const equipmentMap = new Map(allEquipmentRef.current.map(a => [a.id, a]))
            ;(mMaint.data || []).forEach(r => {
                counts.mixers[r.mixer_id] = counts.mixers[r.mixer_id] || {issues: 0, comments: 0}
                counts.mixers[r.mixer_id].issues++
                const a = mixersMap.get(r.mixer_id)
                const ident = a?.truckNumber || a?.vin || ''
                const raw = r.description || r.issue || r.details || r.notes || r.note || r.text || r.comment || ''
                const desc = GrammarUtility.cleanDescription(raw || 'Issue')
                issueDetails.push({
                    type: 'Mixer',
                    assetId: r.mixer_id,
                    identifier: ident,
                    plant: a?.plantCode || '',
                    description: desc || 'Issue'
                })
            })
            ;(mCom.data || []).forEach(r => {
                counts.mixers[r.mixer_id] = counts.mixers[r.mixer_id] || {issues: 0, comments: 0}
                counts.mixers[r.mixer_id].comments++
            })
            ;(tMaint.data || []).forEach(r => {
                counts.tractors[r.tractor_id] = counts.tractors[r.tractor_id] || {issues: 0, comments: 0}
                counts.tractors[r.tractor_id].issues++
                const a = tractorsMap.get(r.tractor_id)
                const ident = a?.truckNumber || a?.vin || ''
                const raw = r.description || r.issue || r.details || r.notes || r.note || r.text || r.comment || ''
                const desc = GrammarUtility.cleanDescription(raw || 'Issue')
                issueDetails.push({
                    type: 'Tractor',
                    assetId: r.tractor_id,
                    identifier: ident,
                    plant: a?.plantCode || '',
                    description: desc || 'Issue'
                })
            })
            ;(tCom.data || []).forEach(r => {
                counts.tractors[r.tractor_id] = counts.tractors[r.tractor_id] || {issues: 0, comments: 0}
                counts.tractors[r.tractor_id].comments++
            })
            ;(trMaint.data || []).forEach(r => {
                counts.trailers[r.trailer_id] = counts.trailers[r.trailer_id] || {issues: 0, comments: 0}
                counts.trailers[r.trailer_id].issues++
                const a = trailersMap.get(r.trailer_id)
                const ident = a?.identifyingNumber || ''
                const raw = r.description || r.issue || r.details || r.notes || r.note || r.text || r.comment || ''
                const desc = GrammarUtility.cleanDescription(raw || 'Issue')
                issueDetails.push({
                    type: 'Trailer',
                    assetId: r.trailer_id,
                    identifier: ident,
                    plant: a?.plantCode || '',
                    description: desc || 'Issue'
                })
            })
            ;(trCom.data || []).forEach(r => {
                counts.trailers[r.trailer_id] = counts.trailers[r.trailer_id] || {issues: 0, comments: 0}
                counts.trailers[r.trailer_id].comments++
            })
            ;(eMaint.data || []).forEach(r => {
                counts.equipment[r.equipment_id] = counts.equipment[r.equipment_id] || {issues: 0, comments: 0}
                counts.equipment[r.equipment_id].issues++
                const a = equipmentMap.get(r.equipment_id)
                const ident = a?.identifyingNumber || ''
                const raw = r.description || r.issue || r.details || r.notes || r.note || r.text || r.comment || ''
                const desc = GrammarUtility.cleanDescription(raw || 'Issue')
                issueDetails.push({
                    type: 'Equipment',
                    assetId: r.equipment_id,
                    identifier: ident,
                    plant: a?.plantCode || '',
                    description: desc || 'Issue'
                })
            })
            ;(eCom.data || []).forEach(r => {
                counts.equipment[r.equipment_id] = counts.equipment[r.equipment_id] || {issues: 0, comments: 0}
                counts.equipment[r.equipment_id].comments++
            })
            countsRef.current = counts
            setAssetIssueDetails(issueDetails)
            computeStats()
        } catch {}
    }, [computeStats])

    useEffect(() => {
        let cancelled = false
        let intervalId

        async function initBase() {
            if (!initialLoadRef.current) return
            setLoading(true)
            setError('')
            try {
                const fetchedPlants = await ReportService.fetchPlantsSorted().catch(() => [])
                if (cancelled) return
                setAllPlantsCount(Array.isArray(fetchedPlants) ? fetchedPlants.length : 0)
                setAllPlants(fetchedPlants)
                const {data: sessionData} = await supabase.auth.getSession()
                const uid = sessionData?.session?.user?.id || sessionStorage.getItem('userId') || ''
                let allPerm = false
                try {
                    allPerm = await UserService.hasPermission(uid, 'region.select.all').catch(() => false)
                } catch {}
                if (cancelled) return
                setHasAllRegionsPermission(!!allPerm)
                let allFetched
                try {
                    allFetched = await RegionService.fetchRegions().catch(() => [])
                } catch {
                    allFetched = []
                }
                let regionsList = []
                try {
                    regionsList = await UserService.getPermittedRegions(uid)
                } catch {
                    regionsList = []
                }
                if ((!regionsList || !regionsList.length) && allFetched.length) regionsList = allFetched
                if (cancelled) return
                setPermittedRegions(regionsList)
                setTotalRegionsExcludingOffice(allFetched.filter(r => r.type !== 'Office').length)
                const aggregateRegions = allFetched.filter(r => r.type === 'Aggregate')
                const aggregatePlantsPromises = aggregateRegions.map(r => RegionService.fetchRegionPlants(r.regionCode).catch(() => []))
                const aggregatePlantsArrays = await Promise.all(aggregatePlantsPromises)
                const totalAggLocs = aggregatePlantsArrays.flat().length
                setTotalAggregateLocations(totalAggLocs)
                setTotalPlantsExcludingAggregate(fetchedPlants.length - totalAggLocs)
                const selectedCode = preferences.selectedRegion?.code
                if (selectedCode) {
                    setDashboardRegionCode(selectedCode)
                    setDashboardRegionName(preferences.selectedRegion?.name || '')
                } else if (regionsList.length) {
                    const first = regionsList[0]
                    setDashboardRegionCode(first.regionCode)
                    setDashboardRegionName(first.regionName)
                }
            } catch (err) {
                if (!cancelled) setError('Failed to load dashboard data')
            } finally {
                if (!cancelled) {
                    initialLoadRef.current = false
                    setLoading(false)
                    setRefreshing(false)
                }
            }
        }

        initBase()
        intervalId = setInterval(() => setRefreshKey(v => v + 1), 600000)
        return () => {
            cancelled = true
            if (intervalId) clearInterval(intervalId)
        }
    }, [preferences.selectedRegion])

    useEffect(() => {
        if (preferences.selectedRegion?.code) {
            setDashboardRegionCode(prev => {
                if (prev !== preferences.selectedRegion.code) {
                    setDashboardRegionName(preferences.selectedRegion.name || '')
                    setDashboardPlant('')
                    setDataReady(false)
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
                return
            }
            setRefreshing(true)
            try {
                const list = await RegionService.fetchRegionPlants(dashboardRegionCode).catch(() => [])
                if (cancelled) return
                setRegionPlants(list)
            } finally {
                if (!cancelled) setRefreshing(false)
            }
        }

        fetchRegionPlants()
        return () => {
            cancelled = true
        }
    }, [dashboardRegionCode])

    useEffect(() => {
        let cancelled = false

        async function fetchAssets() {
            const CACHE_KEY = 'dashboard_assets_cache_v1'
            const CACHE_TTL_MS = 120000
            setError('')
            const now = Date.now()
            if (initialLoadRef.current) {
                try {
                    const raw = sessionStorage.getItem(CACHE_KEY)
                    if (raw) {
                        const parsed = JSON.parse(raw)
                        if (parsed && (now - (parsed.savedAt || 0)) < CACHE_TTL_MS) {
                            allMixersRef.current = (parsed.mixers || []).map(slimMixer)
                            allTractorsRef.current = (parsed.tractors || []).map(slimTractor)
                            allTrailersRef.current = (parsed.trailers || []).map(slimTrailer)
                            allEquipmentRef.current = (parsed.equipment || []).map(slimEquipment)
                            allPickupsRef.current = (parsed.pickups || []).map(slimPickup)
                            allOperatorsRef.current = (parsed.operators || []).map(slimOperator)
                            computeStats()
                            setLastUpdated(parsed.lastUpdated ? new Date(parsed.lastUpdated) : new Date(parsed.savedAt || now))
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
                allMixersRef.current = mix.map(slimMixer)
                allTractorsRef.current = trac.map(slimTractor)
                allTrailersRef.current = trail.map(slimTrailer)
                allEquipmentRef.current = equip.map(slimEquipment)
                allPickupsRef.current = pick.map(slimPickup)
                allOperatorsFullRef.current = ops
                allOperatorsRef.current = ops.map(slimOperator)
                const byId = new Map(ops.map(o => [o.employeeId, o]))
                const training = ops.filter(o => o.status === 'Training').map(o => {
                    const trainer = o.assignedTrainer ? byId.get(o.assignedTrainer) : null
                    return {
                        id: o.employeeId,
                        operatorName: o.name || '',
                        trainerName: trainer?.name || '',
                        trainerPlant: trainer?.plantCode || '',
                        operatorPosition: o.position || '',
                        operatorPlant: o.plantCode || ''
                    }
                })
                setTrainingOperators(training)
                const pending = ops.filter(o => o.status === 'Pending Start').map(o => {
                    const trainer = o.assignedTrainer ? byId.get(o.assignedTrainer) : null
                    return {
                        id: o.employeeId,
                        operatorName: o.name || '',
                        operatorPlant: o.plantCode || '',
                        trainerPlant: trainer?.plantCode || '',
                        pendingDate: o.pendingStartDate || ''
                    }
                })
                setPendingStartOperators(pending)
                const lightDuty = ops.filter(o => o.status === 'Light Duty').map(o => ({
                    id: o.employeeId,
                    operatorName: o.name || '',
                    plant: o.plantCode || ''
                }))
                setLightDutyOperators(lightDuty)
                computeStats()
                const fetchedAt = new Date()
                setLastUpdated(fetchedAt)
                try {
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                        savedAt: Date.now(),
                        lastUpdated: fetchedAt.toISOString(),
                        mixers: allMixersRef.current,
                        tractors: allTractorsRef.current,
                        trailers: allTrailersRef.current,
                        equipment: allEquipmentRef.current,
                        pickups: allPickupsRef.current,
                        operators: allOperatorsRef.current
                    }))
                } catch {}
            } catch (err) {
                if (!cancelled) setError('Failed to load dashboard data')
            } finally {
                if (!cancelled) {
                    setLoading(false)
                    setRefreshing(false)
                    setTimeout(() => {
                        setDataReady(true)
                    }, 300)
                }
            }
        }

        fetchAssets()
        return () => {
            cancelled = true
        }
    }, [refreshKey, computeStats, slimMixer, slimTractor, slimTrailer, slimEquipment, slimPickup, slimOperator])

    useEffect(() => {
        applyFilters()
    }, [dashboardPlant, regionPlants, applyFilters])

    useEffect(() => {
        if (!loading) fetchIssueCommentCounts()
    }, [stats.fleetTotal, loading, fetchIssueCommentCounts])

    const fetchStatusHistory = useCallback(async () => {
        try {
            const [mixersHist, tractorsHist, trailersHist, equipmentHist, pickupsHist] = await Promise.all([
                supabase.from('mixers_history').select('*').eq('field_name', 'status').order('changed_at', {ascending: true}),
                supabase.from('tractors_history').select('*').eq('field_name', 'status').order('changed_at', {ascending: true}),
                supabase.from('trailers_history').select('*').eq('field_name', 'status').order('changed_at', {ascending: true}),
                supabase.from('heavy_equipment_history').select('*').eq('field_name', 'status').order('changed_at', {ascending: true}),
                supabase.from('pickup_trucks_history').select('*').eq('field_name', 'status').order('changed_at', {ascending: true})
            ])

            historyRecordsRef.current = {
                mixers: mixersHist.data || [],
                tractors: tractorsHist.data || [],
                trailers: trailersHist.data || [],
                equipment: equipmentHist.data || [],
                pickups: pickupsHist.data || []
            }

            const region = RegionService.getRegionByCode(dashboardRegionCode)
            const isOffice = region?.type === 'Office'
            const plantSet = new Set()
            if (isOffice) {
                allPlants.forEach(p => {
                    const c = p.plantCode || p.plant_code
                    if (c) plantSet.add(String(c).trim())
                })
            } else {
                if (dashboardPlant) plantSet.add(String(dashboardPlant).trim())
                else (regionPlants || []).forEach(p => {
                    const c = p.plantCode || p.plant_code
                    if (c) plantSet.add(String(c).trim())
                })
            }
            const filterActive = plantSet.size > 0
            const consider = plantCode => !filterActive || plantSet.has(String(plantCode || '').trim())

            const filteredMixers = allMixersRef.current.filter(m => m.status !== 'Retired' && consider(m.plantCode))
            const filteredTractors = allTractorsRef.current.filter(t => t.status !== 'Retired' && consider(t.plantCode))
            const filteredTrailers = allTrailersRef.current.filter(t => t.status !== 'Retired' && consider(t.plantCode))
            const filteredEquipment = allEquipmentRef.current.filter(e => e.status !== 'Retired' && consider(e.plantCode))
            const filteredPickups = allPickupsRef.current.filter(p => p.status !== 'Retired' && consider(p.plantCode))

            const filteredAssetIds = new Set([
                ...filteredMixers.map(m => m.id),
                ...filteredTractors.map(t => t.id),
                ...filteredTrailers.map(t => t.id),
                ...filteredEquipment.map(e => e.id),
                ...filteredPickups.map(p => p.id)
            ])

            const filteredHistoryRecords = [
                ...(mixersHist.data || []).filter(h => filteredAssetIds.has(h.mixer_id)),
                ...(tractorsHist.data || []).filter(h => filteredAssetIds.has(h.tractor_id)),
                ...(trailersHist.data || []).filter(h => filteredAssetIds.has(h.trailer_id)),
                ...(equipmentHist.data || []).filter(h => filteredAssetIds.has(h.equipment_id)),
                ...(pickupsHist.data || []).filter(h => filteredAssetIds.has(h.truck_id))
            ]

            let oldestDate = new Date()
            if (filteredHistoryRecords.length > 0) {
                const dates = filteredHistoryRecords.map(h => new Date(h.changed_at))
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
                    .map(a => a.createdAt || a.created_at)
                    .filter(Boolean)
                    .map(d => new Date(d))
                if (creationDates.length > 0) {
                    oldestDate = new Date(Math.min(...creationDates))
                }
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

            const mixersData = calculateStatusDistribution(filteredMixers, mixersHist.data || [], startFilter, endFilter)
            const tractorsData = calculateStatusDistribution(filteredTractors, tractorsHist.data || [], startFilter, endFilter)
            const trailersData = calculateStatusDistribution(filteredTrailers, trailersHist.data || [], startFilter, endFilter)
            const equipmentData = calculateStatusDistribution(filteredEquipment, equipmentHist.data || [], startFilter, endFilter)
            const pickupsData = calculateStatusDistribution(filteredPickups, pickupsHist.data || [], startFilter, endFilter)

            setStatusHistoryData({
                mixers: mixersData,
                tractors: tractorsData,
                trailers: trailersData,
                equipment: equipmentData,
                pickups: pickupsData
            })
        } catch (err) {}
    }, [calculateStatusDistribution, dashboardRegionCode, dashboardPlant, allPlants, regionPlants, historyStartDate, historyEndDate])

    useEffect(() => {
        if (!loading && dataReady && allMixersRef.current.length > 0) {
            fetchStatusHistory()
        }
    }, [loading, dataReady, refreshKey, fetchStatusHistory])

    useEffect(() => {
        if (historyStartDate && historyEndDate) {
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
            const isOffice = region?.type === 'Office'
            const plantSet = new Set()
            if (isOffice) {
                allPlants.forEach(p => {
                    const c = p.plantCode || p.plant_code
                    if (c) plantSet.add(String(c).trim())
                })
            } else {
                if (dashboardPlant) plantSet.add(String(dashboardPlant).trim())
                else (regionPlants || []).forEach(p => {
                    const c = p.plantCode || p.plant_code
                    if (c) plantSet.add(String(c).trim())
                })
            }
            const filterActive = plantSet.size > 0
            const consider = plantCode => !filterActive || plantSet.has(String(plantCode || '').trim())

            const filteredMixers = allMixersRef.current.filter(m => m.status !== 'Retired' && consider(m.plantCode))
            const filteredTractors = allTractorsRef.current.filter(t => t.status !== 'Retired' && consider(t.plantCode))
            const filteredTrailers = allTrailersRef.current.filter(t => t.status !== 'Retired' && consider(t.plantCode))
            const filteredEquipment = allEquipmentRef.current.filter(e => e.status !== 'Retired' && consider(e.plantCode))
            const filteredPickups = allPickupsRef.current.filter(p => p.status !== 'Retired' && consider(p.plantCode))

            const mixersData = calculateStatusDistribution(
                filteredMixers,
                historyRecordsRef.current.mixers,
                validatedStartDate,
                validatedEndDate
            )
            const tractorsData = calculateStatusDistribution(
                filteredTractors,
                historyRecordsRef.current.tractors,
                validatedStartDate,
                validatedEndDate
            )
            const trailersData = calculateStatusDistribution(
                filteredTrailers,
                historyRecordsRef.current.trailers,
                validatedStartDate,
                validatedEndDate
            )
            const equipmentData = calculateStatusDistribution(
                filteredEquipment,
                historyRecordsRef.current.equipment,
                validatedStartDate,
                validatedEndDate
            )
            const pickupsData = calculateStatusDistribution(
                filteredPickups,
                historyRecordsRef.current.pickups,
                validatedStartDate,
                validatedEndDate
            )

            setStatusHistoryData({
                mixers: mixersData,
                tractors: tractorsData,
                trailers: trailersData,
                equipment: equipmentData,
                pickups: pickupsData
            })
        }
    }, [historyStartDate, historyEndDate, calculateStatusDistribution, dashboardRegionCode, dashboardPlant, regionPlants, allPlants])

    const handleQuickDateFilter = (filter) => {
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]
        let startDate = ''

        switch (filter) {
            case 'last-week': {
                const lastWeekStart = new Date(today)
                lastWeekStart.setDate(today.getDate() - 7)
                startDate = lastWeekStart.toISOString().split('T')[0]
                setHistoryStartDate(startDate)
                setHistoryEndDate(todayStr)
                break
            }
            case 'this-week': {
                const thisWeekStart = new Date(today)
                const dayOfWeek = today.getDay()
                thisWeekStart.setDate(today.getDate() - dayOfWeek)
                startDate = thisWeekStart.toISOString().split('T')[0]
                setHistoryStartDate(startDate)
                setHistoryEndDate(todayStr)
                break
            }
            case 'last-month': {
                const lastMonthStart = new Date(today)
                lastMonthStart.setMonth(today.getMonth() - 1)
                startDate = lastMonthStart.toISOString().split('T')[0]
                setHistoryStartDate(startDate)
                setHistoryEndDate(todayStr)
                break
            }
            case 'this-month': {
                const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
                startDate = thisMonthStart.toISOString().split('T')[0]
                setHistoryStartDate(startDate)
                setHistoryEndDate(todayStr)
                break
            }
            case 'this-quarter': {
                const currentMonth = today.getMonth()
                const quarterStartMonth = Math.floor(currentMonth / 3) * 3
                const thisQuarterStart = new Date(today.getFullYear(), quarterStartMonth, 1)
                startDate = thisQuarterStart.toISOString().split('T')[0]
                setHistoryStartDate(startDate)
                setHistoryEndDate(todayStr)
                break
            }
            case 'last-quarter': {
                const currentMonth = today.getMonth()
                const lastQuarterStartMonth = Math.floor(currentMonth / 3) * 3 - 3
                let year = today.getFullYear()
                let month = lastQuarterStartMonth
                if (month < 0) {
                    month = 9
                    year -= 1
                }
                const lastQuarterStart = new Date(year, month, 1)
                const lastQuarterEnd = new Date(year, month + 3, 0)
                startDate = lastQuarterStart.toISOString().split('T')[0]
                const endDate = lastQuarterEnd.toISOString().split('T')[0]
                setHistoryStartDate(startDate)
                setHistoryEndDate(endDate)
                break
            }
            case 'this-year': {
                const thisYearStart = new Date(today.getFullYear(), 0, 1)
                startDate = thisYearStart.toISOString().split('T')[0]
                setHistoryStartDate(startDate)
                setHistoryEndDate(todayStr)
                break
            }
            case 'last-year': {
                const lastYearStart = new Date(today.getFullYear() - 1, 0, 1)
                const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31)
                startDate = lastYearStart.toISOString().split('T')[0]
                const endDate = lastYearEnd.toISOString().split('T')[0]
                setHistoryStartDate(startDate)
                setHistoryEndDate(endDate)
                break
            }
            case 'all':
                setHistoryStartDate(oldestHistoryDate || todayStr)
                setHistoryEndDate(todayStr)
                break
            default:
                break
        }
    }

    const regionDisplayName = (() => {
        const region = RegionService.getRegionByCode(dashboardRegionCode)
        const isOffice = region?.type === 'Office'
        return isOffice ? 'Home Office' : (dashboardRegionCode ? (dashboardRegionName || dashboardRegionCode) : (hasAllRegionsPermission ? 'All Regions' : (permittedRegions[0]?.regionName || 'Region')))
    })()

    const heroRegionSub = (() => {
        const region = RegionService.getRegionByCode(dashboardRegionCode)
        const isOffice = region?.type === 'Office'
        if (isOffice) return `${totalRegionsExcludingOffice} Region${totalRegionsExcludingOffice !== 1 ? 's' : ''}, ${totalPlantsExcludingAggregate} Concrete Plant${totalPlantsExcludingAggregate !== 1 ? 's' : ''}, ${totalAggregateLocations} Aggregate Location${totalAggregateLocations !== 1 ? 's' : ''}`
        const plantLabel = region?.type === 'Aggregate' ? 'Aggregate Location' : 'Concrete Plant'
        return dashboardPlant ? `${plantLabel} ${dashboardPlant}` : (dashboardRegionCode ? `${regionPlants.length} ${plantLabel}${regionPlants.length !== 1 ? 's' : ''}` : `${allPlantsCount} ${plantLabel}${allPlantsCount !== 1 ? 's' : ''}`)
    })()

    const onRetry = () => setRefreshKey(v => v + 1)
    const onRefresh = () => {
        setRefreshing(true)
        setRefreshKey(prev => prev + 1)
        setTimeout(() => setRefreshing(false), 1000)
    }

    const showSkeleton = !dataReady

    const filteredTrainingOperators = (() => {
        const plantSet = plantSetRef.current
        const active = plantSet.size > 0
        if (!active) return trainingOperators
        return trainingOperators.filter(r => plantSet.has(String(r.trainerPlant || '').trim()) || plantSet.has(String(r.operatorPlant || '').trim()))
    })()

    const filteredPendingStartOperators = (() => {
        const plantSet = plantSetRef.current
        const active = plantSet.size > 0
        if (!active) return pendingStartOperators
        return pendingStartOperators.filter(r => plantSet.has(String(r.trainerPlant || '').trim()) || plantSet.has(String(r.operatorPlant || '').trim()))
    })()

    const filteredLightDutyOperators = (() => {
        const plantSet = plantSetRef.current
        const active = plantSet.size > 0
        if (!active) return lightDutyOperators
        return lightDutyOperators.filter(r => plantSet.has(String(r.plant || '').trim()))
    })()

    const formatPendingDate = d => {
        if (!d) return '-'
        if (d.length === 10 && /\d{4}-\d{2}-\d{2}/.test(d)) return d
        try {
            return (new Date(d)).toISOString().slice(0, 10)
        } catch {
            return d
        }
    }

    const selectedRegion = RegionService.getRegionByCode(dashboardRegionCode)
    const isAggregate = selectedRegion?.type === 'Aggregate'

    const SkeletonCard = () => (
        <div className="rounded-xl p-6 shadow-card animate-pulse" style={{backgroundColor: 'white'}}>
            <div className="h-4 rounded w-2/5 mb-3" style={{backgroundColor: 'var(--bg-tertiary)'}}></div>
            <div className="h-8 rounded w-3/5 mb-2" style={{backgroundColor: 'var(--bg-tertiary)'}}></div>
            <div className="h-3 rounded w-1/3" style={{backgroundColor: 'var(--bg-tertiary)'}}></div>
        </div>
    )

    const Pill = ({children}) => (
        <span style={{
            display: 'inline-block',
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '16px',
            marginRight: '6px',
            marginBottom: '6px',
            backgroundColor: '#e5e7eb',
            color: '#374151',
            fontWeight: 500
        }}>{children}</span>
    )

    const cardStyle = {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        border: '1px solid #e5e7eb'
    }

    const metricCardStyle = {
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e2e8f0'
    }

    const sectionTitleStyle = {
        fontSize: '18px',
        fontWeight: 600,
        color: '#1e3a5f',
        marginBottom: '20px'
    }

    const metricLabelStyle = {
        fontSize: '13px',
        fontWeight: 500,
        color: '#64748b',
        marginBottom: '4px'
    }

    const metricValueStyle = {
        fontSize: '28px',
        fontWeight: 700,
        color: '#1e3a5f',
        lineHeight: 1.2
    }

    const metricSubStyle = {
        fontSize: '12px',
        color: '#94a3b8',
        marginTop: '4px'
    }

    return (
        <>
            <style>{`
                .content-area:has(.dashboard-full-width) {
                    padding-left: 0 !important;
                    padding-right: 0 !important;
                }
            `}</style>
            <div className="dashboard-full-width" style={{
                minHeight: '100vh',
                backgroundColor: '#f8fafc',
                color: '#1e293b'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    backgroundImage: `
                        linear-gradient(rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                        radial-gradient(circle at center, rgba(30, 58, 95, 0.015) 0%, transparent 50%)
                    `,
                    backgroundSize: '20px 20px, 20px 20px, 40px 40px',
                    backgroundPosition: '0 0, 0 0, 0 0',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '16px 24px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                <div style={{maxWidth: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <h1 style={{fontSize: '24px', fontWeight: 700, color: '#1e3a5f', margin: 0}}>Dashboard</h1>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={refreshing}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 20px',
                                backgroundColor: '#1e3a5f',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: refreshing ? 'not-allowed' : 'pointer',
                                opacity: refreshing ? 0.7 : 1
                            }}
                        >
                            <i className="fas fa-sync-alt" style={{animation: refreshing ? 'spin 1s linear infinite' : 'none'}}></i>
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                        {dashboardRegionCode && selectedRegion?.type !== 'Office' && (
                            <button
                                type="button"
                                onClick={() => setPlantModalOpen(true)}
                                disabled={refreshing}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'white',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                {dashboardPlant ? regionPlants.find(p => (p.plantCode || p.plant_code) === dashboardPlant)?.plantName || dashboardPlant : 'All Plants'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div style={{maxWidth: '100%', margin: '0 auto', padding: '24px'}}>
                <div style={{...cardStyle, marginBottom: '24px'}}>
                    <div style={{marginBottom: '20px'}}>
                        {showSkeleton ? (
                            <>
                                <div style={{height: '24px', backgroundColor: '#e2e8f0', borderRadius: '6px', width: '200px', marginBottom: '8px'}}></div>
                                <div style={{height: '16px', backgroundColor: '#e2e8f0', borderRadius: '6px', width: '300px'}}></div>
                            </>
                        ) : (
                            <>
                                <h2 style={{fontSize: '22px', fontWeight: 600, color: '#1e3a5f', margin: '0 0 4px 0'}}>{regionDisplayName}</h2>
                                <p style={{fontSize: '14px', color: '#64748b', margin: 0}}>{heroRegionSub}</p>
                            </>
                        )}
                    </div>
                    
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px'}}>
                        {showSkeleton ? (
                            [1,2,3,4].map(i => (
                                <div key={i} style={metricCardStyle}>
                                    <div style={{height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px', width: '60%', marginBottom: '12px'}}></div>
                                    <div style={{height: '32px', backgroundColor: '#e2e8f0', borderRadius: '4px', width: '50%', marginBottom: '8px'}}></div>
                                    <div style={{height: '12px', backgroundColor: '#e2e8f0', borderRadius: '4px', width: '40%'}}></div>
                                </div>
                            ))
                        ) : (
                            <>
                                <div style={metricCardStyle}>
                                    <div style={metricLabelStyle}>Fleet Total</div>
                                    <div style={metricValueStyle}>{stats.fleetTotal}</div>
                                    <div style={metricSubStyle}>Total Assets</div>
                                </div>
                                <div style={metricCardStyle}>
                                    <div style={metricLabelStyle}>Asset Allocation</div>
                                    <div style={metricValueStyle}>{stats.overallAllocationPercent}%</div>
                                    <div style={metricSubStyle}>Overall Allocation</div>
                                </div>
                                <div style={metricCardStyle}>
                                    <div style={metricLabelStyle}>Service Overdue</div>
                                    <div style={metricValueStyle}>{stats.overdueTotal}</div>
                                    <div style={metricSubStyle}>Need Attention</div>
                                </div>
                                <div style={metricCardStyle}>
                                    <div style={metricLabelStyle}>Verification</div>
                                    <div style={metricValueStyle}>{stats.verificationAverage}%</div>
                                    <div style={metricSubStyle}>Overall Verified</div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <span>{error}</span>
                        <button onClick={onRetry} style={{color: '#dc2626', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer'}}>Retry</button>
                    </div>
                )}

                {!showSkeleton && (
                    <div style={{display: 'grid', gap: '24px'}}>
                        <div style={cardStyle}>
                            <h3 style={sectionTitleStyle}>Fleet Overview</h3>
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px'}}>
                                {!isAggregate && (
                                    <div style={{...metricCardStyle, border: selectedRegion?.type === 'Concrete' ? '2px solid #1e3a5f' : '1px solid #e2e8f0'}}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
                                            <div>
                                                <div style={metricLabelStyle}>Mixers</div>
                                                <div style={{fontSize: '32px', fontWeight: 700, color: '#1e3a5f'}}>{stats.mixers.total}</div>
                                            </div>
                                            <div style={{padding: '8px', backgroundColor: '#dbeafe', borderRadius: '8px'}}>
                                                <i className="fas fa-truck-loading" style={{color: '#2563eb', fontSize: '20px'}}></i>
                                            </div>
                                        </div>
                                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
                                            <Pill>Active {stats.mixers.active}</Pill>
                                            <Pill>Spare {stats.mixers.spare}</Pill>
                                            <Pill>In Shop {stats.mixers.shop}</Pill>
                                            <Pill>Verified {stats.mixers.verifiedPercent}%</Pill>
                                        </div>
                                    </div>
                                )}
                                
                                <div style={{...metricCardStyle, border: selectedRegion?.type === 'Aggregate' ? '2px solid #1e3a5f' : '1px solid #e2e8f0'}}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
                                        <div>
                                            <div style={metricLabelStyle}>Tractors</div>
                                            <div style={{fontSize: '32px', fontWeight: 700, color: '#1e3a5f'}}>{stats.tractors.total}</div>
                                        </div>
                                        <div style={{padding: '8px', backgroundColor: '#dcfce7', borderRadius: '8px'}}>
                                            <i className="fas fa-truck" style={{color: '#16a34a', fontSize: '20px'}}></i>
                                        </div>
                                    </div>
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
                                        <Pill>Active {stats.tractors.active}</Pill>
                                        <Pill>Spare {stats.tractors.spare}</Pill>
                                        <Pill>In Shop {stats.tractors.shop}</Pill>
                                        <Pill>Verified {stats.tractors.verifiedPercent}%</Pill>
                                    </div>
                                </div>
                                
                                <div style={metricCardStyle}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
                                        <div>
                                            <div style={metricLabelStyle}>Trailers</div>
                                            <div style={{fontSize: '32px', fontWeight: 700, color: '#1e3a5f'}}>{stats.trailers.total}</div>
                                        </div>
                                        <div style={{padding: '8px', backgroundColor: '#fef3c7', borderRadius: '8px'}}>
                                            <i className="fas fa-trailer" style={{color: '#d97706', fontSize: '20px'}}></i>
                                        </div>
                                    </div>
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
                                        <Pill>Active {stats.trailers.active}</Pill>
                                        <Pill>Spare {stats.trailers.spare}</Pill>
                                        <Pill>In Shop {stats.trailers.shop}</Pill>
                                    </div>
                                </div>
                                
                                <div style={metricCardStyle}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
                                        <div>
                                            <div style={metricLabelStyle}>Equipment</div>
                                            <div style={{fontSize: '32px', fontWeight: 700, color: '#1e3a5f'}}>{stats.equipment.total}</div>
                                        </div>
                                        <div style={{padding: '8px', backgroundColor: '#f3e8ff', borderRadius: '8px'}}>
                                            <i className="fas fa-cogs" style={{color: '#9333ea', fontSize: '20px'}}></i>
                                        </div>
                                    </div>
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
                                        <Pill>Active {stats.equipment.active}</Pill>
                                        <Pill>Spare {stats.equipment.spare}</Pill>
                                        <Pill>In Shop {stats.equipment.shop}</Pill>
                                    </div>
                                </div>
                                
                                <div style={metricCardStyle}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
                                        <div>
                                            <div style={metricLabelStyle}>Pickup Trucks</div>
                                            <div style={{fontSize: '32px', fontWeight: 700, color: '#1e3a5f'}}>{stats.pickups.total}</div>
                                        </div>
                                        <div style={{padding: '8px', backgroundColor: '#fce7f3', borderRadius: '8px'}}>
                                            <i className="fas fa-truck-pickup" style={{color: '#db2777', fontSize: '20px'}}></i>
                                        </div>
                                    </div>
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
                                        <Pill>Active {stats.pickups.active}</Pill>
                                        <Pill>In Shop {stats.pickups.shop}</Pill>
                                        <Pill>Stationary {stats.pickups.stationary}</Pill>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={cardStyle}>
                            <h3 style={sectionTitleStyle}>People</h3>
                            <div style={{...metricCardStyle, marginBottom: '20px'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
                                    <div>
                                        <div style={metricLabelStyle}>Operators</div>
                                        <div style={{fontSize: '32px', fontWeight: 700, color: '#1e3a5f'}}>{stats.operators.total}</div>
                                    </div>
                                    <div style={{padding: '8px', backgroundColor: '#e0f2fe', borderRadius: '8px'}}>
                                        <i className="fas fa-users" style={{color: '#0284c7', fontSize: '20px'}}></i>
                                    </div>
                                </div>
                                <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
                                    <Pill>Active {stats.operators.active}</Pill>
                                    <Pill>Light Duty {stats.operators.lightDuty}</Pill>
                                    <Pill>Assigned {stats.operators.assigned}</Pill>
                                    {!isAggregate && <Pill>Mixers {stats.operators.mixerAssigned}</Pill>}
                                    <Pill>Tractors {stats.operators.tractorAssigned}</Pill>
                                    <Pill>Unassigned {stats.operators.unassigned}</Pill>
                                </div>
                            </div>

                            <CollapsibleTable
                                title={`Operators In Training (${filteredTrainingOperators.length})`}
                                collapsed={trainingCollapsed}
                                onToggle={() => setTrainingCollapsed(v => !v)}
                                disabled={!filteredTrainingOperators.length}
                                headers={['Plant (Training At)', 'Operator', 'Trainer', 'Position', 'Plant (Training For)']}
                                rows={filteredTrainingOperators}
                                renderRow={(r) => [r.trainerPlant || '-', r.operatorName || '-', r.trainerName || '-', r.operatorPosition || '-', r.operatorPlant || '-']}
                            />
                            
                            <CollapsibleTable
                                title={`Pending Start Operators (${filteredPendingStartOperators.length})`}
                                collapsed={pendingCollapsed}
                                onToggle={() => setPendingCollapsed(v => !v)}
                                disabled={!filteredPendingStartOperators.length}
                                headers={['Plant (Training At)', 'Operator', 'Plant (Training For)', 'Pending Start Date']}
                                rows={filteredPendingStartOperators}
                                renderRow={(r) => [r.trainerPlant || '-', r.operatorName || '-', r.operatorPlant || '-', formatPendingDate(r.pendingDate)]}
                            />
                            
                            <CollapsibleTable
                                title={`Light Duty Operators (${filteredLightDutyOperators.length})`}
                                collapsed={lightDutyCollapsed}
                                onToggle={() => setLightDutyCollapsed(v => !v)}
                                disabled={!filteredLightDutyOperators.length}
                                headers={['Plant', 'Operator']}
                                rows={filteredLightDutyOperators}
                                renderRow={(r) => [r.plant || '-', r.operatorName || '-']}
                            />
                        </div>

                        <div style={cardStyle}>
                            <h3 style={sectionTitleStyle}>Maintenance & Quality</h3>
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px'}}>
                                <div style={metricCardStyle}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
                                        <div>
                                            <div style={metricLabelStyle}>Service Overdue</div>
                                            <div style={{fontSize: '32px', fontWeight: 700, color: '#dc2626'}}>{stats.overdueTotal}</div>
                                        </div>
                                        <div style={{padding: '8px', backgroundColor: '#fee2e2', borderRadius: '8px'}}>
                                            <i className="fas fa-exclamation-triangle" style={{color: '#dc2626', fontSize: '20px'}}></i>
                                        </div>
                                    </div>
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
                                        {!isAggregate && <Pill>Mixers {stats.mixers.overdue}</Pill>}
                                        <Pill>Tractors {stats.tractors.overdue}</Pill>
                                        <Pill>Trailers {stats.trailers.overdue}</Pill>
                                        <Pill>Equipment {stats.equipment.overdue}</Pill>
                                    </div>
                                </div>
                                <div style={metricCardStyle}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
                                        <div>
                                            <div style={metricLabelStyle}>Open Issues</div>
                                            <div style={{fontSize: '32px', fontWeight: 700, color: '#f59e0b'}}>{stats.openIssuesTotal}</div>
                                        </div>
                                        <div style={{padding: '8px', backgroundColor: '#fef3c7', borderRadius: '8px'}}>
                                            <i className="fas fa-wrench" style={{color: '#f59e0b', fontSize: '20px'}}></i>
                                        </div>
                                    </div>
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
                                        {!isAggregate && <Pill>Mixers {stats.mixers.issues}</Pill>}
                                        <Pill>Tractors {stats.tractors.issues}</Pill>
                                        <Pill>Trailers {stats.trailers.issues}</Pill>
                                        <Pill>Equipment {stats.equipment.issues}</Pill>
                                    </div>
                                </div>
                            </div>

                            <div style={{borderTop: '1px solid #e2e8f0', paddingTop: '24px'}}>
                                <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px'}}>
                                    <h4 style={{fontSize: '16px', fontWeight: 600, color: '#1e3a5f', margin: 0}}>Historical Status Distribution</h4>
                                    <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px'}}>
                                        {['last-week', 'this-month', 'this-quarter', 'this-year', 'all'].map(filter => (
                                            <button
                                                key={filter}
                                                onClick={() => handleQuickDateFilter(filter)}
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '12px',
                                                    backgroundColor: '#f1f5f9',
                                                    color: '#475569',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontWeight: 500
                                                }}
                                            >
                                                {filter.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px'}}>
                                    {(() => {
                                        const calcMetrics = (data) => {
                                            const active = data.find(d => d.status === 'Active')?.days || 0
                                            const spare = data.find(d => d.status === 'Spare')?.days || 0
                                            const inShop = data.find(d => d.status === 'In Shop')?.days || 0
                                            const total = data.reduce((sum, d) => sum + d.days, 0)
                                            return {
                                                active: total > 0 ? Math.round((active / total) * 100) : 0,
                                                spare: total > 0 ? Math.round((spare / total) * 100) : 0,
                                                inShop: total > 0 ? Math.round((inShop / total) * 100) : 0
                                            }
                                        }
                                        const assets = [
                                            {name: 'Mixers', ...calcMetrics(statusHistoryData.mixers), show: !isAggregate},
                                            {name: 'Tractors', ...calcMetrics(statusHistoryData.tractors), show: true},
                                            {name: 'Trailers', ...calcMetrics(statusHistoryData.trailers), show: true},
                                            {name: 'Equipment', ...calcMetrics(statusHistoryData.equipment), show: true},
                                            {name: 'Pickups', ...calcMetrics(statusHistoryData.pickups), show: true}
                                        ].filter(a => a.show)
                                        
                                        return assets.map((asset, idx) => (
                                            <div key={idx} style={{backgroundColor: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0'}}>
                                                <div style={{fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '10px'}}>{asset.name}</div>
                                                <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                                                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px'}}>
                                                        <span style={{color: '#16a34a'}}>Active</span>
                                                        <span style={{fontWeight: 600, color: '#1e293b'}}>{asset.active}%</span>
                                                    </div>
                                                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px'}}>
                                                        <span style={{color: '#9333ea'}}>Spare</span>
                                                        <span style={{fontWeight: 600, color: '#1e293b'}}>{asset.spare}%</span>
                                                    </div>
                                                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px'}}>
                                                        <span style={{color: '#2563eb'}}>In Shop</span>
                                                        <span style={{fontWeight: 600, color: '#1e293b'}}>{asset.inShop}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    })()}
                                </div>

                                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                    {(() => {
                                        const getColor = (status) => {
                                            const colors = {Active: '#22c55e', Spare: '#a855f7', 'In Shop': '#3b82f6', Stationary: '#eab308', Sold: '#6b7280'}
                                            return colors[status] || '#64748b'
                                        }
                                        const sortStatuses = (data) => {
                                            const order = ['Active', 'Spare', 'In Shop', 'Stationary', 'Sold']
                                            return [...data].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))
                                        }
                                        const bars = [
                                            {label: 'Mixers', data: statusHistoryData.mixers, show: !isAggregate},
                                            {label: 'Tractors', data: statusHistoryData.tractors, show: true},
                                            {label: 'Trailers', data: statusHistoryData.trailers, show: true},
                                            {label: 'Equipment', data: statusHistoryData.equipment, show: true},
                                            {label: 'Pickups', data: statusHistoryData.pickups, show: true}
                                        ].filter(b => b.show)
                                        
                                        return bars.map((bar, idx) => (
                                            <div key={idx} style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                                <div style={{width: '80px', fontSize: '13px', fontWeight: 500, color: '#475569', flexShrink: 0}}>{bar.label}</div>
                                                <div style={{flex: 1, height: '28px', backgroundColor: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', display: 'flex'}}>
                                                    {bar.data.length > 0 ? (
                                                        sortStatuses(bar.data).filter(item => parseFloat(item.percentage) > 0).map((item, i) => (
                                                            <div
                                                                key={i}
                                                                style={{
                                                                    width: `${item.percentage}%`,
                                                                    height: '100%',
                                                                    backgroundColor: getColor(item.status),
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: 'white',
                                                                    fontSize: '11px',
                                                                    fontWeight: 600
                                                                }}
                                                                title={`${item.status}: ${item.percentage}%`}
                                                            >
                                                                {parseFloat(item.percentage) > 12 && `${item.percentage}%`}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px'}}>No data</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    })()}
                                </div>
                            </div>
                        </div>
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
        </div>
        </>
    )

    function CollapsibleTable({title, collapsed, onToggle, disabled, headers, rows, renderRow}) {
        return (
            <div style={{border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '12px', overflow: 'hidden'}}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    backgroundColor: '#f8fafc',
                    borderBottom: collapsed ? 'none' : '1px solid #e2e8f0'
                }}>
                    <span style={{fontWeight: 500, color: '#374151', fontSize: '14px'}}>{title}</span>
                    <button
                        onClick={onToggle}
                        disabled={disabled}
                        style={{
                            fontSize: '13px',
                            color: disabled ? '#9ca3af' : '#1e3a5f',
                            background: 'none',
                            border: 'none',
                            cursor: disabled ? 'default' : 'pointer',
                            fontWeight: 500
                        }}
                    >
                        {collapsed ? 'Expand' : 'Collapse'}
                    </button>
                </div>
                {!collapsed && (
                    rows.length > 0 ? (
                        <div style={{overflowX: 'auto'}}>
                            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
                                <thead>
                                    <tr style={{backgroundColor: '#f8fafc'}}>
                                        {headers.map((h, i) => (
                                            <th key={i} style={{textAlign: 'left', padding: '12px 16px', fontWeight: 500, color: '#64748b', borderBottom: '1px solid #e2e8f0'}}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => (
                                        <tr key={r.id || i} style={{borderBottom: '1px solid #f1f5f9'}}>
                                            {renderRow(r).map((cell, j) => (
                                                <td key={j} style={{padding: '12px 16px', color: '#374151'}}>{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px'}}>None</div>
                    )
                )}
            </div>
        )
    }
}
