/**
 * Scope + summary aggregators consumed by `useAssetStatistics`. Handles the
 * top-level "what's in scope" filtering (region, plant, date range) plus the
 * headline KPI rollup that the Overview launchpad surfaces. Other section
 * files (`AssetStatsFleet`, `AssetStatsService`, `AssetStatsOperations`)
 * import the shared `UNASSIGNED_PLANT_CODE`, `upperCode`, `plantCodeOrUnassigned`,
 * `verifiedNow`, and `finiteHours` helpers from here.
 */

import AssetStatsUtility, { daysSince, itemYear, RETIRED_STATUSES } from './AssetStatsUtility'

export const UNASSIGNED_PLANT_CODE = 'UNASSIGNED'

export const upperCode = (value: unknown): string =>
    String(value || '')
        .trim()
        .toUpperCase()

export const plantCodeOrUnassigned = (value: unknown): string => upperCode(value) || UNASSIGNED_PLANT_CODE

export const verifiedNow = (item: { isVerified?: () => boolean }): boolean =>
    typeof item.isVerified === 'function' ? item.isVerified() : false

export const finiteHours = (value: unknown): number | null => {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
}

/** Filter the raw `items` list down to what the Statistics page should see —
 *  honors the active region, the page-local plant filter (independent from
 *  the list view), and the date range. Returns the original array when the
 *  input isn't iterable so downstream memos stay safe. */
export const computeScopedItems = (
    items: any[] | null | undefined,
    {
        dateRange,
        regionPlantCodes,
        selectedPlant
    }: {
        dateRange?: { end?: string | null; start?: string | null } | null
        regionPlantCodes?: Set<string> | null
        selectedPlant?: string | null
    }
): any[] => {
    if (!Array.isArray(items)) return []
    const plant = upperCode(selectedPlant)
    const startTime = dateRange?.start ? new Date(`${dateRange.start}T00:00:00`).getTime() : null
    const endTime = dateRange?.end ? new Date(`${dateRange.end}T23:59:59.999`).getTime() : null
    return items.filter((item) => {
        const itemPlant = upperCode(item.assignedPlant)
        if (regionPlantCodes && regionPlantCodes.size > 0 && itemPlant && !regionPlantCodes.has(itemPlant)) return false
        if (plant && plant !== 'ALL' && itemPlant !== plant) return false
        if (startTime != null && endTime != null) {
            const activity = item.updatedAt || item.updatedLast || item.createdAt || null
            if (!activity) return false
            const activityTime = new Date(activity).getTime()
            if (!Number.isFinite(activityTime)) return false
            if (activityTime < startTime || activityTime > endTime) return false
        }
        return true
    })
}

/** Headline KPI surface for the Overview launchpad. Single O(n) pass over
 *  operational items rolling up verification, service, issues, cleanliness,
 *  data-completeness, fleet year, hours, and tenure metrics. */
