import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import { UserService } from '../../../services/UserService'
import DateUtility from '../../../utils/DateUtility'
import UserUtility from '../../../utils/UserUtility'
import { useAccentColor } from '../../hooks/useAccentColor'

/**
 * Anchored dropdown showing recent conversations grouped by user.
 * Footer links to the full NotificationsView (messages center).
 */
function NotificationsModal({
    isOpen,
    onClose,
    onViewAll,
    onSelectConversation,
    anchorRect,
    messagesHook,
    notificationsHook
}) {
    const accentColor = useAccentColor()
    const panelRef = useRef(null)
    const [activeTab, setActiveTab] = useState('notifications')
    const { conversations = [], loading: messagesLoading, markAllRead, unreadCount } = messagesHook
    const {
        notifications = [],
        count: notifCount = 0,
        loading: notifsLoading,
        markAsRead: markNotifRead,
        markAllRead: markAllNotifsRead,
        deleteNotification
    } = notificationsHook || {}
    const recentConversations = useMemo(() => conversations.slice(0, 6), [conversations])
    const recentNotifications = useMemo(() => (notifications || []).slice(0, 8), [notifications])
    const loading = activeTab === 'notifications' ? notifsLoading : messagesLoading
    const [userNames, setUserNames] = useState({})

    // Resolve display names for conversation participants
    useEffect(() => {
        const ids = recentConversations.map((c) => c.otherId).filter((id) => id && !userNames[id])
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
    }, [recentConversations, userNames])

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
                {/* Header with tabs */}
                <div className="flex-shrink-0 border-b border-border-light">
                    <div className="flex items-center justify-between px-4 pt-3 pb-0">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setActiveTab('notifications')}
                                className="flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors"
                                style={{
                                    backgroundColor: activeTab === 'notifications' ? `${accentColor}15` : 'transparent',
                                    borderBottom:
                                        activeTab === 'notifications'
                                            ? `2px solid ${accentColor}`
                                            : '2px solid transparent',
                                    color: activeTab === 'notifications' ? accentColor : undefined
                                }}
                            >
                                <i className="fas fa-bell" style={{ fontSize: 11 }} />
                                Alerts
                                {notifCount > 0 && (
                                    <span
                                        className="min-w-[18px] rounded-full px-1.5 py-0 text-center text-[10px] font-bold text-white"
                                        style={{ backgroundColor: '#ef4444' }}
                                    >
                                        {notifCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('messages')}
                                className="flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors"
                                style={{
                                    backgroundColor: activeTab === 'messages' ? `${accentColor}15` : 'transparent',
                                    borderBottom:
                                        activeTab === 'messages' ? `2px solid ${accentColor}` : '2px solid transparent',
                                    color: activeTab === 'messages' ? accentColor : undefined
                                }}
                            >
                                <i className="fas fa-envelope" style={{ fontSize: 11 }} />
                                Messages
                                {unreadCount > 0 && (
                                    <span
                                        className="min-w-[18px] rounded-full px-1.5 py-0 text-center text-[10px] font-bold text-white"
                                        style={{ backgroundColor: '#ef4444' }}
                                    >
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                        </div>
                        <div className="flex items-center gap-1">
                            {activeTab === 'messages' && unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover"
                                >
                                    Mark all read
                                </button>
                            )}
                            {activeTab === 'notifications' && notifCount > 0 && markAllNotifsRead && (
                                <button
                                    onClick={markAllNotifsRead}
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
                    ) : activeTab === 'notifications' ? (
                        recentNotifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 text-text-secondary">
                                <i className="fas fa-bell-slash mb-3 text-3xl text-border-medium" />
                                <span className="text-sm font-medium text-text-primary">No notifications</span>
                                <span className="mt-1 text-xs">You&apos;re all caught up</span>
                            </div>
                        ) : (
                            <div className="divide-y divide-bg-hover">
                                {recentNotifications.map((notif) => {
                                    const isUnread = notif.source === 'computed' || !notif.isRead
                                    return (
                                        <div
                                            key={notif.dbId || notif.id || notif.title}
                                            className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-hover"
                                            style={{ backgroundColor: isUnread ? `${accentColor}06` : undefined }}
                                            onClick={() => {
                                                if (notif.dbId && markNotifRead) markNotifRead(notif.dbId)
                                            }}
                                        >
                                            <div
                                                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                                                style={{
                                                    background: isUnread
                                                        ? `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`
                                                        : 'var(--bg-hover)',
                                                    color: isUnread ? 'white' : 'var(--text-secondary)'
                                                }}
                                            >
                                                <i
                                                    className={`fas ${notif.icon || 'fa-bell'}`}
                                                    style={{ fontSize: 13 }}
                                                />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span
                                                        className={`truncate text-sm text-text-primary ${isUnread ? 'font-bold' : 'font-medium'}`}
                                                    >
                                                        {notif.title || 'Notification'}
                                                    </span>
                                                    {notif.createdAt && (
                                                        <span className="flex-shrink-0 text-[11px] text-text-secondary">
                                                            {DateUtility.formatTimeAgo(notif.createdAt)}
                                                        </span>
                                                    )}
                                                </div>
                                                {notif.message && (
                                                    <p className="m-0 mt-0.5 truncate text-xs text-text-secondary">
                                                        {notif.message}
                                                    </p>
                                                )}
                                            </div>
                                            {notif.dbId && deleteNotification && (
                                                <button
                                                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-text-secondary opacity-0 transition-opacity hover:bg-bg-hover group-hover:opacity-100"
                                                    style={{ opacity: 0.4 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        deleteNotification(notif.dbId)
                                                    }}
                                                    title="Dismiss"
                                                >
                                                    <i className="fas fa-times" style={{ fontSize: 10 }} />
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    ) : recentConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 text-text-secondary">
                            <i className="fas fa-envelope-open mb-3 text-3xl text-border-medium" />
                            <span className="text-sm font-medium text-text-primary">No conversations</span>
                            <span className="mt-1 text-xs">Your inbox is empty</span>
                        </div>
                    ) : (
                        <div className="divide-y divide-bg-hover">
                            {recentConversations.map((conv) => {
                                const name = userNames[conv.otherId] || 'Loading...'
                                const initials = UserUtility.getInitials(name)
                                const latest = conv.lastMessage
                                const hasUnread = conv.unread > 0
                                return (
                                    <div
                                        key={conv.otherId}
                                        className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-hover"
                                        style={{ backgroundColor: hasUnread ? `${accentColor}06` : undefined }}
                                        onClick={() => {
                                            if (onSelectConversation) {
                                                onSelectConversation(conv.otherId)
                                            } else {
                                                onViewAll()
                                            }
                                        }}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <div
                                                className="flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                                style={{
                                                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`
                                                }}
                                            >
                                                {initials}
                                            </div>
                                            {hasUnread && (
                                                <div
                                                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-bg-primary text-[9px] font-bold text-white"
                                                    style={{ backgroundColor: accentColor }}
                                                >
                                                    {conv.unread}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span
                                                    className={`truncate text-sm text-text-primary ${hasUnread ? 'font-bold' : 'font-medium'}`}
                                                >
                                                    {name}
                                                </span>
                                                <span className="flex-shrink-0 text-[11px] text-text-secondary">
                                                    {DateUtility.formatTimeAgo(latest?.createdAt)}
                                                </span>
                                            </div>
                                            {latest?.subject && (
                                                <p
                                                    className="m-0 truncate text-xs text-text-primary"
                                                    style={{ opacity: hasUnread ? 1 : 0.7 }}
                                                >
                                                    {latest.subject}
                                                </p>
                                            )}
                                            <p className="m-0 mt-0.5 truncate text-xs text-text-secondary">
                                                {latest?.body}
                                            </p>
                                        </div>
                                        <div className="flex flex-shrink-0 items-center gap-1 text-text-secondary">
                                            <span className="text-[11px]">{conv.messages.length}</span>
                                            <i className="fas fa-chevron-right text-[9px]" />
                                        </div>
                                    </div>
                                )
                            })}
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
                        {activeTab === 'notifications' ? 'View All Notifications' : 'View All Messages'}
                        <i className="fas fa-arrow-right text-xs" />
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default NotificationsModal
