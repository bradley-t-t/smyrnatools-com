import React from 'react'
import '../styles/report-styles/Reports.css'
import {supabase} from '../../../services/DatabaseService'
import {ReportUtility} from '../../../utils/ReportUtility'
import {reportTypeMap} from '../../../types/ReportTypes'

export function AggregateProductionSubmitPlugin({form, setForm, readOnly, weekIso, userId}) {
    const [lastWeekAgg, setLastWeekAgg] = React.useState(null)

    React.useEffect(() => {
        let cancelled = false

        async function loadPrevWeekAgg() {
            if (!weekIso) {
                if (!cancelled) setLastWeekAgg(null)
                return
            }
            const targetMondayIso = ReportUtility.getMondayISO(weekIso)
            if (!targetMondayIso) {
                if (!cancelled) setLastWeekAgg(null)
                return
            }
            const prevMonday = new Date(targetMondayIso + 'T00:00:00Z')
            prevMonday.setUTCDate(prevMonday.getUTCDate() - 7)
            const prevSunday = new Date(prevMonday)
            prevSunday.setUTCDate(prevSunday.getUTCDate() - 1)
            const windowEnd = new Date(prevMonday)
            windowEnd.setUTCDate(windowEnd.getUTCDate() + 8)
            const qStart = prevSunday.toISOString()
            const qEnd = windowEnd.toISOString()
            const toMondayIso = d => {
                if (!d) return ''
                const dt = new Date(d)
                if (isNaN(dt)) return ''
                return ReportUtility.getMondayISO(dt)
            }
            const sameIsoDay = (a, b) => a && b && a.slice(0, 10) === b.slice(0, 10)
            let {data: agg} = await supabase.from('reports').select('id,data,week,report_date_range_start,completed,submitted_at').eq('report_name', 'aggregate_production').gte('week', qStart).lt('week', qEnd)
            if (!Array.isArray(agg)) agg = []
            if (agg.length === 0) {
                const resp = await supabase.from('reports').select('id,data,week,report_date_range_start,completed,submitted_at').eq('report_name', 'aggregate_production').gte('report_date_range_start', qStart).lt('report_date_range_start', qEnd)
                if (Array.isArray(resp.data)) agg = resp.data
            }
            const prevMondayIso = ReportUtility.getMondayISO(prevMonday)
            const aggFiltered = agg.filter(r => {
                const weekField = r.week || r.report_date_range_start
                const mondayIso = toMondayIso(weekField)
                return sameIsoDay(mondayIso, prevMondayIso)
            })
            aggFiltered.sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? -1 : 1
                return (b.submitted_at || '').localeCompare(a.submitted_at || '')
            })
            const pick = aggFiltered.find(a => a.completed) || aggFiltered[0] || null
            if (!cancelled) setLastWeekAgg(pick)
        }

        loadPrevWeekAgg()
        return () => {
            cancelled = true
        }
    }, [weekIso])

    function getLastWeekValue(fieldName) {
        const data = lastWeekAgg?.data
        if (!data) return ''
        const v = data[fieldName]
        return v === undefined || v === null ? '' : v
    }

    function formatVariancePercent(fieldName) {
        const lastRaw = getLastWeekValue(fieldName)
        const currRaw = form[fieldName]
        const last = Number(lastRaw)
        const curr = Number(currRaw)
        if (!isFinite(last) || !isFinite(curr)) return ''
        if (last === 0) return curr === 0 ? '0%' : '100%'
        const pct = ((curr - last) / last) * 100
        const rounded = Number(pct.toFixed(1))
        if (rounded === 0) return '0%'
        return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}%`
    }

    function getVarianceClass(v) {
        const n = parseFloat(v)
        if (!isFinite(n)) return 'rpt-variance-neutral'
        if (n > 0) return 'rpt-variance-positive'
        if (n < 0) return 'rpt-variance-negative'
        return 'rpt-variance-neutral'
    }

    function renderVariance(fieldName) {
        const variance = formatVariancePercent(fieldName)
        if (!variance) return <div className="rpt-variance-cell rpt-variance-neutral">—</div>

        const varClass = getVarianceClass(variance)
        const n = parseFloat(variance)
        let symbol = ''

        if (n > 0) {
            symbol = '▲'
        } else if (n < 0) {
            symbol = '▼'
        }

        return (
            <div className={`rpt-variance-cell ${varClass}`}>
                {symbol && <span className="rpt-variance-symbol">{symbol}</span>}
                <span className="rpt-variance-value">{variance}</span>
            </div>
        )
    }

    return (
        <div className="rpt-card rpt-card-accent">
            <div className="rpt-card-header">
                <div className="rpt-card-title">Aggregate Production Report</div>
            </div>
            <div className="rpt-form-row rpt-flex-col">
                <table className="rpt-plant-summary-table rpt-agg-table">
                    <thead>
                    <tr>
                        <th>Material</th>
                        <th>Last Week</th>
                        <th>This Week</th>
                        <th>Variance</th>
                    </tr>
                    </thead>
                    <tbody>
                    {reportTypeMap.aggregate_production.fields.map(f => (
                        <tr key={f.name}>
                            <td>{f.label}</td>
                            <td><input type="text" value={String(getLastWeekValue(f.name))} disabled
                                       className="rpt-input"/></td>
                            <td><input type="number" value={form[f.name] ?? ''}
                                       onChange={e => setForm(prev => ({...prev, [f.name]: e.target.value}))}
                                       disabled={readOnly} className="rpt-input"/></td>
                            <td>{renderVariance(f.name)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export function AggregateProductionReviewPlugin() {
    return (
        <div className="rpt-card">
            <div className="rpt-card-header">
                <div className="rpt-card-title">Aggregate Production Report</div>
            </div>
            <div className="rpt-empty">Review view for Aggregate Production reports.</div>
        </div>
    )
}