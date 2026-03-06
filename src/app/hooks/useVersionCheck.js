import { useCallback, useEffect, useRef, useState } from 'react'

const VERSION_POLL_INTERVAL = 5 * 60 * 1000 // 5 minutes

async function fetchDeployedVersion() {
    const res = await fetch('/nit.json', { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to fetch version')
    const data = await res.json()
    return data.version ?? null
}

/**
 * Polls /nit.json every 5 minutes and signals when the deployed version
 * has changed since the page was first loaded.
 * @returns {{ hasUpdate: boolean, dismiss: () => void }}
 */
export function useVersionCheck() {
    const [hasUpdate, setHasUpdate] = useState(false)
    const loadedVersionRef = useRef(null)
    const dismissedRef = useRef(false)

    const check = useCallback(async () => {
        if (dismissedRef.current) return
        try {
            const version = await fetchDeployedVersion()
            if (loadedVersionRef.current === null) {
                loadedVersionRef.current = version
            } else if (version && version !== loadedVersionRef.current) {
                setHasUpdate(true)
            }
        } catch {
            // silently ignore — network may be unavailable
        }
    }, [])

    useEffect(() => {
        check()
        const interval = setInterval(check, VERSION_POLL_INTERVAL)
        return () => clearInterval(interval)
    }, [check])

    const dismiss = useCallback(() => {
        dismissedRef.current = true
        setHasUpdate(false)
    }, [])

    return { dismiss, hasUpdate }
}
