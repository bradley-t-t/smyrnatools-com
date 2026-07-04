export const AUTH_FUNCTION = '/auth-service'

export const FIELD_LABEL_CLASS = 'block text-[11px] font-semibold uppercase tracking-wider mb-2'

export const FieldStyle = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-light)',
    color: 'var(--text-primary)'
}

/** Maximum allowed average brightness for the accent color so it still
 *  reads on a white background. Custom colors brighter than this are
 *  scaled down before being persisted. */
export const MAX_BRIGHTNESS_HEX = '#D6D6D6'
const MAX_BRIGHTNESS_VALUE = 214

export const START_PAGE_OPTIONS = [
    { icon: 'fa-chart-pie', id: 'Dashboard' },
    { icon: 'fa-truck-moving', id: 'Mixers' },
    { icon: 'fa-truck', id: 'Tractors' },
    { icon: 'fa-trailer', id: 'Trailers' },
    { icon: 'fa-hard-hat', id: 'Operators' },
    { icon: 'fa-cogs', id: 'Heavy Equipment' },
    { icon: 'fa-truck-pickup', id: 'Pickup Trucks' }
]

/** Set of valid start-page view IDs — used to fall back to Dashboard when a
 *  user's stored start page references a removed view (e.g. legacy 'Plan'
 *  after Operations was retired). */
export const VALID_START_PAGE_IDS = new Set(START_PAGE_OPTIONS.map((opt) => opt.id))

export const ACCENT_PRESETS = [
    { color: '#2A3163', name: 'Navy' },
    { color: '#709FFC', name: 'Sky' },
    { color: '#7f1d1d', name: 'Red' },
    { color: '#C34845', name: 'Brick' },
    { color: '#374151', name: 'Gray' },
    { color: '#0a0a0a', name: 'Black' }
]

export const ACCOUNT_TABS = [
    { icon: 'fa-user', id: 'profile', label: 'Profile' },
    { icon: 'fa-shield-halved', id: 'security', label: 'Security' },
    { icon: 'fa-sliders', id: 'preferences', label: 'Preferences' },
    { icon: 'fa-bell', id: 'notifications', label: 'Notifications' }
]

/** Side-nav anchors per tab. Each entry must match a `<section id>` rendered
 *  in the corresponding tab body. */
export const TAB_SECTIONS = {
    notifications: [
        { icon: 'fa-comments', id: 'messages', label: 'Messages' },
        { icon: 'fa-bell', id: 'notifications', label: 'Email notifications' }
    ],
    preferences: [
        { icon: 'fa-rocket', id: 'startpage', label: 'Start page' },
        { icon: 'fa-palette', id: 'appearance', label: 'Appearance' },
        { icon: 'fa-bars', id: 'navigation', label: 'Navigation' },
        { icon: 'fa-graduation-cap', id: 'tutorials', label: 'Tutorials' },
        { icon: 'fa-database', id: 'cache', label: 'Cache' }
    ],
    profile: [
        { icon: 'fa-id-card', id: 'identity', label: 'Identity' },
        { icon: 'fa-building', id: 'scope', label: 'Scope' }
    ],
    security: [
        { icon: 'fa-key', id: 'password', label: 'Password' },
        { icon: 'fa-laptop', id: 'sessions', label: 'Sessions' }
    ]
}

/** Parses a 6-digit hex color string into its {r, g, b} components. */
const getRgbFromHex = (hex) => {
    const cleanHex = hex.replace('#', '')
    return {
        b: parseInt(cleanHex.substring(4, 6), 16),
        g: parseInt(cleanHex.substring(2, 4), 16),
        r: parseInt(cleanHex.substring(0, 2), 16)
    }
}

/** Darkens a color if its average brightness exceeds the threshold, ensuring
 *  sufficient contrast on white backgrounds. */
export const clampColorToMaxBrightness = (hex) => {
    const { b, g, r } = getRgbFromHex(hex)
    const currentBrightness = (r + g + b) / 3
    if (currentBrightness <= MAX_BRIGHTNESS_VALUE) return hex
    const scale = MAX_BRIGHTNESS_VALUE / currentBrightness
    const clampedR = Math.round(r * scale)
    const clampedG = Math.round(g * scale)
    const clampedB = Math.round(b * scale)
    return `#${clampedR.toString(16).padStart(2, '0')}${clampedG.toString(16).padStart(2, '0')}${clampedB.toString(16).padStart(2, '0')}`
}

/** Compact "X years Y months" label from a created_at timestamp. */
export function formatAccountAge(joinedAt) {
    if (!joinedAt) return '—'
    const joined = new Date(joinedAt)
    if (Number.isNaN(joined.getTime())) return '—'
    const now = new Date()
    const months = (now.getFullYear() - joined.getFullYear()) * 12 + (now.getMonth() - joined.getMonth())
    if (months < 1) return 'New'
    if (months < 12) return `${months}mo`
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12
    return remainingMonths === 0 ? `${years}y` : `${years}y ${remainingMonths}mo`
}

export function formatJoinedDate(joinedAt) {
    if (!joinedAt) return '—'
    const d = new Date(joinedAt)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatRelativeTime(timestamp) {
    if (!timestamp) return '—'
    const d = new Date(timestamp)
    if (Number.isNaN(d.getTime())) return '—'
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 5) return 'Active now'
    if (mins < 60) return `${mins}m`
    if (hours < 24) return `${hours}h`
    return `${days}d`
}

/** Variant of `formatRelativeTime` that appends "ago" for elapsed values —
 *  used in the Security tab's session list. */
export function formatSessionTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 5) return 'Active now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
}
