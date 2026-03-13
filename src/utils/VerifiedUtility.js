/**
 * Determines whether an asset is currently verified by checking that
 * the last verification timestamp is more recent than the most recent
 * Monday at 5 PM CST and that no updates occurred after verification.
 *
 * Also provides due-date severity using Central Time zone awareness.
 * Returns "Past Due" (error) or "Due" (warning) based on the Friday 10 AM CT
 * through Monday 5 PM CT past-due window.
 *
 * Additionally exposes a factory for creating verification notification
 * providers that group assets by plant, count unverified items, and produce
 * plant-specific or single-plant notifications based on user permissions.
 */
import { UserService } from '../services/UserService'
import { getRegionScopedPlantCodes, resolveUserPlantCode } from './BaseAssetUtility'

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CENTRAL_TIME_FORMAT_OPTIONS = {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    timeZone: 'America/Chicago',
    weekday: 'short'
}
const FRIDAY_INDEX = 5
const SATURDAY_INDEX = 6
const SUNDAY_INDEX = 0
const MONDAY_INDEX = 1
const PAST_DUE_FRIDAY_HOUR = 10
const PAST_DUE_MONDAY_CUTOFF_HOUR = 17
function isPastDue() {
    const parts = new Intl.DateTimeFormat('en-US', CENTRAL_TIME_FORMAT_OPTIONS).formatToParts(new Date())
    const partMap = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
    const dayIndex = WEEKDAY_NAMES.indexOf(partMap.weekday)
    const hour = parseInt(partMap.hour, 10)
    return (
        (dayIndex === FRIDAY_INDEX && hour >= PAST_DUE_FRIDAY_HOUR) ||
        dayIndex === SATURDAY_INDEX ||
        dayIndex === SUNDAY_INDEX ||
        (dayIndex === MONDAY_INDEX && hour < PAST_DUE_MONDAY_CUTOFF_HOUR)
    )
}
export function buildDueSeverity() {
    const pastDue = isPastDue()
    return {
        severity: pastDue ? 'error' : 'warning',
        titlePhase: pastDue ? 'Past Due' : 'Due'
    }
}

// --- Verification notification provider factory ---

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
export function createVerificationNotificationProvider(config) {
    async function getNotifications({ userId, selectedRegion }) {
        if (!userId) return []
        const hasPermission = await UserService.hasPermission(userId, config.permissionKey).catch(() => false)
        if (!hasPermission) return []
        const hasMultiple = await UserService.hasPermission(userId, 'notifications.multiple').catch(() => false)
        const scopedPlants = await getRegionScopedPlantCodes(userId, selectedRegion)
        if (scopedPlants.size === 0) return []
        const allItems = await config.fetchAllItems()
        const activeItems = allItems.filter((item) => String(item.status || '').toLowerCase() !== 'retired')
        const dueInfo = buildDueSeverity()
        const plantCodeAccessor = (item) => item.assignedPlant
        if (hasMultiple) {
            const byPlant = groupByPlantCode(activeItems, scopedPlants, plantCodeAccessor)
            return buildMultiPlantNotifications(byPlant, config, dueInfo)
        }
        const userPlantCode = await resolveUserPlantCode(userId)
        if (!userPlantCode || !scopedPlants.has(userPlantCode)) return []
        const itemsAtPlant = activeItems.filter(
            (item) => String(item.assignedPlant || '').toUpperCase() === userPlantCode
        )
        return buildSinglePlantNotification(itemsAtPlant, userPlantCode, config, dueInfo)
    }
    return { getNotifications, id: config.notificationType }
}

const VerifiedUtility = {
    buildDueSeverity,
    createVerificationNotificationProvider,
    isVerified(updatedLast, updatedAt, updatedBy) {
        if (!updatedLast || !updatedBy) return false
        try {
            const lastVerified = new Date(updatedLast)
            const lastUpdated = new Date(updatedAt)
            const now = new Date()
            if (lastUpdated > lastVerified) return false
            const getMostRecentMonday5pmCST = (date) => {
                const CST_OFFSET = -6
                const d = new Date(date)
                const utcDay = d.getUTCDay()
                const diff = (utcDay + 6) % 7
                d.setUTCDate(d.getUTCDate() - diff)
                d.setUTCHours(17 - CST_OFFSET, 0, 0, 0)
                if (d > date) d.setUTCDate(d.getUTCDate() - 7)
                return d
            }
            const mostRecentMonday5pmCST = getMostRecentMonday5pmCST(now)
            return lastVerified > mostRecentMonday5pmCST
        } catch {
            return false
        }
    }
}
export default VerifiedUtility
