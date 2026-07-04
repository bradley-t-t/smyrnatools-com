/**
 * Operations-side aggregators — operator coverage (active assets vs the
 * operators on the payroll), hours utilization rollup (distribution,
 * per-plant averages, top consumers, hours-per-year leaderboard), and the
 * shop-performance rollup (sub-status distribution, per-plant load, tenure
 * histogram, stuck/ready watchlists). Shop helpers (`shopTenureBucket`,
 * `incrementShopSubStatus`, `mapShopAssetRow`) and the bucket/order
 * constants are private to this file.
 */

import AssetStatsUtility, {
    daysSince,
    displayStatus,
    itemDisplayId,
    itemYear,
    SHOP_SUB_LABELS
} from './AssetStatsUtility'
import { finiteHours, plantCodeOrUnassigned, upperCode } from './AssetStatsScope'

/** Operator coverage — active assets vs operators on the payroll in scope.
 *  Returns null when the asset type doesn't carry operator assignment. */
export const computeOperatorCoverage = (
    operationalItems: any[],
    operators: any[] | null | undefined,
    config: any,
    { regionPlantCodes, selectedPlant }: { regionPlantCodes?: Set<string> | null; selectedPlant?: string | null }
): any => {
    if (!config?.hasOperatorAssignment) return null
    const plant = upperCode(selectedPlant)
    const position = config?.operatorConfig?.position
    const isInScope = (op: any) => {
        if (!op || op.status !== 'Active') return false
        if (position && op.position !== position) return false
        const opPlant = upperCode(op.plantCode)
        if (regionPlantCodes && regionPlantCodes.size > 0 && opPlant && !regionPlantCodes.has(opPlant)) return false
        if (plant && plant !== 'ALL' && opPlant !== plant) return false
        return true
    }
    const activeOperators = (operators || []).filter(isInScope)
    const activeAssets = operationalItems.filter((item) => item.status === 'Active')
    const assigned = activeAssets.filter((item) => item.assignedOperator).length
    const assignedIds = new Set(activeAssets.map((item) => item.assignedOperator).filter(Boolean))
    const benchedOperators = activeOperators.filter((op) => !assignedIds.has(op.employeeId))
    const benchedList = benchedOperators
        .map((op) => ({ id: op.employeeId, name: op.name || op.employeeId, plant: op.plantCode || '—' }))
        .sort((a, b) => a.plant.localeCompare(b.plant) || a.name.localeCompare(b.name))
    const unassignedAssetList = activeAssets
        .filter((item) => !item.assignedOperator)
        .map((item) => ({
            id: item.id,
            identifier: itemDisplayId(item, config),
            plant: item.assignedPlant || '—',
            status: displayStatus(item)
        }))
        .sort((a, b) => a.plant.localeCompare(b.plant) || a.identifier.localeCompare(b.identifier))
    return {
        activeAssets: activeAssets.length,
        activeOperators: activeOperators.length,
        assignedAssets: assigned,
        benchedList: benchedList.slice(0, 20),
        benchedOperators: benchedOperators.length,
        unassignedAssetList: unassignedAssetList.slice(0, 20),
        unassignedAssets: activeAssets.length - assigned
    }
}

const HOURS_BUCKETS: { label: string; max: number }[] = [
    { label: '< 100h', max: 100 },
    { label: '100–2.5k', max: 2500 },
    { label: '2.5k–5k', max: 5000 },
    { label: '5k–10k', max: 10000 },
    { label: '10k–15k', max: 15000 },
    { label: '15k–25k', max: 25000 },
    { label: '> 25k', max: Infinity }
]

/** Hours utilization rollup — distribution, per-plant averages, top
 *  consumers, hours-per-year leaderboard. Returns `{ hasHours: false }`
 *  when the asset type doesn't track hours so the section drops cleanly. */
