/**
 * Dashboard computation utilities: slim asset mappers for memory-efficient storage,
 * status distribution calculations across date ranges, AI summary caching,
 * service-overdue checks, long-term shop detection, and plant-set filtering.
 */

interface BaseAsset {
    assignedPlant?: string
    createdAt?: string
    created_at?: string
    id: string
    plantCode?: string
    status?: string
    truck_number?: string
    truckNumber?: string
    [key: string]: unknown
}

interface VehicleAsset extends BaseAsset {
    assignedOperator?: string
    lastServiceDate?: string
    truckNumber?: string
    updatedAt?: string
    updatedBy?: string
    updatedLast?: string
    vin?: string
}

interface MixerAsset extends VehicleAsset {
    cleanliness_rating?: number
    cleanlinessRating?: number
    down_in_yard?: boolean
    downInYard?: boolean
}

interface TractorAsset extends VehicleAsset {
    freight?: string
}

interface TrailerAsset extends BaseAsset {
    asset_number?: string
    lastServiceDate?: string
    trailerNumber?: string
    trailerType?: string
    trailer_number?: string
    trailer_type?: string
}

interface EquipmentAsset extends BaseAsset {
    asset_number?: string
    identifyingNumber?: string
    identifying_number?: string
    lastServiceDate?: string
}

interface OperatorRecord {
    employeeId?: string
    id: string
    plantCode?: string
    position?: string
    status?: string
}

interface HistoryRecord {
    asset_id?: string
    changed_at: string
    equipment_id?: string
    field_name?: string
    mixer_id?: string
    new_value?: string
    old_value?: string
    tractor_id?: string
    trailer_id?: string
    truck_id?: string
    [key: string]: unknown
}

interface StatusDistributionEntry {
    days: number
    percentage: string
    status: string
}

interface ShopAssetResult {
    daysInShop: number
    downInYard: boolean
    enteredShop: string
    id: string
    identifier: string
    plantCode: string | undefined
    type: string
}

interface PlantRecord {
    plantCode?: string
    plant_code?: string
}

interface RegionRecord {
    type?: string
}

interface AICacheEntry {
    summary: string
    timestamp: number
}

const AI_CACHE_KEY = 'srm_plant_ai_summaries'
const AI_CACHE_DURATION = 24 * 60 * 60 * 1000
const SERVICE_OVERDUE_DAYS = 180
const MS_PER_DAY = 86400000

const resolvePlantCode = (asset: BaseAsset): string | undefined => asset.assignedPlant || asset.plantCode
const resolveTruckNumber = (asset: BaseAsset): string => asset.truckNumber || asset.truck_number || ''

const BASE_ASSET_FIELDS = (asset: BaseAsset) => ({
    id: asset.id,
    plantCode: resolvePlantCode(asset),
    status: asset.status
})

const VEHICLE_FIELDS = (asset: VehicleAsset) => ({
    assignedOperator: asset.assignedOperator,
    assignedPlant: resolvePlantCode(asset),
    lastServiceDate: asset.lastServiceDate,
    truckNumber: resolveTruckNumber(asset),
    updatedAt: asset.updatedAt,
    updatedBy: asset.updatedBy,
    updatedLast: asset.updatedLast,
    vin: asset.vin || ''
})

const slimMixer = (asset: MixerAsset) => ({
    ...BASE_ASSET_FIELDS(asset),
    ...VEHICLE_FIELDS(asset),
    cleanlinessRating: asset.cleanlinessRating || asset.cleanliness_rating || 0,
    downInYard: asset.downInYard || asset.down_in_yard || false
})

const slimTractor = (asset: TractorAsset) => ({
    ...BASE_ASSET_FIELDS(asset),
    ...VEHICLE_FIELDS(asset),
    freight: asset.freight || ''
})

