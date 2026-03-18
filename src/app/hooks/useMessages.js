import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Database } from '../../services/DatabaseService'
import MessageService from '../../services/MessageService'

/**
 * Manages message state with conversation-threaded inbox.
 * Groups all messages by the other participant into conversation threads.
 *
 * Uses two filtered database realtime channels (sender + recipient) so only
 * this user's messages trigger updates. Handles INSERT/UPDATE/DELETE granularly
 * instead of re-fetching everything on each change.
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

    /** Full refresh — used on initial load and as a fallback. */
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
            // DEBUG: remove after verifying read status
            const unreadMsgs = messages.filter((m) => !m.isRead)
            console.warn('[useMessages] loaded', messages.length, 'messages,', unreadMsgs.length, 'unread (isRead=false), getUnreadCount=', count, 'resolvedUserId will be:', userId)
            if (messages.length > 0) {
                console.warn('[useMessages] sample message:', { id: messages[0].id, isRead: messages[0].isRead, recipientId: messages[0].recipientId, senderId: messages[0].senderId })
            }
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

    // Initial data load
    useEffect(() => {
        refresh()
    }, [refresh])

    /**
     * Filtered database realtime subscriptions.
     * Two channels: one for messages where user is recipient, one where user is sender.
     * This avoids firing on messages between other users entirely.
     */
    useEffect(() => {
        if (!resolvedUserId) return

        const handleInsert = async (payload) => {
            const row = payload.new
            if (!row?.id) return
            // Fetch the decrypted message since the realtime payload has encrypted body
            const message = await MessageService.getMessageById(row.id)
            if (!message) return
            setAllMessages((prev) => {
                if (prev.some((m) => m.id === message.id)) return prev
                return [message, ...prev]
            })
            if (row.recipient_id === resolvedUserId && !row.is_read) {
                setUnreadCount((prev) => prev + 1)
            }
        }

        const handleUpdate = (payload) => {
            const row = payload.new
            const old = payload.old
            if (!row?.id) return
            setAllMessages((prev) =>
                prev.map((m) => {
                    if (m.id !== row.id) return m
                    return {
                        ...m,
                        isRead: row.is_read ?? m.isRead,
                        readAt: row.read_at ?? m.readAt
                    }
                })
            )
            // Adjust unread count for read-state transitions
            if (row.recipient_id === resolvedUserId) {
                if (old && !old.is_read && row.is_read) {
                    setUnreadCount((prev) => Math.max(0, prev - 1))
                } else if (old && old.is_read && !row.is_read) {
                    setUnreadCount((prev) => prev + 1)
                }
            }
            // Handle soft-delete flags — remove from local state
            if (
                (row.deleted_by_recipient && row.recipient_id === resolvedUserId) ||
                (row.deleted_by_sender && row.sender_id === resolvedUserId)
            ) {
                setAllMessages((prev) => prev.filter((m) => m.id !== row.id))
                if (row.recipient_id === resolvedUserId && !row.is_read) {
                    setUnreadCount((prev) => Math.max(0, prev - 1))
                }
            }
        }

        const handleDelete = (payload) => {
            const row = payload.old
            if (!row?.id) return
            setAllMessages((prev) => prev.filter((m) => m.id !== row.id))
            if (row.recipient_id === resolvedUserId && !row.is_read) {
                setUnreadCount((prev) => Math.max(0, prev - 1))
            }
        }

        const recipientChannel = Database.channel(`messages-recipient-${resolvedUserId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    filter: `recipient_id=eq.${resolvedUserId}`,
                    schema: 'public',
                    table: 'messages'
                },
                (payload) => {
                    switch (payload.eventType) {
                        case 'INSERT':
                            handleInsert(payload)
                            break
                        case 'UPDATE':
                            handleUpdate(payload)
                            break
                        case 'DELETE':
                            handleDelete(payload)
                            break
                        default:
                            break
                    }
                }
            )
            .subscribe()

        const senderChannel = Database.channel(`messages-sender-${resolvedUserId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    filter: `sender_id=eq.${resolvedUserId}`,
                    schema: 'public',
                    table: 'messages'
                },
                (payload) => {
                    switch (payload.eventType) {
                        case 'INSERT':
                            handleInsert(payload)
                            break
                        case 'UPDATE':
                            handleUpdate(payload)
                            break
                        case 'DELETE':
                            handleDelete(payload)
                            break
                        default:
                            break
                    }
                }
            )
            .subscribe()

        return () => {
            Database.removeChannel(recipientChannel)
            Database.removeChannel(senderChannel)
        }
    }, [resolvedUserId])

    // Listen for manual refresh events (e.g. after sending a message)
    useEffect(() => {
        const handleRefresh = () => refresh()
        window.addEventListener('messages-refresh', handleRefresh)
        return () => window.removeEventListener('messages-refresh', handleRefresh)
    }, [refresh])

    /** Conversations grouped by the other user, sorted by most recent message. */
    const conversations = useMemo(() => {
        if (!resolvedUserId || !allMessages.length) return []
        // DEBUG: remove after verifying
        const inboxUnread = allMessages.filter((m) => m.recipientId === resolvedUserId && !m.isRead)
        console.warn('[useMessages:conversations] resolvedUserId=', resolvedUserId, 'inbox unread=', inboxUnread.length, 'total=', allMessages.length)
        if (allMessages.length > 0 && inboxUnread.length === 0) {
            const sample = allMessages.find((m) => m.recipientId === resolvedUserId)
            if (sample) console.warn('[useMessages:conversations] sample inbox msg:', { id: sample.id, isRead: sample.isRead, recipientId: sample.recipientId })
            else console.warn('[useMessages:conversations] NO messages where recipientId matches resolvedUserId. Sample recipientIds:', allMessages.slice(0, 3).map((m) => m.recipientId))
        }
        const threadMap = new Map()
        allMessages.forEach((msg) => {
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
            // Optimistic: add to local state immediately so the UI updates instantly
            const optimisticId = `optimistic-${Date.now()}`
            const optimisticMessage = {
                attachmentMeta: attachment?.meta || null,
                attachmentType: attachment?.type || null,
                body,
                createdAt: new Date().toISOString(),
                id: optimisticId,
                isRead: true,
                readAt: null,
                recipientId,
                senderId: resolvedUserId,
                subject: subject || ''
            }
            setAllMessages((prev) => [optimisticMessage, ...prev])
            const id = await MessageService.sendMessage(userId, recipientId, subject, body, attachment)
            // Replace optimistic entry with real ID so the realtime subscription deduplicates
            setAllMessages((prev) => prev.map((m) => (m.id === optimisticId ? { ...m, id } : m)))
            return id
        },
        [userId, resolvedUserId]
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
