import { DateUtility } from '../DateUtility'

describe('DateUtility', () => {
    describe('parse', () => {
        it('returns a Date for a valid ISO string', () => {
            const result = DateUtility.parse('2025-06-15T12:00:00Z')
            expect(result).toBeInstanceOf(Date)
            expect(result.getFullYear()).toBe(2025)
        })

        it('returns the same Date if already a Date', () => {
            const d = new Date('2025-01-01')
            expect(DateUtility.parse(d)).toBe(d)
        })

        it('returns null for falsy input', () => {
            expect(DateUtility.parse(null)).toBeNull()
            expect(DateUtility.parse('')).toBeNull()
            expect(DateUtility.parse(undefined)).toBeNull()
        })

        it('returns null for invalid date strings', () => {
            expect(DateUtility.parse('not-a-date')).toBeNull()
        })
    })

    describe('formatDate', () => {
        it('formats YYYY-MM-DD with ordinal suffix', () => {
            expect(DateUtility.formatDate('2025-06-01')).toBe('June 1st, 2025')
            expect(DateUtility.formatDate('2025-06-02')).toBe('June 2nd, 2025')
            expect(DateUtility.formatDate('2025-06-03')).toBe('June 3rd, 2025')
            expect(DateUtility.formatDate('2025-06-04')).toBe('June 4th, 2025')
        })

        it('handles 11th, 12th, 13th correctly (no st/nd/rd)', () => {
            expect(DateUtility.formatDate('2025-06-11')).toBe('June 11th, 2025')
            expect(DateUtility.formatDate('2025-06-12')).toBe('June 12th, 2025')
            expect(DateUtility.formatDate('2025-06-13')).toBe('June 13th, 2025')
        })

        it('handles 21st, 22nd, 23rd', () => {
            expect(DateUtility.formatDate('2025-06-21')).toBe('June 21st, 2025')
            expect(DateUtility.formatDate('2025-06-22')).toBe('June 22nd, 2025')
            expect(DateUtility.formatDate('2025-06-23')).toBe('June 23rd, 2025')
        })

        it('strips time from ISO datetime strings', () => {
            expect(DateUtility.formatDate('2025-03-15T10:30:00Z')).toBe('March 15th, 2025')
        })

        it('returns empty string for falsy input', () => {
            expect(DateUtility.formatDate('')).toBe('')
            expect(DateUtility.formatDate(null)).toBe('')
        })
    })

    describe('formatDateTime', () => {
        it('returns empty string for falsy input', () => {
            expect(DateUtility.formatDateTime('')).toBe('')
        })

        it('returns the raw string for unparseable input', () => {
            expect(DateUtility.formatDateTime('garbage')).toBe('garbage')
        })

        it('formats a valid date with time', () => {
            const result = DateUtility.formatDateTime('2025-06-15T14:30:00')
            expect(result).toMatch(/Jun/)
            expect(result).toMatch(/2025/)
        })
    })

    describe('formatPendingDate', () => {
        it('returns dash for falsy input', () => {
            expect(DateUtility.formatPendingDate('')).toBe('-')
            expect(DateUtility.formatPendingDate(null)).toBe('-')
        })

        it('passes through a 10-char YYYY-MM-DD as-is', () => {
            expect(DateUtility.formatPendingDate('2025-06-15')).toBe('2025-06-15')
        })

        it('extracts YYYY-MM-DD from an ISO datetime', () => {
            expect(DateUtility.formatPendingDate('2025-06-15T14:30:00Z')).toBe('2025-06-15')
        })
    })

    describe('parseLocalDate', () => {
        it('creates a local-midnight Date from YYYY-MM-DD', () => {
            const d = DateUtility.parseLocalDate('2025-06-15')
            expect(d.getFullYear()).toBe(2025)
            expect(d.getMonth()).toBe(5) // June = 5
            expect(d.getDate()).toBe(15)
            expect(d.getHours()).toBe(0)
        })

        it('strips time portion before parsing', () => {
            const d = DateUtility.parseLocalDate('2025-06-15T14:30:00Z')
            expect(d.getDate()).toBe(15)
        })

        it('returns null for falsy input', () => {
            expect(DateUtility.parseLocalDate(null)).toBeNull()
            expect(DateUtility.parseLocalDate('')).toBeNull()
        })
    })

    describe('toDbTimestamp', () => {
        it('formats a Date into DB timestamp format', () => {
            const d = new Date(2025, 5, 15, 14, 30, 45) // June 15 2025 14:30:45
            const result = DateUtility.toDbTimestamp(d)
            expect(result).toBe('2025-06-15 14:30:45+00')
        })

        it('returns null for invalid input', () => {
            expect(DateUtility.toDbTimestamp(null)).toBeNull()
            expect(DateUtility.toDbTimestamp('garbage')).toBeNull()
        })
    })

    describe('toDbDate', () => {
        it('formats a Date to DB date with zeroed time', () => {
            const d = new Date(2025, 5, 15, 14, 30, 45)
            expect(DateUtility.toDbDate(d)).toBe('2025-06-15 00:00:00+00')
        })

        it('parses a string and formats it', () => {
            expect(DateUtility.toDbDate('2025-06-15')).toBe('2025-06-15 00:00:00+00')
        })
    })

    describe('toLocalDateString', () => {
        it('formats a Date to YYYY-MM-DD', () => {
            const d = new Date(2025, 0, 5)
            expect(DateUtility.toLocalDateString(d)).toBe('2025-01-05')
        })

        it('returns empty string for falsy input', () => {
            expect(DateUtility.toLocalDateString('')).toBe('')
        })
    })

    describe('toISO', () => {
        it('converts valid input to ISO string', () => {
            const d = new Date('2025-06-15T12:00:00Z')
            expect(DateUtility.toISO(d)).toBe('2025-06-15T12:00:00.000Z')
        })

        it('returns null for invalid input', () => {
            expect(DateUtility.toISO('garbage')).toBeNull()
        })
    })

    describe('daysSince', () => {
        it('returns the number of days since a past date', () => {
            const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString()
            const result = DateUtility.daysSince(twoDaysAgo)
            expect(result).toBeGreaterThanOrEqual(2)
            expect(result).toBeLessThanOrEqual(3)
        })

        it('returns null for invalid input', () => {
            expect(DateUtility.daysSince('garbage')).toBeNull()
        })
    })

    describe('isStale', () => {
        it('returns true when elapsed time exceeds TTL', () => {
            const old = new Date(Date.now() - 60000).toISOString()
            expect(DateUtility.isStale(old, 30000)).toBe(true)
        })

        it('returns false when within TTL', () => {
            const recent = new Date().toISOString()
            expect(DateUtility.isStale(recent, 60000)).toBe(false)
        })

        it('returns true for invalid date input', () => {
            expect(DateUtility.isStale(null, 1000)).toBe(true)
        })
    })

    describe('getISOWeek', () => {
        it('returns week 1 for early January', () => {
            // Jan 1 2024 is a Monday — ISO week 1
            expect(DateUtility.getISOWeek(new Date(2024, 0, 1))).toBe(1)
        })

        it('returns correct week for mid-year', () => {
            // June 15 2025 is ISO week 24
            const week = DateUtility.getISOWeek(new Date(2025, 5, 15))
            expect(week).toBeGreaterThan(0)
            expect(week).toBeLessThanOrEqual(53)
        })
    })

    describe('formatDateTimeLocal', () => {
        it('formats a Date to YYYY-MM-DDTHH:MM', () => {
            const result = DateUtility.formatDateTimeLocal('2025-06-15T14:30:00')
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
        })

        it('returns empty string for falsy or invalid input', () => {
            expect(DateUtility.formatDateTimeLocal('')).toBe('')
            expect(DateUtility.formatDateTimeLocal('bad')).toBe('')
        })
    })

    describe('formatTimeAgo', () => {
        it('returns "just now" for very recent timestamps', () => {
            expect(DateUtility.formatTimeAgo(new Date().toISOString())).toBe('just now')
        })

        it('returns minutes ago format', () => {
            const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString()
            expect(DateUtility.formatTimeAgo(fiveMinAgo)).toBe('5m ago')
        })

        it('returns hours ago format', () => {
            const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString()
            expect(DateUtility.formatTimeAgo(threeHoursAgo)).toBe('3h ago')
        })

        it('returns days ago format', () => {
            const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString()
            expect(DateUtility.formatTimeAgo(fiveDaysAgo)).toBe('5d ago')
        })

        it('returns empty string for falsy input', () => {
            expect(DateUtility.formatTimeAgo('')).toBe('')
        })
    })
})
