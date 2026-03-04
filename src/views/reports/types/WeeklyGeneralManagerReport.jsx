import React from 'react'

import { AIService } from '../../../services/AIService'
import { supabase } from '../../../services/DatabaseService'
import { ReportService } from '../../../services/ReportService'
import { reportTypeMap } from '../../../types/ReportTypes'
import { ReportUtility } from '../../../utils/ReportUtility'
import { useReportForWeek } from './shared'
import { ReadyMixInstructorReviewPlugin } from './WeeklyReadyMixInstructorReport'

const gmReportStyles = `
.rpt-card { background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 1.5rem; margin-bottom: 1.5rem; }
.rpt-card-accent { border-left: 4px solid #1e3a5f; }
.rpt-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem; }
.rpt-card-title { font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0; }
.rpt-card-actions { display: flex; gap: 0.5rem; }
.rpt-badge { display: inline-flex; padding: 0.25rem 0.625rem; background: #e0f2fe; color: #0369a1; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
.rpt-empty { text-align: center; padding: 2rem; color: #64748b; font-size: 0.9375rem; background: #f8fafc; border-radius: 8px; }
.rpt-form-row { display: flex; flex-direction: column; gap: 1rem; }
.rpt-flex-col { flex-direction: column; }
.rpt-p-16 { padding: 1rem; }
.rpt-mb-16 { margin-bottom: 1rem; }
.rpt-mt-16 { margin-top: 1rem; }
.rpt-section-spacing { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; }
.rpt-plant-summary-table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
.rpt-plant-summary-table th { background: #f8fafc; padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; }
.rpt-plant-summary-table td { padding: 0.75rem 1rem; font-size: 0.9375rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; vertical-align: middle; background: white; }
.rpt-plant-summary-table tr:last-child td { border-bottom: none; }
.rpt-plant-summary-table tr:hover td { background: #f8fafc; }
.rpt-input { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.875rem; color: #1e293b; background: white; box-sizing: border-box; }
.rpt-input:disabled { background: #f8fafc; color: #64748b; }
.rpt-input:focus { outline: none; border-color: #1e3a5f; box-shadow: 0 0 0 2px rgba(30, 58, 95, 0.1); }
.rpt-textarea-notes { min-height: 60px; resize: vertical; }
.rpt-variance-cell { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.8125rem; font-weight: 600; padding: 0.25rem 0.5rem; border-radius: 4px; }
.rpt-variance-positive { color: #059669; background: #d1fae5; }
.rpt-variance-negative { color: #dc2626; background: #fee2e2; }
.rpt-variance-neutral { color: #64748b; background: #f1f5f9; }
.rpt-variance-symbol { font-size: 0.6875rem; }
.rpt-dots-bar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; padding: 0.75rem; background: #f8fafc; border-radius: 8px; }
.rpt-dot { width: 12px; height: 12px; border-radius: 50%; background: #cbd5e1; cursor: pointer; transition: all 0.15s; }
.rpt-dot:hover { background: #94a3b8; transform: scale(1.1); }
.rpt-dot.active { background: #1e3a5f; transform: scale(1.3); }
.rpt-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 0.75rem; margin-top: 1.25rem; margin-bottom: 1rem; }
.rpt-stat-card { text-align: center; padding: 0.875rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb; }
.rpt-stat-label { font-size: 0.6875rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem; }
.rpt-stat-value { font-size: 1.125rem; font-weight: 700; color: #1e3a5f; }
.rpt-primary-btn { padding: 0.5rem 1rem; background: #1e3a5f; color: white; border: none; border-radius: 6px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.rpt-primary-btn:hover { background: #15304f; }
.rpt-primary-btn:disabled { background: #94a3b8; cursor: not-allowed; }
.rpt-secondary-btn { padding: 0.5rem 1rem; background: #f1f5f9; color: #475569; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.rpt-secondary-btn:hover { background: #e2e8f0; }
.rpt-secondary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.rpt-agg-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; margin-top: 1rem; }
.rpt-agg-table th { background: #f8fafc; padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; }
.rpt-agg-table td { padding: 0.75rem 1rem; font-size: 0.9375rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.rpt-agg-table tr:last-child td { border-bottom: none; }
.rpt-agg-table tr:hover td { background: #f8fafc; }
.rpt-agg-input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.875rem; color: #1e293b; background: white; box-sizing: border-box; }
.rpt-agg-input:disabled { background: #f8fafc; color: #64748b; }
.rpt-ai-analysis { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; color: white; }
.rpt-ai-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
.rpt-ai-icon { width: 36px; height: 36px; background: rgba(255,255,255,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
.rpt-ai-title { font-weight: 600; font-size: 0.9375rem; margin: 0; }
.rpt-ai-subtitle { font-size: 0.75rem; opacity: 0.8; margin: 0; }
.rpt-ai-content { font-size: 0.875rem; line-height: 1.6; opacity: 0.95; white-space: pre-wrap; }
.rpt-ai-loading { display: flex; align-items: center; justify-content: center; padding: 1rem; gap: 0.5rem; font-size: 0.875rem; opacity: 0.8; }
.rpt-ai-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1rem; color: #991b1b; font-size: 0.875rem; margin-bottom: 1.5rem; }
.rpt-ai-regenerate { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 0.375rem 0.75rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer; margin-top: 0.75rem; }
.rpt-ai-regenerate:hover { background: rgba(255,255,255,0.25); }
`

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
            const toMondayIso = (d) => {
                if (!d) return ''
                const dt = new Date(d)
                if (isNaN(dt)) return ''
                return ReportUtility.getMondayISO(dt)
            }
            const sameIsoDay = (a, b) => a && b && a.slice(0, 10) === b.slice(0, 10)
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
    }, [plants, weekIso, form, effReports, aggReport, rmiReport, rmiLoading, aiAnalysis])

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
    }, [plants, weekIso, form, effReports, aggReport, rmiReport])

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
        <>
            <style>{gmReportStyles}</style>

            {aiLoading && (
                <div className="rpt-ai-analysis">
                    <div className="rpt-ai-loading">
                        <i className="fas fa-circle-notch fa-spin"></i>
                        <span>Generating AI Analysis...</span>
                    </div>
                </div>
            )}

            {aiError && !aiLoading && (
                <div className="rpt-ai-error">
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
                    Failed to generate AI analysis.
                    <button
                        onClick={handleRegenerateAI}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'inherit',
                            cursor: 'pointer',
                            marginLeft: '0.5rem',
                            textDecoration: 'underline'
                        }}
                    >
                        Try again
                    </button>
                </div>
            )}

            {aiAnalysis && !aiLoading && (
                <div className="rpt-ai-analysis">
                    <div className="rpt-ai-header">
                        <div className="rpt-ai-icon">
                            <i className="fas fa-robot"></i>
                        </div>
                        <div>
                            <div className="rpt-ai-title">AI Regional Analysis</div>
                            <div className="rpt-ai-subtitle">
                                Based on report data for {plants.length} plant{plants.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>
                    <div className="rpt-ai-content">{aiAnalysis}</div>
                    <button className="rpt-ai-regenerate" onClick={handleRegenerateAI}>
                        <i className="fas fa-sync-alt" style={{ marginRight: '0.375rem' }}></i>
                        Regenerate Analysis
                    </button>
                </div>
            )}

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
                                <div key={code} className="rpt-card rpt-p-16 rpt-mb-16">
                                    <div className="rpt-card-header">
                                        <div className="rpt-card-title">
                                            {p.plant_name} ({code})
                                        </div>
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
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={String(getLastWeekValue(f.ops))}
                                                        disabled
                                                        className="rpt-input"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={form[f.ops] ?? ''}
                                                        onChange={(e) =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                [f.ops]: e.target.value
                                                            }))
                                                        }
                                                        disabled={readOnly}
                                                        className="rpt-input"
                                                    />
                                                </td>
                                                <td>{renderVariance(f.ops)}</td>
                                            </tr>
                                            <tr>
                                                <td># of Runnable Trucks</td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={String(getLastWeekValue(f.runnable))}
                                                        disabled
                                                        className="rpt-input"
                                                    />
                                                </td>
                                                <td>
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
                                                        className="rpt-input"
                                                    />
                                                </td>
                                                <td>{renderVariance(f.runnable)}</td>
                                            </tr>
                                            <tr>
                                                <td>Down Trucks</td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={String(getLastWeekValue(f.down))}
                                                        disabled
                                                        className="rpt-input"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={form[f.down] ?? ''}
                                                        onChange={(e) =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                [f.down]: e.target.value
                                                            }))
                                                        }
                                                        disabled={readOnly}
                                                        className="rpt-input"
                                                    />
                                                </td>
                                                <td>{renderVariance(f.down)}</td>
                                            </tr>
                                            <tr>
                                                <td>Operators Starting</td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={String(getLastWeekValue(f.starting))}
                                                        disabled
                                                        className="rpt-input"
                                                    />
                                                </td>
                                                <td>
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
                                                        className="rpt-input"
                                                    />
                                                </td>
                                                <td>{renderVariance(f.starting)}</td>
                                            </tr>
                                            <tr>
                                                <td>Operators Leaving</td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={String(getLastWeekValue(f.leaving))}
                                                        disabled
                                                        className="rpt-input"
                                                    />
                                                </td>
                                                <td>
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
                                                        className="rpt-input"
                                                    />
                                                </td>
                                                <td>{renderVariance(f.leaving)}</td>
                                            </tr>
                                            <tr>
                                                <td>New Operators Training</td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={String(getLastWeekValue(f.training))}
                                                        disabled
                                                        className="rpt-input"
                                                    />
                                                </td>
                                                <td>
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
                                                        className="rpt-input"
                                                    />
                                                </td>
                                                <td>{renderVariance(f.training)}</td>
                                            </tr>
                                            <tr>
                                                <td>Total Yardage</td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={String(getLastWeekValue(f.yardage))}
                                                        disabled
                                                        className="rpt-input"
                                                    />
                                                </td>
                                                <td>
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
                                                        className="rpt-input"
                                                    />
                                                </td>
                                                <td>{renderVariance(f.yardage)}</td>
                                            </tr>
                                            <tr>
                                                <td>Total Hours</td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={String(getLastWeekValue(f.hours))}
                                                        disabled
                                                        className="rpt-input"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={form[f.hours] ?? ''}
                                                        onChange={(e) =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                [f.hours]: e.target.value
                                                            }))
                                                        }
                                                        disabled={readOnly}
                                                        className="rpt-input"
                                                    />
                                                </td>
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
                                                        onChange={(e) =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                [f.notes]: e.target.value
                                                            }))
                                                        }
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
                    {effReports.length > 0 && (
                        <div className="rpt-badge">
                            {effIdx + 1} of {effReports.length}
                        </div>
                    )}
                </div>
                {effReports.length === 0 ? (
                    <div className="rpt-empty">No plant efficiency reports found for this week.</div>
                ) : (
                    <div className="rpt-form-row rpt-flex-col">
                        <div className="rpt-dots-bar">
                            {effReports.map((r, i) => (
                                <div
                                    key={r.id}
                                    onClick={() => setEffIdx(i)}
                                    className={`rpt-dot ${i === effIdx ? 'active' : ''}`}
                                    aria-label={`Efficiency Report ${i + 1}`}
                                ></div>
                            ))}
                        </div>
                        {(() => {
                            const r = effReports[effIdx]
                            const insights = ReportService.getPlantProductionInsights(r.rows || [])
                            return (
                                <div className="rpt-card rpt-p-16">
                                    <div className="rpt-card-header">
                                        <div className="rpt-card-title">
                                            {r.plant_name} ({r.plant_code}){r.report_date ? ` - ${r.report_date}` : ''}
                                        </div>
                                        <div className="rpt-card-actions">
                                            <button
                                                type="button"
                                                className="rpt-secondary-btn"
                                                onClick={() => setEffIdx((i) => Math.max(i - 1, 0))}
                                                disabled={effIdx === 0}
                                            >
                                                ← Prev Report
                                            </button>
                                            <button
                                                type="button"
                                                className="rpt-primary-btn"
                                                onClick={() => setEffIdx((i) => Math.min(i + 1, effReports.length - 1))}
                                                disabled={effIdx === effReports.length - 1}
                                            >
                                                Next Report →
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
                                            <div className="rpt-stat-value">
                                                {insights.totalHours !== null ? insights.totalHours.toFixed(2) : '--'}
                                            </div>
                                        </div>
                                        <div className="rpt-stat-card">
                                            <div className="rpt-stat-label">Avg Loads</div>
                                            <div className="rpt-stat-value">
                                                {insights.avgLoads !== null ? insights.avgLoads.toFixed(2) : '--'}
                                            </div>
                                        </div>
                                        <div className="rpt-stat-card">
                                            <div className="rpt-stat-label">Avg Hours</div>
                                            <div className="rpt-stat-value">
                                                {insights.avgHours !== null ? insights.avgHours.toFixed(2) : '--'}
                                            </div>
                                        </div>
                                        <div className="rpt-stat-card">
                                            <div className="rpt-stat-label">Avg L/H</div>
                                            <div className="rpt-stat-value">
                                                {insights.avgLoadsPerHour !== null
                                                    ? insights.avgLoadsPerHour.toFixed(2)
                                                    : '--'}
                                            </div>
                                        </div>
                                        <div className="rpt-stat-card">
                                            <div className="rpt-stat-label">Punch In → 1st</div>
                                            <div className="rpt-stat-value">
                                                {insights.avgElapsedStart !== null
                                                    ? `${insights.avgElapsedStart.toFixed(1)} min`
                                                    : '--'}
                                            </div>
                                        </div>
                                        <div className="rpt-stat-card">
                                            <div className="rpt-stat-label">Washout → Punch</div>
                                            <div className="rpt-stat-value">
                                                {insights.avgElapsedEnd !== null
                                                    ? `${insights.avgElapsedEnd.toFixed(1)} min`
                                                    : '--'}
                                            </div>
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
                                        {reportTypeMap.aggregate_production.fields.map((f) => (
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
                        <ReadyMixInstructorReviewPlugin form={rmiReport} plants={plants} />
                    ) : (
                        <div className="rpt-empty">No Ready Mix Instructor report found for this week.</div>
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
            <style>{gmReportStyles}</style>
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
                    ) : rmiReport?.data ? (
                        <ReadyMixInstructorReviewPlugin form={rmiReport.data} plants={plants} />
                    ) : (
                        <div className="rpt-empty">No Ready Mix Instructor report found for this week.</div>
                    )}
                </div>
            </div>
        </>
    )
}
