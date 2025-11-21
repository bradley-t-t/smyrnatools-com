import {UserService} from '../services/UserService'
import {RegionService} from '../services/RegionService'
import {MixerService} from '../services/MixerService'
import MixerUtility from '../utils/MixerUtility'

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
    
    if (!pmNode) {
        console.log('MixerVerificationNotifications: No notifications.plant_manager permission')
        return []
    }
    
    const hasMultiple = await UserService.hasPermission(userId, 'notifications.multiple').catch(() => false)
    
    console.log('MixerVerificationNotifications DEBUG:', {
        userId,
        pmNode,
        hasMultiple,
        selectedRegion: selectedRegion?.code
    })
    
    const allMixers = await MixerService.getAllMixers().catch(() => [])
    const mixers = (allMixers || []).filter(m => String(m.status || '').toLowerCase() !== 'retired')
    
    console.log('MixerVerificationNotifications: Total active mixers:', mixers.length)
    
    const scopedPlants = await getRegionScopedPlantCodes(userId, selectedRegion)
    
    console.log('MixerVerificationNotifications: Scoped plants:', Array.from(scopedPlants))
    
    if (scopedPlants.size === 0) {
        console.log('MixerVerificationNotifications: No scoped plants')
        return []
    }
    
    const now = new Date()
    const centralParts = new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(now)
    const mp = {}
    centralParts.forEach(p=>{mp[p.type]=p.value})
    const dayIndex = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(mp.weekday)
    const hour = parseInt(mp.hour,10)
    const pastDue = (dayIndex===5 && hour>=10) || dayIndex===6 || dayIndex===0 || (dayIndex===1 && hour<17)

    if (hasMultiple) {
        console.log('MixerVerificationNotifications: Using notifications.multiple - showing all plants')
        
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
                const titlePhase = pastDue ? 'Past Due' : 'Due'
                const severity = pastDue ? 'error' : 'warning'
                notifications.push({
                    id: `mixers-verify-${code}`,
                    title: `Plant ${code} Mixer Verifications ${titlePhase}`,
                    subtitle: `This plant has ${missingCount} unverified ${plural}.`,
                    severity,
                    type: 'mixers.verifications',
                    plantCode: code
                })
            }
        })
        
        console.log('MixerVerificationNotifications (notifications.multiple): Returning', notifications.length, 'notifications')
        return notifications
    }

    console.log('MixerVerificationNotifications: Using single plant mode')
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
    const titlePhase = pastDue ? 'Past Due' : 'Due'
    const severity = pastDue ? 'error' : 'warning'
    return [{
        id: `mixers-verify-${userPlantCode}`,
        title: `Mixer Verifications ${titlePhase}`,
        subtitle: `You have ${missingCount} unverified ${plural}.`,
        severity,
        type: 'mixers.verifications'
    }]
}

export default {id: 'mixers.verifications', getNotifications}