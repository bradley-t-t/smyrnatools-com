import { UserService } from '../../services/UserService'
import RegionPlantScopeUtility from './RegionPlantScopeUtility'
import VerificationDueDateUtility from './VerificationDueDateUtility'

function groupByPlantCode(items, scopedPlants, plantCodeAccessor) {
    const grouped = new Map()
    for (const item of items) {
        const code = String(plantCodeAccessor(item) || '').toUpperCase()
        if (!scopedPlants.has(code)) continue
        if (!grouped.has(code)) grouped.set(code, [])
        grouped.get(code).push(item)
    }
    return grouped
}

function countUnverified(items, isVerifiedFn) {
    return items.reduce((count, item) => count + (isVerifiedFn(item) ? 0 : 1), 0)
}

function buildMultiPlantNotifications(byPlant, config, dueInfo) {
    const notifications = []
    byPlant.forEach((items, plantCode) => {
        const unverifiedCount = countUnverified(items, config.isVerifiedFn)
        if (unverifiedCount <= 0) return
        notifications.push({
            id: `${config.idPrefix}-${plantCode}`,
            plantCode,
            severity: dueInfo.severity,
            subtitle: `This plant has ${unverifiedCount} unverified ${config.entityLabel(unverifiedCount)}.`,
            title: `Plant ${plantCode} ${config.titleLabel} Verifications ${dueInfo.titlePhase}`,
            type: config.notificationType
        })
    })
    return notifications
}

function buildSinglePlantNotification(items, plantCode, config, dueInfo) {
    const unverifiedCount = countUnverified(items, config.isVerifiedFn)
    if (unverifiedCount <= 0) return []
    return [
        {
            id: `${config.idPrefix}-${plantCode}`,
            severity: dueInfo.severity,
            subtitle: `You have ${unverifiedCount} unverified ${config.entityLabel(unverifiedCount)}.`,
            title: `${config.titleLabel} Verifications ${dueInfo.titlePhase}`,
            type: config.notificationType
        }
    ]
}

function createVerificationNotificationProvider(config) {
    async function getNotifications({ userId, selectedRegion }) {
        if (!userId) return []

        const hasPermission = await UserService.hasPermission(userId, config.permissionKey).catch(() => false)
        if (!hasPermission) return []

        const hasMultiple = await UserService.hasPermission(userId, 'notifications.multiple').catch(() => false)

        const scopedPlants = await RegionPlantScopeUtility.getRegionScopedPlantCodes(userId, selectedRegion)
        if (scopedPlants.size === 0) return []

        const allItems = await config.fetchAllItems()
        const activeItems = allItems.filter((item) => String(item.status || '').toLowerCase() !== 'retired')

        const dueInfo = VerificationDueDateUtility.buildDueSeverity()
        const plantCodeAccessor = (item) => item.assignedPlant

        if (hasMultiple) {
            const byPlant = groupByPlantCode(activeItems, scopedPlants, plantCodeAccessor)
            return buildMultiPlantNotifications(byPlant, config, dueInfo)
        }

        const userPlantCode = await RegionPlantScopeUtility.resolveUserPlantCode(userId)
        if (!userPlantCode || !scopedPlants.has(userPlantCode)) return []

        const itemsAtPlant = activeItems.filter(
            (item) => String(item.assignedPlant || '').toUpperCase() === userPlantCode
        )
        return buildSinglePlantNotification(itemsAtPlant, userPlantCode, config, dueInfo)
    }

    return { getNotifications, id: config.notificationType }
}

export default createVerificationNotificationProvider
