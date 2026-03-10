import Region from '../models/regions/Region'
import APIUtility from '../utils/APIUtility'
import { UserService } from './UserService'
/**
 * Region CRUD and plant-to-region mapping service.
 * Manages organizational hierarchy (regions contain plants) with an in-memory cache.
 * Includes retry logic for region plant fetching to handle transient network issues.
 */
class RegionServiceImpl {
    allRegions = []
    /** Fetches all regions from the API and updates the local cache. */
    async fetchRegions() {
        const { res, json } = await APIUtility.post('/region-service/fetch-regions')
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch regions')
        const data = json?.data ?? []
        this.allRegions = data
        return data.map((row) => Region.fromRow(row))
    }
    /** Fetches a single region by code, using the cache first. */
    async fetchRegionByCode(regionCode) {
        if (!regionCode) throw new Error('Region code is required')
        const region = this.getRegionByCode(regionCode)
        if (region) return region
        const { res, json } = await APIUtility.post('/region-service/fetch-region-by-code', { regionCode })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch region')
        const data = json?.data ?? null
        return data ? Region.fromRow(data) : null
    }
    /** Looks up a region in the local cache by code. */
    getRegionByCode(regionCode) {
        const region = this.allRegions.find((r) => r.region_code === regionCode)
        return region ? Region.fromRow(region) : null
    }
    /** Returns a region's display name, falling back to the code itself. */
    getRegionName(regionCode) {
        const r = this.getRegionByCode(regionCode)
        return r?.regionName ?? regionCode
    }
    /** Creates a new region with a type classification and refreshes the cache. */
    async createRegion(regionCode, regionName, type) {
        if (!regionCode?.trim() || !regionName?.trim()) throw new Error('Region code and name are required')
        if (!type || !['Concrete', 'Aggregate', 'Office'].includes(type)) throw new Error('Region type is invalid')
        const { res, json } = await APIUtility.post('/region-service/create', { regionCode, regionName, type })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to create region')
        await this.fetchRegions()
        return true
    }
    /** Updates a region's name, plant assignments, and optionally its type. */
    async updateRegion(regionCode, regionName, plantCodes = [], type, plantDistricts = {}) {
        if (!regionCode?.trim() || !regionName?.trim()) throw new Error('Region code and name are required')
        const payload = { plantCodes, plantDistricts, regionCode, regionName }
        if (type && ['Concrete', 'Aggregate', 'Office'].includes(type)) payload.type = type
        const { res, json } = await APIUtility.post('/region-service/update', payload)
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to update region')
        await this.fetchRegions()
        return true
    }
    /** Deletes a region and refreshes the cache. */
    async deleteRegion(regionCode) {
        if (!regionCode) throw new Error('Region code is required')
        const { res, json } = await APIUtility.post('/region-service/delete', { regionCode })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to delete region')
        await this.fetchRegions()
        return true
    }
    /**
     * Fetches plants belonging to a region with exponential backoff retry (up to 3 attempts).
     * Returns an empty array on persistent failure rather than throwing.
     */
    async fetchRegionPlants(regionCode) {
        if (!regionCode) throw new Error('Region code is required')
        let attempt = 0
        const maxAttempts = 3
        while (attempt < maxAttempts) {
            try {
                const { res, json } = await APIUtility.post('/region-service/fetch-region-plants', { regionCode })
                if (res && res.ok) {
                    const data = json?.data ?? []
                    return data.map((row) => ({
                        districts: Array.isArray(row.districts) ? row.districts : [],
                        plantCode: row.plant_code,
                        plantName: row.plant_name
                    }))
                }
            } catch (e) {}
            attempt += 1
            const delay = Math.min(4000, 500 * 2 ** (attempt - 1))
            await new Promise((r) => setTimeout(r, delay))
        }
        return []
    }
    /** Fetches a region with its full plant membership list. */
    async getRegionWithPlants(regionCode) {
        if (!regionCode) throw new Error('Region code is required')
        const region = await this.fetchRegionByCode(regionCode)
        if (!region) return null
        const plants = await this.fetchRegionPlants(regionCode)
        return { ...region, plants }
    }
    /** Fetches all regions that contain a specific plant code. */
    async fetchRegionsByPlantCode(plantCode) {
        if (!plantCode) throw new Error('Plant code is required')
        const { res, json } = await APIUtility.post('/region-service/fetch-regions-by-plant-code', { plantCode })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch regions by plant code')
        const data = json?.data ?? []
        return data.map((row) => Region.fromRow(row))
    }
    /**
     * Resolves the set of plant codes the current user is allowed to access.
     * Falls back through: selected region → user profile plant → region lookup.
     * Returns null if no restrictions apply.
     */
    async getAllowedPlantCodes(selectedRegionCode) {
        let regionCode = selectedRegionCode || ''
        if (!regionCode) {
            const user = await UserService.getCurrentUser()
            const uid = user?.id || ''
            if (uid) {
                const profilePlant = await UserService.getUserPlant(uid)
                const plantCode =
                    typeof profilePlant === 'string'
                        ? profilePlant
                        : profilePlant?.plant_code || profilePlant?.plantCode || ''
                if (plantCode) {
                    const regions = await this.fetchRegionsByPlantCode(plantCode)
                    const r = Array.isArray(regions) && regions.length ? regions[0] : null
                    regionCode = r ? r.regionCode || r.region_code || '' : ''
                }
            }
        }
        if (!regionCode) return null
        const regionPlants = await this.fetchRegionPlants(regionCode)
        const codes = new Set(
            regionPlants
                .map((p) =>
                    String(p.plantCode || p.plant_code || '')
                        .trim()
                        .toUpperCase()
                )
                .filter(Boolean)
        )
        return codes
    }
}
export const RegionService = new RegionServiceImpl()
