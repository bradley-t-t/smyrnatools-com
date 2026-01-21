import React, {useEffect, useMemo, useRef, useState} from 'react'
import ReactDOM from 'react-dom'
import {usePreferences} from '../../app/context/PreferencesContext'
import {UserService} from '../../services/UserService'
import {useNotifications} from '../../hooks/useNotifications'

function NotificationsModal({isOpen, onClose, anchorRect}) {
    const {preferences} = usePreferences()
    const [userId, setUserId] = useState(null)
    const [collapsedCategories, setCollapsedCategories] = useState(new Set())
    const panelRef = useRef(null)

    const {notifications: items = [], loading} = useNotifications(userId, preferences?.selectedRegion)

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

    const defaultPosition = {top: 70, right: 12}
    let positionStyle
    if (anchorRect && Number.isFinite(anchorRect.bottom) && Number.isFinite(anchorRect.right)) {
        const top = Math.max(8, Math.round(anchorRect.bottom + 8))
        const right = Math.max(8, Math.round(window.innerWidth - anchorRect.right))
        positionStyle = {top: `${top}px`, right: `${right}px`}
    } else {
        positionStyle = {top: `${defaultPosition.top}px`, right: `${defaultPosition.right}px`}
    }

    const layerStyle = {
        position: 'fixed',
        inset: 0,
        zIndex: 1400,
        pointerEvents: 'none'
    }

    const popoverStyle = {
        position: 'fixed',
        pointerEvents: 'auto',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        maxWidth: '360px',
        width: '360px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        ...positionStyle
    }

    const headerStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f8fafc',
        borderRadius: '12px 12px 0 0'
    }

    const titleStyle = {
        fontSize: '15px',
        fontWeight: 600,
        color: '#1e3a5f',
        margin: 0
    }

    const closeButtonStyle = {
        border: 'none',
        background: 'transparent',
        color: '#64748b',
        cursor: 'pointer',
        padding: '6px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }

    const contentStyle = {
        maxHeight: '60vh',
        overflow: 'auto'
    }

    const loadingStyle = {
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 18px',
        color: '#64748b'
    }

    const emptyStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        color: '#94a3b8'
    }

    const categoriesContainerStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px'
    }

    const categoryStyle = {
        borderRadius: '10px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        backgroundColor: '#f8fafc'
    }

    const categoryHeaderStyle = (isCollapsed) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        backgroundColor: 'white',
        borderBottom: isCollapsed ? 'none' : '1px solid #e5e7eb',
        cursor: 'pointer',
        userSelect: 'none'
    })

    const categoryTitleStyle = {
        flex: 1,
        fontSize: '13px',
        fontWeight: 600,
        color: '#374151'
    }

    const badgeStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '22px',
        height: '22px',
        padding: '0 6px',
        backgroundColor: '#1e3a5f',
        color: 'white',
        fontSize: '11px',
        fontWeight: 600,
        borderRadius: '11px'
    }

    const toggleButtonStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        padding: 0,
        border: 'none',
        background: 'transparent',
        color: '#64748b',
        borderRadius: '6px',
        cursor: 'pointer'
    }

    const itemsContainerStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '8px'
    }

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'error':
            case 'critical':
                return {bg: '#fef2f2', border: '#fecaca', text: '#991b1b'}
            case 'warning':
                return {bg: '#fffbeb', border: '#fde68a', text: '#92400e'}
            default:
                return {bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1'}
        }
    }

    const itemStyle = (severity) => {
        const colors = getSeverityColor(severity)
        return {
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
            padding: '10px',
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            backgroundColor: colors.bg
        }
    }

    const itemTitleStyle = (severity) => {
        const colors = getSeverityColor(severity)
        return {
            fontSize: '13px',
            fontWeight: 500,
            color: colors.text,
            marginBottom: '2px'
        }
    }

    const itemSubtitleStyle = {
        fontSize: '12px',
        color: '#64748b'
    }

    return ReactDOM.createPortal(
        <div style={layerStyle}>
            <div style={popoverStyle} ref={panelRef} role="dialog" aria-modal="false">
                <div style={headerStyle}>
                    <h3 style={titleStyle}>{title}</h3>
                    <button style={closeButtonStyle} onClick={onClose} aria-label="Close">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div style={contentStyle}>
                    {loading ? (
                        <div style={loadingStyle}>
                            <i className="fas fa-circle-notch fa-spin"></i>
                            <span>Loading...</span>
                        </div>
                    ) : items.length === 0 ? (
                        <div style={emptyStyle}>
                            <i className="fas fa-bell-slash" style={{fontSize: '32px', opacity: 0.5, marginBottom: '4px'}}></i>
                            <span style={{fontSize: '14px'}}>No notifications</span>
                        </div>
                    ) : (
                        <div style={categoriesContainerStyle}>
                            {categories.map((category) => {
                                const isCollapsed = collapsedCategories.has(category.key)
                                return (
                                    <div key={category.key} style={categoryStyle}>
                                        <div style={categoryHeaderStyle(isCollapsed)} onClick={() => toggleCategory(category.key)}>
                                            <i className={category.icon} style={{fontSize: '14px', color: '#1e3a5f', width: '20px', textAlign: 'center'}}></i>
                                            <span style={categoryTitleStyle}>{category.label}</span>
                                            <span style={badgeStyle}>{category.items.length}</span>
                                            <button style={toggleButtonStyle} aria-label={isCollapsed ? 'Expand' : 'Collapse'}>
                                                <i className={`fas fa-chevron-${isCollapsed ? 'down' : 'up'}`} style={{fontSize: '12px'}}></i>
                                            </button>
                                        </div>
                                        {!isCollapsed && (
                                            <div style={itemsContainerStyle}>
                                                {category.items.map((n) => (
                                                    <div key={n.id} style={itemStyle(n.severity)}>
                                                        <div style={{flex: 1}}>
                                                            <div style={itemTitleStyle(n.severity)}>{n.title}</div>
                                                            <div style={itemSubtitleStyle}>{n.subtitle}</div>
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