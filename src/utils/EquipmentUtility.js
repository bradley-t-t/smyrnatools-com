import AssetStatsUtility from './AssetStatsUtility'
import VerifiedUtility from './VerifiedUtility'
/**
 * Equipment-specific fleet utilities. Generic stats delegate to AssetStatsUtility;
 * only equipment-specific logic (condition average) lives here.
 */
const equipmentUtility = {
    getCleanlinessAverage: (equipments) => AssetStatsUtility.getCleanlinessAverage(equipments),
    /** Equipment-specific: average condition rating across the fleet */
    getConditionAverage(equipments) {
        if (!Array.isArray(equipments) || !equipments.length) return 'N/A'
        const ratings = equipments.filter((e) => e.conditionRating != null).map((e) => Number(e.conditionRating))
        return ratings.length ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1) : 'N/A'
    },

    getNeedServiceCount: (equipments) => AssetStatsUtility.getNeedServiceCount(equipments),

    getPlantCounts: (equipments) => AssetStatsUtility.getPlantCounts(equipments),

    getStatusCounts: (equipments) => AssetStatsUtility.getStatusCounts(equipments),

    isServiceOverdue: (serviceDate) => AssetStatsUtility.isServiceOverdue(serviceDate, 180),

    isVerified: (updatedLast, updatedAt, updatedBy) => VerifiedUtility.isVerified(updatedLast, updatedAt, updatedBy)
}
export default equipmentUtility
