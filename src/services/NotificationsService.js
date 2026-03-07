import EquipmentVerificationProvider from '../notifications/EquipmentVerificationNotifications'
import MixerVerificationProvider from '../notifications/MixerVerificationNotifications'
import OverdueListProvider from '../notifications/OverdueListNotifications'
import TractorVerificationProvider from '../notifications/TractorVerificationNotifications'
import UserNotificationsService from './UserNotificationsService'
/** Computed providers that derive notifications from live asset/task state. */
const computedProviders = [
    MixerVerificationProvider,
    EquipmentVerificationProvider,
    TractorVerificationProvider,
    OverdueListProvider
]
/**
 * Aggregates notifications from computed providers (asset verifications, overdue tasks)
 * and DB-backed notifications (announcements, system messages). Computed notifications are
 * sorted by plant code; DB notifications are sorted by recency.
 */
const NotificationsService = {
    async getNotifications(userId, selectedRegion) {
        if (!userId) return []
        const ctx = { selectedRegion, userId }
        const [computedResults, dbNotifications] = await Promise.all([
            Promise.all(computedProviders.map((p) => p.getNotifications(ctx).catch(() => []))),
            UserNotificationsService.getDbNotifications(userId, selectedRegion).catch(() => [])
        ])
        const computed = computedResults
            .flat()
            .filter(Boolean)
            .map((n) => ({ ...n, source: 'computed' }))
        const withPlant = computed.filter((n) => typeof n.plantCode === 'string')
        const withoutPlant = computed.filter((n) => typeof n.plantCode !== 'string')
        withPlant.sort((a, b) => {
            const ax = a.plantCode.trim().toUpperCase()
            const bx = b.plantCode.trim().toUpperCase()
            const an = parseInt(ax, 10)
            const bn = parseInt(bx, 10)
            if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn
            return ax.localeCompare(bx, undefined, { numeric: true, sensitivity: 'base' })
        })
        return [...withPlant, ...withoutPlant, ...dbNotifications]
    }
}
export default NotificationsService
