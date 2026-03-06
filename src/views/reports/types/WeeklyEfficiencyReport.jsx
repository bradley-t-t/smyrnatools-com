import React, { useEffect, useMemo, useState } from 'react'

import { ReportService } from '../../../services/ReportService'
import { ReportUtility } from '../../../utils/ReportUtility'
import { StatsBar } from './shared'
const getRows = (form) => (Array.isArray(form.rows) ? form.rows : [])
const STAT_ITEMS = [
    { format: (v) => v, key: 'totalLoads', label: 'Total Loads' },
    { format: (v) => v?.toFixed(2) ?? '--', key: 'totalHours', label: 'Total Hours' },
    { format: (v) => v?.toFixed(2) ?? '--', key: 'avgLoads', label: 'Avg Loads' },
    { format: (v) => v?.toFixed(2) ?? '--', key: 'avgHours', label: 'Avg Hours' },
    { format: (v) => v?.toFixed(2) ?? '--', key: 'avgLoadsPerHour', label: 'Avg Loads/Hour' },
    {
        format: (v) => (v !== null ? `${v.toFixed(1)} min` : '--'),
        key: 'avgElapsedStart',
        label: 'Avg Punch In -> 1st Load'
    },
    {
        format: (v) => (v !== null ? `${v.toFixed(1)} min` : '--'),
        key: 'avgElapsedEnd',
        label: 'Avg Washout -> Punch Out'
    }
]
function WarningsBar({ messages }) {
    if (!messages?.length) return null
    return (
        <div className="flex flex-wrap gap-2 mb-4">
            {messages.map((msg, i) => (
                <div
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-3 py-2 text-[0.8125rem] font-medium text-amber-800"
                >
                    <span className="text-sm">⚠</span>
                    <span>{msg}</span>
                </div>
            ))}
        </div>
    )
}
function Toolbar({ filterText, setFilterText, sortKey, sortDir, setSort, onExpandAll, onCollapseAll }) {
    const toggleSort = (key) => setSort(key, sortKey === key && sortDir === 'asc' ? 'desc' : 'asc')
    const sortButtons = [
        { key: 'operator', label: 'Name' },
        { key: 'loads', label: 'Loads' },
        { key: 'hours', label: 'Hours' },
        { key: 'lph', label: 'L/H' }
    ]
    return (
        <div className="flex flex-wrap items-center gap-3 mb-4 rounded-lg border border-gray-200 bg-slate-50 p-4">
            <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter operators or trucks..."
                className="min-w-[200px] flex-1 rounded-md border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/10"
            />
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={onExpandAll}
                    className="rounded-md border border-gray-200 bg-white px-3.5 py-2 text-[0.8125rem] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100"
                >
                    Expand All
                </button>
                <button
                    type="button"
                    onClick={onCollapseAll}
                    className="rounded-md border border-gray-200 bg-white px-3.5 py-2 text-[0.8125rem] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100"
                >
                    Collapse All
                </button>
                {sortButtons.map(({ key, label }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => toggleSort(key)}
                        className="rounded-md border border-gray-200 bg-white px-3.5 py-2 text-[0.8125rem] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100"
                    >
                        Sort {label} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                ))}
            </div>
        </div>
    )
}
function ValidationAlert({ show }) {
    if (!show) return null
    return (
        <div className="mt-2 rounded-md border border-amber-400 border-l-4 bg-gradient-to-br from-amber-100 to-amber-200 p-3 text-[0.8125rem] text-amber-900">
            <div className="mb-2 flex items-center gap-2 font-semibold">
                <i className="fas fa-robot text-base text-amber-500"></i>
                <span>AI Validation Required</span>
            </div>
            <div className="mb-2">
                Your explanation must provide a <strong>specific reason</strong> for the timing issues. Generic or vague
                answers will be rejected.
            </div>
            <div className="rounded bg-white/50 p-2 text-xs">
                <div className="mb-1 text-green-800">
                    <i className="fas fa-check mr-1"></i>
                    <strong>Good:</strong>{' '}
                    {
                        '"Sent to plant 402 for afternoon deliveries" or "Truck breakdown - waited for mechanic" or "Training new driver on route"'
                    }
                </div>
                <div className="text-red-800">
                    <i className="fas fa-times mr-1"></i>
                    <strong>Bad:</strong> {'"N/A" or "mixer" or "truck issues" or unrelated explanations'}
                </div>
            </div>
        </div>
    )
}
const TH_BASE =
    'whitespace-nowrap border-b border-gray-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'
