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
import LeaderboardsUtility from '../../utils/LeaderboardsUtility'
import VideoBackground from '../../components/common/VideoBackground'

export default function LeaderboardsView() {
    const {preferences} = usePreferences()
    const [loading, setLoading] = useState(true)
    const [plantMetrics, setPlantMetrics] = useState([])
    const [selectedCategory, setSelectedCategory] = useState('efficiency')
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [helpDetailsModal, setHelpDetailsModal] = useState({isOpen: false, plant: null, details: null})
    const [hoursAdjustmentsData, setHoursAdjustmentsData] = useState({})

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

                const [{data: reports, error: reportsError}, {data: safetyReports}] = await Promise.all([
                    supabase
                        .from('reports')
                        .select('*')
                        .eq('report_name', 'plant_manager')
                        .in('user_id', allUserIds)
                        .gte('week', startOfYear.toISOString())
                        .lte('week', endOfYear.toISOString()),
                    supabase
                        .from('reports')
                        .select('*')
                        .eq('report_name', 'safety_manager')
                        .gte('week', startOfYear.toISOString())
                        .lte('week', endOfYear.toISOString())
                ])

                if (reportsError) throw reportsError

                if (!mounted) return

                const hoursAdjustmentsByPlant = LeaderboardsUtility.calculateHoursAdjustments(reports, profilesData, plantCodesInRegion)
                setHoursAdjustmentsData(hoursAdjustmentsByPlant)

                const safetyByPlant = LeaderboardsUtility.calculateSafetyIncidents(safetyReports || [], plantCodesInRegion)

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

                const fleetCountsByPlant = LeaderboardsUtility.calculateFleetCounts(
                    plantCodesInRegion,
                    mixersData,
                    tractorsData,
                    trailersData,
                    equipmentData,
                    operatorsData
                )


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
                    const hoursAdjustments = hoursAdjustmentsByPlant[plantCode] || null
                    const safetyIncidents = safetyByPlant[plantCode] || null

                    const metrics = LeaderboardsUtility.calculateMetrics(
                        plantReports,
                        avgCleanlinessActual,
                        mixerOperatorCount,
                        currentWeekStart,
                        hoursAdjustments,
                        safetyIncidents
                    )

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

    const categoryData = LeaderboardsUtility.getCategoryData(plantMetrics, selectedCategory)

    const renderValue = (plant, category) => {
        switch (category) {
            case 'efficiency':
                return (
                    <span style={{color: LeaderboardsUtility.getEfficiencyColor(plant.avgEfficiency)}}>
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
            case 'monthly-yardage':
                return Math.round(plant.avgMonthlyYards).toLocaleString()
            case 'weekly-hours':
                return Math.round(plant.avgWeeklyHours).toLocaleString()
            case 'daily-hours':
                return Math.round(plant.avgHoursDaily).toLocaleString()
            case 'monthly-hours':
                return Math.round(plant.avgMonthlyHours).toLocaleString()
            case 'help-given':
                return `${Math.round(plant.helpGiven)} hours`
            case 'help-received':
                return `${Math.round(plant.helpReceived)} hours`
            default:
                return '--'
        }
    }

    const renderSkeletonItems = () => {
        return Array.from({length: 8}).map((_, index) => (
            <div key={`skeleton-${index}`} className="leaderboard-item skeleton-card">
                <div className="rank-badge">
                    <div className="skeleton-line" style={{width: '24px', height: '24px', borderRadius: '50%'}}/>
                </div>
                <div className="plant-info">
                    <div className="skeleton-line w40" style={{marginBottom: '6px'}}/>
                    <div className="skeleton-line w60"/>
                </div>
                <div className="metric-value">
                    <div className="skeleton-line" style={{width: '80px', height: '28px'}}/>
                </div>
                <div className="plant-stats">
                    <div className="skeleton-line w60" style={{marginBottom: '4px'}}/>
                    <div className="skeleton-line w40"/>
                </div>
            </div>
        ))
    }

    return (
        <div className="leaderboards-view">
            <div className="leaderboards-header">
                <div className="leaderboards-header-inner">
                    <div className="leaderboards-title-row">
                        <h1 className="leaderboards-title">Performance Leaderboards</h1>
                        <div className="leaderboards-year-selector">
                            <span className="year-label">YTD</span>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="year-select"
                            >
                                {Array.from({length: new Date().getFullYear() - 2024}, (_, i) => 2025 + i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="leaderboards-categories">
                        {[
                            {id: 'efficiency', label: 'Efficiency'},
                            {id: 'yph', label: 'YPH'},
                            {id: 'production', label: 'Total Yards'},
                            {id: 'monthly-yardage', label: 'Monthly Yards'},
                            {id: 'weekly-yardage', label: 'Weekly Yards'},
                            {id: 'daily-yardage', label: 'Daily Yards'},
                            {id: 'monthly-hours', label: 'Monthly Hours'},
                            {id: 'weekly-hours', label: 'Weekly Hours'},
                            {id: 'daily-hours', label: 'Daily Hours'},
                            {id: 'help-given', label: 'Help Given'},
                            {id: 'help-received', label: 'Help Received'}
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
                        <h2>{loading ? <div className="skeleton-line w40"
                                            style={{height: '24px'}}/> : LeaderboardsUtility.getCategoryTitle(selectedCategory)}</h2>
                        <span className="results-count">{loading ? <div className="skeleton-line" style={{
                            width: '60px',
                            height: '14px'
                        }}/> : `${categoryData.length} plants`}</span>
                    </div>

                    {selectedCategory === 'efficiency' && !loading && (
                        <div className="efficiency-calculation-info">
                            <div className="info-header">
                                <i className="fas fa-calculator"></i>
                                <span>How Efficiency is Calculated</span>
                            </div>
                            <div className="info-grid">
                                <div className="info-card info-card-primary">
                                    <div className="info-card-header">
                                        <i className="fas fa-tachometer-alt"></i>
                                        <span>Yards Per Hour</span>
                                        <span className="weight-badge">90%</span>
                                    </div>
                                    <p>Primary productivity metric measured against target of 3.0 YPH</p>
                                </div>
                                <div className="info-card">
                                    <div className="info-card-header">
                                        <i className="fas fa-truck-loading"></i>
                                        <span>Loads Efficiency</span>
                                        <span className="weight-badge">10%</span>
                                    </div>
                                    <p>Load volume per mixer operator against target of 3 loads/operator/day</p>
                                </div>
                                <div className="info-card info-card-modifiers">
                                    <div className="info-card-header">
                                        <i className="fas fa-broom"></i>
                                        <span>Fleet Cleanliness</span>
                                        <span className="weight-badge modifier">Modifier</span>
                                    </div>
                                    <div className="modifier-grid">
                                        <div className="modifier-item modifier-bonus">
                                            <span className="modifier-stars">5 stars</span>
                                            <span className="modifier-value">+10%</span>
                                        </div>
                                        <div className="modifier-item modifier-bonus">
                                            <span className="modifier-stars">4 stars</span>
                                            <span className="modifier-value">+5%</span>
                                        </div>
                                        <div className="modifier-item modifier-penalty">
                                            <span className="modifier-stars">3 stars</span>
                                            <span className="modifier-value">-5%</span>
                                        </div>
                                        <div className="modifier-item modifier-penalty">
                                            <span className="modifier-stars">&lt;3 stars</span>
                                            <span className="modifier-value">-10%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="info-card info-card-penalty">
                                    <div className="info-card-header">
                                        <i className="fas fa-file-alt"></i>
                                        <span>Report Completion</span>
                                        <span className="weight-badge penalty">Penalty</span>
                                    </div>
                                    <p>-10% for each missing or incomplete report</p>
                                </div>
                                <div className="info-card info-card-penalty">
                                    <div className="info-card-header">
                                        <i className="fas fa-exclamation-triangle"></i>
                                        <span>Safety Incidents</span>
                                        <span className="weight-badge penalty">Penalty</span>
                                    </div>
                                    <p>-1% for each impactful safety incident</p>
                                </div>
                            </div>
                            <div className="info-formula">
                                <div className="formula-label">Formula</div>
                                <div className="formula-content">
                                    <span className="formula-part">(YPH × 90%)</span>
                                    <span className="formula-operator">+</span>
                                    <span className="formula-part">(Loads × 10%)</span>
                                    <span className="formula-operator">+</span>
                                    <span className="formula-part">Cleanliness</span>
                                    <span className="formula-operator">+</span>
                                    <span className="formula-part">Help Impact</span>
                                    <span className="formula-operator">-</span>
                                    <span className="formula-part">Report Penalty</span>
                                    <span className="formula-operator">-</span>
                                    <span className="formula-part">Safety Penalty</span>
                                </div>
                            </div>
                            <div className="info-footer">
                                <i className="fas fa-lightbulb"></i>
                                <span>Higher efficiency indicates better plant performance across production, quality, fleet cleanliness, and reporting compliance. Help Impact: Hours sent to help other plants are subtracted from your total hours (benefiting your YPH), while hours received from other plants are added to your total hours (reducing your YPH). This ensures fair comparison across plants with different collaboration patterns.</span>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="leaderboard-list">
                            {renderSkeletonItems()}
                        </div>
                    ) : categoryData.length === 0 ? (
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
                                                        <span className="stat-value yph-dual-value"
                                                              title="Left: YPH before help adjustment / Right: YPH after help adjustment">
                                                            <em>{(plant.rawYPH ?? plant.avgYPH).toFixed(2)}</em>
                                                            <span>/</span>
                                                            <strong>{plant.avgYPH.toFixed(2)}</strong>
                                                        </span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Load Efficiency</span>
                                                        <span
                                                            className="stat-value">{plant.loadsEfficiency.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Avg. Weekly Yards</span>
                                                        <span
                                                            className="stat-value">{Math.round(plant.avgYardageWeekly).toLocaleString()}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Avg. Daily Yards</span>
                                                        <span
                                                            className="stat-value">{Math.round(plant.avgYardageDaily).toLocaleString()}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Avg. Monthly Yards</span>
                                                        <span
                                                            className="stat-value">{Math.round(plant.avgMonthlyYards).toLocaleString()}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Avg. Weekly Hours</span>
                                                        <span
                                                            className="stat-value">{Math.round(plant.avgWeeklyHours).toLocaleString()}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Avg. Daily Hours</span>
                                                        <span
                                                            className="stat-value">{Math.round(plant.avgHoursDaily).toLocaleString()}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Avg. Monthly Hours</span>
                                                        <span
                                                            className="stat-value">{Math.round(plant.avgMonthlyHours).toLocaleString()}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Avg. Cleanliness</span>
                                                        <span
                                                            className="stat-value">{plant.avgFleetCleanliness > 0 ? plant.avgFleetCleanliness.toFixed(1) : 'N/A'}</span>
                                                    </div>
                                                    <div
                                                        className="stat-item stat-item-clickable"
                                                        onClick={() => {
                                                            const details = hoursAdjustmentsData[plant.plantCode]
                                                            if (details && (details.hoursAdded > 0 || details.hoursSubtracted > 0)) {
                                                                setHelpDetailsModal({isOpen: true, plant, details})
                                                            }
                                                        }}
                                                    >
                                                        <span className="stat-label">
                                                            Help Net Balance
                                                            {(plant.helpGiven > 0 || plant.helpReceived > 0) &&
                                                                <i className="fas fa-info-circle help-info-icon"></i>}
                                                        </span>
                                                        <span className="stat-value" style={{
                                                            color: plant.helpGiven > plant.helpReceived ? 'var(--success)' :
                                                                plant.helpGiven < plant.helpReceived ? 'var(--danger)' :
                                                                    'inherit'
                                                        }}>
                                                            {plant.helpGiven > 0 || plant.helpReceived > 0
                                                                ? `${plant.helpGiven > plant.helpReceived ? '+' : ''}${Math.round(plant.helpGiven - plant.helpReceived)}h`
                                                                : 'N/A'
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Impactful Incidents</span>
                                                        <span className="stat-value" style={{
                                                            color: (plant.impactfulIncidents || 0) > 0 ? 'var(--danger)' : 'var(--success)'
                                                        }}>
                                                            {plant.impactfulIncidents || 0}
                                                        </span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Missing Reports</span>
                                                        <span className="stat-value" style={{
                                                            color: (plant.missingReports || 0) + (plant.incompleteReports || 0) > 0 ? 'var(--danger)' : 'var(--success)'
                                                        }}>
                                                            {(plant.missingReports || 0) + (plant.incompleteReports || 0)}
                                                        </span>
                                                    </div>
                                                </>
                                            ) : selectedCategory === 'help-given' || selectedCategory === 'help-received' ? (
                                                <>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Help Given</span>
                                                        <span
                                                            className="stat-value">{Math.round(plant.helpGiven)} hours</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Help Received</span>
                                                        <span
                                                            className="stat-value">{Math.round(plant.helpReceived)} hours</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Net Balance</span>
                                                        <span className="stat-value" style={{
                                                            color: plant.helpGiven > plant.helpReceived ? 'var(--success)' :
                                                                plant.helpGiven < plant.helpReceived ? 'var(--danger)' :
                                                                    'inherit'
                                                        }}>
                                                            {plant.helpGiven > plant.helpReceived ? '+' : ''}{Math.round(plant.helpGiven - plant.helpReceived)} hours
                                                        </span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Avg. YPH</span>
                                                        <span className="stat-value">{plant.avgYPH.toFixed(2)}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Total Yards</span>
                                                        <span
                                                            className="stat-value">{Math.round(plant.totalYardage).toLocaleString()}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Efficiency</span>
                                                        <span className="stat-value"
                                                              style={{color: LeaderboardsUtility.getEfficiencyColor(plant.avgEfficiency)}}>
                                                            {plant.avgEfficiency.toFixed(1)}%
                                                        </span>
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
                                                        <span
                                                            className="stat-value">{plant.tractorOperators || 0}</span>
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

            {helpDetailsModal.isOpen && helpDetailsModal.details && (
                <div className="help-details-modal-overlay"
                     onClick={() => setHelpDetailsModal({isOpen: false, plant: null, details: null})}>
                    <div className="help-details-modal" onClick={e => e.stopPropagation()}>
                        <div className="help-details-modal-header">
                            <h3>
                                <i className="fas fa-exchange-alt"></i>
                                Help Details - Plant {helpDetailsModal.plant?.plantCode}
                            </h3>
                            <button className="close-btn"
                                    onClick={() => setHelpDetailsModal({isOpen: false, plant: null, details: null})}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className="help-details-modal-summary">
                            <div className="summary-item summary-given">
                                <span className="summary-label">Total Help Given</span>
                                <span
                                    className="summary-value">{Math.round(helpDetailsModal.details.hoursSubtracted)} hours</span>
                            </div>
                            <div className="summary-item summary-received">
                                <span className="summary-label">Total Help Received</span>
                                <span
                                    className="summary-value">{Math.round(helpDetailsModal.details.hoursAdded)} hours</span>
                            </div>
                            <div
                                className={`summary-item summary-net ${helpDetailsModal.details.hoursSubtracted > helpDetailsModal.details.hoursAdded ? 'net-positive' : helpDetailsModal.details.hoursSubtracted < helpDetailsModal.details.hoursAdded ? 'net-negative' : ''}`}>
                                <span className="summary-label">Net Balance</span>
                                <span className="summary-value">
                                    {helpDetailsModal.details.hoursSubtracted > helpDetailsModal.details.hoursAdded ? '+' : ''}
                                    {Math.round(helpDetailsModal.details.hoursSubtracted - helpDetailsModal.details.hoursAdded)} hours
                                </span>
                            </div>
                        </div>

                        <div className="help-details-modal-content">
                            {helpDetailsModal.details.details && helpDetailsModal.details.details.filter(e => e.hours > 0 && e.operatorCount > 0).length > 0 ? (
                                <div className="help-entries-list">
                                    {helpDetailsModal.details.details
                                        .filter(entry => entry.hours > 0 && entry.operatorCount > 0)
                                        .sort((a, b) => new Date(b.week) - new Date(a.week))
                                        .map((entry, idx) => {
                                            const isSent = entry.type === 'sent'
                                            return (
                                                <div key={`entry-${idx}`}
                                                     className={`help-entry ${isSent ? 'help-entry-sent' : 'help-entry-received'}`}>
                                                    <div className="help-entry-main">
                                                        <span
                                                            className={`help-entry-indicator ${isSent ? 'indicator-positive' : 'indicator-negative'}`}>
                                                            {isSent ? '+' : '-'}
                                                        </span>
                                                        <span className="help-entry-plant">
                                                            {isSent ? `To Plant ${entry.to}` : `From Plant ${entry.from}`}
                                                        </span>
                                                        <span
                                                            className="help-entry-hours">{Math.round(entry.hours)} hours</span>
                                                    </div>
                                                    <div className="help-entry-details">
                                                        <span className="help-entry-date">
                                                            <i className="fas fa-calendar"></i>
                                                            {new Date(entry.week).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })}
                                                        </span>
                                                        <span className="help-entry-operators">
                                                            <i className="fas fa-users"></i>
                                                            {entry.operatorCount} operator{entry.operatorCount !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    }
                                </div>
                            ) : (
                                <div className="help-details-empty">
                                    <i className="fas fa-info-circle"></i>
                                    <p>No detailed help records available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
