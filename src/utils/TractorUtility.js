import AssetStatsUtility from './AssetStatsUtility'
import VerifiedUtility from './VerifiedUtility'
/**
 * Tractor-specific fleet utilities. Generic stats delegate to AssetStatsUtility;
 * only tractor-specific logic lives here.
 */
const TractorUtility = {
    getCleanlinessAverage: (tractors) => AssetStatsUtility.getCleanlinessAverage(tractors),
    getNeedServiceCount: (tractors) => AssetStatsUtility.getNeedServiceCount(tractors),
    getPlantCounts: (tractors) => AssetStatsUtility.getPlantCounts(tractors),
    getStatusCounts: (tractors) => AssetStatsUtility.getStatusCounts(tractors),
    isServiceOverdue: (serviceDate) => AssetStatsUtility.isServiceOverdue(serviceDate, 180),
    isVerified: (updatedLast, updatedAt, updatedBy) => VerifiedUtility.isVerified(updatedLast, updatedAt, updatedBy)
}
export default TractorUtility
export { TractorUtility }
