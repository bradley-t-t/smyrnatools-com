import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import { UserService } from '../../../services/UserService'
import { usePreferences } from '../../context/PreferencesContext'
import { useAccentColor } from '../../hooks/useAccentColor'
import { useNotifications } from '../../hooks/useNotifications'
/**
 * Anchored dropdown panel (portal) displaying categorized notifications.
 * Groups notifications by type (mixer/tractor/equipment verifications, overdue tasks, reports)
 * with collapsible sections and severity-based color coding.
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls portal visibility.
 * @param {Function} props.onClose - Callback invoked on backdrop click or close button.
 * @param {DOMRect} [props.anchorRect] - Bounding rect of the trigger element for positioning.
 */
function NotificationsModal({ isOpen, onClose, anchorRect }) {
    const { preferences } = usePreferences()
    const accentColor = useAccentColor()
    const [userId, setUserId] = useState(null)
    const [collapsedCategories, setCollapsedCategories] = useState(new Set())
    const panelRef = useRef(null)
    const { notifications: items = [], loading } = useNotifications(userId, preferences?.selectedRegion)
    useEffect(() => {
        if (!isOpen) return
        let mounted = true
        const load = async () => {
            try {
                const user = await UserService.getCurrentUser()
                const uid = user?.id || null
                if (mounted) setUserId(uid)
            } catch {
                if (mounted) setUserId(null)
            }
        }
        load()
        return () => {
            mounted = false
        }
    }, [isOpen])
    const toggleCategory = (categoryKey) => {
        setCollapsedCategories((prev) => {
            const next = new Set(prev)
            if (next.has(categoryKey)) {
                next.delete(categoryKey)
            } else {
                next.add(categoryKey)
            }
            return next
        })
    }
    const categorizedItems = useMemo(() => {
        const mixerVerifications = items.filter((n) => n.type === 'mixers.verifications')
        const tractorVerifications = items.filter((n) => n.type === 'tractors.verifications')
        const equipmentVerifications = items.filter((n) => n.type === 'equipment.verifications')
        const tasks = items.filter((n) => n.type?.includes('list.overdue'))
        const reports = items.filter((n) => n.type?.includes('reports'))
        return {
            equipmentVerifications,
            mixerVerifications,
            reports,
            tasks,
            tractorVerifications
        }
    }, [items])
    const categories = useMemo(() => {
        const cats = []
        if (categorizedItems.mixerVerifications.length > 0) {
            cats.push({
                icon: 'fas fa-truck',
                items: categorizedItems.mixerVerifications,
                key: 'mixerVerifications',
                label: 'Mixer Verifications'
            })
        }
        if (categorizedItems.tractorVerifications.length > 0) {
            cats.push({
                icon: 'fas fa-tractor',
                items: categorizedItems.tractorVerifications,
                key: 'tractorVerifications',
                label: 'Tractor Verifications'
            })
        }
        if (categorizedItems.equipmentVerifications.length > 0) {
            cats.push({
                icon: 'fas fa-snowplow',
                items: categorizedItems.equipmentVerifications,
                key: 'equipmentVerifications',
                label: 'Equipment Verifications'
            })
        }
        if (categorizedItems.tasks.length > 0) {
            cats.push({
                icon: 'fas fa-list',
                items: categorizedItems.tasks,
                key: 'tasks',
                label: 'Overdue Tasks'
            })
        }
        if (categorizedItems.reports.length > 0) {
            cats.push({
                icon: 'fas fa-file-alt',
                items: categorizedItems.reports,
                key: 'reports',
                label: 'Overdue Reports'
            })
        }
        return cats
    }, [categorizedItems])
    useEffect(() => {
        setCollapsedCategories(new Set(categories.map((c) => c.key)))
    }, [categories])
    useEffect(() => {
        if (!isOpen) return
        const handleClickOutside = (e) => {
            if (!panelRef.current) return
            if (panelRef.current.contains(e.target)) return
            onClose()
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onClose])
    if (!isOpen || typeof document === 'undefined' || !document.body) return null
    const modalStyle = {
        position: 'fixed',
        right: anchorRect ? window.innerWidth - anchorRect.right : '16px',
        top: anchorRect ? anchorRect.bottom + 8 : '80px',
        zIndex: 1000
    }
    const getSeverityClasses = (severity) => {
        switch (severity) {
            case 'error':
            case 'critical':
                return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' }
            case 'warning':
                return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' }
            default:
                return { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-800' }
        }
    }
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[999]" onClick={onClose}>
            <div
                ref={panelRef}
                style={modalStyle}
                className="w-80 max-h-[70vh] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <i className="fas fa-bell text-slate-600"></i>
                        <span className="font-semibold text-slate-800">Notifications</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs text-slate-600 font-medium">
                            {items.length}
                        </span>
                    </div>
                    <button
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                        onClick={onClose}
                    >
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <i className="fas fa-spinner fa-spin text-xl mb-2"></i>
                            <span className="text-sm">Loading notifications...</span>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <i className="fas fa-bell-slash text-2xl mb-2"></i>
                            <span className="text-sm">No notifications</span>
                        </div>
                    ) : (
                        <div className="p-3 flex flex-col gap-3">
                            {categories.map((category) => {
                                const isCollapsed = collapsedCategories.has(category.key)
                                return (
                                    <div
                                        key={category.key}
                                        className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50"
                                    >
                                        <div
                                            className={`flex items-center gap-2 px-3 py-2.5 bg-white cursor-pointer select-none ${!isCollapsed ? 'border-b border-slate-200' : ''}`}
                                            onClick={() => toggleCategory(category.key)}
                                        >
                                            <i
                                                className={`${category.icon} text-sm w-5 text-center`}
                                                style={{ color: accentColor }}
                                            ></i>
                                            <span className="flex-1 text-sm font-semibold text-slate-700">
                                                {category.label}
                                            </span>
                                            <span
                                                className="px-2 py-0.5 text-white text-xs font-semibold rounded-full min-w-[22px] text-center"
                                                style={{ backgroundColor: accentColor }}
                                            >
                                                {category.items.length}
                                            </span>
                                            <button className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600">
                                                <i
                                                    className={`fas fa-chevron-${isCollapsed ? 'down' : 'up'} text-xs`}
                                                ></i>
                                            </button>
                                        </div>
                                        {!isCollapsed && (
                                            <div className="p-2 flex flex-col gap-1.5">
                                                {category.items.map((n) => {
                                                    const classes = getSeverityClasses(n.severity)
                                                    return (
                                                        <div
                                                            key={n.id}
                                                            className={`flex gap-2 items-start p-2.5 rounded-lg border ${classes.bg} ${classes.border}`}
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <div
                                                                    className={`text-sm font-medium ${classes.text} truncate`}
                                                                >
                                                                    {n.title}
                                                                </div>
                                                                <div className="text-xs text-slate-500 truncate">
                                                                    {n.subtitle}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
export default NotificationsModal
