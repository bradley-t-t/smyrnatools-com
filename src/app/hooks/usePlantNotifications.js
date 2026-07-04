import { useEffect, useState } from 'react'

import AssetStatsUtility from '../../utils/AssetStatsUtility'
import DashboardUtility from '../../utils/DashboardUtility'
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
                        AssetStatsUtility.isServiceOverdue(a.lastServiceDate)
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
            spareMixers < inShopMixers
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
    return { plantNotifications }
}
