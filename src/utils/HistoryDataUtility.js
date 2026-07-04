import { AI_CACHE_DURATION_MS, AI_HISTORY_CACHE_KEY } from '../app/constants/historyConstants'
import { HistoryUtility } from './HistoryUtility'

/**
 * Drops history entries whose old/new values are functionally equivalent
 * (e.g. date string variants normalizing to the same day).
 */
export const filterEquivalentEntries = (entries) => {
    try {
        return entries.filter(
            (entry) =>
                !HistoryUtility.areEquivalent(
                    entry.fieldName ?? entry.field_name,
                    entry.oldValue ?? entry.old_value,
                    entry.newValue ?? entry.new_value
                )
        )
    } catch (e) {
        console.error('Failed to filter equivalent history entries:', e)
        return entries
    }
}

const readCache = () => {
    const cached = localStorage.getItem(AI_HISTORY_CACHE_KEY)
    return cached ? JSON.parse(cached) : {}
}

/**
 * Returns a previously-generated AI history summary if it's still fresh
 * and the underlying history hasn't grown since the cache was written.
 */
export const getAISummaryFromCache = (assetCacheKey, historyLength) => {
    try {
        const cacheData = readCache()
        const assetCache = cacheData[assetCacheKey]
        if (!assetCache) return null
        if (Date.now() - assetCache.timestamp > AI_CACHE_DURATION_MS) return null
        if (assetCache.historyCount !== historyLength) return null
        return assetCache.summary
    } catch (e) {
        console.error('Failed to read AI summary from localStorage cache:', e)
        return null
    }
}

/** Persists an AI summary alongside its history count so future reads can invalidate on growth. */
export const setAISummaryToCache = (assetCacheKey, historyLength, summary) => {
    try {
        const cacheData = readCache()
        cacheData[assetCacheKey] = { historyCount: historyLength, summary, timestamp: Date.now() }
        localStorage.setItem(AI_HISTORY_CACHE_KEY, JSON.stringify(cacheData))
    } catch (e) {
        console.error('Failed to write AI summary to localStorage cache:', e)
    }
}

/** Removes the AI summary for a single asset, leaving other assets' caches intact. */
export const clearAISummaryCache = (assetCacheKey) => {
    try {
        const cached = localStorage.getItem(AI_HISTORY_CACHE_KEY)
        if (!cached) return
        const cacheData = JSON.parse(cached)
        delete cacheData[assetCacheKey]
        localStorage.setItem(AI_HISTORY_CACHE_KEY, JSON.stringify(cacheData))
    } catch (e) {
        console.error('Failed to clear AI summary from localStorage cache:', e)
    }
}

const buildCleanlinessHistorySummary = (cleanlinessData) => {
    if (cleanlinessData.length === 0) return null
    const last = cleanlinessData[cleanlinessData.length - 1]?.rating
    const first = cleanlinessData[0]?.rating
    return {
        average: cleanlinessData.reduce((sum, c) => sum + c.rating, 0) / cleanlinessData.length,
        count: cleanlinessData.length,
        current: last,
        trend: cleanlinessData.length >= 2 ? last - first : 0
    }
}

const buildServiceHistorySummary = (serviceData) => {
    if (serviceData.length === 0) return null
    const avgDaysBetweenService =
        serviceData.length >= 2
            ? Math.round(
                  serviceData.reduce((sum, s, i) => {
                      if (i === 0) return 0
                      return sum + HistoryUtility.daysBetween(serviceData[i - 1].date, s.date)
                  }, 0) /
                      (serviceData.length - 1)
              )
            : null
    return {
        avgDaysBetweenService,
        count: serviceData.length,
        lastService: serviceData[serviceData.length - 1]?.date
    }
}

/**
 * Aggregates raw history, issues, and derived timeline buckets into the structured
 * context the AI summarization endpoint consumes.
 */
export const buildAIHistoryContext = ({
    history,
    issues,
    item,
    type,
    statusData,
    cleanlinessData,
    operatorData,
    serviceData,
    plantData
}) => {
    const operatorAwareType = type === 'mixer' || type === 'tractor'
    return {
        assetIdentifier: HistoryUtility.resolveAssetIdentifier(type, item),
        assetType: type,
        cleanlinessHistory: buildCleanlinessHistorySummary(cleanlinessData),
        currentPlant: item.plantCode ?? item.assignedPlant ?? 'Unknown',
        currentStatus: item.status ?? 'Unknown',
        currentStatusDays: statusData.find((s) => s.isCurrent)?.days ?? 0,
        highSeverityIssues: issues.filter((i) => i.severity === 'High' && i.status !== 'Resolved').length,
        openIssues: issues.filter((i) => i.status !== 'Resolved').length,
        operatorChanges: operatorAwareType ? operatorData.length : 0,
        plantChanges: plantData?.length ?? 0,
        recentChanges: history.slice(0, 10).map((h) => ({
            date: HistoryUtility.getEntryTimestamp(h),
            field: HistoryUtility.getEntryFieldName(h),
            from: HistoryUtility.getEntryOldValue(h),
            to: HistoryUtility.getEntryNewValue(h)
        })),
        resolvedIssues: issues.filter((i) => i.status === 'Resolved').length,
        serviceHistory: buildServiceHistorySummary(serviceData),
        statusBreakdown: statusData.reduce((acc, s) => {
            acc[s.status] = (acc[s.status] || 0) + s.days
            return acc
        }, {}),
        statusChanges: statusData.length,
        totalHistoryEntries: history.length,
        uniqueOperators: operatorAwareType
            ? new Set(operatorData.filter((o) => !o.isEmpty).map((o) => o.operatorId)).size
            : 0
    }
}
