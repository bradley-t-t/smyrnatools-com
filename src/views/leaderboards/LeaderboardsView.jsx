import React, { useEffect, useState } from 'react'

import { usePreferences } from '../../app/context/PreferencesContext'
import { supabase } from '../../services/DatabaseService'
import { EquipmentService } from '../../services/EquipmentService'
import { MixerService } from '../../services/MixerService'
import { OperatorService } from '../../services/OperatorService'
import { RegionService } from '../../services/RegionService'
import { TractorService } from '../../services/TractorService'
import { TrailerService } from '../../services/TrailerService'
import LeaderboardsUtility from '../../utils/LeaderboardsUtility'

export default function LeaderboardsView() {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const [loading, setLoading] = useState(true)
    const [plantMetrics, setPlantMetrics] = useState([])
    const [selectedCategory, setSelectedCategory] = useState('efficiency')
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [helpDetailsModal, setHelpDetailsModal] = useState({ details: null, isOpen: false, plant: null })
    const [hoursAdjustmentsData, setHoursAdjustmentsData] = useState({})

    const selectedRegionCode = preferences.selectedRegion?.code || null
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    const styles = {
        categories: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem'
        },
        categoryButton: (active) => ({
            background: active ? `${accentColor}15` : 'white',
            border: active ? `2px solid ${accentColor}` : '1px solid #e5e7eb',
            borderRadius: '8px',
            color: active ? accentColor : '#64748b',
            cursor: 'pointer',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: active ? 600 : 500,
            outline: 'none',
            padding: isMobile ? '0.5rem 0.875rem' : '0.625rem 1.25rem',
            transition: 'all 0.2s'
        }),
        closeButton: {
            background: 'none',
            border: 'none',
            borderRadius: '6px',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '1.25rem',
            padding: '0.5rem',
            transition: 'all 0.2s'
        },
        content: {
            margin: '0 auto',
            maxWidth: '1400px'
        },
        empty: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '4rem 2rem',
            textAlign: 'center'
        },
        emptyIcon: {
            color: '#cbd5e1',
            fontSize: '3rem',
            marginBottom: '1rem'
        },
        emptySubtext: {
            color: '#94a3b8',
            fontSize: '0.875rem'
        },
        emptyText: {
            color: '#64748b',
            fontSize: '1.125rem',
            fontWeight: 600,
            marginBottom: '0.5rem'
        },
        formula: {
            alignItems: 'center',
            background: 'white',
            borderRadius: '8px',
            display: 'flex',
            flexWrap: 'wrap',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            gap: '0.5rem',
            marginBottom: '1rem',
            padding: isMobile ? '0.75rem' : '1rem'
        },
        formulaOperator: {
            color: '#1e3a5f',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 700
        },
        formulaPart: {
            background: '#f8fafc',
            borderRadius: '6px',
            color: '#475569',
            fontWeight: 500,
            padding: isMobile ? '0.25rem 0.5rem' : '0.375rem 0.75rem'
        },
        header: {
            background: 'white',
            backgroundImage: `
                linear-gradient(rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                radial-gradient(circle at center, rgba(30, 58, 95, 0.015) 0%, transparent 50%)
            `,
            backgroundPosition: '0 0, 0 0, 0 0',
            backgroundSize: '20px 20px, 20px 20px, 40px 40px',
            border: '1px solid #e5e7eb',
            borderRadius: isMobile ? '8px' : '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            margin: isMobile ? '0 auto 1rem' : '0 auto 2rem',
            maxWidth: '1400px',
            padding: isMobile ? '1rem' : '2rem'
        },
        helpEntry: (type) => ({
            background: type === 'sent' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${type === 'sent' ? '#dcfce7' : '#fee2e2'}`,
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? '0.5rem' : '0.75rem',
            marginBottom: isMobile ? '0.5rem' : '0.75rem',
            padding: isMobile ? '0.75rem' : '1rem'
        }),
        helpEntryDetails: {
            color: '#64748b',
            display: 'flex',
            flexWrap: 'wrap',
            fontSize: isMobile ? '0.6875rem' : '0.8125rem',
            gap: isMobile ? '0.75rem' : '1.5rem',
            paddingLeft: isMobile ? '2rem' : '3rem'
        },
        helpEntryHours: {
            color: '#1e3a5f',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 700
        },
        helpEntryIndicator: (type) => ({
            alignItems: 'center',
            background: type === 'sent' ? '#16a34a' : '#ef4444',
            borderRadius: '50%',
            color: 'white',
            display: 'flex',
            flexShrink: 0,
            fontSize: isMobile ? '0.875rem' : '1.125rem',
            fontWeight: 700,
            height: isMobile ? '24px' : '32px',
            justifyContent: 'center',
            width: isMobile ? '24px' : '32px'
        }),
        helpEntryMain: {
            alignItems: 'center',
            display: 'flex',
            gap: isMobile ? '0.5rem' : '1rem'
        },
        helpEntryPlant: {
            color: '#1e293b',
            flex: 1,
            fontSize: isMobile ? '0.8125rem' : '0.9375rem',
            fontWeight: 600
        },
        infoCard: {
            background: '#eff6ff',
            border: '1px solid #dbeafe',
            borderRadius: isMobile ? '8px' : '12px',
            marginBottom: isMobile ? '1rem' : '2rem',
            padding: isMobile ? '1rem' : '1.5rem'
        },
        infoFooter: {
            color: '#64748b',
            display: isMobile ? 'none' : 'flex',
            fontSize: '0.8125rem',
            gap: '0.75rem',
            lineHeight: 1.6
        },
        infoHeader: {
            alignItems: 'center',
            color: '#1e3a5f',
            display: 'flex',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 600,
            gap: '0.75rem',
            marginBottom: '1rem'
        },
        item: (rank) => ({
            alignItems: isMobile ? 'stretch' : 'center',
            background: 'white',
            border:
                rank === 1
                    ? '2px solid #fbbf24'
                    : rank === 2
                      ? '2px solid #94a3b8'
                      : rank === 3
                        ? '2px solid #f97316'
                        : '1px solid #e5e7eb',
            borderRadius: isMobile ? '8px' : '12px',
            boxShadow: rank <= 3 ? '0 4px 12px rgba(0,0,0,0.08)' : '0 2px 6px rgba(0,0,0,0.04)',
            display: isMobile ? 'flex' : 'grid',
            flexDirection: isMobile ? 'column' : undefined,
            gap: isMobile ? '0.75rem' : '1.5rem',
            gridTemplateColumns: isMobile ? undefined : '60px 1fr auto 1fr',
            padding: isMobile ? '1rem' : '1.5rem',
            transition: 'all 0.2s'
        }),
        itemMobileHeader: {
            alignItems: 'center',
            display: 'flex',
            gap: '0.75rem'
        },
        list: {
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? '0.75rem' : '1rem'
        },
        metricValue: {
            color: accentColor,
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 700,
            textAlign: isMobile ? 'left' : 'center'
        },
        modal: {
            alignItems: 'center',
            backdropFilter: 'blur(4px)',
            background: 'rgba(0, 0, 0, 0.5)',
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            left: 0,
            padding: '2rem',
            position: 'fixed',
            right: 0,
            top: 0,
            zIndex: 1000
        },
        modalBody: {
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '1rem' : '1.5rem 2rem'
        },
        modalContent: {
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            maxWidth: '800px',
            width: '100%'
        },
        modalHeader: {
            alignItems: 'center',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '1.5rem 2rem'
        },
        modalSummary: {
            background: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(3, 1fr)',
            padding: '1.5rem 2rem'
        },
        modalTitle: {
            alignItems: 'center',
            color: '#1e293b',
            display: 'flex',
            fontSize: '1.25rem',
            fontWeight: 700,
            gap: '0.75rem',
            margin: 0
        },
        plantCode: {
            color: '#1e293b',
            fontSize: isMobile ? '1rem' : '1.125rem',
            fontWeight: 700
        },
        plantInfo: {
            display: 'flex',
            flex: isMobile ? 1 : undefined,
            flexDirection: 'column',
            gap: '0.25rem'
        },
        plantName: {
            color: '#64748b',
            fontSize: isMobile ? '0.75rem' : '0.875rem'
        },
        rankBadge: (rank) => ({
            alignItems: 'center',
            background:
                rank === 1
                    ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                    : rank === 2
                      ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                      : rank === 3
                        ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                        : '#f1f5f9',
            borderRadius: '50%',
            boxShadow: rank <= 3 ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
            color: rank <= 3 ? 'white' : '#64748b',
            display: 'flex',
            flexShrink: 0,
            fontSize: isMobile ? '1rem' : rank <= 3 ? '1.5rem' : '1.25rem',
            fontWeight: 700,
            height: isMobile ? '40px' : '60px',
            justifyContent: 'center',
            width: isMobile ? '40px' : '60px'
        }),
        skeleton: {
            animation: 'shimmer 2s infinite',
            background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
            backgroundSize: '200% 100%',
            borderRadius: '8px'
        },
        statItem: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.125rem'
        },
        statLabel: {
            color: '#64748b',
            fontSize: isMobile ? '0.625rem' : '0.75rem',
            fontWeight: 500,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        },
        statValue: {
            color: '#1e293b',
            fontSize: isMobile ? '0.8125rem' : '0.9375rem',
            fontWeight: 600
        },
        stats: {
            display: 'grid',
            gap: isMobile ? '0.5rem' : '1rem',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(150px, 1fr))'
        },
        summaryItem: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            padding: '1rem'
        },
        summaryLabel: {
            color: '#64748b',
            fontSize: isMobile ? '0.625rem' : '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        },
        summaryValue: {
            color: '#1e3a5f',
            fontSize: isMobile ? '1.125rem' : '1.5rem',
            fontWeight: 700
        },
        title: {
            color: '#1e293b',
            fontSize: isMobile ? '1.25rem' : '1.75rem',
            fontWeight: 700,
            margin: 0
        },
        titleRow: {
            alignItems: isMobile ? 'flex-start' : 'center',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '1rem' : '0',
            justifyContent: 'space-between',
            marginBottom: '1.5rem'
        },
        view: {
            background: '#f8fafc',
            height: '100%',
            overflowY: 'auto',
            padding: isMobile ? '1rem' : '2rem',
            width: '100%'
        },
        yearLabel: {
            color: '#64748b',
            fontSize: '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        },
        yearSelect: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e3a5f',
            cursor: 'pointer',
            fontSize: '0.9375rem',
            fontWeight: 600,
            outline: 'none',
            padding: '0.5rem 1rem',
            transition: 'all 0.2s'
        },
        yearSelector: {
            alignItems: 'center',
            display: 'flex',
            gap: '0.75rem'
        }
    }

    useEffect(() => {
        const styleSheet = document.createElement('style')
        styleSheet.textContent = `
            @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        `
        document.head.appendChild(styleSheet)
        return () => document.head.removeChild(styleSheet)
    }, [])

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

                const plantCodesInRegion = plantsInRegion.map((p) => p.plantCode)
                const plantNames = {}
                plantsInRegion.forEach((p) => {
                    plantNames[p.plantCode] = p.plantName
                })

                const extendedStartDate = new Date(selectedYear - 1, 11, 25)
                const extendedEndDate = new Date(selectedYear + 1, 0, 7, 23, 59, 59)

                const { data: profilesData, error: profilesError } = await supabase
                    .from('users_profiles')
                    .select('id, plant_code')
                    .in('plant_code', plantCodesInRegion)
                    .not('plant_code', 'is', null)

                if (profilesError) throw profilesError

                const userIdsByPlant = {}
                profilesData.forEach((p) => {
                    if (!userIdsByPlant[p.plant_code]) {
                        userIdsByPlant[p.plant_code] = []
                    }
                    userIdsByPlant[p.plant_code].push(p.id)
                })

                const allUserIds = profilesData.map((p) => p.id)

                if (allUserIds.length === 0) {
                    if (mounted) {
                        setPlantMetrics([])
                        setLoading(false)
                    }
                    return
                }

                const [{ data: reports, error: reportsError }, { data: safetyReports }] = await Promise.all([
                    supabase
                        .from('reports')
                        .select('*')
                        .eq('report_name', 'plant_manager')
                        .in('user_id', allUserIds)
                        .gte('week', extendedStartDate.toISOString())
                        .lte('week', extendedEndDate.toISOString()),
                    supabase
                        .from('reports')
                        .select('*')
                        .eq('report_name', 'safety_manager')
                        .gte('week', extendedStartDate.toISOString())
                        .lte('week', extendedEndDate.toISOString())
                ])

                if (reportsError) throw reportsError

                if (!mounted) return

                const hoursAdjustmentsByPlant = LeaderboardsUtility.calculateHoursAdjustments(
                    reports,
                    profilesData,
                    plantCodesInRegion
                )
                setHoursAdjustmentsData(hoursAdjustmentsByPlant)

                const safetyByPlant = LeaderboardsUtility.calculateSafetyIncidents(
                    safetyReports || [],
                    plantCodesInRegion
                )

                if (!reports || reports.length === 0) {
                    if (mounted) {
                        setPlantMetrics([])
                        setLoading(false)
                    }
                    return
                }

                const now = new Date()
                const currentWeekStart = new Date(now)
                currentWeekStart.setDate(now.getDate() - now.getDay())
                currentWeekStart.setHours(0, 0, 0, 0)

                const filteredReports = reports.filter((report) => {
                    const reportDate = new Date(report.week)
                    return reportDate < currentWeekStart
                })

                if (filteredReports.length === 0) {
                    if (mounted) {
                        setPlantMetrics([])
                        setLoading(false)
                    }
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

                Object.keys(userIdsByPlant).forEach((plantCode) => {
                    const plantReports = filteredReports.filter((r) => userIdsByPlant[plantCode].includes(r.user_id))
                    const fleetData = fleetCountsByPlant[plantCode] || {
                        avgFleetCleanliness: 0,
                        avgFleetCleanlinessForEfficiency: 0,
                        equipment: 0,
                        mixers: 0,
                        operators: 0,
                        totalAssets: 0,
                        tractors: 0,
                        trailers: 0
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
                            ...fleetData,
                            helpDetails: hoursAdjustments || null,
                            helpGiven: hoursAdjustments?.hoursSubtracted || 0,
                            helpReceived: hoursAdjustments?.hoursAdded || 0,
                            safetyReportsCount: safetyIncidents?.count || 0
                        })
                    }
                })

                if (mounted) {
                    setPlantMetrics(plantMetricsArray)
                }
            } catch (error) {
                console.error('Error fetching leaderboard data:', error)
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
    }, [selectedRegionCode, selectedYear])

    const categoryData = LeaderboardsUtility.getCategoryData(plantMetrics, selectedCategory)

    const renderValue = (plant, category) => {
        switch (category) {
            case 'efficiency':
                return (
                    <span style={{ color: LeaderboardsUtility.getEfficiencyColor(plant.avgEfficiency) }}>
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
        return Array.from({ length: 8 }).map((_, index) => (
            <div key={`skeleton-${index}`} style={styles.item(0)}>
                <div style={styles.rankBadge(0)}>
                    <div style={{ ...styles.skeleton, borderRadius: '50%', height: '24px', width: '24px' }} />
                </div>
                <div style={styles.plantInfo}>
                    <div style={{ ...styles.skeleton, height: '20px', marginBottom: '6px', width: '40%' }} />
                    <div style={{ ...styles.skeleton, height: '16px', width: '60%' }} />
                </div>
                <div style={styles.metricValue}>
                    <div style={{ ...styles.skeleton, height: '28px', width: '80px' }} />
                </div>
                <div style={styles.stats}>
                    <div style={{ ...styles.skeleton, height: '16px', marginBottom: '4px', width: '60%' }} />
                    <div style={{ ...styles.skeleton, height: '16px', width: '40%' }} />
                </div>
            </div>
        ))
    }

    return (
        <div style={styles.view}>
            <div style={styles.header}>
                <div style={styles.titleRow}>
                    <h1 style={styles.title}>Performance Leaderboards</h1>
                    <div style={styles.yearSelector}>
                        <span style={styles.yearLabel}>YTD</span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            style={styles.yearSelect}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#1e3a5f'
                                e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)'
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e5e7eb'
                                e.target.style.boxShadow = 'none'
                            }}
                        >
                            {Array.from({ length: new Date().getFullYear() - 2024 }, (_, i) => 2025 + i).map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div style={styles.categories}>
                    {[
                        { id: 'efficiency', label: 'Efficiency' },
                        { id: 'yph', label: 'YPH' },
                        { id: 'production', label: 'Total Yards' },
                        { id: 'monthly-yardage', label: 'Monthly Yards' },
                        { id: 'weekly-yardage', label: 'Weekly Yards' },
                        { id: 'daily-yardage', label: 'Daily Yards' },
                        { id: 'monthly-hours', label: 'Monthly Hours' },
                        { id: 'weekly-hours', label: 'Weekly Hours' },
                        { id: 'daily-hours', label: 'Daily Hours' },
                        { id: 'help-given', label: 'Help Given' },
                        { id: 'help-received', label: 'Help Received' }
                    ].map((cat) => (
                        <button
                            key={cat.id}
                            style={styles.categoryButton(selectedCategory === cat.id)}
                            onClick={() => setSelectedCategory(cat.id)}
                            onMouseEnter={(e) => {
                                if (selectedCategory !== cat.id) {
                                    e.currentTarget.style.borderColor = '#cbd5e1'
                                    e.currentTarget.style.background = '#f8fafc'
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedCategory !== cat.id) {
                                    e.currentTarget.style.borderColor = '#e5e7eb'
                                    e.currentTarget.style.background = 'white'
                                }
                            }}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            <div style={styles.content}>
                {selectedCategory === 'efficiency' && (
                    <div style={styles.infoCard}>
                        <div style={styles.infoHeader}>
                            <i className="fas fa-info-circle"></i>
                            <span>How Efficiency is Calculated</span>
                        </div>
                        <div>
                            <div style={styles.formula}>
                                <span style={styles.formulaPart}>YPH Score</span>
                                <span style={styles.formulaOperator}>×</span>
                                <span style={styles.formulaPart}>Load Efficiency</span>
                                <span style={styles.formulaOperator}>×</span>
                                <span style={styles.formulaPart}>Cleanliness Score</span>
                                <span style={styles.formulaOperator}>+</span>
                                <span style={styles.formulaPart}>Help Impact</span>
                                <span style={styles.formulaOperator}>-</span>
                                <span style={styles.formulaPart}>Report Penalty</span>
                                <span style={styles.formulaOperator}>-</span>
                                <span style={styles.formulaPart}>Safety Penalty</span>
                            </div>
                        </div>
                        <div style={styles.infoFooter}>
                            <i className="fas fa-lightbulb"></i>
                            <span>
                                Higher efficiency indicates better plant performance across production, quality, fleet
                                cleanliness, and reporting compliance. Help Impact: Hours sent to help other plants are
                                subtracted from your total hours (benefiting your YPH), while hours received from other
                                plants are added to your total hours (reducing your YPH). This ensures fair comparison
                                across plants with different collaboration patterns.
                            </span>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div style={styles.list}>{renderSkeletonItems()}</div>
                ) : categoryData.length === 0 ? (
                    <div style={styles.empty}>
                        <div style={styles.emptyIcon}>
                            <i className="fas fa-inbox"></i>
                        </div>
                        <p style={{ ...styles.emptyText, margin: 0 }}>No data available</p>
                        <span style={styles.emptySubtext}>Check back later as more reports are submitted</span>
                    </div>
                ) : (
                    <div style={styles.list}>
                        {categoryData.map((plant, index) => {
                            const rank = index + 1

                            return (
                                <div key={plant.plantCode} style={styles.item(rank)}>
                                    <div style={styles.rankBadge(rank)}>
                                        {rank <= 3 ? (
                                            <i
                                                className={`fas ${rank === 1 ? 'fa-trophy' : rank === 2 ? 'fa-medal' : 'fa-award'}`}
                                            ></i>
                                        ) : (
                                            <span>{rank}</span>
                                        )}
                                    </div>

                                    <div style={styles.plantInfo}>
                                        <div style={styles.plantCode}>Plant {plant.plantCode}</div>
                                        <div style={styles.plantName}>{plant.plantName}</div>
                                    </div>

                                    <div style={styles.metricValue}>{renderValue(plant, selectedCategory)}</div>

                                    <div style={styles.stats}>
                                        {selectedCategory === 'efficiency' && (
                                            <>
                                                <div style={styles.statItem}>
                                                    <span style={styles.statLabel}>Avg. YPH</span>
                                                    <span
                                                        style={{
                                                            ...styles.statValue,
                                                            alignItems: 'center',
                                                            display: 'flex',
                                                            gap: '0.25rem'
                                                        }}
                                                        title="Left: YPH before help adjustment / Right: YPH after help adjustment"
                                                    >
                                                        <em
                                                            style={{
                                                                color: '#64748b',
                                                                fontStyle: 'italic'
                                                            }}
                                                        >
                                                            {(plant.rawYPH ?? plant.avgYPH).toFixed(2)}
                                                        </em>
                                                        <span style={{ color: '#94a3b8' }}>/</span>
                                                        <strong>{plant.avgYPH.toFixed(2)}</strong>
                                                    </span>
                                                </div>
                                                <div style={styles.statItem}>
                                                    <span style={styles.statLabel}>Load Efficiency</span>
                                                    <span style={styles.statValue}>
                                                        {plant.loadsEfficiency.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div style={styles.statItem}>
                                                    <span
                                                        style={{
                                                            ...styles.statLabel,
                                                            color: '#1e3a5f',
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => {
                                                            const details = hoursAdjustmentsData[plant.plantCode]
                                                            if (
                                                                details &&
                                                                (details.hoursAdded > 0 || details.hoursSubtracted > 0)
                                                            ) {
                                                                setHelpDetailsModal({ details, isOpen: true, plant })
                                                            }
                                                        }}
                                                        title="Click for details"
                                                    >
                                                        Help Net Balance
                                                        {(plant.helpGiven > 0 || plant.helpReceived > 0) && (
                                                            <i
                                                                className="fas fa-info-circle"
                                                                style={{ marginLeft: '0.25rem' }}
                                                            ></i>
                                                        )}
                                                    </span>
                                                    <span
                                                        style={{
                                                            ...styles.statValue,
                                                            color:
                                                                plant.helpGiven > plant.helpReceived
                                                                    ? '#16a34a'
                                                                    : plant.helpGiven < plant.helpReceived
                                                                      ? '#ef4444'
                                                                      : '#1e293b'
                                                        }}
                                                    >
                                                        {plant.helpGiven > 0 || plant.helpReceived > 0
                                                            ? `${plant.helpGiven > plant.helpReceived ? '+' : ''}${Math.round(plant.helpGiven - plant.helpReceived)}h`
                                                            : 'N/A'}
                                                    </span>
                                                </div>
                                                <div style={styles.statItem}>
                                                    <span style={styles.statLabel}>Missing Reports</span>
                                                    <span
                                                        style={{
                                                            ...styles.statValue,
                                                            color:
                                                                (plant.missingReports || 0) +
                                                                    (plant.incompleteReports || 0) >
                                                                0
                                                                    ? '#ef4444'
                                                                    : '#16a34a'
                                                        }}
                                                    >
                                                        {(plant.missingReports || 0) + (plant.incompleteReports || 0)}
                                                    </span>
                                                </div>
                                                <div style={styles.statItem}>
                                                    <span style={styles.statLabel}>Avg. Cleanliness</span>
                                                    <span
                                                        style={{
                                                            ...styles.statValue,
                                                            color:
                                                                (plant.avgFleetCleanliness || 0) >= 4
                                                                    ? '#16a34a'
                                                                    : (plant.avgFleetCleanliness || 0) >= 3
                                                                      ? '#f59e0b'
                                                                      : '#ef4444'
                                                        }}
                                                    >
                                                        {(plant.avgFleetCleanliness || 0) > 0
                                                            ? `${plant.avgFleetCleanliness.toFixed(1)}/5`
                                                            : 'N/A'}
                                                    </span>
                                                </div>
                                                <div style={styles.statItem}>
                                                    <span style={styles.statLabel}>Safety Incidents</span>
                                                    <span
                                                        style={{
                                                            ...styles.statValue,
                                                            color:
                                                                (plant.safetyReportsCount || 0) > 0
                                                                    ? '#ef4444'
                                                                    : '#16a34a'
                                                        }}
                                                    >
                                                        {plant.safetyReportsCount || 0}
                                                    </span>
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

            {helpDetailsModal.isOpen && helpDetailsModal.details && (
                <div
                    style={styles.modal}
                    onClick={() => setHelpDetailsModal({ details: null, isOpen: false, plant: null })}
                >
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>
                                <i className="fas fa-exchange-alt"></i>
                                Help Details - Plant {helpDetailsModal.plant?.plantCode}
                            </h3>
                            <button
                                style={styles.closeButton}
                                onClick={() => setHelpDetailsModal({ details: null, isOpen: false, plant: null })}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f1f5f9'
                                    e.currentTarget.style.color = '#1e293b'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'none'
                                    e.currentTarget.style.color = '#94a3b8'
                                }}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div style={styles.modalSummary}>
                            <div style={styles.summaryItem}>
                                <span style={styles.summaryLabel}>Total Help Given</span>
                                <span style={styles.summaryValue}>
                                    {Math.round(helpDetailsModal.details.hoursSubtracted)} hours
                                </span>
                            </div>
                            <div style={styles.summaryItem}>
                                <span style={styles.summaryLabel}>Total Help Received</span>
                                <span style={styles.summaryValue}>
                                    {Math.round(helpDetailsModal.details.hoursAdded)} hours
                                </span>
                            </div>
                            <div style={styles.summaryItem}>
                                <span style={styles.summaryLabel}>Net Balance</span>
                                <span
                                    style={{
                                        ...styles.summaryValue,
                                        color:
                                            helpDetailsModal.details.hoursSubtracted >
                                            helpDetailsModal.details.hoursAdded
                                                ? '#16a34a'
                                                : helpDetailsModal.details.hoursSubtracted <
                                                    helpDetailsModal.details.hoursAdded
                                                  ? '#ef4444'
                                                  : '#1e3a5f'
                                    }}
                                >
                                    {helpDetailsModal.details.hoursSubtracted > helpDetailsModal.details.hoursAdded
                                        ? '+'
                                        : ''}
                                    {Math.round(
                                        helpDetailsModal.details.hoursSubtracted - helpDetailsModal.details.hoursAdded
                                    )}{' '}
                                    hours
                                </span>
                            </div>
                        </div>

                        <div style={styles.modalBody}>
                            {helpDetailsModal.details.details &&
                            helpDetailsModal.details.details.filter((e) => e.hours > 0 && e.operatorCount > 0).length >
                                0 ? (
                                <div>
                                    {helpDetailsModal.details.details
                                        .filter((entry) => entry.hours > 0 && entry.operatorCount > 0)
                                        .sort((a, b) => new Date(b.week) - new Date(a.week))
                                        .map((entry, idx) => {
                                            const isSent = entry.type === 'sent'
                                            return (
                                                <div
                                                    key={`entry-${idx}`}
                                                    style={styles.helpEntry(isSent ? 'sent' : 'received')}
                                                >
                                                    <div style={styles.helpEntryMain}>
                                                        <span
                                                            style={styles.helpEntryIndicator(
                                                                isSent ? 'sent' : 'received'
                                                            )}
                                                        >
                                                            {isSent ? '+' : '-'}
                                                        </span>
                                                        <span style={styles.helpEntryPlant}>
                                                            {isSent
                                                                ? `To Plant ${entry.to}`
                                                                : `From Plant ${entry.from}`}
                                                        </span>
                                                        <span style={styles.helpEntryHours}>
                                                            {Math.round(entry.hours)} hours
                                                        </span>
                                                    </div>
                                                    <div style={styles.helpEntryDetails}>
                                                        <span
                                                            style={{
                                                                alignItems: 'center',
                                                                display: 'flex',
                                                                gap: '0.375rem'
                                                            }}
                                                        >
                                                            <i className="fas fa-calendar"></i>
                                                            {new Date(entry.week).toLocaleDateString('en-US', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </span>
                                                        <span
                                                            style={{
                                                                alignItems: 'center',
                                                                display: 'flex',
                                                                gap: '0.375rem'
                                                            }}
                                                        >
                                                            <i className="fas fa-users"></i>
                                                            {entry.operatorCount} operator
                                                            {entry.operatorCount !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                </div>
                            ) : (
                                <div style={{ ...styles.empty, padding: '2rem' }}>
                                    <div style={{ ...styles.emptyIcon, fontSize: '2rem' }}>
                                        <i className="fas fa-info-circle"></i>
                                    </div>
                                    <p style={{ ...styles.emptyText, fontSize: '1rem', margin: 0 }}>
                                        No detailed help records available
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
