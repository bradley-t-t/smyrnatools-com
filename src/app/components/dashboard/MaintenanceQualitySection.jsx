import React from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { STATUS_COLORS } from '../../constants/dashboardConstants'
import { DashboardCard, MetricCard, SectionTitle, StatusPill } from '../ui/DashboardCards'
/** Status types tracked in historical distribution charts. */
const STATUSES = ['Active', 'Spare', 'In Shop', 'Stationary']
/**
 * Computes active/spare/in-shop percentages from raw status-days data.
 * @param {Array<{status: string, days: number}>} data
 * @returns {{active: number, spare: number, inShop: number}} Percentage values.
 */
const calcMetrics = (data) => {
    const total = data.reduce((sum, d) => sum + d.days, 0)
    const findDays = (status) => data.find((d) => d.status === status)?.days || 0
    return {
        active: total > 0 ? Math.round((findDays('Active') / total) * 100) : 0,
        inShop: total > 0 ? Math.round((findDays('In Shop') / total) * 100) : 0,
        spare: total > 0 ? Math.round((findDays('Spare') / total) * 100) : 0
    }
}
/**
 * Converts raw status history data into a chart-ready entry.
 * @param {Array} data - Status history records with `percentage` and `status`.
 * @param {string} name - Display label for the chart axis.
 * @returns {Object|null} Chart data point or null if no data.
 */
const buildChartEntry = (data, name) => {
    if (!data?.length) return null
    const entry = { name }
    for (const status of STATUSES) {
        const key = status === 'In Shop' ? 'inShop' : status.toLowerCase()
        entry[key] = parseFloat(data.find((d) => d.status === status)?.percentage || 0)
    }
    return entry
}
/** Per-asset-type configuration for building status history summaries. */
const ASSET_CONFIG = [
    { dataKey: 'mixers', isConcreteOnly: true, name: 'Mixers' },
    { dataKey: 'tractors', isConcreteOnly: false, name: 'Tractors' },
    { dataKey: 'trailers', isConcreteOnly: false, name: 'Trailers' },
    { dataKey: 'equipment', isConcreteOnly: false, name: 'Equipment' },
    { dataKey: 'pickups', isConcreteOnly: false, name: 'Pickups' }
]
/** Custom tooltip for the historical status distribution bar chart. */
function HistoryTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div
            className="rounded-lg shadow-lg px-3.5 py-2.5"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
        >
            <p className="text-sm font-semibold m-0 mb-1.5" style={{ color: 'var(--text-primary)' }}>
                {label}
            </p>
            {payload
                .filter((p) => p.value > 0)
                .map((entry, index) => (
                    <p key={index} className="text-xs m-0.5" style={{ color: entry.color }}>
                        {entry.name}: {entry.value.toFixed(1)}%
                    </p>
                ))}
        </div>
    )
}
/** Available quick date-range filter labels for status history. */
const DATE_FILTER_LABELS = ['last-week', 'this-month', 'this-quarter', 'this-year', 'all']
/**
 * Converts a kebab-case filter key to a title-case label.
 * @param {string} filter
 * @returns {string}
 */
const formatFilterLabel = (filter) =>
    filter
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
/**
 * Dashboard section showing service overdue counts, open issue counts,
 * and a historical status distribution chart with quick date filters.
 * @param {Object} props
 * @param {Object} props.displayStats - Aggregated stats with overdue/issue counts per asset type.
 * @param {boolean} props.isAggregate - Hides mixer-specific data when true.
 * @param {Object} props.statusHistoryData - Per-asset-type status history arrays.
 * @param {Function} props.handleQuickDateFilter - Callback to apply a date range filter to status history.
 * @param {boolean} props.isMobile - Adjusts grid layout for mobile viewports.
 */
