import { CacheUtility } from '../utils/CacheUtility'

const VERSION_CACHE_KEY = 'app:version'
const VERSION_CACHE_TTL_MS = 60_000

/**
 * Fetches the current app version from turl.json with a 60-second cache TTL.
 * Falls back to an empty string on network or parse failure.
 */
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

/** Provides application-level metadata such as the deployed version. */
export const AppService = { getVersion }
export default AppService
