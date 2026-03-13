/**
 * Browser connectivity detection: checks online status via ping endpoints,
 * with mobile-aware timeouts and dual-strategy (Google 204 + local turl.json) verification.
 */
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}
const PING_TIMEOUT = isMobileDevice() ? 15000 : 5000
const NetworkUtility = {
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
            } catch (error) {
                console.error('Google connectivity check failed, falling back to local ping:', error)
            }
        }
        try {
            const res = await fetch(`/turl.json?cb=${Date.now()}`, {
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
    }
}
export default NetworkUtility
export { NetworkUtility }
