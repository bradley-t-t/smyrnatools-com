import React, {useEffect, useState} from 'react'
import {usePreferences} from '../../../app/context/PreferencesContext'
import {supabase} from '../../../services/DatabaseService'
import {ReportUtility} from '../../../utils/ReportUtility'
import {UserService} from '../../../services/UserService'
import {RegionService} from '../../../services/RegionService'
import PlantDropdownModal from '../../../components/common/PlantDropdownModal'
import OperatorSelectModal from '../../mixers/OperatorSelectModal'
import '../styles/Reports.css'

function WeeklyTrendsSection({currentWeekIso, plantCode, user}) {
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
            historicalData.forEach(report => {
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

                const {data, error} = await supabase
                    .from('reports')
                    .select('*')
                    .eq('report_name', 'plant_manager')
                    .eq('completed', true)
                    .gte('week', startOfMonthStr)
                    .lte('week', endOfMonthStr + 'T23:59:59.999Z')
                    .order('week', {ascending: true})

                if (error) throw error

                if (!mounted) {
                    setLoading(false)
                    return
                }

                const userIds = [...new Set(data.map(r => r.user_id).filter(Boolean))]
                const usersMap = {}

                if (userIds.length > 0) {
                    const {data: usersData} = await supabase
                        .from('users_profiles')
                        .select('id, plant_code')
                        .in('id', userIds)

                    if (usersData) {
                        usersData.forEach(u => {
                            usersMap[u.id] = u.plant_code
                        })
                    }
                }

                const filteredByPlant = data.filter(report => {
                    const reportPlant = report.data?.plant || usersMap[report.user_id] || ''
                    const matches = reportPlant === effectivePlantCode ||
                        (effectivePlantCode && usersMap[report.user_id] === effectivePlantCode)
                    return matches
                })

                if (mounted && filteredByPlant) {
                    const currentWeekDateOnly = currentWeekIso.split('T')[0]

                    const reportsByWeek = new Map()

                    filteredByPlant.forEach(r => {
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

                    const reports = allMonthWeeks.map(weekStr => {
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
                            return {
                                weekIso: weekStr,
                                yph: parseFloat(report.data?.yardage || 0) / parseFloat(report.data?.total_hours || 1),
                                lost: parseFloat(report.data?.total_yards_lost || 0),
                                yards: parseFloat(report.data?.yardage || 0),
                                hours: parseFloat(report.data?.total_hours || 0),
                                data: report.data,
                                isCurrentWeek: weekStr === currentWeekDateOnly,
                                userId: report.user_id,
                                isPlaceholder: false
                            }
                        } else {
                            return {
                                weekIso: weekStr,
                                yph: 0,
                                lost: 0,
                                yards: 0,
                                hours: 0,
                                data: null,
                                isCurrentWeek: weekStr === currentWeekDateOnly,
                                userId: null,
                                isPlaceholder: true
                            }
                        }
                    }).sort((a, b) => new Date(a.weekIso) - new Date(b.weekIso))

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

                const {data, error} = await supabase
                    .from('reports')
                    .select('*')
                    .eq('report_name', 'plant_manager')
                    .gte('week', startOfYear.toISOString())
                    .lte('week', endOfYear.toISOString())
                    .order('week', {ascending: false})

                if (error) throw error

                if (!mounted) {
                    setYearlyLoading(false)
                    return
                }

                const userIds = [...new Set(data.map(r => r.user_id).filter(Boolean))]
                const usersMap = {}

                if (userIds.length > 0) {
                    const {data: usersData} = await supabase
                        .from('users_profiles')
                        .select('id, plant_code')
                        .in('id', userIds)

                    if (usersData) {
                        usersData.forEach(u => {
                            usersMap[u.id] = u.plant_code
                        })
                    }
                }

                const filteredData = data.filter(report => {
                    const reportPlant = report.data?.plant || usersMap[report.user_id] || ''
                    return reportPlant === effectivePlantCode ||
                        (effectivePlantCode && usersMap[report.user_id] === effectivePlantCode)
                })

                if (mounted && filteredData) {

                    if (filteredData.length === 0) {
                        setYearlyTotals({
                            totalYards: 0,
                            totalHours: 0,
                            totalLost: 0,
                            reportCount: 0,
                            year: currentYear,
                            weeklyBreakdown: [],
                            notSubmittedWeeks: [],
                            missingWeeks: [],
                            avgYph: 0
                        })
                        return
                    }

                    const reportsByWeek = new Map()
                    const allReportDates = []

                    const today = new Date()
                    const currentSunday = new Date(today)
                    currentSunday.setDate(today.getDate() - today.getDay())
                    currentSunday.setHours(0, 0, 0, 0)

                    filteredData.forEach(report => {
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
                            const yardage = parseFloat(report.data?.yardage || 0)
                            const hours = parseFloat(report.data?.total_hours || 0)
                            const lost = parseFloat(report.data?.total_yards_lost || 0)
                            const yph = hours > 0 ? yardage / hours : 0

                            allWeeks.push({
                                week: weekStr,
                                yardage,
                                hours,
                                yph,
                                lost,
                                isMissing: false,
                                isNotSubmitted: !report.completed,
                                userId: report.user_id
                            })
                        } else if (currentDate >= new Date(firstDate + 'T12:00:00') && currentDate < currentSunday) {
                            allWeeks.push({
                                week: weekStr,
                                yardage: 0,
                                hours: 0,
                                yph: 0,
                                lost: 0,
                                isMissing: true,
                                isNotSubmitted: false,
                                userId: null
                            })
                        }

                        currentDate.setDate(currentDate.getDate() + 7)
                    }

                    allWeeks.reverse()

                    const submittedWeeks = allWeeks.filter(w => !w.isMissing && !w.isNotSubmitted)
                    const notSubmittedWeeks = allWeeks.filter(w => w.isNotSubmitted)
                    const missingWeeks = allWeeks.filter(w => w.isMissing)


                    const totals = submittedWeeks.reduce((acc, week) => {
                        return {
                            totalYards: acc.totalYards + week.yardage,
                            totalHours: acc.totalHours + week.hours,
                            totalLost: acc.totalLost + week.lost,
                            reportCount: acc.reportCount + 1,
                            year: currentYear,
                            weeklyBreakdown: allWeeks,
                            notSubmittedWeeks,
                            missingWeeks
                        }
                    }, {
                        totalYards: 0,
                        totalHours: 0,
                        totalLost: 0,
                        reportCount: 0,
                        year: currentYear,
                        weeklyBreakdown: allWeeks,
                        notSubmittedWeeks,
                        missingWeeks
                    })

                    const weeksWithHours = submittedWeeks.filter(w => w.hours > 0)
                    const yardsWithHours = weeksWithHours.reduce((sum, w) => sum + w.yardage, 0)
                    const hoursTotal = weeksWithHours.reduce((sum, w) => sum + w.hours, 0)
                    totals.avgYph = hoursTotal > 0 ? yardsWithHours / hoursTotal : 0

                    const targetYPH = 3.0
                    const yardageEfficiency = totals.totalYards > 0 ? ((totals.totalYards - totals.totalLost) / totals.totalYards * 100) : 0
                    const yphEfficiency = totals.avgYph > 0 ? Math.min((totals.avgYph / targetYPH) * 100, 100) : 0
                    const baseEfficiency = (yphEfficiency * 0.9) + (yardageEfficiency * 0.1)
                    const avgYardageLost = totals.reportCount > 0 ? totals.totalLost / totals.reportCount : 0
                    totals.avgEfficiency = totals.avgYph > 0 ? Math.max(baseEfficiency - avgYardageLost, 0) : 0

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
            yearlyTotals.weeklyBreakdown.forEach(week => {
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
            <div className="pm-trends-section">
                <div className="pm-trends-header">
                    <h3 className="pm-trends-title">
                        <i className="fas fa-chart-line"></i>
                        Monthly Performance Trends
                    </h3>
                </div>
                <div className="pm-trends-loading">
                    <i className="fas fa-circle-notch fa-spin"></i>
                    <span>Loading historical data...</span>
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
            <div className="pm-trends-section">
                <div className="pm-trends-header">
                    <h3 className="pm-trends-title">
                        <i className="fas fa-calendar-alt"></i>
                        {monthName} - Weekly Performance
                    </h3>
                    <p className="pm-trends-subtitle">
                        No reports found for this month
                    </p>
                </div>
            </div>
        )
    }

    const calculateVariance = (current, previous) => {
        if (!previous || previous.isPlaceholder) return null
        return ((current - previous) / previous) * 100
    }

    const weeksWithData = historicalData.filter(r => !r.isPlaceholder).length

    return (
        <div className="pm-trends-section">
            <div className="pm-trends-header">
                <h3 className="pm-trends-title">
                    <i className="fas fa-chart-line"></i>
                    {monthName} Performance Timeline
                </h3>
                <p className="pm-trends-subtitle">
                    {weeksWithData} of {historicalData.length} {historicalData.length === 1 ? 'week' : 'weeks'} with
                    data
                </p>
            </div>

            <div className="pm-timeline-wrapper">
                <div className="pm-timeline-track">
                    <div className="pm-timeline-line-full"></div>
                </div>
                <div className="pm-timeline">
                    {historicalData.map((report, idx) => {
                        const [year, month, day] = report.weekIso.split('-').map(Number)
                        const weekDate = new Date(year, month - 1, day)
                        weekDate.setDate(weekDate.getDate() + 1)
                        const weekLabel = weekDate.toLocaleDateString()
                        const previousReportWithData = historicalData.slice(0, idx).filter(r => !r.isPlaceholder).pop()
                        const yphVariance = !report.isPlaceholder ? calculateVariance(report.yph, previousReportWithData?.yph) : null
                        const lostVariance = !report.isPlaceholder ? calculateVariance(report.lost, previousReportWithData?.lost) : null
                        const userName = report.userId ? (timelineUserNames[report.userId] || 'Loading...') : null

                        return (
                            <div key={idx}
                                 className={`pm-timeline-item ${report.isCurrentWeek ? 'pm-timeline-current' : ''} ${report.isPlaceholder ? 'pm-timeline-placeholder' : ''}`}>
                                <div className="pm-timeline-dot-wrapper">
                                    <div
                                        className={`pm-timeline-dot ${report.isPlaceholder ? 'pm-timeline-dot-placeholder' : ''}`}></div>
                                </div>
                                <div className="pm-timeline-content">
                                    <div className="pm-timeline-date">
                                        {weekLabel}
                                        {report.isCurrentWeek && <span className="pm-timeline-badge">Current</span>}
                                    </div>
                                    {report.isPlaceholder ? (
                                        <div className="pm-timeline-placeholder-content">
                                            <i className="fas fa-clock"></i>
                                            <span>Pending</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="pm-timeline-submitter">
                                                <i className="fas fa-user"></i> {userName || 'Unknown'}
                                            </div>
                                            <div className="pm-timeline-metrics">
                                                <div className="pm-timeline-metric">
                                                    <span
                                                        className="pm-timeline-metric-value">{report.yph.toFixed(2)}</span>
                                                    <span className="pm-timeline-metric-label">YPH</span>
                                                    {yphVariance !== null && (
                                                        <span
                                                            className={`pm-timeline-variance ${yphVariance >= 0 ? 'positive' : 'negative'}`}>
                                                    <i className={`fas fa-arrow-${yphVariance >= 0 ? 'up' : 'down'}`}></i>
                                                            {Math.abs(yphVariance).toFixed(1)}%
                                                </span>
                                                    )}
                                                </div>
                                                <div className="pm-timeline-metric">
                                                    <span
                                                        className="pm-timeline-metric-value">{report.lost.toFixed(0)}</span>
                                                    <span className="pm-timeline-metric-label">Lost</span>
                                                    {lostVariance !== null && (
                                                        <span
                                                            className={`pm-timeline-variance ${lostVariance <= 0 ? 'positive' : 'negative'}`}>
                                                    <i className={`fas fa-arrow-${lostVariance <= 0 ? 'down' : 'up'}`}></i>
                                                            {Math.abs(lostVariance).toFixed(1)}%
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
                <div className="pm-weekly-breakdown">
                    <h5 className="pm-weekly-breakdown-title">Weekly Breakdown</h5>
                    <div className="pm-weekly-breakdown-table-wrapper">
                        <table className="pm-weekly-breakdown-table">
                            <thead>
                            <tr>
                                <th>Submitted By</th>
                                <th>Week Starting</th>
                                <th>Yardage</th>
                                <th>Hours</th>
                                <th>YPH</th>
                                <th>Daily Avg</th>
                                <th>Lost</th>
                                <th>Efficiency</th>
                            </tr>
                            </thead>
                            <tbody>
                            {yearlyTotals.weeklyBreakdown.map((week, idx) => {
                                const weekDate = new Date(week.week + 'T12:00:00')
                                const weekLabel = ReportUtility.formatDate(weekDate)
                                const userName = week.userId ? (userNames[week.userId] || 'Loading...') : null
                                const dailyAvg = Math.round(week.yardage / 6)
                                const yardageEfficiency = week.yardage > 0 ? ((week.yardage - week.lost) / week.yardage * 100) : 0
                                const targetYPH = 3.0
                                const yphEfficiency = week.hours > 0 ? Math.min((week.yph / targetYPH) * 100, 100) : 0
                                const baseEfficiency = (yphEfficiency * 0.9) + (yardageEfficiency * 0.1)
                                const overallEfficiency = week.hours > 0 ? Math.max(baseEfficiency - week.lost, 0) : 0
                                return (
                                    <tr key={idx}
                                        className={week.isMissing || week.isNotSubmitted ? 'pm-week-missing' : ''}>
                                        <td className="pm-breakdown-value">
                                            {week.isNotSubmitted &&
                                                <span className="pm-not-submitted-badge">Not Submitted</span>}
                                            {week.isMissing &&
                                                <span className="pm-missing-badge">Missing</span>}
                                            {!week.isMissing && !week.isNotSubmitted && userName}
                                        </td>
                                        <td className="pm-week-label-cell">
                                            {weekLabel}
                                        </td>
                                        <td className="pm-breakdown-value">
                                            {week.isMissing || week.isNotSubmitted ? '--' : week.yardage.toLocaleString()}
                                        </td>
                                        <td className="pm-breakdown-value">
                                            {week.isMissing || week.isNotSubmitted ? '--' : week.hours.toLocaleString()}
                                        </td>
                                        <td className="pm-breakdown-value">
                                            {week.isMissing || week.isNotSubmitted ? '--' : week.yph.toFixed(2)}
                                        </td>
                                        <td className="pm-breakdown-value">
                                            {week.isMissing || week.isNotSubmitted ? '--' : dailyAvg.toLocaleString()}
                                        </td>
                                        <td className="pm-breakdown-value">
                                            {week.isMissing || week.isNotSubmitted ? '--' : week.lost.toLocaleString()}
                                        </td>
                                        <td className="pm-breakdown-value">
                                            {week.isMissing || week.isNotSubmitted ? '--' : `${overallEfficiency.toFixed(1)}%`}
                                        </td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    </div>

                    {yearlyTotals.notSubmittedWeeks && yearlyTotals.notSubmittedWeeks.length > 0 && (
                        <div className="pm-missing-weeks-notice pm-not-submitted-notice">
                            <div className="pm-missing-notice-header">
                                <i className="fas fa-exclamation-circle"></i>
                                <span className="pm-missing-notice-title">
                                            {yearlyTotals.notSubmittedWeeks.length} Draft {yearlyTotals.notSubmittedWeeks.length === 1 ? 'Report' : 'Reports'}
                                        </span>
                            </div>
                            <div className="pm-missing-notice-body">
                                The following weeks have saved drafts that need to be submitted:
                                <div className="pm-missing-weeks-list">
                                    {yearlyTotals.notSubmittedWeeks.map((week, idx) => {
                                        const weekDate = new Date(week.week + 'T12:00:00')
                                        const weekLabel = ReportUtility.formatDate(weekDate)
                                        return (
                                            <span key={idx} className="pm-missing-week-chip">
                                                        {weekLabel}
                                                    </span>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {yearlyTotals.missingWeeks && yearlyTotals.missingWeeks.length > 0 && (
                        <div className="pm-missing-weeks-notice">
                            <div className="pm-missing-notice-header">
                                <i className="fas fa-exclamation-triangle"></i>
                                <span className="pm-missing-notice-title">
                                            {yearlyTotals.missingWeeks.length} Missing {yearlyTotals.missingWeeks.length === 1 ? 'Report' : 'Reports'}
                                        </span>
                            </div>
                            <div className="pm-missing-notice-body">
                                The following weeks need reports to be created and submitted:
                                <div className="pm-missing-weeks-list">
                                    {yearlyTotals.missingWeeks.map((week, idx) => {
                                        const weekDate = new Date(week.week + 'T12:00:00')
                                        const weekLabel = ReportUtility.formatDate(weekDate)
                                        return (
                                            <span key={idx} className="pm-missing-week-chip">
                                                        {weekLabel}
                                                    </span>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function OperatorsSentToHelp({entries, onUpdate, weekIso, readOnly, user, plantCode}) {
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
        async function fetchData() {
            if (!currentPlantCode) {
                setLoading(false)
                return
            }

            try {
                const regions = await RegionService.fetchRegionsByPlantCode(currentPlantCode)
                if (regions && regions.length > 0) {
                    const regionCode = regions[0].regionCode || regions[0].region_code
                    const regionPlants = await RegionService.fetchRegionPlants(regionCode)
                    setPlants(regionPlants || [])
                }

                const {data: operatorsData} = await supabase
                    .from('operators')
                    .select('employee_id, name, status, plant_code, smyrna_id, position')
                    .eq('status', 'Active')
                    .eq('plant_code', currentPlantCode)
                    .eq('position', 'Mixer Operator')
                    .order('name')

                const transformedOperators = (operatorsData || []).map(op => ({
                    employeeId: op.employee_id,
                    name: op.name,
                    plantCode: op.plant_code,
                    status: op.status,
                    smyrnaId: op.smyrna_id,
                    position: op.position
                }))

                setOperators(transformedOperators)
            } catch (err) {
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [currentPlantCode])

    const addEntry = () => {
        const defaultDate = minDate || new Date().toISOString().split('T')[0]

        const newEntry = {
            id: Date.now(),
            date: defaultDate,
            destination_plant: '',
            operators: [{operator_id: '', hours: ''}]
        }

        onUpdate([...(entries || []), newEntry])
    }

    const removeEntry = (entryId) => {
        onUpdate((entries || []).filter(e => e.id !== entryId))
    }

    const updateEntry = (entryId, field, value) => {
        onUpdate((entries || []).map(e =>
            e.id === entryId ? {...e, [field]: value} : e
        ))
    }

    const addOperator = (entryId) => {
        onUpdate((entries || []).map(e =>
            e.id === entryId
                ? {...e, operators: [...e.operators, {operator_id: '', hours: ''}]}
                : e
        ))
    }

    const removeOperator = (entryId, operatorIndex) => {
        onUpdate((entries || []).map(e =>
            e.id === entryId
                ? {...e, operators: e.operators.filter((_, i) => i !== operatorIndex)}
                : e
        ))
    }

    const updateOperator = (entryId, operatorIndex, field, value) => {
        let processedValue = value
        if (field === 'hours') {
            const numValue = parseFloat(value)
            if (!isNaN(numValue) && numValue > 80) {
                processedValue = '80'
            }
        }
        onUpdate((entries || []).map(e =>
            e.id === entryId
                ? {
                    ...e,
                    operators: e.operators.map((op, i) =>
                        i === operatorIndex ? {...op, [field]: processedValue} : op
                    )
                }
                : e
        ))
    }

    const getDayName = (dateString) => {
        const date = new Date(dateString + 'T12:00:00')
        return date.toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric'})
    }

    if (loading) {
        return (
            <div className="pm-operators-help-section">
                <div className="pm-operators-help-header">
                    <h4 className="pm-operators-help-title">
                        <i className="fas fa-hands-helping"></i>
                        Operators Sent to Other Plants
                    </h4>
                </div>
                <div className="pm-loading-container">
                    <i className="fas fa-circle-notch fa-spin"></i>
                    <span className="pm-loading-text">Loading...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="pm-operators-help-section">
            <div className="pm-operators-help-header">
                <h4 className="pm-operators-help-title">
                    <i className="fas fa-hands-helping"></i>
                    Operators Sent to Other Plants
                </h4>
                <p className="pm-operators-help-subtitle">
                    Track operators sent to help other plants during this week
                </p>
            </div>

            <div className="pm-instructions-box">
                <div className="pm-instructions-header">
                    <i className="fas fa-info-circle"></i>
                    Instructions for Tracking Operator Assistance
                </div>
                <ul className="pm-instructions-list">
                    <li>Record each operator who assisted another plant, including total hours worked (including travel
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
                    className="pm-add-entry-btn"
                    onClick={addEntry}
                >
                    <i className="fas fa-plus"></i>
                    Add Entry
                </button>
            )}

            <div className="pm-operators-help-list">
                {(!entries || entries.length === 0) && (
                    <div className="pm-no-entries">
                        <i className="fas fa-info-circle"></i>
                        <span>No operators were sent to other plants this week</span>
                    </div>
                )}

                {(entries || []).map((entry) => (
                    <div key={entry.id} className="pm-help-entry">
                        <div className="pm-help-entry-header">
                            <div className="pm-help-entry-main">
                                <div className="pm-help-entry-field">
                                    <label>Date</label>
                                    {readOnly ? (
                                        <div className="pm-help-entry-value">
                                            {getDayName(entry.date)}
                                        </div>
                                    ) : (
                                        <input
                                            type="date"
                                            value={entry.date || ''}
                                            onChange={(e) => updateEntry(entry.id, 'date', e.target.value)}
                                            className="pm-help-entry-input"
                                            min={minDate}
                                            max={maxDate}
                                        />
                                    )}
                                </div>

                                <div className="pm-help-entry-field">
                                    <label>Destination Plant</label>
                                    {readOnly ? (
                                        <div className="pm-help-entry-value">
                                            {entry.destination_plant
                                                ? (() => {
                                                    const plant = plants.find(p => p.plant_code === entry.destination_plant);
                                                    return plant ? `${plant.plant_code} - ${plant.plant_name}` : entry.destination_plant;
                                                })()
                                                : 'No plant selected'}
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="pm-help-entry-select"
                                            onClick={() => {
                                                setSelectedEntryIdForPlant(entry.id)
                                                setShowPlantModal(true)
                                            }}
                                        >
                                            {entry.destination_plant
                                                ? (() => {
                                                    const plant = plants.find(p => p.plant_code === entry.destination_plant);
                                                    return plant ? `${plant.plant_code} - ${plant.plant_name}` : entry.destination_plant;
                                                })()
                                                : 'Select Plant'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {!readOnly && (
                                <button
                                    type="button"
                                    className="pm-help-entry-remove"
                                    onClick={() => removeEntry(entry.id)}
                                    title="Remove entry"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            )}
                        </div>

                        <div className="pm-help-operators-section">
                            <div className="pm-help-operators-header">
                                <span className="pm-help-operators-label">
                                    <i className="fas fa-users"></i>
                                    Operators
                                </span>
                                {!readOnly && (
                                    <button
                                        type="button"
                                        className="pm-add-operator-btn"
                                        onClick={() => addOperator(entry.id)}
                                    >
                                        <i className="fas fa-plus"></i>
                                        Add Operator
                                    </button>
                                )}
                            </div>

                            <div className="pm-help-operators-list">
                                {entry.operators.map((op, opIdx) => {
                                    const selectedOperator = operators.find(o => o.employeeId === op.operator_id)

                                    return (
                                        <div key={opIdx} className="pm-help-operator-row">
                                            <div className="pm-help-operator-field">
                                                <label>Operator</label>
                                                {readOnly ? (
                                                    <div className="pm-help-entry-value">
                                                        {selectedOperator
                                                            ? selectedOperator.name
                                                            : 'Unknown'}
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="pm-help-operator-select"
                                                        onClick={() => {
                                                            setSelectedEntryIdForOperator(entry.id)
                                                            setSelectedOperatorIndex(opIdx)
                                                            setShowOperatorModal(true)
                                                        }}
                                                    >
                                                        {selectedOperator
                                                            ? selectedOperator.name
                                                            : 'Select Operator'}
                                                    </button>
                                                )}
                                            </div>

                                            <div className="pm-help-operator-field">
                                                <label>Hours</label>
                                                {readOnly ? (
                                                    <div className="pm-help-entry-value">
                                                        {op.hours || '0'} hrs
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="80"
                                                        step="0.5"
                                                        value={op.hours || ''}
                                                        onChange={(e) => updateOperator(entry.id, opIdx, 'hours', e.target.value)}
                                                        className="pm-help-operator-input"
                                                        placeholder="0"
                                                    />
                                                )}
                                            </div>

                                            {!readOnly && (
                                                <button
                                                    type="button"
                                                    className="pm-help-operator-remove"
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
                    plants={plants.filter(p => p.plant_code !== currentPlantCode)}
                    currentValue={selectedEntryIdForPlant
                        ? entries.find(e => e.id === selectedEntryIdForPlant)?.destination_plant
                        : ''}
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
                            ? entries.find(e => e.id === selectedEntryIdForOperator)?.operators[selectedOperatorIndex]?.operator_id
                            : ''
                    }
                    operators={operators.filter(op => {
                        if (!selectedEntryIdForOperator) return true
                        const currentEntry = entries.find(e => e.id === selectedEntryIdForOperator)
                        if (!currentEntry) return true
                        const alreadySelected = currentEntry.operators
                            .filter((_, idx) => idx !== selectedOperatorIndex)
                            .map(o => o.operator_id)
                        return !alreadySelected.includes(op.employeeId)
                    })}
                    assignedPlant={currentPlantCode}
                    mixers={[]}
                    onRefresh={async () => {
                        setLoading(true)
                        try {
                            const {data: operatorsData} = await supabase
                                .from('operators')
                                .select('employee_id, name, status, plant_code, smyrna_id, position')
                                .eq('status', 'Active')
                                .eq('plant_code', currentPlantCode)
                                .eq('position', 'Mixer Operator')
                                .order('name')

                            const transformedOperators = (operatorsData || []).map(op => ({
                                employeeId: op.employee_id,
                                name: op.name,
                                plantCode: op.plant_code,
                                status: op.status,
                                smyrnaId: op.smyrna_id,
                                position: op.position
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

export function PlantManagerSubmitPlugin({
                                             yph,
                                             yphGrade,
                                             yphLabel,
                                             lost,
                                             lostGrade,
                                             lostLabel,
                                             form,
                                             weekIso,
                                             user,
                                             setForm
                                         }) {
    const {preferences} = usePreferences()
    const isDark = preferences.themeMode === 'dark'
    const [userPlantCode, setUserPlantCode] = useState(user?.plant_code || '')

    useEffect(() => {
        async function fetchUserPlant() {
            if (!user?.id || user?.plant_code) return

            try {
                const {data, error} = await supabase
                    .from('users_profiles')
                    .select('plant_code')
                    .eq('id', user.id)
                    .single()

                if (error) throw error
                if (data?.plant_code) {
                    setUserPlantCode(data.plant_code)
                }
            } catch (err) {
                console.error('Error fetching user plant:', err)
            }
        }

        fetchUserPlant()
    }, [user?.id, user?.plant_code])

    const formatYph = v => {
        const n = typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) : NaN)
        return Number.isFinite(n) ? n.toFixed(2) : '--'
    }

    const plantCode = form?.plant || userPlantCode || ''

    const handleOperatorsUpdate = (entries) => {
        setForm({...form, operators_sent_to_help: entries})
    }

    return (
        <div className="pm-report-container">
            <OperatorsSentToHelp
                entries={form?.operators_sent_to_help || []}
                onUpdate={handleOperatorsUpdate}
                weekIso={weekIso}
                readOnly={false}
                user={user}
                plantCode={plantCode}
            />

            <div className="pm-metrics-section">
                <div className="pm-metrics-header">
                    <h3 className="pm-metrics-title">
                        <i className="fas fa-chart-bar"></i>
                        Weekly Performance Metrics
                    </h3>
                    <p className="pm-metrics-subtitle">
                        Key performance indicators for this reporting period
                    </p>
                </div>

                <div className="pm-metrics-grid">
                    <div className="pm-metric-card">
                        <div className="pm-metric-header">
                            <i className="fas fa-tachometer-alt pm-metric-icon"></i>
                            <span className="pm-metric-title">Yards per Man-Hour</span>
                        </div>
                        <div
                            className={`pm-metric-value ${isDark ? 'pm-performance-text-dark' : 'pm-performance-text'}`}>
                            {formatYph(yph)}
                        </div>
                        <div
                            className={`pm-metric-grade ${isDark ? 'pm-performance-text-dark' : 'pm-performance-text'}`}>
                            {yphLabel}
                        </div>
                        <div className="pm-metric-scale">
                            <span className={yphGrade === 'excellent' ? 'active excellent' : ''}>Excellent</span>
                            <span className={yphGrade === 'good' ? 'active good' : ''}>Good</span>
                            <span className={yphGrade === 'average' ? 'active average' : ''}>Average</span>
                            <span className={yphGrade === 'poor' ? 'active poor' : ''}>Poor</span>
                        </div>
                    </div>

                    <div className="pm-metric-card">
                        <div className="pm-metric-header">
                            <i className="fas fa-exclamation-triangle pm-metric-icon"></i>
                            <span className="pm-metric-title">Yardage Lost</span>
                        </div>
                        <div
                            className={`pm-metric-value ${isDark ? 'pm-performance-text-dark' : 'pm-performance-text'}`}>
                            {lost !== null ? lost : '--'}
                        </div>
                        <div
                            className={`pm-metric-grade ${isDark ? 'pm-performance-text-dark' : 'pm-performance-text'}`}>
                            {lostLabel}
                        </div>
                        <div className="pm-metric-scale">
                            <span className={lostGrade === 'excellent' ? 'active excellent' : ''}>Excellent</span>
                            <span className={lostGrade === 'good' ? 'active good' : ''}>Good</span>
                            <span className={lostGrade === 'average' ? 'active average' : ''}>Average</span>
                            <span className={lostGrade === 'poor' ? 'active poor' : ''}>Poor</span>
                        </div>
                    </div>
                </div>
            </div>

            <WeeklyTrendsSection
                currentWeekIso={weekIso}
                plantCode={plantCode || userPlantCode || ''}
                user={{...user, plant_code: userPlantCode}}
            />
        </div>
    )
}

export function PlantManagerReviewPlugin({
                                             yph,
                                             yphGrade,
                                             yphLabel,
                                             lost,
                                             lostGrade,
                                             lostLabel,
                                             form,
                                             weekIso,
                                             user,
                                             assignedPlant,
                                             reportUserId
                                         }) {
    const {preferences} = usePreferences()
    const isDark = preferences.themeMode === 'dark'
    const formatYph = v => {
        const n = typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) : NaN)
        return Number.isFinite(n) ? n.toFixed(2) : '--'
    }

    const plantCode = assignedPlant || user?.plant_code || form?.plant || ''
    const timelinePlantCode = form?.plant || assignedPlant || user?.plant_code || ''

    return (
        <div className="pm-report-container">
            <OperatorsSentToHelp
                entries={form?.operators_sent_to_help || []}
                onUpdate={() => {
                }}
                weekIso={weekIso}
                readOnly={true}
                user={user}
                plantCode={plantCode}
            />

            <div className="pm-metrics-section">
                <div className="pm-metrics-header">
                    <h3 className="pm-metrics-title">
                        <i className="fas fa-chart-bar"></i>
                        Weekly Performance Metrics
                    </h3>
                    <p className="pm-metrics-subtitle">
                        Key performance indicators for this reporting period
                    </p>
                </div>

                <div className="pm-metrics-grid">
                    <div className="pm-metric-card">
                        <div className="pm-metric-header">
                            <i className="fas fa-tachometer-alt pm-metric-icon"></i>
                            <span className="pm-metric-title">Yards per Man-Hour</span>
                        </div>
                        <div
                            className={`pm-metric-value ${isDark ? 'pm-performance-text-dark' : 'pm-performance-text'}`}>
                            {formatYph(yph)}
                        </div>
                        <div
                            className={`pm-metric-grade ${isDark ? 'pm-performance-text-dark' : 'pm-performance-text'}`}>
                            {yphLabel}
                        </div>
                        <div className="pm-metric-scale">
                            <span className={yphGrade === 'excellent' ? 'active excellent' : ''}>Excellent</span>
                            <span className={yphGrade === 'good' ? 'active good' : ''}>Good</span>
                            <span className={yphGrade === 'average' ? 'active average' : ''}>Average</span>
                            <span className={yphGrade === 'poor' ? 'active poor' : ''}>Poor</span>
                        </div>
                    </div>

                    <div className="pm-metric-card">
                        <div className="pm-metric-header">
                            <i className="fas fa-exclamation-triangle pm-metric-icon"></i>
                            <span className="pm-metric-title">Yardage Lost</span>
                        </div>
                        <div
                            className={`pm-metric-value ${isDark ? 'pm-performance-text-dark' : 'pm-performance-text'}`}>
                            {lost !== null ? lost : '--'}
                        </div>
                        <div
                            className={`pm-metric-grade ${isDark ? 'pm-performance-text-dark' : 'pm-performance-text'}`}>
                            {lostLabel}
                        </div>
                        <div className="pm-metric-scale">
                            <span className={lostGrade === 'excellent' ? 'active excellent' : ''}>Excellent</span>
                            <span className={lostGrade === 'good' ? 'active good' : ''}>Good</span>
                            <span className={lostGrade === 'average' ? 'active average' : ''}>Average</span>
                            <span className={lostGrade === 'poor' ? 'active poor' : ''}>Poor</span>
                        </div>
                    </div>
                </div>
            </div>

            <WeeklyTrendsSection
                currentWeekIso={weekIso}
                plantCode={timelinePlantCode || user?.plant_code || ''}
                user={user}
            />
        </div>
    )
}