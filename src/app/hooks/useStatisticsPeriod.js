import { useMemo, useState } from 'react'

import { buildRange, PLAN_STATS_PERIODS } from '../../utils/PlanStatisticsUtility'
import { getTodayDate } from '../../utils/PlanUtility'

/** Master period catalogue for the asset / person statistics surfaces.
 *  Mirrors `PLAN_STATS_PERIODS` exactly so the visual selector + label
 *  helpers stay reusable, plus an `allTime` option for the inventory-style
 *  surfaces where "show everything" is the most common default. */
export const STATISTICS_PERIODS = [{ id: 'allTime', label: 'All-time', span: null }, ...PLAN_STATS_PERIODS]

/**
 * Period / anchor / custom-range state for an inventory statistics page.
 *
 * Returns a `range` object whose `current.start` and `current.end` ISO
 * strings consumers can pass to a date-filter predicate. When the period
 * is `allTime`, both are null so the consumer can skip filtering.
 *
 * Wraps the same `buildRange` machinery the Plan Statistics page uses so
 * Week is Mon–Sat of the anchor, Month is the 1st through the last day,
 * Quarter is calendar-aligned, etc.
 */
export default function useStatisticsPeriod(defaultPeriod = 'allTime') {
    const today = getTodayDate()
    const [period, setPeriod] = useState(defaultPeriod)
    const [anchor, setAnchor] = useState(today)
    const [customStart, setCustomStart] = useState(today)
    const [customEnd, setCustomEnd] = useState(today)

    const range = useMemo(() => {
        if (period === 'allTime') {
            return { current: { end: null, start: null }, previous: null, span: null }
        }
        return buildRange(period, anchor, 'none', customStart, customEnd)
    }, [anchor, customEnd, customStart, period])

    return {
        anchor,
        customEnd,
        customStart,
        period,
        range,
        setAnchor,
        setCustomEnd,
        setCustomStart,
        setPeriod
    }
}