const slimTrailer = (asset: TrailerAsset) => ({
    ...BASE_ASSET_FIELDS(asset),
    assignedPlant: resolvePlantCode(asset),
    identifyingNumber: asset.trailerNumber || asset.trailer_number || asset.truck_number || asset.asset_number || '',
    lastServiceDate: asset.lastServiceDate,
    trailerType: asset.trailerType || asset.trailer_type || 'Cement'
})

const slimEquipment = (asset: EquipmentAsset) => ({
    ...BASE_ASSET_FIELDS(asset),
    assignedPlant: resolvePlantCode(asset),
    identifyingNumber:
        asset.identifyingNumber || asset.identifying_number || asset.asset_number || asset.truck_number || '',
    lastServiceDate: asset.lastServiceDate
})

const slimPickup = (asset: BaseAsset) => ({
    ...BASE_ASSET_FIELDS(asset)
})

const slimOperator = (operator: OperatorRecord) => ({
    employeeId: operator.employeeId,
    id: operator.id,
    plantCode: operator.plantCode,
    position: operator.position,
    status: operator.status
})

const normalizeDate = (dateStr: string | null | undefined, endOfDay = false): Date | null => {
    if (!dateStr) return null
    const parts = dateStr.split('-')
    if (parts.length !== 3) return null
    if (endOfDay) {
        return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 23, 59, 59, 999))
    }
    return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0))
}

const ASSET_ID_FIELDS = ['mixer_id', 'tractor_id', 'trailer_id', 'equipment_id', 'truck_id'] as const

const daysBetween = (start: Date, end: Date): number => Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)

const getAssetStatusHistory = (historyRecords: HistoryRecord[], assetId: string): HistoryRecord[] =>
    historyRecords
        .filter((h) => ASSET_ID_FIELDS.some((field) => h[field] === assetId) && h.field_name === 'status')
        .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())

const resolveStatusAtDate = (sortedHistory: HistoryRecord[], cutoffDate: Date, fallbackStatus: string): string => {
    if (!sortedHistory.length) return fallbackStatus
    const recordsBefore = sortedHistory.filter((h) => new Date(h.changed_at) <= cutoffDate)
    if (recordsBefore.length) return recordsBefore[recordsBefore.length - 1].new_value || fallbackStatus
    return sortedHistory[0].old_value || fallbackStatus
}

const findEarliestDate = (dates: (Date | null)[]): Date | null =>
    dates.filter(Boolean).sort((a, b) => a!.getTime() - b!.getTime())[0] ?? null

const accumulateStatusDays = (statusDaysMap: Record<string, number>, status: string, days: number): number => {
    statusDaysMap[status] = (statusDaysMap[status] || 0) + days
    return days
}

