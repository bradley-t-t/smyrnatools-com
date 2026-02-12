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

import { supabase } from '../../services/DatabaseService'
import { RegionService } from '../../services/RegionService'

const COLORS = {
    active: '#22c55e',
    danger: '#ef4444',
    primary: '#1e3a5f',
    secondary: '#3b82f6',
    shop: '#3b82f6',
    spare: '#a855f7',
    success: '#10b981',
    warning: '#f59e0b'
}

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

                let plantCodes
                if (isOffice) {
                    plantCodes = allPlants.map((p) => p.plantCode || p.plant_code).filter(Boolean)
                } else if (dashboardPlant) {
                    plantCodes = [dashboardPlant]
                } else {
                    plantCodes = (regionPlants || []).map((p) => p.plantCode || p.plant_code).filter(Boolean)
                }

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
                        const lost = parseFloat(report.data?.total_yards_lost || report.data?.yardage_lost || 0)
                        const resold = parseFloat(report.data?.yards_resold || 0)

                        if (!weeklyMap.has(weekStr)) {
                            weeklyMap.set(weekStr, { hours: 0, lost: 0, resold: 0, yardage: 0 })
                        }
                        const existing = weeklyMap.get(weekStr)
                        existing.yardage += yardage
                        existing.hours += hours
                        existing.lost += lost
                        existing.resold += resold
                    })

                    const sortedWeeks = Array.from(weeklyMap.entries())
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .slice(-12)
                        .map(([week, data]) => {
                            const date = new Date(week)
                            const label = `${date.getMonth() + 1}/${date.getDate()}`
                            const yph = data.hours > 0 ? (data.yardage / data.hours).toFixed(2) : 0
                            const recoveryRate = data.lost > 0 ? Math.round((data.resold / data.lost) * 100) : 0
                            return {
                                hours: Math.round(data.hours),
                                label,
                                lost: Math.round(data.lost),
                                recoveryRate,
                                resold: Math.round(data.resold),
                                week,
                                yardage: Math.round(data.yardage),
                                yph: parseFloat(yph)
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
                        if (!rating || rating === 0) ratings.unrated++
                        else {
                            if (rating >= 5) ratings.excellent++
                            else if (rating >= 4) ratings.good++
                            else if (rating >= 3) ratings.average++
                            else ratings.poor++
                            totalRating += rating
                            ratedCount++
                        }
                    })
                    const avgRating = ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : 0
                    setCleanlinessData({
                        avg: parseFloat(avgRating),
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

            const active = data.find((d) => d.status === 'Active')?.days || 0
            const shop = data.find((d) => d.status === 'In Shop')?.days || 0
            const spare = data.find((d) => d.status === 'Spare')?.days || 0

            return {
                activePercent: Math.round((active / total) * 100),
                label,
                shopPercent: Math.round((shop / total) * 100),
                sparePercent: Math.round((spare / total) * 100)
            }
        }

        const results = []
        if (!isAggregate) {
            const mixerData = processData(statusHistoryData.mixers, 'Mixers')
            if (mixerData) results.push(mixerData)
        }
        const tractorData = processData(statusHistoryData.tractors, 'Tractors')
        if (tractorData) results.push(tractorData)
        const trailerData = processData(statusHistoryData.trailers, 'Trailers')
        if (trailerData) results.push(trailerData)
        const equipmentData = processData(statusHistoryData.equipment, 'Equipment')
        if (equipmentData) results.push(equipmentData)

        return results
    }, [statusHistoryData, isAggregate])

    const CustomTooltip = ({ active, label, payload }) => {
        if (!active || !payload?.length) return null
        return (
            <div
                style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    padding: '10px 14px'
                }}
            >
                <p style={{ color: '#1e3a5f', fontSize: '13px', fontWeight: 600, margin: '0 0 6px 0' }}>{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} style={{ color: entry.color, fontSize: '12px', margin: '2px 0' }}>
                        {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                    </p>
                ))}
            </div>
        )
    }

    const PieTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null
        const data = payload[0]
        const total = data.payload.total || 0
        const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0
        return (
            <div
                style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    padding: '10px 14px'
                }}
            >
                <p style={{ color: '#1e3a5f', fontSize: '13px', fontWeight: 600, margin: '0 0 4px 0' }}>{data.name}</p>
                <p style={{ color: data.payload.color || data.fill, fontSize: '12px', margin: '0' }}>
                    {data.value} ({percent}%)
                </p>
            </div>
        )
    }

    const chartCardStyle = {
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px'
    }

    const chartTitleStyle = {
        alignItems: 'center',
        color: '#1e3a5f',
        display: 'flex',
        fontSize: '15px',
        fontWeight: 600,
        gap: '8px',
        marginBottom: '16px'
    }

    if (loading) {
        return (
            <div style={{ ...chartCardStyle, padding: '40px', textAlign: 'center' }}>
                <i className="fas fa-spinner fa-spin" style={{ color: '#64748b', fontSize: '24px' }} />
                <p style={{ color: '#64748b', margin: '12px 0 0 0' }}>Loading analytics...</p>
            </div>
        )
    }

    const hasAnyData = weeklyData.length > 0 || cleanlinessData.data.length > 0 || shopTimeData.length > 0

    if (!hasAnyData) {
        return (
            <div style={{ ...chartCardStyle, padding: '40px', textAlign: 'center' }}>
                <i
                    className="fa-regular fa-chart-bar"
                    style={{ color: '#94a3b8', display: 'block', fontSize: '32px', marginBottom: '12px' }}
                />
                <p style={{ color: '#64748b', margin: 0 }}>No report data available for analytics</p>
            </div>
        )
    }

    return (
        <div
            style={{
                display: 'grid',
                gap: '16px',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                marginTop: '16px'
            }}
        >
            {/* ===== PRODUCTION & EFFICIENCY GROUP ===== */}

            {weeklyData.length > 0 && (
                <div style={chartCardStyle}>
                    <h4 style={chartTitleStyle}>
                        <i className="fa-solid fa-chart-line" style={{ color: '#2563eb' }} />
                        Weekly Yardage Production
                    </h4>
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
                            <Tooltip content={<CustomTooltip />} />
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
                    {weeklyData.length >= 2 && (
                        <div
                            style={{
                                display: 'flex',
                                fontSize: '12px',
                                gap: '16px',
                                justifyContent: 'center',
                                marginTop: '8px'
                            }}
                        >
                            <span style={{ color: '#64748b' }}>
                                Avg:{' '}
                                <strong style={{ color: '#1e3a5f' }}>
                                    {Math.round(
                                        weeklyData.reduce((s, w) => s + w.yardage, 0) / weeklyData.length
                                    ).toLocaleString()}
                                </strong>{' '}
                                yards/week
                            </span>
                            <span style={{ color: '#64748b' }}>
                                Total:{' '}
                                <strong style={{ color: '#1e3a5f' }}>
                                    {weeklyData.reduce((s, w) => s + w.yardage, 0).toLocaleString()}
                                </strong>{' '}
                                yards
                            </span>
                        </div>
                    )}
                </div>
            )}

            {weeklyData.length > 0 && (
                <div style={chartCardStyle}>
                    <h4 style={chartTitleStyle}>
                        <i className="fa-solid fa-gauge-high" style={{ color: '#10b981' }} />
                        Yards Per Hour (YPH) Trend
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 'auto']} />
                            <Tooltip content={<CustomTooltip />} />
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
                    {weeklyData.length >= 2 &&
                        (() => {
                            const avgYph = weeklyData.reduce((s, w) => s + w.yph, 0) / weeklyData.length
                            const firstHalf = weeklyData.slice(0, Math.floor(weeklyData.length / 2))
                            const secondHalf = weeklyData.slice(Math.floor(weeklyData.length / 2))
                            const firstAvg = firstHalf.reduce((s, w) => s + w.yph, 0) / firstHalf.length
                            const secondAvg = secondHalf.reduce((s, w) => s + w.yph, 0) / secondHalf.length
                            const trend = secondAvg - firstAvg
                            return (
                                <div
                                    style={{
                                        display: 'flex',
                                        fontSize: '12px',
                                        gap: '16px',
                                        justifyContent: 'center',
                                        marginTop: '8px'
                                    }}
                                >
                                    <span style={{ color: '#64748b' }}>
                                        Avg YPH: <strong style={{ color: '#1e3a5f' }}>{avgYph.toFixed(2)}</strong>
                                    </span>
                                    <span style={{ color: trend >= 0 ? '#10b981' : '#ef4444' }}>
                                        <i
                                            className={`fa-solid fa-arrow-${trend >= 0 ? 'up' : 'down'}`}
                                            style={{ marginRight: '4px' }}
                                        />
                                        {Math.abs(trend).toFixed(2)} YPH
                                    </span>
                                </div>
                            )
                        })()}
                </div>
            )}

            {weeklyData.length > 0 &&
                (() => {
                    const totalYards = weeklyData.reduce((s, w) => s + w.yardage, 0)
                    const totalHours = weeklyData.reduce((s, w) => s + w.hours, 0)
                    const avgYph = totalHours > 0 ? (totalYards / totalHours).toFixed(2) : 0

                    const ProductionTooltip = ({ active, label, payload }) => {
                        if (!active || !payload?.length) return null
                        const yards = payload.find((p) => p.dataKey === 'yardage')?.value || 0
                        const hours = payload.find((p) => p.dataKey === 'hours')?.value || 0
                        const weekYph = hours > 0 ? (yards / hours).toFixed(2) : 0
                        return (
                            <div
                                style={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                    padding: '10px 14px'
                                }}
                            >
                                <p style={{ color: '#1e3a5f', fontSize: '13px', fontWeight: 600, margin: '0 0 6px 0' }}>
                                    {label}
                                </p>
                                <p style={{ color: '#0891b2', fontSize: '12px', margin: '2px 0' }}>
                                    Yards: {yards.toLocaleString()}
                                </p>
                                <p style={{ color: '#f97316', fontSize: '12px', margin: '2px 0' }}>
                                    Hours: {hours.toLocaleString()}
                                </p>
                                <p style={{ color: '#10b981', fontSize: '12px', fontWeight: 600, margin: '6px 0 0 0' }}>
                                    YPH: {weekYph}
                                </p>
                            </div>
                        )
                    }

                    return (
                        <div style={chartCardStyle}>
                            <h4 style={chartTitleStyle}>
                                <i className="fa-solid fa-scale-balanced" style={{ color: '#0891b2' }} />
                                Production vs Labor
                            </h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={weeklyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                                    <YAxis
                                        yAxisId="left"
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                    />
                                    <Tooltip content={<ProductionTooltip />} />
                                    <Legend wrapperStyle={{ color: '#64748b', fontSize: 11 }} />
                                    <Bar
                                        yAxisId="left"
                                        dataKey="yardage"
                                        fill="#0891b2"
                                        name="Yards"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        yAxisId="right"
                                        dataKey="hours"
                                        fill="#f97316"
                                        name="Hours"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                            <div
                                style={{
                                    display: 'flex',
                                    fontSize: '12px',
                                    gap: '16px',
                                    justifyContent: 'center',
                                    marginTop: '8px'
                                }}
                            >
                                <span style={{ color: '#0891b2' }}>
                                    <i className="fa-solid fa-cubes-stacked" style={{ marginRight: '4px' }} />
                                    {totalYards.toLocaleString()} yards
                                </span>
                                <span style={{ color: '#f97316' }}>
                                    <i className="fa-solid fa-clock" style={{ marginRight: '4px' }} />
                                    {totalHours.toLocaleString()} hours
                                </span>
                                <span style={{ color: '#10b981' }}>
                                    <i className="fa-solid fa-gauge-high" style={{ marginRight: '4px' }} />
                                    {avgYph} avg YPH
                                </span>
                            </div>
                        </div>
                    )
                })()}

            {/* ===== LOSS & RECOVERY GROUP ===== */}

            {weeklyData.length > 0 && weeklyData.some((w) => w.lost > 0) && (
                <div style={chartCardStyle}>
                    <h4 style={chartTitleStyle}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444' }} />
                        Yardage Lost Per Week
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="lost" fill={COLORS.danger} name="Yards Lost" radius={[4, 4, 0, 0]}>
                                {weeklyData.map((entry, index) => (
                                    <Cell
                                        key={index}
                                        fill={entry.lost === 0 ? '#22c55e' : entry.lost < 10 ? '#f59e0b' : '#ef4444'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div
                        style={{
                            display: 'flex',
                            fontSize: '12px',
                            gap: '16px',
                            justifyContent: 'center',
                            marginTop: '8px'
                        }}
                    >
                        <span style={{ color: '#64748b' }}>
                            Total Lost:{' '}
                            <strong style={{ color: '#ef4444' }}>
                                {weeklyData.reduce((s, w) => s + w.lost, 0).toLocaleString()}
                            </strong>{' '}
                            yards
                        </span>
                        <span style={{ color: '#64748b' }}>
                            Avg/Week:{' '}
                            <strong style={{ color: '#1e3a5f' }}>
                                {Math.round(weeklyData.reduce((s, w) => s + w.lost, 0) / weeklyData.length)}
                            </strong>
                        </span>
                    </div>
                </div>
            )}

            {weeklyData.length > 0 && weeklyData.some((w) => w.lost > 0 || w.resold > 0) && (
                <div style={chartCardStyle}>
                    <h4 style={chartTitleStyle}>
                        <i className="fa-solid fa-recycle" style={{ color: '#10b981' }} />
                        Yardage Recovery (Lost vs Resold)
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ color: '#64748b', fontSize: 11 }} />
                            <Bar dataKey="lost" fill="#ef4444" name="Yards Lost" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="resold" fill="#10b981" name="Yards Resold" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    {(() => {
                        const totalLost = weeklyData.reduce((s, w) => s + w.lost, 0)
                        const totalResold = weeklyData.reduce((s, w) => s + w.resold, 0)
                        const recoveryRate = totalLost > 0 ? Math.round((totalResold / totalLost) * 100) : 0
                        return (
                            <div
                                style={{
                                    display: 'flex',
                                    fontSize: '12px',
                                    gap: '16px',
                                    justifyContent: 'center',
                                    marginTop: '8px'
                                }}
                            >
                                <span style={{ color: '#ef4444' }}>
                                    Lost: <strong>{totalLost.toLocaleString()}</strong>
                                </span>
                                <span style={{ color: '#10b981' }}>
                                    Resold: <strong>{totalResold.toLocaleString()}</strong>
                                </span>
                                <span
                                    style={{
                                        color:
                                            recoveryRate >= 50 ? '#10b981' : recoveryRate >= 25 ? '#f59e0b' : '#ef4444'
                                    }}
                                >
                                    Recovery: <strong>{recoveryRate}%</strong>
                                </span>
                            </div>
                        )
                    })()}
                </div>
            )}

            {/* ===== LABOR & OPERATORS GROUP ===== */}

            {weeklyData.length > 0 && (
                <div style={chartCardStyle}>
                    <h4 style={chartTitleStyle}>
                        <i className="fa-solid fa-users-between-lines" style={{ color: '#0891b2' }} />
                        Weekly Operator Hours
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="hours" fill={COLORS.secondary} name="Hours" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    <div
                        style={{
                            display: 'flex',
                            fontSize: '12px',
                            gap: '16px',
                            justifyContent: 'center',
                            marginTop: '8px'
                        }}
                    >
                        <span style={{ color: '#64748b' }}>
                            Total:{' '}
                            <strong style={{ color: '#1e3a5f' }}>
                                {weeklyData.reduce((s, w) => s + w.hours, 0).toLocaleString()}
                            </strong>{' '}
                            hours
                        </span>
                        <span style={{ color: '#64748b' }}>
                            Avg/Week:{' '}
                            <strong style={{ color: '#1e3a5f' }}>
                                {Math.round(
                                    weeklyData.reduce((s, w) => s + w.hours, 0) / weeklyData.length
                                ).toLocaleString()}
                            </strong>
                        </span>
                    </div>
                </div>
            )}

            {stats &&
                stats.operators.total > 0 &&
                (() => {
                    const operatorData = [
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
                    ].filter(Boolean)
                    return (
                        <div style={chartCardStyle}>
                            <h4 style={chartTitleStyle}>
                                <i className="fa-solid fa-users" style={{ color: '#0891b2' }} />
                                Operator Status
                            </h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={operatorData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={75}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {operatorData.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
                                Total Operators: <strong style={{ color: '#1e3a5f' }}>{stats.operators.total}</strong>
                            </div>
                        </div>
                    )
                })()}

            {/* ===== FLEET & ASSETS GROUP ===== */}

            {stats &&
                stats.fleetTotal > 0 &&
                (() => {
                    const assetData = [
                        !isAggregate &&
                            stats.mixers.total > 0 && {
                                color: '#3b82f6',
                                name: 'Mixers',
                                total: stats.fleetTotal,
                                value: stats.mixers.total
                            },
                        stats.tractors.total > 0 && {
                            color: '#22c55e',
                            name: 'Tractors',
                            total: stats.fleetTotal,
                            value: stats.tractors.total
                        },
                        stats.trailers.total > 0 && {
                            color: '#f59e0b',
                            name: 'Trailers',
                            total: stats.fleetTotal,
                            value: stats.trailers.total
                        },
                        stats.equipment.total > 0 && {
                            color: '#8b5cf6',
                            name: 'Equipment',
                            total: stats.fleetTotal,
                            value: stats.equipment.total
                        },
                        stats.pickups.total > 0 && {
                            color: '#ec4899',
                            name: 'Pickups',
                            total: stats.fleetTotal,
                            value: stats.pickups.total
                        }
                    ].filter(Boolean)
                    return (
                        <div style={chartCardStyle}>
                            <h4 style={chartTitleStyle}>
                                <i className="fa-solid fa-chart-pie" style={{ color: '#2563eb' }} />
                                Asset Distribution
                            </h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={assetData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={75}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {assetData.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
                                Total Assets: <strong style={{ color: '#1e3a5f' }}>{stats.fleetTotal}</strong>
                            </div>
                        </div>
                    )
                })()}

            {shopTimeData.length > 0 && (
                <div style={chartCardStyle}>
                    <h4 style={chartTitleStyle}>
                        <i className="fa-solid fa-clock-rotate-left" style={{ color: '#8b5cf6' }} />
                        Fleet Uptime vs Downtime
                    </h4>
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
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ color: '#64748b', fontSize: 11 }} />
                            <Bar dataKey="activePercent" stackId="a" fill={COLORS.active} name="Active %" />
                            <Bar dataKey="sparePercent" stackId="a" fill={COLORS.spare} name="Spare %" />
                            <Bar dataKey="shopPercent" stackId="a" fill={COLORS.shop} name="In Shop %" />
                        </BarChart>
                    </ResponsiveContainer>
                    <div style={{ color: '#64748b', fontSize: '11px', marginTop: '8px', textAlign: 'center' }}>
                        Based on historical status tracking data
                    </div>
                </div>
            )}

            {stats && (
                <div style={chartCardStyle}>
                    <h4 style={chartTitleStyle}>
                        <i className="fa-solid fa-gauge-high" style={{ color: '#9333ea' }} />
                        Allocation Rate
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                            data={[
                                !isAggregate &&
                                    stats.mixers.total > 0 && {
                                        allocation: stats.mixers.allocationPercent,
                                        name: 'Mixers'
                                    },
                                stats.tractors.total > 0 && {
                                    allocation: stats.tractors.allocationPercent,
                                    name: 'Tractors'
                                },
                                stats.trailers.total > 0 && {
                                    allocation: stats.trailers.allocationPercent,
                                    name: 'Trailers'
                                },
                                stats.equipment.total > 0 && {
                                    allocation: stats.equipment.allocationPercent,
                                    name: 'Equipment'
                                },
                                stats.pickups.total > 0 && {
                                    allocation: stats.pickups.allocationPercent,
                                    name: 'Pickups'
                                }
                            ].filter(Boolean)}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 100]} unit="%" />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="allocation" fill="#8b5cf6" name="Allocation %" radius={[4, 4, 0, 0]}>
                                {[
                                    !isAggregate && stats.mixers.total > 0 && stats.mixers.allocationPercent,
                                    stats.tractors.total > 0 && stats.tractors.allocationPercent,
                                    stats.trailers.total > 0 && stats.trailers.allocationPercent,
                                    stats.equipment.total > 0 && stats.equipment.allocationPercent,
                                    stats.pickups.total > 0 && stats.pickups.allocationPercent
                                ]
                                    .filter((v) => typeof v === 'number')
                                    .map((val, index) => (
                                        <Cell
                                            key={index}
                                            fill={val >= 80 ? '#22c55e' : val >= 50 ? '#f59e0b' : '#ef4444'}
                                        />
                                    ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div
                        style={{
                            display: 'flex',
                            fontSize: '11px',
                            gap: '12px',
                            justifyContent: 'center',
                            marginTop: '8px'
                        }}
                    >
                        <span style={{ alignItems: 'center', color: '#64748b', display: 'flex', gap: '4px' }}>
                            <span
                                style={{ backgroundColor: '#22c55e', borderRadius: '50%', height: '8px', width: '8px' }}
                            />{' '}
                            80%+
                        </span>
                        <span style={{ alignItems: 'center', color: '#64748b', display: 'flex', gap: '4px' }}>
                            <span
                                style={{ backgroundColor: '#f59e0b', borderRadius: '50%', height: '8px', width: '8px' }}
                            />{' '}
                            50-79%
                        </span>
                        <span style={{ alignItems: 'center', color: '#64748b', display: 'flex', gap: '4px' }}>
                            <span
                                style={{ backgroundColor: '#ef4444', borderRadius: '50%', height: '8px', width: '8px' }}
                            />{' '}
                            &lt;50%
                        </span>
                    </div>
                </div>
            )}

            {/* ===== MAINTENANCE & QUALITY GROUP ===== */}

            {stats && (stats.openIssuesTotal > 0 || stats.overdueTotal > 0) && (
                <div style={chartCardStyle}>
                    <h4 style={chartTitleStyle}>
                        <i className="fa-solid fa-wrench" style={{ color: '#f59e0b' }} />
                        Issues & Overdue Service
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                            data={[
                                !isAggregate &&
                                    stats.mixers.total > 0 && {
                                        issues: stats.mixers.issues,
                                        name: 'Mixers',
                                        overdue: stats.mixers.overdue
                                    },
                                stats.tractors.total > 0 && {
                                    issues: stats.tractors.issues,
                                    name: 'Tractors',
                                    overdue: stats.tractors.overdue
                                },
                                stats.trailers.total > 0 && {
                                    issues: stats.trailers.issues,
                                    name: 'Trailers',
                                    overdue: stats.trailers.overdue
                                },
                                stats.equipment.total > 0 && {
                                    issues: stats.equipment.issues,
                                    name: 'Equipment',
                                    overdue: stats.equipment.overdue
                                }
                            ].filter(Boolean)}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ color: '#64748b', fontSize: 11 }} />
                            <Bar dataKey="issues" fill="#f59e0b" name="Open Issues" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="overdue" fill="#dc2626" name="Overdue Service" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    <div
                        style={{
                            display: 'flex',
                            fontSize: '12px',
                            gap: '16px',
                            justifyContent: 'center',
                            marginTop: '8px'
                        }}
                    >
                        <span style={{ color: '#f59e0b' }}>
                            <i className="fa-solid fa-wrench" style={{ marginRight: '4px' }} />
                            {stats.openIssuesTotal} Issues
                        </span>
                        <span style={{ color: '#dc2626' }}>
                            <i className="fa-solid fa-clock" style={{ marginRight: '4px' }} />
                            {stats.overdueTotal} Overdue
                        </span>
                    </div>
                </div>
            )}

            {cleanlinessData.data.length > 0 &&
                !isAggregate &&
                (() => {
                    const total = cleanlinessData.data.reduce((s, d) => s + d.value, 0)
                    const dataWithTotal = cleanlinessData.data.map((d) => ({ ...d, total }))
                    return (
                        <div style={chartCardStyle}>
                            <h4 style={chartTitleStyle}>
                                <i className="fa-solid fa-spray-can-sparkles" style={{ color: '#f59e0b' }} />
                                Mixer Cleanliness Ratings
                            </h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={dataWithTotal}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={75}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {dataWithTotal.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div
                                style={{ color: '#64748b', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}
                            >
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
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                                {cleanlinessData.data.map((entry, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            alignItems: 'center',
                                            color: '#64748b',
                                            display: 'flex',
                                            fontSize: '11px',
                                            gap: '4px'
                                        }}
                                    >
                                        <span
                                            style={{
                                                backgroundColor: entry.color,
                                                borderRadius: '50%',
                                                height: '8px',
                                                width: '8px'
                                            }}
                                        />
                                        {entry.name}: {entry.value}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })()}
        </div>
    )
}
