import { Plant } from '../app/models/plants/Plant'
import Region from '../app/models/regions/Region'
import APIUtility from '../utils/APIUtility'
import { UserService } from './UserService'
const AUTH_FUNCTION = 'plant-service'
/**
 * Unified plant and region service with in-memory caches for both entities.
 * Handles CRUD operations, plant-to-region mappings, and access control.
 * Automatically refreshes caches after mutations (create, update, delete).
 */
class PlantServiceImpl {
    allPlants = []
    allRegions = []

    // ── Plant Methods ──────────────────────────────────────────────────

    /** Fetches all plants from the API and updates the local cache. */
    async fetchAllPlants() {
        const { res, json } = await APIUtility.post(`/${AUTH_FUNCTION}/fetch-all`)
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch plants')
        const data = json?.data ?? []
        this.allPlants = data
        return data.map((row) => Plant.fromRow(row))
    }
    /** Fetches plants optionally filtered by a set of region codes. */
    async fetchPlants(regionCodes = null) {
        const all = await this.fetchAllPlants()
        if (regionCodes && regionCodes.size > 0) {
            return all.filter((p) =>
                regionCodes.has(
                    String(p.plantCode || '')
                        .trim()
                        .toUpperCase()
                )
            )
        }
        return all
    }
    /** Fetches a specific plant by code, using the cache first. */
    async fetchPlantByCode(plantCode) {
        if (!plantCode) throw new Error('Plant code is required')
        const cached = this.getPlantByCode(plantCode)
        if (cached) return cached
        const { res, json } = await APIUtility.post(`/${AUTH_FUNCTION}/fetch-by-code`, { plantCode })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch plant')
        return json?.data ? Plant.fromRow(json.data) : null
    }
    /** Creates a new plant and refreshes the cache. */
    async createPlant(plantCode, plantName) {
        if (!plantCode?.trim() || !plantName?.trim()) throw new Error('Plant code and name are required')
        const { res, json } = await APIUtility.post(`/${AUTH_FUNCTION}/create`, { plantCode, plantName })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to create plant')
        await this.fetchAllPlants()
        return true
    }
    /** Updates a plant's name and refreshes the cache. */
    async updatePlant(plantCode, plantName) {
        if (!plantCode?.trim() || !plantName?.trim()) throw new Error('Plant code and name are required')
        const { res, json } = await APIUtility.post(`/${AUTH_FUNCTION}/update`, { plantCode, plantName })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to update plant')
        await this.fetchAllPlants()
        return true
    }
    /** Deletes a plant and refreshes the cache. */
    async deletePlant(plantCode) {
        if (!plantCode) throw new Error('Plant code is required')
        const { res, json } = await APIUtility.post(`/${AUTH_FUNCTION}/delete`, { plantCode })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to delete plant')
        await this.fetchAllPlants()
        return true
    }
    /** Looks up a plant in the local cache by code. */
    getPlantByCode(plantCode) {
        const plant = this.allPlants.find((p) => p.plant_code === plantCode)
        return plant ? Plant.fromRow(plant) : null
    }
    /** Returns a plant's display name, falling back to the code itself. */
    getPlantName(plantCode) {
        return this.getPlantByCode(plantCode)?.plant_name ?? plantCode
    }
    /** Fetches a plant with its associated region memberships. */
    async getPlantWithRegions(plantCode) {
        if (!plantCode) throw new Error('Plant code is required')
        const { res, json } = await APIUtility.post(`/${AUTH_FUNCTION}/get-with-regions`, { plantCode })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch plant with regions')
        const plantRow = json?.plant || null
        if (!plantRow) return null
        const plant = Plant.fromRow(plantRow)
        const regions = Array.isArray(json?.regions) ? json.regions : []
        return { ...plant, regions }
    }

    // ── Region Methods ─────────────────────────────────────────────────

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
     * Falls back through: selected region -> user profile plant -> region lookup.
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
export const PlantService = new PlantServiceImpl()
