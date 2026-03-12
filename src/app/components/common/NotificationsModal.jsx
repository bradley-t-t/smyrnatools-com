import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import { UserService } from '../../../services/UserService'
import { useAccentColor } from '../../hooks/useAccentColor'

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
    return new Date(dateString).toLocaleDateString()
}

function getInitials(name) {
    if (!name || name === 'Unknown' || name === 'Loading...') return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
}

/**
 * Anchored dropdown showing recent conversations grouped by user.
 * Footer links to the full NotificationsView (messages center).
 */
function NotificationsModal({ isOpen, onClose, onViewAll, onSelectConversation, anchorRect, messagesHook }) {
    const accentColor = useAccentColor()
    const panelRef = useRef(null)
    const { conversations = [], loading, markAllRead, unreadCount } = messagesHook
    const recentConversations = useMemo(() => conversations.slice(0, 6), [conversations])
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
                style={{ ...modalStyle, backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
                className="w-96 max-h-[76vh] rounded-xl shadow-2xl border overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
                    style={{ borderColor: 'var(--border-light)' }}
                >
                    <div className="flex items-center gap-2.5">
                        <i className="fas fa-bell text-sm" style={{ color: 'var(--text-secondary)' }}></i>
                        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                            Notifications
                        </span>
                        {unreadCount > 0 && (
                            <span
                                className="px-2 py-0.5 text-white text-xs font-bold rounded-full min-w-[22px] text-center"
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
                                className="px-2.5 py-1 text-xs font-medium rounded-lg transition-colors"
                                style={{ color: 'var(--text-secondary)' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent'
                                }}
                            >
                                Mark all read
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                        >
                            <i className="fas fa-times text-sm"></i>
                        </button>
                    </div>
                </div>
                {/* Body — conversation list */}
                <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
                    {loading ? (
                        <div className="divide-y" style={{ borderColor: 'var(--bg-hover)' }}>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                                    <div
                                        className="w-9 h-9 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: 'var(--bg-hover)' }}
                                    ></div>
                                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <div
                                                className="h-3.5 rounded"
                                                style={{ backgroundColor: 'var(--bg-hover)', width: `${60 + i * 10}%` }}
                                            ></div>
                                            <div
                                                className="h-3 w-10 rounded flex-shrink-0"
                                                style={{ backgroundColor: 'var(--bg-hover)' }}
                                            ></div>
                                        </div>
                                        <div
                                            className="h-3 rounded"
                                            style={{ backgroundColor: 'var(--bg-hover)', width: `${80 - i * 8}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : recentConversations.length === 0 ? (
                        <div
                            className="flex flex-col items-center justify-center py-14"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <i
                                className="fas fa-envelope-open text-3xl mb-3"
                                style={{ color: 'var(--border-medium)' }}
                            ></i>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                No conversations
                            </span>
                            <span className="text-xs mt-1">Your inbox is empty</span>
                        </div>
                    ) : (
                        <div className="divide-y" style={{ borderColor: 'var(--bg-hover)' }}>
                            {recentConversations.map((conv) => {
                                const name = userNames[conv.otherId] || 'Loading...'
                                const initials = getInitials(name)
                                const latest = conv.lastMessage
                                const hasUnread = conv.unread > 0
                                return (
                                    <div
                                        key={conv.otherId}
                                        className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                                        style={{ backgroundColor: hasUnread ? `${accentColor}06` : 'transparent' }}
                                        onClick={() => {
                                            if (onSelectConversation) {
                                                onSelectConversation(conv.otherId)
                                            } else {
                                                onViewAll()
                                            }
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = hasUnread
                                                ? `${accentColor}06`
                                                : 'transparent'
                                        }}
                                    >
                                        {/* Avatar with unread badge */}
                                        <div className="relative flex-shrink-0">
                                            <div
                                                className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                                style={{
                                                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`
                                                }}
                                            >
                                                {initials}
                                            </div>
                                            {hasUnread && (
                                                <div
                                                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2"
                                                    style={{
                                                        backgroundColor: accentColor,
                                                        borderColor: 'var(--bg-primary)'
                                                    }}
                                                >
                                                    {conv.unread}
                                                </div>
                                            )}
                                        </div>
                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span
                                                    className={`text-sm truncate ${hasUnread ? 'font-bold' : 'font-medium'}`}
                                                    style={{ color: 'var(--text-primary)' }}
                                                >
                                                    {name}
                                                </span>
                                                <span
                                                    className="text-[11px] flex-shrink-0"
                                                    style={{ color: 'var(--text-secondary)' }}
                                                >
                                                    {formatTimeAgo(latest?.createdAt)}
                                                </span>
                                            </div>
                                            {latest?.subject && (
                                                <p
                                                    className="text-xs m-0 truncate"
                                                    style={{
                                                        color: 'var(--text-primary)',
                                                        opacity: hasUnread ? 1 : 0.7
                                                    }}
                                                >
                                                    {latest.subject}
                                                </p>
                                            )}
                                            <p
                                                className="text-xs m-0 mt-0.5 truncate"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                {latest?.body}
                                            </p>
                                        </div>
                                        {/* Message count */}
                                        <div
                                            className="flex items-center gap-1 flex-shrink-0"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <span className="text-[11px]">{conv.messages.length}</span>
                                            <i className="fas fa-chevron-right text-[9px]"></i>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
                {/* Footer */}
                <div className="border-t flex-shrink-0" style={{ borderColor: 'var(--border-light)' }}>
                    <button
                        onClick={onViewAll}
                        className="w-full px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                        style={{ color: accentColor }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                    >
                        View All Messages
                        <i className="fas fa-arrow-right text-xs"></i>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default NotificationsModal
