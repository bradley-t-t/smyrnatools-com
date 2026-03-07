import React, { useEffect, useMemo, useState } from 'react'
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts'

import { supabase } from '../../../services/DatabaseService'
import { RegionService } from '../../../services/RegionService'
/** Semantic color palette used across all dashboard chart series. */
const COLORS = {
    active: '#22c55e',
    danger: '#ef4444',
    primary: 'var(--accent)',
    secondary: '#3b82f6',
    shop: '#3b82f6',
    spare: '#a855f7',
    success: '#10b981',
    warning: '#f59e0b'
}
/** Allocation percentage breakpoints for color coding (green/yellow/red). */
const ALLOCATION_THRESHOLDS = { HIGH: 80, MEDIUM: 50 }
/**
 * Returns a color based on allocation percentage relative to thresholds.
 * @param {number} percent
 * @returns {string} Hex color string.
 */
const getColorByAllocation = (percent) => {
    if (percent >= ALLOCATION_THRESHOLDS.HIGH) return '#22c55e'
    if (percent >= ALLOCATION_THRESHOLDS.MEDIUM) return '#f59e0b'
    return '#ef4444'
}
/** Shared tooltip renderer for line, area, and bar charts. */
const ChartTooltip = ({ active, label, payload }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3.5 py-2.5">
            <p className="text-accent text-sm font-semibold m-0 mb-1.5">{label}</p>
            {payload.map((entry, index) => (
                <p key={index} className="text-xs m-0.5" style={{ color: entry.color }}>
                    {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                </p>
            ))}
        </div>
    )
}
/** Pie chart tooltip showing value and percentage of total. */
const PieChartTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const data = payload[0]
    const total = data.payload.total || 0
    const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3.5 py-2.5">
            <p className="text-accent text-sm font-semibold m-0 mb-1">{data.name}</p>
            <p className="text-xs m-0" style={{ color: data.payload.color || data.fill }}>
                {data.value} ({percent}%)
            </p>
        </div>
    )
}
/** Reusable card wrapper for individual chart panels with icon header and optional footer. */
const ChartCard = ({ icon, iconColor, title, children, footer }) => (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h4 className="flex items-center gap-2 text-accent text-[15px] font-semibold mb-4">
            <i className={`fa-solid ${icon}`} style={{ color: iconColor }} />
            {title}
        </h4>
        {children}
        {footer && <div className="flex flex-wrap gap-4 justify-center text-xs mt-2">{footer}</div>}
    </div>
)
/** Colored inline stat label with optional icon, used in chart footers. */
const StatLabel = ({ color, icon, children }) => (
    <span style={{ color }} className="flex items-center gap-1">
        {icon && <i className={`fa-solid ${icon} mr-1`} />}
        {children}
    </span>
)
/** Small colored dot with label, used as a custom chart legend entry. */
const LegendDot = ({ color, label }) => (
    <span className="flex items-center gap-1 text-slate-500">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
    </span>
)
/** Computes the average of a numeric field across an array of objects. */
const calcAverage = (data, key) => (data.length > 0 ? data.reduce((sum, item) => sum + item[key], 0) / data.length : 0)
/** Computes the sum of a numeric field across an array of objects. */
const calcTotal = (data, key) => data.reduce((sum, item) => sum + item[key], 0)
/** Pie chart card with a centered total footer and optional donut (innerRadius) mode. */
const PieChartCard = ({ icon, iconColor, title, data, footerText, innerRadius = 0 }) => (
    <ChartCard
        icon={icon}
        iconColor={iconColor}
        title={title}
        footer={
            <span className="text-slate-500">
                Total: <strong className="text-accent">{footerText?.split(': ')[1]}</strong>
            </span>
        }
    >
        <ResponsiveContainer width="100%" height={220}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip content={<PieChartTooltip />} />
            </PieChart>
        </ResponsiveContainer>
    </ChartCard>
)
/**
 * Analytics chart grid for the dashboard.
 * Fetches weekly production/labor report data and mixer cleanliness ratings,
 * then renders a responsive grid of Recharts visualizations including
 * yardage trends, YPH, production vs labor, lost/resold yardage,
 * operator hours, status pie charts, allocation bars, and cleanliness distributions.
 * @param {Object} props
 * @param {string|null} props.dashboardPlant - Selected plant code filter, or null for all.
 * @param {string} props.dashboardRegionCode - Current region code for data scoping.
 * @param {Array} props.regionPlants - Plants in the current region.
 * @param {Array} props.allPlants - All plants across the organization (used for Office regions).
 * @param {Object} props.statusHistoryData - Per-asset-type status history for uptime charts.
 * @param {boolean} props.isAggregate - Hides mixer-specific charts when true.
 * @param {Object} props.stats - Pre-computed asset/operator stats for pie and allocation charts.
 */
