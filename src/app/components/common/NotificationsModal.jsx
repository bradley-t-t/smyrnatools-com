/* eslint-disable react/forbid-dom-props */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import { UserService } from '../../../services/UserService'
import DateUtility from '../../../utils/DateUtility'
import { useAccentColor } from '../../hooks/useAccentColor'
import Badge from './Badge'
import UserAvatar from './UserAvatar'

const SECTION_LABEL =
    'flex items-center gap-2 px-3 pt-2.5 pb-1 text-[9.5px] font-semibold uppercase tracking-wider text-text-tertiary'

/** Single conversation row in the messages popup. Avatar uses the other
 *  participant's accent colour; the unread tint/badge use the viewer's
 *  accent because it signals the viewer's unread state. */
function ConversationRow({ accentColor, conversation, displayName, onSelectConversation, onViewAll }) {
    const latest = conversation.lastMessage
    const hasUnread = conversation.unread > 0

    return (
        <button type="button"
            className="flex w-full items-center gap-2.5 border-b border-border-light px-3 py-2 text-left cursor-pointer transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover focus-visible:outline-none focus-visible:bg-bg-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            style={{ background: hasUnread ? `${accentColor}0D` : 'transparent' }}
            onClick={() => (onSelectConversation ? onSelectConversation(conversation.otherId) : onViewAll())}
        >
            <UserAvatar name={displayName} userId={conversation.otherId} size="md" rounded="md">
                {hasUnread && (
                    <Badge
                        variant="custom"
                        size="xs"
                        shape="rounded"
                        weight="bold"
                        uppercase={false}
                        bg={accentColor}
                        fg="#fff"
                        className="absolute -right-1 -top-1 min-w-[14px] justify-center border border-bg-primary font-mono tabular-nums"
                    >
                        {conversation.unread}
                    </Badge>
                )}
            </UserAvatar>
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                    <span
                        className={`truncate text-[12px] text-text-primary ${hasUnread ? 'font-semibold' : 'font-medium'}`}
                    >
                        {displayName}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-text-tertiary">
                        {DateUtility.formatTimeAgo(latest?.createdAt)}
                    </span>
                </div>
                {latest?.subject && (
                    <p
                        className={`m-0 truncate text-[10.5px] ${hasUnread ? 'text-text-primary' : 'text-text-secondary'}`}
                    >
                        {latest.subject}
                    </p>
                )}
                <p className="m-0 truncate text-[10.5px] text-text-secondary">{latest?.body}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1 font-mono text-[10px] tabular-nums text-text-tertiary">
                <span>{conversation.messages.length}</span>
                <i className="fas fa-chevron-right text-[8px]" aria-hidden="true" />
            </div>
        </button>
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
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscape)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
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
                role="dialog"
                aria-modal="false"
                aria-label="Messages"
                style={modalStyle}
                className="flex max-h-[76vh] w-96 flex-col overflow-hidden rounded border border-border-light bg-bg-primary shadow-modal animate-fade-slide-in motion-reduce:animate-none"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-border-light px-3 py-2">
                    <div className="flex items-center gap-2">
                        <div
                            className="flex h-6 w-6 items-center justify-center rounded bg-bg-tertiary"
                            style={{ color: accentColor }}
                        >
                            <i className="fas fa-envelope text-[11px]" aria-hidden="true" />
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                            Messages
                        </span>
                        {unreadCount > 0 && (
                            <Badge
                                variant="custom"
                                size="xs"
                                shape="rounded"
                                weight="bold"
                                bg={accentColor}
                                fg="#fff"
                                className="font-mono tabular-nums"
                            >
                                {unreadCount}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {unreadCount > 0 && (
                            <button type="button"
                                onClick={markAllRead}
                                className="rounded border border-border-light bg-bg-secondary px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-text-secondary cursor-pointer transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                            >
                                Mark all read
                            </button>
                        )}
                        <button type="button"
                            onClick={onClose}
                            className="flex h-6 w-6 items-center justify-center rounded text-text-secondary cursor-pointer transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                            aria-label="Close messages"
                        >
                            <i className="fas fa-times text-[11px]" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-bg-primary">
                    {loading ? (
                        <div>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="flex animate-pulse items-center gap-2.5 border-b border-border-light px-3 py-2 motion-reduce:animate-none"
                                    style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
                                >
                                    <div className="h-7 w-7 shrink-0 rounded bg-bg-tertiary" />
                                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <div
                                                className="h-3 rounded bg-bg-tertiary"
                                                style={{ width: `${60 + i * 10}%` }}
                                            />
                                            <div className="h-2.5 w-10 shrink-0 rounded bg-bg-tertiary" />
                                        </div>
                                        <div
                                            className="h-2.5 rounded bg-bg-secondary"
                                            style={{ width: `${80 - i * 8}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : displayedConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-text-tertiary">
                            <i className="fas fa-envelope-open mb-2 text-2xl" aria-hidden="true" />
                            <span className="text-[12px] font-semibold text-text-primary">No messages</span>
                            <span className="mt-0.5 text-[10.5px]">Your inbox is empty</span>
                        </div>
                    ) : (
                        <div>
                            {unreadConversations.length > 0 && (
                                <>
                                    <div className={SECTION_LABEL}>
                                        <span>Unread</span>
                                        <Badge
                                            variant="custom"
                                            size="xs"
                                            shape="rounded"
                                            weight="bold"
                                            uppercase={false}
                                            bg={accentColor}
                                            fg="#fff"
                                            className="font-mono tabular-nums"
                                        >
                                            {unreadCount}
                                        </Badge>
                                    </div>
                                    <div>
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

                            {readConversations.length > 0 && (
                                <>
                                    {unreadConversations.length > 0 && (
                                        <div className={SECTION_LABEL}>
                                            <span>Recent</span>
                                        </div>
                                    )}
                                    <div>
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
                <div className="shrink-0 border-t border-border-light">
                    <button type="button"
                        onClick={onViewAll}
                        className="flex w-full items-center justify-center gap-1.5 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wider cursor-pointer transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                        style={{ color: accentColor }}
                    >
                        View All Messages
                        <i className="fas fa-arrow-right text-[10px]" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default NotificationsModal
