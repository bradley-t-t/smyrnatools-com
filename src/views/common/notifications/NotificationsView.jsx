import React, { useEffect, useMemo, useRef, useState } from 'react'

import EmbeddedViewModal from '../../../app/components/dashboard/EmbeddedViewModal'
import ChatHeader from '../../../app/components/notifications/ChatHeader'
import ChatMessages from '../../../app/components/notifications/ChatMessages'
import ComposeModal from '../../../app/components/notifications/ComposeModal'
import ConversationContextRail from '../../../app/components/notifications/ConversationContextRail'
import ConversationSidebar from '../../../app/components/notifications/ConversationSidebar'
import EmptyThreadPane from '../../../app/components/notifications/EmptyThreadPane'
import PageHeader from '../../../app/components/notifications/PageHeader'
import ReplyBar from '../../../app/components/notifications/ReplyBar'
import { resolveAttachmentView } from '../../../app/constants/notificationsConstants'
import { useConfirm } from '../../../app/context/ConfirmContext'
import { useSharedMessages } from '../../../app/context/MessagesContext'
import { useAccentColor } from '../../../app/hooks/useAccentColor'
import { useIsMobile } from '../../../app/hooks/useIsMobile'
import { UserService } from '../../../services/UserService'

/**
 * Messages center — split-pane inbox.
 *
 * Left rail lists every conversation; right pane renders the active thread
 * (or an empty state when none is selected). On mobile only one pane shows
 * at a time. All chrome follows the Plan-tab aesthetic.
 *
 * This file is the orchestrator — every sub-pane (sidebar, chat header,
 * messages, reply bar, compose modal, context rail) lives in its own file
 * under `src/app/components/notifications/`.
 */
