import { useEffect, useState } from 'react'

import { supabase } from '../../../../services/DatabaseService'
import { ReportUtility } from '../../../../utils/ReportUtility'

const EMPTY_ARRAY = []

function toMondayIso(dateInput) {
    if (!dateInput) return ''
    const dt = new Date(dateInput)
    if (isNaN(dt)) return ''
    return ReportUtility.getMondayISO(dt)
}

function sameIsoDay(a, b) {
    return a && b && a.slice(0, 10) === b.slice(0, 10)
}

function buildDateWindow(targetMondayIso, offsetWeeks = 0) {
    const targetMondayDate = new Date(targetMondayIso + 'T00:00:00Z')
    targetMondayDate.setUTCDate(targetMondayDate.getUTCDate() + offsetWeeks * 7)
    const prevSunday = new Date(targetMondayDate)
    prevSunday.setUTCDate(prevSunday.getUTCDate() - 1)
    const windowEnd = new Date(targetMondayDate)
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 8)
    return {
        mondayDate: targetMondayDate,
        mondayIso: ReportUtility.getMondayISO(targetMondayDate),
        qEnd: windowEnd.toISOString(),
        qStart: prevSunday.toISOString()
    }
}

async function fetchReportsByDateRange(reportName, qStart, qEnd, extraFilters = {}) {
    let query = supabase
        .from('reports')
        .select('id,data,week,report_date_range_start,completed,submitted_at,user_id')
        .eq('report_name', reportName)
        .gte('week', qStart)
        .lt('week', qEnd)

    Object.entries(extraFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) query = query.eq(key, value)
    })

    let { data } = await query
    if (!Array.isArray(data)) data = EMPTY_ARRAY

    if (data.length === 0) {
        let fallbackQuery = supabase
            .from('reports')
            .select('id,data,week,report_date_range_start,completed,submitted_at,user_id')
            .eq('report_name', reportName)
            .gte('report_date_range_start', qStart)
            .lt('report_date_range_start', qEnd)

        Object.entries(extraFilters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) fallbackQuery = fallbackQuery.eq(key, value)
        })

        const resp = await fallbackQuery
        if (Array.isArray(resp.data)) data = resp.data
    }

    return data
}

function filterByMondayIso(reports, targetMondayIso) {
    return reports.filter((r) => {
        const weekField = r.week || r.report_date_range_start
        const mondayIso = toMondayIso(weekField)
        return sameIsoDay(mondayIso, targetMondayIso)
    })
}

function sortByCompletedThenSubmittedAt(reports) {
    return [...reports].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? -1 : 1
        return (b.submitted_at || '').localeCompare(a.submitted_at || '')
    })
}

function pickBestReport(reports) {
    const sorted = sortByCompletedThenSubmittedAt(reports)
    return sorted.find((r) => r.completed) || sorted[0] || null
}

