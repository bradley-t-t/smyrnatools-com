/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { formatPeriodLabel, shiftAnchor } from '../../../utils/PlanStatisticsUtility'
import { getTodayDate } from '../../../utils/PlanUtility'
import { STATISTICS_PERIODS } from '../../hooks/useStatisticsPeriod'

/** Period pill row — segmented chip style with active = accent fill, inactive = transparent. */
function PeriodSelector({ accentColor, period, setPeriod }) {
    return (
        <div
            role="group"
            aria-label="Statistics time period"
            className="inline-flex items-center rounded-md p-0.5 bg-bg-tertiary border border-border-light"
        >
            {STATISTICS_PERIODS.map(({ id, label }) => {
                const isActive = period === id
                return (
                    <button type="button"
                        key={id}
                        onClick={() => setPeriod(id)}
                        aria-pressed={isActive}
                        className="rounded text-xs font-semibold border-0 cursor-pointer px-2.5 py-1.5 transition-colors duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg-tertiary motion-reduce:transition-none"
                        style={{
                            background: isActive ? accentColor : 'transparent',
                            color: isActive ? '#fff' : 'var(--text-secondary)'
                        }}
                    >
                        {label}
                    </button>
                )
            })}
        </div>
    )
}

/** Calendar nav arrows + label + Today shortcut, or a date-range picker
 *  when the period is Custom. Hidden entirely for `allTime`. */
function PeriodNavigator({
    accentColor,
    anchor,
    customEnd,
    customStart,
    period,
    range,
    setAnchor,
    setCustomEnd,
    setCustomStart
}) {
    if (period === 'allTime') return null
    if (period === 'custom') {
        const dateInputClass =
            'rounded-md px-2 py-1 text-xs bg-bg-primary border border-border-light text-text-primary ' +
            'transition-colors duration-150 hover:border-border-medium ' +
            'focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 ' +
            '[color-scheme:light] dark:[color-scheme:dark]'
        return (
            <div className="flex items-center gap-1.5 text-xs">
                <input
                    type="date"
                    aria-label="Custom range start"
                    value={customStart}
                    max={customEnd}
                    onChange={(event) => setCustomStart(event.target.value)}
                    className={dateInputClass}
                />
                <span className="text-text-secondary">to</span>
                <input
                    type="date"
                    aria-label="Custom range end"
                    value={customEnd}
                    min={customStart}
                    onChange={(event) => setCustomEnd(event.target.value)}
                    className={dateInputClass}
                />
            </div>
        )
    }
    const periodLabel = formatPeriodLabel(period, range)
    return (
        <div className="inline-flex items-center gap-0.5 rounded-md text-sm font-semibold px-1 py-0.5 bg-bg-tertiary border border-border-light">
            <button type="button"
                onClick={() => setAnchor(shiftAnchor(anchor, period, -1))}
                aria-label="Previous period"
                title="Previous period"
                className="border-0 bg-transparent cursor-pointer p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors duration-150 active:scale-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none"
            >
                <i className="fas fa-chevron-left text-xs" aria-hidden="true" />
            </button>
            <span className="px-2 text-xs font-semibold text-text-primary tabular-nums">{periodLabel}</span>
            <button type="button"
                onClick={() => setAnchor(shiftAnchor(anchor, period, 1))}
                aria-label="Next period"
                title="Next period"
                className="border-0 bg-transparent cursor-pointer p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors duration-150 active:scale-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none"
            >
                <i className="fas fa-chevron-right text-xs" aria-hidden="true" />
            </button>
            <button type="button"
                onClick={() => setAnchor(getTodayDate())}
                className="border-0 bg-transparent cursor-pointer px-2 py-1 rounded text-xs font-semibold transition-colors duration-150 hover:bg-bg-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none"
                style={{ color: accentColor }}
            >
                Today
            </button>
        </div>
    )
}

/**
 * Period selector + period navigator pair shared across every inventory
 * statistics surface (asset + person). Stateless; expects the caller to
 * own period state via `useStatisticsPeriod`.
 */
export function StatisticsTimeRange({
    accentColor,
    anchor,
    customEnd,
    customStart,
    period,
    range,
    setAnchor,
    setCustomEnd,
    setCustomStart,
    setPeriod
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <PeriodSelector accentColor={accentColor} period={period} setPeriod={setPeriod} />
            <PeriodNavigator
                accentColor={accentColor}
                anchor={anchor}
                customEnd={customEnd}
                customStart={customStart}
                period={period}
                range={range}
                setAnchor={setAnchor}
                setCustomEnd={setCustomEnd}
                setCustomStart={setCustomStart}
            />
        </div>
    )
}

export default StatisticsTimeRange
