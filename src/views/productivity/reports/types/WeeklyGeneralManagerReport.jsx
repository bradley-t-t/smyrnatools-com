import React from 'react'

import { reportTypeMap } from '../../../../app/types/ReportTypes'
import { AIService } from '../../../../services/AIService'
import { supabase } from '../../../../services/DatabaseService'
import { ReportService } from '../../../../services/ReportService'
import { ReportUtility } from '../../../../utils/ReportUtility'
import { RPT_INPUT, RPT_TEXTAREA, TD_STYLE, TH_STYLE, useReportForWeek } from './shared'
import { ReadyMixInstructorReviewPlugin } from './WeeklyReadyMixInstructorReport'
const VARIANCE_CLASSES = {
    negative: 'text-red-600 bg-red-100',
    neutral: 'text-slate-500 bg-slate-100',
    positive: 'text-emerald-600 bg-emerald-100'
}
/* eslint-disable no-undef */
/** Submit-mode plugin for the General Manager report — collects per-plant metrics (operators, trucks, yardage, hours) with AI summary generation. */
export function GeneralManagerSubmitPlugin({ form, setForm, plants = [], readOnly, weekIso, userId }) {
    const [effIdx, setEffIdx] = React.useState(0)
    const [effReports, setEffReports] = React.useState([])
    const [aggReport, setAggReport] = React.useState(null)
    const [lastWeekGM, setLastWeekGM] = React.useState(null)
    const [lastWeekAgg, setLastWeekAgg] = React.useState(null)
    const [rmiReport, setRmiReport] = React.useState(null)
    const [rmiLoading, setRmiLoading] = React.useState(true)
    const [aiAnalysis, setAiAnalysis] = React.useState(null)
    const [aiLoading, setAiLoading] = React.useState(false)
    const [aiError, setAiError] = React.useState(false)
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
            const codes = Array.isArray(plants) ? plants.map((p) => p.plant_code).filter(Boolean) : []
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
            const normU = (s) =>
                String(s || '')
                    .trim()
                    .toUpperCase()
            const normN = (s) => {
                const t = String(s || '').trim()
                const d = t.replace(/^0+/, '')
                return d.length ? d : t.toUpperCase()
            }
            const setU = new Set(codes.map(normU))
            const setN = new Set(codes.map(normN))
            let { data: prod } = await supabase
                .from('reports')
                .select('id,data,week,submitted_at,report_date_range_start,completed')
                .eq('report_name', 'plant_production')
                .gte('week', qStart)
                .lt('week', qEnd)
            if (!Array.isArray(prod)) prod = []
            if (prod.length === 0) {
                const resp = await supabase
                    .from('reports')
                    .select('id,data,week,submitted_at,report_date_range_start,completed')
                    .eq('report_name', 'plant_production')
                    .gte('report_date_range_start', qStart)
                    .lt('report_date_range_start', qEnd)
                if (Array.isArray(resp.data)) prod = resp.data
            }
            function anchorMatches(r) {
                const weekField = r.week || r.report_date_range_start || r?.data?.report_date
                const mondayIso = toMondayIso(weekField)
                return sameIsoDay(mondayIso, targetMondayIso)
            }
            const effRaw = prod.filter(anchorMatches).filter((r) => {
                const pc = r?.data?.plant
                if (!pc) return false
                const u = normU(pc)
                const n = normN(pc)
                return setU.has(u) || setN.has(n)
            })
            const byPlant = new Map()
            effRaw.forEach((r) => {
                const k = normU(r.data.plant)
                const prev = byPlant.get(k)
                if (!prev) byPlant.set(k, r)
                else {
                    const take =
                        prev.completed !== r.completed
                            ? r.completed
                                ? r
                                : prev
                            : (prev.submitted_at || '') < (r.submitted_at || '')
                              ? r
                              : prev
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
                return da.localeCompare(db, undefined, { numeric: true, sensitivity: 'base' })
            })
            if (!cancelled) {
                setEffReports(
                    effFinal.map((r) => ({
                        completed: r.completed,
                        data: r.data,
                        id: r.id,
                        plant_code: r.data.plant,
                        plant_name: r.data.plant,
                        report_date: r.data.report_date || '',
                        rows: Array.isArray(r.data.rows) ? r.data.rows : [],
                        submitted_at: r.submitted_at
                    }))
                )
                setEffIdx(0)
            }
            let { data: agg } = await supabase
                .from('reports')
                .select('id,data,week,report_date_range_start,completed,submitted_at')
                .eq('report_name', 'aggregate_production')
                .gte('week', qStart)
                .lt('week', qEnd)
            if (!Array.isArray(agg)) agg = []
            if (agg.length === 0) {
                const resp = await supabase
                    .from('reports')
                    .select('id,data,week,report_date_range_start,completed,submitted_at')
                    .eq('report_name', 'aggregate_production')
                    .gte('report_date_range_start', qStart)
                    .lt('report_date_range_start', qEnd)
                if (Array.isArray(resp.data)) agg = resp.data
            }
            const aggFiltered = agg.filter(anchorMatches)
            aggFiltered.sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? -1 : 1
                return (b.submitted_at || '').localeCompare(a.submitted_at || '')
            })
            const pick = aggFiltered.find((a) => a.completed) || aggFiltered[0] || null
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
            const toMondayIso = (d) => {
                if (!d) return ''
                const dt = new Date(d)
                if (isNaN(dt)) return ''
                return ReportUtility.getMondayISO(dt)
            }
            const sameIsoDay = (a, b) => a && b && a.slice(0, 10) === b.slice(0, 10)
            let { data: agg } = await supabase
                .from('reports')
                .select('id,data,week,report_date_range_start,completed,submitted_at')
                .eq('report_name', 'aggregate_production')
                .gte('week', qStart)
                .lt('week', qEnd)
            if (!Array.isArray(agg)) agg = []
            if (agg.length === 0) {
                const resp = await supabase
                    .from('reports')
                    .select('id,data,week,report_date_range_start,completed,submitted_at')
                    .eq('report_name', 'aggregate_production')
                    .gte('report_date_range_start', qStart)
                    .lt('report_date_range_start', qEnd)
                if (Array.isArray(resp.data)) agg = resp.data
            }
            const prevMondayIso = ReportUtility.getMondayISO(prevMonday)
            const aggFiltered = agg.filter((r) => {
                const weekField = r.week || r.report_date_range_start
                const mondayIso = toMondayIso(weekField)
                return sameIsoDay(mondayIso, prevMondayIso)
            })
            aggFiltered.sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? -1 : 1
                return (b.submitted_at || '').localeCompare(a.submitted_at || '')
            })
            const pick = aggFiltered.find((a) => a.completed) || aggFiltered[0] || null
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
                setLastWeekGM(null)
                return
            }
            const targetMondayIso = ReportUtility.getMondayISO(weekIso)
            if (!targetMondayIso) {
                setLastWeekGM(null)
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
            let { data: gm } = await supabase
                .from('reports')
                .select('id,data,week,report_date_range_start,completed,submitted_at')
                .eq('report_name', 'general_manager')
                .eq('user_id', userId)
                .gte('week', qStart)
                .lt('week', qEnd)
            if (!Array.isArray(gm)) gm = []
            if (gm.length === 0) {
                const resp = await supabase
                    .from('reports')
                    .select('id,data,week,report_date_range_start,completed,submitted_at')
                    .eq('report_name', 'general_manager')
                    .eq('user_id', userId)
                    .gte('report_date_range_start', qStart)
                    .lt('report_date_range_start', qEnd)
                if (Array.isArray(resp.data)) gm = resp.data
            }
            gm.sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? -1 : 1
                return (b.submitted_at || '').localeCompare(a.submitted_at || '')
            })
            const pick = gm.find((a) => a.completed) || gm[0] || null
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
                let { data: reports } = await supabase
                    .from('reports')
                    .select('id,data,week,submitted_at,completed')
                    .eq('report_name', 'ready_mix_instructor')
                    .gte('week', qStart)
                    .lt('week', qEnd)
                if (!Array.isArray(reports)) reports = []
                const filtered = reports.filter((r) => {
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
    const getLastWeekValue = React.useCallback(
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
            const normalize = (s) => {
                const t = String(s || '').trim()
                const upp = t.toUpperCase()
                const digits = t.replace(/\D/g, '')
                const strip = digits.replace(/^0+/, '')
                return { digits: strip || digits, upp }
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
        },
        [lastWeekGM]
    )
    React.useEffect(() => {
        let cancelled = false
        async function generateAnalysis() {
            if (!plants.length || !weekIso) return
            if (aiAnalysis) return
            setAiLoading(true)
            setAiError(false)
            try {
                const plantSummaries = plants.map((p) => {
                    const code = p.plant_code
                    return {
                        downTrucks: form[`down_trucks_${code}`],
                        hours: form[`total_hours_${code}`],
                        lastWeekDown: getLastWeekValue(`down_trucks_${code}`),
                        lastWeekHours: getLastWeekValue(`total_hours_${code}`),
                        lastWeekOperators: getLastWeekValue(`active_operators_${code}`),
                        lastWeekRunnable: getLastWeekValue(`runnable_trucks_${code}`),
                        lastWeekYardage: getLastWeekValue(`total_yardage_${code}`),
                        notes: form[`notes_${code}`],
                        operators: form[`active_operators_${code}`],
                        operatorsLeaving: form[`operators_leaving_${code}`],
                        operatorsStarting: form[`operators_starting_${code}`],
                        operatorsTraining: form[`new_operators_training_${code}`],
                        plantCode: code,
                        plantName: p.plant_name || code,
                        runnableTrucks: form[`runnable_trucks_${code}`],
                        yardage: form[`total_yardage_${code}`]
                    }
                })
                const efficiencyData = effReports.map((r) => {
                    const insights = ReportService.getPlantProductionInsights(r.rows || [])
                    return {
                        avgLoadsPerHour: insights.avgLoadsPerHour,
                        plantCode: r.plant_code,
                        totalHours: insights.totalHours,
                        totalLoads: insights.totalLoads
                    }
                })
                const reportContext = {
                    aggregateData: aggReport?.data || null,
                    efficiencyReports: efficiencyData,
                    plantSummaries,
                    plants,
                    rmiReport: rmiReport,
                    weekIso
                }
                const analysis = await AIService.generateGMReportAnalysis(reportContext)
                if (!cancelled) {
                    if (analysis) {
                        setAiAnalysis(analysis)
                    } else {
                        setAiError(true)
                    }
                }
            } catch (err) {
                console.error('Error generating AI analysis:', err)
                if (!cancelled) setAiError(true)
            } finally {
                if (!cancelled) setAiLoading(false)
            }
        }
        const hasData = Object.keys(form).some((k) => form[k] !== undefined && form[k] !== '')
        if (hasData && !rmiLoading) {
            generateAnalysis()
        }
        return () => {
            cancelled = true
        }
    }, [plants, weekIso, form, effReports, aggReport, rmiReport, rmiLoading, aiAnalysis, getLastWeekValue])
    const handleRegenerateAI = React.useCallback(async () => {
        setAiAnalysis(null)
        setAiLoading(true)
        setAiError(false)
        try {
            const plantSummaries = plants.map((p) => {
                const code = p.plant_code
                return {
                    downTrucks: form[`down_trucks_${code}`],
                    hours: form[`total_hours_${code}`],
                    lastWeekDown: getLastWeekValue(`down_trucks_${code}`),
                    lastWeekHours: getLastWeekValue(`total_hours_${code}`),
                    lastWeekOperators: getLastWeekValue(`active_operators_${code}`),
                    lastWeekRunnable: getLastWeekValue(`runnable_trucks_${code}`),
                    lastWeekYardage: getLastWeekValue(`total_yardage_${code}`),
                    notes: form[`notes_${code}`],
                    operators: form[`active_operators_${code}`],
                    operatorsLeaving: form[`operators_leaving_${code}`],
                    operatorsStarting: form[`operators_starting_${code}`],
                    operatorsTraining: form[`new_operators_training_${code}`],
                    plantCode: code,
                    plantName: p.plant_name || code,
                    runnableTrucks: form[`runnable_trucks_${code}`],
                    yardage: form[`total_yardage_${code}`]
                }
            })
            const efficiencyData = effReports.map((r) => {
                const insights = ReportService.getPlantProductionInsights(r.rows || [])
                return {
                    avgLoadsPerHour: insights.avgLoadsPerHour,
                    plantCode: r.plant_code,
                    totalHours: insights.totalHours,
                    totalLoads: insights.totalLoads
                }
            })
            const reportContext = {
                aggregateData: aggReport?.data || null,
                efficiencyReports: efficiencyData,
                plantSummaries,
                plants,
                rmiReport: rmiReport,
                weekIso
            }
            const analysis = await AIService.generateGMReportAnalysis(reportContext)
            if (analysis) {
                setAiAnalysis(analysis)
            } else {
                setAiError(true)
            }
        } catch (err) {
            console.error('Error regenerating AI analysis:', err)
            setAiError(true)
        } finally {
            setAiLoading(false)
        }
    }, [plants, weekIso, form, effReports, aggReport, rmiReport, getLastWeekValue])
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
        if (!isFinite(n)) return VARIANCE_CLASSES.neutral
        if (n > 0) return VARIANCE_CLASSES.positive
        if (n < 0) return VARIANCE_CLASSES.negative
        return VARIANCE_CLASSES.neutral
    }
    function renderVariance(field) {
        const variance = formatVariancePercent(field)
        if (!variance)
            return (
                <div className="inline-flex items-center gap-1 rounded px-2 py-1 text-[0.8125rem] font-semibold text-slate-500 bg-slate-100">
                    —
                </div>
            )
        const varClass = getVarianceClass(variance)
        const n = parseFloat(variance)
        const symbol = n > 0 ? '▲' : n < 0 ? '▼' : ''
        return (
            <div
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[0.8125rem] font-semibold ${varClass}`}
            >
                {symbol && <span className="text-[0.6875rem]">{symbol}</span>}
                <span>{variance}</span>
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
        if (!isFinite(n)) return VARIANCE_CLASSES.neutral
        if (n > 0) return VARIANCE_CLASSES.positive
        if (n < 0) return VARIANCE_CLASSES.negative
        return VARIANCE_CLASSES.neutral
    }
    function renderAggVariance(fieldName) {
        const variance = formatAggVariancePercent(fieldName)
        if (!variance)
            return (
                <div className="inline-flex items-center gap-1 rounded px-2 py-1 text-[0.8125rem] font-semibold text-slate-500 bg-slate-100">
                    —
                </div>
            )
        const varClass = getAggVarianceClass(variance)
        const n = parseFloat(variance)
        const symbol = n > 0 ? '▲' : n < 0 ? '▼' : ''
        return (
            <div
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[0.8125rem] font-semibold ${varClass}`}
            >
                {symbol && <span className="text-[0.6875rem]">{symbol}</span>}
                <span>{variance}</span>
            </div>
        )
    }
    return (
        <>
            {aiLoading && (
                <div className="rounded-xl bg-gradient-to-br from-accent to-accent/70 p-5 mb-6 text-white">
                    <div className="flex items-center justify-center gap-2 p-4 text-sm opacity-80">
                        <i className="fas fa-circle-notch fa-spin"></i>
                        <span>Generating AI Analysis...</span>
                    </div>
                </div>
            )}
            {aiError && !aiLoading && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 mb-6">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Failed to generate AI analysis.
                    <button
                        onClick={handleRegenerateAI}
                        className="ml-2 cursor-pointer underline bg-transparent border-none text-inherit"
                    >
                        Try again
                    </button>
                </div>
            )}
            {aiAnalysis && !aiLoading && (
                <div className="rounded-xl bg-gradient-to-br from-accent to-accent/70 p-5 mb-6 text-white">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-base">
                            <i className="fas fa-robot"></i>
                        </div>
                        <div>
                            <div className="font-semibold text-[0.9375rem] m-0">AI Regional Analysis</div>
                            <div className="text-xs opacity-80 m-0">
                                Based on report data for {plants.length} plant{plants.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>
                    <div className="text-sm leading-relaxed opacity-95 whitespace-pre-wrap">{aiAnalysis}</div>
                    <button
                        className="mt-3 rounded-md border border-white/30 bg-white/15 px-3 py-1.5 text-xs text-white cursor-pointer hover:bg-white/25"
                        onClick={handleRegenerateAI}
                    >
                        <i className="fas fa-sync-alt mr-1.5"></i>
                        Regenerate Analysis
                    </button>
                </div>
            )}
            <div className="rounded-xl border border-gray-200 border-l-4 border-l-accent bg-white p-6 mb-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div className="text-lg font-semibold text-slate-800 m-0">Per-Plant Summary</div>
                </div>
                {plants.length === 0 ? (
                    <div className="text-center p-8 rounded-lg text-[0.9375rem] text-slate-500 bg-slate-50">
                        No plants found.
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {plants.map((p) => {
                            const code = p.plant_code
                            const f = {
                                down: `down_trucks_${code}`,
                                hours: `total_hours_${code}`,
                                leaving: `operators_leaving_${code}`,
                                notes: `notes_${code}`,
                                ops: `active_operators_${code}`,
                                runnable: `runnable_trucks_${code}`,
                                starting: `operators_starting_${code}`,
                                training: `new_operators_training_${code}`,
                                yardage: `total_yardage_${code}`
                            }
                            return (
                                <div key={code} className="rounded-xl border border-gray-200 bg-white p-4 mb-4">
                                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                                        <div className="text-lg font-semibold text-slate-800 m-0">
                                            {p.plant_name} ({code})
                                        </div>
                                    </div>
                                    <table className="w-full border-collapse mt-3 rounded-lg overflow-hidden border border-gray-200 bg-white">
                                        <thead>
                                            <tr>
                                                {['Metric', 'Last Week', 'This Week', 'Variance'].map((h) => (
                                                    <th key={h} className={TH_STYLE}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className={TD_STYLE}># of Operators</td>
                                                <td className={TD_STYLE}>
                                                    <input
                                                        type="text"
                                                        value={String(getLastWeekValue(f.ops))}
                                                        disabled
                                                        className={RPT_INPUT}
                                                    />
                                                </td>
                                                <td className={TD_STYLE}>
                                                    <input
                                                        type="number"
                                                        value={form[f.ops] ?? ''}
                                                        onChange={(e) =>
                                                            setForm((prev) => ({ ...prev, [f.ops]: e.target.value }))
                                                        }
                                                        disabled={readOnly}
                                                        className={RPT_INPUT}
                                                    />
                                                </td>
                                                <td className={TD_STYLE}>{renderVariance(f.ops)}</td>
                                            </tr>
                                            <tr>
                                                <td className={TD_STYLE}># of Runnable Trucks</td>
                                                <td className={TD_STYLE}>
                                                    <input
                                                        type="text"
                                                        value={String(getLastWeekValue(f.runnable))}
                                                        disabled
                                                        className={RPT_INPUT}
                                                    />
                                                </td>
                                                <td className={TD_STYLE}>
                                                    <input
                                                        type="number"
                                                        value={form[f.runnable] ?? ''}
                                                        onChange={(e) =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                [f.runnable]: e.target.value
                                                            }))
                                                        }
                                                        disabled={readOnly}
                                                        className={RPT_INPUT}
                                                    />
                                                </td>
                                                <td className={TD_STYLE}>{renderVariance(f.runnable)}</td>
                                            </tr>
                                            <tr>
                                                <td className={TD_STYLE}>Down Trucks</td>
                                                <td className={TD_STYLE}>
                                                    <input
                                                        type="text"
                                                        value={String(getLastWeekValue(f.down))}
                                                        disabled
                                                        className={RPT_INPUT}
                                                    />
                                                </td>
                                                <td className={TD_STYLE}>
                                                    <input
                                                        type="number"
                                                        value={form[f.down] ?? ''}
                                                        onChange={(e) =>
                                                            setForm((prev) => ({ ...prev, [f.down]: e.target.value }))
                                                        }
                                                        disabled={readOnly}
                                                        className={RPT_INPUT}
                                                    />
                                                </td>
                                                <td className={TD_STYLE}>{renderVariance(f.down)}</td>
                                            </tr>
                                            <tr>
                                                <td className={TD_STYLE}>Operators Starting</td>
                                                <td className={TD_STYLE}>
                                                    <input
                                                        type="text"
                                                        value={String(getLastWeekValue(f.starting))}
                                                        disabled
                                                        className={RPT_INPUT}
                                                    />
                                                </td>
                                                <td className={TD_STYLE}>
                                                    <input
                                                        type="number"
                                                        value={form[f.starting] ?? ''}
                                                        onChange={(e) =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                [f.starting]: e.target.value
                                                            }))
                                                        }
                                                        disabled={readOnly}
                                                        className={RPT_INPUT}
                                                    />
                                                </td>
                                                <td className={TD_STYLE}>{renderVariance(f.starting)}</td>
                                            </tr>
                                            <tr>
                                                <td className={TD_STYLE}>Operators Leaving</td>
                                                <td className={TD_STYLE}>
                                                    <input
                                                        type="text"
                                                        value={String(getLastWeekValue(f.leaving))}
                                                        disabled
                                                        className={RPT_INPUT}
                                                    />
                                                </td>
                                                <td className={TD_STYLE}>
                                                    <input
                                                        type="number"
                                                        value={form[f.leaving] ?? ''}
                                                        onChange={(e) =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                [f.leaving]: e.target.value
                                                            }))
                                                        }
                                                        disabled={readOnly}
                                                        className={RPT_INPUT}
                                                    />
                                                </td>
                                                <td className={TD_STYLE}>{renderVariance(f.leaving)}</td>
                                            </tr>
                                            <tr>
                                                <td className={TD_STYLE}>New Operators Training</td>
                                                <td className={TD_STYLE}>
                                                    <input
                                                        type="text"
                                                        value={String(getLastWeekValue(f.training))}
                                                        disabled
                                                        className={RPT_INPUT}
                                                    />
                                                </td>
                                                <td className={TD_STYLE}>
                                                    <input
                                                        type="number"
                                                        value={form[f.training] ?? ''}
                                                        onChange={(e) =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                [f.training]: e.target.value
                                                            }))
                                                        }
                                                        disabled={readOnly}
                                                        className={RPT_INPUT}
                                                    />
                                                </td>
                                                <td className={TD_STYLE}>{renderVariance(f.training)}</td>
                                            </tr>
                                            <tr>
                                                <td className={TD_STYLE}>Total Yardage</td>
                                                <td className={TD_STYLE}>
                                                    <input
                                                        type="text"
                                                        value={String(getLastWeekValue(f.yardage))}
                                                        disabled
                                                        className={RPT_INPUT}
                                                    />
                                                </td>
                                                <td className={TD_STYLE}>
                                                    <input
                                                        type="number"
                                                        value={form[f.yardage] ?? ''}
                                                        onChange={(e) =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                [f.yardage]: e.target.value
                                                            }))
                                                        }
                                                        disabled={readOnly}
                                                        className={RPT_INPUT}
                                                    />
                                                </td>
                                                <td className={TD_STYLE}>{renderVariance(f.yardage)}</td>
                                            </tr>
                                            <tr>
                                                <td className={TD_STYLE}>Total Hours</td>
                                                <td className={TD_STYLE}>
                                                    <input
                                                        type="text"
                                                        value={String(getLastWeekValue(f.hours))}
                                                        disabled
                                                        className={RPT_INPUT}
                                                    />
                                                </td>
                                                <td className={TD_STYLE}>
                                                    <input
                                                        type="number"
                                                        value={form[f.hours] ?? ''}
                                                        onChange={(e) =>
                                                            setForm((prev) => ({ ...prev, [f.hours]: e.target.value }))
                                                        }
                                                        disabled={readOnly}
                                                        className={RPT_INPUT}
                                                    />
                                                </td>
                                                <td className={TD_STYLE}>{renderVariance(f.hours)}</td>
                                            </tr>
                                            <tr>
                                                <td className={TD_STYLE}>Notes</td>
                                                <td className={TD_STYLE}>
                                                    <textarea
                                                        value={String(getLastWeekValue(f.notes))}
                                                        disabled
                                                        className={RPT_TEXTAREA}
                                                    />
                                                </td>
                                                <td className={TD_STYLE} colSpan={2}>
                                                    <textarea
                                                        value={form[f.notes] ?? ''}
                                                        onChange={(e) =>
                                                            setForm((prev) => ({ ...prev, [f.notes]: e.target.value }))
                                                        }
                                                        disabled={readOnly}
                                                        className={RPT_TEXTAREA}
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
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3 mt-4">
                    <div className="text-lg font-semibold text-slate-800 m-0">Plant Efficiency Reports</div>
                    {effReports.length > 0 && (
                        <span className="inline-flex rounded-md bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                            {effIdx + 1} of {effReports.length}
                        </span>
                    )}
                </div>
                {effReports.length === 0 ? (
                    <div className="text-center p-8 rounded-lg text-[0.9375rem] text-slate-500 bg-slate-50">
                        No plant efficiency reports found for this week.
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap gap-2 mb-4 rounded-lg bg-slate-50 p-3">
                            {effReports.map((r, i) => (
                                <div
                                    key={r.id}
                                    onClick={() => setEffIdx(i)}
                                    className={`h-3 w-3 rounded-full cursor-pointer transition-all ${i === effIdx ? 'bg-accent scale-[1.3]' : 'bg-slate-300 hover:bg-slate-400 hover:scale-110'}`}
                                    aria-label={`Efficiency Report ${i + 1}`}
                                ></div>
                            ))}
                        </div>
                        {(() => {
                            const r = effReports[effIdx]
                            const insights = ReportService.getPlantProductionInsights(r.rows || [])
                            return (
                                <div className="rounded-xl border border-gray-200 bg-white p-4">
                                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                                        <div className="text-lg font-semibold text-slate-800 m-0">
                                            {r.plant_name} ({r.plant_code}){r.report_date ? ` - ${r.report_date}` : ''}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                className="rounded-md border border-gray-200 bg-slate-100 px-4 py-2 text-[0.8125rem] font-semibold text-slate-600 cursor-pointer transition-colors hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={() => setEffIdx((i) => Math.max(i - 1, 0))}
                                                disabled={effIdx === 0}
                                            >
                                                ← Prev Report
                                            </button>
                                            <button
                                                type="button"
                                                className="rounded-md border-none bg-accent px-4 py-2 text-[0.8125rem] font-semibold text-white cursor-pointer transition-colors hover:bg-accent-hover disabled:bg-slate-400 disabled:cursor-not-allowed"
                                                onClick={() => setEffIdx((i) => Math.min(i + 1, effReports.length - 1))}
                                                disabled={effIdx === effReports.length - 1}
                                            >
                                                Next Report →
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-3 mt-5 mb-4">
                                        {[
                                            { label: 'Total Loads', value: insights.totalLoads || 0 },
                                            {
                                                label: 'Total Hours',
                                                value:
                                                    insights.totalHours !== null ? insights.totalHours.toFixed(2) : '--'
                                            },
                                            {
                                                label: 'Avg Loads',
                                                value: insights.avgLoads !== null ? insights.avgLoads.toFixed(2) : '--'
                                            },
                                            {
                                                label: 'Avg Hours',
                                                value: insights.avgHours !== null ? insights.avgHours.toFixed(2) : '--'
                                            },
                                            {
                                                label: 'Avg L/H',
                                                value:
                                                    insights.avgLoadsPerHour !== null
                                                        ? insights.avgLoadsPerHour.toFixed(2)
                                                        : '--'
                                            },
                                            {
                                                label: 'Punch In → 1st',
                                                value:
                                                    insights.avgElapsedStart !== null
                                                        ? `${insights.avgElapsedStart.toFixed(1)} min`
                                                        : '--'
                                            },
                                            {
                                                label: 'Washout → Punch',
                                                value:
                                                    insights.avgElapsedEnd !== null
                                                        ? `${insights.avgElapsedEnd.toFixed(1)} min`
                                                        : '--'
                                            }
                                        ].map(({ label, value }) => (
                                            <div
                                                key={label}
                                                className="text-center rounded-lg border border-gray-200 bg-slate-50 p-3.5"
                                            >
                                                <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                                                    {label}
                                                </div>
                                                <div className="text-lg font-bold text-accent">{value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })()}
                        <div className="text-lg font-semibold text-slate-800">Aggregate Production</div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            {aggReport ? (
                                <table className="w-full border-collapse mt-4 rounded-lg overflow-hidden border border-gray-200 bg-white">
                                    <thead>
                                        <tr>
                                            {['Material', 'Last Week', 'This Week', 'Variance'].map((h) => (
                                                <th key={h} className={TH_STYLE}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportTypeMap.aggregate_production.fields.map((f) => (
                                            <tr key={f.name} className="hover:[&>td]:bg-slate-50">
                                                <td className={TD_STYLE}>{f.label}</td>
                                                <td className={TD_STYLE}>{getAggLastWeekValue(f.name) || '—'}</td>
                                                <td className={TD_STYLE}>{aggReport.data?.[f.name] ?? '—'}</td>
                                                <td className={TD_STYLE}>{renderAggVariance(f.name)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center p-8 rounded-lg text-[0.9375rem] text-slate-500 bg-slate-50">
                                    No aggregate production report found.
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <div className="text-lg font-semibold text-slate-800 m-0">Ready Mix Instructor Report</div>
                    </div>
                    {rmiLoading ? (
                        <div className="text-center p-8 rounded-lg text-[0.9375rem] text-slate-500 bg-slate-50">
                            Loading RMI report data...
                        </div>
                    ) : rmiReport ? (
                        <ReadyMixInstructorReviewPlugin form={rmiReport} plants={plants} />
                    ) : (
                        <div className="text-center p-8 rounded-lg text-[0.9375rem] text-slate-500 bg-slate-50">
                            No Ready Mix Instructor report found for this week.
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
/** Review-mode plugin for the General Manager report — displays submitted data and embeds the corresponding RMI report if available. */
export function GeneralManagerReviewPlugin({ form: _form, plants = [], weekIso }) {
    const { report: rmiReport, loading } = useReportForWeek(weekIso, 'ready_mix_instructor')
    return (
        <>
            <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div className="text-lg font-semibold text-slate-800 m-0">General Manager Report</div>
                </div>
                <div className="text-center p-8 rounded-lg text-[0.9375rem] text-slate-500 bg-slate-50">
                    Review view for General Manager reports.
                </div>
                <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <div className="text-lg font-semibold text-slate-800 m-0">Ready Mix Instructor Report</div>
                    </div>
                    {loading ? (
                        <div className="text-center p-8 rounded-lg text-[0.9375rem] text-slate-500 bg-slate-50">
                            Loading RMI report data...
                        </div>
                    ) : rmiReport?.data ? (
                        <ReadyMixInstructorReviewPlugin form={rmiReport.data} plants={plants} />
                    ) : (
                        <div className="text-center p-8 rounded-lg text-[0.9375rem] text-slate-500 bg-slate-50">
                            No Ready Mix Instructor report found for this week.
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
