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
    const [loading, setLoading] = useState(true)
    const [resolvedUserId, setResolvedUserId] = useState(null)
    /** Map of otherUserId → { pinned, muted }. Drives the sidebar's Pinned
     *  section + thread-level mute / pin toggles. Loaded once per session
     *  and updated optimistically on every toggle. */
    const [conversationFlags, setConversationFlags] = useState({})
    const hasLoadedRef = useRef(false)
    const refreshSeqRef = useRef(0)

    // Resolve the canonical user ID once
    useEffect(() => {
        if (!userId) return
        MessageService.resolveId(userId).then((id) => setResolvedUserId(id))
    }, [userId])

    // Load pin/mute flags whenever the resolved user ID lands.
    useEffect(() => {
        if (!resolvedUserId) return
        let cancelled = false
        MessageService.getConversationFlags(resolvedUserId).then((rows) => {
            if (cancelled) return
            const map = {}
            rows.forEach((row) => {
                map[row.otherUserId] = { muted: row.muted, pinned: row.pinned }
            })
            setConversationFlags(map)
        })
        return () => {
            cancelled = true
        }
    }, [resolvedUserId])

    /** Full refresh — used on initial load and as a fallback. */
    const refresh = useCallback(async () => {
        if (!userId) {
            setAllMessages([])
            setLoading(false)
            return
        }
        if (!hasLoadedRef.current) setLoading(true)
        const seq = ++refreshSeqRef.current
        try {
            const messages = await MessageService.getAllMessages(userId)
            if (refreshSeqRef.current !== seq) return
            setAllMessages(messages)
            setLoading(false)
            hasLoadedRef.current = true
        } catch {
            if (refreshSeqRef.current === seq) {
                setAllMessages([])
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
        }

        const handleUpdate = (payload) => {
            const row = payload.new
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
            // Handle soft-delete flags — remove from local state
            if (
                (row.deleted_by_recipient && row.recipient_id === resolvedUserId) ||
                (row.deleted_by_sender && row.sender_id === resolvedUserId)
            ) {
                setAllMessages((prev) => prev.filter((m) => m.id !== row.id))
            }
        }

        const handleDelete = (payload) => {
            const row = payload.old
            if (!row?.id) return
            setAllMessages((prev) => prev.filter((m) => m.id !== row.id))
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

    /** Unread count derived from loaded messages — avoids RLS-blocked raw table queries. */
    const unreadCount = useMemo(
        () => (resolvedUserId ? allMessages.filter((m) => m.recipientId === resolvedUserId && !m.isRead).length : 0),
        [allMessages, resolvedUserId]
    )

    /** Conversations grouped by the other user, sorted by most recent message. */
    const conversations = useMemo(() => {
        if (!resolvedUserId || !allMessages.length) return []
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
        setAllMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, isRead: true } : m)))
        await MessageService.markAsRead(messageId)
    }, [])

    const markConversationRead = useCallback(
        async (otherUserId) => {
            if (!userId || !otherUserId) return
            setAllMessages((prev) =>
                prev.map((m) =>
                    m.senderId === otherUserId && m.recipientId === resolvedUserId && !m.isRead
                        ? { ...m, isRead: true }
                        : m
                )
            )
            await MessageService.markConversationRead(userId, otherUserId)
        },
        [userId, resolvedUserId]
    )

    const markAllRead = useCallback(async () => {
        if (!userId) return
        setAllMessages((prev) => prev.map((m) => ({ ...m, isRead: true })))
        await MessageService.markAllRead(userId)
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

    /**
     * Optimistically flip a single flag (`pinned` or `muted`) on a
     * conversation, then persist. On persistence failure the optimistic
     * value remains — the row is re-fetched on next mount via the load
     * effect above so the UI eventually reconciles.
     */
    const setConversationFlag = useCallback(
        async (otherUserId, patch) => {
            if (!resolvedUserId || !otherUserId) return
            setConversationFlags((prev) => {
                const current = prev[otherUserId] || { muted: false, pinned: false }
                return { ...prev, [otherUserId]: { ...current, ...patch } }
            })
            await MessageService.setConversationFlag(resolvedUserId, otherUserId, patch)
        },
        [resolvedUserId]
    )

    const togglePin = useCallback(
        (otherUserId) => {
            const current = conversationFlags[otherUserId]
            return setConversationFlag(otherUserId, { pinned: !current?.pinned })
        },
        [conversationFlags, setConversationFlag]
    )

    const toggleMute = useCallback(
        (otherUserId) => {
            const current = conversationFlags[otherUserId]
            return setConversationFlag(otherUserId, { muted: !current?.muted })
        },
        [conversationFlags, setConversationFlag]
    )

    /** Quick-access lookup sets — derived once per flag-state change. */
    const pinnedSet = useMemo(
        () =>
            new Set(
                Object.entries(conversationFlags)
                    .filter(([, v]) => v.pinned)
                    .map(([k]) => k)
            ),
        [conversationFlags]
    )
    const mutedSet = useMemo(
        () =>
            new Set(
                Object.entries(conversationFlags)
                    .filter(([, v]) => v.muted)
                    .map(([k]) => k)
            ),
        [conversationFlags]
    )

    return {
        conversations,
        deleteMessage,
        inbox,
        loading,
        markAllRead,
        markAsRead,
        markConversationRead,
        mutedSet,
        pinnedSet,
        refresh,
        resolvedUserId,
        sendMessage,
        toggleMute,
        togglePin,
        unreadCount
    }
}
