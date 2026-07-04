/**
 * PlanStatisticsRange — period selector math for the Plan Statistics
 * dashboard. Builds the current + comparison ISO ranges, advances the
 * anchor by one calendar unit at a time, and labels each window in the
 * format the period selector expects.
 */
import { fmtRange, parseIsoLocal } from './PlanStatisticsFormatUtility'
import { getTodayDate } from './PlanUtility'

import {
    daysBetween,
    endOfMonth,
    endOfQuarter,
    endOfYear,
    isoDate,
    mondayOf,
    offsetIso,
    startOfMonth,
    startOfQuarter,
    startOfYear
} from './PlanStatisticsDates'

/**
 * Build the period range (current + comparison) given the selector state.
 * Periods are CALENDAR-aligned, not rolling: Week is Mon–Sat of the anchor's
 * week, Month is the 1st through the last day of the anchor's month, etc.
 * Comparisons hop to the previous calendar period (or same calendar slot
 * one year prior) so deltas always compare like-for-like windows.
 */
export const buildRange = (period, anchorIso, comparison, customStart, customEnd) => {
    /* CST anchor for "no anchorIso supplied" — the dispatcher's "today"
     * is Smyrna's wall clock, not the browser's local timezone. */
    const anchor = parseIsoLocal(anchorIso) || parseIsoLocal(getTodayDate())
    let startD
    let endD
    if (period === 'custom') {
        startD = parseIsoLocal(customStart || anchorIso) || anchor
        endD = parseIsoLocal(customEnd || anchorIso) || anchor
    } else if (period === 'day') {
        startD = new Date(anchor)
        endD = new Date(anchor)
    } else if (period === 'week') {
        startD = mondayOf(anchor) // Monday of this week
        endD = new Date(startD)
        endD.setDate(endD.getDate() + 5) // Saturday — Sunday excluded everywhere
    } else if (period === 'month') {
        startD = startOfMonth(anchor)
        endD = endOfMonth(anchor)
    } else if (period === 'quarter') {
        startD = startOfQuarter(anchor)
        endD = endOfQuarter(anchor)
    } else if (period === 'year') {
        startD = startOfYear(anchor)
        endD = endOfYear(anchor)
    } else {
        startD = new Date(anchor)
        endD = new Date(anchor)
    }
    const start = isoDate(startD)
    const end = isoDate(endD)
    const span = daysBetween(start, end)

    let prevStart = null
    let prevEnd = null
    if (comparison === 'previous') {
        if (period === 'day') {
            const d = new Date(startD)
            d.setDate(d.getDate() - 1)
            prevStart = isoDate(d)
            prevEnd = isoDate(d)
        } else if (period === 'week') {
            const ps = new Date(startD)
            ps.setDate(ps.getDate() - 7)
            const pe = new Date(ps)
            pe.setDate(pe.getDate() + 5)
            prevStart = isoDate(ps)
            prevEnd = isoDate(pe)
        } else if (period === 'month') {
            const ps = new Date(startD.getFullYear(), startD.getMonth() - 1, 1)
            const pe = new Date(startD.getFullYear(), startD.getMonth(), 0)
            prevStart = isoDate(ps)
            prevEnd = isoDate(pe)
        } else if (period === 'quarter') {
            const ps = new Date(startD.getFullYear(), startD.getMonth() - 3, 1)
            const pe = new Date(startD.getFullYear(), startD.getMonth(), 0)
            prevStart = isoDate(ps)
            prevEnd = isoDate(pe)
        } else if (period === 'year') {
            const ps = new Date(startD.getFullYear() - 1, 0, 1)
            const pe = new Date(startD.getFullYear() - 1, 11, 31)
            prevStart = isoDate(ps)
            prevEnd = isoDate(pe)
        } else {
            // Custom — match the same span just before the start.
            prevEnd = offsetIso(start, -1)
            prevStart = offsetIso(prevEnd, -(span - 1))
        }
    } else if (comparison === 'lastYear') {
        const ps = new Date(startD)
        const pe = new Date(endD)
        ps.setFullYear(ps.getFullYear() - 1)
        pe.setFullYear(pe.getFullYear() - 1)
        prevStart = isoDate(ps)
        prevEnd = isoDate(pe)
    }
    return {
        current: { end, start },
        previous: prevStart && prevEnd ? { end: prevEnd, start: prevStart } : null,
        span
    }
}

/**
 * Calendar-aware label for the current period — "April 2026", "Q2 2026",
 * the Mon–Sat range for weeks, or a single date for a single day. Falls
 * back to a date range for custom selections.
 */
export const formatPeriodLabel = (period, range) => {
    const sd = parseIsoLocal(range.current.start)
    const ed = parseIsoLocal(range.current.end)
    if (!sd || !ed) return fmtRange(range.current.start, range.current.end)
    if (period === 'day') {
        return sd.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short', year: 'numeric' })
    }
    if (period === 'month') {
        return sd.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    if (period === 'quarter') {
        return `Q${Math.floor(sd.getMonth() / 3) + 1} ${sd.getFullYear()}`
    }
    if (period === 'year') {
        return String(sd.getFullYear())
    }
    return fmtRange(range.current.start, range.current.end)
}

/**
 * Advance / rewind an anchor ISO date by one calendar unit of `period`.
 * Day = ±1 day, Week = ±7 days (lands on the previous/next Monday since
 * the anchor maps to the same week regardless of weekday), Month = the
 * same day-of-month in the next/previous calendar month, Quarter = the
 * same day-of-month three calendar months away.
 */
export const shiftAnchor = (anchorIso, period, direction) => {
    /* CST anchor for "no anchorIso supplied" — same reasoning as
     * `buildRange` above; defer to Smyrna's wall clock, not the browser. */
    const base = parseIsoLocal(anchorIso) || parseIsoLocal(getTodayDate()) || new Date()
    if (period === 'day') {
        base.setDate(base.getDate() + direction)
    } else if (period === 'week') {
        base.setDate(base.getDate() + direction * 7)
    } else if (period === 'month') {
        base.setMonth(base.getMonth() + direction)
    } else if (period === 'quarter') {
        base.setMonth(base.getMonth() + direction * 3)
    } else if (period === 'year') {
        base.setFullYear(base.getFullYear() + direction)
    } else {
        base.setDate(base.getDate() + direction)
    }
    return isoDate(base)
}
