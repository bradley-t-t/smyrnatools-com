import React, { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { usePreferences } from '../../app/context/PreferencesContext'
import PlantDropdownModal from '../../components/common/PlantDropdownModal'
import { AIService } from '../../services/AIService'
import { supabase } from '../../services/DatabaseService'
import { EquipmentService } from '../../services/EquipmentService'
import { MixerService } from '../../services/MixerService'
import { OperatorService } from '../../services/OperatorService'
import { PickupTruckService } from '../../services/PickupTruckService'
import { RegionService } from '../../services/RegionService'
import { ReportService } from '../../services/ReportService'
import { TractorService } from '../../services/TractorService'
import TrailerService from '../../services/TrailerService'
import { UserService } from '../../services/UserService'
import DashboardUtility from '../../utils/DashboardUtility'
import GrammarUtility from '../../utils/GrammarUtility'
import LeaderboardsUtility from '../../utils/LeaderboardsUtility'
import VerifiedUtility from '../../utils/VerifiedUtility'
import EquipmentsView from '../equipment/EquipmentsView'
import MixersView from '../mixers/MixersView'
import OperatorsView from '../operators/OperatorsView'
import TractorsView from '../tractors/TractorsView'
import TrailersView from '../trailers/TrailersView'
import DashboardCharts from './DashboardCharts'
import DashboardPlantSummary from './DashboardPlantSummary'

export default function DashboardView() {
    const { preferences } = usePreferences()
    const [loading, setLoading] = useState(true)
    const [dataReady, setDataReady] = useState(false)
    const [historyLoaded, setHistoryLoaded] = useState(false)
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
    const [isPlantManager, setIsPlantManager] = useState(false)
    const [userRoleWeight, setUserRoleWeight] = useState(0)
    const [userRoleName, setUserRoleName] = useState('')
    const [userPlantCode, setUserPlantCode] = useState('')
    const [aiDisplayText, setAiDisplayText] = useState('')
    const [aiActionPlan, setAiActionPlan] = useState([])
    const [isTypingComplete, setIsTypingComplete] = useState(false)
    const [showActionPlan, setShowActionPlan] = useState(false)
    const [embeddedView, setEmbeddedView] = useState(null)
    const [embeddedViewSearch, setEmbeddedViewSearch] = useState('')
    const [expandedSections, setExpandedSections] = useState({
        assetsWithIssues: false,
        longTermShop: false,
        overdueService: false,
        pendingOperators: false,
        trainingOperators: false,
        unassignedOperators: false,
        unverifiedMixers: false
    })
    const [plantNotifications, setPlantNotifications] = useState({
        aiSummary: null,
        aiSummaryFailed: false,
        aiSummaryLoading: false,
        assetsWithMostIssues: [],
        leaderboardMetrics: null,
        longTermShopAssets: [],
        overdueService: [],
        pendingOperators: [],
        shopIssue: null,
        totalOpenIssues: 0,
        totalResolvedIssues: 0,
        trainingOperators: [],
        unassignedOperators: [],
        unverifiedMixers: []
    })
    const [stats, setStats] = useState({
        equipment: { active: 0, allocationPercent: 0, comments: 0, issues: 0, overdue: 0, shop: 0, spare: 0, total: 0 },
        fleetTotal: 0,
        mixers: {
            active: 0,
            allocationPercent: 0,
            comments: 0,
            issues: 0,
            overdue: 0,
            shop: 0,
            spare: 0,
            total: 0,
            verified: 0,
            verifiedPercent: 0
        },
        openIssuesTotal: 0,
        operators: {
            active: 0,
            assigned: 0,
            lightDuty: 0,
            mixerAssigned: 0,
            pending: 0,
            total: 0,
            tractorAssigned: 0,
            unassigned: 0
        },
        overallAllocationPercent: 0,
        overdueTotal: 0,
        pickups: { active: 0, allocationPercent: 0, retired: 0, shop: 0, sold: 0, spare: 0, stationary: 0, total: 0 },
        tractors: {
            active: 0,
            allocationPercent: 0,
            comments: 0,
            issues: 0,
            overdue: 0,
            shop: 0,
            spare: 0,
            total: 0,
            verified: 0,
            verifiedPercent: 0
        },
        trailers: { active: 0, allocationPercent: 0, comments: 0, issues: 0, overdue: 0, shop: 0, spare: 0, total: 0 },
        verificationAverage: 0
    })
    const [trainingOperators, setTrainingOperators] = useState([])
    const [trainingCollapsed, setTrainingCollapsed] = useState(true)
    const [pendingStartOperators, setPendingStartOperators] = useState([])
    const [pendingCollapsed, setPendingCollapsed] = useState(true)
    const [lightDutyOperators, setLightDutyOperators] = useState([])
    const [lightDutyCollapsed, setLightDutyCollapsed] = useState(true)
    const [assetIssueDetails, setAssetIssueDetails] = useState([])
    const [statusHistoryData, setStatusHistoryData] = useState({
        equipment: [],
        mixers: [],
        pickups: [],
        tractors: [],
        trailers: []
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
    const countsRef = useRef({ equipment: {}, mixers: {}, tractors: {}, trailers: {} })
    const historyRecordsRef = useRef({
        equipment: [],
        mixers: [],
        pickups: [],
        tractors: [],
        trailers: []
    })

    const computeStats = useCallback(() => {
        const region = RegionService.getRegionByCode(dashboardRegionCode)
        const isOffice = region?.type === 'Office'
        const isAggregate = region?.type === 'Aggregate'
        const plantSet = new Set()
        if (isOffice) {
            allPlants.forEach((p) => {
                const c = p.plantCode || p.plant_code
                if (c) plantSet.add(String(c).trim())
            })
        } else {
            if (dashboardPlant) plantSet.add(String(dashboardPlant).trim())
            else
                (regionPlants || []).forEach((p) => {
                    const c = p.plantCode || p.plant_code
                    if (c) plantSet.add(String(c).trim())
                })
        }
        plantSetRef.current = plantSet
        const filterActive = plantSet.size > 0
        let mixersTotals = { active: 0, comments: 0, issues: 0, overdue: 0, shop: 0, spare: 0, total: 0, verified: 0 }
        let tractorsTotals = {
            active: 0,
            comments: 0,
            freight: {
                Aggregate: { active: 0, shop: 0, spare: 0, total: 0 },
                Cement: { active: 0, shop: 0, spare: 0, total: 0 },
                'Dump Truck': { active: 0, shop: 0, spare: 0, total: 0 },
                Other: { active: 0, shop: 0, spare: 0, total: 0 }
            },
            issues: 0,
            overdue: 0,
            shop: 0,
            spare: 0,
            total: 0,
            verified: 0
        }
        let trailersTotals = {
            active: 0,
            comments: 0,
            issues: 0,
            overdue: 0,
            shop: 0,
            spare: 0,
            total: 0,
            trailerType: {
                Cement: { active: 0, shop: 0, spare: 0, total: 0 },
                'End Dump': { active: 0, shop: 0, spare: 0, total: 0 }
            }
        }
        let equipmentTotals = { active: 0, comments: 0, issues: 0, overdue: 0, shop: 0, spare: 0, total: 0 }
        let pickupsTotals = { active: 0, retired: 0, shop: 0, sold: 0, spare: 0, stationary: 0, total: 0 }
        let operatorsTotals = {
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
        const consider = (plantCode) => !filterActive || plantSet.has(String(plantCode || '').trim())
        const counts = countsRef.current
        let mixersAvailable = 0,
            tractorsAvailable = 0,
            trailersAvailable = 0,
            equipmentAvailable = 0,
            pickupsAvailable = 0
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
                if (DashboardUtility.isServiceOverdue(m.lastServiceDate)) mixersTotals.overdue++
                if (m.status !== 'Retired' && VerifiedUtility.isVerified(m.updatedLast, m.updatedAt, m.updatedBy))
                    mixersTotals.verified++
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
                const freightType = t.freight && tractorsTotals.freight[t.freight] ? t.freight : 'Other'
                tractorsTotals.freight[freightType].total++
                if (t.status === 'Active') tractorsTotals.freight[freightType].active++
                else if (t.status === 'Spare') tractorsTotals.freight[freightType].spare++
                else if (t.status === 'In Shop') tractorsTotals.freight[freightType].shop++
            }
            if (t.status === 'Active') tractorsTotals.active++
            else if (t.status === 'Spare') tractorsTotals.spare++
            else if (t.status === 'In Shop') tractorsTotals.shop++
            if (DashboardUtility.isServiceOverdue(t.lastServiceDate)) tractorsTotals.overdue++
            if (t.status !== 'Retired' && VerifiedUtility.isVerified(t.updatedLast, t.updatedAt, t.updatedBy))
                tractorsTotals.verified++
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
                const tType = r.trailerType === 'End Dump' ? 'End Dump' : 'Cement'
                trailersTotals.trailerType[tType].total++
                if (r.status === 'Active') trailersTotals.trailerType[tType].active++
                else if (r.status === 'Spare') trailersTotals.trailerType[tType].spare++
                else if (r.status === 'In Shop') trailersTotals.trailerType[tType].shop++
            }
            if (r.status === 'Active') trailersTotals.active++
            else if (r.status === 'Spare') trailersTotals.spare++
            else if (r.status === 'In Shop') trailersTotals.shop++
            if (DashboardUtility.isServiceOverdue(r.lastServiceDate)) trailersTotals.overdue++
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
            if (DashboardUtility.isServiceOverdue(e.lastServiceDate)) equipmentTotals.overdue++
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
        const tractorsVerifiedPercent = tractorsAvailable
            ? Math.round((tractorsTotals.verified / tractorsAvailable) * 100)
            : 0
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
        const mixersAllocationPercent = mixersAvailable ? Math.round((mixersTotals.active / mixersAvailable) * 100) : 0
        const tractorsAllocationPercent = tractorsAvailable
            ? Math.round((tractorsTotals.active / tractorsAvailable) * 100)
            : 0
        const trailersAllocationPercent = trailersAvailable
            ? Math.round((trailersTotals.active / trailersAvailable) * 100)
            : 0
        const equipmentAllocationPercent = equipmentAvailable
            ? Math.round((equipmentTotals.active / equipmentAvailable) * 100)
            : 0
        const pickupsAllocationPercent = pickupsAvailable
            ? Math.round(((pickupsTotals.active + pickupsTotals.stationary) / pickupsAvailable) * 100)
            : 0
        let overallAvailable = 0
        if (!isAggregate) overallAvailable += mixersAvailable
        overallAvailable += tractorsAvailable + trailersAvailable + equipmentAvailable + pickupsAvailable
        let overallActiveNumerator = 0
        if (!isAggregate) overallActiveNumerator += mixersTotals.active
        overallActiveNumerator +=
            tractorsTotals.active +
            trailersTotals.active +
            equipmentTotals.active +
            pickupsTotals.active +
            pickupsTotals.stationary
        const overallAllocationPercent = overallAvailable
            ? Math.round((overallActiveNumerator / overallAvailable) * 100)
            : 0
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
    }, [dashboardPlant, regionPlants, allPlants, dashboardRegionCode])

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
            ;(mMaint.data || []).forEach((r) => {
                const isResolved = !!r.time_completed
                if (!isResolved) {
                    counts.mixers[r.mixer_id] = counts.mixers[r.mixer_id] || { comments: 0, issues: 0 }
                    counts.mixers[r.mixer_id].issues++
                }
                const a = mixersMap.get(r.mixer_id)
                const ident = a?.truckNumber || a?.vin || ''
                const raw = r.description || r.issue || r.details || r.notes || r.note || r.text || r.comment || ''
                const desc = GrammarUtility.cleanDescription(raw || 'Issue')
                issueDetails.push({
                    assetId: r.mixer_id,
                    description: desc || 'Issue',
                    identifier: ident,
                    plant: a?.plantCode || '',
                    resolved: isResolved,
                    type: 'Mixer'
                })
            })
            const mComData = mCom.data || []
            mComData.forEach((r) => {
                counts.mixers[r.mixer_id] = counts.mixers[r.mixer_id] || { comments: 0, issues: 0 }
                counts.mixers[r.mixer_id].comments++
            })
            const tMaintData = tMaint.data || []
            tMaintData.forEach((r) => {
                const isResolved = !!r.time_completed
                if (!isResolved) {
                    counts.tractors[r.tractor_id] = counts.tractors[r.tractor_id] || { comments: 0, issues: 0 }
                    counts.tractors[r.tractor_id].issues++
                }
                const a = tractorsMap.get(r.tractor_id)
                const ident = a?.truckNumber || a?.vin || ''
                const raw = r.description || r.issue || r.details || r.notes || r.note || r.text || r.comment || ''
                const desc = GrammarUtility.cleanDescription(raw || 'Issue')
                issueDetails.push({
                    assetId: r.tractor_id,
                    description: desc || 'Issue',
                    identifier: ident,
                    plant: a?.plantCode || '',
                    resolved: isResolved,
                    type: 'Tractor'
                })
            })
            const tComData = tCom.data || []
            tComData.forEach((r) => {
                counts.tractors[r.tractor_id] = counts.tractors[r.tractor_id] || { comments: 0, issues: 0 }
                counts.tractors[r.tractor_id].comments++
            })
            const trMaintData = trMaint.data || []
            trMaintData.forEach((r) => {
                const isResolved = !!r.time_completed
                if (!isResolved) {
                    counts.trailers[r.trailer_id] = counts.trailers[r.trailer_id] || { comments: 0, issues: 0 }
                    counts.trailers[r.trailer_id].issues++
                }
                const a = trailersMap.get(r.trailer_id)
                const ident = a?.identifyingNumber || ''
                const raw = r.description || r.issue || r.details || r.notes || r.note || r.text || r.comment || ''
                const desc = GrammarUtility.cleanDescription(raw || 'Issue')
                issueDetails.push({
                    assetId: r.trailer_id,
                    description: desc || 'Issue',
                    identifier: ident,
                    plant: a?.plantCode || '',
                    resolved: isResolved,
                    type: 'Trailer'
                })
            })
            const trComData = trCom.data || []
            trComData.forEach((r) => {
                counts.trailers[r.trailer_id] = counts.trailers[r.trailer_id] || { comments: 0, issues: 0 }
                counts.trailers[r.trailer_id].comments++
            })
            const eMaintData = eMaint.data || []
            eMaintData.forEach((r) => {
                const isResolved = !!r.time_completed
                if (!isResolved) {
                    counts.equipment[r.equipment_id] = counts.equipment[r.equipment_id] || { comments: 0, issues: 0 }
                    counts.equipment[r.equipment_id].issues++
                }
                const a = equipmentMap.get(r.equipment_id)
                const ident = a?.identifyingNumber || ''
                const raw = r.description || r.issue || r.details || r.notes || r.note || r.text || r.comment || ''
                const desc = GrammarUtility.cleanDescription(raw || 'Issue')
                issueDetails.push({
                    assetId: r.equipment_id,
                    description: desc || 'Issue',
                    identifier: ident,
                    plant: a?.plantCode || '',
                    resolved: isResolved,
                    type: 'Equipment'
                })
            })
            const eComData = eCom.data || []
            eComData.forEach((r) => {
                counts.equipment[r.equipment_id] = counts.equipment[r.equipment_id] || { comments: 0, issues: 0 }
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
                const { data: sessionData } = await supabase.auth.getSession()
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
                setTotalRegionsExcludingOffice(allFetched.filter((r) => r.type !== 'Office').length)
                const aggregateRegions = allFetched.filter((r) => r.type === 'Aggregate')
                const aggregatePlantsPromises = aggregateRegions.map((r) =>
                    RegionService.fetchRegionPlants(r.regionCode).catch(() => [])
                )
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
        intervalId = setInterval(() => setRefreshKey((v) => v + 1), 600000)
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
                        if (parsed && now - (parsed.savedAt || 0) < CACHE_TTL_MS) {
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
                const byId = new Map(ops.map((o) => [o.employeeId, o]))
                const training = ops
                    .filter((o) => o.status === 'Training')
                    .map((o) => {
                        const trainer = o.assignedTrainer ? byId.get(o.assignedTrainer) : null
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
                        const trainer = o.assignedTrainer ? byId.get(o.assignedTrainer) : null
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
                        CACHE_KEY,
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
    }, [refreshKey, computeStats])

    useEffect(() => {
        applyFilters()
    }, [dashboardPlant, regionPlants, applyFilters])

    useEffect(() => {
        if (!loading) fetchIssueCommentCounts()
    }, [stats.fleetTotal, loading, fetchIssueCommentCounts])

    useEffect(() => {
        const style = document.createElement('style')
        style.textContent = `
            @keyframes fadeOut {
                0% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-10px); height: 0; padding: 0; margin: 0; overflow: hidden; }
            }
            @keyframes cursorBlink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
            }
            @keyframes fadeSlideIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `
        document.head.appendChild(style)
        return () => document.head.removeChild(style)
    }, [])

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
    }, [])

    useEffect(() => {
        if (!dataReady) return

        const plantSet = plantSetRef.current
        const filterActive = plantSet.size > 0
        const consider = (plantCode) => !filterActive || plantSet.has(String(plantCode || '').trim())

        const unverifiedMixers = allMixersRef.current
            .filter(
                (m) =>
                    m.status !== 'Retired' &&
                    consider(m.plantCode) &&
                    !VerifiedUtility.isVerified(m.updatedLast, m.updatedAt, m.updatedBy)
            )
            .slice(0, 10)
            .map((m) => ({ id: m.id, plantCode: m.plantCode, truckNumber: m.truckNumber, type: 'Mixer' }))

        const pendingOps = pendingStartOperators
            .filter(
                (o) =>
                    plantSet.size === 0 ||
                    plantSet.has(String(o.operatorPlant || '').trim()) ||
                    plantSet.has(String(o.trainerPlant || '').trim())
            )
            .slice(0, 5)

        const trainingOps = trainingOperators
            .filter(
                (o) =>
                    plantSet.size === 0 ||
                    plantSet.has(String(o.operatorPlant || '').trim()) ||
                    plantSet.has(String(o.trainerPlant || '').trim())
            )
            .slice(0, 5)

        const assetsWithIssues = assetIssueDetails
            .filter((a) => {
                if (!consider(a.plant)) return false
                let asset = null
                if (a.type === 'Mixer') asset = allMixersRef.current.find((m) => m.id === a.assetId)
                else if (a.type === 'Tractor') asset = allTractorsRef.current.find((t) => t.id === a.assetId)
                else if (a.type === 'Trailer') asset = allTrailersRef.current.find((t) => t.id === a.assetId)
                else if (a.type === 'Equipment') asset = allEquipmentRef.current.find((e) => e.id === a.assetId)
                return asset && asset.status !== 'Retired'
            })
            .reduce((acc, issue) => {
                const key = `${issue.type}-${issue.assetId}`
                if (!acc[key]) acc[key] = { ...issue, openIssueCount: 0, resolvedIssueCount: 0 }
                if (issue.resolved) {
                    acc[key].resolvedIssueCount++
                } else {
                    acc[key].openIssueCount++
                }
                return acc
            }, {})
        const topIssueAssets = Object.values(assetsWithIssues)
            .filter((a) => a.openIssueCount > 0)
            .sort((a, b) => b.openIssueCount - a.openIssueCount)
            .slice(0, 5)

        const totalOpenIssues = assetIssueDetails.filter((a) => !a.resolved && consider(a.plant)).length
        const totalResolvedIssues = assetIssueDetails.filter((a) => a.resolved && consider(a.plant)).length

        const overdueAssets = [
            ...allMixersRef.current
                .filter(
                    (m) =>
                        m.status !== 'Retired' &&
                        consider(m.plantCode) &&
                        DashboardUtility.isServiceOverdue(m.lastServiceDate)
                )
                .map((m) => ({
                    id: m.id,
                    identifier: m.truckNumber,
                    lastServiceDate: m.lastServiceDate,
                    plantCode: m.plantCode,
                    type: 'Mixer'
                })),
            ...allTractorsRef.current
                .filter(
                    (t) =>
                        t.status !== 'Retired' &&
                        consider(t.plantCode) &&
                        DashboardUtility.isServiceOverdue(t.lastServiceDate)
                )
                .map((t) => ({
                    id: t.id,
                    identifier: t.truckNumber,
                    lastServiceDate: t.lastServiceDate,
                    plantCode: t.plantCode,
                    type: 'Tractor'
                })),
            ...allTrailersRef.current
                .filter(
                    (t) =>
                        t.status !== 'Retired' &&
                        consider(t.plantCode) &&
                        DashboardUtility.isServiceOverdue(t.lastServiceDate)
                )
                .map((t) => ({
                    id: t.id,
                    identifier: t.identifyingNumber,
                    lastServiceDate: t.lastServiceDate,
                    plantCode: t.plantCode,
                    type: 'Trailer'
                })),
            ...allEquipmentRef.current
                .filter(
                    (e) =>
                        e.status !== 'Retired' &&
                        consider(e.plantCode) &&
                        DashboardUtility.isServiceOverdue(e.lastServiceDate)
                )
                .map((e) => ({
                    id: e.id,
                    identifier: e.identifyingNumber,
                    lastServiceDate: e.lastServiceDate,
                    plantCode: e.plantCode,
                    type: 'Equipment'
                }))
        ].slice(0, 5)

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

        const sixDaysAgo = new Date()
        sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)

        const getLongTermShopAssets = (assets, history, type, identifierField) => {
            const inShopAssets = assets.filter((a) => a.status === 'In Shop' && consider(a.plantCode))
            return inShopAssets
                .map((asset) => {
                    const assetHistory = history
                        .filter((h) => h.asset_id === asset.id && h.new_value === 'In Shop')
                        .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
                    const lastShopEntry = assetHistory[0]
                    const shopEntryDate = lastShopEntry
                        ? new Date(lastShopEntry.changed_at)
                        : asset.updatedAt
                          ? new Date(asset.updatedAt)
                          : null
                    if (shopEntryDate && shopEntryDate <= sixDaysAgo) {
                        const daysInShop = Math.floor((Date.now() - shopEntryDate.getTime()) / 86400000)
                        return {
                            daysInShop,
                            downInYard: asset.downInYard || false,
                            enteredShop: shopEntryDate.toISOString(),
                            id: asset.id,
                            identifier: asset[identifierField] || 'Unknown',
                            plantCode: asset.plantCode,
                            type
                        }
                    }
                    return null
                })
                .filter(Boolean)
        }

        const longTermShop = [
            ...getLongTermShopAssets(allMixersRef.current, historyRecordsRef.current.mixers, 'Mixer', 'truckNumber'),
            ...getLongTermShopAssets(
                allTractorsRef.current,
                historyRecordsRef.current.tractors,
                'Tractor',
                'truckNumber'
            )
        ]
            .sort((a, b) => b.daysInShop - a.daysInShop)
            .slice(0, 5)

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
        trainingOperators
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

                const mixersData = allMixersRef.current || []
                const tractorsData = allTractorsRef.current || []
                const trailersData = allTrailersRef.current || []
                const equipmentData = allEquipmentRef.current || []
                const operatorsData = allOperatorsFullRef.current || []

                const fleetCountsByPlant = LeaderboardsUtility.calculateFleetCounts(
                    plantCodesInRegion,
                    mixersData,
                    tractorsData,
                    trailersData,
                    equipmentData,
                    operatorsData
                )

                const now = new Date()
                const currentWeekStart = new Date(now)
                currentWeekStart.setDate(now.getDate() - now.getDay())
                currentWeekStart.setHours(0, 0, 0, 0)

                const filteredReports = reports.filter((report) => {
                    const reportDate = new Date(report.week)
                    return reportDate < currentWeekStart
                })

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

                    const avgCleanlinessActual = fleetData.avgFleetCleanliness || 0
                    const mixerOperatorCount = fleetData.mixerOperators || 1
                    const hoursAdjustments = hoursAdjustmentsByPlant[plantCode] || null
                    const safetyIncidents = safetyByPlant[plantCode] || null

                    const metrics = LeaderboardsUtility.calculateMetrics(
                        plantReports,
                        avgCleanlinessActual,
                        mixerOperatorCount,
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

                if (cancelled) return

                if (plantMetrics) {
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
                }
            } catch (err) {
                console.error('Error fetching leaderboard metrics:', err)
            }
        }

        fetchLeaderboardMetrics()
        return () => {
            cancelled = true
        }
    }, [dataReady, dashboardPlant, dashboardRegionCode])

    const [forceRegenerateAI, setForceRegenerateAI] = useState(0)

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
                const filterActive = plantSet.size > 0
                const consider = (plantCode) => !filterActive || plantSet.has(String(plantCode || '').trim())

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
            } catch (err) {
                console.error('Error generating AI summary:', err)
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
        forceRegenerateAI
    ])

    useEffect(() => {
        setAiDisplayText('')
        setAiActionPlan([])
        setIsTypingComplete(false)
        setShowActionPlan(false)
    }, [dashboardPlant])

    useEffect(() => {
        if (!plantNotifications.aiSummary) {
            setAiDisplayText('')
            setAiActionPlan([])
            setIsTypingComplete(false)
            setShowActionPlan(false)
            return
        }

        const fullText = plantNotifications.aiSummary
        const separator = '---ACTION PLAN---'
        const parts = fullText.split(separator)
        const summaryText = parts[0].trim()
        const actionPlanText = parts[1] ? parts[1].trim() : ''

        const actionItems = actionPlanText
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.startsWith('-'))
            .map((line) => line.substring(1).trim())

        setAiActionPlan(actionItems)
        setShowActionPlan(false)

        let currentIndex = 0
        setAiDisplayText('')
        setIsTypingComplete(false)

        const typingInterval = setInterval(() => {
            if (currentIndex < summaryText.length) {
                setAiDisplayText(summaryText.slice(0, currentIndex + 1))
                currentIndex++
            } else {
                clearInterval(typingInterval)
                setIsTypingComplete(true)
                if (actionItems.length > 0) {
                    setTimeout(() => setShowActionPlan(true), 300)
                }
            }
        }, 15)

        return () => clearInterval(typingInterval)
    }, [plantNotifications.aiSummary])

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
            const isOffice = region?.type === 'Office'
            const plantSet = new Set()
            if (isOffice) {
                allPlants.forEach((p) => {
                    const c = p.plantCode || p.plant_code
                    if (c) plantSet.add(String(c).trim())
                })
            } else {
                if (dashboardPlant) plantSet.add(String(dashboardPlant).trim())
                else
                    (regionPlants || []).forEach((p) => {
                        const c = p.plantCode || p.plant_code
                        if (c) plantSet.add(String(c).trim())
                    })
            }
            const filterActive = plantSet.size > 0
            const consider = (plantCode) => !filterActive || plantSet.has(String(plantCode || '').trim())

            const filteredMixers = allMixersRef.current.filter((m) => m.status !== 'Retired' && consider(m.plantCode))
            const filteredTractors = allTractorsRef.current.filter(
                (t) => t.status !== 'Retired' && consider(t.plantCode)
            )
            const filteredTrailers = allTrailersRef.current.filter(
                (t) => t.status !== 'Retired' && consider(t.plantCode)
            )
            const filteredEquipment = allEquipmentRef.current.filter(
                (e) => e.status !== 'Retired' && consider(e.plantCode)
            )
            const filteredPickups = allPickupsRef.current.filter((p) => p.status !== 'Retired' && consider(p.plantCode))

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

            const mixersData = DashboardUtility.calculateStatusDistribution(
                filteredMixers,
                mixersHist.data || [],
                startFilter,
                endFilter
            )
            const tractorsData = DashboardUtility.calculateStatusDistribution(
                filteredTractors,
                tractorsHist.data || [],
                startFilter,
                endFilter
            )
            const trailersData = DashboardUtility.calculateStatusDistribution(
                filteredTrailers,
                trailersHist.data || [],
                startFilter,
                endFilter
            )
            const equipmentData = DashboardUtility.calculateStatusDistribution(
                filteredEquipment,
                equipmentHist.data || [],
                startFilter,
                endFilter
            )
            const pickupsData = DashboardUtility.calculateStatusDistribution(
                filteredPickups,
                pickupsHist.data || [],
                startFilter,
                endFilter
            )

            setStatusHistoryData({
                equipment: equipmentData,
                mixers: mixersData,
                pickups: pickupsData,
                tractors: tractorsData,
                trailers: trailersData
            })
            setHistoryLoaded(true)
        } catch (err) {}
    }, [dashboardRegionCode, dashboardPlant, allPlants, regionPlants, historyStartDate, historyEndDate])

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
                allPlants.forEach((p) => {
                    const c = p.plantCode || p.plant_code
                    if (c) plantSet.add(String(c).trim())
                })
            } else {
                if (dashboardPlant) plantSet.add(String(dashboardPlant).trim())
                else
                    (regionPlants || []).forEach((p) => {
                        const c = p.plantCode || p.plant_code
                        if (c) plantSet.add(String(c).trim())
                    })
            }
            const filterActive = plantSet.size > 0
            const consider = (plantCode) => !filterActive || plantSet.has(String(plantCode || '').trim())

            const filteredMixers = allMixersRef.current.filter((m) => m.status !== 'Retired' && consider(m.plantCode))
            const filteredTractors = allTractorsRef.current.filter(
                (t) => t.status !== 'Retired' && consider(t.plantCode)
            )
            const filteredTrailers = allTrailersRef.current.filter(
                (t) => t.status !== 'Retired' && consider(t.plantCode)
            )
            const filteredEquipment = allEquipmentRef.current.filter(
                (e) => e.status !== 'Retired' && consider(e.plantCode)
            )
            const filteredPickups = allPickupsRef.current.filter((p) => p.status !== 'Retired' && consider(p.plantCode))

            const mixersData = DashboardUtility.calculateStatusDistribution(
                filteredMixers,
                historyRecordsRef.current.mixers,
                validatedStartDate,
                validatedEndDate
            )
            const tractorsData = DashboardUtility.calculateStatusDistribution(
                filteredTractors,
                historyRecordsRef.current.tractors,
                validatedStartDate,
                validatedEndDate
            )
            const trailersData = DashboardUtility.calculateStatusDistribution(
                filteredTrailers,
                historyRecordsRef.current.trailers,
                validatedStartDate,
                validatedEndDate
            )
            const equipmentData = DashboardUtility.calculateStatusDistribution(
                filteredEquipment,
                historyRecordsRef.current.equipment,
                validatedStartDate,
                validatedEndDate
            )
            const pickupsData = DashboardUtility.calculateStatusDistribution(
                filteredPickups,
                historyRecordsRef.current.pickups,
                validatedStartDate,
                validatedEndDate
            )

            setStatusHistoryData({
                equipment: equipmentData,
                mixers: mixersData,
                pickups: pickupsData,
                tractors: tractorsData,
                trailers: trailersData
            })
        }
    }, [historyStartDate, historyEndDate, dashboardRegionCode, dashboardPlant, regionPlants, allPlants])

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
        return isOffice
            ? 'Home Office'
            : dashboardRegionCode
              ? dashboardRegionName || dashboardRegionCode
              : hasAllRegionsPermission
                ? 'All Regions'
                : permittedRegions[0]?.regionName || 'Region'
    })()

    const heroRegionSub = (() => {
        const region = RegionService.getRegionByCode(dashboardRegionCode)
        const isOffice = region?.type === 'Office'
        if (isOffice)
            return `${totalRegionsExcludingOffice} Region${totalRegionsExcludingOffice !== 1 ? 's' : ''}, ${totalPlantsExcludingAggregate} Concrete Plant${totalPlantsExcludingAggregate !== 1 ? 's' : ''}, ${totalAggregateLocations} Aggregate Location${totalAggregateLocations !== 1 ? 's' : ''}`
        const plantLabel = region?.type === 'Aggregate' ? 'Aggregate Location' : 'Concrete Plant'
        return dashboardPlant
            ? `${plantLabel} ${dashboardPlant}`
            : dashboardRegionCode
              ? `${regionPlants.length} ${plantLabel}${regionPlants.length !== 1 ? 's' : ''}`
              : `${allPlantsCount} ${plantLabel}${allPlantsCount !== 1 ? 's' : ''}`
    })()

    const onRetry = () => setRefreshKey((v) => v + 1)
    const onRefresh = () => {
        setRefreshing(true)
        setRefreshKey((prev) => prev + 1)
        setTimeout(() => setRefreshing(false), 1000)
    }

    const showSkeleton = !dataReady

    const filteredTrainingOperators = (() => {
        const plantSet = plantSetRef.current
        const active = plantSet.size > 0
        if (!active) return trainingOperators
        return trainingOperators.filter(
            (r) =>
                plantSet.has(String(r.trainerPlant || '').trim()) || plantSet.has(String(r.operatorPlant || '').trim())
        )
    })()

    const filteredPendingStartOperators = (() => {
        const plantSet = plantSetRef.current
        const active = plantSet.size > 0
        if (!active) return pendingStartOperators
        return pendingStartOperators.filter(
            (r) =>
                plantSet.has(String(r.trainerPlant || '').trim()) || plantSet.has(String(r.operatorPlant || '').trim())
        )
    })()

    const filteredLightDutyOperators = (() => {
        const plantSet = plantSetRef.current
        const active = plantSet.size > 0
        if (!active) return lightDutyOperators
        return lightDutyOperators.filter((r) => plantSet.has(String(r.plant || '').trim()))
    })()

    const formatPendingDate = (d) => {
        if (!d) return '-'
        if (d.length === 10 && /\d{4}-\d{2}-\d{2}/.test(d)) return d
        try {
            return new Date(d).toISOString().slice(0, 10)
        } catch {
            return d
        }
    }

    const selectedRegion = RegionService.getRegionByCode(dashboardRegionCode)
    const isAggregate = selectedRegion?.type === 'Aggregate'

    const SkeletonCard = () => (
        <div className="rounded-xl p-6 shadow-card animate-pulse" style={{ backgroundColor: 'white' }}>
            <div className="h-4 rounded w-2/5 mb-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}></div>
            <div className="h-8 rounded w-3/5 mb-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}></div>
            <div className="h-3 rounded w-1/3" style={{ backgroundColor: 'var(--bg-tertiary)' }}></div>
        </div>
    )

    const Pill = ({ children }) => (
        <span
            style={{
                backgroundColor: '#e5e7eb',
                borderRadius: '16px',
                color: '#374151',
                display: 'inline-block',
                fontSize: '12px',
                fontWeight: 500,
                marginBottom: '6px',
                marginRight: '6px',
                padding: '4px 10px'
            }}
        >
            {children}
        </span>
    )

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    const cardStyle = {
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: isMobile ? '12px' : '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        padding: isMobile ? '16px' : '24px'
    }

    const metricCardStyle = {
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: isMobile ? '10px' : '12px',
        padding: isMobile ? '14px' : '20px'
    }

    const sectionTitleStyle = {
        color: '#1e3a5f',
        fontSize: isMobile ? '16px' : '18px',
        fontWeight: 600,
        marginBottom: isMobile ? '16px' : '20px'
    }

    const metricLabelStyle = {
        color: '#64748b',
        fontSize: isMobile ? '12px' : '13px',
        fontWeight: 500,
        marginBottom: '4px'
    }

    const metricValueStyle = {
        color: '#1e3a5f',
        fontSize: isMobile ? '22px' : '28px',
        fontWeight: 700,
        lineHeight: 1.2
    }

    const metricSubStyle = {
        color: '#94a3b8',
        fontSize: isMobile ? '11px' : '12px',
        marginTop: '4px'
    }

    return (
        <>
            <style>{`
                .content-area:has(.dashboard-full-width) {
                    padding-left: 0 !important;
                    padding-right: 0 !important;
                }
                @media (max-width: 767px) {
                    .dashboard-full-width .hidden-mobile {
                        display: none !important;
                    }
                    .dashboard-full-width .sm\\:flex {
                        display: none !important;
                    }
                    .dashboard-full-width .sm\\:inline {
                        display: none !important;
                    }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
            <div
                className="dashboard-full-width"
                style={{
                    backgroundColor: '#f8fafc',
                    color: '#1e293b',
                    minHeight: '100vh'
                }}
            >
                <div
                    style={{
                        backgroundColor: 'white',
                        backgroundImage:
                            'linear-gradient(rgba(30, 58, 95, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 58, 95, 0.02) 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                        borderBottom: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        padding: isMobile ? '10px 12px' : '12px 16px',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10
                    }}
                >
                    <div
                        style={{
                            alignItems: 'center',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: isMobile ? '8px' : '12px',
                            justifyContent: 'space-between',
                            margin: '0 auto',
                            maxWidth: '100%'
                        }}
                    >
                        <h1
                            style={{
                                color: '#1e3a5f',
                                fontSize: isMobile ? '18px' : '20px',
                                fontWeight: 700,
                                margin: 0
                            }}
                        >
                            Dashboard
                        </h1>
                        <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={onRefresh}
                                disabled={refreshing}
                                style={{
                                    alignItems: 'center',
                                    backgroundColor: '#1e3a5f',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: refreshing ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    gap: '6px',
                                    justifyContent: 'center',
                                    minWidth: '36px',
                                    opacity: refreshing ? 0.7 : 1,
                                    padding: '8px 12px'
                                }}
                            >
                                <i
                                    className="fas fa-sync-alt"
                                    style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
                                ></i>
                                <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                            </button>
                            {dashboardRegionCode && selectedRegion?.type !== 'Office' && (
                                <button
                                    type="button"
                                    onClick={() => setPlantModalOpen(true)}
                                    disabled={refreshing}
                                    style={{
                                        backgroundColor: 'white',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        color: '#374151',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        maxWidth: '150px',
                                        overflow: 'hidden',
                                        padding: '8px 12px',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}
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

                <div style={{ margin: '0 auto', maxWidth: '100%', padding: isMobile ? '12px' : '24px' }}>
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

                    <div style={{ ...cardStyle, marginBottom: '24px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            {showSkeleton ? (
                                <>
                                    <div
                                        style={{
                                            backgroundColor: '#e2e8f0',
                                            borderRadius: '6px',
                                            height: '24px',
                                            marginBottom: '8px',
                                            width: '200px'
                                        }}
                                    ></div>
                                    <div
                                        style={{
                                            backgroundColor: '#e2e8f0',
                                            borderRadius: '6px',
                                            height: '16px',
                                            width: '300px'
                                        }}
                                    ></div>
                                </>
                            ) : (
                                <>
                                    <h2
                                        style={{
                                            color: '#1e3a5f',
                                            fontSize: '22px',
                                            fontWeight: 600,
                                            margin: '0 0 4px 0'
                                        }}
                                    >
                                        {regionDisplayName}
                                    </h2>
                                    <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>{heroRegionSub}</p>
                                </>
                            )}
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gap: isMobile ? '12px' : '16px',
                                gridTemplateColumns: isMobile
                                    ? 'repeat(2, 1fr)'
                                    : 'repeat(auto-fit, minmax(200px, 1fr))'
                            }}
                        >
                            {showSkeleton ? (
                                [1, 2, 3, 4].map((i) => (
                                    <div key={i} style={metricCardStyle}>
                                        <div
                                            style={{
                                                backgroundColor: '#e2e8f0',
                                                borderRadius: '4px',
                                                height: '14px',
                                                marginBottom: '12px',
                                                width: '60%'
                                            }}
                                        ></div>
                                        <div
                                            style={{
                                                backgroundColor: '#e2e8f0',
                                                borderRadius: '4px',
                                                height: '32px',
                                                marginBottom: '8px',
                                                width: '50%'
                                            }}
                                        ></div>
                                        <div
                                            style={{
                                                backgroundColor: '#e2e8f0',
                                                borderRadius: '4px',
                                                height: '12px',
                                                width: '40%'
                                            }}
                                        ></div>
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
                        <div
                            style={{
                                alignItems: 'center',
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '12px',
                                color: '#dc2626',
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '24px',
                                padding: '16px 20px'
                            }}
                        >
                            <span>{error}</span>
                            <button
                                onClick={onRetry}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {showSkeleton && (
                        <div style={{ display: 'grid', gap: '24px' }}>
                            <div style={cardStyle}>
                                <div
                                    style={{
                                        backgroundColor: '#e2e8f0',
                                        borderRadius: '6px',
                                        height: '20px',
                                        marginBottom: '20px',
                                        width: '150px'
                                    }}
                                ></div>
                                <div
                                    style={{
                                        display: 'grid',
                                        gap: isMobile ? '12px' : '16px',
                                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))'
                                    }}
                                >
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} style={metricCardStyle}>
                                            <div
                                                style={{
                                                    alignItems: 'flex-start',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '12px'
                                                }}
                                            >
                                                <div>
                                                    <div
                                                        style={{
                                                            backgroundColor: '#e2e8f0',
                                                            borderRadius: '4px',
                                                            height: '14px',
                                                            marginBottom: '8px',
                                                            width: '80px'
                                                        }}
                                                    ></div>
                                                    <div
                                                        style={{
                                                            backgroundColor: '#e2e8f0',
                                                            borderRadius: '4px',
                                                            height: '32px',
                                                            width: '60px'
                                                        }}
                                                    ></div>
                                                </div>
                                                <div
                                                    style={{
                                                        backgroundColor: '#e2e8f0',
                                                        borderRadius: '8px',
                                                        height: '36px',
                                                        width: '36px'
                                                    }}
                                                ></div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <div
                                                    style={{
                                                        backgroundColor: '#e2e8f0',
                                                        borderRadius: '16px',
                                                        height: '24px',
                                                        width: '70px'
                                                    }}
                                                ></div>
                                                <div
                                                    style={{
                                                        backgroundColor: '#e2e8f0',
                                                        borderRadius: '16px',
                                                        height: '24px',
                                                        width: '60px'
                                                    }}
                                                ></div>
                                                <div
                                                    style={{
                                                        backgroundColor: '#e2e8f0',
                                                        borderRadius: '16px',
                                                        height: '24px',
                                                        width: '80px'
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={cardStyle}>
                                <div
                                    style={{
                                        backgroundColor: '#e2e8f0',
                                        borderRadius: '6px',
                                        height: '20px',
                                        marginBottom: '20px',
                                        width: '100px'
                                    }}
                                ></div>
                                <div style={metricCardStyle}>
                                    <div
                                        style={{
                                            alignItems: 'flex-start',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '12px'
                                        }}
                                    >
                                        <div>
                                            <div
                                                style={{
                                                    backgroundColor: '#e2e8f0',
                                                    borderRadius: '4px',
                                                    height: '14px',
                                                    marginBottom: '8px',
                                                    width: '80px'
                                                }}
                                            ></div>
                                            <div
                                                style={{
                                                    backgroundColor: '#e2e8f0',
                                                    borderRadius: '4px',
                                                    height: '32px',
                                                    width: '60px'
                                                }}
                                            ></div>
                                        </div>
                                        <div
                                            style={{
                                                backgroundColor: '#e2e8f0',
                                                borderRadius: '8px',
                                                height: '36px',
                                                width: '36px'
                                            }}
                                        ></div>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    backgroundColor: '#e2e8f0',
                                                    borderRadius: '16px',
                                                    height: '24px',
                                                    width: '80px'
                                                }}
                                            ></div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ marginTop: '20px' }}>
                                    {[1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            style={{
                                                backgroundColor: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '10px',
                                                marginBottom: '12px',
                                                padding: '14px 16px'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    backgroundColor: '#e2e8f0',
                                                    borderRadius: '4px',
                                                    height: '16px',
                                                    width: '200px'
                                                }}
                                            ></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={cardStyle}>
                                <div
                                    style={{
                                        backgroundColor: '#e2e8f0',
                                        borderRadius: '6px',
                                        height: '20px',
                                        marginBottom: '20px',
                                        width: '200px'
                                    }}
                                ></div>
                                <div
                                    style={{
                                        display: 'grid',
                                        gap: isMobile ? '12px' : '16px',
                                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
                                        marginBottom: isMobile ? '16px' : '24px'
                                    }}
                                >
                                    {[1, 2].map((i) => (
                                        <div key={i} style={metricCardStyle}>
                                            <div
                                                style={{
                                                    alignItems: 'flex-start',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '12px'
                                                }}
                                            >
                                                <div>
                                                    <div
                                                        style={{
                                                            backgroundColor: '#e2e8f0',
                                                            borderRadius: '4px',
                                                            height: '14px',
                                                            marginBottom: '8px',
                                                            width: '100px'
                                                        }}
                                                    ></div>
                                                    <div
                                                        style={{
                                                            backgroundColor: '#e2e8f0',
                                                            borderRadius: '4px',
                                                            height: '32px',
                                                            width: '50px'
                                                        }}
                                                    ></div>
                                                </div>
                                                <div
                                                    style={{
                                                        backgroundColor: '#e2e8f0',
                                                        borderRadius: '8px',
                                                        height: '36px',
                                                        width: '36px'
                                                    }}
                                                ></div>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {[1, 2, 3, 4].map((j) => (
                                                    <div
                                                        key={j}
                                                        style={{
                                                            backgroundColor: '#e2e8f0',
                                                            borderRadius: '16px',
                                                            height: '24px',
                                                            width: '80px'
                                                        }}
                                                    ></div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                                    <div
                                        style={{
                                            backgroundColor: '#e2e8f0',
                                            borderRadius: '6px',
                                            height: '18px',
                                            marginBottom: '20px',
                                            width: '250px'
                                        }}
                                    ></div>
                                    <div
                                        style={{
                                            display: 'grid',
                                            gap: '12px',
                                            gridTemplateColumns: isMobile
                                                ? 'repeat(2, 1fr)'
                                                : 'repeat(auto-fit, minmax(140px, 1fr))',
                                            marginBottom: isMobile ? '16px' : '24px'
                                        }}
                                    >
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    backgroundColor: '#f8fafc',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '10px',
                                                    padding: '14px'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        backgroundColor: '#e2e8f0',
                                                        borderRadius: '4px',
                                                        height: '14px',
                                                        marginBottom: '10px',
                                                        width: '60px'
                                                    }}
                                                ></div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {[1, 2, 3].map((j) => (
                                                        <div
                                                            key={j}
                                                            style={{ display: 'flex', justifyContent: 'space-between' }}
                                                        >
                                                            <div
                                                                style={{
                                                                    backgroundColor: '#e2e8f0',
                                                                    borderRadius: '4px',
                                                                    height: '12px',
                                                                    width: '40px'
                                                                }}
                                                            ></div>
                                                            <div
                                                                style={{
                                                                    backgroundColor: '#e2e8f0',
                                                                    borderRadius: '4px',
                                                                    height: '12px',
                                                                    width: '30px'
                                                                }}
                                                            ></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div key={i} style={{ alignItems: 'center', display: 'flex', gap: '12px' }}>
                                                <div
                                                    style={{
                                                        backgroundColor: '#e2e8f0',
                                                        borderRadius: '4px',
                                                        height: '14px',
                                                        width: '80px'
                                                    }}
                                                ></div>
                                                <div
                                                    style={{
                                                        backgroundColor: '#e2e8f0',
                                                        borderRadius: '6px',
                                                        flex: 1,
                                                        height: '28px'
                                                    }}
                                                ></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!showSkeleton && (
                        <div style={{ display: 'grid', gap: isMobile ? '16px' : '24px' }}>
                            <div style={cardStyle}>
                                <h3 style={sectionTitleStyle}>Fleet Overview</h3>
                                <div
                                    style={{
                                        display: 'grid',
                                        gap: isMobile ? '12px' : '16px',
                                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))'
                                    }}
                                >
                                    {!isAggregate && (
                                        <div
                                            style={{
                                                ...metricCardStyle,
                                                border:
                                                    selectedRegion?.type === 'Concrete'
                                                        ? '2px solid #1e3a5f'
                                                        : '1px solid #e2e8f0'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    alignItems: 'flex-start',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '12px'
                                                }}
                                            >
                                                <div>
                                                    <div style={metricLabelStyle}>Mixers</div>
                                                    <div
                                                        style={{
                                                            color: '#1e3a5f',
                                                            fontSize: '32px',
                                                            fontWeight: 700
                                                        }}
                                                    >
                                                        {stats.mixers.total}
                                                    </div>
                                                </div>
                                                <div
                                                    style={{
                                                        backgroundColor: '#dbeafe',
                                                        borderRadius: '8px',
                                                        padding: '8px'
                                                    }}
                                                >
                                                    <i
                                                        className="fas fa-truck"
                                                        style={{ color: '#2563eb', fontSize: '20px' }}
                                                    ></i>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                <Pill>Active {stats.mixers.active}</Pill>
                                                <Pill>Spare {stats.mixers.spare}</Pill>
                                                <Pill>In Shop {stats.mixers.shop}</Pill>
                                                <Pill
                                                    style={{
                                                        background:
                                                            stats.mixers.allocationPercent >= 80
                                                                ? '#dcfce7'
                                                                : stats.mixers.allocationPercent >= 50
                                                                  ? '#fef9c3'
                                                                  : '#fee2e2',
                                                        color:
                                                            stats.mixers.allocationPercent >= 80
                                                                ? '#16a34a'
                                                                : stats.mixers.allocationPercent >= 50
                                                                  ? '#ca8a04'
                                                                  : '#dc2626'
                                                    }}
                                                >
                                                    {stats.mixers.allocationPercent}% Allocated
                                                </Pill>
                                            </div>
                                        </div>
                                    )}

                                    <div
                                        style={{
                                            ...metricCardStyle,
                                            border:
                                                selectedRegion?.type === 'Aggregate'
                                                    ? '2px solid #1e3a5f'
                                                    : '1px solid #e2e8f0'
                                        }}
                                    >
                                        <div
                                            style={{
                                                alignItems: 'flex-start',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: '12px'
                                            }}
                                        >
                                            <div>
                                                <div style={metricLabelStyle}>Tractors</div>
                                                <div
                                                    style={{
                                                        color: '#1e3a5f',
                                                        fontSize: '32px',
                                                        fontWeight: 700
                                                    }}
                                                >
                                                    {stats.tractors.total}
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    backgroundColor: '#dcfce7',
                                                    borderRadius: '8px',
                                                    padding: '8px'
                                                }}
                                            >
                                                <i
                                                    className="fas fa-tractor"
                                                    style={{ color: '#16a34a', fontSize: '20px' }}
                                                ></i>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            <Pill>Active {stats.tractors.active}</Pill>
                                            <Pill>Spare {stats.tractors.spare}</Pill>
                                            <Pill>In Shop {stats.tractors.shop}</Pill>
                                            <Pill
                                                style={{
                                                    background:
                                                        stats.tractors.allocationPercent >= 80
                                                            ? '#dcfce7'
                                                            : stats.tractors.allocationPercent >= 50
                                                              ? '#fef9c3'
                                                              : '#fee2e2',
                                                    color:
                                                        stats.tractors.allocationPercent >= 80
                                                            ? '#16a34a'
                                                            : stats.tractors.allocationPercent >= 50
                                                              ? '#ca8a04'
                                                              : '#dc2626'
                                                }}
                                            >
                                                {stats.tractors.allocationPercent}% Allocated
                                            </Pill>
                                        </div>
                                        {stats.tractors.freight && (
                                            <div
                                                style={{
                                                    borderTop: '1px solid #e5e7eb',
                                                    marginTop: '12px',
                                                    paddingTop: '12px'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'grid',
                                                        gap: '6px',
                                                        gridTemplateColumns: isMobile
                                                            ? 'repeat(2, 1fr)'
                                                            : 'repeat(3, 1fr)'
                                                    }}
                                                >
                                                    {['Cement', 'Aggregate', 'Dump Truck'].map((type) => {
                                                        const f = stats.tractors.freight[type]
                                                        if (!f || f.total === 0) return null
                                                        const icon =
                                                            type === 'Cement'
                                                                ? 'fa-industry'
                                                                : type === 'Aggregate'
                                                                  ? 'fa-mountain'
                                                                  : 'fa-truck-loading'
                                                        return (
                                                            <div
                                                                key={type}
                                                                style={{
                                                                    background: '#f8fafc',
                                                                    borderRadius: '8px',
                                                                    padding: '8px',
                                                                    textAlign: 'center'
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        alignItems: 'center',
                                                                        display: 'flex',
                                                                        gap: '4px',
                                                                        justifyContent: 'center',
                                                                        marginBottom: '4px'
                                                                    }}
                                                                >
                                                                    <i
                                                                        className={`fas ${icon}`}
                                                                        style={{ color: '#64748b', fontSize: '10px' }}
                                                                    ></i>
                                                                    <span
                                                                        style={{
                                                                            color: '#64748b',
                                                                            fontSize: '10px',
                                                                            fontWeight: 600
                                                                        }}
                                                                    >
                                                                        {type === 'Dump Truck' ? 'Dump' : type}
                                                                    </span>
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        gap: '4px',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                >
                                                                    <span
                                                                        style={{
                                                                            background: '#dcfce7',
                                                                            borderRadius: '4px',
                                                                            color: '#16a34a',
                                                                            fontSize: '11px',
                                                                            fontWeight: 600,
                                                                            padding: '2px 6px'
                                                                        }}
                                                                    >
                                                                        {f.active}
                                                                    </span>
                                                                    <span
                                                                        style={{
                                                                            background: '#f3e8ff',
                                                                            borderRadius: '4px',
                                                                            color: '#9333ea',
                                                                            fontSize: '11px',
                                                                            fontWeight: 600,
                                                                            padding: '2px 6px'
                                                                        }}
                                                                    >
                                                                        {f.spare}
                                                                    </span>
                                                                    <span
                                                                        style={{
                                                                            background: '#ffedd5',
                                                                            borderRadius: '4px',
                                                                            color: '#ea580c',
                                                                            fontSize: '11px',
                                                                            fontWeight: 600,
                                                                            padding: '2px 6px'
                                                                        }}
                                                                    >
                                                                        {f.shop}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={metricCardStyle}>
                                        <div
                                            style={{
                                                alignItems: 'flex-start',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: '12px'
                                            }}
                                        >
                                            <div>
                                                <div style={metricLabelStyle}>Trailers</div>
                                                <div
                                                    style={{
                                                        color: '#1e3a5f',
                                                        fontSize: '32px',
                                                        fontWeight: 700
                                                    }}
                                                >
                                                    {stats.trailers.total}
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    backgroundColor: '#fef3c7',
                                                    borderRadius: '8px',
                                                    padding: '8px'
                                                }}
                                            >
                                                <i
                                                    className="fas fa-trailer"
                                                    style={{ color: '#d97706', fontSize: '20px' }}
                                                ></i>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            <Pill>Active {stats.trailers.active}</Pill>
                                            <Pill>Spare {stats.trailers.spare}</Pill>
                                            <Pill>In Shop {stats.trailers.shop}</Pill>
                                            <Pill
                                                style={{
                                                    background:
                                                        stats.trailers.allocationPercent >= 80
                                                            ? '#dcfce7'
                                                            : stats.trailers.allocationPercent >= 50
                                                              ? '#fef9c3'
                                                              : '#fee2e2',
                                                    color:
                                                        stats.trailers.allocationPercent >= 80
                                                            ? '#16a34a'
                                                            : stats.trailers.allocationPercent >= 50
                                                              ? '#ca8a04'
                                                              : '#dc2626'
                                                }}
                                            >
                                                {stats.trailers.allocationPercent}% Allocated
                                            </Pill>
                                        </div>
                                        {stats.trailers.trailerType && (
                                            <div
                                                style={{
                                                    borderTop: '1px solid #e5e7eb',
                                                    marginTop: '12px',
                                                    paddingTop: '12px'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'grid',
                                                        gap: '6px',
                                                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)'
                                                    }}
                                                >
                                                    {['Cement', 'End Dump'].map((type) => {
                                                        const t = stats.trailers.trailerType[type]
                                                        if (!t || t.total === 0) return null
                                                        const icon =
                                                            type === 'Cement' ? 'fa-industry' : 'fa-truck-loading'
                                                        return (
                                                            <div
                                                                key={type}
                                                                style={{
                                                                    background: '#f8fafc',
                                                                    borderRadius: '8px',
                                                                    padding: '8px',
                                                                    textAlign: 'center'
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        alignItems: 'center',
                                                                        display: 'flex',
                                                                        gap: '4px',
                                                                        justifyContent: 'center',
                                                                        marginBottom: '4px'
                                                                    }}
                                                                >
                                                                    <i
                                                                        className={`fas ${icon}`}
                                                                        style={{ color: '#64748b', fontSize: '10px' }}
                                                                    ></i>
                                                                    <span
                                                                        style={{
                                                                            color: '#64748b',
                                                                            fontSize: '10px',
                                                                            fontWeight: 600
                                                                        }}
                                                                    >
                                                                        {type}
                                                                    </span>
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        gap: '4px',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                >
                                                                    <span
                                                                        style={{
                                                                            background: '#dcfce7',
                                                                            borderRadius: '4px',
                                                                            color: '#16a34a',
                                                                            fontSize: '11px',
                                                                            fontWeight: 600,
                                                                            padding: '2px 6px'
                                                                        }}
                                                                    >
                                                                        {t.active}
                                                                    </span>
                                                                    <span
                                                                        style={{
                                                                            background: '#f3e8ff',
                                                                            borderRadius: '4px',
                                                                            color: '#9333ea',
                                                                            fontSize: '11px',
                                                                            fontWeight: 600,
                                                                            padding: '2px 6px'
                                                                        }}
                                                                    >
                                                                        {t.spare}
                                                                    </span>
                                                                    <span
                                                                        style={{
                                                                            background: '#ffedd5',
                                                                            borderRadius: '4px',
                                                                            color: '#ea580c',
                                                                            fontSize: '11px',
                                                                            fontWeight: 600,
                                                                            padding: '2px 6px'
                                                                        }}
                                                                    >
                                                                        {t.shop}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={metricCardStyle}>
                                        <div
                                            style={{
                                                alignItems: 'flex-start',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: '12px'
                                            }}
                                        >
                                            <div>
                                                <div style={metricLabelStyle}>Equipment</div>
                                                <div
                                                    style={{
                                                        color: '#1e3a5f',
                                                        fontSize: '32px',
                                                        fontWeight: 700
                                                    }}
                                                >
                                                    {stats.equipment.total}
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    backgroundColor: '#f3e8ff',
                                                    borderRadius: '8px',
                                                    padding: '8px'
                                                }}
                                            >
                                                <i
                                                    className="fas fa-snowplow"
                                                    style={{ color: '#9333ea', fontSize: '20px' }}
                                                ></i>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            <Pill>Active {stats.equipment.active}</Pill>
                                            <Pill>Spare {stats.equipment.spare}</Pill>
                                            <Pill>In Shop {stats.equipment.shop}</Pill>
                                            <Pill
                                                style={{
                                                    background:
                                                        stats.equipment.allocationPercent >= 80
                                                            ? '#dcfce7'
                                                            : stats.equipment.allocationPercent >= 50
                                                              ? '#fef9c3'
                                                              : '#fee2e2',
                                                    color:
                                                        stats.equipment.allocationPercent >= 80
                                                            ? '#16a34a'
                                                            : stats.equipment.allocationPercent >= 50
                                                              ? '#ca8a04'
                                                              : '#dc2626'
                                                }}
                                            >
                                                {stats.equipment.allocationPercent}% Allocated
                                            </Pill>
                                        </div>
                                    </div>

                                    <div style={metricCardStyle}>
                                        <div
                                            style={{
                                                alignItems: 'flex-start',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: '12px'
                                            }}
                                        >
                                            <div>
                                                <div style={metricLabelStyle}>Pickup Trucks</div>
                                                <div
                                                    style={{
                                                        color: '#1e3a5f',
                                                        fontSize: '32px',
                                                        fontWeight: 700
                                                    }}
                                                >
                                                    {stats.pickups.total}
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    backgroundColor: '#fce7f3',
                                                    borderRadius: '8px',
                                                    padding: '8px'
                                                }}
                                            >
                                                <i
                                                    className="fas fa-truck-pickup"
                                                    style={{ color: '#db2777', fontSize: '20px' }}
                                                ></i>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            <Pill>Active {stats.pickups.active}</Pill>
                                            <Pill>In Shop {stats.pickups.shop}</Pill>
                                            <Pill>Stationary {stats.pickups.stationary}</Pill>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={cardStyle}>
                                <h3 style={sectionTitleStyle}>Fleet Analytics</h3>
                                <DashboardCharts
                                    dashboardPlant={dashboardPlant}
                                    dashboardRegionCode={dashboardRegionCode}
                                    regionPlants={regionPlants}
                                    allPlants={allPlants}
                                    statusHistoryData={statusHistoryData}
                                    isAggregate={isAggregate}
                                    stats={stats}
                                />
                            </div>

                            <div style={cardStyle}>
                                <h3 style={sectionTitleStyle}>People</h3>
                                <div style={{ ...metricCardStyle, marginBottom: '20px' }}>
                                    <div
                                        style={{
                                            alignItems: 'flex-start',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '12px'
                                        }}
                                    >
                                        <div>
                                            <div style={metricLabelStyle}>Operators</div>
                                            <div
                                                style={{
                                                    color: '#1e3a5f',
                                                    fontSize: '32px',
                                                    fontWeight: 700
                                                }}
                                            >
                                                {stats.operators.total}
                                            </div>
                                        </div>
                                        <div
                                            style={{ backgroundColor: '#e0f2fe', borderRadius: '8px', padding: '8px' }}
                                        >
                                            <i
                                                className="fas fa-users"
                                                style={{ color: '#0284c7', fontSize: '20px' }}
                                            ></i>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
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
                                    onToggle={() => setTrainingCollapsed((v) => !v)}
                                    disabled={!filteredTrainingOperators.length}
                                    headers={[
                                        'Plant (Training At)',
                                        'Operator',
                                        'Trainer',
                                        'Position',
                                        'Plant (Training For)'
                                    ]}
                                    rows={filteredTrainingOperators}
                                    renderRow={(r) => [
                                        r.trainerPlant || '-',
                                        r.operatorName || '-',
                                        r.trainerName || '-',
                                        r.operatorPosition || '-',
                                        r.operatorPlant || '-'
                                    ]}
                                />

                                <CollapsibleTable
                                    title={`Pending Start Operators (${filteredPendingStartOperators.length})`}
                                    collapsed={pendingCollapsed}
                                    onToggle={() => setPendingCollapsed((v) => !v)}
                                    disabled={!filteredPendingStartOperators.length}
                                    headers={[
                                        'Plant (Training At)',
                                        'Operator',
                                        'Plant (Training For)',
                                        'Pending Start Date'
                                    ]}
                                    rows={filteredPendingStartOperators}
                                    renderRow={(r) => [
                                        r.trainerPlant || '-',
                                        r.operatorName || '-',
                                        r.operatorPlant || '-',
                                        formatPendingDate(r.pendingDate)
                                    ]}
                                />

                                <CollapsibleTable
                                    title={`Light Duty Operators (${filteredLightDutyOperators.length})`}
                                    collapsed={lightDutyCollapsed}
                                    onToggle={() => setLightDutyCollapsed((v) => !v)}
                                    disabled={!filteredLightDutyOperators.length}
                                    headers={['Plant', 'Operator']}
                                    rows={filteredLightDutyOperators}
                                    renderRow={(r) => [r.plant || '-', r.operatorName || '-']}
                                />
                            </div>

                            <div style={cardStyle}>
                                <h3 style={sectionTitleStyle}>Maintenance & Quality</h3>
                                <div
                                    style={{
                                        display: 'grid',
                                        gap: isMobile ? '12px' : '16px',
                                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
                                        marginBottom: isMobile ? '16px' : '24px'
                                    }}
                                >
                                    <div style={metricCardStyle}>
                                        <div
                                            style={{
                                                alignItems: 'flex-start',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: '12px'
                                            }}
                                        >
                                            <div>
                                                <div style={metricLabelStyle}>Service Overdue</div>
                                                <div
                                                    style={{
                                                        color: '#dc2626',
                                                        fontSize: '32px',
                                                        fontWeight: 700
                                                    }}
                                                >
                                                    {stats.overdueTotal}
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    backgroundColor: '#fee2e2',
                                                    borderRadius: '8px',
                                                    padding: '8px'
                                                }}
                                            >
                                                <i
                                                    className="fas fa-exclamation-triangle"
                                                    style={{ color: '#dc2626', fontSize: '20px' }}
                                                ></i>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {!isAggregate && <Pill>Mixers {stats.mixers.overdue}</Pill>}
                                            <Pill>Tractors {stats.tractors.overdue}</Pill>
                                            <Pill>Trailers {stats.trailers.overdue}</Pill>
                                            <Pill>Equipment {stats.equipment.overdue}</Pill>
                                        </div>
                                    </div>
                                    <div style={metricCardStyle}>
                                        <div
                                            style={{
                                                alignItems: 'flex-start',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: '12px'
                                            }}
                                        >
                                            <div>
                                                <div style={metricLabelStyle}>Open Issues</div>
                                                <div
                                                    style={{
                                                        color: '#f59e0b',
                                                        fontSize: '32px',
                                                        fontWeight: 700
                                                    }}
                                                >
                                                    {stats.openIssuesTotal}
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    backgroundColor: '#fef3c7',
                                                    borderRadius: '8px',
                                                    padding: '8px'
                                                }}
                                            >
                                                <i
                                                    className="fas fa-wrench"
                                                    style={{ color: '#f59e0b', fontSize: '20px' }}
                                                ></i>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {!isAggregate && <Pill>Mixers {stats.mixers.issues}</Pill>}
                                            <Pill>Tractors {stats.tractors.issues}</Pill>
                                            <Pill>Trailers {stats.trailers.issues}</Pill>
                                            <Pill>Equipment {stats.equipment.issues}</Pill>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                                    <div
                                        style={{
                                            alignItems: 'center',
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '16px',
                                            justifyContent: 'space-between',
                                            marginBottom: '20px'
                                        }}
                                    >
                                        <h4
                                            style={{
                                                color: '#1e3a5f',
                                                fontSize: '16px',
                                                fontWeight: 600,
                                                margin: 0
                                            }}
                                        >
                                            Historical Status Distribution
                                        </h4>
                                        <div
                                            style={{
                                                alignItems: 'center',
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '8px'
                                            }}
                                        >
                                            {['last-week', 'this-month', 'this-quarter', 'this-year', 'all'].map(
                                                (filter) => (
                                                    <button
                                                        key={filter}
                                                        onClick={() => handleQuickDateFilter(filter)}
                                                        style={{
                                                            backgroundColor: '#f1f5f9',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            color: '#475569',
                                                            cursor: 'pointer',
                                                            fontSize: '12px',
                                                            fontWeight: 500,
                                                            padding: '6px 12px'
                                                        }}
                                                    >
                                                        {filter
                                                            .split('-')
                                                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                                            .join(' ')}
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            display: 'grid',
                                            gap: '12px',
                                            gridTemplateColumns: isMobile
                                                ? 'repeat(2, 1fr)'
                                                : 'repeat(auto-fit, minmax(140px, 1fr))',
                                            marginBottom: isMobile ? '16px' : '24px'
                                        }}
                                    >
                                        {(() => {
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
                                                {
                                                    name: 'Mixers',
                                                    ...calcMetrics(statusHistoryData.mixers),
                                                    show: !isAggregate
                                                },
                                                {
                                                    name: 'Tractors',
                                                    ...calcMetrics(statusHistoryData.tractors),
                                                    show: true
                                                },
                                                {
                                                    name: 'Trailers',
                                                    ...calcMetrics(statusHistoryData.trailers),
                                                    show: true
                                                },
                                                {
                                                    name: 'Equipment',
                                                    ...calcMetrics(statusHistoryData.equipment),
                                                    show: true
                                                },
                                                {
                                                    name: 'Pickups',
                                                    ...calcMetrics(statusHistoryData.pickups),
                                                    show: true
                                                }
                                            ].filter((a) => a.show)

                                            return assets.map((asset, idx) => (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        backgroundColor: '#f8fafc',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '10px',
                                                        padding: '14px'
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            color: '#475569',
                                                            fontSize: '13px',
                                                            fontWeight: 600,
                                                            marginBottom: '10px'
                                                        }}
                                                    >
                                                        {asset.name}
                                                    </div>
                                                    <div
                                                        style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                fontSize: '12px',
                                                                justifyContent: 'space-between'
                                                            }}
                                                        >
                                                            <span style={{ color: '#16a34a' }}>Active</span>
                                                            <span
                                                                style={{
                                                                    color: '#1e293b',
                                                                    fontWeight: 600
                                                                }}
                                                            >
                                                                {asset.active}%
                                                            </span>
                                                        </div>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                fontSize: '12px',
                                                                justifyContent: 'space-between'
                                                            }}
                                                        >
                                                            <span style={{ color: '#9333ea' }}>Spare</span>
                                                            <span
                                                                style={{
                                                                    color: '#1e293b',
                                                                    fontWeight: 600
                                                                }}
                                                            >
                                                                {asset.spare}%
                                                            </span>
                                                        </div>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                fontSize: '12px',
                                                                justifyContent: 'space-between'
                                                            }}
                                                        >
                                                            <span style={{ color: '#2563eb' }}>In Shop</span>
                                                            <span
                                                                style={{
                                                                    color: '#1e293b',
                                                                    fontWeight: 600
                                                                }}
                                                            >
                                                                {asset.inShop}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        })()}
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {(() => {
                                            const STATUS_COLORS = {
                                                Active: '#22c55e',
                                                'In Shop': '#3b82f6',
                                                Sold: '#6b7280',
                                                Spare: '#a855f7',
                                                Stationary: '#eab308'
                                            }

                                            const chartData = [
                                                !isAggregate &&
                                                    statusHistoryData.mixers?.length > 0 && {
                                                        active: parseFloat(
                                                            statusHistoryData.mixers.find((d) => d.status === 'Active')
                                                                ?.percentage || 0
                                                        ),
                                                        inShop: parseFloat(
                                                            statusHistoryData.mixers.find((d) => d.status === 'In Shop')
                                                                ?.percentage || 0
                                                        ),
                                                        name: 'Mixers',
                                                        spare: parseFloat(
                                                            statusHistoryData.mixers.find((d) => d.status === 'Spare')
                                                                ?.percentage || 0
                                                        ),
                                                        stationary: parseFloat(
                                                            statusHistoryData.mixers.find(
                                                                (d) => d.status === 'Stationary'
                                                            )?.percentage || 0
                                                        )
                                                    },
                                                statusHistoryData.tractors?.length > 0 && {
                                                    active: parseFloat(
                                                        statusHistoryData.tractors.find((d) => d.status === 'Active')
                                                            ?.percentage || 0
                                                    ),
                                                    inShop: parseFloat(
                                                        statusHistoryData.tractors.find((d) => d.status === 'In Shop')
                                                            ?.percentage || 0
                                                    ),
                                                    name: 'Tractors',
                                                    spare: parseFloat(
                                                        statusHistoryData.tractors.find((d) => d.status === 'Spare')
                                                            ?.percentage || 0
                                                    ),
                                                    stationary: parseFloat(
                                                        statusHistoryData.tractors.find(
                                                            (d) => d.status === 'Stationary'
                                                        )?.percentage || 0
                                                    )
                                                },
                                                statusHistoryData.trailers?.length > 0 && {
                                                    active: parseFloat(
                                                        statusHistoryData.trailers.find((d) => d.status === 'Active')
                                                            ?.percentage || 0
                                                    ),
                                                    inShop: parseFloat(
                                                        statusHistoryData.trailers.find((d) => d.status === 'In Shop')
                                                            ?.percentage || 0
                                                    ),
                                                    name: 'Trailers',
                                                    spare: parseFloat(
                                                        statusHistoryData.trailers.find((d) => d.status === 'Spare')
                                                            ?.percentage || 0
                                                    ),
                                                    stationary: parseFloat(
                                                        statusHistoryData.trailers.find(
                                                            (d) => d.status === 'Stationary'
                                                        )?.percentage || 0
                                                    )
                                                },
                                                statusHistoryData.equipment?.length > 0 && {
                                                    active: parseFloat(
                                                        statusHistoryData.equipment.find((d) => d.status === 'Active')
                                                            ?.percentage || 0
                                                    ),
                                                    inShop: parseFloat(
                                                        statusHistoryData.equipment.find((d) => d.status === 'In Shop')
                                                            ?.percentage || 0
                                                    ),
                                                    name: 'Equipment',
                                                    spare: parseFloat(
                                                        statusHistoryData.equipment.find((d) => d.status === 'Spare')
                                                            ?.percentage || 0
                                                    ),
                                                    stationary: parseFloat(
                                                        statusHistoryData.equipment.find(
                                                            (d) => d.status === 'Stationary'
                                                        )?.percentage || 0
                                                    )
                                                },
                                                statusHistoryData.pickups?.length > 0 && {
                                                    active: parseFloat(
                                                        statusHistoryData.pickups.find((d) => d.status === 'Active')
                                                            ?.percentage || 0
                                                    ),
                                                    inShop: parseFloat(
                                                        statusHistoryData.pickups.find((d) => d.status === 'In Shop')
                                                            ?.percentage || 0
                                                    ),
                                                    name: 'Pickups',
                                                    spare: parseFloat(
                                                        statusHistoryData.pickups.find((d) => d.status === 'Spare')
                                                            ?.percentage || 0
                                                    ),
                                                    stationary: parseFloat(
                                                        statusHistoryData.pickups.find((d) => d.status === 'Stationary')
                                                            ?.percentage || 0
                                                    )
                                                }
                                            ].filter(Boolean)

                                            const HistoryTooltip = ({ active, payload, label }) => {
                                                if (!active || !payload?.length) return null
                                                return (
                                                    <div
                                                        style={{
                                                            backgroundColor: 'white',
                                                            border: '1px solid #e5e7eb',
                                                            borderRadius: '8px',
                                                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                                            padding: '10px 14px'
                                                        }}
                                                    >
                                                        <p
                                                            style={{
                                                                color: '#1e3a5f',
                                                                fontSize: '13px',
                                                                fontWeight: 600,
                                                                margin: '0 0 6px 0'
                                                            }}
                                                        >
                                                            {label}
                                                        </p>
                                                        {payload
                                                            .filter((p) => p.value > 0)
                                                            .map((entry, index) => (
                                                                <p
                                                                    key={index}
                                                                    style={{
                                                                        color: entry.color,
                                                                        fontSize: '12px',
                                                                        margin: '2px 0'
                                                                    }}
                                                                >
                                                                    {entry.name}: {entry.value.toFixed(1)}%
                                                                </p>
                                                            ))}
                                                    </div>
                                                )
                                            }

                                            if (chartData.length === 0) {
                                                return (
                                                    <div
                                                        style={{
                                                            color: '#94a3b8',
                                                            fontSize: '14px',
                                                            padding: '20px',
                                                            textAlign: 'center'
                                                        }}
                                                    >
                                                        No historical data available
                                                    </div>
                                                )
                                            }

                                            return (
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
                                                        <Bar
                                                            dataKey="active"
                                                            stackId="a"
                                                            fill={STATUS_COLORS.Active}
                                                            name="Active"
                                                        />
                                                        <Bar
                                                            dataKey="spare"
                                                            stackId="a"
                                                            fill={STATUS_COLORS.Spare}
                                                            name="Spare"
                                                        />
                                                        <Bar
                                                            dataKey="inShop"
                                                            stackId="a"
                                                            fill={STATUS_COLORS['In Shop']}
                                                            name="In Shop"
                                                        />
                                                        <Bar
                                                            dataKey="stationary"
                                                            stackId="a"
                                                            fill={STATUS_COLORS.Stationary}
                                                            name="Stationary"
                                                        />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            )
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

                {embeddedView && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="relative w-full max-w-6xl h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between px-5 py-3 bg-[#1e3a5f] text-white flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <i
                                        className={`fas ${embeddedView === 'mixers' ? 'fa-truck-moving' : embeddedView === 'tractors' ? 'fa-truck-front' : embeddedView === 'equipment' ? 'fa-snowplow' : embeddedView === 'operators' ? 'fa-users' : 'fa-truck'} text-lg`}
                                    ></i>
                                    <span className="font-semibold text-lg">
                                        {embeddedView === 'mixers'
                                            ? 'Mixers'
                                            : embeddedView === 'tractors'
                                              ? 'Tractors'
                                              : embeddedView === 'equipment'
                                                ? 'Equipment'
                                                : embeddedView === 'operators'
                                                  ? 'Operators'
                                                  : 'View'}
                                    </span>
                                    {embeddedViewSearch && (
                                        <span className="px-2 py-0.5 bg-white/20 rounded text-sm">
                                            Searching: {embeddedViewSearch}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        setEmbeddedView(null)
                                        setEmbeddedViewSearch('')
                                    }}
                                    className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                                >
                                    <i className="fas fa-times text-lg"></i>
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto">
                                {embeddedView === 'mixers' && (
                                    <MixersView embedded={true} initialSearch={embeddedViewSearch} exactMatch={true} />
                                )}
                                {embeddedView === 'tractors' && (
                                    <TractorsView
                                        embedded={true}
                                        initialSearch={embeddedViewSearch}
                                        exactMatch={true}
                                    />
                                )}
                                {embeddedView === 'trailers' && (
                                    <TrailersView
                                        embedded={true}
                                        initialSearch={embeddedViewSearch}
                                        exactMatch={true}
                                    />
                                )}
                                {embeddedView === 'equipment' && (
                                    <EquipmentsView
                                        embedded={true}
                                        initialSearch={embeddedViewSearch}
                                        exactMatch={true}
                                    />
                                )}
                                {embeddedView === 'operators' && (
                                    <OperatorsView
                                        embedded={true}
                                        initialSearch={embeddedViewSearch}
                                        exactMatch={true}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    )

    function CollapsibleTable({ title, collapsed, onToggle, disabled, headers, rows, renderRow }) {
        return (
            <div
                style={{ border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '12px', overflow: 'hidden' }}
            >
                <div
                    style={{
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        borderBottom: collapsed ? 'none' : '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '14px 16px'
                    }}
                >
                    <span style={{ color: '#374151', fontSize: '14px', fontWeight: 500 }}>{title}</span>
                    <button
                        onClick={onToggle}
                        disabled={disabled}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: disabled ? '#9ca3af' : '#1e3a5f',
                            cursor: disabled ? 'default' : 'pointer',
                            fontSize: '13px',
                            fontWeight: 500
                        }}
                    >
                        {collapsed ? 'Expand' : 'Collapse'}
                    </button>
                </div>
                {!collapsed &&
                    (rows.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: '100%' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc' }}>
                                        {headers.map((h, i) => (
                                            <th
                                                key={i}
                                                style={{
                                                    borderBottom: '1px solid #e2e8f0',
                                                    color: '#64748b',
                                                    fontWeight: 500,
                                                    padding: '12px 16px',
                                                    textAlign: 'left'
                                                }}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => (
                                        <tr key={r.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            {renderRow(r).map((cell, j) => (
                                                <td key={j} style={{ color: '#374151', padding: '12px 16px' }}>
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div
                            style={{
                                color: '#94a3b8',
                                fontSize: '14px',
                                padding: '20px',
                                textAlign: 'center'
                            }}
                        >
                            None
                        </div>
                    ))}
            </div>
        )
    }
}
