import React, { useEffect, useState } from 'react'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { supabase } from '../../../services/DatabaseService'
import { UserService } from '../../../services/UserService'
import { ReportUtility } from '../../../utils/ReportUtility'
import OperatorSelectModal from '../../mixers/OperatorSelectModal'
const GRADE_COLORS = { average: 'bg-amber-500', excellent: 'bg-emerald-600', good: 'bg-sky-500', poor: 'bg-red-500' }
const PM_TH =
    'bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-gray-200 whitespace-nowrap'
const PM_TD = 'px-4 py-3 text-sm text-slate-800 border-b border-slate-100'
const PM_INPUT = 'rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-slate-800 box-border'
const YPH_GRADES = ['excellent', 'good', 'average', 'poor']
function formatYphValue(v) {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
    return Number.isFinite(n) ? n.toFixed(2) : '--'
}
function GradeScale({ grade }) {
    return (
        <div className="flex gap-2 flex-wrap">
            {YPH_GRADES.map((g) => (
                <span
                    key={g}
                    className={`rounded px-2 py-1 text-[0.6875rem] font-semibold ${grade === g ? `text-white ${GRADE_COLORS[g] || 'bg-accent'}` : 'bg-slate-100 text-slate-500'}`}
                >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                </span>
            ))}
        </div>
    )
}
function YphMetricCard({ yph, grade, label }) {
    return (
        <div className="rounded-[10px] border border-gray-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 mb-3">
                <i className="fas fa-tachometer-alt text-accent"></i>
                <span className="text-sm font-semibold text-gray-700">Yards per Man-Hour</span>
            </div>
            <div
                className="flex items-baseline gap-1 text-2xl font-bold text-accent mb-1"
                title="Left: Raw YPH / Right: Adjusted for help sent"
            >
                <span>{formatYphValue(yph?.raw ?? yph)}</span>
                <span className="text-slate-400 text-xl mx-1">/</span>
                <span>{formatYphValue(yph?.adjusted ?? yph)}</span>
            </div>
            <div className="flex gap-8 text-xs text-slate-500 mb-2">
                <span>Raw</span>
                <span>Adjusted</span>
            </div>
            <div className="text-sm font-semibold text-emerald-600 mb-2">{label?.adjusted ?? label}</div>
            <GradeScale grade={grade?.adjusted ?? grade} />
        </div>
    )
}
function LostMetricCard({ lost, grade, label }) {
    return (
        <div className="rounded-[10px] border border-gray-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 mb-3">
                <i className="fas fa-exclamation-triangle text-accent"></i>
                <span className="text-sm font-semibold text-gray-700">Yardage Lost</span>
            </div>
            <div className="text-3xl font-bold text-accent mb-1">{lost !== null ? lost : '--'}</div>
            <div className="text-sm font-semibold text-emerald-600 mb-2">{label}</div>
            <GradeScale grade={grade} />
        </div>
    )
}
function MetricsSection({ yph, yphGrade, yphLabel, lost, lostGrade, lostLabel }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
            <div className="mb-5">
                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800 m-0">
                    <i className="fas fa-chart-bar"></i>Weekly Performance Metrics
                </h3>
                <p className="text-sm text-slate-500 mt-2 mb-0">Key performance indicators for this reporting period</p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
                <YphMetricCard yph={yph} grade={yphGrade} label={yphLabel} />
                <LostMetricCard lost={lost} grade={lostGrade} label={lostLabel} />
            </div>
        </div>
    )
}
function useYphCalculation(weekIso, plantCode, form) {
    const [yph, setYph] = useState({ adjusted: 0, raw: 0 })
    const [grade, setGrade] = useState({ adjusted: '', raw: '' })
    const [label, setLabel] = useState({ adjusted: '', raw: '' })
    useEffect(() => {
        async function calculate() {
            if (!weekIso || !plantCode) {
                const metrics = ReportUtility.getFullYphMetrics(form, 0)
                setYph({ adjusted: metrics.adjusted, raw: metrics.raw })
                setGrade({ adjusted: metrics.adjustedGrade, raw: metrics.rawGrade })
                setLabel({ adjusted: metrics.adjustedLabel, raw: metrics.rawLabel })
                return
            }
            try {
                const weekStart = weekIso.split('T')[0]
                const [year] = weekStart.split('-').map(Number)
                const startOfYear = new Date(year, 0, 1)
                const endOfYear = new Date(year, 11, 31, 23, 59, 59)
                const { data: allReports } = await supabase
                    .from('reports')
                    .select('*')
                    .eq('report_name', 'plant_manager')
                    .eq('completed', true)
                    .gte('week', startOfYear.toISOString())
                    .lte('week', endOfYear.toISOString())
                const hoursReceivedByWeek = ReportUtility.buildHoursReceivedByWeek(allReports || [], plantCode)
                const normalizedWeek = ReportUtility.normalizeWeekStr(weekIso)
                const hoursReceived = hoursReceivedByWeek[normalizedWeek] || 0
                const metrics = ReportUtility.getFullYphMetrics(form, hoursReceived)
                setYph({ adjusted: metrics.adjusted, raw: metrics.raw })
                setGrade({ adjusted: metrics.adjustedGrade, raw: metrics.rawGrade })
                setLabel({ adjusted: metrics.adjustedLabel, raw: metrics.rawLabel })
            } catch (err) {
                console.error('Error calculating YPH:', err)
                const metrics = ReportUtility.getFullYphMetrics(form, 0)
                setYph({ adjusted: metrics.adjusted, raw: metrics.raw })
                setGrade({ adjusted: metrics.adjustedGrade, raw: metrics.rawGrade })
                setLabel({ adjusted: metrics.adjustedLabel, raw: metrics.rawLabel })
            }
        }
        calculate()
    }, [weekIso, plantCode, form])
    return { grade, label, yph }
}
function WeeklyTrendsSection({ currentWeekIso, plantCode, user }) {
    const [historicalData, setHistoricalData] = useState([])
    const [loading, setLoading] = useState(true)
    const [yearlyTotals, setYearlyTotals] = useState(null)
    const [yearlyLoading, setYearlyLoading] = useState(true)
    const [userNames, setUserNames] = useState({})
    const [timelineUserNames, setTimelineUserNames] = useState({})
    const effectivePlantCode = plantCode || user?.plant_code || ''
    useEffect(() => {
        let mounted = true
        async function fetchTimelineUserNames() {
            if (!historicalData || historicalData.length === 0) return
            const userIds = new Set()
            historicalData.forEach((report) => {
                if (report.userId) {
                    userIds.add(report.userId)
                }
            })
            if (userIds.size === 0) return
            try {
                const namesMap = {}
                await Promise.all(
                    Array.from(userIds).map(async (id) => {
                        const firstName = await UserService.getUserFirstName(id)
                        const lastName = await UserService.getUserLastName(id)
                        const fullName = `${firstName} ${lastName}`.trim()
                        namesMap[id] = fullName || 'Unknown User'
                    })
                )
                if (mounted) {
                    setTimelineUserNames(namesMap)
                }
            } catch (err) {
                console.error('Error fetching timeline user names:', err)
            }
        }
        fetchTimelineUserNames()
        return () => {
            mounted = false
        }
    }, [historicalData])
    useEffect(() => {
        let mounted = true
        async function fetchHistoricalReports() {
            if (!currentWeekIso || !effectivePlantCode) {
                setLoading(false)
                return
            }
            try {
                const weekDateStr = currentWeekIso.split('T')[0]
                const [year, month, day] = weekDateStr.split('-').map(Number)
                const currentDate = new Date(year, month - 1, day)
                const currentMonth = currentDate.getMonth()
                const currentYear = currentDate.getFullYear()
                const startOfMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
                const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate()
                const endOfMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
                const startOfYear = new Date(currentYear, 0, 1)
                const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59)
                const [{ data, error }, { data: yearData, error: yearError }] = await Promise.all([
                    supabase
                        .from('reports')
                        .select('*')
                        .eq('report_name', 'plant_manager')
                        .eq('completed', true)
                        .gte('week', startOfMonthStr)
                        .lte('week', endOfMonthStr + 'T23:59:59.999Z')
                        .order('week', { ascending: true }),
                    supabase
                        .from('reports')
                        .select('*')
                        .eq('report_name', 'plant_manager')
                        .eq('completed', true)
                        .gte('week', startOfYear.toISOString())
                        .lte('week', endOfYear.toISOString())
                ])
                if (error) throw error
                if (yearError) throw yearError
                if (!mounted) {
                    setLoading(false)
                    return
                }
                const hoursReceivedByWeek = ReportUtility.buildHoursReceivedByWeek(yearData, effectivePlantCode)
                const userIds = [...new Set(data.map((r) => r.user_id).filter(Boolean))]
                const usersMap = {}
                if (userIds.length > 0) {
                    const { data: usersData } = await supabase
                        .from('users_profiles')
                        .select('id, plant_code')
                        .in('id', userIds)
                    if (usersData) {
                        usersData.forEach((u) => {
                            usersMap[u.id] = u.plant_code
                        })
                    }
                }
                const filteredByPlant = data.filter((report) => {
                    const reportPlant = report.data?.plant || usersMap[report.user_id] || ''
                    const matches =
                        reportPlant === effectivePlantCode ||
                        (effectivePlantCode && usersMap[report.user_id] === effectivePlantCode)
                    return matches
                })
                if (mounted && filteredByPlant) {
                    const currentWeekDateOnly = currentWeekIso.split('T')[0]
                    const reportsByWeek = new Map()
                    filteredByPlant.forEach((r) => {
                        const weekStr = r.week.split('T')[0]
                        reportsByWeek.set(weekStr, r)
                    })
                    const allMonthWeeks = []
                    const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
                    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
                    let weekStart = new Date(firstDayOfMonth)
                    const dayOfWeek = weekStart.getDay()
                    if (dayOfWeek !== 0) {
                        weekStart.setDate(weekStart.getDate() - dayOfWeek)
                    }
                    while (weekStart <= lastDayOfMonth) {
                        const weekStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`
                        allMonthWeeks.push(weekStr)
                        weekStart.setDate(weekStart.getDate() + 7)
                    }
                    const reports = allMonthWeeks
                        .map((weekStr) => {
                            let report = reportsByWeek.get(weekStr)
                            if (!report) {
                                for (const [dbWeekStr, dbReport] of reportsByWeek.entries()) {
                                    const dbDate = new Date(dbWeekStr + 'T12:00:00')
                                    const weekDate = new Date(weekStr + 'T12:00:00')
                                    const diffDays = Math.abs((dbDate - weekDate) / (1000 * 60 * 60 * 24))
                                    if (diffDays <= 1) {
                                        report = dbReport
                                        break
                                    }
                                }
                            }
                            if (report) {
                                const reportWeekStr = ReportUtility.normalizeWeekStr(report.week)
                                const hoursReceived =
                                    hoursReceivedByWeek[reportWeekStr] || hoursReceivedByWeek[weekStr] || 0
                                const metrics = ReportUtility.calculateAdjustedYph(report.data, hoursReceived)
                                return {
                                    adjustedYph: metrics.adjustedYph,
                                    data: report.data,
                                    hours: parseFloat(report.data?.total_hours || 0),
                                    hoursReceived: metrics.hoursReceived,
                                    hoursSent: metrics.hoursSent,
                                    isCurrentWeek: weekStr === currentWeekDateOnly,
                                    isPlaceholder: false,
                                    rawYph: metrics.rawYph,
                                    userId: report.user_id,
                                    weekIso: weekStr,
                                    yards: parseFloat(report.data?.yardage || 0),
                                    yph: metrics.rawYph
                                }
                            } else {
                                return {
                                    adjustedYph: 0,
                                    data: null,
                                    hours: 0,
                                    hoursReceived: 0,
                                    hoursSent: 0,
                                    isCurrentWeek: weekStr === currentWeekDateOnly,
                                    isPlaceholder: true,
                                    rawYph: 0,
                                    userId: null,
                                    weekIso: weekStr,
                                    yards: 0,
                                    yph: 0
                                }
                            }
                        })
                        .sort((a, b) => new Date(a.weekIso) - new Date(b.weekIso))
                    setHistoricalData(reports)
                }
            } catch (err) {
                console.error('Error fetching historical reports:', err)
            } finally {
                if (mounted) setLoading(false)
            }
        }
        fetchHistoricalReports()
        return () => {
            mounted = false
        }
    }, [currentWeekIso, effectivePlantCode])
    useEffect(() => {
        let mounted = true
        async function fetchYearlyTotals() {
            if (!effectivePlantCode || !currentWeekIso) {
                setYearlyLoading(false)
                return
            }
            try {
                const weekDateStr = currentWeekIso.split('T')[0]
                const [yearNum] = weekDateStr.split('-').map(Number)
                const currentYear = yearNum
                const startOfYear = new Date(currentYear, 0, 1)
                const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59)
                const { data: allData, error } = await supabase
                    .from('reports')
                    .select('*')
                    .eq('report_name', 'plant_manager')
                    .gte('week', startOfYear.toISOString())
                    .lte('week', endOfYear.toISOString())
                    .order('week', { ascending: false })
                if (error) throw error
                if (!mounted) {
                    setYearlyLoading(false)
                    return
                }
                const userIds = [...new Set(allData.map((r) => r.user_id).filter(Boolean))]
                const usersMap = {}
                if (userIds.length > 0) {
                    const { data: usersData } = await supabase
                        .from('users_profiles')
                        .select('id, plant_code')
                        .in('id', userIds)
                    if (usersData) {
                        usersData.forEach((u) => {
                            usersMap[u.id] = u.plant_code
                        })
                    }
                }
                const hoursReceivedByWeek = {}
                const effectivePlantCodeStr = String(effectivePlantCode || '')
                allData.forEach((report) => {
                    const rawWeekStr = report.week.split('T')[0]
                    const [y, m, d] = rawWeekStr.split('-').map(Number)
                    const weekStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                    const helpEntries = report.data?.operators_sent_to_help || []
                    if (Array.isArray(helpEntries)) {
                        helpEntries.forEach((entry) => {
                            const destPlant = String(entry.destination_plant || '')
                            if (
                                destPlant === effectivePlantCodeStr &&
                                entry.operators &&
                                Array.isArray(entry.operators)
                            ) {
                                if (!hoursReceivedByWeek[weekStr]) {
                                    hoursReceivedByWeek[weekStr] = 0
                                }
                                entry.operators.forEach((op) => {
                                    hoursReceivedByWeek[weekStr] += parseFloat(op.hours) || 0
                                })
                            }
                        })
                    }
                })
                const filteredData = allData.filter((report) => {
                    const reportPlant = report.data?.plant || usersMap[report.user_id] || ''
                    return (
                        reportPlant === effectivePlantCode ||
                        (effectivePlantCode && usersMap[report.user_id] === effectivePlantCode)
                    )
                })
                if (mounted && filteredData) {
                    if (filteredData.length === 0) {
                        setYearlyTotals({
                            avgYph: 0,
                            missingWeeks: [],
                            notSubmittedWeeks: [],
                            reportCount: 0,
                            totalHours: 0,
                            totalYards: 0,
                            weeklyBreakdown: [],
                            year: currentYear
                        })
                        return
                    }
                    const reportsByWeek = new Map()
                    const allReportDates = []
                    const today = new Date()
                    const currentSunday = new Date(today)
                    currentSunday.setDate(today.getDate() - today.getDay())
                    currentSunday.setHours(0, 0, 0, 0)
                    filteredData.forEach((report) => {
                        const weekStr = report.week.split('T')[0]
                        const weekDate = new Date(weekStr + 'T12:00:00')
                        if (weekDate >= currentSunday) {
                            return
                        }
                        if (reportsByWeek.has(weekStr)) {
                            const existing = reportsByWeek.get(weekStr)
                            if (report.completed && !existing.completed) {
                                reportsByWeek.set(weekStr, report)
                            } else if (report.completed === existing.completed) {
                                const existingDate = new Date(existing.submitted_at || existing.updated_at || 0)
                                const reportDate = new Date(report.submitted_at || report.updated_at || 0)
                                if (reportDate > existingDate) {
                                    reportsByWeek.set(weekStr, report)
                                }
                            }
                        } else {
                            reportsByWeek.set(weekStr, report)
                            allReportDates.push(weekStr)
                        }
                    })
                    allReportDates.sort()
                    const firstDate = allReportDates[0]
                    const lastDate = allReportDates[allReportDates.length - 1]
                    const allWeeks = []
                    let currentDate = new Date(firstDate + 'T12:00:00')
                    const endDate = new Date(lastDate + 'T12:00:00')
                    const lastSunday = new Date(currentSunday)
                    lastSunday.setDate(currentSunday.getDate() - 7)
                    while (currentDate <= endDate || currentDate <= lastSunday) {
                        const year = currentDate.getFullYear()
                        const month = String(currentDate.getMonth() + 1).padStart(2, '0')
                        const day = String(currentDate.getDate()).padStart(2, '0')
                        const weekStr = `${year}-${month}-${day}`
                        const report = reportsByWeek.get(weekStr)
                        if (report) {
                            const reportWeekStr = ReportUtility.normalizeWeekStr(report.week)
                            const hoursReceived =
                                hoursReceivedByWeek[reportWeekStr] || hoursReceivedByWeek[weekStr] || 0
                            const metrics = ReportUtility.calculateAdjustedYph(report.data, hoursReceived)
                            allWeeks.push({
                                adjustedYph: metrics.adjustedYph,
                                hours: parseFloat(report.data?.total_hours || 0),
                                hoursReceived: metrics.hoursReceived,
                                hoursSent: metrics.hoursSent,
                                isMissing: false,
                                isNotSubmitted: !report.completed,
                                rawYph: metrics.rawYph,
                                userId: report.user_id,
                                week: weekStr,
                                yardage: parseFloat(report.data?.yardage || 0),
                                yph: metrics.rawYph
                            })
                        } else if (currentDate >= new Date(firstDate + 'T12:00:00') && currentDate < currentSunday) {
                            allWeeks.push({
                                adjustedYph: 0,
                                hours: 0,
                                hoursReceived: 0,
                                hoursSent: 0,
                                isMissing: true,
                                isNotSubmitted: false,
                                rawYph: 0,
                                userId: null,
                                week: weekStr,
                                yardage: 0,
                                yph: 0
                            })
                        }
                        currentDate.setDate(currentDate.getDate() + 7)
                    }
                    allWeeks.reverse()
                    const submittedWeeks = allWeeks.filter((w) => !w.isMissing && !w.isNotSubmitted)
                    const notSubmittedWeeks = allWeeks.filter((w) => w.isNotSubmitted)
                    const missingWeeks = allWeeks.filter((w) => w.isMissing)
                    const totals = submittedWeeks.reduce(
                        (acc, week) => {
                            return {
                                missingWeeks,
                                notSubmittedWeeks,
                                reportCount: acc.reportCount + 1,
                                totalHours: acc.totalHours + week.hours,
                                totalYards: acc.totalYards + week.yardage,
                                weeklyBreakdown: allWeeks,
                                year: currentYear
                            }
                        },
                        {
                            missingWeeks,
                            notSubmittedWeeks,
                            reportCount: 0,
                            totalHours: 0,
                            totalYards: 0,
                            weeklyBreakdown: allWeeks,
                            year: currentYear
                        }
                    )
                    const weeksWithHours = submittedWeeks.filter((w) => w.hours > 0)
                    const yardsWithHours = weeksWithHours.reduce((sum, w) => sum + w.yardage, 0)
                    const hoursTotal = weeksWithHours.reduce((sum, w) => sum + w.hours, 0)
                    totals.avgYph = hoursTotal > 0 ? yardsWithHours / hoursTotal : 0
                    const targetYPH = 3.0
                    const yphEfficiency = totals.avgYph > 0 ? Math.min((totals.avgYph / targetYPH) * 100, 100) : 0
                    totals.avgEfficiency = yphEfficiency
                    setYearlyTotals(totals)
                }
            } catch (err) {
                console.error('Error fetching yearly totals:', err)
            } finally {
                if (mounted) setYearlyLoading(false)
            }
        }
        fetchYearlyTotals()
        return () => {
            mounted = false
        }
    }, [effectivePlantCode, currentWeekIso])
    useEffect(() => {
        let mounted = true
        async function fetchUserNames() {
            if (!yearlyTotals || !yearlyTotals.weeklyBreakdown) return
            const userIds = new Set()
            yearlyTotals.weeklyBreakdown.forEach((week) => {
                if (week.userId) {
                    userIds.add(week.userId)
                }
            })
            if (userIds.size === 0) return
            try {
                const namesMap = {}
                await Promise.all(
                    Array.from(userIds).map(async (id) => {
                        const firstName = await UserService.getUserFirstName(id)
                        const lastName = await UserService.getUserLastName(id)
                        const fullName = `${firstName} ${lastName}`.trim()
                        namesMap[id] = fullName || 'Unknown User'
                    })
                )
                if (mounted) {
                    setUserNames(namesMap)
                }
            } catch (err) {
                console.error('Error fetching user names:', err)
            }
        }
        fetchUserNames()
        return () => {
            mounted = false
        }
    }, [yearlyTotals])
    if (loading) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
                <div className="mb-5">
                    <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800 m-0">
                        <i className="fas fa-chart-line"></i>Monthly Performance Trends
                    </h3>
                </div>
                <div className="flex items-center justify-center gap-3 p-8 text-slate-500">
                    <i className="fas fa-circle-notch fa-spin"></i>
                    <span className="text-sm">Loading historical data...</span>
                </div>
            </div>
        )
    }
    const weekDateStrForMonth = currentWeekIso.split('T')[0]
    const [yearForMonth, monthForMonth] = weekDateStrForMonth.split('-').map(Number)
    const monthName = new Date(yearForMonth, monthForMonth - 1, 15).toLocaleString('default', {
        month: 'long',
        year: 'numeric'
    })
    if (historicalData.length === 0) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
                <div className="mb-5">
                    <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800 m-0">
                        <i className="fas fa-calendar-alt"></i>
                        {monthName} - Weekly Performance
                    </h3>
                    <p className="text-sm text-slate-500 mt-2 mb-0">No reports found for this month</p>
                </div>
            </div>
        )
    }
    const calculateVariance = (current, previous) => {
        if (!previous || previous.isPlaceholder) return null
        return ((current - previous) / previous) * 100
    }
    const weeksWithData = historicalData.filter((r) => !r.isPlaceholder).length
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
            <div className="mb-5">
                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800 m-0">
                    <i className="fas fa-chart-line"></i>
                    {monthName} Performance Timeline
                </h3>
                <p className="text-sm text-slate-500 mt-2 mb-0">
                    {weeksWithData} of {historicalData.length} {historicalData.length === 1 ? 'week' : 'weeks'} with
                    data
                </p>
            </div>
            <div className="relative mb-8">
                <div className="absolute left-3 top-0 bottom-0 w-0.5">
                    <div className="absolute left-0 top-5 bottom-5 w-0.5 bg-gray-200"></div>
                </div>
                <div className="flex flex-col relative">
                    {historicalData.map((report, idx) => {
                        const [year, month, day] = report.weekIso.split('-').map(Number)
                        const weekDate = new Date(year, month - 1, day)
                        weekDate.setDate(weekDate.getDate() + 1)
                        const weekLabel = weekDate.toLocaleDateString()
                        const previousReportWithData = historicalData
                            .slice(0, idx)
                            .filter((r) => !r.isPlaceholder)
                            .pop()
                        const yphVariance = !report.isPlaceholder
                            ? calculateVariance(report.yph, previousReportWithData?.yph)
                            : null
                        const userName = report.userId ? timelineUserNames[report.userId] || 'Loading...' : null
                        return (
                            <div
                                key={idx}
                                className={`flex items-start gap-4 py-4 relative ${report.isPlaceholder ? 'opacity-70' : ''}`}
                            >
                                <div className="flex items-center justify-center w-[26px] h-[26px] relative z-[1]">
                                    <div
                                        className={`w-3 h-3 rounded-full border-[3px] border-white ${report.isPlaceholder ? 'bg-slate-400 shadow-[0_0_0_2px_#94a3b8]' : 'bg-accent shadow-[0_0_0_2px_var(--accent)]'}`}
                                    ></div>
                                </div>
                                <div className="flex-1 rounded-lg border border-gray-200 bg-slate-50 p-4">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-2">
                                        {weekLabel}
                                        {report.isCurrentWeek && (
                                            <span className="rounded bg-accent px-2 py-0.5 text-[0.6875rem] font-semibold uppercase text-white">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    {report.isPlaceholder ? (
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <i className="fas fa-clock"></i>
                                            <span>Pending</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 text-[0.8125rem] text-slate-500 mb-3">
                                                <i className="fas fa-user"></i> {userName || 'Unknown'}
                                            </div>
                                            <div className="flex gap-6 flex-wrap">
                                                <div className="flex flex-col gap-0.5">
                                                    <span
                                                        className="flex items-baseline gap-0.5 text-xl font-bold text-accent"
                                                        title="Raw / Adjusted YPH"
                                                    >
                                                        <span>{(report.rawYph ?? report.yph).toFixed(2)}</span>
                                                        <span className="text-slate-400 text-sm mx-0.5">/</span>
                                                        <span>{(report.adjustedYph ?? report.yph).toFixed(2)}</span>
                                                    </span>
                                                    <span className="text-[0.6875rem] uppercase tracking-wide text-slate-500">
                                                        YPH
                                                    </span>
                                                    {yphVariance !== null && (
                                                        <span
                                                            className={`flex items-center gap-1 text-xs font-semibold ${yphVariance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                                                        >
                                                            <i
                                                                className={`fas fa-arrow-${yphVariance >= 0 ? 'up' : 'down'}`}
                                                            ></i>
                                                            {Math.abs(yphVariance).toFixed(1)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
            {yearlyTotals && yearlyTotals.weeklyBreakdown && yearlyTotals.weeklyBreakdown.length > 0 && (
                <div className="mt-6">
                    <h5 className="text-base font-semibold text-slate-800 mb-4 mt-0">Weekly Breakdown</h5>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full min-w-[700px] border-collapse">
                            <thead>
                                <tr>
                                    {[
                                        'Submitted By',
                                        'Week Starting',
                                        'Yardage',
                                        'Hours',
                                        'YPH',
                                        'Daily Avg',
                                        'Efficiency'
                                    ].map((h) => (
                                        <th key={h} className={PM_TH}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {yearlyTotals.weeklyBreakdown.map((week, idx) => {
                                    const weekDate = new Date(week.week + 'T12:00:00')
                                    const weekLabel = ReportUtility.formatDate(weekDate)
                                    const userName = week.userId ? userNames[week.userId] || 'Loading...' : null
                                    const dailyAvg = Math.round(week.yardage / 6)
                                    const targetYPH = 3.0
                                    const yphEfficiency =
                                        week.hours > 0 ? Math.min((week.yph / targetYPH) * 100, 100) : 0
                                    const overallEfficiency = yphEfficiency
                                    const isMissingRow = week.isMissing || week.isNotSubmitted
                                    return (
                                        <tr
                                            key={idx}
                                            className={`hover:bg-slate-50 ${isMissingRow ? 'bg-red-50' : ''}`}
                                        >
                                            <td className={`${PM_TD} font-medium`}>
                                                {week.isNotSubmitted && (
                                                    <span className="inline-flex rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-600">
                                                        Not Submitted
                                                    </span>
                                                )}
                                                {week.isMissing && (
                                                    <span className="inline-flex rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-600">
                                                        Missing
                                                    </span>
                                                )}
                                                {!week.isMissing && !week.isNotSubmitted && userName}
                                            </td>
                                            <td className={`${PM_TD} whitespace-nowrap`}>{weekLabel}</td>
                                            <td className={`${PM_TD} font-medium`}>
                                                {isMissingRow ? '--' : week.yardage.toLocaleString()}
                                            </td>
                                            <td className={`${PM_TD} font-medium`}>
                                                {isMissingRow ? '--' : week.hours.toLocaleString()}
                                            </td>
                                            <td className={`${PM_TD} font-medium`}>
                                                {isMissingRow ? (
                                                    '--'
                                                ) : (
                                                    <span
                                                        className="inline-flex items-baseline gap-0.5"
                                                        title="Raw / Adjusted YPH"
                                                    >
                                                        <span>{(week.rawYph ?? week.yph).toFixed(2)}</span>
                                                        <span className="text-slate-400 mx-0.5">/</span>
                                                        <span>{(week.adjustedYph ?? week.yph).toFixed(2)}</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`${PM_TD} font-medium`}>
                                                {isMissingRow ? '--' : dailyAvg.toLocaleString()}
                                            </td>
                                            <td className={`${PM_TD} font-medium`}>
                                                {isMissingRow ? '--' : `${overallEfficiency.toFixed(1)}%`}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    {yearlyTotals.notSubmittedWeeks?.length > 0 && (
                        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 mt-4">
                            <div className="flex items-center gap-2 mb-2">
                                <i className="fas fa-exclamation-circle text-amber-600"></i>
                                <span className="font-semibold text-slate-800">
                                    {yearlyTotals.notSubmittedWeeks.length} Draft{' '}
                                    {yearlyTotals.notSubmittedWeeks.length === 1 ? 'Report' : 'Reports'}
                                </span>
                            </div>
                            <div className="text-sm text-slate-500">
                                The following weeks have saved drafts that need to be submitted:
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {yearlyTotals.notSubmittedWeeks.map((week, idx) => (
                                        <span
                                            key={idx}
                                            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[0.8125rem] text-slate-800"
                                        >
                                            {ReportUtility.formatDate(new Date(week.week + 'T12:00:00'))}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {yearlyTotals.missingWeeks?.length > 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 mt-4">
                            <div className="flex items-center gap-2 mb-2">
                                <i className="fas fa-exclamation-triangle text-red-600"></i>
                                <span className="font-semibold text-slate-800">
                                    {yearlyTotals.missingWeeks.length} Missing{' '}
                                    {yearlyTotals.missingWeeks.length === 1 ? 'Report' : 'Reports'}
                                </span>
                            </div>
                            <div className="text-sm text-slate-500">
                                The following weeks need reports to be created and submitted:
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {yearlyTotals.missingWeeks.map((week, idx) => (
                                        <span
                                            key={idx}
                                            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[0.8125rem] text-slate-800"
                                        >
                                            {ReportUtility.formatDate(new Date(week.week + 'T12:00:00'))}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
function OperatorsSentToHelp({ entries, onUpdate, weekIso, readOnly, user, plantCode, regionalPlants }) {
    const [plants, setPlants] = useState([])
    const [operators, setOperators] = useState([])
    const [loading, setLoading] = useState(true)
    const [showPlantModal, setShowPlantModal] = useState(false)
    const [selectedEntryIdForPlant, setSelectedEntryIdForPlant] = useState(null)
    const [showOperatorModal, setShowOperatorModal] = useState(false)
    const [selectedEntryIdForOperator, setSelectedEntryIdForOperator] = useState(null)
    const [selectedOperatorIndex, setSelectedOperatorIndex] = useState(null)
    const getValidDate = (iso) => {
        if (!iso) return new Date()
        const d = new Date(iso + 'T00:00:00')
        return isNaN(d.getTime()) ? new Date() : d
    }
    const weekStartDate = getValidDate(weekIso)
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekEndDate.getDate() + 5)
    const minDate = weekStartDate.toISOString().split('T')[0]
    const maxDate = weekEndDate.toISOString().split('T')[0]
    const currentPlantCode = plantCode || user?.plant_code
    useEffect(() => {
        let mounted = true
        async function fetchData() {
            try {
                if (regionalPlants && regionalPlants.length > 0) {
                    const mappedPlants = regionalPlants.map((p) => ({
                        plantCode: p.plantCode || p.plant_code,
                        plantName: p.plantName || p.plant_name
                    }))
                    setPlants(mappedPlants)
                } else if (currentPlantCode) {
                    let regionPlantCodes = []
                    const { data: regionData } = await supabase
                        .from('regions_plants')
                        .select('region_id')
                        .eq('plant_code', currentPlantCode)
                        .limit(1)
                        .maybeSingle()
                    if (regionData?.region_id) {
                        const { data: regionPlantsData } = await supabase
                            .from('regions_plants')
                            .select('plant_code')
                            .eq('region_id', regionData.region_id)
                        regionPlantCodes = (regionPlantsData || []).map((rp) => rp.plant_code).filter(Boolean)
                    }
                    if (regionPlantCodes.length > 0) {
                        const { data: plantsData } = await supabase
                            .from('plants')
                            .select('plant_code, plant_name')
                            .in('plant_code', regionPlantCodes)
                            .order('plant_code')
                        if (!mounted) return
                        setPlants(
                            (plantsData || []).map((p) => ({
                                plantCode: p.plant_code,
                                plantName: p.plant_name
                            }))
                        )
                    }
                }
                const operatorPlantCode = currentPlantCode
                if (operatorPlantCode) {
                    const { data: operatorsData } = await supabase
                        .from('operators')
                        .select('employee_id, name, status, plant_code, smyrna_id, position')
                        .eq('status', 'Active')
                        .eq('plant_code', operatorPlantCode)
                        .eq('position', 'Mixer Operator')
                        .order('name')
                    if (!mounted) return
                    const transformedOperators = (operatorsData || []).map((op) => ({
                        employeeId: op.employee_id,
                        name: op.name,
                        plantCode: op.plant_code,
                        position: op.position,
                        smyrnaId: op.smyrna_id,
                        status: op.status
                    }))
                    setOperators(transformedOperators)
                }
            } catch (err) {
            } finally {
                if (mounted) setLoading(false)
            }
        }
        fetchData()
        return () => {
            mounted = false
        }
    }, [currentPlantCode, regionalPlants])
    const addEntry = () => {
        const defaultDate = minDate || new Date().toISOString().split('T')[0]
        const newEntry = {
            date: defaultDate,
            destination_plant: '',
            id: Date.now(),
            operators: [{ hours: '', operator_id: '' }]
        }
        onUpdate([...(entries || []), newEntry])
    }
    const removeEntry = (entryId) => {
        onUpdate((entries || []).filter((e) => e.id !== entryId))
    }
    const updateEntry = (entryId, field, value) => {
        onUpdate((entries || []).map((e) => (e.id === entryId ? { ...e, [field]: value } : e)))
    }
    const addOperator = (entryId) => {
        onUpdate(
            (entries || []).map((e) =>
                e.id === entryId ? { ...e, operators: [...e.operators, { hours: '', operator_id: '' }] } : e
            )
        )
    }
    const removeOperator = (entryId, operatorIndex) => {
        onUpdate(
            (entries || []).map((e) =>
                e.id === entryId ? { ...e, operators: e.operators.filter((_, i) => i !== operatorIndex) } : e
            )
        )
    }
    const updateOperator = (entryId, operatorIndex, field, value) => {
        let processedValue = value
        if (field === 'hours') {
            const numValue = parseFloat(value)
            if (!isNaN(numValue) && numValue > 80) {
                processedValue = '80'
            }
        }
        onUpdate(
            (entries || []).map((e) =>
                e.id === entryId
                    ? {
                          ...e,
                          operators: e.operators.map((op, i) =>
                              i === operatorIndex ? { ...op, [field]: processedValue } : op
                          )
                      }
                    : e
            )
        )
    }
    const getDayName = (dateString) => {
        const date = new Date(dateString + 'T12:00:00')
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'long' })
    }
    if (loading) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
                <div className="mb-5">
                    <h4 className="flex items-center gap-3 text-lg font-semibold text-slate-800 m-0">
                        <i className="fas fa-hands-helping"></i>Operators Sent to Other Plants
                    </h4>
                </div>
                <div className="flex items-center justify-center gap-3 p-8 text-slate-500">
                    <i className="fas fa-circle-notch fa-spin"></i>
                    <span className="text-sm">Loading...</span>
                </div>
            </div>
        )
    }
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
            <div className="mb-5">
                <h4 className="flex items-center gap-3 text-lg font-semibold text-slate-800 m-0">
                    <i className="fas fa-hands-helping"></i>Operators Sent to Other Plants
                </h4>
                <p className="text-sm text-slate-500 mt-2 mb-0">
                    Track operators sent to help other plants during this week
                </p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 mb-3">
                    <i className="fas fa-info-circle"></i>Instructions for Tracking Operator Assistance
                </div>
                <ul className="m-0 pl-5 text-[0.8125rem] text-blue-900 leading-relaxed [&>li]:mb-1">
                    <li>
                        Record each operator who assisted another plant, including total hours worked (including travel
                        time)
                    </li>
                    <li>Create a separate entry for each day an operator helped a different plant</li>
                    <li>For partial days, enter the actual hours worked (e.g., 4 hours for a half-day)</li>
                    <li>If an operator helped multiple plants in one day, add individual entries for each plant</li>
                    <li>This data contributes to plant efficiency calculations and leaderboard rankings</li>
                </ul>
            </div>
            {!readOnly && (
                <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg border-none bg-accent px-4 py-3 text-sm font-semibold text-white cursor-pointer mb-4 hover:bg-accent-hover"
                    onClick={addEntry}
                >
                    <i className="fas fa-plus"></i>Add Entry
                </button>
            )}
            <div className="flex flex-col gap-4">
                {(!entries || entries.length === 0) && (
                    <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-slate-50 p-6 text-sm text-slate-500">
                        <i className="fas fa-info-circle"></i>
                        <span>No operators were sent to other plants this week</span>
                    </div>
                )}
                {(entries || []).map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-gray-200 bg-slate-50 overflow-hidden">
                        <div className="flex items-start justify-between gap-4 p-4 border-b border-gray-200">
                            <div className="flex flex-wrap gap-4 flex-1">
                                <div className="flex flex-col gap-1.5 min-w-[150px]">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Date
                                    </label>
                                    {readOnly ? (
                                        <div className="text-[0.9375rem] font-medium text-slate-800">
                                            {getDayName(entry.date)}
                                        </div>
                                    ) : (
                                        <input
                                            type="date"
                                            value={entry.date || ''}
                                            onChange={(e) => updateEntry(entry.id, 'date', e.target.value)}
                                            className={PM_INPUT}
                                            min={minDate}
                                            max={maxDate}
                                        />
                                    )}
                                </div>
                                <div className="flex flex-col gap-1.5 min-w-[150px]">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Destination Plant
                                    </label>
                                    {readOnly ? (
                                        <div className="text-[0.9375rem] font-medium text-slate-800">
                                            {entry.destination_plant
                                                ? (() => {
                                                      if (entry.destination_plant === 'OTHER_REGION')
                                                          return 'Other Region'
                                                      const plant = plants.find(
                                                          (p) =>
                                                              (p.plantCode || p.plant_code) === entry.destination_plant
                                                      )
                                                      return plant
                                                          ? `${plant.plantCode || plant.plant_code} - ${plant.plantName || plant.plant_name}`
                                                          : entry.destination_plant
                                                  })()
                                                : 'No plant selected'}
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="min-w-[180px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-slate-800 text-left cursor-pointer"
                                            onClick={() => {
                                                setSelectedEntryIdForPlant(entry.id)
                                                setShowPlantModal(true)
                                            }}
                                        >
                                            {entry.destination_plant
                                                ? (() => {
                                                      if (entry.destination_plant === 'OTHER_REGION')
                                                          return 'Other Region'
                                                      const plant = plants.find(
                                                          (p) =>
                                                              (p.plantCode || p.plant_code) === entry.destination_plant
                                                      )
                                                      return plant
                                                          ? `${plant.plantCode || plant.plant_code} - ${plant.plantName || plant.plant_name}`
                                                          : entry.destination_plant
                                                  })()
                                                : 'Select Plant'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            {!readOnly && (
                                <button
                                    type="button"
                                    className="flex items-center justify-center rounded-md border-none bg-red-100 p-2 text-red-600 cursor-pointer hover:bg-red-200"
                                    onClick={() => removeEntry(entry.id)}
                                    title="Remove entry"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            )}
                        </div>
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <i className="fas fa-users"></i>Operators
                                </span>
                                {!readOnly && (
                                    <button
                                        type="button"
                                        className="flex items-center gap-1.5 rounded-md border-none bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700 cursor-pointer hover:bg-sky-200"
                                        onClick={() => addOperator(entry.id)}
                                    >
                                        <i className="fas fa-plus"></i>Add Operator
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-col gap-3">
                                {entry.operators.map((op, opIdx) => {
                                    const selectedOperator = operators.find((o) => o.employeeId === op.operator_id)
                                    return (
                                        <div
                                            key={opIdx}
                                            className="grid grid-cols-[1fr_120px_auto] items-end gap-4 rounded-lg border border-gray-200 bg-white p-4"
                                        >
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Operator
                                                </label>
                                                {readOnly ? (
                                                    <div className="text-[0.9375rem] font-medium text-slate-800">
                                                        {selectedOperator ? selectedOperator.name : 'Unknown'}
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="w-full rounded-md border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 text-left cursor-pointer hover:border-slate-300"
                                                        onClick={() => {
                                                            setSelectedEntryIdForOperator(entry.id)
                                                            setSelectedOperatorIndex(opIdx)
                                                            setShowOperatorModal(true)
                                                        }}
                                                    >
                                                        {selectedOperator ? selectedOperator.name : 'Select Operator'}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Hours
                                                </label>
                                                {readOnly ? (
                                                    <div className="text-[0.9375rem] font-medium text-slate-800">
                                                        {op.hours || '0'} hrs
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="80"
                                                        step="0.5"
                                                        value={op.hours || ''}
                                                        onChange={(e) =>
                                                            updateOperator(entry.id, opIdx, 'hours', e.target.value)
                                                        }
                                                        className="w-full rounded-md border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 box-border"
                                                        placeholder="0"
                                                    />
                                                )}
                                            </div>
                                            {!readOnly && (
                                                <button
                                                    type="button"
                                                    className="flex items-center justify-center h-[38px] w-[38px] rounded-md border-none bg-red-100 text-red-600 cursor-pointer hover:bg-red-200"
                                                    onClick={() => removeOperator(entry.id, opIdx)}
                                                    title="Remove operator"
                                                >
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {showPlantModal && !loading && (
                <PlantDropdownModal
                    isOpen={showPlantModal}
                    onClose={() => {
                        setShowPlantModal(false)
                        setSelectedEntryIdForPlant(null)
                    }}
                    onSelect={(plantCode) => {
                        if (selectedEntryIdForPlant) {
                            updateEntry(selectedEntryIdForPlant, 'destination_plant', plantCode)
                        }
                        setShowPlantModal(false)
                        setSelectedEntryIdForPlant(null)
                    }}
                    plants={[
                        ...plants.filter(
                            (p) => String(p.plantCode || p.plant_code || '') !== String(currentPlantCode || '')
                        ),
                        { plantCode: 'OTHER_REGION', plantName: 'Other Region' }
                    ]}
                    currentValue={
                        selectedEntryIdForPlant
                            ? entries.find((e) => e.id === selectedEntryIdForPlant)?.destination_plant
                            : ''
                    }
                />
            )}
            {showOperatorModal && !loading && (
                <OperatorSelectModal
                    isOpen={showOperatorModal}
                    onClose={() => {
                        setShowOperatorModal(false)
                        setSelectedEntryIdForOperator(null)
                        setSelectedOperatorIndex(null)
                    }}
                    onSelect={(operatorId) => {
                        if (selectedEntryIdForOperator !== null && selectedOperatorIndex !== null) {
                            updateOperator(selectedEntryIdForOperator, selectedOperatorIndex, 'operator_id', operatorId)
                        }
                        setShowOperatorModal(false)
                        setSelectedEntryIdForOperator(null)
                        setSelectedOperatorIndex(null)
                    }}
                    currentValue={
                        selectedEntryIdForOperator !== null && selectedOperatorIndex !== null
                            ? entries.find((e) => e.id === selectedEntryIdForOperator)?.operators[selectedOperatorIndex]
                                  ?.operator_id
                            : ''
                    }
                    operators={operators.filter((op) => {
                        if (!selectedEntryIdForOperator) return true
                        const currentEntry = entries.find((e) => e.id === selectedEntryIdForOperator)
                        if (!currentEntry) return true
                        const alreadySelected = currentEntry.operators
                            .filter((_, idx) => idx !== selectedOperatorIndex)
                            .map((o) => o.operator_id)
                        return !alreadySelected.includes(op.employeeId)
                    })}
                    assignedPlant={currentPlantCode}
                    mixers={[]}
                    onRefresh={async () => {
                        setLoading(true)
                        try {
                            const { data: operatorsData } = await supabase
                                .from('operators')
                                .select('employee_id, name, status, plant_code, smyrna_id, position')
                                .eq('status', 'Active')
                                .eq('plant_code', currentPlantCode)
                                .eq('position', 'Mixer Operator')
                                .order('name')
                            const transformedOperators = (operatorsData || []).map((op) => ({
                                employeeId: op.employee_id,
                                name: op.name,
                                plantCode: op.plant_code,
                                position: op.position,
                                smyrnaId: op.smyrna_id,
                                status: op.status
                            }))
                            setOperators(transformedOperators)
                        } catch (err) {
                            console.error('Error refreshing operators:', err)
                        } finally {
                            setLoading(false)
                        }
                    }}
                />
            )}
        </div>
    )
}
/** Submit-mode plugin for the Plant Manager report — operator metrics, YPH/lost yards, maintenance items, weekly trends, and operator exclusion handling. */
export function PlantManagerSubmitPlugin({
    yph: propYph,
    yphGrade: propYphGrade,
    yphLabel: propYphLabel,
    lost,
    lostGrade,
    lostLabel,
    form,
    setForm,
    weekIso,
    user,
    plants: propPlants,
    userPlantCode: propUserPlantCode
}) {
    const { preferences: _preferences } = usePreferences()
    const userPlantCode = propUserPlantCode || user?.plant_code || ''
    const plantCode = form?.plant || userPlantCode
    const { yph, grade: yphGrade, label: yphLabel } = useYphCalculation(weekIso, plantCode, form)
    const handleOperatorsUpdate = (entries) => {
        setForm({ ...form, operators_sent_to_help: entries })
    }
    return (
        <div>
            <OperatorsSentToHelp
                entries={form?.operators_sent_to_help || []}
                onUpdate={handleOperatorsUpdate}
                weekIso={weekIso}
                readOnly={false}
                user={user}
                plantCode={plantCode}
                regionalPlants={propPlants}
            />
            <MetricsSection
                yph={propYph ?? yph}
                yphGrade={propYphGrade ?? yphGrade}
                yphLabel={propYphLabel ?? yphLabel}
                lost={lost}
                lostGrade={lostGrade}
                lostLabel={lostLabel}
            />
            <WeeklyTrendsSection
                currentWeekIso={weekIso}
                plantCode={plantCode || userPlantCode || ''}
                user={{ ...user, plant_code: userPlantCode }}
            />
        </div>
    )
}
/** Review-mode plugin for the Plant Manager report — read-only view of metrics, maintenance items, and weekly trends. */
export function PlantManagerReviewPlugin({
    yph: _propYph,
    yphGrade: _propYphGrade,
    yphLabel: _propYphLabel,
    lost,
    lostGrade,
    lostLabel,
    form,
    weekIso,
    user,
    assignedPlant,
    reportUserId: _reportUserId,
    plants: propPlants
}) {
    const { preferences: _preferences } = usePreferences()
    const plantCode = assignedPlant || user?.plant_code || form?.plant || ''
    const timelinePlantCode = form?.plant || assignedPlant || user?.plant_code || ''
    const { yph, grade: yphGrade, label: yphLabel } = useYphCalculation(weekIso, plantCode, form)
    return (
        <div>
            <OperatorsSentToHelp
                entries={form?.operators_sent_to_help || []}
                onUpdate={() => {}}
                weekIso={weekIso}
                readOnly={true}
                user={user}
                plantCode={plantCode}
                regionalPlants={propPlants}
            />
            <MetricsSection
                yph={yph}
                yphGrade={yphGrade}
                yphLabel={yphLabel}
                lost={lost}
                lostGrade={lostGrade}
                lostLabel={lostLabel}
            />
            <WeeklyTrendsSection
                currentWeekIso={weekIso}
                plantCode={timelinePlantCode || user?.plant_code || ''}
                user={user}
            />
        </div>
    )
}
