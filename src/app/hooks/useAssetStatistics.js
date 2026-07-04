import { useMemo } from 'react'

import {
    computeAgeDistribution,
    computeAvailablePlantCodes,
    computeCleanlinessByPlant,
    computeCleanlinessDistribution,
    computeDirtyAssets,
    computeHoursStats,
    computeLongestInStatus,
    computeOldestAssets,
    computeOperatorCoverage,
    computeOverdueServiceList,
    computePerPlant,
    computeScopedItems,
    computeShopPerformance,
    computeStatusDistribution,
    computeSummary,
    computeTenureBuckets,
    computeTopIssueAssets,
    filterOperational,
    filterRetired
} from '../../utils/AssetStatsAggregators'
import { itemDisplayId, operatorNameLookup, plantNameLookup } from '../../utils/AssetStatsUtility'

export { itemDisplayId }

/**
 * Derives every metric the asset Statistics page renders from the items,
 * operators, and plants already loaded by `useAssetData`. Pure memoization —
 * no fetches, no side effects — so the hook stays cheap and the underlying
 * realtime stream from the list keeps every section live without extra
 * subscriptions.
 *
 * The hook is config-driven so the same code powers mixers, tractors,
 * trailers, equipment, and pickup trucks; per-asset feature flags
 * (cleanliness, service tracking, operator assignment) gate the optional
 * sections cleanly. The aggregator math lives in `AssetStatsAggregators.ts`
 * so each memo body is a one-liner — keep section-specific logic there.
 */
export default function useAssetStatistics({
    config,
    dateRange,
    items,
    operators,
    plants,
    regionPlantCodes,
    selectedPlant
}) {
    const plantNames = useMemo(() => plantNameLookup(plants), [plants])
    const operatorNames = useMemo(() => operatorNameLookup(operators), [operators])

    const scopedItems = useMemo(
        () => computeScopedItems(items, { dateRange, regionPlantCodes, selectedPlant }),
        [dateRange, items, regionPlantCodes, selectedPlant]
    )

    const operationalItems = useMemo(() => filterOperational(scopedItems), [scopedItems])
    const retiredItems = useMemo(() => filterRetired(scopedItems), [scopedItems])

    const summary = useMemo(
        () => computeSummary(scopedItems, operationalItems, retiredItems, config),
        [config, operationalItems, retiredItems, scopedItems]
    )

    const statusDistribution = useMemo(() => computeStatusDistribution(operationalItems), [operationalItems])

    const perPlant = useMemo(
        () => computePerPlant(operationalItems, plantNames, config, summary.hasService),
        [config, operationalItems, plantNames, summary.hasService]
    )

    const tenureBuckets = useMemo(() => computeTenureBuckets(operationalItems), [operationalItems])

    const longestInStatus = useMemo(
        () => computeLongestInStatus(operationalItems, operatorNames, config),
        [config, operationalItems, operatorNames]
    )

    const ageDistribution = useMemo(() => computeAgeDistribution(operationalItems), [operationalItems])

    const oldestAssets = useMemo(() => computeOldestAssets(operationalItems, config), [config, operationalItems])

    const topIssueAssets = useMemo(
        () => computeTopIssueAssets(operationalItems, operatorNames, config),
        [config, operationalItems, operatorNames]
    )

    const cleanlinessDistribution = useMemo(() => computeCleanlinessDistribution(operationalItems), [operationalItems])

    const dirtyAssets = useMemo(
        () => computeDirtyAssets(operationalItems, operatorNames, config),
        [config, operationalItems, operatorNames]
    )

    const cleanlinessByPlant = useMemo(
        () => computeCleanlinessByPlant(operationalItems, plantNames),
        [operationalItems, plantNames]
    )

    const overdueServiceList = useMemo(
        () => computeOverdueServiceList(operationalItems, operatorNames, config, summary.hasService),
        [config, operationalItems, operatorNames, summary.hasService]
    )

    const operatorCoverage = useMemo(
        () => computeOperatorCoverage(operationalItems, operators, config, { regionPlantCodes, selectedPlant }),
        [config, operationalItems, operators, regionPlantCodes, selectedPlant]
    )

    const hoursStats = useMemo(
        () => computeHoursStats(operationalItems, operatorNames, plantNames, config),
        [config, operationalItems, operatorNames, plantNames]
    )

    const shopPerformance = useMemo(
        () => computeShopPerformance(operationalItems, operatorNames, plantNames, config, summary.total),
        [config, operationalItems, operatorNames, plantNames, summary.total]
    )

    const availablePlantCodes = useMemo(() => computeAvailablePlantCodes(operationalItems), [operationalItems])

    return {
        ageDistribution,
        availablePlantCodes,
        cleanlinessByPlant,
        cleanlinessDistribution,
        dirtyAssets,
        hoursStats,
        longestInStatus,
        oldestAssets,
        operatorCoverage,
        operatorNames,
        overdueServiceList,
        perPlant,
        plantNames,
        retiredItems,
        scopedItems,
        shopPerformance,
        statusDistribution,
        summary,
        tenureBuckets,
        topIssueAssets
    }
}
