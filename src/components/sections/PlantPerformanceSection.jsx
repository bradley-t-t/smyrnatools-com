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
                console.log('=== PlantPerformanceSection Debug ===')
                console.log('dashboardPlant:', dashboardPlant, 'type:', typeof dashboardPlant)
                console.log('regionPlants:', regionPlants?.length || 0)
                console.log('allPlants:', allPlants?.length || 0)
                
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

                console.log('Plant codes found:', plantCodes)

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
                
                console.log('User profiles found:', profilesData?.length || 0)

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

                console.log('Querying reports for', allUserIds.length, 'users')
                console.log('Date range:', startOfYear.toISOString(), 'to', endOfYear.toISOString())

                const {data: reports, error: reportsError} = await supabase
                    .from('reports')
                    .select('*')
                    .eq('report_name', 'plant_manager')
                    .eq('completed', true)
                    .in('user_id', allUserIds)
                    .gte('week', startOfYear.toISOString())
                    .lte('week', endOfYear.toISOString())

                if (reportsError) throw reportsError
                
                console.log('Reports found:', reports?.length || 0)
                if (reports && reports.length > 0) {
                    console.log('Sample report:', reports[0])
                }

                if (!mounted) return

                if (!reports || reports.length === 0) {
                    setOverallMetrics(null)
                    setPlantMetrics([])
                    setLoading(false)
                    return
                }

                const calculateMetrics = (reportsList) => {
                    let totalYardage = 0
                    let totalHours = 0
                    let totalLost = 0
                    let validReports = 0

                    reportsList.forEach(report => {
                        const yardage = parseFloat(report.data?.yardage || 0)
                        const hours = parseFloat(report.data?.total_hours || 0)
                        const lost = parseFloat(report.data?.total_yards_lost || 0)

                        if (yardage > 0 && hours > 0) {
                            totalYardage += yardage
                            totalHours += hours
                            totalLost += lost
                            validReports++
                        }
                    })

                    if (validReports === 0) return null

                    const avgYPH = totalYardage / totalHours
                    const avgYardageWeekly = totalYardage / validReports
                    const avgYardageDaily = avgYardageWeekly / 7
                    const avgYardageLost = totalLost / validReports
                    const avgWeeklyHours = totalHours / validReports
                    const avgHoursDaily = avgWeeklyHours / 7
                    const avgHoursOverall = totalHours / validReports
                    const avgYardageOverall = totalYardage / validReports

                    const targetYPH = 4.0
                    const yardageEfficiency = ((totalYardage - totalLost) / totalYardage * 100)
                    const yphEfficiency = Math.min((avgYPH / targetYPH) * 100, 100)
                    const avgEfficiency = (yphEfficiency * 0.9) + (yardageEfficiency * 0.1)

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
                        totalLost
                    }
                }

                const overall = calculateMetrics(reports)
                setOverallMetrics(overall)

                if (!dashboardPlant && plantCodes.length > 1) {
                    const plantMetricsArray = []
                    
                    Object.keys(userIdsByPlant).forEach(plantCode => {
                        const plantReports = reports.filter(r => userIdsByPlant[plantCode].includes(r.user_id))
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
                    setPlantMetrics(plantMetricsArray)
                } else {
                    setPlantMetrics([])
                }

            } catch (err) {
                if (mounted) {
                    setOverallMetrics(null)
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

    if (!overallMetrics) {
        if (loading) {
            return null
        }
        return (
            <div className="group-section slide-in-section">
                <div className="section-title">Plant Performance - YTD {new Date().getFullYear()}</div>
                <div className="performance-empty">
                    <i className="fas fa-chart-line"></i>
                    <p>No plant manager reports found for the selected filter</p>
                    <span className="performance-empty-hint">Reports will appear here once plant managers submit weekly reports</span>
                </div>
            </div>
        )
    }

    if (overallMetrics.reportCount === 0) {
        return (
            <div className="group-section slide-in-section">
                <div className="section-title">Plant Performance - YTD {new Date().getFullYear()}</div>
                <div className="performance-empty">
                    <i className="fas fa-chart-line"></i>
                    <p>No plant manager reports found for the selected filter</p>
                    <span className="performance-empty-hint">Reports will appear here once plant managers submit weekly reports</span>
                </div>
            </div>
        )
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
                    <div className="kpi-title">Avg Efficiency</div>
                    <div className="kpi-value" style={{color: getEfficiencyColor(overallMetrics.avgEfficiency)}}>
                        {overallMetrics.avgEfficiency.toFixed(1)}%
                    </div>
                </div>

                <div className="kpi-card slide-in-card">
                    <div className="kpi-title">Avg YPH</div>
                    <div className="kpi-value">{overallMetrics.avgYPH.toFixed(2)}</div>
                </div>

                <div className="kpi-card slide-in-card">
                    <div className="kpi-title">Avg Weekly Yards</div>
                    <div className="kpi-value">{Math.round(overallMetrics.avgYardageWeekly).toLocaleString()}</div>
                </div>

                <div className="kpi-card slide-in-card">
                    <div className="kpi-title">Avg Daily Yards</div>
                    <div className="kpi-value">{Math.round(overallMetrics.avgYardageDaily).toLocaleString()}</div>
                </div>

                <div className="kpi-card slide-in-card">
                    <div className="kpi-title">Avg Weekly Hours</div>
                    <div className="kpi-value">{Math.round(overallMetrics.avgWeeklyHours).toLocaleString()}</div>
                </div>

                <div className="kpi-card slide-in-card">
                    <div className="kpi-title">Avg Daily Hours</div>
                    <div className="kpi-value">{Math.round(overallMetrics.avgHoursDaily).toLocaleString()}</div>
                </div>

                <div className="kpi-card slide-in-card">
                    <div className="kpi-title">Avg Yards Lost</div>
                    <div className="kpi-value" style={{color: 'var(--warning)'}}>
                        {Math.round(overallMetrics.avgYardageLost).toLocaleString()}
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
                                        <th>Plant</th>
                                        <th>Avg Efficiency</th>
                                        <th>Avg YPH</th>
                                        <th>Avg Yards/Week</th>
                                        <th>Avg Yards/Day</th>
                                        <th>Avg Yards Lost</th>
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
                                                <span style={{color: getEfficiencyColor(plant.avgEfficiency)}}>
                                                    {plant.avgEfficiency.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="numeric-cell">{plant.avgYPH.toFixed(2)}</td>
                                            <td className="numeric-cell">{Math.round(plant.avgYardageWeekly).toLocaleString()}</td>
                                            <td className="numeric-cell">{Math.round(plant.avgYardageDaily).toLocaleString()}</td>
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
