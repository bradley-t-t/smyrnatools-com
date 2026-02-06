const AI_CACHE_KEY = 'srm_plant_ai_summaries'
const AI_CACHE_DURATION = 24 * 60 * 60 * 1000
const SERVICE_OVERDUE_DAYS = 180

const slimMixer = (m) => ({
    assignedOperator: m.assignedOperator,
    assignedPlant: m.assignedPlant || m.plantCode,
    cleanlinessRating: m.cleanlinessRating || m.cleanliness_rating || 0,
    downInYard: m.downInYard || m.down_in_yard || false,
    id: m.id,
    lastServiceDate: m.lastServiceDate,
    plantCode: m.assignedPlant || m.plantCode,
    status: m.status,
    truckNumber: m.truckNumber || m.truck_number || '',
    updatedAt: m.updatedAt,
    updatedBy: m.updatedBy,
    updatedLast: m.updatedLast,
    vin: m.vin || ''
})

const slimTractor = (t) => ({
    assignedOperator: t.assignedOperator,
    assignedPlant: t.assignedPlant || t.plantCode,
    id: t.id,
    lastServiceDate: t.lastServiceDate,
    plantCode: t.assignedPlant || t.plantCode,
    status: t.status,
    truckNumber: t.truckNumber || t.truck_number || '',
    updatedAt: t.updatedAt,
    updatedBy: t.updatedBy,
    updatedLast: t.updatedLast,
    vin: t.vin || ''
})

const slimTrailer = (t) => ({
    assignedPlant: t.assignedPlant || t.plantCode,
    id: t.id,
    identifyingNumber: t.trailerNumber || t.trailer_number || t.truck_number || t.asset_number || '',
    lastServiceDate: t.lastServiceDate,
    plantCode: t.assignedPlant || t.plantCode,
    status: t.status
})

const slimEquipment = (e) => ({
    assignedPlant: e.assignedPlant || e.plantCode,
    id: e.id,
    identifyingNumber: e.identifyingNumber || e.identifying_number || e.asset_number || e.truck_number || '',
    lastServiceDate: e.lastServiceDate,
    plantCode: e.assignedPlant || e.plantCode,
    status: e.status
})

const slimPickup = (p) => ({
    id: p.id,
    plantCode: p.assignedPlant || p.plantCode,
    status: p.status
})