export default function MaintenanceQualitySection({
    displayStats,
    isAggregate,
    statusHistoryData,
    handleQuickDateFilter,
    isMobile
}) {
    const assets = ASSET_CONFIG.filter((a) => !a.isConcreteOnly || !isAggregate).map((a) => ({
        name: a.name,
        ...calcMetrics(statusHistoryData[a.dataKey])
    }))
    const chartData = ASSET_CONFIG.map((a) => {
        if (a.isConcreteOnly && isAggregate) return null
        return buildChartEntry(statusHistoryData[a.dataKey], a.name)
    }).filter(Boolean)
    return (
        <DashboardCard>
            <SectionTitle>Maintenance & Quality</SectionTitle>
            <div
                className={`grid ${isMobile ? 'gap-3 grid-cols-1' : 'gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]'} mb-4 md:mb-6`}
            >
                <MetricCard
                    label="Service Overdue"
                    value={displayStats.overdueTotal}
                    icon="fa-exclamation-triangle"
                    iconColor="#dc2626"
                >
                    {!isAggregate && <StatusPill>Mixers {displayStats.mixers.overdue}</StatusPill>}
                    <StatusPill>Tractors {displayStats.tractors.overdue}</StatusPill>
                    <StatusPill>Trailers {displayStats.trailers.overdue}</StatusPill>
                    <StatusPill>Equipment {displayStats.equipment.overdue}</StatusPill>
                </MetricCard>
                <MetricCard
                    label="Open Issues"
                    value={displayStats.openIssuesTotal}
                    icon="fa-wrench"
                    iconColor="#f59e0b"
                >
                    {!isAggregate && <StatusPill>Mixers {displayStats.mixers.issues}</StatusPill>}
                    <StatusPill>Tractors {displayStats.tractors.issues}</StatusPill>
                    <StatusPill>Trailers {displayStats.trailers.issues}</StatusPill>
                    <StatusPill>Equipment {displayStats.equipment.issues}</StatusPill>
                </MetricCard>
            </div>
            <div className="border-t border-slate-200 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4 mb-4 md:mb-5">
                    <h4 className="text-sm md:text-base font-semibold text-slate-900 m-0">
                        Historical Status Distribution
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                        {DATE_FILTER_LABELS.map((filter) => (
                            <button
                                key={filter}
                                onClick={() => handleQuickDateFilter(filter)}
                                className="bg-slate-100 border-none rounded-md text-slate-600 text-[10px] md:text-xs font-medium px-2 py-1 md:px-3 md:py-1.5 cursor-pointer hover:bg-slate-200"
                            >
                                {formatFilterLabel(filter)}
                            </button>
                        ))}
                    </div>
                </div>
                <div
                    className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-[repeat(auto-fit,minmax(140px,1fr))]'} gap-3 mb-4 md:mb-6`}
                >
                    {assets.map((asset, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                            <div className="text-sm font-semibold text-slate-600 mb-2.5">{asset.name}</div>
                            <div className="flex flex-col gap-1.5">
                                {[
                                    { color: 'text-green-600', label: 'Active', value: asset.active },
                                    { color: 'text-purple-600', label: 'Spare', value: asset.spare },
                                    { color: 'text-blue-600', label: 'In Shop', value: asset.inShop }
                                ].map(({ color, label, value }) => (
                                    <div key={label} className="flex justify-between text-xs">
                                        <span className={color}>{label}</span>
                                        <span className="font-semibold text-slate-900">{value}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex flex-col gap-2.5">
                    {chartData.length === 0 ? (
                        <div className="text-center py-5 text-slate-400 text-sm">No historical data available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                            <BarChart data={chartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                                <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    unit="%"
                                    tick={{ fill: 'var(--text-secondary)', fontSize: isMobile ? 10 : 11 }}
                                />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tick={{ fill: 'var(--text-secondary)', fontSize: isMobile ? 10 : 12 }}
                                    width={isMobile ? 55 : 80}
                                />
                                <Tooltip content={<HistoryTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
                                <Legend wrapperStyle={{ color: 'var(--text-secondary)', fontSize: 11 }} />
                                <Bar dataKey="active" stackId="a" fill={STATUS_COLORS.Active} name="Active" />
                                <Bar dataKey="spare" stackId="a" fill={STATUS_COLORS.Spare} name="Spare" />
                                <Bar dataKey="inShop" stackId="a" fill={STATUS_COLORS['In Shop']} name="In Shop" />
                                <Bar
                                    dataKey="stationary"
                                    stackId="a"
                                    fill={STATUS_COLORS.Stationary}
                                    name="Stationary"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </DashboardCard>
    )
}
