import AssetStatsUtility from './AssetStatsUtility'
/**
 * Trailer-specific fleet utilities. Generic stats delegate to AssetStatsUtility;
 * trailer-specific logic (type-based counts, 90-day service threshold,
 * history-aware verification) lives here.
 */
const TrailerUtility = {
    getCleanlinessAverage: (trailers) => AssetStatsUtility.getCleanlinessAverage(trailers),
    getNeedServiceCount: (trailers) => AssetStatsUtility.getNeedServiceCount(trailers, 'lastServiceDate', 90),
    getPlantCounts: (trailers) => AssetStatsUtility.getPlantCounts(trailers),
    /** Trailer-specific: counts by trailer type (Cement / End Dump) */
    getStatusCounts(trailers) {
        const counts = { Total: trailers.length }
        ;['Cement', 'End Dump'].forEach((type) => {
            counts[type] = trailers.filter((t) => t.trailerType === type).length
        })
        return counts
    },

    /** Trailer-specific: counts by operational status */
    getStatusCountsByStatus(trailers) {
        const statuses = ['Active', 'Spare', 'In Shop', 'Retired']
        const counts = {}
        statuses.forEach((status) => {
            counts[status] = trailers.filter((t) => t.status === status).length
        })
        return counts
    },

    isServiceOverdue: (serviceDate) => AssetStatsUtility.isServiceOverdue(serviceDate, 90),
    /** Trailer-specific: weekly verification with history-aware staleness */
    isVerified(updatedLast, updatedAt, updatedBy, latestHistoryDate = null) {
        if (!updatedLast || !updatedBy) return false
        const lastVerification = new Date(updatedLast)
        const lastUpdate = new Date(updatedAt)
        const lastHistory = latestHistoryDate ? new Date(latestHistoryDate) : null
        const now = new Date()
        const lastSunday = new Date(now)
        lastSunday.setDate(now.getDate() - now.getDay())
        lastSunday.setHours(0, 0, 0, 0)
        if (lastHistory && lastHistory > lastVerification) return false
        return lastUpdate <= lastVerification && lastVerification >= lastSunday
    }
}
export default TrailerUtility
export { TrailerUtility }
