import { detectDeviceType } from './DeviceUtility'

/** Time (ms) after which a presence record / active-device entry is considered stale. */
export const STALE_THRESHOLD = 5 * 60 * 1000

/** Interval (ms) between heartbeat pings for the current user. */
export const HEARTBEAT_INTERVAL_MS = 30000

/** Throttle window (ms) so user-activity events don't spam the server. */
export const ACTIVITY_THROTTLE_MS = 30000

/** Interval (ms) for stale-record cleanup + listener refresh. */
export const CLEANUP_INTERVAL_MS = 60000

/**
 * Build a `{ roleName → hsl color }` map for the given roles, ranked by weight
 * (highest weight = hue 0, lowest = hue 120). Returns an empty object for no roles.
 */
export function buildRoleColorMap(roles) {
    if (!roles?.length) return {}
    const sorted = [...roles].sort((a, b) => (b.weight || 0) - (a.weight || 0))
    return Object.fromEntries(
        sorted.map((role, index) => {
            const hue = sorted.length === 1 ? 0 : Math.round((index / (sorted.length - 1)) * 120)
            return [role.name.toLowerCase(), `hsl(${hue}, 72%, 42%)`]
        })
    )
}

/** Pull a region code out of a user profile, preferring the first entry of `regions`. */
export function extractRegionCode(profile) {
    if (!profile) return null
    if (Array.isArray(profile.regions) && profile.regions.length > 0) return profile.regions[0]
    return profile.region_code || profile.regionCode || null
}

/** Normalize a roles payload (strings or `{ name }` objects) into a flat list of role names. */
export function extractRoleNames(rolesData) {
    if (!Array.isArray(rolesData)) return []
    return rolesData.map((r) => (typeof r === 'string' ? r : (r?.name ?? null))).filter(Boolean)
}

/**
 * Sorted list of device types active within `STALE_THRESHOLD`. When `isSelf` is true,
 * the current detected device is always included. Falls back to `['desktop']` if empty.
 */
export function getActiveDevices(activeDevices, isSelf) {
    const now = Date.now()
    const recentDevices =
        activeDevices && typeof activeDevices === 'object'
            ? Object.entries(activeDevices)
                  .filter(([, timestamp]) => timestamp && now - new Date(timestamp).getTime() < STALE_THRESHOLD)
                  .map(([type]) => type)
            : []
    if (isSelf) {
        const current = detectDeviceType()
        if (!recentDevices.includes(current)) recentDevices.push(current)
    }
    if (recentDevices.length === 0) recentDevices.push('desktop')
    return recentDevices.sort()
}
