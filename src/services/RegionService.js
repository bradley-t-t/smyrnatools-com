import APIUtility from '../utils/APIUtility'
import Region from '../models/regions/Region'
import {UserService} from './UserService'

class RegionServiceImpl {
    allRegions = []

    async fetchRegions() {
        const {res, json} = await APIUtility.post('/region-service/fetch-regions')
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch regions')
        const data = json?.data ?? []
        this.allRegions = data
        return data.map(row => Region.fromRow(row))
    }

    async fetchRegionByCode(regionCode) {
        if (!regionCode) throw new Error('Region code is required')
        const region = this.getRegionByCode(regionCode)
        if (region) return region
        const {res, json} = await APIUtility.post('/region-service/fetch-region-by-code', {regionCode})
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch region')
        const data = json?.data ?? null
        return data ? Region.fromRow(data) : null
    }

    getRegionByCode(regionCode) {
        const region = this.allRegions.find(r => r.region_code === regionCode)
        return region ? Region.fromRow(region) : null
    }

    getRegionName(regionCode) {
        const r = this.getRegionByCode(regionCode)
        return r?.regionName ?? regionCode
    }

    async createRegion(regionCode, regionName, type) {
        if (!regionCode?.trim() || !regionName?.trim()) throw new Error('Region code and name are required')
        if (!type || !['Concrete', 'Aggregate', 'Office'].includes(type)) throw new Error('Region type is invalid')
        const {res, json} = await APIUtility.post('/region-service/create', {regionCode, regionName, type})
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to create region')
        await this.fetchRegions()
        return true
    }

    async updateRegion(regionCode, regionName, plantCodes = [], type) {
        if (!regionCode?.trim() || !regionName?.trim()) throw new Error('Region code and name are required')
        const payload = {regionCode, regionName, plantCodes}
        if (type && ['Concrete', 'Aggregate', 'Office'].includes(type)) payload.type = type
        const {res, json} = await APIUtility.post('/region-service/update', payload)
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to update region')
        await this.fetchRegions()
        return true
    }

    async deleteRegion(regionCode) {
        if (!regionCode) throw new Error('Region code is required')
        const {res, json} = await APIUtility.post('/region-service/delete', {regionCode})
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to delete region')
        await this.fetchRegions()
        return true
    }

    async fetchRegionPlants(regionCode) {
        if (!regionCode) throw new Error('Region code is required')
        const {res, json} = await APIUtility.post('/region-service/fetch-region-plants', {regionCode})
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch region plants')
        const data = json?.data ?? []
        return data.map(row => ({
            plantCode: row.plant_code,
            plantName: row.plant_name
        }))
    }

    async getRegionWithPlants(regionCode) {
        if (!regionCode) throw new Error('Region code is required')
        const region = await this.fetchRegionByCode(regionCode)
        if (!region) return null
        const plants = await this.fetchRegionPlants(regionCode)
        return {...region, plants}
    }

    async fetchRegionsByPlantCode(plantCode) {
        if (!plantCode) throw new Error('Plant code is required')
        const {res, json} = await APIUtility.post('/region-service/fetch-regions-by-plant-code', {plantCode})
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch regions by plant code')
        const data = json?.data ?? []
        return data.map(row => Region.fromRow(row))
    }

    async getAllowedPlantCodes(selectedRegionCode) {
        let regionCode = selectedRegionCode || ''
        if (!regionCode) {
            const user = await UserService.getCurrentUser()
            const uid = user?.id || ''
            if (uid) {
                const profilePlant = await UserService.getUserPlant(uid)
                const plantCode = typeof profilePlant === 'string' ? profilePlant : (profilePlant?.plant_code || profilePlant?.plantCode || '')
                if (plantCode) {
                    const regions = await this.fetchRegionsByPlantCode(plantCode)
                    const r = Array.isArray(regions) && regions.length ? regions[0] : null
                    regionCode = r ? (r.regionCode || r.region_code || '') : ''
                }
            }
        }
        if (!regionCode) return null
        const regionPlants = await this.fetchRegionPlants(regionCode)
        const codes = new Set(regionPlants.map(p => String(p.plantCode || p.plant_code || '').trim().toUpperCase()).filter(Boolean))
        return codes
    }
}

export const RegionService = new RegionServiceImpl()
