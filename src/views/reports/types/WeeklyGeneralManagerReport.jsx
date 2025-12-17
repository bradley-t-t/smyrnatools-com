import React from 'react'
import '../styles/report-styles/Reports.css'
import {supabase} from '../../../services/DatabaseService'
import {ReportService} from '../../../services/ReportService'
import {ReportUtility} from '../../../utils/ReportUtility'
import {reportTypeMap} from '../../../types/ReportTypes'
import {ReadyMixInstructorReviewPlugin} from './WeeklyReadyMixInstructorReport'

/* eslint-disable no-undef */
export function GeneralManagerSubmitPlugin({form, setForm, plants = [], readOnly, weekIso, userId}) {
    const [effIdx, setEffIdx] = React.useState(0)
    const [effReports, setEffReports] = React.useState([])
    const [aggReport, setAggReport] = React.useState(null)
    const [lastWeekGM, setLastWeekGM] = React.useState(null)
    const [lastWeekAgg, setLastWeekAgg] = React.useState(null)
    const [rmiReport, setRmiReport] = React.useState(null)
    const [rmiLoading, setRmiLoading] = React.useState(true)

    React.useEffect(() => {
        let cancelled = false

        function sameIsoDay(a, b) {
            return a && b && a.slice(0, 10) === b.slice(0, 10)
        }

        function toMondayIso(d) {
            if (!d) return ''
            const dt = new Date(d)
            if (isNaN(dt)) return ''
            return ReportUtility.getMondayISO(dt)
        }

        async function loadEff() {
            const codes = Array.isArray(plants) ? plants.map(p => p.plant_code).filter(Boolean) : []
            if (!weekIso || codes.length === 0) {
                if (!cancelled) {
                    setEffReports([])
                    setAggReport(null)
                }
                return
            }
            const targetMondayIso = ReportUtility.getMondayISO(weekIso)
            if (!targetMondayIso) {
                if (!cancelled) {
                    setEffReports([])
                    setAggReport(null)
                }
                return
            }
            const targetMondayDate = new Date(targetMondayIso + 'T00:00:00Z')
            const prevSunday = new Date(targetMondayDate)
            prevSunday.setUTCDate(prevSunday.getUTCDate() - 1)
            const windowEnd = new Date(targetMondayDate)
            windowEnd.setUTCDate(windowEnd.getUTCDate() + 8)
            const qStart = prevSunday.toISOString()
            const qEnd = windowEnd.toISOString()
            const normU = s => String(s || '').trim().toUpperCase()
            const normN = s => {
                const t = String(s || '').trim()
                const d = t.replace(/^0+/, '')
                return d.length ? d : t.toUpperCase()
            }
            const setU = new Set(codes.map(normU))
            const setN = new Set(codes.map(normN))
            let {data: prod} = await supabase.from('reports').select('id,data,week,submitted_at,report_date_range_start,completed').eq('report_name', 'plant_production').gte('week', qStart).lt('week', qEnd)
            if (!Array.isArray(prod)) prod = []
            if (prod.length === 0) {
                const resp = await supabase.from('reports').select('id,data,week,submitted_at,report_date_range_start,completed').eq('report_name', 'plant_production').gte('report_date_range_start', qStart).lt('report_date_range_start', qEnd)
                if (Array.isArray(resp.data)) prod = resp.data
            }

            function anchorMatches(r) {
                const weekField = r.week || r.report_date_range_start || r?.data?.report_date
                const mondayIso = toMondayIso(weekField)
                return sameIsoDay(mondayIso, targetMondayIso)
            }

            const effRaw = prod.filter(anchorMatches).filter(r => {
                const pc = r?.data?.plant
                if (!pc) return false
                const u = normU(pc)
                const n = normN(pc)
                return setU.has(u) || setN.has(n)
            })
            const byPlant = new Map()
            effRaw.forEach(r => {
                const k = normU(r.data.plant)
                const prev = byPlant.get(k)
                if (!prev) byPlant.set(k, r); else {
                    const take = (prev.completed !== r.completed) ? (r.completed ? r : prev) : ((prev.submitted_at || '') < (r.submitted_at || '') ? r : prev)
                    byPlant.set(k, take)
                }
            })
            const effFinal = [...byPlant.values()].sort((a, b) => {
                const da = String(a.data.plant || '')
                const db = String(b.data.plant || '')
                const na = parseInt(da.replace(/\D/g, ''), 10)
                const nb = parseInt(db.replace(/\D/g, ''), 10)
                const aN = Number.isFinite(na)
                const bN = Number.isFinite(nb)
                if (aN && bN && na !== nb) return na - nb
                if (aN && !bN) return -1
                if (!aN && bN) return 1
                return da.localeCompare(db, undefined, {numeric: true, sensitivity: 'base'})
            })
            if (!cancelled) {
                setEffReports(effFinal.map(r => ({
                    id: r.id,
                    plant_code: r.data.plant,
                    plant_name: r.data.plant,
                    report_date: r.data.report_date || '',
                    rows: Array.isArray(r.data.rows) ? r.data.rows : [],
                    data: r.data,
                    completed: r.completed,
                    submitted_at: r.submitted_at
                })))
                setEffIdx(0)
            }
            let {data: agg} = await supabase.from('reports').select('id,data,week,report_date_range_start,completed,submitted_at').eq('report_name', 'aggregate_production').gte('week', qStart).lt('week', qEnd)
            if (!Array.isArray(agg)) agg = []
            if (agg.length === 0) {
                const resp = await supabase.from('reports').select('id,data,week,report_date_range_start,completed,submitted_at').eq('report_name', 'aggregate_production').gte('report_date_range_start', qStart).lt('report_date_range_start', qEnd)
                if (Array.isArray(resp.data)) agg = resp.data
            }
            const aggFiltered = agg.filter(anchorMatches)
            aggFiltered.sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? -1 : 1
                return (b.submitted_at || '').localeCompare(a.submitted_at || '')
            })
            const pick = aggFiltered.find(a => a.completed) || aggFiltered[0] || null
            if (!cancelled) setAggReport(pick)
        }

        loadEff()
        return () => {
            cancelled = true
        }
    }, [plants, weekIso])

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

    React.useEffect(() => {
        let cancelled = false

        async function loadPrevGM() {
            if (!weekIso) {
                setLastWeekGM(null);
                return
            }
            const targetMondayIso = ReportUtility.getMondayISO(weekIso)
            if (!targetMondayIso) {
                setLastWeekGM(null);
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
            let {data: gm} = await supabase.from('reports').select('id,data,week,report_date_range_start,completed,submitted_at').eq('report_name', 'general_manager').eq('user_id', userId).gte('week', qStart).lt('week', qEnd)
            if (!Array.isArray(gm)) gm = []
            if (gm.length === 0) {
                const resp = await supabase.from('reports').select('id,data,week,report_date_range_start,completed,submitted_at').eq('report_name', 'general_manager').eq('user_id', userId).gte('report_date_range_start', qStart).lt('report_date_range_start', qEnd)
                if (Array.isArray(resp.data)) gm = resp.data
            }
            gm.sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? -1 : 1
                return (b.submitted_at || '').localeCompare(a.submitted_at || '')
            })
            const pick = gm.find(a => a.completed) || gm[0] || null
            if (!cancelled) setLastWeekGM(pick)
        }

        loadPrevGM()
        return () => {
            cancelled = true
        }
    }, [weekIso, userId])

    React.useEffect(() => {
        async function fetchRMIReport() {
            if (!weekIso || !plants?.length) {
                setRmiReport(null)
                setRmiLoading(false)
                return
            }

            const targetMondayIso = ReportUtility.getMondayISO(weekIso)
            if (!targetMondayIso) {
                setRmiReport(null)
                setRmiLoading(false)
                return
            }

            const targetMondayDate = new Date(targetMondayIso + 'T00:00:00Z')
            const prevSunday = new Date(targetMondayDate)
            prevSunday.setUTCDate(prevSunday.getUTCDate() - 1)
            const windowEnd = new Date(targetMondayDate)
            windowEnd.setUTCDate(windowEnd.getUTCDate() + 8)
            const qStart = prevSunday.toISOString()
            const qEnd = windowEnd.toISOString()

            try {
                let {data: reports} = await supabase
                    .from('reports')
                    .select('id,data,week,submitted_at,completed')
                    .eq('report_name', 'ready_mix_instructor')
                    .gte('week', qStart)
                    .lt('week', qEnd)

                if (!Array.isArray(reports)) reports = []

                const filtered = reports.filter(r => {
                    const weekField = r.week
                    const mondayIso = weekField ? ReportUtility.getMondayISO(weekField) : ''
                    return mondayIso === targetMondayIso
                })

                if (filtered.length > 0) {
                    const sorted = filtered.sort((a, b) => {
                        if (a.completed !== b.completed) return b.completed ? 1 : -1
                        return (b.submitted_at || '') > (a.submitted_at || '') ? 1 : -1
                    })
                    setRmiReport(sorted[0].data)
                } else {
                    setRmiReport(null)
                }
            } catch (error) {
                setRmiReport(null)
            } finally {
                setRmiLoading(false)
            }
        }

        fetchRMIReport()
    }, [weekIso, plants])

    function getLastWeekValue(field) {
        const data = lastWeekGM?.data
        if (!data) return ''
        const key = String(field || '')
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const v = data[key]
            return v === undefined || v === null ? '' : v
        }
        const idx = key.lastIndexOf('_')
        if (idx <= 0 || idx === key.length - 1) return ''
        const base = key.slice(0, idx)
        const code = key.slice(idx + 1)
        const normalize = s => {
            const t = String(s || '').trim()
            const upp = t.toUpperCase()
            const digits = t.replace(/\D/g, '')
            const strip = digits.replace(/^0+/, '')
            return {upp, digits: strip || digits}
        }
        const want = normalize(code)
        for (const k of Object.keys(data)) {
            if (!k.startsWith(base + '_')) continue
            const suf = k.slice(base.length + 1)
            const cand = normalize(suf)
            if (cand.upp === want.upp || (cand.digits && want.digits && cand.digits === want.digits)) {
                const v = data[k]
                return v === undefined || v === null ? '' : v
            }
        }
        return ''
    }

    function formatVariancePercent(field) {
        const lastRaw = getLastWeekValue(field)
        const currRaw = form[field]
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

    function renderVariance(field) {
        const variance = formatVariancePercent(field)
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

    function getAggLastWeekValue(fieldName) {
        const data = lastWeekAgg?.data
        if (!data) return ''
        const v = data[fieldName]
        return v === undefined || v === null ? '' : v
    }

    function getAggThisWeekValue(fieldName) {
        const data = aggReport?.data
        if (!data) return ''
        const v = data[fieldName]
        return v === undefined || v === null ? '' : v
    }

    function formatAggVariancePercent(fieldName) {
        const lastRaw = getAggLastWeekValue(fieldName)
        const currRaw = getAggThisWeekValue(fieldName)
        const last = Number(lastRaw)
        const curr = Number(currRaw)
        if (!isFinite(last) || !isFinite(curr)) return ''
        if (last === 0) return curr === 0 ? '0%' : '100%'
        const pct = ((curr - last) / last) * 100
        const rounded = Number(pct.toFixed(1))
        if (rounded === 0) return '0%'
        return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}%`
    }

    function getAggVarianceClass(v) {
        const n = parseFloat(v)
        if (!isFinite(n)) return 'rpt-variance-neutral'
        if (n > 0) return 'rpt-variance-positive'
        if (n < 0) return 'rpt-variance-negative'
        return 'rpt-variance-neutral'
    }

    function renderAggVariance(fieldName) {
        const variance = formatAggVariancePercent(fieldName)
        if (!variance) return <div className="rpt-variance-cell rpt-variance-neutral">—</div>

        const varClass = getAggVarianceClass(variance)
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
                <div className="rpt-card-title">Per-Plant Summary</div>
            </div>
            {plants.length === 0 ? (
                <div className="rpt-empty">No plants found.</div>
            ) : (
                <div className="rpt-form-row rpt-flex-col">
                    {plants.map((p) => {
                        const code = p.plant_code
                        const f = {
                            ops: `active_operators_${code}`,
                            runnable: `runnable_trucks_${code}`,
                            down: `down_trucks_${code}`,
                            starting: `operators_starting_${code}`,
                            leaving: `operators_leaving_${code}`,
                            training: `new_operators_training_${code}`,
                            yardage: `total_yardage_${code}`,
                            hours: `total_hours_${code}`,
                            notes: `notes_${code}`
                        }
                        return (
                            <div key={code} className="rpt-card rpt-p-16 rpt-mb-16">
                                <div className="rpt-card-header">
                                    <div className="rpt-card-title">{p.plant_name} ({code})</div>
                                </div>
                                <table className="rpt-plant-summary-table">
                                    <thead>
                                    <tr>
                                        <th>Metric</th>
                                        <th>Last Week</th>
                                        <th>This Week</th>
                                        <th>Variance</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr>
                                        <td># of Operators</td>
                                        <td><input type="text" value={String(getLastWeekValue(f.ops))} disabled
                                                   className="rpt-input"/></td>
                                        <td><input type="number" value={form[f.ops] ?? ''}
                                                   onChange={e => setForm(prev => ({...prev, [f.ops]: e.target.value}))}
                                                   disabled={readOnly} className="rpt-input"/></td>
                                        <td>{renderVariance(f.ops)}</td>
                                    </tr>
                                    <tr>
                                        <td># of Runnable Trucks</td>
                                        <td><input type="text" value={String(getLastWeekValue(f.runnable))} disabled
                                                   className="rpt-input"/></td>
                                        <td><input type="number" value={form[f.runnable] ?? ''}
                                                   onChange={e => setForm(prev => ({
                                                       ...prev,
                                                       [f.runnable]: e.target.value
                                                   }))} disabled={readOnly} className="rpt-input"/></td>
                                        <td>{renderVariance(f.runnable)}</td>
                                    </tr>
                                    <tr>
                                        <td>Down Trucks</td>
                                        <td><input type="text" value={String(getLastWeekValue(f.down))} disabled
                                                   className="rpt-input"/></td>
                                        <td><input type="number" value={form[f.down] ?? ''}
                                                   onChange={e => setForm(prev => ({
                                                       ...prev,
                                                       [f.down]: e.target.value
                                                   }))} disabled={readOnly} className="rpt-input"/></td>
                                        <td>{renderVariance(f.down)}</td>
                                    </tr>
                                    <tr>
                                        <td>Operators Starting</td>
                                        <td><input type="text" value={String(getLastWeekValue(f.starting))} disabled
                                                   className="rpt-input"/></td>
                                        <td><input type="number" value={form[f.starting] ?? ''}
                                                   onChange={e => setForm(prev => ({
                                                       ...prev,
                                                       [f.starting]: e.target.value
                                                   }))} disabled={readOnly} className="rpt-input"/></td>
                                        <td>{renderVariance(f.starting)}</td>
                                    </tr>
                                    <tr>
                                        <td>Operators Leaving</td>
                                        <td><input type="text" value={String(getLastWeekValue(f.leaving))} disabled
                                                   className="rpt-input"/></td>
                                        <td><input type="number" value={form[f.leaving] ?? ''}
                                                   onChange={e => setForm(prev => ({
                                                       ...prev,
                                                       [f.leaving]: e.target.value
                                                   }))} disabled={readOnly} className="rpt-input"/></td>
                                        <td>{renderVariance(f.leaving)}</td>
                                    </tr>
                                    <tr>
                                        <td>New Operators Training</td>
                                        <td><input type="text" value={String(getLastWeekValue(f.training))} disabled
                                                   className="rpt-input"/></td>
                                        <td><input type="number" value={form[f.training] ?? ''}
                                                   onChange={e => setForm(prev => ({
                                                       ...prev,
                                                       [f.training]: e.target.value
                                                   }))} disabled={readOnly} className="rpt-input"/></td>
                                        <td>{renderVariance(f.training)}</td>
                                    </tr>
                                    <tr>
                                        <td>Total Yardage</td>
                                        <td><input type="text" value={String(getLastWeekValue(f.yardage))} disabled
                                                   className="rpt-input"/></td>
                                        <td><input type="number" value={form[f.yardage] ?? ''}
                                                   onChange={e => setForm(prev => ({
                                                       ...prev,
                                                       [f.yardage]: e.target.value
                                                   }))} disabled={readOnly} className="rpt-input"/></td>
                                        <td>{renderVariance(f.yardage)}</td>
                                    </tr>
                                    <tr>
                                        <td>Total Hours</td>
                                        <td><input type="text" value={String(getLastWeekValue(f.hours))} disabled
                                                   className="rpt-input"/></td>
                                        <td><input type="number" value={form[f.hours] ?? ''}
                                                   onChange={e => setForm(prev => ({
                                                       ...prev,
                                                       [f.hours]: e.target.value
                                                   }))} disabled={readOnly} className="rpt-input"/></td>
                                        <td>{renderVariance(f.hours)}</td>
                                    </tr>
                                    <tr>
                                        <td>Notes</td>
                                        <td>
                                            <textarea 
                                                value={String(getLastWeekValue(f.notes))} 
                                                disabled
                                                className="rpt-input rpt-textarea-notes"
                                            />
                                        </td>
                                        <td colSpan={2}>
                                            <textarea 
                                                value={form[f.notes] ?? ''}
                                                onChange={e => setForm(prev => ({
                                                    ...prev,
                                                    [f.notes]: e.target.value
                                                }))} 
                                                disabled={readOnly} 
                                                className="rpt-input rpt-textarea-notes"
                                            />
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                        )
                    })}
                </div>
            )}
            <div className="rpt-card-header rpt-mt-16">
                <div className="rpt-card-title">Plant Efficiency Reports</div>
                {effReports.length > 0 && (<div className="rpt-badge">{effIdx + 1} of {effReports.length}</div>)}
            </div>
            {effReports.length === 0 ? (
                <div className="rpt-empty">No plant efficiency reports found for this week.</div>
            ) : (
                <div className="rpt-form-row rpt-flex-col">
                    <div className="rpt-dots-bar">
                        {effReports.map((r, i) => (
                            <div key={r.id} onClick={() => setEffIdx(i)}
                                 className={`rpt-dot ${i === effIdx ? 'active' : ''}`}
                                 aria-label={`Efficiency Report ${i + 1}`}></div>
                        ))}
                    </div>
                    {(() => {
                        const r = effReports[effIdx]
                        const insights = ReportService.getPlantProductionInsights(r.rows || [])
                        return (
                            <div className="rpt-card rpt-p-16">
                                <div className="rpt-card-header">
                                    <div
                                        className="rpt-card-title">{r.plant_name} ({r.plant_code}){r.report_date ? ` - ${r.report_date}` : ''}</div>
                                    <div className="rpt-card-actions">
                                        <button type="button" className="rpt-secondary-btn"
                                                onClick={() => setEffIdx(i => Math.max(i - 1, 0))}
                                                disabled={effIdx === 0}>← Prev Report
                                        </button>
                                        <button type="button" className="rpt-primary-btn"
                                                onClick={() => setEffIdx(i => Math.min(i + 1, effReports.length - 1))}
                                                disabled={effIdx === effReports.length - 1}>Next Report →
                                        </button>
                                    </div>
                                </div>
                                <div className="rpt-stats">
                                    <div className="rpt-stat-card">
                                        <div className="rpt-stat-label">Total Loads</div>
                                        <div className="rpt-stat-value">{insights.totalLoads || 0}</div>
                                    </div>
                                    <div className="rpt-stat-card">
                                        <div className="rpt-stat-label">Total Hours</div>
                                        <div
                                            className="rpt-stat-value">{insights.totalHours !== null ? insights.totalHours.toFixed(2) : '--'}</div>
                                    </div>
                                    <div className="rpt-stat-card">
                                        <div className="rpt-stat-label">Avg Loads</div>
                                        <div
                                            className="rpt-stat-value">{insights.avgLoads !== null ? insights.avgLoads.toFixed(2) : '--'}</div>
                                    </div>
                                    <div className="rpt-stat-card">
                                        <div className="rpt-stat-label">Avg Hours</div>
                                        <div
                                            className="rpt-stat-value">{insights.avgHours !== null ? insights.avgHours.toFixed(2) : '--'}</div>
                                    </div>
                                    <div className="rpt-stat-card">
                                        <div className="rpt-stat-label">Avg L/H</div>
                                        <div
                                            className="rpt-stat-value">{insights.avgLoadsPerHour !== null ? insights.avgLoadsPerHour.toFixed(2) : '--'}</div>
                                    </div>
                                    <div className="rpt-stat-card">
                                        <div className="rpt-stat-label">Punch In → 1st</div>
                                        <div
                                            className="rpt-stat-value">{insights.avgElapsedStart !== null ? `${insights.avgElapsedStart.toFixed(1)} min` : '--'}</div>
                                    </div>
                                    <div className="rpt-stat-card">
                                        <div className="rpt-stat-label">Washout → Punch</div>
                                        <div
                                            className="rpt-stat-value">{insights.avgElapsedEnd !== null ? `${insights.avgElapsedEnd.toFixed(1)} min` : '--'}</div>
                                    </div>
                                </div>
                            </div>
                        )
                    })()}
                    <div className="rpt-section-title">Aggregate Production</div>
                    <div className="rpt-card rpt-p-16">
                        {aggReport ? (
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
                                        <td>{getAggLastWeekValue(f.name) || '—'}</td>
                                        <td>{aggReport.data?.[f.name] ?? '—'}</td>
                                        <td>{renderAggVariance(f.name)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="rpt-empty">No aggregate production report found.</div>
                        )}
                    </div>
                </div>
            )}

            <div className="rpt-section-spacing">
                <div className="rpt-card-header">
                    <div className="rpt-card-title">Ready Mix Instructor Report</div>
                </div>
                {rmiLoading ? (
                    <div className="rpt-empty">Loading RMI report data...</div>
                ) : rmiReport ? (
                    <ReadyMixInstructorReviewPlugin form={rmiReport} plants={plants}/>
                ) : (
                    <div className="rpt-empty">No Ready Mix Instructor report found for this week.</div>
                )}
            </div>
        </div>
    )
}

export function GeneralManagerReviewPlugin({form, plants = [], weekIso}) {
    const [rmiReport, setRmiReport] = React.useState(null)
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        async function fetchRMIReport() {
            if (!weekIso || !plants?.length) {
                setRmiReport(null)
                setLoading(false)
                return
            }

            const targetMondayIso = ReportUtility.getMondayISO(weekIso)
            if (!targetMondayIso) {
                setRmiReport(null)
                setLoading(false)
                return
            }

            const targetMondayDate = new Date(targetMondayIso + 'T00:00:00Z')
            const prevSunday = new Date(targetMondayDate)
            prevSunday.setUTCDate(prevSunday.getUTCDate() - 1)
            const windowEnd = new Date(targetMondayDate)
            windowEnd.setUTCDate(windowEnd.getUTCDate() + 8)
            const qStart = prevSunday.toISOString()
            const qEnd = windowEnd.toISOString()

            try {
                let {data: reports} = await supabase
                    .from('reports')
                    .select('id,data,week,submitted_at,completed')
                    .eq('report_name', 'ready_mix_instructor')
                    .gte('week', qStart)
                    .lt('week', qEnd)

                if (!Array.isArray(reports)) reports = []

                const filtered = reports.filter(r => {
                    const weekField = r.week
                    const mondayIso = weekField ? ReportUtility.getMondayISO(weekField) : ''
                    return mondayIso === targetMondayIso
                })

                if (filtered.length > 0) {
                    const sorted = filtered.sort((a, b) => {
                        if (a.completed !== b.completed) return b.completed ? 1 : -1
                        return (b.submitted_at || '') > (a.submitted_at || '') ? 1 : -1
                    })
                    setRmiReport(sorted[0].data)
                } else {
                    setRmiReport(null)
                }
            } catch (error) {
                setRmiReport(null)
            } finally {
                setLoading(false)
            }
        }

        fetchRMIReport()
    }, [weekIso, plants])

    return (
        <div className="rpt-card">
            <div className="rpt-card-header">
                <div className="rpt-card-title">General Manager Report</div>
            </div>
            <div className="rpt-empty">Review view for General Manager reports.</div>

            <div className="rpt-section-spacing">
                <div className="rpt-card-header">
                    <div className="rpt-card-title">Ready Mix Instructor Report</div>
                </div>
                {loading ? (
                    <div className="rpt-empty">Loading RMI report data...</div>
                ) : rmiReport ? (
                    <ReadyMixInstructorReviewPlugin form={rmiReport} plants={plants}/>
                ) : (
                    <div className="rpt-empty">No Ready Mix Instructor report found for this week.</div>
                )}
            </div>
        </div>
    )
}