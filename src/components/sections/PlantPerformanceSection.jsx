import React, {useEffect, useState} from 'react'
import {supabase} from '../../services/DatabaseService'
import './styles/PlantPerformanceSection.css'

export default function PlantPerformanceSection({dashboardPlant, regionPlants, allPlants, showSkeleton}) {
    const [loading, setLoading] = useState(true)
    const [overallMetrics, setOverallMetrics] = useState(null)
    const [plantMetrics, setPlantMetrics] = useState([])
    const [showPlantBreakdown, setShowPlantBreakdown] = useState(false)

    useEffect(() => {
        let mounted = true

        async function fetchPerformanceMetrics() {
            setLoading(true)
            try {

                const currentYear = new Date().getFullYear()
                const startOfYear = new Date(currentYear, 0, 1)
                const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59)

                let plantCodes = []
                let plantNames = {}

                if (dashboardPlant && dashboardPlant.trim() !== '') {
                    plantCodes = [dashboardPlant]
                    const plantData = [...(regionPlants || []), ...(allPlants || [])].find(p =>
                        (p.plantCode || p.plant_code) === dashboardPlant
                    )
                    if (plantData) {
                        plantNames[dashboardPlant] = plantData.plantName || plantData.plant_name
                    }
                } else if (regionPlants && regionPlants.length > 0) {
                    plantCodes = regionPlants.map(p => p.plantCode || p.plant_code).filter(Boolean)
                    regionPlants.forEach(p => {
                        const code = p.plantCode || p.plant_code
                        if (code) {
                            plantNames[code] = p.plantName || p.plant_name
                        }
                    })
                } else {
                    plantCodes = (allPlants || []).map(p => p.plantCode || p.plant_code).filter(Boolean)
                    ;(allPlants || []).forEach(p => {
                        const code = p.plantCode || p.plant_code
                        if (code) {
                            plantNames[code] = p.plantName || p.plant_name
                        }
                    })
                }


                if (plantCodes.length === 0) {
                    if (mounted) {
                        setOverallMetrics(null)
                        setPlantMetrics([])
                        setLoading(false)
                    }
                    return
                }

                const {data: profilesData, error: profilesError} = await supabase
                    .from('users_profiles')
                    .select('id, plant_code')
                    .in('plant_code', plantCodes)

                if (profilesError) throw profilesError


                const userIdsByPlant = {}
                profilesData.forEach(p => {
                    if (!userIdsByPlant[p.plant_code]) {
                        userIdsByPlant[p.plant_code] = []
                    }
                    userIdsByPlant[p.plant_code].push(p.id)
                })

                const allUserIds = profilesData.map(p => p.id)

                if (allUserIds.length === 0) {
                    if (mounted) {
                        setOverallMetrics(null)
                        setPlantMetrics([])
                        setLoading(false)
                    }
                    return
                }


                const {data: reports, error: reportsError} = await supabase
                    .from('reports')
                    .select('*')
                    .eq('report_name', 'plant_manager')
                    .in('user_id', allUserIds)
                    .gte('week', startOfYear.toISOString())
                    .lte('week', endOfYear.toISOString())

                if (reportsError) throw reportsError

                if (!mounted) return

                if (!reports || reports.length === 0) {
                    setOverallMetrics(null)
                    setPlantMetrics([])
                    setLoading(false)
                    return
                }

                const now = new Date()
                const currentWeekStart = new Date(now)
                currentWeekStart.setDate(now.getDate() - now.getDay())
                currentWeekStart.setHours(0, 0, 0, 0)

                const filteredReports = reports.filter(report => {
                    const reportDate = new Date(report.week)
                    return reportDate < currentWeekStart
                })

                if (filteredReports.length === 0) {
                    setOverallMetrics(null)
                    setPlantMetrics([])
                    setLoading(false)
                    return
                }

                const calculateMetrics = (reportsList) => {
                    if (reportsList.length === 0) {
                        return {
                            avgYPH: 0,
                            avgYardageDaily: 0,
                            avgYardageWeekly: 0,
                            avgYardageLost: 0,
                            avgWeeklyHours: 0,
                            avgHoursDaily: 0,
                            avgEfficiency: 0,
                            avgHoursOverall: 0,
                            avgYardageOverall: 0,
                            reportCount: 0,
                            totalYardage: 0,
                            totalHours: 0,
                            totalLost: 0,
                            dataIntegrity: 100,
                            submittedReports: 0,
                            totalExpectedReports: 0
                        }
                    }

                    const reportsByWeek = new Map()
                    const allReportDates = []

                    reportsList.forEach(report => {
                        const weekStr = report.week.split('T')[0]
                        if (reportsByWeek.has(weekStr)) {
                            const existing = reportsByWeek.get(weekStr)
                            if (report.completed && !existing.completed) {
                                reportsByWeek.set(weekStr, report)
                            }
                        } else {
                            reportsByWeek.set(weekStr, report)
                            allReportDates.push(weekStr)
                        }
                    })

                    if (allReportDates.length === 0) {
                        return {
                            avgYPH: 0,
                            avgYardageDaily: 0,
                            avgYardageWeekly: 0,
                            avgYardageLost: 0,
                            avgWeeklyHours: 0,
                            avgHoursDaily: 0,
                            avgEfficiency: 0,
                            avgHoursOverall: 0,
                            avgYardageOverall: 0,
                            reportCount: 0,
                            totalYardage: 0,
                            totalHours: 0,
                            totalLost: 0,
                            dataIntegrity: 100,
                            submittedReports: 0,
                            totalExpectedReports: 0
                        }
                    }

                    allReportDates.sort()
                    const firstDate = allReportDates[0]
                    const lastDate = allReportDates[allReportDates.length - 1]

                    const today = new Date()
                    const currentSunday = new Date(today)
                    currentSunday.setDate(today.getDate() - today.getDay())
                    currentSunday.setHours(0, 0, 0, 0)

                    const lastSunday = new Date(currentSunday)
                    lastSunday.setDate(currentSunday.getDate() - 7)

                    let expectedWeeks = 0
                    let submittedReports = 0
                    let totalYardage = 0
                    let totalHours = 0
                    let totalLost = 0
                    let validReports = 0
                    let yardsWithHours = 0
                    let hoursForYPH = 0

                    let currentDate = new Date(firstDate + 'T12:00:00')
                    const endDate = new Date(Math.max(new Date(lastDate + 'T12:00:00').getTime(), lastSunday.getTime()))

                    while (currentDate <= endDate) {
                        if (currentDate < currentSunday) {
                            expectedWeeks++

                            const year = currentDate.getFullYear()
                            const month = String(currentDate.getMonth() + 1).padStart(2, '0')
                            const day = String(currentDate.getDate()).padStart(2, '0')
                            const weekStr = `${year}-${month}-${day}`

                            const report = reportsByWeek.get(weekStr)

                            if (report) {
                                const isCompleted = report.completed === true
                                if (isCompleted) {
                                    submittedReports++

                                    const yardage = parseFloat(report.data?.yardage || 0)
                                    const hours = parseFloat(report.data?.total_hours || 0)
                                    const lost = parseFloat(report.data?.total_yards_lost || 0)

                                    totalYardage += yardage
                                    totalHours += hours
                                    totalLost += lost
                                    validReports++

                                    if (hours > 0) {
                                        yardsWithHours += yardage
                                        hoursForYPH += hours
                                    }
                                }
                            }
                        }

                        currentDate.setDate(currentDate.getDate() + 7)
                    }

                    const dataIntegrity = expectedWeeks > 0 
                        ? (submittedReports / expectedWeeks) * 100 
                        : 100

                    if (validReports === 0) {
                        return {
                            avgYPH: 0,
                            avgYardageDaily: 0,
                            avgYardageWeekly: 0,
                            avgYardageLost: 0,
                            avgWeeklyHours: 0,
                            avgHoursDaily: 0,
                            avgEfficiency: 0,
                            avgHoursOverall: 0,
                            avgYardageOverall: 0,
                            reportCount: 0,
                            totalYardage: 0,
                            totalHours: 0,
                            totalLost: 0,
                            dataIntegrity,
                            submittedReports,
                            totalExpectedReports: expectedWeeks
                        }
                    }

                    const avgYPH = hoursForYPH > 0 ? yardsWithHours / hoursForYPH : 0
                    const avgYardageWeekly = totalYardage / validReports
                    const avgYardageDaily = avgYardageWeekly / 6
                    const avgYardageLost = totalLost / validReports
                    const avgWeeklyHours = totalHours / validReports
                    const avgHoursDaily = avgWeeklyHours / 6
                    const avgHoursOverall = totalHours / validReports
                    const avgYardageOverall = totalYardage / validReports

                    const targetYPH = 3.0
                    const yardageEfficiency = totalYardage > 0 ? ((totalYardage - totalLost) / totalYardage * 100) : 0
                    const yphEfficiency = avgYPH > 0 ? Math.min((avgYPH / targetYPH) * 100, 100) : 0
                    const baseEfficiency = (yphEfficiency * 0.9) + (yardageEfficiency * 0.1)
                    const avgEfficiency = avgYPH > 0 ? Math.max(baseEfficiency - avgYardageLost, 0) : 0

                    return {
                        avgYPH,
                        avgYardageDaily,
                        avgYardageWeekly,
                        avgYardageLost,
                        avgWeeklyHours,
                        avgHoursDaily,
                        avgEfficiency,
                        avgHoursOverall,
                        avgYardageOverall,
                        reportCount: validReports,
                        totalYardage,
                        totalHours,
                        totalLost,
                        dataIntegrity,
                        submittedReports,
                        totalExpectedReports: expectedWeeks
                    }
                }

                const overall = calculateMetrics(filteredReports)

                if (!dashboardPlant && plantCodes.length > 1) {
                    const plantMetricsArray = []

                    Object.keys(userIdsByPlant).forEach(plantCode => {
                        const plantReports = filteredReports.filter(r => userIdsByPlant[plantCode].includes(r.user_id))
                        const metrics = calculateMetrics(plantReports)

                        if (metrics) {
                            plantMetricsArray.push({
                                plantCode,
                                plantName: plantNames[plantCode] || plantCode,
                                ...metrics
                            })
                        }
                    })

                    plantMetricsArray.sort((a, b) => {
                        const codeA = String(a.plantCode || '').trim()
                        const codeB = String(b.plantCode || '').trim()
                        return codeA.localeCompare(codeB)
                    })

                    if (plantMetricsArray.length > 0) {
                        overall.dataIntegrity = plantMetricsArray.reduce((sum, plant) => sum + (plant.dataIntegrity || 0), 0) / plantMetricsArray.length
                        overall.avgEfficiency = plantMetricsArray.reduce((sum, plant) => sum + (plant.avgEfficiency || 0), 0) / plantMetricsArray.length
                        overall.totalYardage = plantMetricsArray.reduce((sum, plant) => sum + (plant.totalYardage || 0), 0)
                        overall.totalHours = plantMetricsArray.reduce((sum, plant) => sum + (plant.totalHours || 0), 0)
                    }

                    setPlantMetrics(plantMetricsArray)
                } else {
                    setPlantMetrics([])
                }

                setOverallMetrics(overall)

            } catch (err) {
                if (mounted) {
                    setPlantMetrics([])
                }
            } finally {
                if (mounted) setLoading(false)
            }
        }

        fetchPerformanceMetrics()

        return () => {
            mounted = false
        }
    }, [dashboardPlant, regionPlants, allPlants])

    if (showSkeleton) {
        return null
    }

    const metricsToShow = overallMetrics || {
        avgEfficiency: 0,
        avgYPH: 0,
        avgYardageWeekly: 0,
        avgYardageDaily: 0,
        avgWeeklyHours: 0,
        avgHoursDaily: 0,
        avgYardageLost: 0,
        reportCount: 0,
        dataIntegrity: 100,
        totalYardage: 0,
        totalHours: 0
    }

    const getEfficiencyColor = (efficiency) => {
        if (efficiency >= 90) return 'var(--success)'
        if (efficiency >= 80) return 'var(--warning)'
        return 'var(--danger)'
    }

    const getEfficiencyGrade = (efficiency) => {
        if (efficiency >= 90) return 'Excellent'
        if (efficiency >= 80) return 'Good'
        if (efficiency >= 70) return 'Average'
        return 'Needs Improvement'
    }

    return (
        <div className="group-section slide-in-section">
            <div className="section-title">Plant Performance - YTD {new Date().getFullYear()}</div>

            <div className="dashboard-grid inner-grid">
                <div className="kpi-card slide-in-card">
                    <div className="kpi-title">Total YTD Yards</div>
                    <div className="kpi-value">{Math.round(metricsToShow.totalYardage).toLocaleString()}</div>
                </div>

                <div className="kpi-card slide-in-card">
                    <div className="kpi-title">Total YTD Hours</div>
                    <div className="kpi-value">{Math.round(metricsToShow.totalHours).toLocaleString()}</div>
                </div>

                <div className="kpi-card slide-in-card">
                    <div className="kpi-title">Data Integrity</div>
                    <div className="kpi-value" style={{color: (metricsToShow.dataIntegrity ?? 100) >= 90 ? 'var(--success)' : (metricsToShow.dataIntegrity ?? 100) >= 75 ? 'var(--warning)' : 'var(--danger)'}}>
                        {(metricsToShow.dataIntegrity ?? 100).toFixed(1)}%
                    </div>
                </div>

                <div className="kpi-card slide-in-card">
                    <div className="kpi-title">Avg Efficiency</div>
                    <div className="kpi-value" style={{color: getEfficiencyColor(metricsToShow.avgEfficiency)}}>
                        {metricsToShow.avgEfficiency.toFixed(1)}%
                    </div>
                </div>

                <div className="kpi-card slide-in-card">
                    <div className="kpi-title">Avg YPH</div>
                    <div className="kpi-value">{metricsToShow.avgYPH.toFixed(2)}</div>
                </div>

                <div className="kpi-card slide-in-card">
                    <div className="kpi-title">Avg Weekly Yards</div>
                    <div className="kpi-value">{Math.round(metricsToShow.avgYardageWeekly).toLocaleString()}</div>
                </div>

                <div className="kpi-card slide-in-card">
                    <div className="kpi-title">Avg Daily Yards</div>
                    <div className="kpi-value">{Math.round(metricsToShow.avgYardageDaily).toLocaleString()}</div>
                </div>

                <div className="kpi-card slide-in-card">
                    <div className="kpi-title">Avg Weekly Hours</div>
                    <div className="kpi-value">{Math.round(metricsToShow.avgWeeklyHours).toLocaleString()}</div>
                </div>

                <div className="kpi-card slide-in-card">
                    <div className="kpi-title">Avg Daily Hours</div>
                    <div className="kpi-value">{Math.round(metricsToShow.avgHoursDaily).toLocaleString()}</div>
                </div>

                <div className="kpi-card slide-in-card">
                    <div className="kpi-title">Avg Yards Lost</div>
                    <div className="kpi-value" style={{color: 'var(--warning)'}}>
                        {Math.round(metricsToShow.avgYardageLost).toLocaleString()}
                    </div>
                </div>
            </div>

            {plantMetrics.length > 0 && (
                <div className="training-table-wrapper">
                    <div className="training-table-header">
                        <div className="training-table-title">
                            Plant Breakdown ({plantMetrics.length})
                        </div>
                        <button type="button" className="training-toggle" aria-expanded={showPlantBreakdown}
                                onClick={() => setShowPlantBreakdown(!showPlantBreakdown)}
                                disabled={!plantMetrics.length}>
                            {showPlantBreakdown ? 'Collapse' : 'Expand'}
                        </button>
                    </div>
                    {showPlantBreakdown && (
                        <div className="training-table-content">
                            <table className="training-table">
                                <thead>
                                    <tr>
                                        <th style={{textAlign: 'left'}}>Plant</th>
                                        <th style={{textAlign: 'right'}}>Data Integrity</th>
                                        <th style={{textAlign: 'right'}}>Avg Efficiency</th>
                                        <th style={{textAlign: 'right'}}>Avg YPH</th>
                                        <th style={{textAlign: 'right'}}>Avg Yards/Week</th>
                                        <th style={{textAlign: 'right'}}>Avg Yards/Day</th>
                                        <th style={{textAlign: 'right'}}>Avg Hours/Week</th>
                                        <th style={{textAlign: 'right'}}>Avg Hours/Day</th>
                                        <th style={{textAlign: 'right'}}>Avg Yards Lost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plantMetrics.map((plant) => (
                                        <tr key={plant.plantCode}>
                                            <td>
                                                <div className="plant-code-display">{plant.plantCode}</div>
                                                <div className="plant-name-display">{plant.plantName}</div>
                                            </td>
                                            <td className="numeric-cell">
                                                <span style={{color: (plant.dataIntegrity ?? 100) >= 90 ? 'var(--success)' : (plant.dataIntegrity ?? 100) >= 75 ? 'var(--warning)' : 'var(--danger)'}}>
                                                    {(plant.dataIntegrity ?? 100).toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="numeric-cell">
                                                <span style={{color: getEfficiencyColor(plant.avgEfficiency)}}>
                                                    {plant.avgEfficiency.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="numeric-cell">
                                                {!isFinite(plant.avgYPH) || plant.avgYPH === 0 ? (
                                                    <span style={{
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '0.25rem',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '500',
                                                        backgroundColor: 'var(--danger)',
                                                        color: 'white',
                                                        whiteSpace: 'nowrap'
                                                    }}>No Operators</span>
                                                ) : (
                                                    plant.avgYPH.toFixed(2)
                                                )}
                                            </td>
                                            <td className="numeric-cell">{Math.round(plant.avgYardageWeekly).toLocaleString()}</td>
                                            <td className="numeric-cell">{Math.round(plant.avgYardageDaily).toLocaleString()}</td>
                                            <td className="numeric-cell">
                                                {plant.avgWeeklyHours === 0 ? (
                                                    <span style={{
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '0.25rem',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '500',
                                                        backgroundColor: 'var(--danger)',
                                                        color: 'white',
                                                        whiteSpace: 'nowrap'
                                                    }}>No Operators</span>
                                                ) : (
                                                    Math.round(plant.avgWeeklyHours).toLocaleString()
                                                )}
                                            </td>
                                            <td className="numeric-cell">
                                                {plant.avgHoursDaily === 0 ? (
                                                    <span style={{
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '0.25rem',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '500',
                                                        backgroundColor: 'var(--danger)',
                                                        color: 'white',
                                                        whiteSpace: 'nowrap'
                                                    }}>No Operators</span>
                                                ) : (
                                                    Math.round(plant.avgHoursDaily).toLocaleString()
                                                )}
                                            </td>
                                            <td className="numeric-cell warning-text">{Math.round(plant.avgYardageLost).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}