export const computeHoursStats = (
    operationalItems: any[],
    operatorNames: Map<string, string>,
    plantNames: Map<string, string>,
    config: any
): any => {
    const hasHours = !!config?.verification?.hasHours
    if (!hasHours) return { hasHours: false }

    const currentYear = new Date().getFullYear()
    const rows = operationalItems
        .map((item) => {
            const year = itemYear(item)
            return {
                age: year ? currentYear - year : null,
                hours: Number(item.hours),
                id: item.id,
                identifier: itemDisplayId(item, config),
                operatorName: operatorNames.get(item.assignedOperator) || null,
                plant: item.assignedPlant || '—',
                status: displayStatus(item),
                year
            }
        })
        .filter((row) => Number.isFinite(row.hours) && row.hours >= 0)

    if (rows.length === 0) {
        return {
            avgHours: null,
            avgHoursPerYear: null,
            hasHours,
            hoursByPlant: [],
            hoursDistribution: [],
            hoursPerYearTopList: [],
            hoursRecorded: 0,
            hoursTotal: 0,
            hoursUnrecorded: operationalItems.length,
            medianHours: null,
            topByHours: []
        }
    }

    const sortedByHours = [...rows].sort((a, b) => a.hours - b.hours)
    const total = sortedByHours.reduce((sum, row) => sum + row.hours, 0)
    const avgHours = total / sortedByHours.length
    const medianIdx = Math.floor(sortedByHours.length / 2)
    const medianHours =
        sortedByHours.length % 2 === 0
            ? (sortedByHours[medianIdx - 1].hours + sortedByHours[medianIdx].hours) / 2
            : sortedByHours[medianIdx].hours

    const distribution = HOURS_BUCKETS.map(({ label }) => ({ count: 0, label }))
    rows.forEach((row) => {
        const idx = HOURS_BUCKETS.findIndex((bucket) => row.hours <= bucket.max)
        const target = idx === -1 ? distribution.length - 1 : idx
        distribution[target].count += 1
    })

    const plantMap = new Map<string, { code: string; max: number; name: string; samples: number; sum: number }>()
    rows.forEach((row) => {
        const code = plantCodeOrUnassigned(row.plant)
        if (!plantMap.has(code)) {
            plantMap.set(code, { code, max: 0, name: plantNames.get(code) || code, samples: 0, sum: 0 })
        }
        const bucket = plantMap.get(code)!
        bucket.samples += 1
        bucket.sum += row.hours
        if (row.hours > bucket.max) bucket.max = row.hours
    })
    const hoursByPlant = [...plantMap.values()]
        .map((row) => ({ ...row, avg: row.samples > 0 ? row.sum / row.samples : 0 }))
        .sort((a, b) => b.avg - a.avg || b.sum - a.sum)

    const topByHours = [...rows].sort((a, b) => b.hours - a.hours).slice(0, 15)

    const withAge = rows.filter((row) => row.age != null && row.age > 0 && row.hours > 0)
    const hoursPerYearTopList = withAge
        .map((row) => ({ ...row, hoursPerYear: row.hours / (row.age as number) }))
        .sort((a, b) => b.hoursPerYear - a.hoursPerYear)
        .slice(0, 15)

    const avgHoursPerYear =
        withAge.length > 0
            ? withAge.reduce((sum, row) => sum + row.hours / (row.age as number), 0) / withAge.length
            : null

    return {
        avgHours,
        avgHoursPerYear,
        hasHours,
        hoursByPlant,
        hoursDistribution: distribution,
        hoursPerYearTopList,
        hoursRecorded: rows.length,
        hoursTotal: total,
        hoursUnrecorded: operationalItems.length - rows.length,
        medianHours,
        topByHours
    }
}

const SHOP_SUB_STATUS_ORDER = ['In Shop', 'Third Party Work', 'Ready For Pickup', 'Waiting For Shop', 'Down In Yard']
const SHOP_TENURE_ORDER = ['0–3d', '4–7d', '8–14d', '15–30d', '31–60d', '> 60d']
const SHOP_STUCK_THRESHOLD_DAYS = 30

const shopTenureBucket = (days: number | null): string | null => {
    if (days == null) return null
    if (days <= 3) return '0–3d'
    if (days <= 7) return '4–7d'
    if (days <= 14) return '8–14d'
    if (days <= 30) return '15–30d'
    if (days <= 60) return '31–60d'
    return '> 60d'
}

interface ShopByPlantRow {
    code: string
    downInYard: number
    inShop: number
    name: string
    readyForPickup: number
    thirdParty: number
    total: number
    waitingForShop: number
}

const incrementShopSubStatus = (row: ShopByPlantRow, shopStatus: string | null | undefined): void => {
    switch (shopStatus) {
        case 'down_in_yard':
            row.downInYard += 1
            break
        case 'ready_for_pickup':
            row.readyForPickup += 1
            break
        case 'third_party':
            row.thirdParty += 1
            break
        case 'waiting_for_shop':
            row.waitingForShop += 1
            break
        default:
            row.inShop += 1
    }
}

const mapShopAssetRow = (item: any, operatorNames: Map<string, string>, config: any) => ({
    days: daysSince(item.statusChangedAt || item.createdAt),
    id: item.id,
    identifier: itemDisplayId(item, config),
    operatorName: operatorNames.get(item.assignedOperator) || null,
    plant: item.assignedPlant || '—',
    shopStatus: item.shopStatus || 'in_shop',
    status: displayStatus(item)
})

/** Shop performance rollup — sub-status distribution, per-plant load,
 *  tenure histogram, stuck/ready watchlists. Requires `summaryTotal` so
 *  the shop rate is consistent with the headline KPI strip. */