const calculateStatusDistribution = (
    assets: BaseAsset[],
    historyRecords: HistoryRecord[],
    filterStartDate: string | null = null,
    filterEndDate: string | null = null
): StatusDistributionEntry[] => {
    const statusDaysMap: Record<string, number> = {}
    let totalDays = 0
    const rangeStart = filterStartDate ? normalizeDate(filterStartDate, false) : null
    const rangeEnd = filterEndDate ? normalizeDate(filterEndDate, true) : new Date()
    if (rangeEnd) {
        const earliestHistoryDate = findEarliestDate(
            historyRecords.filter((h) => h.changed_at).map((h) => new Date(h.changed_at))
        )
        const earliestCreationDate = findEarliestDate(
            assets
                .map((a) => a.createdAt || a.created_at)
                .filter(Boolean)
                .map((d) => new Date(d!))
        )
        const earliestDataDate = findEarliestDate([earliestHistoryDate, earliestCreationDate])
        if (earliestDataDate && rangeEnd < earliestDataDate) return []
    }
    for (const asset of assets) {
        const assetHistory = getAssetStatusHistory(historyRecords, asset.id)
        const currentStatus = asset.status || 'Unknown'
        const createdAt = asset.createdAt || asset.created_at
        const assetCreationDate = createdAt ? new Date(createdAt) : null
        if (assetCreationDate && rangeEnd && assetCreationDate > rangeEnd) continue
        const earliestAssetHistory = assetHistory.length > 0 ? new Date(assetHistory[0].changed_at) : null
        if (earliestAssetHistory && rangeEnd && earliestAssetHistory > rangeEnd) continue
        if (!earliestAssetHistory && rangeEnd && rangeEnd < new Date()) continue
        let effectiveStart = rangeStart
            ? assetCreationDate && assetCreationDate > rangeStart
                ? assetCreationDate
                : rangeStart
            : assetCreationDate || new Date()
        if (earliestAssetHistory && effectiveStart < earliestAssetHistory) {
            effectiveStart = earliestAssetHistory
        }
        if (effectiveStart > rangeEnd!) continue
        const startingStatus =
            rangeStart && assetHistory.length
                ? resolveStatusAtDate(assetHistory, rangeStart, currentStatus)
                : currentStatus
        const endingStatus =
            rangeEnd && assetHistory.length ? resolveStatusAtDate(assetHistory, rangeEnd, currentStatus) : currentStatus
        const recordsInRange =
            rangeStart && rangeEnd
                ? assetHistory.filter((h) => {
                      const changedAt = new Date(h.changed_at)
                      return changedAt > rangeStart && changedAt <= rangeEnd
                  })
                : assetHistory
        if (recordsInRange.length === 0) {
            totalDays += accumulateStatusDays(
                statusDaysMap,
                startingStatus,
                Math.max(1, daysBetween(effectiveStart, rangeEnd!))
            )
        } else {
            let previousStatus = startingStatus
            let previousDate = effectiveStart
            for (const entry of recordsInRange) {
                const changeDate = new Date(entry.changed_at)
                const days = daysBetween(previousDate, changeDate)
                if (days > 0) totalDays += accumulateStatusDays(statusDaysMap, previousStatus, days)
                previousStatus = entry.new_value || endingStatus
                previousDate = changeDate
            }
            const finalDays = daysBetween(previousDate, rangeEnd!)
            if (finalDays > 0) totalDays += accumulateStatusDays(statusDaysMap, previousStatus, finalDays)
        }
    }
    if (totalDays === 0) totalDays = 1
    const entries = Object.entries(statusDaysMap)
        .filter(([status]) => status !== 'Retired')
        .map(([status, days]) => ({
            days,
            percentage: ((days / totalDays) * 100).toFixed(1),
            status
        }))
        .sort((a, b) => b.days - a.days)
    if (entries.length > 0) {
        const sum = entries.reduce((acc, item) => acc + parseFloat(item.percentage), 0)
        if (sum < 100) {
            const lastEntry = entries[entries.length - 1]
            lastEntry.percentage = (parseFloat(lastEntry.percentage) + (100 - sum)).toFixed(1)
        }
    }
    return entries
}

const getAISummaryFromCache = (plantCode: string): string | null => {
    try {
        const cached = localStorage.getItem(AI_CACHE_KEY)
        if (!cached) return null
        const cacheData: Record<string, AICacheEntry> = JSON.parse(cached)
        const plantCache = cacheData[plantCode]
        if (!plantCache) return null
        if (Date.now() - plantCache.timestamp > AI_CACHE_DURATION) {
            return null
        }
        return plantCache.summary
    } catch (error) {
        console.error('Failed to read AI summary from localStorage cache:', error)
        return null
    }
}

const setAISummaryToCache = (plantCode: string, summary: string): void => {
    try {
        const cached = localStorage.getItem(AI_CACHE_KEY)
        const cacheData: Record<string, AICacheEntry> = cached ? JSON.parse(cached) : {}
        cacheData[plantCode] = {
            summary,
            timestamp: Date.now()
        }
        localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cacheData))
    } catch (error) {
        console.error('Failed to write AI summary to localStorage cache:', error)
    }
}

