import {UserService} from '../UserService'
import {RegionService} from '../RegionService'
import {MixerService} from '../MixerService'
import MixerUtility from '../../utils/MixerUtility'

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
    const pmNode = await UserService.hasPermission(userId, 'notifications.plant_manager').catch(() => false)
    const dmNode = await UserService.hasPermission(userId, 'notifications.district_manager').catch(() => false)
    const gmNode = await UserService.hasPermission(userId, 'notifications.general_manager').catch(() => false)
    if (!pmNode && !dmNode && !gmNode) return []
    const allMixers = await MixerService.getAllMixers().catch(() => [])
    const mixers = (allMixers || []).filter(m => String(m.status || '').toLowerCase() !== 'retired')
    const scopedPlants = await getRegionScopedPlantCodes(userId, selectedRegion)
    if (scopedPlants.size === 0) return []

    if (pmNode) {
        const userPlant = await UserService.getUserPlant(userId).catch(() => null)
        const userPlantCodeRaw = typeof userPlant === 'string' ? userPlant : (userPlant?.plant_code || userPlant?.plantCode || '')
        const userPlantCode = userPlantCodeRaw ? String(userPlantCodeRaw).toUpperCase() : ''
        if (!userPlantCode || !scopedPlants.has(userPlantCode)) return []
        const mixersAtPlant = mixers.filter(m => String(m.assignedPlant || '').toUpperCase() === userPlantCode)
        if (!mixersAtPlant.length) return []
        const unverified = mixersAtPlant.filter(m => !MixerUtility.isVerified(m.updatedLast, m.updatedAt, m.updatedBy))
        const missingCount = unverified.length
        if (missingCount <= 0) return []
        const plural = missingCount === 1 ? 'mixer' : 'mixers'
        return [{
            id: `mixers-verify-${userPlantCode}`,
            title: 'Mixer Verifications Past Due',
            subtitle: `You have ${missingCount} unverified ${plural}.`,
            severity: 'warning',
            type: 'mixers.verifications'
        }]
    }

    const byPlant = new Map()
    mixers.forEach(m => {
        const code = String(m.assignedPlant || '').toUpperCase()
        if (!scopedPlants.has(code)) return
        if (!byPlant.has(code)) byPlant.set(code, [])
        byPlant.get(code).push(m)
    })

    const notifications = []
    byPlant.forEach((mixersAtPlant, code) => {
        if (!mixersAtPlant.length) return
        const unverified = mixersAtPlant.filter(m => !MixerUtility.isVerified(m.updatedLast, m.updatedAt, m.updatedBy))
        const missingCount = unverified.length
        if (missingCount > 0) {
            const plural = missingCount === 1 ? 'mixer' : 'mixers'
            notifications.push({
                id: `mixers-verify-${code}`,
                title: `Plant ${code} Mixer Verifications Past Due`,
                subtitle: `This plant has ${missingCount} unverified ${plural}.`,
                severity: 'warning',
                type: 'mixers.verifications',
                plantCode: code
            })
        }
    })
    return notifications
}

export default { id: 'mixers.verifications', getNotifications }