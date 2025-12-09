import React, {useEffect, useState} from 'react'
import './styles/Leaderboards.css'
import {supabase} from '../../services/DatabaseService'
import {MixerService} from '../../services/MixerService'
import {TractorService} from '../../services/TractorService'
import {TrailerService} from '../../services/TrailerService'
import {EquipmentService} from '../../services/EquipmentService'
import {OperatorService} from '../../services/OperatorService'
import {usePreferences} from '../../app/context/PreferencesContext'
import {RegionService} from '../../services/RegionService'
import LoadingScreen from '../../components/common/LoadingScreen'

export default function LeaderboardsView() {
    const {preferences} = usePreferences()
    const [loading, setLoading] = useState(true)
    const [plantMetrics, setPlantMetrics] = useState([])
    const [selectedCategory, setSelectedCategory] = useState('efficiency')

    const selectedRegionCode = preferences.selectedRegion?.code || null

    useEffect(() => {
        let mounted = true

        async function fetchLeaderboardData() {
            setLoading(true)
            try {
                if (!selectedRegionCode) {
                    if (mounted) {
                        setPlantMetrics([])
                        setLoading(false)
                    }
                    return
                }

                const selectedRegion = RegionService.getRegionByCode(selectedRegionCode)
                if (selectedRegion?.type !== 'Concrete') {
                    if (mounted) {
                        setPlantMetrics([])
                        setLoading(false)
                    }
                    return
                }

                const plantsInRegion = await RegionService.fetchRegionPlants(selectedRegionCode)
                
                if (!plantsInRegion || plantsInRegion.length === 0) {
                    if (mounted) {
                        setPlantMetrics([])
                        setLoading(false)
                    }
                    return
                }

                const plantCodesInRegion = plantsInRegion.map(p => p.plantCode)
                const plantNames = {}
                plantsInRegion.forEach(p => {
                    plantNames[p.plantCode] = p.plantName
                })

                const currentYear = new Date().getFullYear()
                const startOfYear = new Date(currentYear, 0, 1)
                const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59)

                const {data: profilesData, error: profilesError} = await supabase
                    .from('users_profiles')
                    .select('id, plant_code')
                    .in('plant_code', plantCodesInRegion)
                    .not('plant_code', 'is', null)

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
                    setPlantMetrics([])
                    setLoading(false)
                    return
                }

                const [mixersData, tractorsData, trailersData, equipmentData, operatorsData] = await Promise.all([
                    MixerService.getAllMixers().catch(() => []),
                    TractorService.getAllTractors().catch(() => []),
                    TrailerService.fetchTrailers().catch(() => []),
                    EquipmentService.getAllEquipments().catch(() => []),
                    OperatorService.getAllOperators().catch(() => [])
                ])

                const fleetCountsByPlant = {}
                Object.keys(userIdsByPlant).forEach(plantCode => {
                    const plantMixers = mixersData.filter(m => {
                        const plant = m.assignedPlant || m.assigned_plant
                        return plant === plantCode && m.status !== 'Retired'
                    })
                    const mixerCount = plantMixers.length

                    const plantTractors = tractorsData.filter(t => {
                        const plant = t.assignedPlant || t.assigned_plant
                        return plant === plantCode && t.status !== 'Retired'
                    })
                    const tractorCount = plantTractors.length

                    const trailerCount = trailersData.filter(t => {
                        const plant = t.assignedPlant || t.assigned_plant
                        return plant === plantCode && t.status !== 'Retired'
                    }).length

                    const equipmentCount = equipmentData.filter(e => {
                        const plant = e.assignedPlant || e.assigned_plant
                        return plant === plantCode && e.status !== 'Retired'
                    }).length

                    const mixerOperatorIds = new Set(
                        plantMixers
                            .filter(m => m.assignedOperator && m.assignedOperator !== '0')
                            .map(m => m.assignedOperator)
                    )

                    const tractorOperatorIds = new Set(
                        plantTractors
                            .filter(t => t.assignedOperator && t.assignedOperator !== '0')
                            .map(t => t.assignedOperator)
                    )

                    const mixerOperatorCount = operatorsData.filter(o => {
                        const plant = o.plantCode || o.plant_code
                        const opId = o.employeeId || o.employee_id
                        return plant === plantCode && o.status === 'Active' && mixerOperatorIds.has(opId)
                    }).length

                    const tractorOperatorCount = operatorsData.filter(o => {
                        const plant = o.plantCode || o.plant_code
                        const opId = o.employeeId || o.employee_id
                        return plant === plantCode && o.status === 'Active' && tractorOperatorIds.has(opId)
                    }).length

                    const totalOperators = operatorsData.filter(o => {
                        const plant = o.plantCode || o.plant_code
                        return plant === plantCode && o.status === 'Active'
                    }).length

                    const activeMixers = plantMixers.filter(m => m.status === 'Active')
                    const mixersWithCleanliness = activeMixers.filter(m => {
                        const rating = m.cleanlinessRating || m.cleanliness_rating
                        return rating !== null && rating !== undefined && rating > 0
                    })
                    
                    const avgMixerCleanliness = mixersWithCleanliness.length > 0
                        ? mixersWithCleanliness.reduce((sum, m) => {
                            const rating = m.cleanlinessRating || m.cleanliness_rating
                            return sum + (parseFloat(rating) || 0)
                        }, 0) / mixersWithCleanliness.length
                        : 0

                    fleetCountsByPlant[plantCode] = {
                        mixers: mixerCount,
                        tractors: tractorCount,
                        trailers: trailerCount,
                        equipment: equipmentCount,
                        mixerOperators: mixerOperatorCount,
                        tractorOperators: tractorOperatorCount,
                        operators: totalOperators,
                        totalAssets: mixerCount + tractorCount + trailerCount + equipmentCount,
                        avgFleetCleanliness: avgMixerCleanliness,
                        avgFleetCleanlinessForEfficiency: Math.floor(avgMixerCleanliness)
                    }
                })


                const calculateMetrics = (reportsList, avgFleetCleanlinessActual = 0, mixerOperatorCount = 1, plantCode = '', plantName = '') => {
                    if (reportsList.length === 0) {
                        return null
                    }

                    const reportsByWeek = new Map()
                    const allReportDates = []

                    reportsList.forEach(report => {
                        const weekStr = report.week.split('T')[0]
                        const weekDate = new Date(weekStr + 'T12:00:00')

                        if (weekDate >= currentWeekStart) {
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

                    if (allReportDates.length === 0) return null

                    allReportDates.sort()
                    const firstDate = allReportDates[0]

                    const allWeeks = []
                    let currentDate = new Date(firstDate + 'T12:00:00')
                    const lastSunday = new Date(currentWeekStart)
                    lastSunday.setDate(currentWeekStart.getDate() - 7)

                    while (currentDate < currentWeekStart) {
                        const year = currentDate.getFullYear()
                        const month = String(currentDate.getMonth() + 1).padStart(2, '0')
                        const day = String(currentDate.getDate()).padStart(2, '0')
                        const weekStr = `${year}-${month}-${day}`

                        const report = reportsByWeek.get(weekStr)

                        if (report) {
                            const yardage = parseFloat(report.data?.yardage || 0)
                            const hours = parseFloat(report.data?.total_hours || 0)
                            const lost = parseFloat(report.data?.total_yards_lost || 0)

                            allWeeks.push({
                                yardage,
                                hours,
                                lost,
                                isMissing: false,
                                isNotSubmitted: !report.completed
                            })
                        } else if (currentDate >= new Date(firstDate + 'T12:00:00') && currentDate < currentWeekStart) {
                            allWeeks.push({
                                yardage: 0,
                                hours: 0,
                                lost: 0,
                                isMissing: true,
                                isNotSubmitted: false
                            })
                        }

                        currentDate.setDate(currentDate.getDate() + 7)
                    }

                    const submittedWeeks = allWeeks.filter(w => !w.isMissing && !w.isNotSubmitted)
                    const totalExpectedReports = allWeeks.length
                    
                    const missingReports = allWeeks.filter(w => w.isMissing)
                    const incompleteReports = allWeeks.filter(w => w.isNotSubmitted)
                    const missingCount = missingReports.length
                    const incompleteCount = incompleteReports.length

                    if (submittedWeeks.length === 0) return null

                    const totals = submittedWeeks.reduce((acc, week) => ({
                        totalYards: acc.totalYards + week.yardage,
                        totalHours: acc.totalHours + week.hours,
                        totalLost: acc.totalLost + week.lost,
                        reportCount: acc.reportCount + 1
                    }), {totalYards: 0, totalHours: 0, totalLost: 0, reportCount: 0})

                    const weeksWithHours = submittedWeeks.filter(w => w.hours > 0)
                    const yardsWithHours = weeksWithHours.reduce((sum, w) => sum + w.yardage, 0)
                    const hoursTotal = weeksWithHours.reduce((sum, w) => sum + w.hours, 0)
                    const avgYPH = hoursTotal > 0 ? yardsWithHours / hoursTotal : 0

                    const avgYardageWeekly = totals.reportCount > 0 ? totals.totalYards / totals.reportCount : 0
                    const avgYardageDaily = avgYardageWeekly / 6
                    const avgWeeklyHours = totals.reportCount > 0 ? totals.totalHours / totals.reportCount : 0
                    const avgHoursDaily = avgWeeklyHours / 6
                    const avgYardageLost = totals.reportCount > 0 ? totals.totalLost / totals.reportCount : 0
                    
                    const yardsPerLoad = 10
                    const avgLoadsWeekly = totals.reportCount > 0 ? totals.totalYards / yardsPerLoad / totals.reportCount : 0
                    const avgLoadsDaily = avgLoadsWeekly / 6

                    const targetYPH = 3.0
                    const yphEfficiency = avgYPH > 0 ? Math.min((avgYPH / targetYPH) * 100, 100) : 0
                    
                    const loadsPerOperatorPerDay = mixerOperatorCount > 0 ? avgLoadsDaily / mixerOperatorCount : 0
                    const targetLoadsPerOperatorPerDay = 3
                    const loadsEfficiency = Math.min((loadsPerOperatorPerDay / targetLoadsPerOperatorPerDay) * 100, 100)
                    
                    let cleanlinessModifier = 0
                    if (avgFleetCleanlinessActual >= 5) {
                        cleanlinessModifier = 5
                    } else if (avgFleetCleanlinessActual >= 4) {
                        cleanlinessModifier = 2.5
                    } else if (avgFleetCleanlinessActual >= 3) {
                        cleanlinessModifier = -2.5
                    } else if (avgFleetCleanlinessActual > 0) {
                        cleanlinessModifier = -5
                    }
                    
                    const baseEfficiency = (yphEfficiency * 0.9) + (loadsEfficiency * 0.1)
                    
                    const reportDeduction = (missingCount + incompleteCount)
                    
                    const avgEfficiency = avgYPH > 0 ? Math.min(Math.max(baseEfficiency + cleanlinessModifier - reportDeduction, 0), 100) : 0

                    const dataIntegrity = totalExpectedReports > 0 ? (totals.reportCount / totalExpectedReports * 100) : 100

                    return {
                        avgYPH,
                        avgYardageDaily,
                        avgYardageWeekly,
                        avgYardageLost,
                        avgWeeklyHours,
                        avgHoursDaily,
                        avgLoadsDaily,
                        avgLoadsWeekly,
                        avgEfficiency,
                        loadsEfficiency,
                        reportCount: totals.reportCount,
                        totalYardage: totals.totalYards,
                        totalHours: totals.totalHours,
                        totalLost: totals.totalLost,
                        dataIntegrity
                    }
                }

                const plantMetricsArray = []

                Object.keys(userIdsByPlant).forEach(plantCode => {
                    const plantReports = filteredReports.filter(r => userIdsByPlant[plantCode].includes(r.user_id))
                    const fleetData = fleetCountsByPlant[plantCode] || {
                        mixers: 0,
                        tractors: 0,
                        trailers: 0,
                        equipment: 0,
                        operators: 0,
                        totalAssets: 0,
                        avgFleetCleanliness: 0,
                        avgFleetCleanlinessForEfficiency: 0
                    }
                    
                    const avgCleanlinessActual = fleetData.avgFleetCleanliness || 0
                    const mixerOperatorCount = fleetData.mixerOperators || 1
                    
                    const metrics = calculateMetrics(plantReports, avgCleanlinessActual, mixerOperatorCount, plantCode, plantNames[plantCode] || plantCode)

                    if (metrics) {
                        plantMetricsArray.push({
                            plantCode,
                            plantName: plantNames[plantCode] || plantCode,
                            ...metrics,
                            ...fleetData
                        })
                    }
                })

                setPlantMetrics(plantMetricsArray)

            } catch (err) {
                console.error('Error fetching leaderboard data:', err)
                if (mounted) {
                    setPlantMetrics([])
                }
            } finally {
                if (mounted) setLoading(false)
            }
        }

        fetchLeaderboardData()

        return () => {
            mounted = false
        }
    }, [selectedRegionCode])

    const getEfficiencyColor = (efficiency) => {
        if (efficiency >= 90) return 'var(--success)'
        if (efficiency >= 80) return 'var(--warning)'
        return 'var(--danger)'
    }

    const getCategoryData = (category) => {
        switch (category) {
            case 'efficiency':
                return plantMetrics
                    .filter(p => p.avgEfficiency > 0 && p.avgWeeklyHours > 0)
                    .sort((a, b) => b.avgEfficiency - a.avgEfficiency)
            case 'yph':
                return plantMetrics
                    .filter(p => isFinite(p.avgYPH) && p.avgYPH > 0)
                    .sort((a, b) => b.avgYPH - a.avgYPH)
            case 'production':
                return plantMetrics
                    .filter(p => p.totalYardage > 0)
                    .sort((a, b) => b.totalYardage - a.totalYardage)
            case 'weekly-yardage':
                return plantMetrics
                    .filter(p => p.avgYardageWeekly > 0)
                    .sort((a, b) => b.avgYardageWeekly - a.avgYardageWeekly)
            case 'daily-yardage':
                return plantMetrics
                    .filter(p => p.avgYardageDaily > 0)
                    .sort((a, b) => b.avgYardageDaily - a.avgYardageDaily)
            case 'weekly-hours':
                return plantMetrics
                    .filter(p => p.avgWeeklyHours > 0)
                    .sort((a, b) => a.avgWeeklyHours - b.avgWeeklyHours)
            case 'daily-hours':
                return plantMetrics
                    .filter(p => p.avgHoursDaily > 0)
                    .sort((a, b) => a.avgHoursDaily - b.avgHoursDaily)
            default:
                return []
        }
    }

    const renderValue = (plant, category) => {
        switch (category) {
            case 'efficiency':
                return (
                    <span style={{color: getEfficiencyColor(plant.avgEfficiency)}}>
                        {plant.avgEfficiency.toFixed(1)}%
                    </span>
                )
            case 'yph':
                return plant.avgYPH.toFixed(2)
            case 'production':
                return Math.round(plant.totalYardage).toLocaleString()
            case 'weekly-yardage':
                return Math.round(plant.avgYardageWeekly).toLocaleString()
            case 'daily-yardage':
                return Math.round(plant.avgYardageDaily).toLocaleString()
            case 'weekly-hours':
                return Math.round(plant.avgWeeklyHours).toLocaleString()
            case 'daily-hours':
                return Math.round(plant.avgHoursDaily).toLocaleString()
            default:
                return '--'
        }
    }

    const getCategoryTitle = (category) => {
        switch (category) {
            case 'efficiency':
                return 'Overall Efficiency'
            case 'yph':
                return 'Yards Per Hour'
            case 'production':
                return 'Total Production'
            case 'weekly-yardage':
                return 'Weekly Yardage'
            case 'daily-yardage':
                return 'Daily Yardage'
            case 'weekly-hours':
                return 'Weekly Hours'
            case 'daily-hours':
                return 'Daily Hours'
            default:
                return 'Leaderboard'
        }
    }

    const categoryData = getCategoryData(selectedCategory)

    if (loading) {
        return <LoadingScreen message="Loading leaderboard data..." fullPage={true} />
    }

    return (
        <div className="leaderboards-view">
            <div className="leaderboards-header">
                <div className="leaderboards-header-inner">
                    <div className="leaderboards-title-row">
                        <h1 className="leaderboards-title">Performance Leaderboards</h1>
                        <span className="leaderboards-subtitle">YTD {new Date().getFullYear()}</span>
                    </div>
                    <div className="leaderboards-categories">
                        {[
                            {id: 'efficiency', label: 'Efficiency'},
                            {id: 'yph', label: 'YPH'},
                            {id: 'production', label: 'Total Yards'},
                            {id: 'weekly-yardage', label: 'Weekly Yards'},
                            {id: 'daily-yardage', label: 'Daily Yards'},
                            {id: 'weekly-hours', label: 'Weekly Hours'},
                            {id: 'daily-hours', label: 'Daily Hours'}
                        ].map(cat => (
                            <button
                                key={cat.id}
                                className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat.id)}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="leaderboards-content">
                <div className="leaderboard-main">
                    <div className="leaderboard-header">
                        <h2>{getCategoryTitle(selectedCategory)}</h2>
                        <span className="results-count">{categoryData.length} plants</span>
                    </div>

                    {selectedCategory === 'efficiency' && (
                        <div className="efficiency-calculation-info">
                            <div className="info-header">
                                <i className="fas fa-info-circle"></i>
                                <span>How Efficiency is Calculated</span>
                            </div>
                            <div className="info-content">
                                <p>Efficiency is calculated using multiple factors:</p>
                                <ul>
                                    <li><strong>Yards Per Hour (90%):</strong> Primary metric - measures productivity against target of 3.0 YPH</li>
                                    <li><strong>Loads Efficiency (10%):</strong> Measures load volume per mixer operator against target of 3 loads/operator/day.</li>
                                    <li><strong>Fleet Cleanliness Modifier:</strong>
                                        <ul>
                                            <li>5 stars: +5% bonus</li>
                                            <li>4 stars: +2.5% bonus</li>
                                            <li>3 stars: -2.5% penalty</li>
                                            <li>&lt;3 stars: -5% penalty</li>
                                        </ul>
                                    </li>
                                    <li><strong>Report Completion Penalty:</strong> -1% for each missing or incomplete report</li>
                                </ul>
                                <p className="info-note">Formula: (YPH Efficiency × 90%) + (Loads Efficiency × 10%) + Cleanliness Modifier - Report Penalty</p>
                                <p className="info-note">Higher efficiency indicates better plant performance across production, quality, fleet cleanliness, and reporting compliance.</p>
                            </div>
                        </div>
                    )}

                    {categoryData.length === 0 ? (
                        <div className="leaderboard-empty">
                            <i className="fas fa-inbox"></i>
                            <p>No data available</p>
                            <span>Check back later as more reports are submitted</span>
                        </div>
                    ) : (
                        <div className="leaderboard-list">
                            {categoryData.map((plant, index) => {
                                const rank = index + 1
                                const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : ''

                                return (
                                    <div key={plant.plantCode} className={`leaderboard-item ${rankClass}`}>
                                        <div className="rank-badge">
                                            {rank <= 3 ? (
                                                <i className={`fas ${rank === 1 ? 'fa-trophy' : rank === 2 ? 'fa-medal' : 'fa-award'}`}></i>
                                            ) : (
                                                <span>{rank}</span>
                                            )}
                                        </div>

                                        <div className="plant-info">
                                            <div className="plant-code">Plant {plant.plantCode}</div>
                                            <div className="plant-name">{plant.plantName}</div>
                                        </div>

                                        <div className="metric-value">
                                            {renderValue(plant, selectedCategory)}
                                        </div>

                                        <div className="plant-stats">
                                            {selectedCategory === 'efficiency' ? (
                                                <>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Avg. YPH</span>
                                                        <span className="stat-value">{plant.avgYPH.toFixed(2)}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Load Efficiency</span>
                                                        <span className="stat-value">{plant.loadsEfficiency.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Avg. Weekly Yards</span>
                                                        <span className="stat-value">{Math.round(plant.avgYardageWeekly).toLocaleString()}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Avg. Daily Yards</span>
                                                        <span className="stat-value">{Math.round(plant.avgYardageDaily).toLocaleString()}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Avg. Weekly Hours</span>
                                                        <span className="stat-value">{Math.round(plant.avgWeeklyHours).toLocaleString()}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Avg. Daily Hours</span>
                                                        <span className="stat-value">{Math.round(plant.avgHoursDaily).toLocaleString()}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Avg. Cleanliness</span>
                                                        <span className="stat-value">{plant.avgFleetCleanliness > 0 ? plant.avgFleetCleanliness.toFixed(1) : 'N/A'}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Mixers</span>
                                                        <span className="stat-value">{plant.mixers || 0}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Mixer Operators</span>
                                                        <span className="stat-value">{plant.mixerOperators || 0}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Tractors</span>
                                                        <span className="stat-value">{plant.tractors || 0}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Tractor Operators</span>
                                                        <span className="stat-value">{plant.tractorOperators || 0}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Trailers</span>
                                                        <span className="stat-value">{plant.trailers || 0}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Equipment</span>
                                                        <span className="stat-value">{plant.equipment || 0}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}