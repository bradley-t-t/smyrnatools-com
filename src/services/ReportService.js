import CacheUtility from '../utils/CacheUtility'
import { Database } from './DatabaseService'

const TTL_MED = 10 * 60 * 1000
/** Sorts plants by plant_code numerically, falling back to string comparison. */
function sortPlants(plants) {
    return (plants || [])
        .filter((p) => p.plant_code && p.plant_name)
        .sort((a, b) => {
            const aNum = parseInt(a.plant_code, 10)
            const bNum = parseInt(b.plant_code, 10)
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
            return String(a.plant_code).localeCompare(String(b.plant_code))
        })
}
/**
 * Plant fetching utility shared by the Dashboard view (sorted plant list)
 * with light caching.
 */
class ReportServiceImpl {
    /** Fetches all plants sorted by code with a 10-minute cache. The
     *  Plan → Planner tab consumes `latitude` / `longitude` from these
     *  rows to anchor each plant marker to its real location on the
     *  map, so include them in the select — otherwise plants with
     *  authoritative DB coords silently fall back to geocoding (or fail
     *  outright when their address isn't in OSM). */
    async fetchPlantsSorted() {
        // Cache key bumped to `:v4` because the select now includes
        // `colocated_alias_codes` — older cache entries were missing it
        // and would silently strip the phantom-code co-location
        // mappings for everyone with a warm cache when this lands.
        const cacheKey = 'plants:all:v4'
        const cached = CacheUtility.get(cacheKey)
        if (cached) return cached
        const { data, error } = await Database.from('plants')
            .select('plant_code,plant_name,plant_address,latitude,longitude,location_group_id,colocated_alias_codes')
            .order('plant_code', { ascending: true })
        const plants = !error && Array.isArray(data) ? sortPlants(data) : []
        CacheUtility.set(cacheKey, plants, TTL_MED)
        return plants
    }
}
export const ReportService = new ReportServiceImpl()
