import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import { useAccentColor } from '../../hooks/useAccentColor'

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
            label: 'Alerts'
        }
    )
}

function getSeverityStyle(severity) {
    switch (severity) {
        case 'error':
        case 'critical':
            return { bg: 'bg-red-50', border: 'border-red-200', dot: '#ef4444', text: 'text-red-700' }
        case 'warning':
            return { bg: 'bg-amber-50', border: 'border-amber-200', dot: '#f59e0b', text: 'text-amber-700' }
        default:
            return { bg: 'bg-sky-50', border: 'border-sky-200', dot: '#0ea5e9', text: 'text-sky-700' }
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
    return new Date(dateString).toLocaleDateString()
}
/**
 * Anchored dropdown notification center. Shows active system alerts (computed)
 * and recent DB-backed notifications with per-item read/delete actions.
 * Footer links to the full NotificationsView.
 */
function NotificationsModal({ isOpen, onClose, onViewAll, anchorRect, notificationsHook }) {
    const accentColor = useAccentColor()
    const panelRef = useRef(null)
    const { notifications: items = [], loading, markAsRead, markAllRead, deleteNotification } = notificationsHook

    const computedItems = useMemo(() => items.filter((n) => n.source === 'computed'), [items])
    const dbItems = useMemo(() => items.filter((n) => n.source === 'db'), [items])
    const hasUnreadDb = dbItems.some((n) => !n.isRead)
    const unreadCount = useMemo(
        () => items.filter((n) => n.source === 'computed' || (n.source === 'db' && !n.isRead)).length,
        [items]
    )
    const recentDbItems = useMemo(() => dbItems.slice(0, 6), [dbItems])

    const computedGroups = useMemo(() => {
        const grouped = {}
        computedItems.forEach((n) => {
            const key = n.type || 'other'
            if (!grouped[key]) grouped[key] = { items: [], key, ...getComputedMeta(n.type) }
            grouped[key].items.push(n)
        })
        return Object.values(grouped)
    }, [computedItems])

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
        right: anchorRect ? window.innerWidth - anchorRect.right : '16px',
        top: anchorRect ? anchorRect.bottom + 8 : '80px',
        zIndex: 1000
    }

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[999]" onClick={onClose}>
            <div
                ref={panelRef}
                style={modalStyle}
                className="w-96 max-h-[76vh] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <i className="fas fa-bell text-slate-500 text-sm"></i>
                        <span className="font-semibold text-slate-800 text-sm">Notifications</span>
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
                        {hasUnreadDb && (
                            <button
                                onClick={markAllRead}
                                className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Mark all read
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                        >
                            <i className="fas fa-times text-sm"></i>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <i className="fas fa-spinner fa-spin text-xl mb-2"></i>
                            <span className="text-sm">Loading...</span>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                            <i className="fas fa-bell-slash text-3xl mb-3"></i>
                            <span className="text-sm font-medium">All caught up</span>
                            <span className="text-xs mt-1">No notifications right now</span>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {/* Active Alerts (computed) */}
                            {computedGroups.length > 0 && (
                                <div className={dbItems.length > 0 ? 'border-b border-slate-100' : ''}>
                                    <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                                        <i className="fas fa-exclamation-triangle text-amber-500 text-xs"></i>
                                        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                                            Active Alerts
                                        </span>
                                        <span className="ml-auto text-xs text-amber-600 font-medium">
                                            {computedItems.length}
                                        </span>
                                    </div>
                                    <div className="p-3 flex flex-col gap-2">
                                        {computedGroups.map((group) => (
                                            <CollapsibleAlertGroup
                                                key={group.key}
                                                group={group}
                                                accentColor={accentColor}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent DB notifications */}
                            {recentDbItems.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                        <i className="fas fa-inbox text-slate-400 text-xs"></i>
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                            Recent
                                        </span>
                                        <span className="ml-auto text-xs text-slate-400 font-medium">
                                            {dbItems.length}
                                        </span>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {recentDbItems.map((n) => (
                                            <DbNotificationRow
                                                key={n.id}
                                                notification={n}
                                                onMarkRead={markAsRead}
                                                onDelete={deleteNotification}
                                                accentColor={accentColor}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 flex-shrink-0">
                    <button
                        onClick={onViewAll}
                        className="w-full px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                        style={{ color: accentColor }}
                    >
                        View All Notifications
                        <i className="fas fa-arrow-right text-xs"></i>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

function CollapsibleAlertGroup({ group, accentColor }) {
    const shouldCollapse = group.key?.includes('verifications') || group.key?.includes('overdue')
    const [expanded, setExpanded] = useState(!shouldCollapse)
    return (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                onClick={() => setExpanded((v) => !v)}
            >
                <i className={`${group.icon} text-xs w-4 text-center`} style={{ color: accentColor }}></i>
                <span className="flex-1 text-xs font-semibold text-slate-700">{group.label}</span>
                <span
                    className="text-white text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                >
                    {group.items.length}
                </span>
                <i
                    className={`fas fa-chevron-down text-slate-400 text-[10px] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                ></i>
            </div>
            {expanded && (
                <div className="p-2 flex flex-col gap-1">
                    {group.items.map((n) => {
                        const s = getSeverityStyle(n.severity)
                        return (
                            <div key={n.id} className={`px-2.5 py-2 rounded-lg border ${s.bg} ${s.border}`}>
                                <div className={`text-xs font-medium ${s.text} truncate`}>{n.title}</div>
                                {n.subtitle && (
                                    <div className="text-xs text-slate-500 truncate mt-0.5">{n.subtitle}</div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function DbNotificationRow({ notification: n, onMarkRead, onDelete, accentColor }) {
    const s = getSeverityStyle(n.severity)
    return (
        <div className={`flex gap-3 px-4 py-3 ${n.isRead ? '' : 'bg-blue-50/40'} hover:bg-slate-50 transition-colors`}>
            {/* Unread dot */}
            <div className="flex-shrink-0 pt-1.5">
                {n.isRead ? (
                    <div className="w-2 h-2 rounded-full bg-transparent"></div>
                ) : (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }}></div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium truncate ${n.isRead ? 'text-slate-600' : 'text-slate-800'}`}>
                        {n.title}
                    </p>
                    <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">{formatTimeAgo(n.createdAt)}</span>
                </div>
                {n.body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                    {!n.isRead && (
                        <button
                            onClick={() => onMarkRead(n.dbId)}
                            className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
                        >
                            <i className="fas fa-check text-xs"></i>
                            Mark read
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(n.dbId)}
                        className="text-xs text-slate-300 hover:text-red-400 transition-colors ml-auto"
                        title="Dismiss"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default NotificationsModal
