import { CacheUtility } from '../utils/CacheUtility'

const VERSION_CACHE_KEY = 'app:version'
const VERSION_CACHE_TTL_MS = 60_000

async function getVersion() {
    const cached = CacheUtility.get(VERSION_CACHE_KEY)
    if (cached) return cached

    try {
        const response = await fetch('/turl.json', { cache: 'no-store' })
        if (!response.ok) throw new Error('failed')
        const { version = '' } = await response.json()
        return CacheUtility.set(VERSION_CACHE_KEY, version, VERSION_CACHE_TTL_MS)
    } catch {
        return CacheUtility.set(VERSION_CACHE_KEY, '', VERSION_CACHE_TTL_MS)
    }
}

export const AppService = { getVersion }
export default AppService
