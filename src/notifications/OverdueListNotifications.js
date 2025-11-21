import {UserService} from '../services/UserService'
import {ListService} from '../services/ListService'
import {RegionService} from '../services/RegionService'

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
    
    const hasListItems = await UserService.hasPermission(userId, 'notifications.list_items').catch(() => false)
    
    if (!hasListItems) return []
    
    const hasMultiple = await UserService.hasPermission(userId, 'notifications.multiple').catch(() => false)
    
    try {
        await ListService.fetchListItems({force: false})
    } catch (err) {
        console.error('Error fetching list items for notifications:', err)
        return []
    }
    
    const allItems = ListService.listItems || []
    
    if (hasMultiple) {
        const scopedPlants = await getRegionScopedPlantCodes(userId, selectedRegion)
        if (scopedPlants.size === 0) return []
        
        const byPlant = new Map()
        allItems.forEach(item => {
            const plantCode = String(item.plant_code || '').toUpperCase()
            if (!scopedPlants.has(plantCode)) return
            if (!item.completed && ListService.isOverdue(item)) {
                if (!byPlant.has(plantCode)) byPlant.set(plantCode, [])
                byPlant.get(plantCode).push(item)
            }
        })
        
        const notifications = []
        byPlant.forEach((items, plantCode) => {
            const overdueCount = items.length
            if (overdueCount > 0) {
                const plural = overdueCount === 1 ? 'item' : 'items'
                notifications.push({
                    id: `list-overdue-${plantCode}`,
                    title: `Plant ${plantCode} has Overdue Tasks`,
                    subtitle: `This plant has ${overdueCount} overdue task ${plural}.`,
                    severity: 'error',
                    type: 'list.overdue',
                    plantCode: plantCode,
                    count: overdueCount
                })
            }
        })
        
        return notifications
    }
    
    const userPlant = await UserService.getUserPlant(userId).catch(() => null)
    const userPlantCode = typeof userPlant === 'string' ? userPlant : (userPlant?.plant_code || userPlant?.plantCode || '')
    
    if (!userPlantCode) return []
    
    const userPlantCodeUpper = String(userPlantCode).toUpperCase()
    
    const overdueItems = allItems.filter(item => {
        const itemPlantCode = String(item.plant_code || '').toUpperCase()
        return itemPlantCode === userPlantCodeUpper && 
               !item.completed && 
               ListService.isOverdue(item)
    })
    
    const overdueCount = overdueItems.length
    
    if (overdueCount === 0) return []
    
    const plural = overdueCount === 1 ? 'item' : 'items'
    
    return [{
        id: `list-overdue-${userPlantCodeUpper}`,
        title: `You have Overdue Tasks`,
        subtitle: `You have ${overdueCount} overdue task ${plural} for Plant ${userPlantCode}.`,
        severity: 'error',
        type: 'list.overdue',
        plantCode: userPlantCode,
        count: overdueCount
    }]
}

export default {id: 'list.overdue', getNotifications}