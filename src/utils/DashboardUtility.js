/**
 * Dashboard computation utilities: slim asset mappers for memory-efficient storage,
 * status distribution calculations across date ranges, AI summary caching,
 * service-overdue checks, long-term shop detection, and plant-set filtering.
 */
const AI_CACHE_KEY = 'srm_plant_ai_summaries'
const AI_CACHE_DURATION = 24 * 60 * 60 * 1000
const SERVICE_OVERDUE_DAYS = 180
const MS_PER_DAY = 86400000

const resolvePlantCode = (asset) => asset.assignedPlant || asset.plantCode
const resolveTruckNumber = (asset) => asset.truckNumber || asset.truck_number || ''

const BASE_ASSET_FIELDS = (asset) => ({
    id: asset.id,
    plantCode: resolvePlantCode(asset),
    status: asset.status
})

const VEHICLE_FIELDS = (asset) => ({
    assignedOperator: asset.assignedOperator,
    assignedPlant: resolvePlantCode(asset),
    lastServiceDate: asset.lastServiceDate,
    truckNumber: resolveTruckNumber(asset),
    updatedAt: asset.updatedAt,
    updatedBy: asset.updatedBy,
    updatedLast: asset.updatedLast,
    vin: asset.vin || ''
})

const slimMixer = (asset) => ({
    ...BASE_ASSET_FIELDS(asset),
    ...VEHICLE_FIELDS(asset),
    cleanlinessRating: asset.cleanlinessRating || asset.cleanliness_rating || 0,
    downInYard: asset.downInYard || asset.down_in_yard || false
})

const slimTractor = (asset) => ({
    ...BASE_ASSET_FIELDS(asset),
    ...VEHICLE_FIELDS(asset),
    freight: asset.freight || ''
})

const slimTrailer = (asset) => ({
    ...BASE_ASSET_FIELDS(asset),
    assignedPlant: resolvePlantCode(asset),
    identifyingNumber: asset.trailerNumber || asset.trailer_number || asset.truck_number || asset.asset_number || '',
    lastServiceDate: asset.lastServiceDate,
    trailerType: asset.trailerType || asset.trailer_type || 'Cement'
})

const slimEquipment = (asset) => ({
    ...BASE_ASSET_FIELDS(asset),
    assignedPlant: resolvePlantCode(asset),
    identifyingNumber:
        asset.identifyingNumber || asset.identifying_number || asset.asset_number || asset.truck_number || '',
    lastServiceDate: asset.lastServiceDate
})

const slimPickup = (asset) => ({
    ...BASE_ASSET_FIELDS(asset)
})

const slimOperator = (operator) => ({
    employeeId: operator.employeeId,
    id: operator.id,
    plantCode: operator.plantCode,
    status: operator.status
})

const isServiceOverdue = (date) => {
    if (!date) return false
    const diff = Math.ceil((Date.now() - new Date(date).getTime()) / 86400000)
    return diff > SERVICE_OVERDUE_DAYS
}

const normalizeDate = (dateStr, endOfDay = false) => {
    if (!dateStr) return null
    const parts = dateStr.split('-')
    if (endOfDay) {
        return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 23, 59, 59, 999))
    }
    return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0))
}

const ASSET_ID_FIELDS = ['mixer_id', 'tractor_id', 'trailer_id', 'equipment_id', 'truck_id']

const daysBetween = (start, end) => Math.round((end - start) / MS_PER_DAY)

const getAssetStatusHistory = (historyRecords, assetId) =>
    historyRecords
        .filter((h) => ASSET_ID_FIELDS.some((field) => h[field] === assetId) && h.field_name === 'status')
        .sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at))

const resolveStatusAtDate = (sortedHistory, cutoffDate, fallbackStatus) => {
    if (!sortedHistory.length) return fallbackStatus
    const recordsBefore = sortedHistory.filter((h) => new Date(h.changed_at) <= cutoffDate)
    if (recordsBefore.length) return recordsBefore[recordsBefore.length - 1].new_value || fallbackStatus
    return sortedHistory[0].old_value || fallbackStatus
}

const findEarliestDate = (dates) => dates.filter(Boolean).sort((a, b) => a - b)[0] ?? null

const accumulateStatusDays = (statusDaysMap, status, days) => {
    statusDaysMap[status] = (statusDaysMap[status] || 0) + days
    return days
}

const calculateStatusDistribution = (assets, historyRecords, filterStartDate = null, filterEndDate = null) => {
    const statusDaysMap = {}
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
                .map((d) => new Date(d))
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

        if (effectiveStart > rangeEnd) continue

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
                Math.max(1, daysBetween(effectiveStart, rangeEnd))
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

            const finalDays = daysBetween(previousDate, rangeEnd)
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

const getAISummaryFromCache = (plantCode) => {
    try {
        const cached = localStorage.getItem(AI_CACHE_KEY)
        if (!cached) return null
        const cacheData = JSON.parse(cached)
        const plantCache = cacheData[plantCode]
        if (!plantCache) return null
        if (Date.now() - plantCache.timestamp > AI_CACHE_DURATION) {
            return null
        }
        return plantCache.summary
    } catch {
        return null
    }
}

const setAISummaryToCache = (plantCode, summary) => {
    try {
        const cached = localStorage.getItem(AI_CACHE_KEY)
        const cacheData = cached ? JSON.parse(cached) : {}
        cacheData[plantCode] = {
            summary,
            timestamp: Date.now()
        }
        localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cacheData))
    } catch {}
}

const clearAISummaryCache = (plantCode = null) => {
    try {
        if (plantCode) {
            const cached = localStorage.getItem(AI_CACHE_KEY)
            if (cached) {
                const cacheData = JSON.parse(cached)
                delete cacheData[plantCode]
                localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cacheData))
            }
        } else {
            localStorage.removeItem(AI_CACHE_KEY)
        }
    } catch {}
}

const getLongTermShopAssets = (assets, history, type, identifierField, considerFn, daysThreshold = 6) => {
    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold)

    return assets
        .filter((a) => a.status === 'In Shop' && considerFn(a.plantCode))
        .map((asset) => {
            const latestShopEntry = history
                .filter((h) => h.asset_id === asset.id && h.new_value === 'In Shop')
                .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))[0]
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
                identifier: asset[identifierField] || 'Unknown',
                plantCode: asset.plantCode,
                type
            }
        })
        .filter(Boolean)
}

const extractPlantCode = (plant) => plant.plantCode || plant.plant_code

const addPlantCodesToSet = (plants, plantSet) => {
    for (const plant of plants) {
        const code = extractPlantCode(plant)
        if (code) plantSet.add(String(code).trim())
    }
}

const buildPlantSet = (region, allPlants, regionPlants, dashboardPlant) => {
    const plantSet = new Set()
    if (region?.type === 'Office') {
        addPlantCodesToSet(allPlants, plantSet)
    } else if (dashboardPlant) {
        plantSet.add(String(dashboardPlant).trim())
    } else {
        addPlantCodesToSet(regionPlants || [], plantSet)
    }
    return plantSet
}

const createConsiderFn = (plantSet) =>
    plantSet.size > 0 ? (plantCode) => plantSet.has(String(plantCode || '').trim()) : () => true

const formatDateForDisplay = (dateValue) => {
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
    isServiceOverdue,
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
