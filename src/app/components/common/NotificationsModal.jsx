import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import { UserService } from '../../../services/UserService'
import DateUtility from '../../../utils/DateUtility'
import UserUtility from '../../../utils/UserUtility'
import { useAccentColor } from '../../hooks/useAccentColor'

/** Single conversation row in the messages popup. */
function ConversationRow({ accentColor, conversation, displayName, onSelectConversation, onViewAll }) {
    const initials = UserUtility.getInitials(displayName)
    const latest = conversation.lastMessage
    const hasUnread = conversation.unread > 0

    return (
        <div
            className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-hover"
            style={{ backgroundColor: hasUnread ? `${accentColor}06` : undefined }}
            onClick={() => (onSelectConversation ? onSelectConversation(conversation.otherId) : onViewAll())}
        >
            <div className="relative flex-shrink-0">
                <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)` }}
                >
                    {initials}
                </div>
                {hasUnread && (
                    <div
                        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-bg-primary text-[9px] font-bold text-white"
                        style={{ backgroundColor: accentColor }}
                    >
                        {conversation.unread}
                    </div>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm text-text-primary ${hasUnread ? 'font-bold' : 'font-medium'}`}>
                        {displayName}
                    </span>
                    <span className="flex-shrink-0 text-[11px] text-text-secondary">
                        {DateUtility.formatTimeAgo(latest?.createdAt)}
                    </span>
                </div>
                {latest?.subject && (
                    <p className="m-0 truncate text-xs text-text-primary" style={{ opacity: hasUnread ? 1 : 0.7 }}>
                        {latest.subject}
                    </p>
                )}
                <p className="m-0 mt-0.5 truncate text-xs text-text-secondary">{latest?.body}</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1 text-text-secondary">
                <span className="text-[11px]">{conversation.messages.length}</span>
                <i className="fas fa-chevron-right text-[9px]" />
            </div>
        </div>
    )
}

/**
 * Anchored dropdown showing unread messages and recent conversations.
 * Footer links to the full NotificationsView (messages center).
 */
function NotificationsModal({ isOpen, onClose, onViewAll, onSelectConversation, anchorRect, messagesHook }) {
    const accentColor = useAccentColor()
    const panelRef = useRef(null)
    const { conversations = [], loading, markAllRead, unreadCount } = messagesHook
    const [userNames, setUserNames] = useState({})

    const displayedConversations = useMemo(() => conversations.slice(0, 8), [conversations])

    const unreadConversations = useMemo(() => conversations.filter((c) => c.unread > 0), [conversations])

    const readConversations = useMemo(
        () => conversations.filter((c) => c.unread === 0).slice(0, Math.max(0, 6 - unreadConversations.length)),
        [conversations, unreadConversations.length]
    )

    // Resolve display names for conversation participants
    useEffect(() => {
        const ids = displayedConversations.map((c) => c.otherId).filter((id) => id && !userNames[id])
        if (!ids.length) return
        let cancelled = false
        const resolve = async () => {
            const names = {}
            await Promise.all(
                ids.map(async (id) => {
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
    }, [displayedConversations, userNames])

    useEffect(() => {
        if (!isOpen) return
        const handleClickOutside = (e) => {
            if (!panelRef.current?.contains(e.target)) onClose()
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, onClose])

    if (!isOpen || typeof document === 'undefined' || !document.body) return null

    /* Position is runtime-computed from anchorRect, must stay inline */
    const modalStyle = {
        position: 'fixed',
        zIndex: 1000,
        ...(anchorRect?.useLeft
            ? { bottom: anchorRect.bottom, left: anchorRect.left }
            : {
                  right: anchorRect ? window.innerWidth - anchorRect.right : '16px',
                  top: anchorRect ? anchorRect.bottom + 8 : '80px'
              })
    }

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[999]" onClick={onClose}>
            <div
                ref={panelRef}
                style={modalStyle}
                className="flex max-h-[76vh] w-96 flex-col overflow-hidden rounded-xl border border-border-light bg-bg-primary shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex flex-shrink-0 items-center justify-between border-b border-border-light px-4 py-3">
                    <div className="flex items-center gap-2">
                        <i className="fas fa-envelope text-sm" style={{ color: accentColor }} />
                        <span className="text-sm font-semibold text-text-primary">Messages</span>
                        {unreadCount > 0 && (
                            <span
                                className="min-w-[18px] rounded-full px-1.5 py-0 text-center text-[10px] font-bold text-white"
                                style={{ backgroundColor: accentColor }}
                            >
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="rounded-lg px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover"
                            >
                                Mark all read
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-hover"
                        >
                            <i className="fas fa-times text-sm" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-bg-primary">
                    {loading ? (
                        <div className="divide-y divide-bg-hover">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex animate-pulse items-center gap-3 px-4 py-3">
                                    <div className="h-9 w-9 flex-shrink-0 rounded-full bg-bg-hover" />
                                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <div
                                                className="h-3.5 rounded bg-bg-hover"
                                                style={{ width: `${60 + i * 10}%` }}
                                            />
                                            <div className="h-3 w-10 flex-shrink-0 rounded bg-bg-hover" />
                                        </div>
                                        <div className="h-3 rounded bg-bg-hover" style={{ width: `${80 - i * 8}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : displayedConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 text-text-secondary">
                            <i className="fas fa-envelope-open mb-3 text-3xl text-border-medium" />
                            <span className="text-sm font-medium text-text-primary">No messages</span>
                            <span className="mt-1 text-xs">Your inbox is empty</span>
                        </div>
                    ) : (
                        <div>
                            {/* Unread messages section */}
                            {unreadConversations.length > 0 && (
                                <>
                                    <div className="flex items-center gap-2 px-4 pb-1 pt-2.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                            Unread
                                        </span>
                                        <span
                                            className="min-w-[16px] rounded-full px-1 text-center text-[9px] font-bold text-white"
                                            style={{ backgroundColor: accentColor }}
                                        >
                                            {unreadCount}
                                        </span>
                                    </div>
                                    <div className="divide-y divide-bg-hover">
                                        {unreadConversations.map((conv) => (
                                            <ConversationRow
                                                key={conv.otherId}
                                                accentColor={accentColor}
                                                conversation={conv}
                                                displayName={userNames[conv.otherId] || 'Loading...'}
                                                onSelectConversation={onSelectConversation}
                                                onViewAll={onViewAll}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Recent read conversations */}
                            {readConversations.length > 0 && (
                                <>
                                    {unreadConversations.length > 0 && (
                                        <div className="flex items-center gap-2 px-4 pb-1 pt-2.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                                Recent
                                            </span>
                                        </div>
                                    )}
                                    <div className="divide-y divide-bg-hover">
                                        {readConversations.map((conv) => (
                                            <ConversationRow
                                                key={conv.otherId}
                                                accentColor={accentColor}
                                                conversation={conv}
                                                displayName={userNames[conv.otherId] || 'Loading...'}
                                                onSelectConversation={onSelectConversation}
                                                onViewAll={onViewAll}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 border-t border-border-light">
                    <button
                        onClick={onViewAll}
                        className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors hover:bg-bg-hover"
                        style={{ color: accentColor }}
                    >
                        View All Messages
                        <i className="fas fa-arrow-right text-xs" />
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default NotificationsModal
