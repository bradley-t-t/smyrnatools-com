/**
 * Determines whether an asset is currently verified by checking that
 * the last verification timestamp is more recent than the most recent
 * Monday at 5 PM CST and that no updates occurred after verification.
 *
 * Also provides due-date severity using Central Time zone awareness.
 * Returns "Past Due" (error) or "Due" (warning) based on the Friday 10 AM CT
 * through Monday 5 PM CT past-due window.
 */

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CENTRAL_TIME_FORMAT_OPTIONS = {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    timeZone: 'America/Chicago',
    weekday: 'short'
}
const FRIDAY_INDEX = 5
const SATURDAY_INDEX = 6
const SUNDAY_INDEX = 0
const MONDAY_INDEX = 1
const PAST_DUE_FRIDAY_HOUR = 10
const PAST_DUE_MONDAY_CUTOFF_HOUR = 17
function isPastDue() {
    const parts = new Intl.DateTimeFormat('en-US', CENTRAL_TIME_FORMAT_OPTIONS).formatToParts(new Date())
    const partMap = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
    const dayIndex = WEEKDAY_NAMES.indexOf(partMap.weekday)
    const hour = parseInt(partMap.hour, 10)
    return (
        (dayIndex === FRIDAY_INDEX && hour >= PAST_DUE_FRIDAY_HOUR) ||
        dayIndex === SATURDAY_INDEX ||
        dayIndex === SUNDAY_INDEX ||
        (dayIndex === MONDAY_INDEX && hour < PAST_DUE_MONDAY_CUTOFF_HOUR)
    )
}
export function buildDueSeverity() {
    const pastDue = isPastDue()
    return {
        severity: pastDue ? 'error' : 'warning',
        titlePhase: pastDue ? 'Past Due' : 'Due'
    }
}

const VerifiedUtility = {
    buildDueSeverity,
    isVerified(updatedLast, updatedAt, updatedBy) {
        if (!updatedLast || !updatedBy) return false
        try {
            const lastVerified = new Date(updatedLast)
            const lastUpdated = new Date(updatedAt)
            const now = new Date()
            if (lastUpdated > lastVerified) return false
            const getMostRecentMonday5pmCT = (date) => {
                // Resolve current day-of-week and hour in Central Time (handles CST/CDT automatically)
                const parts = new Intl.DateTimeFormat('en-US', {
                    ...CENTRAL_TIME_FORMAT_OPTIONS,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).formatToParts(date)
                const partMap = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
                const ctDayIndex = WEEKDAY_NAMES.indexOf(partMap.weekday)
                const ctHour = parseInt(partMap.hour, 10)

                // Days back to the most recent Monday (0 = already Monday)
                const daysSinceMonday = (ctDayIndex + 6) % 7
                let daysBack = daysSinceMonday

                // If it's Monday before 5 PM CT, the current cycle hasn't ended — use previous Monday
                if (daysSinceMonday === 0 && ctHour < PAST_DUE_MONDAY_CUTOFF_HOUR) daysBack = 7

                // Build "Monday 17:00" as a CT date string, then parse as UTC and adjust by the CT offset
                const targetMs = date.getTime() - daysBack * 86400000
                const targetParts = new Intl.DateTimeFormat('en-US', {
                    ...CENTRAL_TIME_FORMAT_OPTIONS,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).formatToParts(new Date(targetMs))
                const tp = Object.fromEntries(targetParts.map(({ type, value }) => [type, value]))

                // Construct the Monday 5 PM CT timestamp, then derive UTC by comparing local vs UTC hour
                const mondayCT = new Date(`${tp.year}-${tp.month}-${tp.day}T17:00:00Z`)
                const probe = new Date(targetMs)
                const offsetHours = parseInt(tp.hour, 10) - probe.getUTCHours()
                // Normalize offset for day-boundary wrap (-6 for CST, -5 for CDT)
                const normalized =
                    offsetHours > 12 ? offsetHours - 24 : offsetHours < -12 ? offsetHours + 24 : offsetHours
                mondayCT.setUTCHours(17 - normalized, 0, 0, 0)

                if (mondayCT > date) mondayCT.setUTCDate(mondayCT.getUTCDate() - 7)
                return mondayCT
            }
            const mostRecentMonday5pmCST = getMostRecentMonday5pmCT(now)
            return lastVerified > mostRecentMonday5pmCST
        } catch {
            return false
        }
    }
}
export default VerifiedUtility
