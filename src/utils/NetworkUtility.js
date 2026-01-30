const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

const PING_TIMEOUT = isMobileDevice() ? 15000 : 5000

const NetworkUtility = {
    addNetworkListeners(onlineCallback, offlineCallback) {
        if (!onlineCallback || !offlineCallback) throw new Error('Callbacks are required')
        window.addEventListener('online', onlineCallback)
        window.addEventListener('offline', offlineCallback)
        return () => {
            window.removeEventListener('online', onlineCallback)
            window.removeEventListener('offline', offlineCallback)
        }
    },
    addOfflineListener(callback) {
        if (typeof callback !== 'function') return
        window.addEventListener('offline', callback)
    },
    addOnlineListener(callback) {
        if (typeof callback !== 'function') return
        window.addEventListener('online', callback)
    },
    async checkConnection() {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT)

        if (!isMobileDevice()) {
            try {
                await fetch('https://clients3.google.com/generate_204', {
                    cache: 'no-store',
                    credentials: 'omit',
                    method: 'GET',
                    mode: 'no-cors',
                    signal: controller.signal
                })
                clearTimeout(timeoutId)
                return true
            } catch {}
        }

        try {
            const res = await fetch(`/version.json?cb=${Date.now()}`, {
                cache: 'reload',
                method: 'GET',
                signal: controller.signal
            })
            clearTimeout(timeoutId)
            return !!res?.ok
        } catch {
            clearTimeout(timeoutId)
            return false
        }
    },
    isMobileDevice() {
        return isMobileDevice()
    },
    isOnline() {
        return navigator.onLine
    },
    removeOfflineListener(callback) {
        if (typeof callback !== 'function') return
        window.removeEventListener('offline', callback)
    },
    removeOnlineListener(callback) {
        if (typeof callback !== 'function') return
        window.removeEventListener('online', callback)
    }
}

export default NetworkUtility
export { NetworkUtility }
