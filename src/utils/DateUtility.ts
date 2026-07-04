/**
 * Date parsing, formatting, and comparison helpers.
 * Provides ISO week calculation, database timestamp formatting,
 * staleness checks, timezone-safe local date handling,
 * and human-readable display formatting with ordinal suffixes.
 */

type DateInput = Date | string | number | null | undefined

const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
] as const

function ordinalSuffix(day: number): string {
    if (day % 10 === 1 && day !== 11) return 'st'
    if (day % 10 === 2 && day !== 12) return 'nd'
    if (day % 10 === 3 && day !== 13) return 'rd'
    return 'th'
}

function parse(d: DateInput): Date | null {
    if (!d) return null
    const date = d instanceof Date ? d : new Date(d)
    return isNaN(date.getTime()) ? null : date
}

function parseLocalDate(dateString: DateInput): Date | null {
    if (!dateString) return null
    const str = String(dateString).split('T')[0]
    const [year, month, day] = str.split('-').map(Number)
    if (!year || !month || !day) return null
    const date = new Date(year, month - 1, day, 0, 0, 0, 0)
    return isNaN(date.getTime()) ? null : date
}

function daysSince(d: DateInput): number | null {
    const date = parse(d)
    if (!date) return null
    return Math.ceil((Date.now() - date.getTime()) / 86400000)
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return ''
    const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
        ? dateStr
        : /^\d{4}-\d{2}-\d{2}T/.test(dateStr)
          ? dateStr.slice(0, 10)
          : null
    if (isoDateOnly) {
        const [y, m, d] = isoDateOnly.split('-').map((n) => parseInt(n, 10))
        if (!y || !m || !d) return dateStr
        const monthName = MONTH_NAMES[m - 1] || ''
        return `${monthName} ${d}${ordinalSuffix(d)}, ${y}`
    }
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
    const formatted = date.toLocaleDateString('en-US', options)
    const day = date.getDate()
    return formatted.replace(`${day}`, `${day}${ordinalSuffix(day)}`)
}

function formatDateTime(dateStr: string | null | undefined): string {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        year: 'numeric'
    }
    return date.toLocaleString('en-US', options)
}

/** Formats a date string into an HTML datetime-local input value (YYYY-MM-DDTHH:MM). */
function formatDateTimeLocal(dateStr: string | null | undefined): string {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return ''
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d}T${h}:${min}`
}

function formatPendingDate(d: string | null | undefined): string {
    if (!d) return '-'
    if (d.length === 10 && /\d{4}-\d{2}-\d{2}/.test(d)) return d
    try {
        return new Date(d).toISOString().slice(0, 10)
    } catch {
        return d
    }
}

function getISOWeek(date: DateInput): number {
    const d = new Date(date as string | number | Date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function isStale(d: DateInput, ttlMs: number): boolean {
    const date = parse(d)
    if (!date) return true
    return Date.now() - date.getTime() > ttlMs
}

function toDbTimestamp(d: DateInput): string | null {
    const date = parse(d)
    if (!date) return null
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    const s = String(date.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${day} ${h}:${min}:${s}+00`
}

function nowDb(): string | null {
    return toDbTimestamp(new Date())
}

function toDbDate(d: DateInput): string | null {
    if (!d) return null
    const date = d instanceof Date ? d : parseLocalDate(d)
    if (!date) return null
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${day} 00:00:00+00`
}

function toISO(d: DateInput): string | null {
    const date = parse(d)
    return date ? date.toISOString() : null
}

function toLocalDateString(d: DateInput): string {
    if (!d) return ''
    const date = d instanceof Date ? d : parseLocalDate(d)
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/** Formats a Date to a database-compatible timestamp string: `YYYY-MM-DD HH:MM:SS+00`. */
function formatDateForDb(date: DateInput): string | null {
    if (!date) return null
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return null
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    const s = String(d.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${day} ${h}:${min}:${s}+00`
}

/** Returns a human-readable relative time string (e.g. "5m ago", "3d ago"). */
function formatTimeAgo(dateString: string | null | undefined): string {
    if (!dateString) return ''
    const diffMs = Date.now() - new Date(dateString).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return new Date(dateString).toLocaleDateString()
}

const DateUtility = {
    daysSince,
    formatDate,
    formatDateForDb,
    formatDateTime,
    formatDateTimeLocal,
    formatPendingDate,
    formatTimeAgo,
    getISOWeek,
    isStale,
    nowDb,
    parse,
    parseLocalDate,
    toDbDate,
    toDbTimestamp,
    toISO,
    toLocalDateString
}

export default DateUtility
export { DateUtility }
