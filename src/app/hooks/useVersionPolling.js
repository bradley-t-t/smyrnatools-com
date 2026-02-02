import { useEffect } from 'react'

export function useVersionPolling(
    currentVersion,
    updateMode,
    showUpdateWarning,
    scheduledAt,
    setLatestVersion,
    setShowUpdateWarning
) {
    useEffect(() => {
        if (!currentVersion) return

        const hasMajorVersionChange = (newVer, oldVer) => {
            const newMajor = parseInt(newVer.split('.')[0], 10) || 0
            const oldMajor = parseInt(oldVer.split('.')[0], 10) || 0
            return newMajor > oldMajor
        }

        const pollVersion = () => {
            fetch(`/turl.json?t=${Date.now()}`, { cache: 'no-store' })
                .then((res) => res.json())
                .then((data) => {
                    if (data.version && hasMajorVersionChange(data.version, currentVersion)) {
                        setLatestVersion(data.version)
                        if (!updateMode && !showUpdateWarning && !scheduledAt) setShowUpdateWarning(true)
                    }
                })
                .catch(() => {})
        }

        const intervalId = setInterval(pollVersion, 30000)
        return () => clearInterval(intervalId)
    }, [currentVersion, updateMode, showUpdateWarning, scheduledAt, setLatestVersion, setShowUpdateWarning])
}
