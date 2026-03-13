import EquipmentVerificationProvider from '../app/notifications/EquipmentVerificationNotifications'
import MixerVerificationProvider from '../app/notifications/MixerVerificationNotifications'
import OverdueListProvider from '../app/notifications/OverdueListNotifications'
import TractorVerificationProvider from '../app/notifications/TractorVerificationNotifications'
import { Database } from './DatabaseService'
import { UserService } from './UserService'

/** Computed providers that derive notifications from live asset/task state. */
const computedProviders = [
    MixerVerificationProvider,
    EquipmentVerificationProvider,
    TractorVerificationProvider,
    OverdueListProvider
]

/**
 * Unified notification service — aggregates computed notifications (asset verifications,
 * overdue tasks) with DB-backed notifications (announcements, system messages).
 * Also handles mark-as-read, mark-all-read, and soft-delete for per-user state
 * stored in the notification_reads junction table.
 */
const NotificationsService = {
    async deleteNotification(userId, dbId) {
        if (!userId || !dbId) return
        const now = new Date().toISOString()
        await Database.from('notification_reads').upsert(
            { deleted_at: now, notification_id: dbId, read_at: now, user_id: userId },
            { onConflict: 'notification_id,user_id' }
        )
    },

    async getDbNotifications(userId, selectedRegion) {
        if (!userId) return []
        const [roles, plantCode] = await Promise.all([
            UserService.getUserRoles(userId).catch(() => []),
            UserService.getUserPlant(userId).catch(() => null)
        ])
        const roleNames = roles.map((r) => r.name || r.role_name || '').filter(Boolean)
        const regionCode = selectedRegion?.code || null
        const { data, error } = await Database.from('notifications')
            .select('*, notification_reads(read_at, deleted_at, user_id)')
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
            .order('created_at', { ascending: false })
            .limit(100)
        if (error || !data) return []
        return data
            .filter((n) => {
                const read = n.notification_reads?.find((r) => r.user_id === userId)
                if (read?.deleted_at) return false
                if (n.target_type === 'all') return true
                if (n.target_type === 'user') return n.target_value === userId
                if (n.target_type === 'role') return roleNames.includes(n.target_value)
                if (n.target_type === 'plant') return n.target_value === plantCode
                if (n.target_type === 'region') return n.target_value === regionCode
                return false
            })
            .map((n) => {
                const read = n.notification_reads?.find((r) => r.user_id === userId)
                return {
                    body: n.body || '',
                    createdAt: n.created_at,
                    dbId: n.id,
                    id: `db-${n.id}`,
                    isRead: !!read?.read_at,
                    linkContext: n.link_context,
                    linkView: n.link_view,
                    severity: n.severity || 'info',
                    source: 'db',
                    subtitle: n.body || '',
                    title: n.title,
                    type: n.type || 'system'
                }
            })
    },

    async getNotifications(userId, selectedRegion) {
        if (!userId) return []
        const ctx = { selectedRegion, userId }
        const [computedResults, dbNotifications] = await Promise.all([
            Promise.all(computedProviders.map((p) => p.getNotifications(ctx).catch(() => []))),
            this.getDbNotifications(userId, selectedRegion).catch(() => [])
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
    },

    async markAllRead(userId, dbIds) {
        if (!userId || !dbIds?.length) return
        await Database.from('notification_reads').upsert(
            dbIds.map((id) => ({
                notification_id: id,
                read_at: new Date().toISOString(),
                user_id: userId
            })),
            { onConflict: 'notification_id,user_id' }
        )
    },

    async markAsRead(userId, dbId) {
        if (!userId || !dbId) return
        const { error } = await Database.from('notification_reads').upsert(
            { notification_id: dbId, read_at: new Date().toISOString(), user_id: userId },
            { onConflict: 'notification_id,user_id' }
        )
        return !error
    }
}
export default NotificationsService
