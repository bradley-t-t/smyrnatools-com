import { Plant } from '../app/models/plants/Plant'
import Region from '../app/models/regions/Region'
import APIUtility from '../utils/APIUtility'
import CacheUtility from '../utils/CacheUtility'
import { UserService } from './UserService'

const SERVICE_PREFIX = 'plant-service'
/**
 * Unified plant and region service with in-memory caches for both entities.
 * Handles CRUD operations, plant-to-region mappings, and access control.
 * Automatically refreshes caches after mutations (create, update, delete).
 */
class PlantServiceImpl {
    allPlants = []
    allRegions = []

    /** Fetches all plants from the API and updates the local cache. */
    async fetchAllPlants() {
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/fetch-all`)
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
    /** Creates a new plant and refreshes the cache. */
    async createPlant(plantCode, plantName) {
        if (!plantCode?.trim() || !plantName?.trim()) throw new Error('Plant code and name are required')
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/create`, { plantCode, plantName })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to create plant')
        await this.fetchAllPlants()
        return true
    }
    /** Updates a plant's name plus any of address / latitude / longitude in
     *  one round trip. Address and lat/lng fields are independently
     *  optional — pass only what you want changed (the edge function only
     *  writes columns explicitly present on the payload). Busts the shared
     *  `plants:all` cache so callers picking up via `useAddressDistances`
     *  / `useCloserPlantLookup` see the new coords right away. */
    async updatePlant(plantCode, plantName, { plantAddress, latitude, longitude } = {}) {
        if (!plantCode?.trim() || !plantName?.trim()) throw new Error('Plant code and name are required')
        const payload = { plantCode, plantName }
        if (plantAddress !== undefined) payload.plantAddress = plantAddress
        if (latitude !== undefined) payload.latitude = latitude
        if (longitude !== undefined) payload.longitude = longitude
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/update`, payload)
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to update plant')
        CacheUtility.delete('plants:all')
        await this.fetchAllPlants()
        return true
    }
    /** Replaces this plant's co-location group with `[plantCode, ...siblingPlantCodes]`.
     *  The backend picks/keeps a single `location_group_id` shared by every
     *  plant in the new set, and clears any plants that were in the old
     *  group but aren't in the new one. Pass an empty `siblingPlantCodes`
     *  array to mark the plant as standalone. Busts the shared plants
     *  cache so downstream lookups (`usePlanLookups`, statistics) see the
     *  new grouping immediately. */
    async updatePlantColocation(plantCode, siblingPlantCodes) {
        if (!plantCode?.trim()) throw new Error('Plant code is required')
        const siblings = Array.isArray(siblingPlantCodes) ? siblingPlantCodes : []
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/update-colocation`, {
            plantCode,
            siblingPlantCodes: siblings
        })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to update plant co-location')
        CacheUtility.delete('plants:all')
        await this.fetchAllPlants()
        return true
    }
    /** Replaces the plant's manager-user-ids array with the supplied list.
     *  Caller passes the FULL desired list of user ids (not a delta) — the
     *  edge function dedupes + uuid-validates before writing. Returns the
     *  server-cleaned list so the UI can resync optimistic state. */
    async updatePlantManagers(plantCode, managerUserIds) {
        if (!plantCode?.trim()) throw new Error('Plant code is required')
        const payload = Array.isArray(managerUserIds) ? managerUserIds : []
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/update-managers`, {
            managerUserIds: payload,
            plantCode
        })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to update plant managers')
        CacheUtility.delete('plants:all')
        await this.fetchAllPlants()
        return Array.isArray(json?.managerUserIds) ? json.managerUserIds : payload
    }
    /** Deletes a plant and refreshes the cache. */
    async deletePlant(plantCode) {
        if (!plantCode) throw new Error('Plant code is required')
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/delete`, { plantCode })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to delete plant')
        await this.fetchAllPlants()
        return true
    }
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
            } catch (err) {
                console.error(`Failed to fetch region plants (attempt ${attempt + 1}/${maxAttempts}):`, err)
            }
            attempt += 1
            const delay = Math.min(4000, 500 * 2 ** (attempt - 1))
            await new Promise((r) => setTimeout(r, delay))
        }
        return []
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
        const regionCode = selectedRegionCode || (await this._resolveRegionCodeFromProfile())
        if (!regionCode) return null
        const regionPlants = await this.fetchRegionPlants(regionCode)
        return new Set(
            regionPlants
                .map((p) =>
                    String(p.plantCode || p.plant_code || '')
                        .trim()
                        .toUpperCase()
                )
                .filter(Boolean)
        )
    }
    /** Resolves a region code from the current user's profile plant assignment. */
    async _resolveRegionCodeFromProfile() {
        const user = await UserService.getCurrentUser()
        if (!user?.id) return ''
        const profilePlant = await UserService.getUserPlant(user.id)
        const plantCode =
            typeof profilePlant === 'string' ? profilePlant : profilePlant?.plant_code || profilePlant?.plantCode || ''
        if (!plantCode) return ''
        const regions = await this.fetchRegionsByPlantCode(plantCode)
        const firstRegion = Array.isArray(regions) && regions.length ? regions[0] : null
        return firstRegion?.regionCode || firstRegion?.region_code || ''
    }
}
export const PlantService = new PlantServiceImpl()
