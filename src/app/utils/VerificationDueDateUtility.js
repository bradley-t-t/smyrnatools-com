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

function buildDueSeverity() {
    const pastDue = isPastDue()
    return {
        severity: pastDue ? 'error' : 'warning',
        titlePhase: pastDue ? 'Past Due' : 'Due'
    }
}

const VerificationDueDateUtility = { buildDueSeverity }
export default VerificationDueDateUtility