export const computeSummary = (
    scopedItems: any[],
    operationalItems: any[],
    retiredItems: any[],
    config: any
): Record<string, any> => {
    const counts = AssetStatsUtility.getStatusCounts(scopedItems)
    const total = counts.Total || 0
    const hasService = !!config?.verification?.isServiceOverdueFn || config?.key === 'mixer'
    const hasChip = !!config?.verification?.hasLastChipDate
    const hasCleanliness = scopedItems.some((item) => item.cleanlinessRating != null)

    const accumulator = {
        assetsMissingAnyField: 0,
        assetsWithOpenIssues: 0,
        cleanlinessSamples: 0,
        cleanlinessSum: 0,
        dirtyCount: 0,
        hoursSamples: 0,
        hoursSum: 0,
        missingMake: 0,
        missingModel: 0,
        missingVin: 0,
        missingYear: 0,
        openIssues: 0,
        overdueChip: 0,
        overdueService: 0,
        tenureSamples: 0,
        tenureSum: 0,
        unassignedActive: 0,
        unverified: 0,
        verified: 0,
        yearSamples: 0,
        yearSum: 0
    }

    operationalItems.forEach((item) => {
        if (verifiedNow(item)) accumulator.verified += 1
        else accumulator.unverified += 1

        if (hasService && AssetStatsUtility.isServiceOverdue(item.lastServiceDate)) accumulator.overdueService += 1
        if (hasChip && AssetStatsUtility.isServiceOverdue(item.lastChipDate, 90)) accumulator.overdueChip += 1

        const open = Number(item.openIssuesCount || 0)
        if (open > 0) {
            accumulator.openIssues += open
            accumulator.assetsWithOpenIssues += 1
        }

        if (item.cleanlinessRating != null) {
            const rating = Number(item.cleanlinessRating) || 0
            accumulator.cleanlinessSamples += 1
            accumulator.cleanlinessSum += rating
            if (rating > 0 && rating < 3) accumulator.dirtyCount += 1
        }

        if (config?.hasOperatorAssignment && item.status === 'Active' && !item.assignedOperator) {
            accumulator.unassignedActive += 1
        }

        const year = itemYear(item)
        if (year) {
            accumulator.yearSum += year
            accumulator.yearSamples += 1
        }

        const hours = finiteHours(item.hours)
        if (hours != null) {
            accumulator.hoursSum += hours
            accumulator.hoursSamples += 1
        }

        const vin = item.vinNumber || item.vin
        const missingVin = !vin
        const missingMake = !item.make
        const missingModel = !item.model
        const missingYear = !item.year
        if (missingVin || missingMake || missingModel || missingYear) accumulator.assetsMissingAnyField += 1
        if (missingVin) accumulator.missingVin += 1
        if (missingMake) accumulator.missingMake += 1
        if (missingModel) accumulator.missingModel += 1
        if (missingYear) accumulator.missingYear += 1

        const tenure = daysSince(item.statusChangedAt || item.createdAt)
        if (tenure != null) {
            accumulator.tenureSum += tenure
            accumulator.tenureSamples += 1
        }
    })

    return {
        activeCount: counts.Active || 0,
        assetsMissingAnyField: accumulator.assetsMissingAnyField,
        assetsWithOpenIssues: accumulator.assetsWithOpenIssues,
        avgFleetYear: accumulator.yearSamples > 0 ? Math.round(accumulator.yearSum / accumulator.yearSamples) : null,
        avgHours: accumulator.hoursSamples > 0 ? accumulator.hoursSum / accumulator.hoursSamples : null,
        avgStatusTenure:
            accumulator.tenureSamples > 0 ? Math.round(accumulator.tenureSum / accumulator.tenureSamples) : null,
        cleanlinessAvg:
            accumulator.cleanlinessSamples > 0 ? accumulator.cleanlinessSum / accumulator.cleanlinessSamples : null,
        cleanlinessSamples: accumulator.cleanlinessSamples,
        dirtyCount: accumulator.dirtyCount,
        dirtyRate: hasCleanliness && total > 0 ? accumulator.dirtyCount / total : null,
        hasChip,
        hasCleanliness,
        hasService,
        missingMake: accumulator.missingMake,
        missingModel: accumulator.missingModel,
        missingVin: accumulator.missingVin,
        missingYear: accumulator.missingYear,
        openIssues: accumulator.openIssues,
        overdueChip: accumulator.overdueChip,
        overdueService: accumulator.overdueService,
        overdueServiceRate: hasService && total > 0 ? accumulator.overdueService / total : null,
        retiredCount: retiredItems.length,
        shopCount: counts['In Shop'] || 0,
        spareCount: counts.Spare || 0,
        total,
        unassignedActive: accumulator.unassignedActive,
        unverified: accumulator.unverified,
        verified: accumulator.verified,
        verifiedRate: total > 0 ? accumulator.verified / total : null
    }
}

/** Plant codes the Statistics filter menu should offer — limited to plants
 *  that actually have at least one operational asset in scope. */
export const computeAvailablePlantCodes = (operationalItems: any[]): string[] => {
    const set = new Set<string>()
    operationalItems.forEach((item) => {
        const code = upperCode(item.assignedPlant)
        if (code) set.add(code)
    })
    return [...set].sort()
}

/** Operational set — most KPIs read this so retired assets don't dilute
 *  fleet health. */
export const filterOperational = (scopedItems: any[]): any[] =>
    scopedItems.filter((item) => !RETIRED_STATUSES.includes(item.status))

/** Retired set — surfaced explicitly for "fleet aging" purposes. */
export const filterRetired = (scopedItems: any[]): any[] =>
    scopedItems.filter((item) => RETIRED_STATUSES.includes(item.status))
