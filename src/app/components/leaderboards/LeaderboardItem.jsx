import React from 'react'

import LeaderboardsUtility from '../../../utils/LeaderboardsUtility'

/**
 * Resolves the display value, optional suffix, and color for a given leaderboard category.
 * @param {Object} plant - Plant leaderboard data with metric fields.
 * @param {string} category - Active category ID (e.g. 'efficiency', 'yph', 'production').
 * @returns {{value: string|number, suffix?: string, color?: string}}
 */
function formatMetricValue(plant, category) {
    switch (category) {
        case 'efficiency':
            return {
                color: LeaderboardsUtility.getEfficiencyColor(plant.avgEfficiency),
                value: `${plant.avgEfficiency.toFixed(1)}%`
            }
        case 'yph':
            return { value: plant.avgYPH.toFixed(2) }
        case 'production':
            return { suffix: 'yds', value: Math.round(plant.totalYardage).toLocaleString() }
        case 'weekly-yardage':
            return { suffix: 'yds/wk', value: Math.round(plant.avgYardageWeekly).toLocaleString() }
        case 'daily-yardage':
            return { suffix: 'yds/day', value: Math.round(plant.avgYardageDaily).toLocaleString() }
        case 'monthly-yardage':
            return { suffix: 'yds/mo', value: Math.round(plant.avgMonthlyYards).toLocaleString() }
        case 'weekly-hours':
            return { suffix: 'hrs/wk', value: Math.round(plant.avgWeeklyHours).toLocaleString() }
        case 'daily-hours':
            return { suffix: 'hrs/day', value: Math.round(plant.avgHoursDaily).toLocaleString() }
        case 'monthly-hours':
            return { suffix: 'hrs/mo', value: Math.round(plant.avgMonthlyHours).toLocaleString() }
        case 'help-given':
            return { suffix: 'hrs', value: Math.round(plant.helpGiven) }
        case 'help-received':
            return { suffix: 'hrs', value: Math.round(plant.helpReceived) }
        default:
            return { value: '--' }
    }
}

/**
 * Labeled stat cell displaying a metric label and value, optionally clickable.
 * @param {Object} props
 * @param {string} props.label - Uppercase label text.
 * @param {string|number} props.value - Display value.
 * @param {string} [props.valueColor] - Tailwind text color class for the value.
 * @param {Function} [props.onClick] - Makes the cell clickable with an external-link icon.
 */
function StatCell({ label, value, valueColor, onClick }) {
    const isClickable = !!onClick
    return (
        <div className={`flex flex-col gap-0.5 ${isClickable ? 'cursor-pointer' : ''}`} onClick={onClick}>
            <span className="text-[0.625rem] font-medium uppercase tracking-wide text-slate-400">
                {label}
                {isClickable && <i className="fas fa-external-link-alt ml-1 text-[0.5rem]" />}
            </span>
            <span className={`text-sm font-semibold ${valueColor ?? 'text-slate-700'}`}>{value}</span>
        </div>
    )
}

/**
 * Expanded stats grid shown below efficiency leaderboard items.
 * Displays YPH, load efficiency, help balance, missing reports,
 * fleet cleanliness, and safety incident counts.
 * @param {Object} props
 * @param {Object} props.plant - Plant leaderboard data.
 * @param {Function} [props.onHelpClick] - Opens the help details modal for this plant.
 */
function EfficiencyStats({ plant, onHelpClick }) {
    const hasHelp = plant.helpGiven > 0 || plant.helpReceived > 0
    const helpBalance = plant.helpGiven - plant.helpReceived
    const helpColor = helpBalance > 0 ? 'text-emerald-600' : helpBalance < 0 ? 'text-rose-500' : 'text-slate-700'
    const missingTotal = (plant.missingReports ?? 0) + (plant.incompleteReports ?? 0)
    const cleanlinessValue = plant.avgFleetCleanliness ?? 0
    const cleanlinessColor =
        cleanlinessValue >= 4 ? 'text-emerald-600' : cleanlinessValue >= 3 ? 'text-amber-500' : 'text-rose-500'

    return (
        <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-3 md:grid-cols-6">
            <StatCell label="YPH" value={plant.avgYPH.toFixed(2)} />
            <StatCell label="Load Eff." value={`${plant.loadsEfficiency.toFixed(1)}%`} />
            <StatCell
                label="Help Balance"
                value={hasHelp ? `${helpBalance > 0 ? '+' : ''}${Math.round(helpBalance)}h` : 'N/A'}
                valueColor={helpColor}
                onClick={hasHelp ? onHelpClick : undefined}
            />
            <StatCell
                label="Missing"
                value={missingTotal}
                valueColor={missingTotal > 0 ? 'text-rose-500' : 'text-emerald-600'}
            />
            <StatCell
                label="Cleanliness"
                value={cleanlinessValue > 0 ? `${cleanlinessValue.toFixed(1)}/5` : 'N/A'}
                valueColor={cleanlinessColor}
            />
            <StatCell
                label="Safety"
                value={plant.safetyReportsCount ?? 0}
                valueColor={(plant.safetyReportsCount ?? 0) > 0 ? 'text-rose-500' : 'text-emerald-600'}
            />
        </div>
    )
}

/**
 * Single ranked plant row in the leaderboard list.
 * Shows rank badge, plant name/code, primary metric value,
 * and an expanded efficiency stats grid when the efficiency category is selected.
 * @param {Object} props
 * @param {Object} props.plant - Plant leaderboard data.
 * @param {number} props.rank - Numeric rank position.
 * @param {string} props.selectedCategory - Active category ID controlling which metric to display.
 * @param {Function} [props.onHelpClick] - Opens the help details modal for this plant.
 */
export default function LeaderboardItem({ plant, rank, selectedCategory, onHelpClick }) {
    const metric = formatMetricValue(plant, selectedCategory)

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md">
            <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                    {rank}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                        <span className="text-base font-semibold text-slate-900">Plant {plant.plantCode}</span>
                        <span className="truncate text-sm text-slate-500">{plant.plantName}</span>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <span
                        className="text-xl font-bold text-slate-900"
                        style={metric.color ? { color: metric.color } : undefined}
                    >
                        {metric.value}
                    </span>
                    {metric.suffix && (
                        <span className="text-[0.625rem] font-medium uppercase tracking-wide text-slate-400">
                            {metric.suffix}
                        </span>
                    )}
                </div>
            </div>

            {selectedCategory === 'efficiency' && (
                <div className="mt-3">
                    <EfficiencyStats plant={plant} onHelpClick={onHelpClick} />
                </div>
            )}
        </div>
    )
}

/**
 * Shimmer placeholder skeleton matching the LeaderboardItem layout.
 * Rendered while leaderboard data is loading.
 */
export function LeaderboardSkeleton() {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded bg-slate-200" />
            </div>
        </div>
    )
}
