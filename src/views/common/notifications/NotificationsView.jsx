import React, { useEffect, useMemo, useRef, useState } from 'react'

import EmbeddedViewModal from '../../../app/components/dashboard/EmbeddedViewModal'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { useAccentColor } from '../../../app/hooks/useAccentColor'
import { useMessages } from '../../../app/hooks/useMessages'
import { useNotifications } from '../../../app/hooks/useNotifications'
import MessageService from '../../../services/MessageService'
import { UserService } from '../../../services/UserService'

const COMPUTED_TYPE_META = {
    'equipment.verifications': { icon: 'fas fa-snowplow', label: 'Equipment Verifications' },
    'list.overdue': { icon: 'fas fa-list', label: 'Overdue Tasks' },
    'mixers.verifications': { icon: 'fas fa-truck', label: 'Mixer Verifications' },
    reports: { icon: 'fas fa-file-alt', label: 'Overdue Reports' },
    'tractors.verifications': { icon: 'fas fa-tractor', label: 'Tractor Verifications' }
}

function getComputedMeta(type) {
    return (
        COMPUTED_TYPE_META[type] ||
        COMPUTED_TYPE_META[Object.keys(COMPUTED_TYPE_META).find((k) => type?.includes(k))] || {
            icon: 'fas fa-exclamation-circle',
            label: 'System Alert'
        }
    )
}

function getSeverityStyle(severity) {
    switch (severity) {
        case 'error':
        case 'critical':
            return {
                badge: 'bg-red-100 text-red-700',
                bg: 'bg-red-50',
                border: 'border-red-200',
                icon: 'text-red-500',
                text: 'text-red-700'
            }
        case 'warning':
            return {
                badge: 'bg-amber-100 text-amber-700',
                bg: 'bg-amber-50',
                border: 'border-amber-200',
                icon: 'text-amber-500',
                text: 'text-amber-700'
            }
        default:
            return {
                badge: 'bg-sky-100 text-sky-700',
                bg: 'bg-sky-50',
                border: 'border-sky-200',
                icon: 'text-sky-500',
                text: 'text-sky-700'
            }
    }
}

