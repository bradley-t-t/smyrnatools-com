/**
 * Shared device detection utilities used across presence tracking
 * and install prompt services.
 */

/**
 * Detects whether the user is on a mobile or desktop device.
 * Checks user-agent, touch points, media queries, and standalone mode
 * to handle edge cases like iPadOS reporting as Macintosh.
 */
export function detectDeviceType() {
    if (typeof navigator === 'undefined') return 'desktop'
    const ua = navigator.userAgent || ''
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'mobile'
    if (/iPad/i.test(ua)) return 'mobile'
    if (navigator.standalone) return 'mobile'
    if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'mobile'
    if (navigator.maxTouchPoints > 1 && window.innerWidth < 1024) return 'mobile'
    if (window.matchMedia?.('(pointer: coarse)')?.matches && window.innerWidth < 1024) return 'mobile'
    return 'desktop'
}

/**
 * Detects the user's platform for install prompt targeting.
 * Returns 'ios', 'android', or 'desktop'.
 */
export function detectPlatformType() {
    const ua = navigator.userAgent || navigator.vendor || window.opera
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios'
    if (/android/i.test(ua)) return 'android'
    return 'desktop'
}
