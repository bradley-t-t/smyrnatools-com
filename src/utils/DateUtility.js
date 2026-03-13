/**
 * Date parsing, formatting, and comparison helpers.
 * Provides ISO week calculation, database timestamp formatting,
 * staleness checks, timezone-safe local date handling,
 * and human-readable display formatting with ordinal suffixes.
 */
const DateUtility = {
    daysSince(d) {
        const date = this.parse(d)
        if (!date) return null
        return Math.ceil((Date.now() - date.getTime()) / 86400000)
    },
    formatDate(dateStr) {
        if (!dateStr) return ''
        const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
            ? dateStr
            : /^\d{4}-\d{2}-\d{2}T/.test(dateStr)
              ? dateStr.slice(0, 10)
              : null
        if (isoDateOnly) {
            const [y, m, d] = isoDateOnly.split('-').map((n) => parseInt(n, 10))
            if (!y || !m || !d) return dateStr
            const monthNames = [
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
            ]
            const monthName = monthNames[m - 1] || ''
            let suffix = 'th'
            if (d % 10 === 1 && d !== 11) suffix = 'st'
            else if (d % 10 === 2 && d !== 12) suffix = 'nd'
            else if (d % 10 === 3 && d !== 13) suffix = 'rd'
            return `${monthName} ${d}${suffix}, ${y}`
        }
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return dateStr
        const options = { day: 'numeric', month: 'long', year: 'numeric' }
        const formatted = date.toLocaleDateString('en-US', options)
        const day = date.getDate()
        let suffix = 'th'
        if (day % 10 === 1 && day !== 11) suffix = 'st'
        else if (day % 10 === 2 && day !== 12) suffix = 'nd'
        else if (day % 10 === 3 && day !== 13) suffix = 'rd'
        return formatted.replace(`${day}`, `${day}${suffix}`)
    },
    formatDateTime(dateStr) {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return dateStr
        const options = { day: 'numeric', hour: '2-digit', minute: '2-digit', month: 'short', year: 'numeric' }
        return date.toLocaleString('en-US', options)
    },
    formatPendingDate(d) {
        if (!d) return '-'
        if (d.length === 10 && /\d{4}-\d{2}-\d{2}/.test(d)) return d
        try {
            return new Date(d).toISOString().slice(0, 10)
        } catch {
            return d
        }
    },
    getISOWeek(date) {
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        d.setDate(d.getDate() + 4 - (d.getDay() || 7))
        const yearStart = new Date(d.getFullYear(), 0, 1)
        return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
    },
    isStale(d, ttlMs) {
        const date = this.parse(d)
        if (!date) return true
        return Date.now() - date.getTime() > ttlMs
    },
    nowDb() {
        return this.toDbTimestamp(new Date())
    },
    parse(d) {
        if (!d) return null
        const date = d instanceof Date ? d : new Date(d)
        return isNaN(date.getTime()) ? null : date
    },
    parseLocalDate(dateString) {
        if (!dateString) return null
        const str = String(dateString).split('T')[0]
        const [year, month, day] = str.split('-').map(Number)
        if (!year || !month || !day) return null
        const date = new Date(year, month - 1, day, 0, 0, 0, 0)
        return isNaN(date.getTime()) ? null : date
    },
    toDbDate(d) {
        if (!d) return null
        const date = d instanceof Date ? d : this.parseLocalDate(d)
        if (!date) return null
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${y}-${m}-${day} 00:00:00+00`
    },
    toDbTimestamp(d) {
        const date = this.parse(d)
        if (!date) return null
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const h = String(date.getHours()).padStart(2, '0')
        const min = String(date.getMinutes()).padStart(2, '0')
        const s = String(date.getSeconds()).padStart(2, '0')
        return `${y}-${m}-${day} ${h}:${min}:${s}+00`
    },
    toISO(d) {
        const date = this.parse(d)
        return date ? date.toISOString() : null
    },
    toLocalDateString(d) {
        if (!d) return ''
        const date = d instanceof Date ? d : this.parseLocalDate(d)
        if (!date) return ''
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }
}
export default DateUtility
export { DateUtility }
