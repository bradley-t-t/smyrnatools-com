import { supabase } from './DatabaseService'
import { UserService } from './UserService'
const MESSAGES_VIEW = 'messages_decrypted'
const MESSAGES_TABLE = 'messages'
/**
 * Resolves the canonical users table ID from whatever ID is in session storage.
 * Handles the case where session ID (users_sessions.id) is stored instead of users.id.
 */
async function resolveUserId(sessionId) {
    if (!sessionId) return null
    try {
        const { data } = await supabase.from('users_sessions').select('user_id').eq('id', sessionId).maybeSingle()
        return data?.user_id || sessionId
    } catch {
        return sessionId
    }
}
/**
 * Service for direct user-to-user encrypted messaging.
 * Messages are encrypted at rest via pgcrypto and decrypted through a database view.
 */
const MessageService = {
    /** Soft-deletes a message for the recipient. */
    async deleteForRecipient(messageId) {
        if (!messageId) return
        await supabase.from(MESSAGES_TABLE).update({ deleted_by_recipient: true }).eq('id', messageId)
    },
    /** Soft-deletes a message for the sender. */
    async deleteForSender(messageId) {
        if (!messageId) return
        await supabase.from(MESSAGES_TABLE).update({ deleted_by_sender: true }).eq('id', messageId)
    },
    /**
     * Fetches all messages the user is involved in (sent or received, not deleted).
     * Used to build conversation threads.
     */
    async getAllMessages(userId) {
        const resolvedId = await resolveUserId(userId)
        if (!resolvedId) return []
        const [{ data: received }, { data: sent }] = await Promise.all([
            supabase
                .from(MESSAGES_VIEW)
                .select('*')
                .eq('recipient_id', resolvedId)
                .eq('deleted_by_recipient', false)
                .order('created_at', { ascending: false })
                .limit(200),
            supabase
                .from(MESSAGES_VIEW)
                .select('*')
                .eq('sender_id', resolvedId)
                .eq('deleted_by_sender', false)
                .order('created_at', { ascending: false })
                .limit(200)
        ])
        // Merge, deduplicate by id, sort newest first
        const map = new Map()
        ;[...(received || []), ...(sent || [])].forEach((row) => {
            if (!map.has(row.id)) map.set(row.id, formatMessage(row))
        })
        return [...map.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    },

    /** Fetches a single message by ID from the decrypted view. */
    async getMessageById(messageId) {
        if (!messageId) return null
        const { data, error } = await supabase.from(MESSAGES_VIEW).select('*').eq('id', messageId).maybeSingle()
        if (error || !data) return null
        return formatMessage(data)
    },

    /**
     * Fetches regional team members for the recipient picker.
     * Returns users filtered to the selected region, excluding guests/terminated.
     */
    async getRegionalRecipients(regionCode) {
        const [allUsers, allowedPlants] = await Promise.all([
            UserService.getAllUsersWithProfilesAndRoles(),
            regionCode
                ? (await import('./RegionService')).RegionService.getAllowedPlantCodes(regionCode)
                : Promise.resolve(null)
        ])
        return allUsers
            .filter((u) => {
                if (!u.roleName) return false
                const role = u.roleName.toLowerCase()
                if (role === 'guest' || role === 'terminated') return false
                if (allowedPlants && u.plantCode) {
                    return allowedPlants.has(u.plantCode.trim().toUpperCase())
                }
                return true
            })
            .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
    },
    /** Returns the count of unread inbox messages. */
    async getUnreadCount(userId) {
        const resolvedId = await resolveUserId(userId)
        if (!resolvedId) return 0
        const { count, error } = await supabase
            .from(MESSAGES_TABLE)
            .select('id', { count: 'exact', head: true })
            .eq('recipient_id', resolvedId)
            .eq('is_read', false)
            .eq('deleted_by_recipient', false)
        if (error) return 0
        return count || 0
    },
    /** Marks all unread inbox messages as read. */
    async markAllRead(userId) {
        const resolvedId = await resolveUserId(userId)
        if (!resolvedId) return
        await supabase
            .from(MESSAGES_TABLE)
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('recipient_id', resolvedId)
            .eq('is_read', false)
            .eq('deleted_by_recipient', false)
    },
    /** Marks a single message as read. */
    async markAsRead(messageId) {
        if (!messageId) return
        const { error } = await supabase
            .from(MESSAGES_TABLE)
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', messageId)
        return !error
    },
    /** Marks all unread messages from a specific user as read. */
    async markConversationRead(userId, otherUserId) {
        const resolvedId = await resolveUserId(userId)
        if (!resolvedId || !otherUserId) return
        await supabase
            .from(MESSAGES_TABLE)
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('recipient_id', resolvedId)
            .eq('sender_id', otherUserId)
            .eq('is_read', false)
    },
    /** Resolves a session/user ID to the canonical users.id. */
    async resolveId(userId) {
        return resolveUserId(userId)
    },
    /**
     * Sends an encrypted message to a recipient.
     * @param {string} senderId - Session or users table ID of the sender
     * @param {string} recipientId - Users table ID of the recipient
     * @param {string} subject - Message subject line
     * @param {string} body - Plaintext body (encrypted by DB function)
     * @param {object} [attachment] - Optional attachment context
     */
    async sendMessage(senderId, recipientId, subject, body, attachment = null) {
        const resolvedSenderId = await resolveUserId(senderId)
        if (!resolvedSenderId || !recipientId) throw new Error('Sender and recipient are required')
        if (!body?.trim()) throw new Error('Message body is required')
        const { data, error } = await supabase.rpc('send_message', {
            p_attachment_meta: attachment?.meta || null,
            p_attachment_type: attachment?.type || null,
            p_body: body,
            p_recipient_id: recipientId,
            p_sender_id: resolvedSenderId,
            p_subject: subject || ''
        })
        if (error) throw new Error(error.message || 'Failed to send message')
        return data
    }
}
/** Normalizes a raw message row into a consistent shape. */
function formatMessage(row) {
    return {
        attachmentMeta: row.attachment_meta,
        attachmentType: row.attachment_type,
        body: row.body || '',
        createdAt: row.created_at,
        id: row.id,
        isRead: row.is_read,
        readAt: row.read_at,
        recipientId: row.recipient_id,
        senderId: row.sender_id,
        subject: row.subject || ''
    }
}
export default MessageService