const TD_BASE = 'border-b border-slate-100 px-4 py-3 align-middle text-[0.9375rem] text-slate-800'
function DetailTable({ rows, operatorOptions, sortKey, sortDir, filterText, expandAllSeq, collapseAllSeq }) {
    const [expanded, setExpanded] = useState(new Set())
    const minutes = (timeStr) => ReportUtility.parseTimeToMinutes(timeStr)
    const processed = useMemo(() => {
        const lower = (filterText || '').toLowerCase().trim()
        const filtered = rows.filter((r) => {
            if (!lower) return true
            const name = ReportService.getOperatorName(r, operatorOptions).toLowerCase()
            const truck = String(r.truck_number || '').toLowerCase()
            return name.includes(lower) || truck.includes(lower)
        })
        return filtered
            .map((r, idx) => {
                const start = minutes(r.start_time)
                const first = minutes(r.first_load)
                const eod = minutes(r.eod_in_yard)
                const punch = minutes(r.punch_out)
                const dStart = start !== null && first !== null ? first - start : null
                const dEnd = eod !== null && punch !== null ? punch - eod : null
                const hours = start !== null && punch !== null ? (punch - start) / 60 : null
                const lph = r.loads && hours && hours > 0 ? r.loads / hours : null
                return { dEnd, dStart, hours, key: r.name || `idx:${idx}`, lph, r }
            })
            .sort((a, b) => {
                if (!sortKey) return 0
                const dir = sortDir === 'desc' ? -1 : 1
                if (sortKey === 'operator')
                    return (
                        ReportService.getOperatorName(a.r, operatorOptions).localeCompare(
                            ReportService.getOperatorName(b.r, operatorOptions)
                        ) * dir
                    )
                if (sortKey === 'loads') return ((Number(a.r.loads) || 0) - (Number(b.r.loads) || 0)) * dir
                if (sortKey === 'hours') return ((a.hours ?? -Infinity) - (b.hours ?? -Infinity)) * dir
                if (sortKey === 'lph') return ((a.lph ?? -Infinity) - (b.lph ?? -Infinity)) * dir
                return 0
            })
    }, [rows, operatorOptions, sortKey, sortDir, filterText])
    useEffect(() => {
        if (expandAllSeq) setExpanded(new Set(processed.map((p) => p.key)))
    }, [expandAllSeq, processed])
    useEffect(() => {
        if (collapseAllSeq) setExpanded(new Set())
    }, [collapseAllSeq])
    const toggleExpand = (key) =>
        setExpanded((prev) => {
            const next = new Set(prev)
            next.has(key) ? next.delete(key) : next.add(key)
            return next
        })
    const headers = ['Operator', 'Truck #', 'Punch In -> 1st Load', 'Washout -> Punch Out', 'L/H', '']
    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full min-w-[700px] border-collapse">
                <thead>
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i} className={`${TH_BASE} ${i >= 4 ? 'text-right' : ''}`}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {processed.map(({ r, dStart, dEnd, hours, lph, key }) => {
                        const warnStart = dStart !== null && dStart > 15
                        const warnEnd = dEnd !== null && dEnd > 20
                        const lowLoads = r.loads !== undefined && r.loads !== '' && Number(r.loads) < 3
                        const longHours = hours !== null && hours > 14
                        const needsComment = warnStart || warnEnd || lowLoads || longHours
                        const hasComment = r.comments?.trim()
                        const isOpen = expanded.has(key)
                        return (
                            <React.Fragment key={key}>
                                <tr className="transition-colors hover:bg-slate-50">
                                    <td
                                        className={`${TD_BASE} font-semibold`}
                                        title={ReportService.getOperatorName(r, operatorOptions)}
                                    >
                                        {ReportService.getOperatorName(r, operatorOptions) || 'No Name'}
                                    </td>
                                    <td className={`${TD_BASE} text-slate-500`}>{r.truck_number || '--'}</td>
                                    <td className={`${TD_BASE} ${warnStart ? 'font-medium text-amber-600' : ''}`}>
                                        {dStart !== null ? `${dStart} min` : '--'}
                                    </td>
                                    <td className={`${TD_BASE} ${warnEnd ? 'font-medium text-amber-600' : ''}`}>
                                        {dEnd !== null ? `${dEnd} min` : '--'}
                                    </td>
                                    <td className={`${TD_BASE} text-right`}>
                                        {lph !== null ? Number(lph).toFixed(2) : '--'}
                                    </td>
                                    <td className={`${TD_BASE} text-right`}>
                                        <button
                                            type="button"
                                            aria-expanded={isOpen}
                                            onClick={() => toggleExpand(key)}
                                            title={isOpen ? 'Hide details' : 'Show details'}
                                            className="rounded border border-gray-200 bg-transparent px-2 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                                        >
                                            {isOpen ? '▾' : '▸'}
                                        </button>
                                    </td>
                                </tr>
                                {isOpen && (
                                    <tr>
                                        <td colSpan={6} className="!p-0 bg-slate-50">
                                            <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-4 px-6 py-4">
                                                {[
                                                    { label: 'Start', value: r.start_time },
                                                    { label: '1st Load', value: r.first_load },
                                                    { label: 'EOD In Yard', value: r.eod_in_yard },
                                                    { label: 'Punch Out', value: r.punch_out }
                                                ].map(({ label, value }) => (
                                                    <div key={label}>
                                                        <div className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                                                            {label}
                                                        </div>
                                                        <div className="text-[0.9375rem] text-slate-800">
                                                            {value || '--'}
                                                        </div>
                                                    </div>
                                                ))}
                                                <div>
                                                    <div className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                                                        Total Loads
                                                    </div>
                                                    <div
                                                        className={`text-[0.9375rem] font-semibold ${lowLoads ? 'text-red-600' : 'text-slate-800'}`}
                                                    >
                                                        {r.loads || '--'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                                                        Total Hours
                                                    </div>
                                                    <div
                                                        className={`text-[0.9375rem] font-semibold ${hours !== null && hours > 20 ? 'text-red-600' : 'text-slate-800'}`}
                                                    >
                                                        {hours !== null ? hours.toFixed(2) : '--'}
                                                    </div>
                                                </div>
                                                <div className="col-span-full">
                                                    <div className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                                                        Comments
                                                        {needsComment && (
                                                            <span className="ml-2 font-semibold text-red-600">
                                                                * Required - Explain timing/performance issues
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm italic text-slate-600">
                                                        {r.comments || ''}
                                                    </div>
                                                    <ValidationAlert show={needsComment && !hasComment} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
function EfficiencyPluginBody({ form, operatorOptions }) {
    const [filterText, setFilterText] = useState('')
    const [sortKey, setSortKey] = useState('')
    const [sortDir, setSortDir] = useState('asc')
    const [expandAllSeq, setExpandAllSeq] = useState(0)
    const [collapseAllSeq, setCollapseAllSeq] = useState(0)
    const rows = getRows(form)
    const insights = ReportService.getPlantProductionInsights(rows)
    const setSort = (k, d) => {
        setSortKey(k)
        setSortDir(d)
    }
    if (!rows.length) return null
    const statsItems = STAT_ITEMS.map(({ key, label, format }) => ({
        label,
        value: format(insights[key])
    }))
    return (
        <>
            <div className="mt-5">
                <WarningsBar messages={insights.avgWarnings} />
                <Toolbar
                    filterText={filterText}
                    setFilterText={setFilterText}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    setSort={setSort}
                    onExpandAll={() => setExpandAllSeq((s) => s + 1)}
                    onCollapseAll={() => setCollapseAllSeq((s) => s + 1)}
                />
                <DetailTable
                    rows={rows}
                    operatorOptions={operatorOptions}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    filterText={filterText}
                    expandAllSeq={expandAllSeq}
                    collapseAllSeq={collapseAllSeq}
                />
                <StatsBar items={statsItems} />
            </div>
        </>
    )
}
/** Submit-mode wrapper for the Plant Production (Efficiency) report plugin. */
export function EfficiencySubmitPlugin({ form, operatorOptions }) {
    return <EfficiencyPluginBody form={form} operatorOptions={operatorOptions} />
}
/** Review-mode wrapper for the Plant Production (Efficiency) report plugin (read-only). */
export function EfficiencyReviewPlugin({ form, operatorOptions }) {
    return <EfficiencyPluginBody form={form} operatorOptions={operatorOptions} />
}
