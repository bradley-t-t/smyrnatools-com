import React, { useEffect, useMemo, useState } from 'react'

import { ReportService } from '../../../services/ReportService'
import { ReportUtility } from '../../../utils/ReportUtility'
import { reportPluginStyles, StatsBar } from './shared'

const effReportStyles =
    reportPluginStyles +
    `
.rpt-validation-alert { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-left: 4px solid #f59e0b; border-radius: 6px; color: #92400e; font-size: 0.8125rem; margin-top: 8px; padding: 12px; }
.rpt-validation-header { display: flex; align-items: center; font-weight: 600; gap: 8px; margin-bottom: 8px; }
.rpt-validation-examples { background: rgba(255,255,255,0.5); border-radius: 4px; font-size: 0.75rem; padding: 8px; }
.rpt-example-good { color: #166534; margin-bottom: 4px; }
.rpt-example-bad { color: #991b1b; }
`

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
        <div className="rpt-warnings">
            {messages.map((msg, i) => (
                <div key={i} className="rpt-warning-chip">
                    <span className="rpt-warning-icon">⚠</span>
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
        <div className="rpt-toolbar">
            <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter operators or trucks..."
                className="rpt-filter-input"
            />
            <div className="rpt-toolbar-actions">
                <button type="button" onClick={onExpandAll} className="rpt-btn">
                    Expand All
                </button>
                <button type="button" onClick={onCollapseAll} className="rpt-btn">
                    Collapse All
                </button>
                {sortButtons.map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => toggleSort(key)} className="rpt-btn">
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
        <div className="rpt-validation-alert">
            <div className="rpt-validation-header">
                <i className="fas fa-robot" style={{ color: '#f59e0b', fontSize: '1rem' }}></i>
                <span>AI Validation Required</span>
            </div>
            <div style={{ marginBottom: '8px' }}>
                Your explanation must provide a <strong>specific reason</strong> for the timing issues. Generic or vague
                answers will be rejected.
            </div>
            <div className="rpt-validation-examples">
                <div className="rpt-example-good">
                    <i className="fas fa-check" style={{ marginRight: '4px' }}></i>
                    <strong>Good:</strong>{' '}
                    {
                        '"Sent to plant 402 for afternoon deliveries" or "Truck breakdown - waited for mechanic" or "Training new driver on route"'
                    }
                </div>
                <div className="rpt-example-bad">
                    <i className="fas fa-times" style={{ marginRight: '4px' }}></i>
                    <strong>Bad:</strong> {'"N/A" or "mixer" or "truck issues" or unrelated explanations'}
                </div>
            </div>
        </div>
    )
}

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
        <div className="rpt-table-wrapper">
            <table className="rpt-table">
                <colgroup>
                    {[
                        'rpt-col-operator',
                        'rpt-col-truck',
                        'rpt-col-start',
                        'rpt-col-end',
                        'rpt-col-lph',
                        'rpt-col-actions'
                    ].map((c, i) => (
                        <col key={i} className={c} />
                    ))}
                </colgroup>
                <thead>
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i} className={`rpt-th ${i >= 4 ? 'right' : ''}`}>
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
                                <tr className="rpt-row">
                                    <td
                                        className="rpt-td emphasis"
                                        title={ReportService.getOperatorName(r, operatorOptions)}
                                    >
                                        {ReportService.getOperatorName(r, operatorOptions) || 'No Name'}
                                    </td>
                                    <td className="rpt-td secondary">{r.truck_number || '--'}</td>
                                    <td className={`rpt-td ${warnStart ? 'warn' : ''}`}>
                                        {dStart !== null ? `${dStart} min` : '--'}
                                    </td>
                                    <td className={`rpt-td ${warnEnd ? 'warn' : ''}`}>
                                        {dEnd !== null ? `${dEnd} min` : '--'}
                                    </td>
                                    <td className="rpt-td right">{lph !== null ? Number(lph).toFixed(2) : '--'}</td>
                                    <td className="rpt-td right">
                                        <button
                                            type="button"
                                            aria-expanded={isOpen}
                                            onClick={() => toggleExpand(key)}
                                            title={isOpen ? 'Hide details' : 'Show details'}
                                            className="rpt-icon-btn"
                                        >
                                            {isOpen ? '▾' : '▸'}
                                        </button>
                                    </td>
                                </tr>
                                {isOpen && (
                                    <tr>
                                        <td colSpan={6} className="rpt-detail-row">
                                            <div className="rpt-detail-grid">
                                                {[
                                                    { label: 'Start', value: r.start_time },
                                                    { label: '1st Load', value: r.first_load },
                                                    { label: 'EOD In Yard', value: r.eod_in_yard },
                                                    { label: 'Punch Out', value: r.punch_out }
                                                ].map(({ label, value }) => (
                                                    <div key={label}>
                                                        <div className="rpt-field-label">{label}</div>
                                                        <div className="rpt-field-value">{value || '--'}</div>
                                                    </div>
                                                ))}
                                                <div>
                                                    <div className="rpt-field-label">Total Loads</div>
                                                    <div
                                                        className={`rpt-field-value emphasis ${lowLoads ? 'rpt-error-text' : ''}`}
                                                    >
                                                        {r.loads || '--'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="rpt-field-label">Total Hours</div>
                                                    <div
                                                        className={`rpt-field-value emphasis ${hours !== null && hours > 20 ? 'rpt-error-text' : ''}`}
                                                    >
                                                        {hours !== null ? hours.toFixed(2) : '--'}
                                                    </div>
                                                </div>
                                                <div className="rpt-detail-grid-full">
                                                    <div className="rpt-field-label">
                                                        Comments
                                                        {needsComment && (
                                                            <span
                                                                style={{
                                                                    color: '#dc2626',
                                                                    fontWeight: 600,
                                                                    marginLeft: '8px'
                                                                }}
                                                            >
                                                                * Required - Explain timing/performance issues
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="rpt-comment-text">{r.comments || ''}</div>
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
            <style>{effReportStyles}</style>
            <div className="rpt-mt-20">
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
