/* eslint-disable react/forbid-dom-props */
import React from 'react'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts'

import { fmtInt } from '../../../../utils/PlanStatisticsFormatUtility'
import { PLAN_STATS_CHART_TOOLTIP_STYLE } from '../../../../utils/PlanStatisticsUtility'

/** Status palette — mirrors the existing badge colors used throughout the
 *  list view so the chart and the list read as one fleet. */
const STATUS_PALETTE = {
    Active: '#16a34a',
    'Down In Yard': '#dc2626',
    'In Shop': '#3b82f6',
    'Ready For Pickup': '#16a34a',
    Retired: '#94a3b8',
    Spare: '#a855f7',
    'Third Party Work': '#f59e0b',
    'Waiting For Shop': '#ea580c'
}

const fallbackColors = ['#0ea5e9', '#a855f7', '#22c55e', '#f97316', '#06b6d4', '#84cc16', '#f43f5e']

const colorFor = (label, index) => STATUS_PALETTE[label] || fallbackColors[index % fallbackColors.length]

/** Status mix donut — share of the operational fleet by status (including
 *  In-Shop sub-statuses when present). Built on top of recharts so the
 *  visuals match the Plan Statistics dashboards. */
export function StatusPieChart({ data }) {
    if (!data?.length) {
        return (
            <div className="flex items-center justify-center py-8 text-[12px] text-text-tertiary">
                No status data in scope.
            </div>
        )
    }
    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Tooltip
                        contentStyle={PLAN_STATS_CHART_TOOLTIP_STYLE}
                        formatter={(value) => [fmtInt(value), 'Assets']}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Pie
                        data={data}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={1}
                        stroke="var(--bg-primary)"
                    >
                        {data.map((entry, index) => (
                            <Cell key={entry.label} fill={colorFor(entry.label, index)} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}

/** Categorical bar chart — used for tenure buckets, age buckets, and
 *  cleanliness distributions. Accepts a `valueKey` so callers can pick
 *  whatever field carries the count without rewriting the chart. */
export function CategoricalBarChart({ accent, data, height = 220, valueKey = 'count', xKey = 'label' }) {
    if (!data?.length) {
        return (
            <div className="flex items-center justify-center py-8 text-[12px] text-text-tertiary">
                No data to chart.
            </div>
        )
    }
    return (
        <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ bottom: 4, left: 0, right: 8, top: 12 }}>
                    <CartesianGrid stroke="var(--border-light)" strokeDasharray="3 3" />
                    <XAxis dataKey={xKey} stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} />
                    <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} width={36} tickFormatter={fmtInt} />
                    <Tooltip
                        contentStyle={PLAN_STATS_CHART_TOOLTIP_STYLE}
                        cursor={{ fill: `${accent}10` }}
                        formatter={(value) => [fmtInt(value), 'Assets']}
                    />
                    <Bar dataKey={valueKey} name="Assets" fill={accent} radius={[3, 3, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

/** Empty-state row — matches PlanStatisticsPages' `EmptySection` so the
 *  Statistics tabs across Plan and Assets feel like the same surface. */
export function AssetStatsEmpty({ icon = 'fa-circle-info', loading, message }) {
    return (
        <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-text-tertiary">
            <i className={`fas ${loading ? 'fa-spinner animate-dv-spin' : icon} text-[14px]`} />
            <span>{message}</span>
        </div>
    )
}