export default function DashboardCharts({
    dashboardPlant,
    dashboardRegionCode,
    regionPlants,
    allPlants,
    statusHistoryData,
    isAggregate,
    stats
}) {
    const [weeklyData, setWeeklyData] = useState([])
    const [cleanlinessData, setCleanlinessData] = useState({ avg: 0, data: [] })
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        let cancelled = false
        async function fetchReportData() {
            if (!dashboardRegionCode) {
                setLoading(false)
                return
            }
            try {
                const region = RegionService.getRegionByCode(dashboardRegionCode)
                const isOffice = region?.type === 'Office'
                const plantCodes = isOffice
                    ? allPlants.map((p) => p.plantCode || p.plant_code).filter(Boolean)
                    : dashboardPlant
                      ? [dashboardPlant]
                      : (regionPlants || []).map((p) => p.plantCode || p.plant_code).filter(Boolean)
                if (plantCodes.length === 0) {
                    setLoading(false)
                    return
                }
                const { data: profilesData } = await supabase
                    .from('users_profiles')
                    .select('id, plant_code')
                    .in('plant_code', plantCodes)
                if (cancelled || !profilesData?.length) {
                    setLoading(false)
                    return
                }
                const userIds = profilesData.map((p) => p.id)
                const twelveWeeksAgo = new Date()
                twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)
                const { data: reports } = await supabase
                    .from('reports')
                    .select('*')
                    .eq('report_name', 'plant_manager')
                    .in('user_id', userIds)
                    .gte('week', twelveWeeksAgo.toISOString())
                    .order('week', { ascending: true })
                if (cancelled) return
                if (reports?.length) {
                    const weeklyMap = new Map()
                    reports.forEach((report) => {
                        if (!report.completed) return
                        const weekStr = report.week.split('T')[0]
                        const yardage = parseFloat(report.data?.yardage || report.data?.total_yards_delivered || 0)
                        const hours = parseFloat(report.data?.total_hours || report.data?.total_operator_hours || 0)
                        if (!weeklyMap.has(weekStr)) {
                            weeklyMap.set(weekStr, { hours: 0, yardage: 0 })
                        }
                        const existing = weeklyMap.get(weekStr)
                        existing.yardage += yardage
                        existing.hours += hours
                    })
                    const sortedWeeks = Array.from(weeklyMap.entries())
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .slice(-12)
                        .map(([week, data]) => {
                            const date = new Date(week)
                            return {
                                hours: Math.round(data.hours),
                                label: `${date.getMonth() + 1}/${date.getDate()}`,
                                week,
                                yardage: Math.round(data.yardage),
                                yph: data.hours > 0 ? parseFloat((data.yardage / data.hours).toFixed(2)) : 0
                            }
                        })
                    setWeeklyData(sortedWeeks)
                }
                const { data: mixers } = await supabase
                    .from('mixers')
                    .select('cleanliness_rating, status, assigned_plant')
                    .in('assigned_plant', plantCodes)
                    .eq('status', 'Active')
                if (cancelled) return
                if (mixers?.length) {
                    const ratings = { average: 0, excellent: 0, good: 0, poor: 0, unrated: 0 }
                    let totalRating = 0
                    let ratedCount = 0
                    mixers.forEach((m) => {
                        const rating = m.cleanliness_rating
                        if (!rating || rating === 0) {
                            ratings.unrated++
                        } else {
                            if (rating >= 5) ratings.excellent++
                            else if (rating >= 4) ratings.good++
                            else if (rating >= 3) ratings.average++
                            else ratings.poor++
                            totalRating += rating
                            ratedCount++
                        }
                    })
                    setCleanlinessData({
                        avg: ratedCount > 0 ? parseFloat((totalRating / ratedCount).toFixed(1)) : 0,
                        data: [
                            { color: '#22c55e', name: 'Excellent (5)', value: ratings.excellent },
                            { color: '#3b82f6', name: 'Good (4)', value: ratings.good },
                            { color: '#f59e0b', name: 'Average (3)', value: ratings.average },
                            { color: '#ef4444', name: 'Poor (<3)', value: ratings.poor },
                            { color: '#94a3b8', name: 'Unrated', value: ratings.unrated }
                        ].filter((d) => d.value > 0)
                    })
                }
            } catch (err) {
                console.error('Error fetching chart data:', err)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        fetchReportData()
        return () => {
            cancelled = true
        }
    }, [dashboardRegionCode, dashboardPlant, regionPlants, allPlants])
    const shopTimeData = useMemo(() => {
        if (!statusHistoryData) return []
        const processData = (data, label) => {
            if (!data?.length) return null
            const total = data.reduce((sum, d) => sum + (d.days || 0), 0)
            if (total === 0) return null
            const getPercent = (status) =>
                Math.round(((data.find((d) => d.status === status)?.days || 0) / total) * 100)
            return {
                activePercent: getPercent('Active'),
                label,
                shopPercent: getPercent('In Shop'),
                sparePercent: getPercent('Spare')
            }
        }
        return [
            !isAggregate && processData(statusHistoryData.mixers, 'Mixers'),
            processData(statusHistoryData.tractors, 'Tractors'),
            processData(statusHistoryData.trailers, 'Trailers'),
            processData(statusHistoryData.equipment, 'Equipment')
        ].filter(Boolean)
    }, [statusHistoryData, isAggregate])
    if (loading) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-10 text-center">
                <i className="fas fa-spinner fa-spin text-slate-500 text-2xl" />
                <p className="text-slate-500 mt-3 m-0">Loading analytics...</p>
            </div>
        )
    }
    const hasAnyData = weeklyData.length > 0 || cleanlinessData.data.length > 0 || shopTimeData.length > 0
    if (!hasAnyData) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-10 text-center">
                <i className="fa-regular fa-chart-bar text-slate-400 text-3xl block mb-3" />
                <p className="text-slate-500 m-0">No report data available for analytics</p>
            </div>
        )
    }
    const totalYardage = calcTotal(weeklyData, 'yardage')
    const totalHours = calcTotal(weeklyData, 'hours')
    const avgYph = totalHours > 0 ? (totalYardage / totalHours).toFixed(2) : 0
    const getYphTrend = () => {
        if (weeklyData.length < 2) return { avgYph: 0, trend: 0 }
        const midpoint = Math.floor(weeklyData.length / 2)
        const firstHalfAvg = calcAverage(weeklyData.slice(0, midpoint), 'yph')
        const secondHalfAvg = calcAverage(weeklyData.slice(midpoint), 'yph')
        return { avgYph: calcAverage(weeklyData, 'yph'), trend: secondHalfAvg - firstHalfAvg }
    }
    const buildAssetData = (filterFn = () => true) =>
        [
            !isAggregate &&
                stats.mixers.total > 0 &&
                filterFn('mixers') && { color: '#3b82f6', name: 'Mixers', ...stats.mixers },
            stats.tractors.total > 0 &&
                filterFn('tractors') && { color: '#22c55e', name: 'Tractors', ...stats.tractors },
            stats.trailers.total > 0 &&
                filterFn('trailers') && { color: '#f59e0b', name: 'Trailers', ...stats.trailers },
            stats.equipment.total > 0 &&
                filterFn('equipment') && { color: '#8b5cf6', name: 'Equipment', ...stats.equipment },
            stats.pickups.total > 0 && filterFn('pickups') && { color: '#ec4899', name: 'Pickups', ...stats.pickups }
        ].filter(Boolean)
    return (
        <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
            {weeklyData.length > 0 && (
                <ChartCard
                    icon="fa-chart-line"
                    iconColor="#2563eb"
                    title="Weekly Yardage Production"
                    footer={
                        weeklyData.length >= 2 && (
                            <>
                                <StatLabel color="#64748b">
                                    Avg:{' '}
                                    <strong className="text-accent">
                                        {Math.round(calcAverage(weeklyData, 'yardage')).toLocaleString()}
                                    </strong>{' '}
                                    yards/week
                                </StatLabel>
                                <StatLabel color="#64748b">
                                    Total: <strong className="text-accent">{totalYardage.toLocaleString()}</strong>{' '}
                                    yards
                                </StatLabel>
                            </>
                        )
                    }
                >
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={weeklyData}>
                            <defs>
                                <linearGradient id="yardageGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="yardage"
                                stroke={COLORS.primary}
                                strokeWidth={2}
                                fill="url(#yardageGradient)"
                                name="Yards"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>
            )}
            {weeklyData.length > 0 && (
                <ChartCard
                    icon="fa-gauge-high"
                    iconColor="#10b981"
                    title="Yards Per Hour (YPH) Trend"
                    footer={
                        weeklyData.length >= 2 &&
                        (() => {
                            const { trend, avgYph: avg } = getYphTrend()
                            return (
                                <>
                                    <StatLabel color="#64748b">
                                        Avg YPH: <strong className="text-accent">{avg.toFixed(2)}</strong>
                                    </StatLabel>
                                    <StatLabel color={trend >= 0 ? '#10b981' : '#ef4444'}>
                                        <i className={`fa-solid fa-arrow-${trend >= 0 ? 'up' : 'down'} mr-1`} />
                                        {Math.abs(trend).toFixed(2)} YPH
                                    </StatLabel>
                                </>
                            )
                        })()
                    }
                >
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 'auto']} />
                            <Tooltip content={<ChartTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="yph"
                                stroke={COLORS.success}
                                strokeWidth={2}
                                dot={{ fill: COLORS.success, r: 4 }}
                                activeDot={{ r: 6 }}
                                name="YPH"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            )}
            {weeklyData.length > 0 && (
                <ChartCard
                    icon="fa-scale-balanced"
                    iconColor="#0891b2"
                    title="Production vs Labor"
                    footer={
                        <>
                            <StatLabel color="#0891b2" icon="fa-cubes-stacked">
                                {totalYardage.toLocaleString()} yards
                            </StatLabel>
                            <StatLabel color="#f97316" icon="fa-clock">
                                {totalHours.toLocaleString()} hours
                            </StatLabel>
                            <StatLabel color="#10b981" icon="fa-gauge-high">
                                {avgYph} avg YPH
                            </StatLabel>
                        </>
                    }
                >
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis
                                yAxisId="left"
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                            />
                            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <Tooltip content={<ProductionTooltip />} />
                            <Legend wrapperStyle={{ color: '#64748b', fontSize: 11 }} />
                            <Bar yAxisId="left" dataKey="yardage" fill="#0891b2" name="Yards" radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="right" dataKey="hours" fill="#f97316" name="Hours" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            )}
            {weeklyData.length > 0 && (
                <ChartCard
                    icon="fa-users-between-lines"
                    iconColor="#0891b2"
                    title="Weekly Operator Hours"
                    footer={
                        <>
                            <StatLabel color="#64748b">
                                Total: <strong className="text-accent">{totalHours.toLocaleString()}</strong> hours
                            </StatLabel>
                            <StatLabel color="#64748b">
                                Avg/Week:{' '}
                                <strong className="text-accent">
                                    {Math.round(calcAverage(weeklyData, 'hours')).toLocaleString()}
                                </strong>
                            </StatLabel>
                        </>
                    }
                >
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="hours" fill={COLORS.secondary} name="Hours" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            )}
            {stats?.operators.total > 0 && (
                <PieChartCard
                    icon="fa-users"
                    iconColor="#0891b2"
                    title="Operator Status"
                    data={[
                        stats.operators.assigned > 0 && {
                            color: '#8b5cf6',
                            name: 'Assigned',
                            total: stats.operators.total,
                            value: stats.operators.assigned
                        },
                        stats.operators.unassigned > 0 && {
                            color: '#ec4899',
                            name: 'Unassigned',
                            total: stats.operators.total,
                            value: stats.operators.unassigned
                        },
                        stats.operators.pending > 0 && {
                            color: '#f59e0b',
                            name: 'Pending',
                            total: stats.operators.total,
                            value: stats.operators.pending
                        },
                        stats.operators.lightDuty > 0 && {
                            color: '#eab308',
                            name: 'Light Duty',
                            total: stats.operators.total,
                            value: stats.operators.lightDuty
                        }
                    ].filter(Boolean)}
                    footerText={`Total Operators: ${stats.operators.total}`}
                />
            )}
            {stats?.fleetTotal > 0 && (
                <PieChartCard
                    icon="fa-chart-pie"
                    iconColor="#2563eb"
                    title="Asset Distribution"
                    data={buildAssetData().map((a) => ({ ...a, total: stats.fleetTotal, value: a.total }))}
                    innerRadius={45}
                    footerText={`Total Assets: ${stats.fleetTotal}`}
                />
            )}
            {shopTimeData.length > 0 && (
                <ChartCard
                    icon="fa-clock-rotate-left"
                    iconColor="#8b5cf6"
                    title="Fleet Uptime vs Downtime"
                    footer={
                        <span className="text-slate-500 text-[11px]">Based on historical status tracking data</span>
                    }
                >
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={shopTimeData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 100]} unit="%" />
                            <YAxis
                                dataKey="label"
                                type="category"
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                width={70}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <Legend wrapperStyle={{ color: '#64748b', fontSize: 11 }} />
                            <Bar dataKey="activePercent" stackId="a" fill={COLORS.active} name="Active %" />
                            <Bar dataKey="sparePercent" stackId="a" fill={COLORS.spare} name="Spare %" />
                            <Bar dataKey="shopPercent" stackId="a" fill={COLORS.shop} name="In Shop %" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            )}
            {stats && (
                <ChartCard
                    icon="fa-gauge-high"
                    iconColor="#9333ea"
                    title="Allocation Rate"
                    footer={
                        <div className="flex gap-3 text-[11px]">
                            <LegendDot color="#22c55e" label="80%+" />
                            <LegendDot color="#f59e0b" label="50-79%" />
                            <LegendDot color="#ef4444" label="<50%" />
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                            data={buildAssetData().map((a) => ({ allocation: a.allocationPercent, name: a.name }))}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 100]} unit="%" />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="allocation" fill="#8b5cf6" name="Allocation %" radius={[4, 4, 0, 0]}>
                                {buildAssetData().map((a, index) => (
                                    <Cell key={index} fill={getColorByAllocation(a.allocationPercent)} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            )}
            {stats && (stats.openIssuesTotal > 0 || stats.overdueTotal > 0) && (
                <ChartCard
                    icon="fa-wrench"
                    iconColor="#f59e0b"
                    title="Issues & Overdue Service"
                    footer={
                        <>
                            <StatLabel color="#f59e0b" icon="fa-wrench">
                                {stats.openIssuesTotal} Issues
                            </StatLabel>
                            <StatLabel color="#dc2626" icon="fa-clock">
                                {stats.overdueTotal} Overdue
                            </StatLabel>
                        </>
                    }
                >
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                            data={buildAssetData(() => true)
                                .slice(0, 4)
                                .map((a) => ({ issues: a.issues, name: a.name, overdue: a.overdue }))}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                            <Tooltip content={<ChartTooltip />} />
                            <Legend wrapperStyle={{ color: '#64748b', fontSize: 11 }} />
                            <Bar dataKey="issues" fill="#f59e0b" name="Open Issues" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="overdue" fill="#dc2626" name="Overdue Service" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            )}
            {cleanlinessData.data.length > 0 && !isAggregate && (
                <ChartCard
                    icon="fa-spray-can-sparkles"
                    iconColor="#f59e0b"
                    title="Mixer Cleanliness Ratings"
                    footer={
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-slate-500">
                                Average Rating:{' '}
                                <strong
                                    style={{
                                        color:
                                            cleanlinessData.avg >= 4
                                                ? '#22c55e'
                                                : cleanlinessData.avg >= 3
                                                  ? '#f59e0b'
                                                  : '#ef4444'
                                    }}
                                >
                                    {cleanlinessData.avg}
                                </strong>{' '}
                                / 5
                            </span>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {cleanlinessData.data.map((entry, index) => (
                                    <LegendDot
                                        key={index}
                                        color={entry.color}
                                        label={`${entry.name}: ${entry.value}`}
                                    />
                                ))}
                            </div>
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={cleanlinessData.data.map((d) => ({
                                    ...d,
                                    total: cleanlinessData.data.reduce((s, x) => s + x.value, 0)
                                }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={75}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {cleanlinessData.data.map((entry, index) => (
                                    <Cell key={index} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<PieChartTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
            )}
        </div>
    )
}
/** Custom tooltip for the Production vs Labor chart, computing inline YPH. */
const ProductionTooltip = ({ active, label, payload }) => {
    if (!active || !payload?.length) return null
    const yards = payload.find((p) => p.dataKey === 'yardage')?.value || 0
    const hours = payload.find((p) => p.dataKey === 'hours')?.value || 0
    const weekYph = hours > 0 ? (yards / hours).toFixed(2) : 0
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3.5 py-2.5">
            <p className="text-accent text-sm font-semibold m-0 mb-1.5">{label}</p>
            <p className="text-[#0891b2] text-xs m-0.5">Yards: {yards.toLocaleString()}</p>
            <p className="text-[#f97316] text-xs m-0.5">Hours: {hours.toLocaleString()}</p>
            <p className="text-[#10b981] text-xs font-semibold mt-1.5 m-0">YPH: {weekYph}</p>
        </div>
    )
}