const clearAISummaryCache = (plantCode: string | null = null): void => {
    try {
        if (plantCode) {
            const cached = localStorage.getItem(AI_CACHE_KEY)
            if (cached) {
                const cacheData: Record<string, AICacheEntry> = JSON.parse(cached)
                delete cacheData[plantCode]
                localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cacheData))
            }
        } else {
            localStorage.removeItem(AI_CACHE_KEY)
        }
    } catch (error) {
        console.error('Failed to clear AI summary localStorage cache:', error)
    }
}

interface ShopAsset extends BaseAsset {
    downInYard?: boolean
    updatedAt?: string
}

interface ShopHistory {
    asset_id: string
    changed_at: string
    new_value?: string
}

const getLongTermShopAssets = (
    assets: ShopAsset[],
    history: ShopHistory[],
    type: string,
    identifierField: string,
    considerFn: (plantCode: string | undefined) => boolean,
    daysThreshold = 6
): ShopAssetResult[] => {
    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold)
    return assets
        .filter((a) => a.status === 'In Shop' && considerFn(a.plantCode))
        .map((asset) => {
            const latestShopEntry = history
                .filter((h) => h.asset_id === asset.id && h.new_value === 'In Shop')
                .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())[0]
            const shopEntryDate = latestShopEntry
                ? new Date(latestShopEntry.changed_at)
                : asset.updatedAt
                  ? new Date(asset.updatedAt)
                  : null
            if (!shopEntryDate || shopEntryDate > thresholdDate) return null
            return {
                daysInShop: Math.floor((Date.now() - shopEntryDate.getTime()) / MS_PER_DAY),
                downInYard: asset.downInYard || false,
                enteredShop: shopEntryDate.toISOString(),
                id: asset.id,
                identifier: (asset[identifierField] as string) || 'Unknown',
                plantCode: asset.plantCode,
                type
            }
        })
        .filter(Boolean) as ShopAssetResult[]
}

const extractPlantCode = (plant: PlantRecord): string | undefined => plant.plantCode || plant.plant_code

const addPlantCodesToSet = (plants: PlantRecord[], plantSet: Set<string>): void => {
    for (const plant of plants) {
        const code = extractPlantCode(plant)
        if (code) plantSet.add(String(code).trim())
    }
}

const buildPlantSet = (
    region: RegionRecord | null | undefined,
    allPlants: PlantRecord[],
    regionPlants: PlantRecord[],
    dashboardPlant: string | null | undefined
): Set<string> => {
    const plantSet = new Set<string>()
    if (region?.type === 'Office') {
        addPlantCodesToSet(allPlants, plantSet)
    } else if (dashboardPlant) {
        plantSet.add(String(dashboardPlant).trim())
    } else {
        addPlantCodesToSet(regionPlants || [], plantSet)
    }
    return plantSet
}

const createConsiderFn = (plantSet: Set<string>): ((plantCode: string | undefined) => boolean) =>
    plantSet.size > 0 ? (plantCode) => plantSet.has(String(plantCode || '').trim()) : () => true

const formatDateForDisplay = (dateValue: string | Date | null | undefined): string => {
    if (!dateValue) return ''
    if (typeof dateValue === 'string' && dateValue.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(dateValue))
        return dateValue
    try {
        return new Date(dateValue).toISOString().slice(0, 10)
    } catch {
        return String(dateValue)
    }
}

const DashboardUtility = {
    AI_CACHE_DURATION,
    AI_CACHE_KEY,
    SERVICE_OVERDUE_DAYS,
    buildPlantSet,
    calculateStatusDistribution,
    clearAISummaryCache,
    createConsiderFn,
    formatDateForDisplay,
    getAISummaryFromCache,
    getLongTermShopAssets,
    normalizeDate,
    setAISummaryToCache,
    slimEquipment,
    slimMixer,
    slimOperator,
    slimPickup,
    slimTractor,
    slimTrailer
}
export default DashboardUtility
