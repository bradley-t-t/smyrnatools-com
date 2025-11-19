import MixerVerificationProvider from './notifications/MixerVerificationNotifications'
import EquipmentVerificationProvider from './notifications/EquipmentVerificationNotifications'
import TractorVerificationProvider from './notifications/TractorVerificationNotifications'
import PlantReportsOverdueProvider from './notifications/PlantReportsOverdueNotifications'

const providers = [MixerVerificationProvider, EquipmentVerificationProvider, TractorVerificationProvider, PlantReportsOverdueProvider]

const NotificationsService = {
    async getNotifications(userId, selectedRegion) {
        if (!userId) return []
        const ctx = {userId, selectedRegion}
        const results = await Promise.all(providers.map(p => p.getNotifications(ctx).catch(() => [])))
        const flat = results.flat().filter(Boolean)
        const withPlant = flat.filter(n => n && typeof n.plantCode === 'string')
        const withoutPlant = flat.filter(n => !n || typeof n.plantCode !== 'string')
        withPlant.sort((a, b) => {
            const ax = a.plantCode.trim().toUpperCase()
            const bx = b.plantCode.trim().toUpperCase()
            const an = parseInt(ax, 10)
            const bn = parseInt(bx, 10)
            if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn
            return ax.localeCompare(bx, undefined, {numeric: true, sensitivity: 'base'})
        })
        return [...withPlant, ...withoutPlant]
    }
}

export default NotificationsService