function formatTimeAgo(dateString) {
    if (!dateString) return ''
    const diffMs = Date.now() - new Date(dateString).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return new Date(dateString).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatMessageTime(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function getDateLabel(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    if (date.toDateString() === now.toDateString()) return 'Today'
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

const ATTACHMENT_ICONS = {
    equipment: 'fas fa-snowplow',
    issue: 'fas fa-exclamation-triangle',
    mixer: 'fas fa-truck-moving',
    pickup_truck: 'fas fa-truck-pickup',
    tractor: 'fas fa-truck',
    trailer: 'fas fa-trailer'
}

/** Maps message attachment types to EmbeddedViewModal view keys. */
const ATTACHMENT_VIEW_MAP = {
    equipment: 'equipment',
    mixer: 'mixers',
    pickup_truck: 'tractors',
    tractor: 'tractors',
    trailer: 'trailers'
}

/** Maps issue meta.itemType (capitalized) to embedded view keys. */
const ITEM_TYPE_VIEW_MAP = {
    Equipment: 'equipment',
    Mixer: 'mixers',
    Tractor: 'tractors',
    Trailer: 'trailers'
}

/** Resolves the embedded view key and search term from an attachment. */
function resolveAttachmentView(type, meta) {
    if (type === 'issue') {
        const viewKey = ITEM_TYPE_VIEW_MAP[meta?.itemType]
        return viewKey ? { search: meta?.itemNumber || '', viewKey } : null
    }
    const viewKey = ATTACHMENT_VIEW_MAP[type]
    return viewKey ? { search: meta?.itemNumber || '', viewKey } : null
}

function getInitials(name) {
    if (!name || name === 'Unknown' || name === 'Loading...') return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
}

/**
 * Messages center with conversation-threaded inbox.
 * Two modes: conversation list (scrollable page) and conversation thread (fixed full-height chat).
 */
function NotificationsView({ userId, initialConversationId = null }) {
    const { preferences } = usePreferences()
    const accentColor = useAccentColor()
    const [composing, setComposing] = useState(false)
    const [activeConversationId, setActiveConversationId] = useState(initialConversationId)
    const [alertsExpanded, setAlertsExpanded] = useState(false)
    const [embeddedView, setEmbeddedView] = useState(null)
    const [embeddedViewSearch, setEmbeddedViewSearch] = useState('')

    const {
        notifications,
        markAsRead: markNotifRead,
        deleteNotification
    } = useNotifications(userId, preferences?.selectedRegion)

    const {
        conversations,
        unreadCount,
        loading: msgLoading,
        markAllRead: markAllMsgRead,
        markConversationRead,
        sendMessage,
        resolvedUserId
    } = useMessages(userId)

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

    const computedItems = useMemo(() => notifications.filter((n) => n.source === 'computed'), [notifications])
    const dbItems = useMemo(() => notifications.filter((n) => n.source === 'db'), [notifications])
    const computedGroups = useMemo(() => {
        const grouped = {}
        computedItems.forEach((n) => {
            const key = n.type || 'other'
            if (!grouped[key]) grouped[key] = { items: [], key, ...getComputedMeta(n.type) }
            grouped[key].items.push(n)
        })
        return Object.values(grouped)
    }, [computedItems])
    const totalAlertCount = computedItems.length + dbItems.length

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

    // ── Conversation thread mode: absolute fill, no page scroll ──
    if (activeConversation) {
        return (
            <div className="absolute inset-0 flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                {/* Chat header */}
                <div
                    className="flex items-center gap-3 px-5 py-3 border-b flex-shrink-0"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
                >
                    <button
                        onClick={() => setActiveConversationId(null)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
                        style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                    >
                        <i className="fas fa-arrow-left text-sm"></i>
                    </button>
                    <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)` }}
                    >
                        {getInitials(userNames[activeConversation.otherId] || '')}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-bold m-0 truncate" style={{ color: 'var(--text-primary)' }}>
                            {userNames[activeConversation.otherId] || 'Conversation'}
                        </h2>
                        <p className="text-[11px] m-0" style={{ color: 'var(--text-secondary)' }}>
                            {activeConversation.messages.length} message
                            {activeConversation.messages.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                <ChatMessages
                    conversation={activeConversation}
                    userNames={userNames}
                    accentColor={accentColor}
                    resolvedUserId={resolvedUserId}
                    onAttachmentClick={openAttachment}
                />

                <ReplyBar
                    accentColor={accentColor}
                    otherName={userNames[activeConversation.otherId] || 'Unknown'}
                    onSend={async (body) => {
                        await sendMessage(activeConversation.otherId, '', body)
                    }}
                />

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

    // ── Conversation list mode: normal scrollable page ──
    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {/* Header */}
            <div
                className="sticky top-0 z-30 border-b shadow-sm"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
            >
                <div className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-9 h-9 flex items-center justify-center rounded-xl"
                            style={{ backgroundColor: `${accentColor}18` }}
                        >
                            <i className="fas fa-envelope text-sm" style={{ color: accentColor }}></i>
                        </div>
                        <div>
                            <h1
                                className="text-lg font-bold m-0 leading-tight"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                Messages
                            </h1>
                            {unreadCount > 0 && (
                                <p className="text-xs m-0" style={{ color: 'var(--text-secondary)' }}>
                                    {unreadCount} unread
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllMsgRead}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                            >
                                <i className="fas fa-check-double text-xs"></i>
                                Mark all read
                            </button>
                        )}
                        <button
                            onClick={() => setComposing(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                            style={{ backgroundColor: accentColor }}
                        >
                            <i className="fas fa-pen text-xs"></i>
                            Compose
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6">
                {/* Alerts */}
                {totalAlertCount > 0 && (
                    <AlertsPanel
                        alertsExpanded={alertsExpanded}
                        setAlertsExpanded={setAlertsExpanded}
                        computedGroups={computedGroups}
                        dbItems={dbItems}
                        totalAlertCount={totalAlertCount}
                        markNotifRead={markNotifRead}
                        deleteNotification={deleteNotification}
                        accentColor={accentColor}
                    />
                )}

                {/* Conversations */}
                {msgLoading ? (
                    <div
                        className="flex flex-col items-center justify-center py-20"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <i className="fas fa-spinner fa-spin text-2xl mb-3"></i>
                        <span className="text-sm">Loading...</span>
                    </div>
                ) : (
                    <ConversationList
                        conversations={conversations}
                        userNames={userNames}
                        accentColor={accentColor}
                        onSelect={openConversation}
                    />
                )}
            </div>

            {composing && (
                <ComposeModal accentColor={accentColor} onSend={sendMessage} onClose={() => setComposing(false)} />
            )}
        </div>
    )
}

/** Scrollable chat messages area. */
function ChatMessages({ conversation, userNames, accentColor, resolvedUserId, onAttachmentClick }) {
    const scrollRef = useRef(null)
    const otherInitials = getInitials(userNames[conversation.otherId] || '')

    const chronological = useMemo(
        () => [...conversation.messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
        [conversation.messages]
    )

    const dateGroups = useMemo(() => {
        const groups = []
        let currentKey = ''
        chronological.forEach((msg) => {
            const key = new Date(msg.createdAt).toDateString()
            if (key !== currentKey) {
                currentKey = key
                groups.push({ label: getDateLabel(msg.createdAt), messages: [] })
            }
            groups[groups.length - 1].messages.push(msg)
        })
        return groups
    }, [chronological])

    useEffect(() => {
        const el = scrollRef.current
        if (el) el.scrollTop = el.scrollHeight
    }, [chronological.length])

    return (
        <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto min-h-0 px-4 py-4"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
            {dateGroups.map((group) => (
                <React.Fragment key={group.label}>
                    <div className="flex justify-center my-4 first:mt-0">
                        <span
                            className="px-3 py-1 rounded-full text-[11px] font-semibold"
                            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                        >
                            {group.label}
                        </span>
                    </div>

                    {group.messages.map((msg, idx) => {
                        // Compare both raw and string-coerced IDs to handle type mismatches
                        const isMine =
                            resolvedUserId &&
                            (msg.senderId === resolvedUserId || String(msg.senderId) === String(resolvedUserId))
                        const prev = idx > 0 ? group.messages[idx - 1] : null
                        const next = idx < group.messages.length - 1 ? group.messages[idx + 1] : null
                        const sameSenderAsPrev =
                            prev && (prev.senderId === msg.senderId || String(prev.senderId) === String(msg.senderId))
                        const sameSenderAsNext =
                            next && (next.senderId === msg.senderId || String(next.senderId) === String(msg.senderId))
                        const showAvatar = !isMine && !sameSenderAsNext
                        const showTimestamp = !sameSenderAsNext

                        return (
                            <div
                                key={msg.id}
                                className={`flex ${sameSenderAsPrev ? 'mt-0.5' : 'mt-3'} ${isMine ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}
                            >
                                {/* Avatar spacer / avatar for incoming */}
                                {!isMine && (
                                    <div className="w-7 flex-shrink-0 self-end">
                                        {showAvatar && (
                                            <div
                                                className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                                                style={{
                                                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`
                                                }}
                                            >
                                                {otherInitials}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Bubble — sent messages use accent color on right, received use card bg on left */}
                                <div
                                    className={`max-w-[75%] px-3.5 py-2 ${
                                        isMine
                                            ? `rounded-2xl ${sameSenderAsNext ? 'rounded-br-lg' : 'rounded-br-sm'} ${sameSenderAsPrev ? 'rounded-tr-lg' : ''}`
                                            : `rounded-2xl ${sameSenderAsNext ? 'rounded-bl-lg' : 'rounded-bl-sm'} ${sameSenderAsPrev ? 'rounded-tl-lg' : ''}`
                                    }`}
                                    style={{
                                        backgroundColor: isMine ? accentColor : 'var(--bg-primary)',
                                        boxShadow: isMine ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
                                        color: isMine ? 'white' : 'var(--text-primary)'
                                    }}
                                >
                                    {msg.subject && (
                                        <p
                                            className="text-[11px] font-bold uppercase tracking-wide m-0 mb-1"
                                            style={{ opacity: isMine ? 0.75 : 0.45 }}
                                        >
                                            {msg.subject}
                                        </p>
                                    )}

                                    {msg.attachmentType &&
                                        msg.attachmentMeta &&
                                        (() => {
                                            const isViewable = !!resolveAttachmentView(
                                                msg.attachmentType,
                                                msg.attachmentMeta
                                            )
                                            return (
                                                <div
                                                    className={`rounded-lg p-2.5 mb-1.5 ${isViewable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                                                    style={{
                                                        backgroundColor: isMine
                                                            ? 'rgba(255,255,255,0.12)'
                                                            : 'var(--bg-secondary)',
                                                        border: `1px solid ${isMine ? 'rgba(255,255,255,0.15)' : 'var(--border-light)'}`
                                                    }}
                                                    onClick={() =>
                                                        isViewable &&
                                                        onAttachmentClick?.(msg.attachmentType, msg.attachmentMeta)
                                                    }
                                                >
                                                    <AttachmentPreview
                                                        type={msg.attachmentType}
                                                        meta={msg.attachmentMeta}
                                                        accentColor={accentColor}
                                                        light={isMine}
                                                    />
                                                </div>
                                            )
                                        })()}

                                    <p className="text-[13px] m-0 leading-relaxed whitespace-pre-wrap">{msg.body}</p>

                                    {showTimestamp && (
                                        <div
                                            className={`flex items-center gap-1.5 mt-1 ${isMine ? 'justify-end' : ''}`}
                                        >
                                            <span className="text-[10px]" style={{ opacity: 0.5 }}>
                                                {formatMessageTime(msg.createdAt)}
                                            </span>
                                            {isMine && (
                                                <i
                                                    className={`fas ${msg.isRead ? 'fa-check-double' : 'fa-check'} text-[9px]`}
                                                    style={{ opacity: msg.isRead ? 0.7 : 0.4 }}
                                                ></i>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </React.Fragment>
            ))}
        </div>
    )
}

/** Fixed reply bar at the bottom of the conversation. */
function ReplyBar({ accentColor, otherName, onSend }) {
    const [body, setBody] = useState('')
    const [sending, setSending] = useState(false)
    const textareaRef = useRef(null)

    const handleSend = async () => {
        const text = body.trim()
        if (!text || sending) return
        setSending(true)
        setBody('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
        try {
            await onSend(text)
        } catch {
            /* empty */
        }
        setSending(false)
        textareaRef.current?.focus()
    }

    return (
        <div
            className="flex items-end gap-3 px-4 py-3 border-t flex-shrink-0"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
        >
            <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                    }
                }}
                placeholder={`Message ${otherName}...`}
                rows="1"
                className="flex-1 px-4 py-2.5 rounded-2xl border text-sm outline-none resize-none transition-all"
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-light)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    maxHeight: '100px'
                }}
                onFocus={(e) => {
                    e.currentTarget.style.borderColor = accentColor
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${accentColor}12`
                }}
                onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-light)'
                    e.currentTarget.style.boxShadow = 'none'
                }}
                onInput={(e) => {
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
                }}
            />
            <button
                onClick={handleSend}
                disabled={!body.trim() || sending}
                className="w-10 h-10 flex items-center justify-center rounded-full text-white transition-all flex-shrink-0"
                style={{
                    backgroundColor: !body.trim() || sending ? 'var(--border-medium)' : accentColor,
                    boxShadow: body.trim() && !sending ? `0 2px 8px ${accentColor}40` : 'none',
                    cursor: !body.trim() || sending ? 'not-allowed' : 'pointer'
                }}
            >
                <i className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-sm`}></i>
            </button>
        </div>
    )
}

/** Conversation list. */
function ConversationList({ conversations, userNames, accentColor, onSelect }) {
    if (!conversations.length) {
        return (
            <div className="flex flex-col items-center justify-center py-24" style={{ color: 'var(--text-secondary)' }}>
                <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: 'var(--bg-hover)' }}
                >
                    <i className="fas fa-inbox text-2xl" style={{ color: 'var(--border-medium)' }}></i>
                </div>
                <p className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
                    No messages
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Start a conversation using the Compose button
                </p>
            </div>
        )
    }
    return (
        <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
        >
            {conversations.map((conv) => {
                const name = userNames[conv.otherId] || 'Loading...'
                const initials = getInitials(name)
                const latest = conv.lastMessage
                const hasUnread = conv.unread > 0
                return (
                    <div
                        key={conv.otherId}
                        className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors border-b last:border-b-0"
                        style={{
                            backgroundColor: hasUnread ? `${accentColor}08` : 'transparent',
                            borderColor: 'var(--bg-hover)'
                        }}
                        onClick={() => onSelect(conv)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = hasUnread ? `${accentColor}08` : 'transparent'
                        }}
                    >
                        <div className="relative flex-shrink-0">
                            <div
                                className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white"
                                style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)` }}
                            >
                                {initials}
                            </div>
                            {hasUnread && (
                                <div
                                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2"
                                    style={{ backgroundColor: accentColor, borderColor: 'var(--bg-primary)' }}
                                >
                                    {conv.unread}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span
                                    className={`text-sm truncate ${hasUnread ? 'font-bold' : 'font-medium'}`}
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    {name}
                                </span>
                                {latest.attachmentType && (
                                    <i
                                        className={`${ATTACHMENT_ICONS[latest.attachmentType] || 'fas fa-paperclip'} text-[10px]`}
                                        style={{ color: 'var(--text-secondary)' }}
                                    ></i>
                                )}
                                <span
                                    className="text-xs ml-auto flex-shrink-0"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    {formatTimeAgo(latest.createdAt)}
                                </span>
                            </div>
                            {latest.subject && (
                                <p
                                    className={`text-sm m-0 truncate ${hasUnread ? 'font-semibold' : ''}`}
                                    style={{ color: 'var(--text-primary)', opacity: hasUnread ? 1 : 0.8 }}
                                >
                                    {latest.subject}
                                </p>
                            )}
                            <p className="text-xs m-0 mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                                {latest.body}
                            </p>
                        </div>
                        <div
                            className="flex items-center gap-1.5 flex-shrink-0"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <span className="text-xs">{conv.messages.length}</span>
                            <i className="fas fa-chevron-right text-[10px]"></i>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

/** Attachment preview inside chat bubbles. */
function AttachmentPreview({ type, meta, accentColor, light }) {
    const icon = ATTACHMENT_ICONS[type] || 'fas fa-paperclip'
    const label =
        type === 'issue' ? 'Issue' : type?.replace(/_/g, ' ')?.replace(/\b\w/g, (c) => c.toUpperCase()) || 'Attachment'
    const isViewable = !!resolveAttachmentView(type, meta)
    return (
        <div className="flex items-start gap-2.5">
            <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: light ? 'rgba(255,255,255,0.2)' : `${accentColor}15` }}
            >
                <i className={`${icon} text-[10px]`} style={{ color: light ? 'white' : accentColor }}></i>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                            backgroundColor: light ? 'rgba(255,255,255,0.2)' : `${accentColor}15`,
                            color: light ? 'white' : accentColor
                        }}
                    >
                        {label}
                    </span>
                    {meta.itemNumber && <span className="text-xs font-semibold">{meta.itemNumber}</span>}
                    {meta.severity && (
                        <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${
                                meta.severity === 'High'
                                    ? 'bg-red-500'
                                    : meta.severity === 'Low'
                                      ? 'bg-green-500'
                                      : 'bg-blue-500'
                            }`}
                        >
                            {meta.severity}
                        </span>
                    )}
                    {isViewable && (
                        <i className="fas fa-external-link-alt text-[9px] ml-auto" style={{ opacity: 0.5 }}></i>
                    )}
                </div>
                {meta.issueText && (
                    <p className="text-xs m-0 leading-snug" style={{ opacity: 0.8 }}>
                        {meta.issueText}
                    </p>
                )}
            </div>
        </div>
    )
}

/** Compose message modal. */
function ComposeModal({ accentColor, onSend, onClose }) {
    const { preferences } = usePreferences()
    const regionCode = preferences?.selectedRegion?.code || ''
    const [recipients, setRecipients] = useState([])
    const [selectedRecipient, setSelectedRecipient] = useState(null)
    const [subject, setSubject] = useState('')
    const [body, setBody] = useState('')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')
    const [recipientSearch, setRecipientSearch] = useState('')
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [loadingRecipients, setLoadingRecipients] = useState(true)
    const dropdownRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoadingRecipients(true)
            try {
                const list = await MessageService.getRegionalRecipients(regionCode)
                if (!cancelled) setRecipients(list)
            } catch {
                /* empty */
            }
            if (!cancelled) setLoadingRecipients(false)
        }
        load()
        return () => {
            cancelled = true
        }
    }, [regionCode])

    const filteredRecipients = recipientSearch
        ? recipients.filter((r) =>
              `${r.firstName} ${r.lastName} ${r.roleName} ${r.plantCode}`
                  .toLowerCase()
                  .includes(recipientSearch.toLowerCase())
          )
        : recipients

    const handleSend = async () => {
        if (!selectedRecipient || !body.trim() || sending) return
        setSending(true)
        setError('')
        try {
            await onSend(selectedRecipient.id, subject, body)
            setSent(true)
        } catch (e) {
            setError(e?.message || 'Failed to send message')
        }
        setSending(false)
    }

    return (
        <div
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
            style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.7)' }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div
                className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="flex items-center justify-between px-6 py-4 border-b"
                    style={{ borderColor: 'var(--bg-hover)' }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${accentColor}15` }}
                        >
                            <i className="fas fa-pen text-sm" style={{ color: accentColor }}></i>
                        </div>
                        <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                            New Message
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg"
                        style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                    >
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
                    {sent ? (
                        <div className="flex flex-col items-center gap-4 py-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                <i className="fas fa-check text-2xl text-green-500"></i>
                            </div>
                            <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                                Message Sent
                            </div>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {selectedRecipient?.firstName} {selectedRecipient?.lastName} will receive your message
                            </p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                                style={{ backgroundColor: accentColor }}
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label
                                    className="block text-xs font-semibold uppercase tracking-wider mb-2"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    To
                                </label>
                                <div ref={dropdownRef} className="relative">
                                    {selectedRecipient ? (
                                        <div
                                            className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                                            style={{
                                                backgroundColor: 'var(--bg-primary)',
                                                borderColor: 'var(--border-light)'
                                            }}
                                        >
                                            <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                                style={{
                                                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`
                                                }}
                                            >
                                                {getInitials(
                                                    `${selectedRecipient.firstName} ${selectedRecipient.lastName}`
                                                )}
                                            </div>
                                            <span
                                                className="text-sm font-medium flex-1"
                                                style={{ color: 'var(--text-primary)' }}
                                            >
                                                {selectedRecipient.firstName} {selectedRecipient.lastName}
                                            </span>
                                            <button
                                                onClick={() => setSelectedRecipient(null)}
                                                className="text-xs"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                value={recipientSearch}
                                                onChange={(e) => {
                                                    setRecipientSearch(e.target.value)
                                                    setDropdownOpen(true)
                                                }}
                                                onFocus={() => setDropdownOpen(true)}
                                                placeholder="Search by name, role, or plant..."
                                                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                                                style={{
                                                    backgroundColor: 'var(--bg-primary)',
                                                    borderColor: dropdownOpen ? accentColor : 'var(--border-light)',
                                                    boxShadow: dropdownOpen ? `0 0 0 3px ${accentColor}20` : 'none',
                                                    color: 'var(--text-primary)'
                                                }}
                                            />
                                            {dropdownOpen && (
                                                <div
                                                    className="absolute left-0 right-0 z-10 mt-2 max-h-52 overflow-y-auto rounded-xl border shadow-lg py-1"
                                                    style={{
                                                        backgroundColor: 'var(--bg-primary)',
                                                        borderColor: 'var(--border-light)'
                                                    }}
                                                >
                                                    {loadingRecipients ? (
                                                        <div
                                                            className="px-4 py-3 text-sm text-center"
                                                            style={{ color: 'var(--text-secondary)' }}
                                                        >
                                                            <i className="fas fa-spinner fa-spin mr-2"></i>Loading...
                                                        </div>
                                                    ) : filteredRecipients.length === 0 ? (
                                                        <div
                                                            className="px-4 py-3 text-sm text-center"
                                                            style={{ color: 'var(--text-secondary)' }}
                                                        >
                                                            No results found
                                                        </div>
                                                    ) : (
                                                        filteredRecipients.map((r) => (
                                                            <button
                                                                key={r.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedRecipient(r)
                                                                    setDropdownOpen(false)
                                                                    setRecipientSearch('')
                                                                }}
                                                                className="flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors"
                                                                style={{ color: 'var(--text-primary)' }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor =
                                                                        'var(--bg-hover)'
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor =
                                                                        'transparent'
                                                                }}
                                                            >
                                                                <div
                                                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                                                                    style={{
                                                                        background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`
                                                                    }}
                                                                >
                                                                    {getInitials(`${r.firstName} ${r.lastName}`)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm font-medium">
                                                                        {r.firstName} {r.lastName}
                                                                    </div>
                                                                    <div
                                                                        className="text-xs"
                                                                        style={{ color: 'var(--text-secondary)' }}
                                                                    >
                                                                        {r.roleName}
                                                                        {r.plantCode ? ` · ${r.plantCode}` : ''}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label
                                    className="block text-xs font-semibold uppercase tracking-wider mb-2"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Message subject (optional)..."
                                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                                    style={{
                                        backgroundColor: 'var(--bg-primary)',
                                        borderColor: 'var(--border-light)',
                                        color: 'var(--text-primary)'
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = accentColor
                                        e.currentTarget.style.boxShadow = `0 0 0 3px ${accentColor}20`
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--border-light)'
                                        e.currentTarget.style.boxShadow = 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label
                                    className="block text-xs font-semibold uppercase tracking-wider mb-2"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    Message
                                </label>
                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder="Write your message..."
                                    rows="5"
                                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all resize-y"
                                    style={{
                                        backgroundColor: 'var(--bg-primary)',
                                        borderColor: 'var(--border-light)',
                                        color: 'var(--text-primary)',
                                        fontFamily: 'inherit',
                                        lineHeight: 1.6
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = accentColor
                                        e.currentTarget.style.boxShadow = `0 0 0 3px ${accentColor}20`
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--border-light)'
                                        e.currentTarget.style.boxShadow = 'none'
                                    }}
                                />
                            </div>

                            {error && (
                                <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">
                                    <i className="fas fa-exclamation-triangle mr-2"></i>
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleSend}
                                disabled={!selectedRecipient || !body.trim() || sending}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
                                style={{
                                    backgroundColor:
                                        !selectedRecipient || !body.trim() || sending
                                            ? 'var(--border-medium)'
                                            : accentColor,
                                    boxShadow:
                                        !selectedRecipient || !body.trim() || sending
                                            ? 'none'
                                            : `0 4px 14px ${accentColor}40`,
                                    color:
                                        !selectedRecipient || !body.trim() || sending
                                            ? 'var(--text-secondary)'
                                            : 'white',
                                    cursor: !selectedRecipient || !body.trim() || sending ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <i className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-xs`}></i>
                                {sending ? 'Sending...' : 'Send Message'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

/** Collapsible alerts panel. */
function AlertsPanel({
    alertsExpanded,
    setAlertsExpanded,
    computedGroups,
    dbItems,
    totalAlertCount,
    markNotifRead,
    deleteNotification,
    accentColor
}) {
    return (
        <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
        >
            <button
                onClick={() => setAlertsExpanded((v) => !v)}
                className="flex items-center gap-3 w-full px-5 py-3.5 text-left transition-colors select-none"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                }}
            >
                <i className="fas fa-exclamation-triangle text-sm text-amber-500"></i>
                <span className="text-sm font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>
                    System Alerts
                </span>
                <span
                    className="text-xs font-bold text-white px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#f59e0b' }}
                >
                    {totalAlertCount}
                </span>
                <i
                    className={`fas fa-chevron-down text-xs transition-transform duration-200 ${alertsExpanded ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--text-secondary)' }}
                ></i>
            </button>
            <div
                style={{
                    display: 'grid',
                    gridTemplateRows: alertsExpanded ? '1fr' : '0fr',
                    transition: 'grid-template-rows 0.25s ease'
                }}
            >
                <div style={{ overflow: 'hidden' }}>
                    <div className="p-4 flex flex-col gap-3 border-t" style={{ borderColor: 'var(--border-light)' }}>
                        {computedGroups.map((group) => (
                            <ComputedGroup key={group.key} group={group} accentColor={accentColor} />
                        ))}
                        {dbItems.length > 0 && (
                            <div
                                className="rounded-xl border overflow-hidden divide-y"
                                style={{ borderColor: 'var(--border-light)' }}
                            >
                                {dbItems.map((n) => (
                                    <DbNotificationCard
                                        key={n.id}
                                        notification={n}
                                        onMarkRead={markNotifRead}
                                        onDelete={deleteNotification}
                                        accentColor={accentColor}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function ComputedGroup({ group, accentColor }) {
    const shouldCollapse = group.key?.includes('verifications') || group.key?.includes('overdue')
    const [expanded, setExpanded] = useState(!shouldCollapse)
    const contentRef = useRef(null)
    return (
        <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
        >
            <div
                className="flex items-center gap-3 px-4 py-3 border-b cursor-pointer select-none transition-colors"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
                onClick={() => setExpanded((v) => !v)}
            >
                <i className={`${group.icon} text-sm`} style={{ color: accentColor }}></i>
                <span className="font-semibold text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
                    {group.label}
                </span>
                <span
                    className="text-xs font-bold text-white px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                >
                    {group.items.length}
                </span>
                <i
                    className={`fas fa-chevron-down text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--text-secondary)' }}
                ></i>
            </div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateRows: expanded ? '1fr' : '0fr',
                    transition: 'grid-template-rows 0.25s ease'
                }}
            >
                <div style={{ overflow: 'hidden' }} ref={contentRef}>
                    <div className="p-3 flex flex-col gap-2">
                        {group.items.map((n) => {
                            const s = getSeverityStyle(n.severity)
                            return (
                                <div
                                    key={n.id}
                                    className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${s.bg} ${s.border}`}
                                >
                                    <i className={`fas fa-circle text-[6px] mt-2 ${s.icon}`}></i>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium ${s.text} m-0`}>{n.title}</p>
                                        {n.subtitle && (
                                            <p className="text-xs text-slate-500 mt-0.5 m-0">{n.subtitle}</p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

function DbNotificationCard({ notification: n, onMarkRead, onDelete, accentColor }) {
    const s = getSeverityStyle(n.severity)
    return (
        <div
            className="flex items-start gap-4 px-5 py-4 transition-colors"
            style={{ backgroundColor: n.isRead ? 'transparent' : `${accentColor}06` }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = n.isRead ? 'transparent' : `${accentColor}06`
            }}
        >
            <div className="flex-shrink-0 pt-1.5">
                {n.isRead ? (
                    <div
                        className="w-2.5 h-2.5 rounded-full border-2"
                        style={{ borderColor: 'var(--border-light)' }}
                    ></div>
                ) : (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <p
                            className="text-sm font-semibold m-0"
                            style={{ color: 'var(--text-primary)', opacity: n.isRead ? 0.7 : 1 }}
                        >
                            {n.title}
                        </p>
                        {n.body && (
                            <p className="text-sm mt-1 m-0 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                {n.body}
                            </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.badge}`}>
                                {n.type?.replace(/_/g, ' ') || 'System'}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {formatTimeAgo(n.createdAt)}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {!n.isRead && (
                            <button
                                onClick={() => onMarkRead(n.dbId)}
                                title="Mark as read"
                                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                                style={{ color: 'var(--text-secondary)' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent'
                                }}
                            >
                                <i className="fas fa-check text-xs"></i>
                            </button>
                        )}
                        <button
                            onClick={() => onDelete(n.dbId)}
                            title="Dismiss"
                            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#ef4444'
                                e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--text-secondary)'
                                e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                        >
                            <i className="fas fa-times text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default NotificationsView
