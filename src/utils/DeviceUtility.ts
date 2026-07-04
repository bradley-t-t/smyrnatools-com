/**
 * Shared device detection utilities used across presence tracking
 * and install prompt services.
 */

type DeviceType = 'mobile' | 'desktop'
type PlatformType = 'ios' | 'android' | 'desktop'

interface NavigatorWithStandalone extends Navigator {
    standalone?: boolean
}

/**
 * Detects whether the user is on a mobile or desktop device.
 * Checks user-agent, touch points, media queries, and standalone mode
 * to handle edge cases like iPadOS reporting as Macintosh.
 */
export function detectDeviceType(): DeviceType {
    if (typeof navigator === 'undefined') return 'desktop'
    const ua = navigator.userAgent || ''
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'mobile'
    if (/iPad/i.test(ua)) return 'mobile'
    if ((navigator as NavigatorWithStandalone).standalone) return 'mobile'
    if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'mobile'
    if (navigator.maxTouchPoints > 1 && window.innerWidth < 1024) return 'mobile'
    if (window.matchMedia?.('(pointer: coarse)')?.matches && window.innerWidth < 1024) return 'mobile'
    return 'desktop'
}

/**
 * Detects the user's platform for install prompt targeting.
 * Returns 'ios', 'android', or 'desktop'.
 */
export function detectPlatformType(): PlatformType {
    const ua = (navigator.userAgent ||
        (navigator as unknown as Record<string, unknown>).vendor ||
        (window as unknown as Record<string, unknown>).opera) as string
    if (/iPad|iPhone|iPod/.test(ua) && !(window as unknown as Record<string, unknown>).MSStream) return 'ios'
    if (/android/i.test(ua)) return 'android'
    return 'desktop'
}
