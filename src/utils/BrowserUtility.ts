/**
 * Extracts browser, OS, and device type from the user-agent string.
 * Shared across auth session creation and account management.
 */

type BrowserName = 'Firefox' | 'Edge' | 'Opera' | 'Chrome' | 'Safari' | 'Unknown Browser'
type OSName = 'Windows' | 'macOS' | 'Android' | 'iOS' | 'Linux' | 'Unknown OS'
type DeviceType = 'Mobile' | 'Tablet' | 'Desktop'

interface BrowserMetadata {
    browser: BrowserName
    device: DeviceType
    os: OSName
    userAgent: string
}

export function getBrowserName(userAgent: string): BrowserName {
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Edg')) return 'Edge'
    if (userAgent.includes('OPR') || userAgent.includes('Opera')) return 'Opera'
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Safari')) return 'Safari'
    return 'Unknown Browser'
}

export function getOSName(userAgent: string): OSName {
    if (userAgent.includes('Windows')) return 'Windows'
    if (userAgent.includes('Mac')) return 'macOS'
    if (userAgent.includes('Android')) return 'Android'
    if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS'
    if (userAgent.includes('Linux')) return 'Linux'
    return 'Unknown OS'
}

export function getDeviceType(userAgent: string): DeviceType {
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) return 'Mobile'
    if (userAgent.includes('iPad') || userAgent.includes('Tablet')) return 'Tablet'
    return 'Desktop'
}

/** Convenience bundle for session-row writes — browser/os/device + raw UA. */
export function getBrowserMetadata(): BrowserMetadata {
    const userAgent = navigator.userAgent
    return {
        browser: getBrowserName(userAgent),
        device: getDeviceType(userAgent),
        os: getOSName(userAgent),
        userAgent
    }
}
