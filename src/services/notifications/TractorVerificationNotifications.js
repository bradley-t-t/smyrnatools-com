import {UserService} from '../UserService'
import {RegionService} from '../RegionService'
import {TractorService} from '../TractorService'
import TractorUtility from '../../utils/TractorUtility'

async function getRegionScopedPlantCodes(userId, selectedRegion) {
    const code = selectedRegion?.code || ''
    const type = selectedRegion?.type || ''
    if (!code) return new Set()
    if (String(type).toLowerCase() === 'office') {
        const regions = await UserService.getPermittedRegions(userId).catch(() => [])
        const out = new Set()
        for (const r of Array.isArray(regions) ? regions : []) {
            const rCode = r.regionCode || r.region_code
            if (!rCode) continue
            const list = await RegionService.getAllowedPlantCodes(rCode).catch(() => null)
            if (!list) continue
            if (list instanceof Set) list.forEach(p => out.add(String(p).toUpperCase()))
            else if (Array.isArray(list)) list.forEach(p => out.add(String(p).toUpperCase()))
        }
        return out
    }
    const list = await RegionService.getAllowedPlantCodes(code).catch(() => null)
    const out = new Set()
    if (list instanceof Set) list.forEach(p => out.add(String(p).toUpperCase()))
    else if (Array.isArray(list)) list.forEach(p => out.add(String(p).toUpperCase()))
    return out
}

async function getNotifications({userId, selectedRegion}) {
    if (!userId) return []
    const tmNode = await UserService.hasPermission(userId, 'notifications.tractor_manager').catch(() => false)
    const dmNode = await UserService.hasPermission(userId, 'notifications.district_manager').catch(() => false)
    const gmNode = await UserService.hasPermission(userId, 'notifications.general_manager').catch(() => false)
    if (!tmNode && !dmNode && !gmNode) return []
    const scopedPlants = await getRegionScopedPlantCodes(userId, selectedRegion)
    if (scopedPlants.size === 0) return []
    const all = await TractorService.getAllTractors().catch(() => [])
    const tractors = (all || []).filter(t => String(t.status || '').toLowerCase() !== 'retired')
    const byPlant = new Map()
    tractors.forEach(t => {
        const code = String(t.assignedPlant || '').toUpperCase()
        if (!scopedPlants.has(code)) return
        if (!byPlant.has(code)) byPlant.set(code, [])
        byPlant.get(code).push(t)
    })
    const notifications = []
    byPlant.forEach((list, code) => {
        const unverifiedCount = list.reduce((acc, t) => acc + (!TractorUtility.isVerified(t.updatedLast, t.updatedAt, t.updatedBy, t.latestHistoryDate) ? 1 : 0), 0)
        if (unverifiedCount > 0) {
            notifications.push({
                id: `tractors-verify-${code}`,
                title: `Plant ${code} Tractor Verifications Past Due`,
                subtitle: `This plant has ${unverifiedCount} unverified tractors.`,
                severity: 'warning',
                type: 'tractors.verifications',
                plantCode: code
            })
        }
    })
    return notifications
}

export default { id: 'tractors.verifications', getNotifications }