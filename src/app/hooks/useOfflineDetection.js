import { useEffect, useRef } from 'react'

import { NetworkUtility } from '../../utils/NetworkUtility'
/**
 * Detects offline state using periodic network checks with streak-based thresholds.
 * Uses different sensitivity on mobile vs desktop to reduce false positives.
 */
export function useOfflineDetection(setOfflineMode) {
    const onlineStreakRef = useRef(0)
    const offlineStreakRef = useRef(0)
    const offlineSinceRef = useRef(null)
    useEffect(() => {
        const isMobile = NetworkUtility.isMobileDevice?.() || false
        const OFFLINE_THRESHOLD = isMobile ? 4 : 2
        const ONLINE_THRESHOLD = isMobile ? 2 : 3
        const MIN_OFFLINE_MS = isMobile ? 20000 : 10000
        const POLL_MS = isMobile ? 8000 : 4000
        let cancelled = false
        const evalStatus = (ok) => {
            if (ok && navigator.onLine) {
                offlineStreakRef.current = 0
                onlineStreakRef.current += 1
                const dwellMet = !offlineSinceRef.current || Date.now() - offlineSinceRef.current >= MIN_OFFLINE_MS
                if (onlineStreakRef.current >= ONLINE_THRESHOLD && dwellMet) {
                    offlineSinceRef.current = null
                    setOfflineMode(false)
                }
            } else {
                onlineStreakRef.current = 0
                offlineStreakRef.current += 1
                if (offlineStreakRef.current >= OFFLINE_THRESHOLD) {
                    if (!offlineSinceRef.current) offlineSinceRef.current = Date.now()
                    setOfflineMode(true)
                }
            }
        }
        const check = async () => {
            const ok = await NetworkUtility.checkConnection()
            if (!cancelled) evalStatus(ok)
        }
        const handleOnline = () => {
            offlineStreakRef.current = 0
            onlineStreakRef.current = ONLINE_THRESHOLD
            offlineSinceRef.current = null
            setOfflineMode(false)
        }
        const handleOffline = () => {
            if (!isMobile) {
                onlineStreakRef.current = 0
                offlineStreakRef.current = OFFLINE_THRESHOLD
                if (!offlineSinceRef.current) offlineSinceRef.current = Date.now()
                setOfflineMode(true)
            }
        }
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        check()
        const intervalId = setInterval(check, POLL_MS)
        return () => {
            cancelled = true
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
            clearInterval(intervalId)
        }
    }, [setOfflineMode])
    return { offlineSinceRef, offlineStreakRef, onlineStreakRef }
}
