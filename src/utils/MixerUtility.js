import AssetStatsUtility from './AssetStatsUtility'
import VerifiedUtility from './VerifiedUtility'
/**
 * Mixer-specific fleet utilities. Generic stats delegate to AssetStatsUtility;
 * only mixer-specific logic (chip overdue, 180-day service threshold) lives here.
 */
const mixerUtility = {
    getCleanlinessAverage: (mixers) => AssetStatsUtility.getCleanlinessAverage(mixers),
    getNeedServiceCount: (mixers) => AssetStatsUtility.getNeedServiceCount(mixers),
    getPlantCounts: (mixers) => AssetStatsUtility.getPlantCounts(mixers),
    getStatusCounts: (mixers) => AssetStatsUtility.getStatusCounts(mixers),
    /** Mixer-specific: chips are overdue after 90 days */
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

    isServiceOverdue: (serviceDate) => AssetStatsUtility.isServiceOverdue(serviceDate, 180),

    isVerified: (updatedLast, updatedAt, updatedBy) => VerifiedUtility.isVerified(updatedLast, updatedAt, updatedBy)
}
export default mixerUtility