const slimOperator = (o) => ({
    employeeId: o.employeeId,
    id: o.id,
    plantCode: o.plantCode,
    status: o.status
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

const calculateStatusDistribution = (assets, historyRecords, filterStartDate = null, filterEndDate = null) => {
    const statusDaysMap = {}
    let totalDays = 0

    const rangeStart = filterStartDate ? normalizeDate(filterStartDate, false) : null
    const rangeEnd = filterEndDate ? normalizeDate(filterEndDate, true) : new Date()

    if (rangeEnd) {
        let earliestDataDate = null

        if (historyRecords.length > 0) {
            earliestDataDate = historyRecords
                .filter((h) => h.changed_at)
                .map((h) => new Date(h.changed_at))
                .sort((a, b) => a - b)[0]
        }

        const earliestAssetCreationDate = assets
            .map((a) => a.createdAt || a.created_at)
            .filter((d) => d)
            .map((d) => new Date(d))
            .sort((a, b) => a - b)[0]

        if (earliestAssetCreationDate) {
            if (!earliestDataDate || earliestAssetCreationDate < earliestDataDate) {
                earliestDataDate = earliestAssetCreationDate
            }
        }

        if (earliestDataDate && rangeEnd < earliestDataDate) {
            return []
        }
    }

    assets.forEach((asset) => {
        let assetHistory = historyRecords
            .filter(
                (h) =>
                    h.mixer_id === asset.id ||
                    h.tractor_id === asset.id ||
                    h.trailer_id === asset.id ||
                    h.equipment_id === asset.id ||
                    h.truck_id === asset.id
            )
            .filter((h) => h.field_name === 'status')
            .sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at))

        const currentStatus = asset.status || 'Unknown'
        const createdAt = asset.createdAt || asset.created_at
        const assetCreationDate = createdAt ? new Date(createdAt) : null

        if (assetCreationDate && rangeEnd && assetCreationDate > rangeEnd) {
            return
        }

        const earliestAssetHistory = assetHistory.length > 0 ? new Date(assetHistory[0].changed_at) : null

        if (earliestAssetHistory && rangeEnd && earliestAssetHistory > rangeEnd) {
            return
        }

        if (!earliestAssetHistory && rangeEnd && rangeEnd < new Date()) {
            return
        }

        let effectiveStart = rangeStart
            ? assetCreationDate && assetCreationDate > rangeStart
                ? assetCreationDate
                : rangeStart
            : assetCreationDate || new Date()

        if (earliestAssetHistory && assetHistory.length > 0 && effectiveStart < earliestAssetHistory) {
            effectiveStart = earliestAssetHistory
        }

        const effectiveEnd = rangeEnd

        if (effectiveStart > effectiveEnd) {
            return
        }

        let startingStatus = currentStatus
        let endingStatus = currentStatus

        if (assetHistory.length > 0) {
            if (rangeStart) {
                const recordsBeforeOrAtStart = assetHistory.filter((h) => new Date(h.changed_at) <= rangeStart)
                if (recordsBeforeOrAtStart.length > 0) {
                    const lastRecordBeforeStart = recordsBeforeOrAtStart[recordsBeforeOrAtStart.length - 1]
                    startingStatus = lastRecordBeforeStart.new_value || currentStatus
                } else if (assetHistory.length > 0) {
                    startingStatus = assetHistory[0].old_value || currentStatus
                }
            }

            if (rangeEnd) {
                const recordsBeforeOrAtEnd = assetHistory.filter((h) => new Date(h.changed_at) <= rangeEnd)
                if (recordsBeforeOrAtEnd.length > 0) {
                    const lastRecordBeforeEnd = recordsBeforeOrAtEnd[recordsBeforeOrAtEnd.length - 1]
                    endingStatus = lastRecordBeforeEnd.new_value || currentStatus
                } else if (assetHistory.length > 0) {
                    endingStatus = assetHistory[0].old_value || currentStatus
                }
            }
        }

        const recordsInRange =
            rangeStart && rangeEnd
                ? assetHistory.filter((h) => {
                      const changedAt = new Date(h.changed_at)
                      return changedAt > rangeStart && changedAt <= rangeEnd
                  })
                : assetHistory

        if (recordsInRange.length === 0) {
            const days = Math.max(1, Math.round((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24)))
            statusDaysMap[startingStatus] = (statusDaysMap[startingStatus] || 0) + days
            totalDays += days
        } else {
            let previousStatus = startingStatus
            let previousDate = effectiveStart

            recordsInRange.forEach((historyEntry) => {
                const changeDate = new Date(historyEntry.changed_at)
                const daysDiff = Math.round((changeDate - previousDate) / (1000 * 60 * 60 * 24))

                if (daysDiff > 0) {
                    statusDaysMap[previousStatus] = (statusDaysMap[previousStatus] || 0) + daysDiff
                    totalDays += daysDiff
                }

                previousStatus = historyEntry.new_value || endingStatus
                previousDate = changeDate
            })

            const finalDays = Math.round((effectiveEnd - previousDate) / (1000 * 60 * 60 * 24))
            if (finalDays > 0) {
                statusDaysMap[previousStatus] = (statusDaysMap[previousStatus] || 0) + finalDays
                totalDays += finalDays
            }
        }
    })

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
            const diff = (100 - sum).toFixed(1)
            entries[entries.length - 1].percentage = (
                parseFloat(entries[entries.length - 1].percentage) + parseFloat(diff)
            ).toFixed(1)
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

    const inShopAssets = assets.filter((a) => a.status === 'In Shop' && considerFn(a.plantCode))
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
            if (shopEntryDate && shopEntryDate <= thresholdDate) {
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

const buildPlantSet = (region, allPlants, regionPlants, dashboardPlant) => {
    const isOffice = region?.type === 'Office'
    const plantSet = new Set()

    if (isOffice) {
        allPlants.forEach((p) => {
            const c = p.plantCode || p.plant_code
            if (c) plantSet.add(String(c).trim())
        })
    } else {
        if (dashboardPlant) {
            plantSet.add(String(dashboardPlant).trim())
        } else {
            const plants = regionPlants || []
            plants.forEach((p) => {
                const c = p.plantCode || p.plant_code
                if (c) plantSet.add(String(c).trim())
            })
        }
    }

    return plantSet
}

const createConsiderFn = (plantSet) => {
    const filterActive = plantSet.size > 0
    return (plantCode) => !filterActive || plantSet.has(String(plantCode || '').trim())
}

const formatDateForDisplay = (d) => {
    if (!d) return ''
    if (d.length === 10 && /\d{4}-\d{2}-\d{2}/.test(d)) return d
    try {
        return new Date(d).toISOString().slice(0, 10)
    } catch {
        return d
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
