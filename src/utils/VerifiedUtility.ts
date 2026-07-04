/**
 * Determines whether an asset is currently verified by checking that
 * the last verification timestamp is more recent than the most recent
 * Monday at 5 PM CST and that no updates occurred after verification.
 */

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CENTRAL_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    timeZone: 'America/Chicago',
    weekday: 'short'
}
const PAST_DUE_MONDAY_CUTOFF_HOUR = 17

const VerifiedUtility = {
    isVerified(
        updatedLast: string | null | undefined,
        updatedAt: string,
        updatedBy: string | null | undefined
    ): boolean {
        if (!updatedLast || !updatedBy) return false
        try {
            const lastVerified = new Date(updatedLast)
            const lastUpdated = new Date(updatedAt)
            const now = new Date()
            if (lastUpdated > lastVerified) return false
            const getMostRecentMonday5pmCT = (date: Date): Date => {
                // Resolve current day-of-week and hour in Central Time (handles CST/CDT automatically)
                const parts = new Intl.DateTimeFormat('en-US', {
                    ...CENTRAL_TIME_FORMAT_OPTIONS,
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
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
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
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
