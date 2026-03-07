import { supabase } from './DatabaseService'
import { UserService } from './UserService'
/**
 * Service for DB-backed notifications — fetch, mark-as-read, and soft-delete
 * per-user state stored in the notification_reads junction table.
 */
const UserNotificationsService = {
    async getDbNotifications(userId, selectedRegion) {
        if (!userId) return []
        const [roles, plantCode] = await Promise.all([
            UserService.getUserRoles(userId).catch(() => []),
            UserService.getUserPlant(userId).catch(() => null)
        ])
        const roleNames = roles.map((r) => r.name || r.role_name || '').filter(Boolean)
        const regionCode = selectedRegion?.code || null
        const { data, error } = await supabase
            .from('notifications')
            .select('*, notification_reads(read_at, deleted_at)')
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
            .order('created_at', { ascending: false })
            .limit(100)
        if (error || !data) return []
        return data
            .filter((n) => {
                const read = n.notification_reads?.[0]
                if (read?.deleted_at) return false
                if (n.target_type === 'all') return true
                if (n.target_type === 'user') return n.target_value === userId
                if (n.target_type === 'role') return roleNames.includes(n.target_value)
                if (n.target_type === 'plant') return n.target_value === plantCode
                if (n.target_type === 'region') return n.target_value === regionCode
                return false
            })
            .map((n) => {
                const read = n.notification_reads?.[0]
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
    async markAsRead(userId, dbId) {
        if (!userId || !dbId) return
        const { error } = await supabase
            .from('notification_reads')
            .upsert(
                { notification_id: dbId, read_at: new Date().toISOString(), user_id: userId },
                { onConflict: 'notification_id,user_id' }
            )
        return !error
    },
    async markAllRead(userId, dbIds) {
        if (!userId || !dbIds?.length) return
        await supabase.from('notification_reads').upsert(
            dbIds.map((id) => ({
                notification_id: id,
                read_at: new Date().toISOString(),
                user_id: userId
            })),
            { onConflict: 'notification_id,user_id' }
        )
    },
    async deleteNotification(userId, dbId) {
        if (!userId || !dbId) return
        const now = new Date().toISOString()
        await supabase
            .from('notification_reads')
            .upsert(
                { deleted_at: now, notification_id: dbId, read_at: now, user_id: userId },
                { onConflict: 'notification_id,user_id' }
            )
    }
}
export default UserNotificationsService
