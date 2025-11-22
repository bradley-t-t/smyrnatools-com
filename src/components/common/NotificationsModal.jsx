import React, {useEffect, useMemo, useRef, useState} from 'react'
import ReactDOM from 'react-dom'
import './styles/NotificationsModal.css'
import {usePreferences} from '../../app/context/PreferencesContext'
import {UserService} from '../../services/UserService'
import NotificationsService from '../../services/NotificationsService'

function NotificationsModal({isOpen, onClose, anchorRect}) {
    const {preferences} = usePreferences()
    const [loading, setLoading] = useState(false)
    const [items, setItems] = useState([])
    const [collapsedCategories, setCollapsedCategories] = useState(new Set())
    const panelRef = useRef(null)

    const title = useMemo(() => 'Notifications', [])

    const toggleCategory = (categoryKey) => {
        setCollapsedCategories(prev => {
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
        const mixerVerifications = items.filter(n => n.type === 'mixers.verifications')
        const tractorVerifications = items.filter(n => n.type === 'tractors.verifications')
        const equipmentVerifications = items.filter(n => n.type === 'equipment.verifications')
        const tasks = items.filter(n => n.type?.includes('list.overdue'))
        const reports = items.filter(n => n.type?.includes('reports'))

        return {
            mixerVerifications,
            tractorVerifications,
            equipmentVerifications,
            tasks,
            reports
        }
    }, [items])

    const categories = useMemo(() => {
        const cats = []

        if (categorizedItems.mixerVerifications.length > 0) {
            cats.push({
                key: 'mixerVerifications',
                label: 'Mixer Verifications',
                icon: 'fas fa-truck',
                items: categorizedItems.mixerVerifications
            })
        }

        if (categorizedItems.tractorVerifications.length > 0) {
            cats.push({
                key: 'tractorVerifications',
                label: 'Tractor Verifications',
                icon: 'fas fa-tractor',
                items: categorizedItems.tractorVerifications
            })
        }

        if (categorizedItems.equipmentVerifications.length > 0) {
            cats.push({
                key: 'equipmentVerifications',
                label: 'Equipment Verifications',
                icon: 'fas fa-snowplow',
                items: categorizedItems.equipmentVerifications
            })
        }

        if (categorizedItems.tasks.length > 0) {
            cats.push({
                key: 'tasks',
                label: 'Overdue Tasks',
                icon: 'fas fa-list',
                items: categorizedItems.tasks
            })
        }

        if (categorizedItems.reports.length > 0) {
            cats.push({
                key: 'reports',
                label: 'Overdue Reports',
                icon: 'fas fa-file-alt',
                items: categorizedItems.reports
            })
        }

        return cats
    }, [categorizedItems])

    useEffect(() => {
        setCollapsedCategories(new Set(categories.map(c => c.key)))
    }, [categories])

    useEffect(() => {
        if (!isOpen) return
        let mounted = true
        const load = async () => {
            setLoading(true)
            try {
                const user = await UserService.getCurrentUser()
                const uid = user?.id || null
                const list = await NotificationsService.getNotifications(uid, preferences?.selectedRegion)
                if (mounted) setItems(list)
            } catch {
                if (mounted) setItems([])
            } finally {
                if (mounted) setLoading(false)
            }
        }
        load()
        const handler = async () => {
            try {
                const user = await UserService.getCurrentUser()
                const uid = user?.id || null
                const list = await NotificationsService.getNotifications(uid, preferences?.selectedRegion)
                if (mounted) setItems(list)
            } catch {
            }
        }
        window.addEventListener('notifications-refresh', handler)
        window.addEventListener('region-changed', handler)
        const handleClickOutside = (e) => {
            if (!panelRef.current) return
            if (panelRef.current.contains(e.target)) return
            onClose()
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            mounted = false
            window.removeEventListener('notifications-refresh', handler)
            window.removeEventListener('region-changed', handler)
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, preferences?.selectedRegion?.code, onClose])

    if (!isOpen || typeof document === 'undefined' || !document.body) return null

    const defaultPosition = {top: 70, right: 12}
    let style
    if (anchorRect && Number.isFinite(anchorRect.bottom) && Number.isFinite(anchorRect.right)) {
        const top = Math.max(8, Math.round(anchorRect.bottom + 8))
        const right = Math.max(8, Math.round(window.innerWidth - anchorRect.right))
        style = {top: `${top}px`, right: `${right}px`}
    } else {
        style = {top: `${defaultPosition.top}px`, right: `${defaultPosition.right}px`}
    }

    return ReactDOM.createPortal(
        <div className="notifications-layer">
            <div className="notifications-popover" style={style} ref={panelRef} role="dialog" aria-modal="false">
                <div className="notifications-header">
                    <h3 className="notifications-title">{title}</h3>
                    <button className="notifications-close" onClick={onClose} aria-label="Close">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="notifications-content">
                    {loading ? (
                        <div className="notifications-loading">
                            <i className="fas fa-circle-notch notifications-spinner"></i>
                            <span>Loading…</span>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="notifications-empty">
                            <i className="fas fa-bell-slash"></i>
                            <span>No notifications</span>
                        </div>
                    ) : (
                        <div className="notifications-categories">
                            {categories.map((category, catIdx) => {
                                const isCollapsed = collapsedCategories.has(category.key)
                                return (
                                    <div key={category.key}
                                         className={`notification-category ${isCollapsed ? 'collapsed' : ''}`}
                                         style={{animationDelay: `${catIdx * 50}ms`}}>
                                        <div className="notification-category-header"
                                             onClick={() => toggleCategory(category.key)}>
                                            <i className={category.icon}></i>
                                            <span className="notification-category-title">{category.label}</span>
                                            <span className="notification-category-badge">{category.items.length}</span>
                                            <button className="notification-category-toggle"
                                                    aria-label={isCollapsed ? 'Expand' : 'Collapse'}>
                                                <i className={`fas fa-chevron-${isCollapsed ? 'down' : 'up'}`}></i>
                                            </button>
                                        </div>
                                        {!isCollapsed && (
                                            <div className="notification-category-items">
                                                {category.items.map((n, idx) => (
                                                    <div key={n.id} className={`notification-item ${n.severity}`}
                                                         style={{animationDelay: `${(catIdx * 50) + (idx * 30)}ms`}}>
                                                        <div className="notification-body">
                                                            <div className="notification-title">{n.title}</div>
                                                            <div className="notification-subtitle">{n.subtitle}</div>
                                                        </div>
                                                    </div>
                                                ))}
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