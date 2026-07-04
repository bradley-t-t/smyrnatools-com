/**
 * PlanStatisticsFormatUtility — display formatters for the Plan Statistics
 * dashboard. Numbers, percentages, time strings, and date ranges.
 *
 * Pure functions. No DOM, no React. Mirror the Schedule tab's headline
 * styling so cross-tab numbers always read the same.
 */

/** ISO `YYYY-MM-DD` -> local-zone `Date` (no UTC drift). Returns null when
 *  the input is empty or malformed. */
export const parseIsoLocal = (iso: string | null | undefined): Date | null => {
    if (!iso) return null
    const [year, month, day] = iso.split('-').map(Number)
    if (!year || !month || !day) return null
    return new Date(year, month - 1, day)
}

export const fmtInt = (n: number | null | undefined): string =>
    Number.isFinite(n as number) ? Math.round(n as number).toLocaleString() : '\u2014'
export const fmtFloat = (n: number | null | undefined, dp: number = 1): string =>
    Number.isFinite(n as number) ? (n as number).toFixed(dp) : '\u2014'
export const fmtPct = (n: number | null | undefined): string =>
    Number.isFinite(n as number) ? `${(n as number) > 0 ? '+' : ''}${(n as number).toFixed(1)}%` : '\u2014'

/** Score percentage \u2014 0\u20131 fraction rendered as "X%" with no sign prefix.
 *  Use for any rate or score (good-service %, cancel rate, kicker rate,
 *  booking rate). For period-over-period deltas keep using `fmtPct`. */
export const fmtScorePct = (n: number | null | undefined): string =>
    Number.isFinite(n as number) ? `${Math.round((n as number) * 100)}%` : '\u2014'

export const fmtDate = (iso: string | null | undefined): string => {
    const d = parseIsoLocal(iso)
    if (!d) return iso || ''
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

export const fmtRange = (start: string | null | undefined, end: string | null | undefined): string => {
    if (!start || !end) return ''
    if (start === end) return fmtDate(start)
    return `${fmtDate(start)} \u2013 ${fmtDate(end)}`
}