export const computeShopPerformance = (
    operationalItems: any[],
    operatorNames: Map<string, string>,
    plantNames: Map<string, string>,
    config: any,
    summaryTotal: number
): any => {
    const shopItems = operationalItems.filter((item) => item.status === 'In Shop')
    const supportsSubStatuses = !!config?.hasShopSubStatuses

    const subStatusCounts = new Map<string, number>()
    const subStatusTenureSum = new Map<string, number>()
    const subStatusTenureSamples = new Map<string, number>()
    let totalTenureSum = 0
    let totalTenureSamples = 0

    shopItems.forEach((item) => {
        const tenure = daysSince(item.statusChangedAt || item.createdAt)
        if (tenure != null) {
            totalTenureSum += tenure
            totalTenureSamples += 1
        }
        if (!supportsSubStatuses) return
        const label = SHOP_SUB_LABELS[item.shopStatus || 'in_shop'] || 'In Shop'
        subStatusCounts.set(label, (subStatusCounts.get(label) || 0) + 1)
        if (tenure != null) {
            subStatusTenureSum.set(label, (subStatusTenureSum.get(label) || 0) + tenure)
            subStatusTenureSamples.set(label, (subStatusTenureSamples.get(label) || 0) + 1)
        }
    })

    const subStatusDistribution = supportsSubStatuses
        ? SHOP_SUB_STATUS_ORDER.filter((label) => subStatusCounts.has(label)).map((label) => {
              const count = subStatusCounts.get(label) || 0
              const sampleCount = subStatusTenureSamples.get(label) || 0
              const avgDays = sampleCount > 0 ? (subStatusTenureSum.get(label) || 0) / sampleCount : null
              return { avgDays, count, label }
          })
        : []

    const shopByPlantMap = new Map<string, ShopByPlantRow>()
    shopItems.forEach((item) => {
        const code = plantCodeOrUnassigned(item.assignedPlant)
        if (!shopByPlantMap.has(code)) {
            shopByPlantMap.set(code, {
                code,
                downInYard: 0,
                inShop: 0,
                name: plantNames.get(code) || code,
                readyForPickup: 0,
                thirdParty: 0,
                total: 0,
                waitingForShop: 0
            })
        }
        const row = shopByPlantMap.get(code)!
        row.total += 1
        if (!supportsSubStatuses) {
            row.inShop += 1
            return
        }
        incrementShopSubStatus(row, item.shopStatus)
    })
    const shopByPlant = [...shopByPlantMap.values()].sort((a, b) => b.total - a.total || a.code.localeCompare(b.code))

    const tenureMap = new Map<string, number>(SHOP_TENURE_ORDER.map((label) => [label, 0]))
    shopItems.forEach((item) => {
        const bucket = shopTenureBucket(daysSince(item.statusChangedAt || item.createdAt))
        if (bucket) tenureMap.set(bucket, (tenureMap.get(bucket) || 0) + 1)
    })
    const tenureDistribution = SHOP_TENURE_ORDER.map((label) => ({ count: tenureMap.get(label) || 0, label }))

    const stuckInShop = shopItems
        .map((item) => mapShopAssetRow(item, operatorNames, config))
        .sort((a, b) => (b.days ?? 0) - (a.days ?? 0))
        .slice(0, 25)

    const readyForPickupQueue = supportsSubStatuses
        ? shopItems
              .filter((item) => item.shopStatus === 'ready_for_pickup')
              .map((item) => mapShopAssetRow(item, operatorNames, config))
              .sort((a, b) => (b.days ?? 0) - (a.days ?? 0))
        : []

    const countByShopStatus = (status: string): number =>
        supportsSubStatuses ? shopItems.filter((item) => item.shopStatus === status).length : 0

    const inShopCount = supportsSubStatuses
        ? shopItems.filter((item) => item.shopStatus === 'in_shop' || !item.shopStatus).length
        : shopItems.length

    const stuckCount = shopItems.filter((item) => {
        const days = daysSince(item.statusChangedAt || item.createdAt)
        return days != null && days >= SHOP_STUCK_THRESHOLD_DAYS
    }).length

    const totalInShop = shopItems.length

    return {
        avgShopDays: totalTenureSamples > 0 ? totalTenureSum / totalTenureSamples : null,
        downInYardCount: countByShopStatus('down_in_yard'),
        inShopCount,
        readyForPickupCount: countByShopStatus('ready_for_pickup'),
        readyForPickupQueue,
        shopByPlant,
        shopItems,
        shopRate: summaryTotal > 0 ? totalInShop / summaryTotal : 0,
        stuckCount,
        stuckInShop,
        stuckThreshold: SHOP_STUCK_THRESHOLD_DAYS,
        subStatusDistribution,
        supportsSubStatuses,
        tenureDistribution,
        thirdPartyCount: countByShopStatus('third_party'),
        totalInShop,
        waitingForShopCount: countByShopStatus('waiting_for_shop')
    }
}
