import VerifiedUtility from './VerifiedUtility'
/**
 * Tractor-specific fleet statistics: status counts, plant distribution,
 * cleanliness averages, service-overdue detection, and verification checks.
 */
const TractorUtility = {
    formatDate(date) {
        if (!date) return 'Not available'
        try {
            return new Date(date).toLocaleDateString()
        } catch {
            return 'Invalid date'
        }
    },
    getCleanlinessAverage(tractors) {
        if (!Array.isArray(tractors) || !tractors.length) return 'N/A'
        const ratings = tractors.filter((m) => m.cleanlinessRating != null).map((m) => Number(m.cleanlinessRating))
        return ratings.length ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1) : 'N/A'
    },
    getNeedServiceCount(tractors) {
        if (!Array.isArray(tractors)) return 0
        return tractors.filter((tractor) => TractorUtility.isServiceOverdue(tractor.lastServiceDate)).length
    },
    getPlantCounts(tractors) {
        if (!Array.isArray(tractors)) return {}
        return tractors.reduce((counts, tractor) => {
            const plant = tractor.assignedPlant || 'Unassigned'
            counts[plant] = (counts[plant] || 0) + 1
            return counts
        }, {})
    },
    getStatusCounts(tractors) {
        if (!Array.isArray(tractors)) return {}
        const counts = { Active: 0, 'In Shop': 0, Retired: 0, Spare: 0, Total: tractors.length }
        tractors.forEach((tractor) => {
            const status = tractor.status || 'Unknown'
            if (['Active', 'Spare', 'In Shop', 'Retired'].includes(status)) counts[status]++
        })
        return counts
    },
    isServiceOverdue(serviceDate) {
        if (!serviceDate) return false
        try {
            const service = new Date(serviceDate)
            const today = new Date()
            const diffDays = Math.ceil((today - service) / (1000 * 60 * 60 * 24))
            return diffDays > 180
        } catch {
            return false
        }
    },
    isVerified(updatedLast, updatedAt, updatedBy) {
        return VerifiedUtility.isVerified(updatedLast, updatedAt, updatedBy)
    }
}
export default TractorUtility
export { TractorUtility }
