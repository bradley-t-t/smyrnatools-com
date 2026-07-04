import React from 'react'

const SKELETON_ROW_LABELS = [
    'Asset Total',
    'Active',
    'Spare',
    'In Shop',
    'Stationary',
    'Allocation',
    'Verified',
    'Operators',
    'Open Alerts',
    'Open Issues'
]

const ASIDE_CLASS = 'hidden xl:block sticky top-0 self-start py-5 pl-4 overflow-y-auto w-60 max-h-screen'

/**
 * Right-rail "at a glance" snapshot for the dashboard. Mirrors the Plan
 * tab's `PlanDashboardAtAGlance` so the user sees the same vertical
 * label/value pattern across both views. Hidden below `xl` breakpoint —
 * the Overview StatGroup already shows these numbers on smaller screens.
 *
 * Renders a skeleton variant when `loading` is true so the third column
 * doesn't disappear during the dashboard's bootstrap.
 */
export function DashboardAtAGlance({ alertCount, displayStats, loading = false, openIssues }) {
    if (loading) {
        return (
            <aside className={ASIDE_CLASS} aria-busy="true" aria-label="Loading dashboard snapshot">
                <div className="h-3 w-32 mb-2 rounded-md animate-pulse motion-reduce:animate-none bg-bg-tertiary" />
                <div className="flex flex-col">
                    {SKELETON_ROW_LABELS.map((label) => (
                        <div
                            key={label}
                            className="flex items-baseline justify-between py-1.5 border-b border-border-light"
                        >
                            <span className="text-[12px] text-text-secondary">{label}</span>
                            <span className="h-3 w-12 rounded-md animate-pulse motion-reduce:animate-none bg-bg-tertiary" />
                        </div>
                    ))}
                </div>
            </aside>
        )
    }

    const stats = displayStats || {}
    const ops = stats.operators || {}
    const allocation = Math.round(stats.overallAllocationPercent || 0)
    const verified = Math.round(stats.verificationAverage || 0)
    const inShop =
        (stats.mixers?.shop || 0) +
        (stats.tractors?.shop || 0) +
        (stats.trailers?.shop || 0) +
        (stats.equipment?.shop || 0) +
        (stats.pickups?.shop || 0)
    const spare =
        (stats.mixers?.spare || 0) +
        (stats.tractors?.spare || 0) +
        (stats.trailers?.spare || 0) +
        (stats.equipment?.spare || 0)
    const stationary = stats.pickups?.stationary || 0
    const active =
        (stats.mixers?.active || 0) +
        (stats.tractors?.active || 0) +
        (stats.trailers?.active || 0) +
        (stats.equipment?.active || 0) +
        (stats.pickups?.active || 0)

    const dateLabel = new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
        year: 'numeric'
    })

    const rows = [
        { label: 'Asset Total', value: (stats.fleetTotal || 0).toLocaleString() },
        { label: 'Active', value: active.toLocaleString() },
        { label: 'Spare', value: spare.toLocaleString() },
        { label: 'In Shop', value: inShop.toLocaleString() },
        { label: 'Stationary', value: stationary.toLocaleString() },
        { label: 'Allocation', value: `${allocation}%` },
        { label: 'Verified', value: `${verified}%` },
        { label: 'Operators', value: (ops.active || 0).toLocaleString() },
        { label: 'Open Alerts', value: (alertCount || 0).toString() },
        { label: 'Open Issues', value: (openIssues || 0).toString() }
    ]

    return (
        <aside className={`${ASIDE_CLASS} animate-fade-in-up`} aria-label="Dashboard at-a-glance snapshot">
            <div className="text-[12px] font-medium mb-1.5 text-text-tertiary uppercase tracking-wider">
                {dateLabel}
            </div>
            <div className="flex flex-col">
                {rows.map((row) => (
                    <div
                        key={row.label}
                        className="flex items-baseline justify-between py-1.5 px-1 -mx-1 rounded transition-colors duration-150 border-b border-border-light hover:bg-bg-hover"
                    >
                        <span className="text-[12px] text-text-secondary">{row.label}</span>
                        <span className="text-[13px] font-semibold font-mono tabular-nums text-text-primary">
                            {row.value}
                        </span>
                    </div>
                ))}
            </div>
        </aside>
    )
}
