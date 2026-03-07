import React, { useMemo, useRef, useState } from 'react'

import { usePreferences } from '../../app/context/PreferencesContext'
import { useAccentColor } from '../../app/hooks/useAccentColor'
import { useNotifications } from '../../app/hooks/useNotifications'
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
                dot: '#ef4444',
                icon: 'text-red-500',
                text: 'text-red-700'
            }
        case 'warning':
            return {
                badge: 'bg-amber-100 text-amber-700',
                bg: 'bg-amber-50',
                border: 'border-amber-200',
                dot: '#f59e0b',
                icon: 'text-amber-500',
                text: 'text-amber-700'
            }
        default:
            return {
                badge: 'bg-sky-100 text-sky-700',
                bg: 'bg-sky-50',
                border: 'border-sky-200',
                dot: '#0ea5e9',
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
const TABS = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'alerts', label: 'Active Alerts' },
    { id: 'inbox', label: 'Inbox' }
]
/**
 * Full-page notifications center. Shows active system alerts (computed/real-time)
 * and DB-backed notifications (announcements, messages) with read and delete actions.
 */
function NotificationsView({ userId }) {
    const { preferences } = usePreferences()
    const accentColor = useAccentColor()
    const [tab, setTab] = useState('all')
    const { notifications, loading, markAsRead, markAllRead, deleteNotification } = useNotifications(
        userId,
        preferences?.selectedRegion
    )
    const computedItems = useMemo(() => notifications.filter((n) => n.source === 'computed'), [notifications])
    const dbItems = useMemo(() => notifications.filter((n) => n.source === 'db'), [notifications])
    const unreadDb = useMemo(() => dbItems.filter((n) => !n.isRead), [dbItems])
    const totalUnread = useMemo(
        () => notifications.filter((n) => n.source === 'computed' || (n.source === 'db' && !n.isRead)).length,
        [notifications]
    )
    const computedGroups = useMemo(() => {
        const grouped = {}
        computedItems.forEach((n) => {
            const key = n.type || 'other'
            if (!grouped[key]) grouped[key] = { items: [], key, ...getComputedMeta(n.type) }
            grouped[key].items.push(n)
        })
        return Object.values(grouped)
    }, [computedItems])
    const showComputed = tab === 'all' || tab === 'unread' || tab === 'alerts'
    const showDb = tab === 'all' || tab === 'unread' || tab === 'inbox'
    const filteredDb = tab === 'unread' ? unreadDb : dbItems
    const isEmpty = (showComputed ? computedItems.length === 0 : true) && (showDb ? filteredDb.length === 0 : true)
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Sticky header */}
            <div
                className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm"
                style={{
                    backgroundImage: `
                        linear-gradient(${accentColor}10 1px, transparent 1px),
                        linear-gradient(90deg, ${accentColor}10 1px, transparent 1px),
                        radial-gradient(circle at center, ${accentColor}08 0%, transparent 50%)
                    `,
                    backgroundPosition: '0 0, 0 0, 0 0',
                    backgroundSize: '20px 20px, 20px 20px, 40px 40px'
                }}
            >
                <div className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-9 h-9 flex items-center justify-center rounded-xl"
                            style={{ backgroundColor: `${accentColor}18` }}
                        >
                            <i className="fas fa-bell text-sm" style={{ color: accentColor }}></i>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 m-0 leading-tight">Notifications</h1>
                            {totalUnread > 0 && <p className="text-xs text-slate-500 m-0">{totalUnread} unread</p>}
                        </div>
                    </div>
                    {unreadDb.length > 0 && (
                        <button
                            onClick={markAllRead}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                            <i className="fas fa-check-double text-xs"></i>
                            Mark all read
                        </button>
                    )}
                </div>
                {/* Tabs */}
                <div className="flex items-center gap-1 px-6 pb-0 max-w-4xl mx-auto border-t border-slate-100">
                    {TABS.map((t) => {
                        const isActive = tab === t.id
                        return (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    isActive
                                        ? 'border-current'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                                style={isActive ? { borderColor: accentColor, color: accentColor } : {}}
                            >
                                {t.label}
                                {t.id === 'unread' && unreadDb.length > 0 && (
                                    <span
                                        className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                                        style={{ backgroundColor: accentColor }}
                                    >
                                        {unreadDb.length}
                                    </span>
                                )}
                                {t.id === 'alerts' && computedItems.length > 0 && (
                                    <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                        {computedItems.length}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
            {/* Content */}
            <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <i className="fas fa-spinner fa-spin text-2xl mb-3"></i>
                        <span className="text-sm">Loading notifications...</span>
                    </div>
                ) : isEmpty ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                            <i className="fas fa-bell-slash text-2xl text-slate-300"></i>
                        </div>
                        <p className="text-base font-semibold text-slate-500 m-0">All caught up</p>
                        <p className="text-sm text-slate-400 mt-1">
                            {tab === 'unread' ? 'No unread notifications' : 'No notifications to show'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Active Alerts section */}
                        {showComputed && computedGroups.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <i className="fas fa-exclamation-triangle text-amber-500 text-sm"></i>
                                    <h2 className="text-sm font-semibold text-slate-700 m-0">Active Alerts</h2>
                                    <span className="ml-auto text-xs text-slate-400">
                                        Auto-resolve when the underlying issue is fixed
                                    </span>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {computedGroups.map((group) => (
                                        <ComputedGroup key={group.key} group={group} accentColor={accentColor} />
                                    ))}
                                </div>
                            </section>
                        )}
                        {/* DB notifications section */}
                        {showDb && filteredDb.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <i className="fas fa-inbox text-slate-400 text-sm"></i>
                                    <h2 className="text-sm font-semibold text-slate-700 m-0">
                                        {tab === 'unread' ? 'Unread' : 'Notifications'}
                                    </h2>
                                    <span className="ml-1 text-xs text-slate-400 font-medium">{filteredDb.length}</span>
                                </div>
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                                    {filteredDb.map((n) => (
                                        <DbNotificationCard
                                            key={n.id}
                                            notification={n}
                                            onMarkRead={markAsRead}
                                            onDelete={deleteNotification}
                                            accentColor={accentColor}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
function ComputedGroup({ group, accentColor }) {
    const shouldCollapse = group.key?.includes('verifications') || group.key?.includes('overdue')
    const [expanded, setExpanded] = useState(!shouldCollapse)
    const contentRef = useRef(null)
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div
                className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                onClick={() => setExpanded((v) => !v)}
            >
                <i className={`${group.icon} text-sm`} style={{ color: accentColor }}></i>
                <span className="font-semibold text-slate-700 text-sm flex-1">{group.label}</span>
                <span
                    className="text-xs font-bold text-white px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                >
                    {group.items.length}
                </span>
                <i
                    className={`fas fa-chevron-down text-slate-400 text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
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
            className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                n.isRead ? 'hover:bg-slate-50' : 'bg-blue-50/30 hover:bg-blue-50/50'
            }`}
        >
            {/* Read indicator */}
            <div className="flex-shrink-0 pt-1.5">
                {n.isRead ? (
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-200"></div>
                ) : (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold m-0 ${n.isRead ? 'text-slate-600' : 'text-slate-800'}`}>
                            {n.title}
                        </p>
                        {n.body && <p className="text-sm text-slate-500 mt-1 m-0 leading-relaxed">{n.body}</p>}
                        <div className="flex items-center gap-3 mt-2">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.badge}`}>
                                {n.type?.replace(/_/g, ' ') || 'System'}
                            </span>
                            <span className="text-xs text-slate-400">{formatTimeAgo(n.createdAt)}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {!n.isRead && (
                            <button
                                onClick={() => onMarkRead(n.dbId)}
                                title="Mark as read"
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                <i className="fas fa-check text-xs"></i>
                            </button>
                        )}
                        <button
                            onClick={() => onDelete(n.dbId)}
                            title="Dismiss"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
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