function NotificationsView({ initialConversationId = null }) {
    const accentColor = useAccentColor()
    const confirm = useConfirm()
    const isMobile = useIsMobile()
    const [composing, setComposing] = useState(false)
    const [activeConversationId, setActiveConversationId] = useState(initialConversationId)
    const [embeddedView, setEmbeddedView] = useState(null)
    const [embeddedViewSearch, setEmbeddedViewSearch] = useState('')
    const [search, setSearch] = useState('')
    const [activeFilter, setActiveFilter] = useState('all')

    const {
        conversations,
        deleteMessage,
        loading: msgLoading,
        markAllRead: markAllMsgRead,
        markConversationRead,
        mutedSet,
        pinnedSet,
        resolvedUserId,
        sendMessage,
        toggleMute,
        togglePin,
        unreadCount
    } = useSharedMessages()

    // Sync prop changes (e.g. clicking a conversation from the nav popup while already on this view)
    const handledConvoRef = useRef(initialConversationId)
    useEffect(() => {
        if (initialConversationId && initialConversationId !== handledConvoRef.current) {
            handledConvoRef.current = initialConversationId
            setActiveConversationId(initialConversationId)
            markConversationRead(initialConversationId)
        }
    }, [initialConversationId, markConversationRead])

    const activeConversation = useMemo(
        () => (activeConversationId ? conversations.find((c) => c.otherId === activeConversationId) || null : null),
        [activeConversationId, conversations]
    )

    const [userNames, setUserNames] = useState({})

    useEffect(() => {
        const ids = new Set(conversations.map((c) => c.otherId))
        const missing = [...ids].filter((id) => id && !userNames[id])
        if (!missing.length) return
        let cancelled = false
        const resolve = async () => {
            const names = {}
            await Promise.all(
                missing.map(async (id) => {
                    try {
                        names[id] = await UserService.getUserDisplayName(id)
                    } catch {
                        names[id] = 'Unknown'
                    }
                })
            )
            if (!cancelled) setUserNames((prev) => ({ ...prev, ...names }))
        }
        resolve()
        return () => {
            cancelled = true
        }
    }, [conversations, userNames])

    const filteredConversations = useMemo(() => {
        const term = search.trim().toLowerCase()
        const matchesSearch = (c) => {
            if (!term) return true
            const name = (userNames[c.otherId] || '').toLowerCase()
            const subject = (c.lastMessage?.subject || '').toLowerCase()
            const body = (c.lastMessage?.body || '').toLowerCase()
            return name.includes(term) || subject.includes(term) || body.includes(term)
        }
        const matchesFilter = (c) => {
            if (activeFilter === 'unread') return c.unread > 0
            if (activeFilter === 'pinned') return pinnedSet.has(c.otherId)
            return true
        }
        return conversations.filter((c) => matchesSearch(c) && matchesFilter(c))
    }, [conversations, search, userNames, activeFilter, pinnedSet])

    const openConversation = (conv) => {
        setActiveConversationId(conv.otherId)
        if (conv.unread > 0) markConversationRead(conv.otherId)
    }

    const openAttachment = (type, meta) => {
        const resolved = resolveAttachmentView(type, meta)
        if (!resolved) return
        setEmbeddedView(resolved.viewKey)
        setEmbeddedViewSearch(resolved.search)
    }

    /** Soft-deletes every message in the active thread for this user. */
    const deleteConversation = async (otherId) => {
        const convo = conversations.find((c) => c.otherId === otherId)
        if (!convo) return
        const ok = await confirm({
            confirmLabel: 'Delete',
            message: 'Messages will disappear from your inbox.',
            title: 'Delete this conversation?'
        })
        if (!ok) return
        await Promise.all((convo.messages || []).map((m) => deleteMessage(m.id)))
        if (activeConversationId === otherId) setActiveConversationId(null)
    }

    /** Sidebar / context-pane visibility. The right rail is hidden on smaller
     *  viewports so the thread + sidebar can claim the full width. */
    const showSidebar = !isMobile || !activeConversation
    const showThreadPane = !isMobile || !!activeConversation
    const showContextRail = !isMobile && !!activeConversation

    const activeIsPinned = activeConversation ? pinnedSet.has(activeConversation.otherId) : false
    const activeIsMuted = activeConversation ? mutedSet.has(activeConversation.otherId) : false

    return (
        <div className="absolute inset-0 flex flex-col bg-bg-secondary">
            <PageHeader
                accentColor={accentColor}
                conversationCount={conversations.length}
                unreadCount={unreadCount}
                onMarkAllRead={markAllMsgRead}
                onCompose={() => setComposing(true)}
            />

            <div className="flex-1 flex min-h-0">
                {showSidebar && (
                    <ConversationSidebar
                        accentColor={accentColor}
                        activeConversationId={activeConversationId}
                        activeFilter={activeFilter}
                        conversations={filteredConversations}
                        loading={msgLoading}
                        mutedSet={mutedSet}
                        onFilterChange={setActiveFilter}
                        onSearchChange={setSearch}
                        onSelect={openConversation}
                        pinnedSet={pinnedSet}
                        search={search}
                        unreadCount={unreadCount}
                        userNames={userNames}
                    />
                )}

                {showThreadPane && (
                    <div className="flex-1 flex flex-col min-w-0 bg-bg-secondary">
                        {activeConversation ? (
                            <>
                                <ChatHeader
                                    accentColor={accentColor}
                                    conversation={activeConversation}
                                    isMobile={isMobile}
                                    isMuted={activeIsMuted}
                                    isPinned={activeIsPinned}
                                    onBack={() => setActiveConversationId(null)}
                                    onDelete={() => deleteConversation(activeConversation.otherId)}
                                    onToggleMute={() => toggleMute(activeConversation.otherId)}
                                    onTogglePin={() => togglePin(activeConversation.otherId)}
                                    userNames={userNames}
                                />
                                <ChatMessages
                                    accentColor={accentColor}
                                    conversation={activeConversation}
                                    onAttachmentClick={openAttachment}
                                    resolvedUserId={resolvedUserId}
                                    userNames={userNames}
                                />
                                <ReplyBar
                                    accentColor={accentColor}
                                    otherName={userNames[activeConversation.otherId] || 'Unknown'}
                                    onSend={async (body) => {
                                        await sendMessage(activeConversation.otherId, '', body)
                                    }}
                                />
                            </>
                        ) : (
                            <EmptyThreadPane onCompose={() => setComposing(true)} accentColor={accentColor} />
                        )}
                    </div>
                )}

                {showContextRail && activeConversation && (
                    <ConversationContextRail
                        accentColor={accentColor}
                        conversation={activeConversation}
                        displayName={userNames[activeConversation.otherId] || 'Loading…'}
                        isMuted={activeIsMuted}
                        isPinned={activeIsPinned}
                        onAttachmentClick={openAttachment}
                        onDelete={() => deleteConversation(activeConversation.otherId)}
                        onToggleMute={() => toggleMute(activeConversation.otherId)}
                        onTogglePin={() => togglePin(activeConversation.otherId)}
                        resolvedUserId={resolvedUserId}
                    />
                )}
            </div>

            {composing && (
                <ComposeModal accentColor={accentColor} onSend={sendMessage} onClose={() => setComposing(false)} />
            )}

            {embeddedView && (
                <EmbeddedViewModal
                    embeddedView={embeddedView}
                    embeddedViewSearch={embeddedViewSearch}
                    accentColor={accentColor}
                    onClose={() => {
                        setEmbeddedView(null)
                        setEmbeddedViewSearch('')
                    }}
                />
            )}
        </div>
    )
}

export default NotificationsView
