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
    const panelRef = useRef(null)

    const title = useMemo(() => 'Notifications', [])

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
                    ) : (
                        <div className="notifications-list">
                            {items.length === 0 ? (
                                <div className="notifications-empty">
                                    <i className="fas fa-bell-slash"></i>
                                    <span>No notifications</span>
                                </div>
                            ) : (
                                items.map((n, idx) => (
                                    <div key={n.id} className={`notification-item ${n.severity}`}
                                         style={{animationDelay: `${Math.min(idx, 6) * 30}ms`}}>
                                        <div className="notification-body">
                                            <div className="notification-title">{n.title}</div>
                                            <div className="notification-subtitle">{n.subtitle}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}

export default NotificationsModal