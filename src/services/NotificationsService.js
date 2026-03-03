import EquipmentVerificationProvider from '../notifications/EquipmentVerificationNotifications'
import MixerVerificationProvider from '../notifications/MixerVerificationNotifications'
import OverdueListProvider from '../notifications/OverdueListNotifications'
import TractorVerificationProvider from '../notifications/TractorVerificationNotifications'

const providers = [
    MixerVerificationProvider,
    EquipmentVerificationProvider,
    TractorVerificationProvider,
    OverdueListProvider
]

/**
 * Aggregates notifications from multiple providers (mixer, equipment, tractor verifications
 * and overdue list items). Results are sorted by plant code for consistent display ordering.
 */
const NotificationsService = {
    /**
     * Collects and merges notifications from all registered providers.
     * Sorts results with plant-specific notifications first (by plant code),
     * followed by non-plant notifications.
     */
    async getNotifications(userId, selectedRegion) {
        if (!userId) return []
        const ctx = { selectedRegion, userId }
        const results = await Promise.all(providers.map((p) => p.getNotifications(ctx).catch(() => [])))
        const flat = results.flat().filter(Boolean)
        const withPlant = flat.filter((n) => n && typeof n.plantCode === 'string')
        const withoutPlant = flat.filter((n) => !n || typeof n.plantCode !== 'string')
        withPlant.sort((a, b) => {
            const ax = a.plantCode.trim().toUpperCase()
            const bx = b.plantCode.trim().toUpperCase()
            const an = parseInt(ax, 10)
            const bn = parseInt(bx, 10)
            if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn
            return ax.localeCompare(bx, undefined, { numeric: true, sensitivity: 'base' })
        })
        return [...withPlant, ...withoutPlant]
    }
}

export default NotificationsService
