import React, {useEffect, useState} from 'react'
import {usePreferences} from '../../../app/context/PreferencesContext'
import {supabase} from '../../../services/DatabaseService'
import {ReportUtility} from '../../../utils/ReportUtility'
import {UserService} from '../../../services/UserService'
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
                const currentDate = new Date(currentWeekIso)
                const currentMonth = currentDate.getMonth()
                const currentYear = currentDate.getFullYear()

                const startOfMonth = new Date(currentYear, currentMonth, 1)
                const endOfMonth = new Date(currentYear, currentMonth + 1, 0)

                const {data, error} = await supabase
                    .from('reports')
                    .select('*')
                    .eq('report_name', 'plant_manager')
                    .eq('completed', true)
                    .gte('week', startOfMonth.toISOString())
                    .lte('week', endOfMonth.toISOString())
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
                        if (reportsByWeek.has(weekStr)) {
                            const existing = reportsByWeek.get(weekStr)
                            const existingDate = new Date(existing.submitted_at || existing.updated_at || 0)
                            const rDate = new Date(r.submitted_at || r.updated_at || 0)
                            if (rDate > existingDate) {
                                reportsByWeek.set(weekStr, r)
                            }
                        } else {
                            reportsByWeek.set(weekStr, r)
                        }
                    })

                    const reports = Array.from(reportsByWeek.values())
                        .map(r => {
                            const weekStr = r.week.split('T')[0]
                            return {
                                weekIso: weekStr,
                                yph: parseFloat(r.data?.yardage || 0) / parseFloat(r.data?.total_hours || 1),
                                lost: parseFloat(r.data?.total_yards_lost || 0),
                                yards: parseFloat(r.data?.yardage || 0),
                                hours: parseFloat(r.data?.total_hours || 0),
                                data: r.data,
                                isCurrentWeek: weekStr === currentWeekDateOnly,
                                userId: r.user_id
                            }
                        })
                        .filter(r => !isNaN(r.yph))
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
                const currentYear = new Date(currentWeekIso).getFullYear()
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

    const monthName = new Date(currentWeekIso).toLocaleString('default', {month: 'long', year: 'numeric'})

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
        if (!previous) return null
        return ((current - previous) / previous) * 100
    }

    return (
        <div className="pm-trends-section">
            <div className="pm-trends-header">
                <h3 className="pm-trends-title">
                    <i className="fas fa-chart-line"></i>
                    {monthName} Performance Timeline
                </h3>
                <p className="pm-trends-subtitle">
                    {historicalData.length} {historicalData.length === 1 ? 'week' : 'weeks'} of data
                </p>
            </div>

            <div className="pm-timeline-wrapper">
                <div className="pm-timeline-track">
                    <div className="pm-timeline-line-full"></div>
                </div>
                <div className="pm-timeline">
                    {historicalData.map((report, idx) => {
                        const weekDate = new Date(report.weekIso)
                        const weekLabel = ReportUtility.formatDate(weekDate)
                        const previousReport = idx > 0 ? historicalData[idx - 1] : null
                        const yphVariance = calculateVariance(report.yph, previousReport?.yph)
                        const lostVariance = calculateVariance(report.lost, previousReport?.lost)
                        const userName = report.userId ? (timelineUserNames[report.userId] || 'Loading...') : 'Unknown'

                        return (
                            <div key={idx}
                                 className={`pm-timeline-item ${report.isCurrentWeek ? 'pm-timeline-current' : ''}`}>
                                <div className="pm-timeline-dot-wrapper">
                                    <div className="pm-timeline-dot"></div>
                                </div>
                                <div className="pm-timeline-content">
                                    <div className="pm-timeline-date">
                                        {weekLabel}
                                        {report.isCurrentWeek && <span className="pm-timeline-badge">Current</span>}
                                    </div>
                                    <div className="pm-timeline-submitter">
                                        <i className="fas fa-user"></i> {userName}
                                    </div>
                                    <div className="pm-timeline-metrics">
                                        <div className="pm-timeline-metric">
                                            <span className="pm-timeline-metric-value">{report.yph.toFixed(2)}</span>
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
                                            <span className="pm-timeline-metric-value">{report.lost.toFixed(0)}</span>
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
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {yearlyLoading && (
                <div className="pm-yearly-summary">
                    <div className="pm-yearly-header">
                        <h4 className="pm-yearly-title">
                            <i className="fas fa-calendar-alt"></i>
                            Year-to-Date Totals
                        </h4>
                    </div>
                    <div className="pm-trends-loading">
                        <i className="fas fa-circle-notch fa-spin"></i>
                        <span>Loading yearly data...</span>
                    </div>
                </div>
            )}

            {!yearlyLoading && yearlyTotals && (
                <div className="pm-yearly-summary">
                    <div className="pm-yearly-header">
                        <h4 className="pm-yearly-title">
                            <i className="fas fa-calendar-alt"></i>
                            {yearlyTotals.year} Year-to-Date Totals
                        </h4>
                        <span className="pm-yearly-subtitle">{yearlyTotals.reportCount} reports submitted</span>
                    </div>

                    {yearlyTotals.reportCount > 0 && (
                        <div className="pm-metrics-grid" style={{marginTop: '20px'}}>
                            <div className="pm-metric-card">
                                <div className="pm-metric-header">
                                    <i className="fas fa-percentage pm-metric-icon"></i>
                                    <span className="pm-metric-title">Average Efficiency</span>
                                </div>
                                <div className="pm-metric-value" style={{
                                    fontSize: '1.8rem',
                                    color: yearlyTotals.avgEfficiency >= 90 ? 'var(--success)' : 
                                           yearlyTotals.avgEfficiency >= 80 ? 'var(--warning)' : 
                                           'var(--danger)'
                                }}>
                                    {yearlyTotals.avgEfficiency.toFixed(1)}%
                                </div>
                                <div className="pm-metric-grade">overall performance</div>
                            </div>

                            <div className="pm-metric-card">
                                <div className="pm-metric-header">
                                    <i className="fas fa-box pm-metric-icon"></i>
                                    <span className="pm-metric-title">Total Yardage</span>
                                </div>
                                <div className="pm-metric-value" style={{fontSize: '1.8rem'}}>
                                    {yearlyTotals.totalYards.toLocaleString()}
                                </div>
                                <div className="pm-metric-grade">yards produced</div>
                            </div>

                            <div className="pm-metric-card">
                                <div className="pm-metric-header">
                                    <i className="fas fa-clock pm-metric-icon"></i>
                                    <span className="pm-metric-title">Total Hours</span>
                                </div>
                                <div className="pm-metric-value" style={{fontSize: '1.8rem'}}>
                                    {yearlyTotals.totalHours.toLocaleString()}
                                </div>
                                <div className="pm-metric-grade">man-hours worked</div>
                            </div>

                            <div className="pm-metric-card">
                                <div className="pm-metric-header">
                                    <i className="fas fa-tachometer-alt pm-metric-icon"></i>
                                    <span className="pm-metric-title">Average YPH</span>
                                </div>
                                <div className="pm-metric-value" style={{fontSize: '1.8rem'}}>
                                    {yearlyTotals.avgYph.toFixed(2)}
                                </div>
                                <div className="pm-metric-grade">yards per hour</div>
                            </div>

                            <div className="pm-metric-card">
                                <div className="pm-metric-header">
                                    <i className="fas fa-exclamation-triangle pm-metric-icon"></i>
                                    <span className="pm-metric-title">Total Lost</span>
                                </div>
                                <div className="pm-metric-value" style={{fontSize: '1.8rem'}}>
                                    {yearlyTotals.totalLost.toLocaleString()}
                                </div>
                                <div className="pm-metric-grade">yards lost</div>
                            </div>

                            <div className="pm-metric-card">
                                <div className="pm-metric-header">
                                    <i className="fas fa-chart-pie pm-metric-icon"></i>
                                    <span className="pm-metric-title">Average Lost</span>
                                </div>
                                <div className="pm-metric-value" style={{fontSize: '1.8rem'}}>
                                    {Math.round(yearlyTotals.totalLost / yearlyTotals.reportCount).toLocaleString()}
                                </div>
                                <div className="pm-metric-grade">yards lost per week</div>
                            </div>

                            <div className="pm-metric-card">
                                <div className="pm-metric-header">
                                    <i className="fas fa-calendar-week pm-metric-icon"></i>
                                    <span className="pm-metric-title">Weekly Average</span>
                                </div>
                                <div className="pm-metric-value" style={{fontSize: '1.8rem'}}>
                                    {Math.round(yearlyTotals.totalYards / yearlyTotals.reportCount).toLocaleString()}
                                </div>
                                <div className="pm-metric-grade">yards per week</div>
                            </div>

                            <div className="pm-metric-card">
                                <div className="pm-metric-header">
                                    <i className="fas fa-calendar-day pm-metric-icon"></i>
                                    <span className="pm-metric-title">Daily Average</span>
                                </div>
                                <div className="pm-metric-value" style={{fontSize: '1.8rem'}}>
                                    {Math.round(yearlyTotals.totalYards / (yearlyTotals.reportCount * 7)).toLocaleString()}
                                </div>
                                <div className="pm-metric-grade">yards per day</div>
                            </div>

                            <div className="pm-metric-card">
                                <div className="pm-metric-header">
                                    <i className="fas fa-chart-line pm-metric-icon"></i>
                                    <span className="pm-metric-title">Total Weeks</span>
                                </div>
                                <div className="pm-metric-value" style={{fontSize: '1.8rem'}}>
                                    {yearlyTotals.reportCount}
                                </div>
                                <div className="pm-metric-grade">weeks reported</div>
                            </div>
                        </div>
                    )}

                    {yearlyTotals.weeklyBreakdown && yearlyTotals.weeklyBreakdown.length > 0 && (
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
            )}
        </div>
    )
}

export function PlantManagerSubmitPlugin({yph, yphGrade, yphLabel, lost, lostGrade, lostLabel, form, weekIso, user}) {
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


    return (
        <div className="pm-report-container">
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
                        <div className="pm-metric-value"
                             style={{color: isDark ? 'var(--text-light)' : 'var(--text-primary)'}}>
                            {formatYph(yph)}
                        </div>
                        <div className="pm-metric-grade"
                             style={{color: isDark ? 'var(--text-light)' : 'var(--text-primary)'}}>
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
                        <div className="pm-metric-value"
                             style={{color: isDark ? 'var(--text-light)' : 'var(--text-primary)'}}>
                            {lost !== null ? lost : '--'}
                        </div>
                        <div className="pm-metric-grade"
                             style={{color: isDark ? 'var(--text-light)' : 'var(--text-primary)'}}>
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
    const userId = reportUserId || user?.id
    const timelinePlantCode = form?.plant || assignedPlant || user?.plant_code || ''

    return (
        <div className="pm-report-container">
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
                        <div className="pm-metric-value"
                             style={{color: isDark ? 'var(--text-light)' : 'var(--text-primary)'}}>
                            {formatYph(yph)}
                        </div>
                        <div className="pm-metric-grade"
                             style={{color: isDark ? 'var(--text-light)' : 'var(--text-primary)'}}>
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
                        <div className="pm-metric-value"
                             style={{color: isDark ? 'var(--text-light)' : 'var(--text-primary)'}}>
                            {lost !== null ? lost : '--'}
                        </div>
                        <div className="pm-metric-grade"
                             style={{color: isDark ? 'var(--text-light)' : 'var(--text-primary)'}}>
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