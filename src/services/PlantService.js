import { Plant } from '../models/plants/Plant'
import APIUtility from '../utils/APIUtility'

const AUTH_FUNCTION = 'plant-service'

/**
 * Plant CRUD and lookup service with an in-memory cache of all plant records.
 * Automatically refreshes the cache after mutations (create, update, delete).
 */
class PlantServiceImpl {
    allPlants = []

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
}

export const PlantService = new PlantServiceImpl()