/** Fetches the report from the week prior to the given weekIso for week-over-week comparison. */
export function usePreviousWeekReport(weekIso, reportName, extraFilters = {}) {
    const [previousReport, setPreviousReport] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function load() {
            if (!weekIso) {
                setPreviousReport(null)
                return
            }

            const targetMondayIso = ReportUtility.getMondayISO(weekIso)
            if (!targetMondayIso) {
                setPreviousReport(null)
                return
            }

            setLoading(true)
            const { qStart, qEnd, mondayIso } = buildDateWindow(targetMondayIso, -1)

            try {
                const reports = await fetchReportsByDateRange(reportName, qStart, qEnd, extraFilters)
                const filtered = filterByMondayIso(reports, mondayIso)
                const pick = pickBestReport(filtered)
                if (!cancelled) setPreviousReport(pick)
            } catch (err) {
                console.error(`Error loading previous ${reportName}:`, err)
                if (!cancelled) setPreviousReport(null)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [weekIso, reportName, JSON.stringify(extraFilters)])

    return { loading, previousReport }
}

/** Fetches all reports for the given week and report type, optionally filtered by an array of plant codes. */
export function useCurrentWeekReports(weekIso, reportName, plantCodes = EMPTY_ARRAY) {
    const [reports, setReports] = useState(EMPTY_ARRAY)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function load() {
            if (!weekIso || plantCodes.length === 0) {
                setReports(EMPTY_ARRAY)
                return
            }

            const targetMondayIso = ReportUtility.getMondayISO(weekIso)
            if (!targetMondayIso) {
                setReports(EMPTY_ARRAY)
                return
            }

            setLoading(true)
            const { qStart, qEnd, mondayIso } = buildDateWindow(targetMondayIso, 0)

            const normU = (s) =>
                String(s || '')
                    .trim()
                    .toUpperCase()
            const normN = (s) => {
                const t = String(s || '').trim()
                const d = t.replace(/^0+/, '')
                return d.length ? d : t.toUpperCase()
            }
            const setU = new Set(plantCodes.map(normU))
            const setN = new Set(plantCodes.map(normN))

            try {
                const data = await fetchReportsByDateRange(reportName, qStart, qEnd)
                const filtered = filterByMondayIso(data, mondayIso).filter((r) => {
                    const pc = r?.data?.plant
                    if (!pc) return false
                    const u = normU(pc)
                    const n = normN(pc)
                    return setU.has(u) || setN.has(n)
                })

                const byPlant = new Map()
                filtered.forEach((r) => {
                    const k = normU(r.data.plant)
                    const prev = byPlant.get(k)
                    if (!prev) {
                        byPlant.set(k, r)
                    } else {
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

                const final = [...byPlant.values()].sort((a, b) => {
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

                if (!cancelled) setReports(final)
            } catch (err) {
                console.error(`Error loading ${reportName}:`, err)
                if (!cancelled) setReports(EMPTY_ARRAY)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [weekIso, reportName, JSON.stringify(plantCodes)])

    return { loading, reports }
}

/** Fetches a single report matching the given week and report type, with optional extra Supabase filters. */
export function useReportForWeek(weekIso, reportName, extraFilters = {}) {
    const [report, setReport] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function load() {
            if (!weekIso) {
                setReport(null)
                return
            }

            const targetMondayIso = ReportUtility.getMondayISO(weekIso)
            if (!targetMondayIso) {
                setReport(null)
                return
            }

            setLoading(true)
            const { qStart, qEnd, mondayIso } = buildDateWindow(targetMondayIso, 0)

            try {
                const reports = await fetchReportsByDateRange(reportName, qStart, qEnd, extraFilters)
                const filtered = filterByMondayIso(reports, mondayIso)
                const pick = pickBestReport(filtered)
                if (!cancelled) setReport(pick)
            } catch (err) {
                console.error(`Error loading ${reportName}:`, err)
                if (!cancelled) setReport(null)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [weekIso, reportName, JSON.stringify(extraFilters)])

    return { loading, report }
}

/** Resolves the set of plant codes the current user's region is allowed to access. */
export function useAllowedPlantCodes(regionCode, RegionService) {
    const [allowedCodes, setAllowedCodes] = useState(null)

    useEffect(() => {
        let mounted = true

        async function loadCodes() {
            if (!RegionService || !regionCode) {
                setAllowedCodes(null)
                return
            }
            const codes = await RegionService.getAllowedPlantCodes(regionCode)
            if (mounted) setAllowedCodes(codes)
        }

        loadCodes()
        return () => {
            mounted = false
        }
    }, [regionCode, RegionService])

    return allowedCodes
}

/** Filters maintenance items to only those belonging to plants within the allowed plant code set. */
export function filterMaintenanceItemsByPlant(maintenanceItems, plants, allowedCodes) {
    const plantCodes = plants ? new Set(plants.map((p) => p.plant_code || p.code).filter(Boolean)) : null
    const baseFiltered =
        maintenanceItems && plantCodes
            ? maintenanceItems.filter((item) => plantCodes.has(item.plant_code))
            : maintenanceItems || EMPTY_ARRAY

    if (!allowedCodes) return baseFiltered

    return baseFiltered.filter((item) =>
        allowedCodes.has(
            String(item.plant_code || '')
                .trim()
                .toUpperCase()
        )
    )
}
