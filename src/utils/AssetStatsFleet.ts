/**
 * Fleet-shape aggregators — status distribution, per-plant scorecard, tenure
 * + age histograms, and the longest-in-status / oldest-assets watchlists.
 * Shares the plant-code/verification helpers with the other section files via
 * `AssetStatsScope`.
 */

import AssetStatsUtility, {
    AGE_BUCKET_ORDER,
    ageBucket,
    daysSince,
    displayStatus,
    itemDisplayId,
    itemYear,
    TENURE_BUCKET_ORDER,
    tenureBucket
} from './AssetStatsUtility'
import { finiteHours, plantCodeOrUnassigned, verifiedNow } from './AssetStatsScope'

/** Status distribution for the Fleet Status page — flattens In-Shop sub
 *  statuses to match the list view. */
export const computeStatusDistribution = (operationalItems: any[]): { count: number; label: string }[] => {
    const totals = new Map<string, number>()
    operationalItems.forEach((item) => {
        const label = displayStatus(item)
        totals.set(label, (totals.get(label) || 0) + 1)
    })
    return [...totals.entries()].map(([label, count]) => ({ count, label })).sort((a, b) => b.count - a.count)
}

/** Per-plant scorecard — active/spare/shop split + operator coverage. */
export const computePerPlant = (
    operationalItems: any[],
    plantNames: Map<string, string>,
    config: any,
    hasService: boolean
): any[] => {
    const map = new Map<string, any>()
    operationalItems.forEach((item) => {
        const code = plantCodeOrUnassigned(item.assignedPlant)
        if (!map.has(code)) {
            map.set(code, {
                active: 0,
                code,
                name: plantNames.get(code) || code,
                openIssues: 0,
                overdueService: 0,
                shop: 0,
                spare: 0,
                total: 0,
                unassignedActive: 0,
                unverified: 0,
                verified: 0
            })
        }
        const row = map.get(code)
        row.total += 1
        if (item.status === 'Active') row.active += 1
        else if (item.status === 'Spare') row.spare += 1
        else if (item.status === 'In Shop') row.shop += 1
        if (verifiedNow(item)) row.verified += 1
        else row.unverified += 1
        if (config?.hasOperatorAssignment && item.status === 'Active' && !item.assignedOperator) {
            row.unassignedActive += 1
        }
        if (hasService && AssetStatsUtility.isServiceOverdue(item.lastServiceDate)) row.overdueService += 1
        row.openIssues += Number(item.openIssuesCount || 0)
    })
    return [...map.values()].sort((a, b) => b.total - a.total || a.code.localeCompare(b.code))
}

/** Tenure histogram for the Fleet Status page. */
export const computeTenureBuckets = (operationalItems: any[]): { count: number; label: string }[] => {
    const map = new Map<string, number>(TENURE_BUCKET_ORDER.map((label) => [label, 0]))
    operationalItems.forEach((item) => {
        const bucket = tenureBucket(daysSince(item.statusChangedAt || item.createdAt))
        if (bucket) map.set(bucket, (map.get(bucket) || 0) + 1)
    })
    return TENURE_BUCKET_ORDER.map((label) => ({ count: map.get(label) || 0, label }))
}

/** Longest-tenure watchlist (top 12, ≥ 7 days). */
export const computeLongestInStatus = (
    operationalItems: any[],
    operatorNames: Map<string, string>,
    config: any
): any[] =>
    operationalItems
        .map((item) => ({
            days: daysSince(item.statusChangedAt || item.createdAt),
            displayStatus: displayStatus(item),
            id: item.id,
            identifier: itemDisplayId(item, config),
            operatorName: operatorNames.get(item.assignedOperator) || null,
            plant: item.assignedPlant || '—',
            status: item.status
        }))
        .filter((row) => row.days != null && row.days >= 7)
        .sort((a, b) => (b.days || 0) - (a.days || 0))
        .slice(0, 12)

/** Year/age histogram with a separate "Unknown" bucket for missing years. */
export const computeAgeDistribution = (operationalItems: any[]): { count: number; label: string }[] => {
    const currentYear = new Date().getFullYear()
    const map = new Map<string, number>(AGE_BUCKET_ORDER.map((label) => [label, 0]))
    let unknownYear = 0
    operationalItems.forEach((item) => {
        const bucket = ageBucket(item.year, currentYear)
        if (bucket) map.set(bucket, (map.get(bucket) || 0) + 1)
        else unknownYear += 1
    })
    const rows = AGE_BUCKET_ORDER.map((label) => ({ count: map.get(label) || 0, label }))
    if (unknownYear > 0) rows.push({ count: unknownYear, label: 'Unknown' })
    return rows
}

/** Oldest-asset watchlist (top 12, ignoring rows without a year). */
export const computeOldestAssets = (operationalItems: any[], config: any): any[] => {
    const currentYear = new Date().getFullYear()
    return operationalItems
        .filter((item) => itemYear(item))
        .map((item) => ({
            age: currentYear - (itemYear(item) || 0),
            hours: finiteHours(item.hours),
            id: item.id,
            identifier: itemDisplayId(item, config),
            make: item.make || '—',
            model: item.model || '—',
            plant: item.assignedPlant || '—',
            status: item.status,
            year: itemYear(item) as number
        }))
        .sort((a, b) => a.year - b.year || (b.hours || 0) - (a.hours || 0))
        .slice(0, 12)
}
