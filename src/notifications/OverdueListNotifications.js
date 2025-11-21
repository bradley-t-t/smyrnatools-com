import {UserService} from '../services/UserService'
import {ListService} from '../services/ListService'

async function getNotifications({userId, selectedRegion: _selectedRegion}) {
    if (!userId) return []
    
    const hasPerm = await UserService.hasPermission(userId, 'notifications.plant_manager.list').catch(() => false)
    if (!hasPerm) return []
    
    const userPlant = await UserService.getUserPlant(userId).catch(() => null)
    const userPlantCode = typeof userPlant === 'string' ? userPlant : (userPlant?.plant_code || userPlant?.plantCode || '')
    
    if (!userPlantCode) return []
    
    const userPlantCodeUpper = String(userPlantCode).toUpperCase()
    
    try {
        await ListService.fetchListItems({force: false})
    } catch (err) {
        console.error('Error fetching list items for notifications:', err)
        return []
    }
    
    const allItems = ListService.listItems || []
    
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
        title: `${overdueCount} Overdue List ${overdueCount === 1 ? 'Item' : 'Items'}`,
        subtitle: `You have ${overdueCount} overdue task ${plural} for Plant ${userPlantCode}.`,
        severity: 'error',
        type: 'list.overdue',
        plantCode: userPlantCode,
        count: overdueCount
    }]
}

export default {id: 'list.overdue', getNotifications}
