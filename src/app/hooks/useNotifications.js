import { useCallback, useEffect, useRef, useState } from 'react'

import NotificationsService from '../../services/NotificationsService'
import { useMultiTableSubscription } from './useRealtimeSubscription'
const NOTIFICATION_TABLES = ['list_items', 'mixers', 'equipment', 'tractors']
/**
 * Manages notification badge data, fetching from NotificationsService on mount
 * and auto-refreshing via Supabase realtime subscriptions and custom events.
 */
export function useNotifications(userId, selectedRegion) {
    const [notifications, setNotifications] = useState([])
    const [count, setCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const refreshSeqRef = useRef(0)
    const retryTimeoutsRef = useRef([])
    const refresh = useCallback(async () => {
        if (!userId) {
            setNotifications([])
            setCount(0)
            return
        }
        setLoading(true)
        const seq = ++refreshSeqRef.current
        try {
            const list = await NotificationsService.getNotifications(userId, selectedRegion)
            if (refreshSeqRef.current === seq) {
                const validList = Array.isArray(list) ? list : []
                setNotifications(validList)
                setCount(validList.length)
                setLoading(false)
            }
        } catch (error) {
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
            const t = setTimeout(() => {
                refresh()
            }, delay)
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
    return {
        count,
        loading,
        notifications,
        refresh
    }
}
export default useNotifications
