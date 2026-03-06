import VerifiedUtility from './VerifiedUtility'
/**
 * Mixer-specific fleet statistics: status counts, plant distribution,
 * cleanliness averages, chip/service overdue detection, and verification checks.
 */
const mixerUtility = {
    formatDate(date) {
        if (!date) return 'Not available'
        try {
            return new Date(date).toLocaleDateString()
        } catch (error) {
            return 'Invalid date'
        }
    },
    getCleanlinessAverage(mixers) {
        if (!Array.isArray(mixers) || !mixers.length) return 'N/A'
        const ratings = mixers.filter((m) => m.cleanlinessRating != null).map((m) => Number(m.cleanlinessRating))
        return ratings.length ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1) : 'N/A'
    },
    getNeedServiceCount(mixers) {
        if (!Array.isArray(mixers)) return 0
        return mixers.filter((mixer) => mixerUtility.isServiceOverdue(mixer.lastServiceDate)).length
    },
    getPlantCounts(mixers) {
        if (!Array.isArray(mixers)) return {}
        return mixers.reduce((counts, mixer) => {
            const plant = mixer.assignedPlant || 'Unassigned'
            counts[plant] = (counts[plant] || 0) + 1
            return counts
        }, {})
    },
    getStatusCounts(mixers) {
        if (!Array.isArray(mixers)) return {}
        const counts = { Active: 0, 'In Shop': 0, Retired: 0, Spare: 0, Total: mixers.length }
        mixers.forEach((mixer) => {
            const status = mixer.status || 'Unknown'
            if (['Active', 'Spare', 'In Shop', 'Retired'].includes(status)) counts[status]++
        })
        return counts
    },
    isChipOverdue(chipDate) {
        if (!chipDate) return false
        try {
            const chip = new Date(chipDate)
            const today = new Date()
            const diffDays = Math.ceil((today - chip) / (1000 * 60 * 60 * 24))
            return diffDays > 90
        } catch (error) {
            return false
        }
    },
    isServiceOverdue(serviceDate) {
        if (!serviceDate) return false
        try {
            const service = new Date(serviceDate)
            const today = new Date()
            const diffDays = Math.ceil((today - service) / (1000 * 60 * 60 * 24))
            return diffDays > 180
        } catch (error) {
            return false
        }
    },
    isVerified(updatedLast, updatedAt, updatedBy) {
        return VerifiedUtility.isVerified(updatedLast, updatedAt, updatedBy)
    }
}
export default mixerUtility
