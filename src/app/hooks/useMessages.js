import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import MessageService from '../../services/MessageService'
import { useMultiTableSubscription } from './useRealtimeSubscription'
const MESSAGE_TABLES = ['messages']
/**
 * Manages message state with conversation-threaded inbox.
 * Groups all messages by the other participant into conversation threads.
 * Subscribes to realtime changes on the messages table.
 */
export function useMessages(userId) {
    const [allMessages, setAllMessages] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [resolvedUserId, setResolvedUserId] = useState(null)
    const hasLoadedRef = useRef(false)
    const refreshSeqRef = useRef(0)
    // Resolve the canonical user ID once
    useEffect(() => {
        if (!userId) return
        MessageService.resolveId(userId).then((id) => setResolvedUserId(id))
    }, [userId])
    const refresh = useCallback(async () => {
        if (!userId) {
            setAllMessages([])
            setUnreadCount(0)
            setLoading(false)
            return
        }
        if (!hasLoadedRef.current) setLoading(true)
        const seq = ++refreshSeqRef.current
        try {
            const [messages, count] = await Promise.all([
                MessageService.getAllMessages(userId),
                MessageService.getUnreadCount(userId)
            ])
            if (refreshSeqRef.current !== seq) return
            setAllMessages(messages)
            setUnreadCount(count)
            setLoading(false)
            hasLoadedRef.current = true
        } catch {
            if (refreshSeqRef.current === seq) {
                setAllMessages([])
                setUnreadCount(0)
                setLoading(false)
            }
        }
    }, [userId])
    useEffect(() => {
        refresh()
    }, [refresh])
    useMultiTableSubscription(MESSAGE_TABLES, {
        enabled: !!userId,
        onAnyChange: refresh
    })
    useEffect(() => {
        const handleRefresh = () => refresh()
        window.addEventListener('messages-refresh', handleRefresh)
        return () => window.removeEventListener('messages-refresh', handleRefresh)
    }, [refresh])
    /** Conversations grouped by the other user, sorted by most recent message. */
    const conversations = useMemo(() => {
        if (!resolvedUserId || !allMessages.length) return []
        const threadMap = new Map()
        allMessages.forEach((msg) => {
            // The "other" user is whoever isn't us. For self-messages, other = self.
            const otherId = msg.senderId === resolvedUserId ? msg.recipientId : msg.senderId
            if (!threadMap.has(otherId)) {
                threadMap.set(otherId, { messages: [], otherId, unread: 0 })
            }
            const thread = threadMap.get(otherId)
            thread.messages.push(msg)
            if (!msg.isRead && msg.recipientId === resolvedUserId) {
                thread.unread++
            }
        })
        return [...threadMap.values()]
            .map((thread) => {
                // Messages already sorted newest-first from the service
                const latest = thread.messages[0]
                return {
                    lastMessage: latest,
                    messages: thread.messages,
                    otherId: thread.otherId,
                    unread: thread.unread
                }
            })
            .sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt))
    }, [allMessages, resolvedUserId])
    /** Flat inbox (received messages only, for backward compat with nav popup). */
    const inbox = useMemo(
        () => (resolvedUserId ? allMessages.filter((m) => m.recipientId === resolvedUserId) : []),
        [allMessages, resolvedUserId]
    )
    const markAsRead = useCallback(async (messageId) => {
        if (!messageId) return
        await MessageService.markAsRead(messageId)
        setAllMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, isRead: true } : m)))
        setUnreadCount((prev) => Math.max(0, prev - 1))
    }, [])
    const markConversationRead = useCallback(
        async (otherUserId) => {
            if (!userId || !otherUserId) return
            await MessageService.markConversationRead(userId, otherUserId)
            setAllMessages((prev) =>
                prev.map((m) =>
                    m.senderId === otherUserId && m.recipientId === resolvedUserId && !m.isRead
                        ? { ...m, isRead: true }
                        : m
                )
            )
            // Recount unread
            setUnreadCount((prev) => {
                const conversationUnread = allMessages.filter(
                    (m) => m.senderId === otherUserId && m.recipientId === resolvedUserId && !m.isRead
                ).length
                return Math.max(0, prev - conversationUnread)
            })
        },
        [userId, resolvedUserId, allMessages]
    )
    const markAllRead = useCallback(async () => {
        if (!userId) return
        await MessageService.markAllRead(userId)
        setAllMessages((prev) => prev.map((m) => ({ ...m, isRead: true })))
        setUnreadCount(0)
    }, [userId])
    const deleteMessage = useCallback(
        async (messageId) => {
            if (!messageId) return
            const msg = allMessages.find((m) => m.id === messageId)
            if (!msg) return
            // Delete from whichever side we are
            if (msg.senderId === resolvedUserId) {
                await MessageService.deleteForSender(messageId)
            }
            if (msg.recipientId === resolvedUserId) {
                await MessageService.deleteForRecipient(messageId)
            }
            setAllMessages((prev) => prev.filter((m) => m.id !== messageId))
            if (!msg.isRead && msg.recipientId === resolvedUserId) {
                setUnreadCount((prev) => Math.max(0, prev - 1))
            }
        },
        [allMessages, resolvedUserId]
    )
    const sendMessage = useCallback(
        async (recipientId, subject, body, attachment = null) => {
            if (!userId) throw new Error('Must be logged in to send messages')
            const id = await MessageService.sendMessage(userId, recipientId, subject, body, attachment)
            window.dispatchEvent(new Event('messages-refresh'))
            return id
        },
        [userId]
    )
    return {
        conversations,
        deleteMessage,
        inbox,
        loading,
        markAllRead,
        markAsRead,
        markConversationRead,
        refresh,
        resolvedUserId,
        sendMessage,
        unreadCount
    }
}
