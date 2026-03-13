import { useCallback, useEffect, useRef, useState } from 'react'

import NotificationsService from '../../services/NotificationsService'
import { useMultiTableSubscription } from './useRealtimeSubscription'
const NOTIFICATION_TABLES = ['list_items', 'mixers', 'equipment', 'tractors', 'notifications', 'notification_reads']
/**
 * Manages notification state for both computed (asset/task) and DB-backed notifications.
 * Exposes mark-as-read and delete actions with optimistic UI updates.
 * Badge count reflects unread DB notifications plus all active computed alerts.
 */
export function useNotifications(userId, selectedRegion) {
    const [notifications, setNotifications] = useState([])
    const [count, setCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const refreshSeqRef = useRef(0)
    const retryTimeoutsRef = useRef([])

    const computeCount = (list) =>
        list.filter((n) => n.source === 'computed' || (n.source === 'db' && !n.isRead)).length

    const hasLoadedRef = useRef(false)

    const refresh = useCallback(async () => {
        if (!userId) {
            setNotifications([])
            setCount(0)
            setLoading(false)
            return
        }
        if (!hasLoadedRef.current) setLoading(true)
        const seq = ++refreshSeqRef.current
        try {
            const list = await NotificationsService.getNotifications(userId, selectedRegion)
            if (refreshSeqRef.current === seq) {
                const validList = Array.isArray(list) ? list : []
                setNotifications(validList)
                setCount(computeCount(validList))
                setLoading(false)
                hasLoadedRef.current = true
            }
        } catch {
            if (refreshSeqRef.current === seq) {
                setNotifications([])
                setCount(0)
                setLoading(false)
            }
        }
    }, [userId, selectedRegion])

    const scheduleRetries = useCallback(() => {
        retryTimeoutsRef.current.forEach((t) => clearTimeout(t))
        retryTimeoutsRef.current = []
        ;[250, 1000, 2000].forEach((delay) => {
            const t = setTimeout(() => refresh(), delay)
            retryTimeoutsRef.current.push(t)
        })
    }, [refresh])

    useEffect(() => {
        refresh()
    }, [refresh])

    useMultiTableSubscription(NOTIFICATION_TABLES, {
        enabled: !!userId,
        onAnyChange: refresh
    })

    useEffect(() => {
        const handleRefresh = () => {
            refresh()
            scheduleRetries()
        }
        const handleRegionChange = () => {
            refresh()
            scheduleRetries()
        }
        window.addEventListener('notifications-refresh', handleRefresh)
        window.addEventListener('region-changed', handleRegionChange)
        return () => {
            window.removeEventListener('notifications-refresh', handleRefresh)
            window.removeEventListener('region-changed', handleRegionChange)
            retryTimeoutsRef.current.forEach((t) => clearTimeout(t))
            retryTimeoutsRef.current = []
        }
    }, [refresh, scheduleRetries])

    const markAsRead = useCallback(
        async (dbId) => {
            if (!userId || !dbId) return
            await NotificationsService.markAsRead(userId, dbId)
            setNotifications((prev) => {
                const updated = prev.map((n) => (n.dbId === dbId ? { ...n, isRead: true } : n))
                setCount(computeCount(updated))
                return updated
            })
        },
        [userId]
    )

    const markAllRead = useCallback(async () => {
        if (!userId) return
        setNotifications((prev) => {
            const unreadDbIds = prev.filter((n) => n.source === 'db' && !n.isRead).map((n) => n.dbId)
            if (!unreadDbIds.length) return prev
            NotificationsService.markAllRead(userId, unreadDbIds).catch(() => {})
            const updated = prev.map((n) => (n.source === 'db' ? { ...n, isRead: true } : n))
            setCount(computeCount(updated))
            return updated
        })
    }, [userId])

    const deleteNotification = useCallback(
        async (dbId) => {
            if (!userId || !dbId) return
            await NotificationsService.deleteNotification(userId, dbId)
            setNotifications((prev) => {
                const updated = prev.filter((n) => n.dbId !== dbId)
                setCount(computeCount(updated))
                return updated
            })
        },
        [userId]
    )

    return {
        count,
        deleteNotification,
        loading,
        markAllRead,
        markAsRead,
        notifications,
        refresh
    }
}
export default useNotifications
