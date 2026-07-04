import { PLAN_TIME_ZONE } from '../../app/constants/planConstants'

/* ── CST anchored calendar helper ────────────────────────────────────────
 *  Smyrna's operations run on Central time regardless of where the
 *  dispatcher (or developer) is sitting, so "today" is resolved in CST. */

const CST_DATE_PARTS_FORMATTER = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: PLAN_TIME_ZONE,
    year: 'numeric'
})

/** Pull `{ year, month, day }` strings (zero-padded) for "now" in CST. */
const getCstDateParts = (date = new Date()) => {
    const parts = CST_DATE_PARTS_FORMATTER.formatToParts(date)
    const lookup = (type) => parts.find((p) => p.type === type)?.value || ''
    return { day: lookup('day'), month: lookup('month'), year: lookup('year') }
}

/** Today's CST calendar date in `YYYY-MM-DD` — anchors the statistics
 *  time-range pickers and every "is the user looking at today" check. */
export const getTodayDate = () => {
    const { year, month, day } = getCstDateParts()
    return `${year}-${month}-${day}`
}
