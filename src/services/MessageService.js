import APIUtility from '../utils/APIUtility'
import { Database } from './DatabaseService'
import { UserService } from './UserService'

const MESSAGES_VIEW = 'messages_decrypted'

/**
 * Resolves the canonical users table ID from whatever ID is in session storage.
 * Handles the case where session ID (users_sessions.id) is stored instead of users.id.
 */
async function resolveUserId(sessionId) {
    if (!sessionId) return null
    try {
        const { data } = await Database.from('users_sessions').select('user_id').eq('id', sessionId).maybeSingle()
        return data?.user_id || sessionId
    } catch (err) {
        console.error('Failed to resolve user ID from session:', err)
        return sessionId
    }
}

/**
 * Service for direct user-to-user encrypted messaging.
 * All reads go through the messages_decrypted view (bypasses RLS via view owner).
 * All writes use SECURITY DEFINER RPC functions (same pattern as send_message).
 */
const MessageService = {
    /** Soft-deletes a message for the recipient. */
    async deleteForRecipient(messageId) {
        if (!messageId) return
        const { error } = await Database.rpc('soft_delete_message_for_recipient', { p_message_id: messageId })
        if (error) console.error('Failed to soft-delete message (recipient):', error)
    },

    /** Soft-deletes a message for the sender. */
    async deleteForSender(messageId) {
        if (!messageId) return
        const { error } = await Database.rpc('soft_delete_message_for_sender', { p_message_id: messageId })
        if (error) console.error('Failed to soft-delete message (sender):', error)
    },

    /**
     * Fetches all messages the user is involved in (sent or received, not deleted).
     * Used to build conversation threads.
     */
    async getAllMessages(userId) {
        const resolvedId = await resolveUserId(userId)
        if (!resolvedId) return []
        const [receivedResult, sentResult] = await Promise.all([
            Database.from(MESSAGES_VIEW)
                .select('*')
                .eq('recipient_id', resolvedId)
                .eq('deleted_by_recipient', false)
                .order('created_at', { ascending: false })
                .limit(200),
            Database.from(MESSAGES_VIEW)
                .select('*')
                .eq('sender_id', resolvedId)
                .eq('deleted_by_sender', false)
                .order('created_at', { ascending: false })
                .limit(200)
        ])
        if (receivedResult.error) throw receivedResult.error
        if (sentResult.error) throw sentResult.error
        const { data: received } = receivedResult
        const { data: sent } = sentResult
        const map = new Map()
        ;[...(received || []), ...(sent || [])].forEach((row) => {
            if (!map.has(row.id)) map.set(row.id, formatMessage(row))
        })
        return [...map.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    },

    /**
     * Fetches the current user's pin/mute flags for every conversation
     * partner. Returns an array of `{ otherUserId, pinned, muted }` so the
     * caller can build whichever lookup shape it prefers.
     */
    async getConversationFlags(userId) {
        const resolvedId = await resolveUserId(userId)
        if (!resolvedId) return []
        const { data, error } = await Database.from('users_pinned_conversations').select('*').eq('user_id', resolvedId)
        if (error) {
            console.error('Failed to load conversation flags:', error)
            return []
        }
        return (data || []).map((row) => ({
            muted: !!row.muted,
            otherUserId: row.other_user_id,
            pinned: !!row.pinned
        }))
    },

    /** Fetches a single message by ID from the decrypted view. */
    async getMessageById(messageId) {
        if (!messageId) return null
        const { data, error } = await Database.from(MESSAGES_VIEW).select('*').eq('id', messageId).maybeSingle()
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
                ? (await import('./PlantService')).PlantService.getAllowedPlantCodes(regionCode)
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

    /** Marks all unread inbox messages as read. */
    async markAllRead(userId) {
        const resolvedId = await resolveUserId(userId)
        if (!resolvedId) return
        const { error } = await Database.rpc('mark_all_messages_read', { p_recipient_id: resolvedId })
        if (error) console.error('Failed to mark all messages read:', error)
    },

    /** Marks a single message as read. */
    async markAsRead(messageId) {
        if (!messageId) return
        const { error } = await Database.rpc('mark_message_read', { p_message_id: messageId })
        if (error) console.error('Failed to mark message read:', error)
        return !error
    },

    /** Marks all unread messages from a specific user as read. */
    async markConversationRead(userId, otherUserId) {
        const resolvedId = await resolveUserId(userId)
        if (!resolvedId || !otherUserId) return
        const { error } = await Database.rpc('mark_conversation_read', {
            p_recipient_id: resolvedId,
            p_sender_id: otherUserId
        })
        if (error) console.error('Failed to mark conversation read:', error)
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
        const { data, error } = await Database.rpc('send_message', {
            p_attachment_meta: attachment?.meta || null,
            p_attachment_type: attachment?.type || null,
            p_body: body,
            p_recipient_id: recipientId,
            p_sender_id: resolvedSenderId,
            p_subject: subject || ''
        })
        if (error) throw new Error(error.message || 'Failed to send message')
        return data
    },

    /**
     * Upserts pin/mute flags for a single conversation partner. Pass only
     * the fields that should change; omitted flags are preserved server-side.
     */
    async setConversationFlag(userId, otherUserId, { muted, pinned }) {
        if (!otherUserId) return null
        const { json, res } = await APIUtility.post('/user-preferences-service/set-conversation-flag', {
            muted,
            otherUserId,
            pinned
        })
        if (!res.ok) return null
        return json?.data ?? null
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
