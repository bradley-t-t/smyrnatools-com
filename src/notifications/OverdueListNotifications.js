import { ListService } from '../services/ListService'
import { UserService } from '../services/UserService'
import RegionPlantScopeUtility from '../utils/RegionPlantScopeUtility'

/**
 * Overdue task-list notification provider.
 * Detects incomplete overdue list items per plant and produces
 * single-plant or multi-plant notifications based on user permissions.
 */

/** Fetches list items with a single retry on transient network failures. */
async function fetchListItemsWithRetry() {
    try {
        await ListService.fetchListItems({ force: false })
    } catch (error) {
        if (!error.message?.includes('Load failed')) return
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await ListService.fetchListItems({ force: true }).catch(() => {})
    }
}

/** @returns Whether the item is both incomplete and past its due date. */
function isOverdueIncompleteItem(item) {
    return !item.completed && ListService.isOverdue(item)
}

/** Constructs a plant-scoped overdue notification with appropriate messaging. */
function buildPlantNotification(plantCode, overdueCount, isMultiplePlant) {
    if (overdueCount <= 0) return null
    const plural = overdueCount === 1 ? 'item' : 'items'
    return {
        count: overdueCount,
        id: `list-overdue-${plantCode}`,
        plantCode,
        severity: 'error',
        subtitle: isMultiplePlant
            ? `This plant has ${overdueCount} overdue task ${plural}.`
            : `You have ${overdueCount} overdue task ${plural} for Plant ${plantCode}.`,
        title: isMultiplePlant ? `Plant ${plantCode} has Overdue Tasks` : `You have Overdue Tasks`,
        type: 'list.overdue'
    }
}

/**
 * Resolves overdue task notifications for the given user.
 * Multi-plant users see per-plant notifications; single-plant users see a consolidated one.
 */
async function getNotifications({ userId, selectedRegion }) {
    if (!userId) return []

    const hasListItems = await UserService.hasPermission(userId, 'notifications.list_items').catch(() => false)
    if (!hasListItems) return []

    const hasMultiple = await UserService.hasPermission(userId, 'notifications.multiple').catch(() => false)

    await fetchListItemsWithRetry()
    const allItems = ListService.listItems || []

    if (hasMultiple) {
        const scopedPlants = await RegionPlantScopeUtility.getRegionScopedPlantCodes(userId, selectedRegion)
        if (scopedPlants.size === 0) return []

        const byPlant = new Map()
        for (const item of allItems) {
            const plantCode = String(item.plant_code || '').toUpperCase()
            if (!scopedPlants.has(plantCode) || !isOverdueIncompleteItem(item)) continue
            if (!byPlant.has(plantCode)) byPlant.set(plantCode, 0)
            byPlant.set(plantCode, byPlant.get(plantCode) + 1)
        }

        const notifications = []
        byPlant.forEach((count, plantCode) => {
            const notification = buildPlantNotification(plantCode, count, true)
            if (notification) notifications.push(notification)
        })
        return notifications
    }

    const userPlantCode = await RegionPlantScopeUtility.resolveUserPlantCode(userId)
    if (!userPlantCode) return []

    const overdueCount = allItems.filter((item) => {
        const itemPlantCode = String(item.plant_code || '').toUpperCase()
        return itemPlantCode === userPlantCode && isOverdueIncompleteItem(item)
    }).length

    const notification = buildPlantNotification(userPlantCode, overdueCount, false)
    return notification ? [notification] : []
}

export default { getNotifications, id: 'list.overdue' }
