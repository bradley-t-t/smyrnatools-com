import { RegionService } from '../../services/RegionService'
import { UserService } from '../../services/UserService'

function normalizePlantCodes(list) {
    const result = new Set()
    if (!list) return result
    const entries = list instanceof Set ? [...list] : Array.isArray(list) ? list : []
    entries.forEach((code) => result.add(String(code).toUpperCase()))
    return result
}

async function getRegionScopedPlantCodes(userId, selectedRegion) {
    const code = selectedRegion?.code || ''
    const type = selectedRegion?.type || ''
    if (!code) return new Set()

    if (String(type).toLowerCase() === 'office') {
        const regions = await UserService.getPermittedRegions(userId).catch(() => [])
        const allCodes = new Set()
        for (const region of Array.isArray(regions) ? regions : []) {
            const regionCode = region.regionCode || region.region_code
            if (!regionCode) continue
            const plantCodes = await RegionService.getAllowedPlantCodes(regionCode).catch(() => null)
            normalizePlantCodes(plantCodes).forEach((p) => allCodes.add(p))
        }
        return allCodes
    }

    const plantCodes = await RegionService.getAllowedPlantCodes(code).catch(() => null)
    return normalizePlantCodes(plantCodes)
}

async function resolveUserPlantCode(userId) {
    const userPlant = await UserService.getUserPlant(userId).catch(() => null)
    const raw = typeof userPlant === 'string' ? userPlant : userPlant?.plant_code || userPlant?.plantCode || ''
    return raw ? String(raw).toUpperCase() : ''
}

const RegionPlantScopeUtility = { getRegionScopedPlantCodes, resolveUserPlantCode }
export default RegionPlantScopeUtility
