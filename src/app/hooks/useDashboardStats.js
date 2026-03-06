import { useCallback, useRef, useState } from 'react'

import { RegionService } from '../../services/RegionService'
import DashboardUtility from '../../utils/DashboardUtility'
import VerifiedUtility from '../../utils/VerifiedUtility'
import { INITIAL_STATS } from '../constants/dashboardConstants'
const CALC_PERCENT = (numerator, denominator) => (denominator ? Math.round((numerator / denominator) * 100) : 0)
const createBaseTotals = () => ({
    active: 0,
    comments: 0,
    issues: 0,
    overdue: 0,
    shop: 0,
    spare: 0,
    total: 0,
    verified: 0
})
/**
 * Computes dashboard statistics (totals, allocation percentages, verification rates)
 * from fleet asset refs, filtered by the active region/plant scope.
 */
export function useDashboardStats({ createFilterFn, dashboardRegionCode, updatePlantSet }) {
    const [stats, setStats] = useState(INITIAL_STATS)
    const prevSnapshotRef = useRef(null)
    const countsRef = useRef({ equipment: {}, mixers: {}, tractors: {}, trailers: {} })
    const allMixersRef = useRef([])
    const allTractorsRef = useRef([])
    const allTrailersRef = useRef([])
    const allEquipmentRef = useRef([])
    const allPickupsRef = useRef([])
    const allOperatorsRef = useRef([])
    const computeStats = useCallback(() => {
        const region = RegionService.getRegionByCode(dashboardRegionCode)
        const isAggregate = region?.type === 'Aggregate'
        const plantSet = updatePlantSet(region?.type)
        const consider = createFilterFn(plantSet)
        const counts = countsRef.current
        const mixersTotals = createBaseTotals()
        const tractorsTotals = {
            ...createBaseTotals(),
            freight: {
                Aggregate: { active: 0, shop: 0, spare: 0, total: 0 },
                Cement: { active: 0, shop: 0, spare: 0, total: 0 },
                'Dump Truck': { active: 0, shop: 0, spare: 0, total: 0 },
                Other: { active: 0, shop: 0, spare: 0, total: 0 }
            }
        }
        const trailersTotals = {
            ...createBaseTotals(),
            trailerType: {
                Cement: { active: 0, shop: 0, spare: 0, total: 0 },
                'End Dump': { active: 0, shop: 0, spare: 0, total: 0 }
            }
        }
        const equipmentTotals = createBaseTotals()
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
        const incrementStatusSubtype = (totals, subtypeObj, subtypeKey, status) => {
            subtypeObj[subtypeKey].total++
            if (status === 'Active') {
                totals.active++
                subtypeObj[subtypeKey].active++
            } else if (status === 'Spare') {
                totals.spare++
                subtypeObj[subtypeKey].spare++
            } else if (status === 'In Shop') {
                totals.shop++
                subtypeObj[subtypeKey].shop++
            }
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
            if (!consider(t.plantCode) || t.status === 'Retired') return
            tractorsTotals.total++
            tractorsAvailable++
            const freightType = t.freight && tractorsTotals.freight[t.freight] ? t.freight : 'Other'
            incrementStatusSubtype(tractorsTotals, tractorsTotals.freight, freightType, t.status)
            if (DashboardUtility.isServiceOverdue(t.lastServiceDate)) tractorsTotals.overdue++
            if (VerifiedUtility.isVerified(t.updatedLast, t.updatedAt, t.updatedBy)) tractorsTotals.verified++
            if (t.assignedOperator) tractorAssignedIds.add(t.assignedOperator)
            const tc = counts.tractors?.[t.id]
            if (tc) {
                tractorsTotals.issues += tc.issues || 0
                tractorsTotals.comments += tc.comments || 0
            }
        })
        allTrailersRef.current.forEach((r) => {
            if (!consider(r.plantCode) || r.status === 'Retired') return
            trailersTotals.total++
            trailersAvailable++
            const tType = r.trailerType === 'End Dump' ? 'End Dump' : 'Cement'
            incrementStatusSubtype(trailersTotals, trailersTotals.trailerType, tType, r.status)
            if (DashboardUtility.isServiceOverdue(r.lastServiceDate)) trailersTotals.overdue++
            const rc = counts.trailers?.[r.id]
            if (rc) {
                trailersTotals.issues += rc.issues || 0
                trailersTotals.comments += rc.comments || 0
            }
        })
        allEquipmentRef.current.forEach((e) => {
            if (!consider(e.plantCode)) return
            if (processAssetStatus(e, equipmentTotals)) equipmentAvailable++
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
        const mixersVerifiedPercent = CALC_PERCENT(mixersTotals.verified, mixersAvailable)
        const tractorsVerifiedPercent = CALC_PERCENT(tractorsTotals.verified, tractorsAvailable)
        const verifiedValues = []
        if (!isAggregate && mixersTotals.total) verifiedValues.push(mixersVerifiedPercent)
        if (tractorsTotals.total) verifiedValues.push(tractorsVerifiedPercent)
        const verificationAvg = verifiedValues.length
            ? Math.round(verifiedValues.reduce((a, b) => a + b, 0) / verifiedValues.length)
            : 0
        let openIssuesTotal = isAggregate ? 0 : mixersTotals.issues
        openIssuesTotal += tractorsTotals.issues + trailersTotals.issues + equipmentTotals.issues
        let overdueTotal = isAggregate ? 0 : mixersTotals.overdue
        overdueTotal += tractorsTotals.overdue + trailersTotals.overdue + equipmentTotals.overdue
        let fleetTotal = isAggregate ? 0 : mixersTotals.total
        fleetTotal += tractorsTotals.total + trailersTotals.total + equipmentTotals.total + pickupsTotals.total
        const mixersAllocationPercent = CALC_PERCENT(mixersTotals.active, mixersAvailable)
        const tractorsAllocationPercent = CALC_PERCENT(tractorsTotals.active, tractorsAvailable)
        const trailersAllocationPercent = CALC_PERCENT(trailersTotals.active, trailersAvailable)
        const equipmentAllocationPercent = CALC_PERCENT(equipmentTotals.active, equipmentAvailable)
        const pickupsAllocationPercent = CALC_PERCENT(pickupsTotals.active + pickupsTotals.stationary, pickupsAvailable)
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
            overallAllocationPercent: CALC_PERCENT(overallActiveNumerator, overallAvailable),
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
    return {
        allEquipmentRef,
        allMixersRef,
        allOperatorsRef,
        allPickupsRef,
        allTractorsRef,
        allTrailersRef,
        computeStats,
        countsRef,
        stats
    }
}
