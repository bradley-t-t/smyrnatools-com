import React, {useCallback, useEffect, useMemo, useRef, useState, useTransition} from 'react'
import './styles/Dashboard.css'
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
import PlantDropdownModal from '../../components/common/PlantDropdownModal';

export default function DashboardView() {
    const {preferences, updatePreferences} = usePreferences()
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
    const [issuesCollapsed, setIssuesCollapsed] = useState(true)
    const [assetIssueDetails, setAssetIssueDetails] = useState([])

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

    const slimMixer = m => ({
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
    })
    const slimTractor = t => ({
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
    })
    const slimTrailer = t => ({
        id: t.id,
        status: t.status,
        lastServiceDate: t.lastServiceDate,
        plantCode: t.assignedPlant || t.plantCode,
        identifyingNumber: t.trailerNumber || t.trailer_number || t.truck_number || t.asset_number || ''
    })
    const slimEquipment = e => ({
        id: e.id,
        status: e.status,
        lastServiceDate: e.lastServiceDate,
        plantCode: e.assignedPlant || e.plantCode,
        identifyingNumber: e.identifyingNumber || e.identifying_number || e.asset_number || e.truck_number || ''
    })
    const slimPickup = p => ({id: p.id, status: p.status, plantCode: p.assignedPlant || p.plantCode})
    const slimOperator = o => ({id: o.id, employeeId: o.employeeId, status: o.status, plantCode: o.plantCode})

    const isServiceOverdue = date => {
        if (!date) return false
        const diff = Math.ceil((Date.now() - new Date(date).getTime()) / 86400000)
        return diff > 90
    }

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
        let mixersAvailable = 0, tractorsAvailable = 0, trailersAvailable = 0, equipmentAvailable = 0,
            pickupsAvailable = 0
        if (!isAggregate) {
            for (const m of allMixersRef.current) {
                if (!consider(m.plantCode)) continue
                if (m.status !== 'Retired') {
                    mixersTotals.total++
                    mixersAvailable++
                }
                if (m.status === 'Active') mixersTotals.active++; else if (m.status === 'Spare') mixersTotals.spare++; else if (m.status === 'In Shop') mixersTotals.shop++
                if (isServiceOverdue(m.lastServiceDate)) mixersTotals.overdue++
                if (m.status !== 'Retired' && VerifiedUtility.isVerified(m.updatedLast, m.updatedAt, m.updatedBy)) mixersTotals.verified++
                if (m.assignedOperator) mixerAssignedIds.add(m.assignedOperator)
                const mc = counts.mixers[m.id]
                if (mc) {
                    mixersTotals.issues += mc.issues || 0;
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
            if (t.status === 'Active') tractorsTotals.active++; else if (t.status === 'Spare') tractorsTotals.spare++; else if (t.status === 'In Shop') tractorsTotals.shop++
            if (isServiceOverdue(t.lastServiceDate)) tractorsTotals.overdue++
            if (t.status !== 'Retired' && VerifiedUtility.isVerified(t.updatedLast, t.updatedAt, t.updatedBy)) tractorsTotals.verified++
            if (t.assignedOperator) tractorAssignedIds.add(t.assignedOperator)
            const tc = counts.tractors[t.id]
            if (tc) {
                tractorsTotals.issues += tc.issues || 0;
                tractorsTotals.comments += tc.comments || 0
            }
        }
        for (const r of allTrailersRef.current) {
            if (!consider(r.plantCode)) continue
            if (r.status !== 'Retired') {
                trailersTotals.total++
                trailersAvailable++
            }
            if (r.status === 'Active') trailersTotals.active++; else if (r.status === 'Spare') trailersTotals.spare++; else if (r.status === 'In Shop') trailersTotals.shop++
            if (isServiceOverdue(r.lastServiceDate)) trailersTotals.overdue++
            const rc = counts.trailers[r.id]
            if (rc) {
                trailersTotals.issues += rc.issues || 0;
                trailersTotals.comments += rc.comments || 0
            }
        }
        for (const e of allEquipmentRef.current) {
            if (!consider(e.plantCode)) continue
            if (e.status !== 'Retired') {
                equipmentTotals.total++
                equipmentAvailable++
            }
            if (e.status === 'Active') equipmentTotals.active++; else if (e.status === 'Spare') equipmentTotals.spare++; else if (e.status === 'In Shop') equipmentTotals.shop++
            if (isServiceOverdue(e.lastServiceDate)) equipmentTotals.overdue++
            const ec = counts.equipment[e.id]
            if (ec) {
                equipmentTotals.issues += ec.issues || 0;
                equipmentTotals.comments += ec.comments || 0
            }
        }
        for (const p of allPickupsRef.current) {
            if (!consider(p.plantCode)) continue
            if (p.status !== 'Retired') {
                pickupsTotals.total++
                pickupsAvailable++
            }
            if (p.status === 'Active') pickupsTotals.active++; else if (p.status === 'In Shop') pickupsTotals.shop++; else if (p.status === 'Stationary') pickupsTotals.stationary++; else if (p.status === 'Spare') pickupsTotals.spare++; else if (p.status === 'Sold') pickupsTotals.sold++; else if (p.status === 'Retired') pickupsTotals.retired++
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
        setStats(s => ({
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
        }))
        prevSnapshotRef.current = {fleet: fleetTotal}
    }, [dashboardPlant, regionPlants, allPlants])

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
                counts.mixers[r.mixer_id] = counts.mixers[r.mixer_id] || {issues: 0, comments: 0};
                counts.mixers[r.mixer_id].issues++;
                const a = mixersMap.get(r.mixer_id);
                const ident = a?.truckNumber || a?.vin || '';
                const raw = r.description || r.issue || r.details || r.notes || r.note || r.text || r.comment || '';
                const desc = GrammarUtility.cleanDescription(raw || 'Issue');
                issueDetails.push({
                    type: 'Mixer',
                    assetId: r.mixer_id,
                    identifier: ident,
                    plant: a?.plantCode || '',
                    description: desc || 'Issue'
                });
            })
            ;(mCom.data || []).forEach(r => {
                counts.mixers[r.mixer_id] = counts.mixers[r.mixer_id] || {issues: 0, comments: 0};
                counts.mixers[r.mixer_id].comments++
            })
            ;(tMaint.data || []).forEach(r => {
                counts.tractors[r.tractor_id] = counts.tractors[r.tractor_id] || {issues: 0, comments: 0};
                counts.tractors[r.tractor_id].issues++;
                const a = tractorsMap.get(r.tractor_id);
                const ident = a?.truckNumber || a?.vin || '';
                const raw = r.description || r.issue || r.details || r.notes || r.note || r.text || r.comment || '';
                const desc = GrammarUtility.cleanDescription(raw || 'Issue');
                issueDetails.push({
                    type: 'Tractor',
                    assetId: r.tractor_id,
                    identifier: ident,
                    plant: a?.plantCode || '',
                    description: desc || 'Issue'
                });
            })
            ;(tCom.data || []).forEach(r => {
                counts.tractors[r.tractor_id] = counts.tractors[r.tractor_id] || {issues: 0, comments: 0};
                counts.tractors[r.tractor_id].comments++
            })
            ;(trMaint.data || []).forEach(r => {
                counts.trailers[r.trailer_id] = counts.trailers[r.trailer_id] || {issues: 0, comments: 0};
                counts.trailers[r.trailer_id].issues++;
                const a = trailersMap.get(r.trailer_id);
                const ident = a?.identifyingNumber || '';
                const raw = r.description || r.issue || r.details || r.notes || r.note || r.text || r.comment || '';
                const desc = GrammarUtility.cleanDescription(raw || 'Issue');
                issueDetails.push({
                    type: 'Trailer',
                    assetId: r.trailer_id,
                    identifier: ident,
                    plant: a?.plantCode || '',
                    description: desc || 'Issue'
                });
            })
            ;(trCom.data || []).forEach(r => {
                counts.trailers[r.trailer_id] = counts.trailers[r.trailer_id] || {issues: 0, comments: 0};
                counts.trailers[r.trailer_id].comments++
            })
            ;(eMaint.data || []).forEach(r => {
                counts.equipment[r.equipment_id] = counts.equipment[r.equipment_id] || {issues: 0, comments: 0};
                counts.equipment[r.equipment_id].issues++;
                const a = equipmentMap.get(r.equipment_id);
                const ident = a?.identifyingNumber || '';
                const raw = r.description || r.issue || r.details || r.notes || r.note || r.text || r.comment || '';
                const desc = GrammarUtility.cleanDescription(raw || 'Issue');
                issueDetails.push({
                    type: 'Equipment',
                    assetId: r.equipment_id,
                    identifier: ident,
                    plant: a?.plantCode || '',
                    description: desc || 'Issue'
                });
            })
            ;(eCom.data || []).forEach(r => {
                counts.equipment[r.equipment_id] = counts.equipment[r.equipment_id] || {issues: 0, comments: 0};
                counts.equipment[r.equipment_id].comments++
            })
            countsRef.current = counts
            setAssetIssueDetails(issueDetails)
            computeStats()
        } catch {
        }
    }, [computeStats])

    useEffect(() => {
        let cancelled = false
        let intervalId

        async function initBase() {
            const isInitial = initialLoadRef.current
            if (isInitial) {
                setLoading(true)
            } else {
                setRefreshing(true)
            }
            setError('')
            try {
                const allPlants = await ReportService.fetchPlantsSorted().catch(() => [])
                if (cancelled) return
                setAllPlantsCount(Array.isArray(allPlants) ? allPlants.length : 0)
                setAllPlants(allPlants)
                const {data: sessionData} = await supabase.auth.getSession()
                const uid = sessionData?.session?.user?.id || sessionStorage.getItem('userId') || ''
                let allPerm = false
                try {
                    allPerm = await UserService.hasPermission(uid, 'region.select.all').catch(() => false)
                } catch {
                }
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
                const totalAggregateLocations = aggregatePlantsArrays.flat().length
                setTotalAggregateLocations(totalAggregateLocations)
                setTotalPlantsExcludingAggregate(allPlantsCount - totalAggregateLocations)
                if (!dashboardRegionCode && regionsList.length) {
                    const selectedCode = preferences.selectedRegion?.code
                    if (selectedCode) {
                        setDashboardRegionCode(selectedCode)
                        setDashboardRegionName(preferences.selectedRegion?.name || '')
                    } else {
                        const first = regionsList[0]
                        setDashboardRegionCode(first.regionCode)
                        setDashboardRegionName(first.regionName)
                    }
                }
            } catch (error) {
                console.error('Error loading dashboard base data:', error)
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
    }, [dashboardRegionCode])

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
                        }
                    }
                } catch {
                }
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
                } catch {
                }
            } catch (error) {
                console.error('Error loading dashboard assets:', error)
                if (!cancelled && !lastUpdated) setError('Failed to load dashboard data')
            } finally {
                if (!cancelled) {
                    setLoading(false)
                    setRefreshing(false)
                    setTimeout(() => {
                        setDataReady(true)
                    }, 2000)
                }
            }
        }

        fetchAssets()
        return () => {
            cancelled = true
        }
    }, [refreshKey, computeStats])

    useEffect(() => {
        applyFilters()
    }, [dashboardPlant, regionPlants, applyFilters])
    useEffect(() => {
        if (!loading) fetchIssueCommentCounts()
    }, [stats.fleetTotal, loading, fetchIssueCommentCounts])

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
    const diffBadge = current => {
        const prev = prevSnapshotRef.current?.fleet
        if (prev == null) return null
        const diff = current - prev
        if (!diff) return null
        const up = diff > 0
        return <span className={up ? 'delta-indicator up' : 'delta-indicator down'}
                     title={`Change since last refresh: ${diff}`}>{up ? '▲' : '▼'}{Math.abs(diff)}</span>
    }

    const onRegionChange = e => {
        const code = e.target.value
        if (!code && !hasAllRegionsPermission) return
        setDataReady(false)
        if (!code && hasAllRegionsPermission) {
            setDashboardRegionCode('')
            setDashboardRegionName('')
            setDashboardPlant('')
            updatePreferences('selectedRegion', {code: '', name: '', type: ''})
            return
        }
        const r = permittedRegions.find(x => (x.regionCode || x.region_code) === code)
        if (r) {
            setDashboardRegionCode(r.regionCode || r.region_code)
            setDashboardRegionName(r.regionName || r.region_name || '')
            updatePreferences('selectedRegion', {
                code: r.regionCode || r.region_code,
                name: r.regionName || r.region_name || '',
                type: r.type || r.region_type || ''
            })
        }
        setDashboardPlant('')
    }
    const onPlantChange = e => setDashboardPlant(e.target.value)
    const onRetry = () => setRefreshKey(v => v + 1)
    const onRefresh = () => {
        setRefreshing(true);
        setRefreshKey(prev => prev + 1);
        setTimeout(() => setRefreshing(false), 1000);
    }
    const timeAgo = d => {
        if (!d) return ''
        const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
        if (diff < 60) return 'just now'
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
        return `${Math.floor(diff / 86400)}d ago`
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
    const assetIssuesRows = useMemo(() => {
        const plantSet = plantSetRef.current
        const filterActive = plantSet.size > 0
        let list = assetIssueDetails.filter(r => !filterActive || plantSet.has(String(r.plant || '').trim()))
        const region = RegionService.getRegionByCode(dashboardRegionCode)
        const isAggregate = region?.type === 'Aggregate'
        if (isAggregate) {
            list = list.filter(r => r.type !== 'Mixer')
        }
        list.forEach(r => {
            if (!r.identifier) r.identifier = '-'
        })
        return list.sort((a, b) => a.type.localeCompare(b.type) || String(a.identifier).localeCompare(String(b.identifier)) || String(a.assetId).localeCompare(String(b.assetId)))
    }, [assetIssueDetails, dashboardPlant, regionPlants, refreshKey, dashboardRegionCode])

    const selectedRegion = RegionService.getRegionByCode(dashboardRegionCode)
    const isAggregate = selectedRegion?.type === 'Aggregate'

    return (
        <div className="global-dashboard-container dashboard-container" data-filtering={isFiltering || undefined}>
            <div className="dashboard-header">
                <h1>Dashboard</h1>
                <div className="dashboard-actions">
                    <div className="toolbar-group">
                        <button className="dashboard-refresh-btn" onClick={onRefresh} disabled={refreshing}
                                aria-label="Refresh">
                            <i className={`fas fa-sync ${refreshing ? 'spinning' : ''}`}></i> Refresh
                        </button>
                        <select className="ios-select" value={dashboardRegionCode} onChange={onRegionChange}
                                disabled={refreshing} aria-label="Region">
                            {hasAllRegionsPermission && <option value="">All Regions</option>}
                            {permittedRegions.map(r => <option key={r.regionCode}
                                                               value={r.regionCode}>{r.regionName} ({r.regionCode})</option>)}
                        </select>
                        {dashboardRegionCode && selectedRegion?.type !== 'Office' && (
                            <button className="ios-select" onClick={() => setPlantModalOpen(true)} disabled={refreshing}
                                    aria-label="Plant">
                                {dashboardPlant ? regionPlants.find(p => (p.plantCode || p.plant_code) === dashboardPlant)?.plantName || dashboardPlant : 'All Plants'}
                            </button>
                        )}
                    </div>
                    <div className="toolbar-group">
                        {isFiltering && <div className="filtering-indicator">Filtering</div>}
                    </div>
                </div>
            </div>
            <div className="dashboard-hero simple slide-in-hero">
                <div className="hero-left">
                    <div className="hero-region">
                        <div className="hero-region-name">{showSkeleton ? <div className="skeleton-line w60"/> : regionDisplayName}</div>
                        <div className="hero-region-sub">{showSkeleton ? <div className="skeleton-line w40"/> : heroRegionSub}</div>
                    </div>
                    <div className="hero-metrics compact">
                        {showSkeleton ? (
                            <>
                                <div className="hero-metric skeleton-card">
                                    <div className="skeleton-line w40"/>
                                    <div className="skeleton-line w60 tall"/>
                                    <div className="skeleton-line w30"/>
                                </div>
                                <div className="hero-metric skeleton-card">
                                    <div className="skeleton-line w40"/>
                                    <div className="skeleton-line w60 tall"/>
                                    <div className="skeleton-line w30"/>
                                </div>
                                <div className="hero-metric skeleton-card">
                                    <div className="skeleton-line w40"/>
                                    <div className="skeleton-line w60 tall"/>
                                    <div className="skeleton-line w30"/>
                                </div>
                                <div className="hero-metric wide skeleton-card">
                                    <div className="skeleton-line w40"/>
                                    <div className="skeleton-line w60 tall"/>
                                    <div className="skeleton-line w30"/>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="hero-metric">
                                    <div className="metric-label">Fleet</div>
                                    <div className="metric-value">{stats.fleetTotal}{diffBadge(stats.fleetTotal)}</div>
                                    <div className="metric-sub">Total Assets</div>
                                </div>
                                <div className="hero-metric">
                                    <div className="metric-label">Asset Allocation</div>
                                    <div className="metric-value">{stats.overallAllocationPercent}%</div>
                                    <div className="metric-sub">Overall Asset Allocation</div>
                                </div>
                                <div className="hero-metric">
                                    <div className="metric-label">Overdue</div>
                                    <div className="metric-value">{stats.overdueTotal}</div>
                                    <div className="metric-sub">Service Overdue</div>
                                </div>
                                <div className="hero-metric wide">
                                    <div className="metric-label">Verified</div>
                                    <div className="metric-value">{stats.verificationAverage}%</div>
                                    <div className="metric-sub">Overall Verification</div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            {error && <div className="error-banner">
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8}}>
                    <span>{error}</span>
                    <button className="btn danger ghost" onClick={onRetry}>Retry</button>
                </div>
            </div>}
            <div className="global-content-container content-container" aria-busy={showSkeleton}>
                {showSkeleton ? (
                    <div className="group-grid">
                        <div className="group-section">
                            <div className="section-title">Fleet</div>
                            <div className="dashboard-grid inner-grid">
                                {Array.from({length: 5}).map((_, i) => (
                                    <div className="kpi-card skeleton-card" key={`fleet-${i}`}>
                                        <div className="skeleton-line w40"/>
                                        <div className="skeleton-line w60 tall"/>
                                        <div className="skeleton-row">
                                            <div className="skeleton-pill w30"/>
                                            <div className="skeleton-pill w20"/>
                                            <div className="skeleton-pill w25"/>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="group-section">
                            <div className="section-title">People</div>
                            <div className="dashboard-grid inner-grid">
                                {Array.from({length: 2}).map((_, i) => (
                                    <div className="kpi-card skeleton-card" key={`people-${i}`}>
                                        <div className="skeleton-line w40"/>
                                        <div className="skeleton-line w60 tall"/>
                                        <div className="skeleton-row">
                                            <div className="skeleton-pill w30"/>
                                            <div className="skeleton-pill w20"/>
                                            <div className="skeleton-pill w25"/>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="training-table-wrapper skeleton-card">
                                <div className="skeleton-line w60"/>
                                <div className="skeleton-line w40"/>
                                <div className="skeleton-line w30"/>
                            </div>
                            <div className="training-table-wrapper skeleton-card">
                                <div className="skeleton-line w60"/>
                                <div className="skeleton-line w40"/>
                                <div className="skeleton-line w30"/>
                            </div>
                            <div className="training-table-wrapper skeleton-card">
                                <div className="skeleton-line w60"/>
                                <div className="skeleton-line w40"/>
                                <div className="skeleton-line w30"/>
                            </div>
                        </div>
                        <div className="group-section">
                            <div className="section-title">Maintenance & Quality</div>
                            <div className="dashboard-grid inner-grid">
                                {Array.from({length: 2}).map((_, i) => (
                                    <div className="kpi-card skeleton-card" key={`maintenance-${i}`}>
                                        <div className="skeleton-line w40"/>
                                        <div className="skeleton-line w60 tall"/>
                                        <div className="skeleton-row">
                                            <div className="skeleton-pill w30"/>
                                            <div className="skeleton-pill w20"/>
                                            <div className="skeleton-pill w25"/>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="training-table-wrapper skeleton-card">
                                <div className="skeleton-line w60"/>
                                <div className="skeleton-line w40"/>
                                <div className="skeleton-line w30"/>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="group-grid">
                        <div className="group-section slide-in-section">
                            <div className="section-title">Fleet</div>
                            <div className="dashboard-grid inner-grid">
                                {!isAggregate && (
                                    <div
                                        className={`kpi-card slide-in-card ${selectedRegion?.type === 'Concrete' ? 'prominent' : ''}`}>
                                        <div className="kpi-title">Mixers</div>
                                        <div className="kpi-value">{stats.mixers.total}</div>
                                        <div className="kpi-row">
                                            <div className="kpi-pill">Active {stats.mixers.active}</div>
                                            <div className="kpi-pill">Spare {stats.mixers.spare}</div>
                                            <div className="kpi-pill">In Shop {stats.mixers.shop}</div>
                                            <div className="kpi-pill">Verified {stats.mixers.verifiedPercent}%</div>
                                            <div className="kpi-pill">Asset Allocation {stats.mixers.allocationPercent}%
                                            </div>
                                            <div className="kpi-pill">Issues {stats.mixers.issues}</div>
                                            <div className="kpi-pill">Comments {stats.mixers.comments}</div>
                                        </div>
                                    </div>
                                )}
                                <div className={`kpi-card slide-in-card ${selectedRegion?.type === 'Aggregate' ? 'prominent' : ''}`}>
                                    <div className="kpi-title">Tractors</div>
                                    <div className="kpi-value">{stats.tractors.total}</div>
                                    <div className="kpi-row">
                                        <div className="kpi-pill">Active {stats.tractors.active}</div>
                                        <div className="kpi-pill">Spare {stats.tractors.spare}</div>
                                        <div className="kpi-pill">In Shop {stats.tractors.shop}</div>
                                        <div className="kpi-pill">Verified {stats.tractors.verifiedPercent}%</div>
                                        <div className="kpi-pill">Asset Allocation {stats.tractors.allocationPercent}%
                                        </div>
                                        <div className="kpi-pill">Issues {stats.tractors.issues}</div>
                                        <div className="kpi-pill">Comments {stats.tractors.comments}</div>
                                    </div>
                                </div>
                                <div className="kpi-card slide-in-card">
                                    <div className="kpi-title">Trailers</div>
                                    <div className="kpi-value">{stats.trailers.total}</div>
                                    <div className="kpi-row">
                                        <div className="kpi-pill">Active {stats.trailers.active}</div>
                                        <div className="kpi-pill">Spare {stats.trailers.spare}</div>
                                        <div className="kpi-pill">In Shop {stats.trailers.shop}</div>
                                        <div className="kpi-pill">Asset Allocation {stats.trailers.allocationPercent}%
                                        </div>
                                        <div className="kpi-pill">Issues {stats.trailers.issues}</div>
                                        <div className="kpi-pill">Comments {stats.trailers.comments}</div>
                                    </div>
                                </div>
                                <div className="kpi-card slide-in-card">
                                    <div className="kpi-title">Equipment</div>
                                    <div className="kpi-value">{stats.equipment.total}</div>
                                    <div className="kpi-row">
                                        <div className="kpi-pill">Active {stats.equipment.active}</div>
                                        <div className="kpi-pill">Spare {stats.equipment.spare}</div>
                                        <div className="kpi-pill">In Shop {stats.equipment.shop}</div>
                                        <div className="kpi-pill">Asset
                                            Allocation {stats.equipment.allocationPercent}%
                                        </div>
                                        <div className="kpi-pill">Issues {stats.equipment.issues}</div>
                                        <div className="kpi-pill">Comments {stats.equipment.comments}</div>
                                    </div>
                                </div>
                                <div className="kpi-card slide-in-card">
                                    <div className="kpi-title">Pickup Trucks</div>
                                    <div className="kpi-value">{stats.pickups.total}</div>
                                    <div className="kpi-row">
                                        <div className="kpi-pill">Active {stats.pickups.active}</div>
                                        <div className="kpi-pill">In Shop {stats.pickups.shop}</div>
                                        <div className="kpi-pill">Stationary {stats.pickups.stationary}</div>
                                        <div className="kpi-pill">Spare {stats.pickups.spare}</div>
                                        <div className="kpi-pill">Sold {stats.pickups.sold}</div>
                                        <div className="kpi-pill">Retired {stats.pickups.retired}</div>
                                        <div className="kpi-pill">Asset Allocation {stats.pickups.allocationPercent}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="group-section slide-in-section">
                            <div className="section-title">People</div>
                            <div className="dashboard-grid inner-grid">
                                <div className="kpi-card slide-in-card">
                                    <div className="kpi-title">Operators</div>
                                    <div className="kpi-value">{stats.operators.total}</div>
                                    <div className="kpi-row">
                                        <div className="kpi-pill">Active {stats.operators.active}</div>
                                        <div className="kpi-pill">Light Duty {stats.operators.lightDuty}</div>
                                        <div className="kpi-pill">Assigned {stats.operators.assigned}</div>
                                        {!isAggregate && <div className="kpi-pill">Mixers
                                            Assigned {stats.operators.mixerAssigned}</div>}
                                        <div className="kpi-pill">Tractors
                                            Assigned {stats.operators.tractorAssigned}</div>
                                        <div className="kpi-pill">Unassigned {stats.operators.unassigned}</div>
                                        <div className="kpi-pill">Pending Start {stats.operators.pending}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="training-table-wrapper">
                                <div className="training-table-header">
                                    <div className="training-table-title">Operators In Training
                                        ({filteredTrainingOperators.length})
                                    </div>
                                    <button type="button" className="training-toggle" aria-expanded={!trainingCollapsed}
                                            onClick={() => setTrainingCollapsed(v => !v)}
                                            disabled={!filteredTrainingOperators.length}>{trainingCollapsed ? 'Expand' : 'Collapse'}</button>
                                </div>
                                {!trainingCollapsed && (
                                    filteredTrainingOperators.length > 0 ? (
                                        <div className="training-table-scroll">
                                            <table className="training-table">
                                                <thead>
                                                <tr>
                                                    <th>Plant (Training At)</th>
                                                    <th>Operator</th>
                                                    <th>Trainer</th>
                                                    <th>Position</th>
                                                    <th>Plant (Training For)</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {filteredTrainingOperators.map(r => <tr key={r.id}>
                                                    <td>{r.trainerPlant || '-'}</td>
                                                    <td>{r.operatorName || '-'}</td>
                                                    <td>{r.trainerName || '-'}</td>
                                                    <td>{r.operatorPosition || '-'}</td>
                                                    <td>{r.operatorPlant || '-'}</td>
                                                </tr>)}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="training-empty">None</div>
                                    )
                                )}
                            </div>
                            <div className="training-table-wrapper">
                                <div className="training-table-header">
                                    <div className="training-table-title">Pending Start Operators
                                        ({filteredPendingStartOperators.length})
                                    </div>
                                    <button type="button" className="training-toggle" aria-expanded={!pendingCollapsed}
                                            onClick={() => setPendingCollapsed(v => !v)}
                                            disabled={!filteredPendingStartOperators.length}>{pendingCollapsed ? 'Expand' : 'Collapse'}</button>
                                </div>
                                {!pendingCollapsed && (
                                    filteredPendingStartOperators.length > 0 ? (
                                        <div className="training-table-scroll">
                                            <table className="training-table">
                                                <thead>
                                                <tr>
                                                    <th>Plant (Training At)</th>
                                                    <th>Operator</th>
                                                    <th>Plant (Training For)</th>
                                                    <th>Pending Start Date</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {filteredPendingStartOperators.map(r => <tr key={r.id}>
                                                    <td>{r.trainerPlant || '-'}</td>
                                                    <td>{r.operatorName || '-'}</td>
                                                    <td>{r.operatorPlant || '-'}</td>
                                                    <td>{formatPendingDate(r.pendingDate)}</td>
                                                </tr>)}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="training-empty">None</div>
                                    )
                                )}
                            </div>
                            <div className="training-table-wrapper">
                                <div className="training-table-header">
                                    <div className="training-table-title">Light Duty Operators
                                        ({filteredLightDutyOperators.length})
                                    </div>
                                    <button type="button" className="training-toggle"
                                            aria-expanded={!lightDutyCollapsed}
                                            onClick={() => setLightDutyCollapsed(v => !v)}
                                            disabled={!filteredLightDutyOperators.length}>{lightDutyCollapsed ? 'Expand' : 'Collapse'}</button>
                                </div>
                                {!lightDutyCollapsed && (
                                    filteredLightDutyOperators.length > 0 ? (
                                        <div className="training-table-scroll">
                                            <table className="training-table">
                                                <thead>
                                                <tr>
                                                    <th>Plant</th>
                                                    <th>Operator</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {filteredLightDutyOperators.map(r => <tr key={r.id}>
                                                    <td>{r.plant || '-'}</td>
                                                    <td>{r.operatorName || '-'}</td>
                                                </tr>)}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="training-empty">None</div>
                                    )
                                )}
                            </div>
                        </div>
                        <div className="group-section slide-in-section">
                            <div className="section-title">Maintenance & Quality</div>
                            <div className="dashboard-grid inner-grid">
                                <div className="kpi-card slide-in-card">
                                    <div className="kpi-title">Service Overdue</div>
                                    <div className="kpi-value">{stats.overdueTotal}</div>
                                    <div className="kpi-row">
                                        <div className="kpi-pill">Mixers {stats.mixers.overdue}</div>
                                        <div className="kpi-pill">Tractors {stats.tractors.overdue}</div>
                                        <div className="kpi-pill">Trailers {stats.trailers.overdue}</div>
                                        <div className="kpi-pill">Equipment {stats.equipment.overdue}</div>
                                    </div>
                                </div>
                                <div className="kpi-card slide-in-card">
                                    <div className="kpi-title">Open Issues</div>
                                    <div className="kpi-value">{stats.openIssuesTotal}</div>
                                    <div className="kpi-row">
                                        <div className="kpi-pill">Mixers {stats.mixers.issues}</div>
                                        <div className="kpi-pill">Tractors {stats.tractors.issues}</div>
                                        <div className="kpi-pill">Trailers {stats.trailers.issues}</div>
                                        <div className="kpi-pill">Equipment {stats.equipment.issues}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="training-table-wrapper">
                                <div className="training-table-header">
                                    <div className="training-table-title">Asset Issues ({assetIssuesRows.length})</div>
                                    <button type="button" className="training-toggle" aria-expanded={!issuesCollapsed}
                                            onClick={() => setIssuesCollapsed(v => !v)}
                                            disabled={!assetIssuesRows.length}>{issuesCollapsed ? 'Expand' : 'Collapse'}</button>
                                </div>
                                {!issuesCollapsed && (
                                    assetIssuesRows.length > 0 ? (
                                        <div className="training-table-scroll">
                                            <table className="training-table asset-issues-table">
                                                <thead>
                                                <tr>
                                                    <th>Asset Type</th>
                                                    <th>Truck/VIN</th>
                                                    <th>Plant</th>
                                                    <th className="issue-desc-col">Issue</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {assetIssuesRows.map(r => <tr
                                                    key={r.type + ':' + r.assetId + ':' + r.description.slice(0, 30)}>
                                                    <td>{r.type}</td>
                                                    <td>{r.identifier || '-'}</td>
                                                    <td>{r.plant || '-'}</td>
                                                    <td className="issue-desc"
                                                        title={r.description || 'Issue'}>{r.description || 'Issue'}</td>
                                                </tr>)}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="training-empty">None</div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <PlantDropdownModal isOpen={plantModalOpen} onClose={() => setPlantModalOpen(false)} plants={regionPlants}
                                onSelect={(plantCode) => setDashboardPlant(plantCode)} showAllPlants={true}/>
        </div>
    )
}

