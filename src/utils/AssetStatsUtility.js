/**
 * Shared asset statistics logic used across Mixer, Tractor, Equipment, and Trailer utilities.
 * Consolidates duplicated service-overdue checks, cleanliness averages,
 * plant/status distribution counts, and service-needed tallies.
 */

const MILLIS_PER_DAY = 1000 * 60 * 60 * 24

const AssetStatsUtility = {
    /**
     * Computes the average of a numeric rating field across items.
     * Returns 'N/A' when no valid ratings exist.
     */
    getCleanlinessAverage(items, ratingField = 'cleanlinessRating') {
        if (!Array.isArray(items) || !items.length) return 'N/A'
        const ratings = items.filter((item) => item[ratingField] != null).map((item) => Number(item[ratingField]))
        return ratings.length ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1) : 'N/A'
    },

    /**
     * Returns the number of items whose service date exceeds the threshold.
     * Defaults to 180 days (override to 90 for trailers).
     */
    getNeedServiceCount(items, serviceDateField = 'lastServiceDate', thresholdDays = 180) {
        if (!Array.isArray(items)) return 0
        return items.filter((item) => AssetStatsUtility.isServiceOverdue(item[serviceDateField], thresholdDays)).length
    },

    /**
     * Counts items grouped by plant assignment.
     * Items without a plant are bucketed under 'Unassigned'.
     */
    getPlantCounts(items, plantField = 'assignedPlant') {
        if (!Array.isArray(items)) return {}
        return items.reduce((counts, item) => {
            const plant = item[plantField] || 'Unassigned'
            counts[plant] = (counts[plant] || 0) + 1
            return counts
        }, {})
    },

    /**
     * Counts items grouped by status (Active, In Shop, Retired, Spare).
     * Includes a Total key with the full array length.
     */
    getStatusCounts(items, statusField = 'status') {
        if (!Array.isArray(items)) return {}
        const counts = { Active: 0, 'In Shop': 0, Retired: 0, Spare: 0, Total: items.length }
        const validStatuses = ['Active', 'Spare', 'In Shop', 'Retired']
        items.forEach((item) => {
            const status = item[statusField] || 'Unknown'
            if (validStatuses.includes(status)) counts[status]++
        })
        return counts
    },

    /**
     * Returns true if a service date exceeds the given threshold.
     * Mixer/Tractor/Equipment default to 180 days; Trailer uses 90.
     */
    isServiceOverdue(serviceDate, thresholdDays = 180) {
        if (!serviceDate) return false
        try {
            const diffDays = Math.ceil((new Date() - new Date(serviceDate)) / MILLIS_PER_DAY)
            return diffDays > thresholdDays
        } catch {
            return false
        }
    }
}

export default AssetStatsUtility
