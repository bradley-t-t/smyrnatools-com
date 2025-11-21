import React, {useEffect, useState} from 'react'
import {usePreferences} from '../../../app/context/PreferencesContext'
import {supabase} from '../../../services/DatabaseService'
import {ReportUtility} from '../../../utils/ReportUtility'
import '../styles/Reports.css'

function WeeklyTrendsSection({currentWeekIso, plantCode, currentYph, currentLost}) {
    const [historicalData, setHistoricalData] = useState([])
    const [loading, setLoading] = useState(true)
    
    useEffect(() => {
        let mounted = true
        
        async function fetchHistoricalReports() {
            if (!currentWeekIso || !plantCode) {
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
                    .eq('report_type', 'plant_manager')
                    .eq('data->plant', plantCode)
                    .gte('week_iso', startOfMonth.toISOString().split('T')[0])
                    .lte('week_iso', endOfMonth.toISOString().split('T')[0])
                    .order('week_iso', {ascending: true})
                
                if (error) throw error
                
                if (mounted && data) {
                    const reports = data
                        .filter(r => r.week_iso !== currentWeekIso)
                        .map(r => ({
                            weekIso: r.week_iso,
                            yph: parseFloat(r.data?.total_yards_delivered || 0) / parseFloat(r.data?.total_operator_hours || 1),
                            lost: parseFloat(r.data?.yardage_lost || 0),
                            yards: parseFloat(r.data?.total_yards_delivered || 0),
                            hours: parseFloat(r.data?.total_operator_hours || 0)
                        }))
                        .filter(r => !isNaN(r.yph) && r.hours > 0)
                    
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
    }, [currentWeekIso, plantCode])
    
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
    
    if (historicalData.length === 0) {
        return null
    }
    
    const avgYph = historicalData.reduce((sum, r) => sum + r.yph, 0) / historicalData.length
    const avgLost = historicalData.reduce((sum, r) => sum + r.lost, 0) / historicalData.length
    const totalYards = historicalData.reduce((sum, r) => sum + r.yards, 0)
    
    const yphVariance = currentYph && avgYph ? ((currentYph - avgYph) / avgYph) * 100 : 0
    const lostVariance = currentLost !== null && avgLost ? ((currentLost - avgLost) / avgLost) * 100 : 0
    
    const formatVariance = (variance) => {
        const sign = variance > 0 ? '+' : ''
        return `${sign}${variance.toFixed(1)}%`
    }
    
    return (
        <div className="pm-trends-section">
            <div className="pm-trends-header">
                <h3 className="pm-trends-title">
                    <i className="fas fa-chart-line"></i>
                    Monthly Performance Trends
                </h3>
                <p className="pm-trends-subtitle">
                    Comparing this week to {historicalData.length} previous {historicalData.length === 1 ? 'week' : 'weeks'} this month
                </p>
            </div>
            
            <div className="pm-trends-grid">
                <div className="pm-trend-card">
                    <div className="pm-trend-header">
                        <i className="fas fa-tachometer-alt pm-trend-icon"></i>
                        <span className="pm-trend-label">Yards per Hour</span>
                    </div>
                    <div className="pm-trend-comparison">
                        <div className="pm-trend-item">
                            <span className="pm-trend-sublabel">Previous Avg</span>
                            <span className="pm-trend-value">{avgYph.toFixed(2)}</span>
                        </div>
                        <div className="pm-trend-arrow">
                            <i className={`fas fa-arrow-${yphVariance >= 0 ? 'up' : 'down'}`} 
                               style={{color: yphVariance >= 0 ? 'var(--success)' : 'var(--error)'}}></i>
                        </div>
                        <div className="pm-trend-item">
                            <span className="pm-trend-sublabel">This Week</span>
                            <span className="pm-trend-value">{currentYph ? currentYph.toFixed(2) : '--'}</span>
                        </div>
                    </div>
                    <div className={`pm-trend-variance ${yphVariance >= 0 ? 'positive' : 'negative'}`}>
                        {formatVariance(yphVariance)} vs. monthly average
                    </div>
                </div>
                
                <div className="pm-trend-card">
                    <div className="pm-trend-header">
                        <i className="fas fa-exclamation-triangle pm-trend-icon"></i>
                        <span className="pm-trend-label">Yardage Lost</span>
                    </div>
                    <div className="pm-trend-comparison">
                        <div className="pm-trend-item">
                            <span className="pm-trend-sublabel">Previous Avg</span>
                            <span className="pm-trend-value">{avgLost.toFixed(0)}</span>
                        </div>
                        <div className="pm-trend-arrow">
                            <i className={`fas fa-arrow-${lostVariance <= 0 ? 'down' : 'up'}`} 
                               style={{color: lostVariance <= 0 ? 'var(--success)' : 'var(--error)'}}></i>
                        </div>
                        <div className="pm-trend-item">
                            <span className="pm-trend-sublabel">This Week</span>
                            <span className="pm-trend-value">{currentLost !== null ? currentLost : '--'}</span>
                        </div>
                    </div>
                    <div className={`pm-trend-variance ${lostVariance <= 0 ? 'positive' : 'negative'}`}>
                        {formatVariance(lostVariance)} vs. monthly average
                    </div>
                </div>
                
                <div className="pm-trend-card pm-trend-card-full">
                    <div className="pm-trend-header">
                        <i className="fas fa-calendar-week pm-trend-icon"></i>
                        <span className="pm-trend-label">Week-by-Week Breakdown</span>
                    </div>
                    <div className="pm-weeks-table">
                        {historicalData.map((report, idx) => {
                            const weekDate = new Date(report.weekIso)
                            const weekLabel = ReportUtility.formatDate(weekDate)
                            return (
                                <div key={idx} className="pm-week-row">
                                    <div className="pm-week-date">{weekLabel}</div>
                                    <div className="pm-week-metrics">
                                        <div className="pm-week-metric">
                                            <span className="pm-week-metric-label">YPH:</span>
                                            <span className="pm-week-metric-value">{report.yph.toFixed(2)}</span>
                                        </div>
                                        <div className="pm-week-metric">
                                            <span className="pm-week-metric-label">Lost:</span>
                                            <span className="pm-week-metric-value">{report.lost.toFixed(0)}</span>
                                        </div>
                                        <div className="pm-week-metric">
                                            <span className="pm-week-metric-label">Yards:</span>
                                            <span className="pm-week-metric-value">{report.yards.toFixed(0)}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                
                <div className="pm-trend-summary">
                    <div className="pm-summary-stat">
                        <i className="fas fa-cube pm-summary-icon"></i>
                        <div className="pm-summary-content">
                            <span className="pm-summary-label">Total Yards (Month)</span>
                            <span className="pm-summary-value">{totalYards.toFixed(0)}</span>
                        </div>
                    </div>
                    <div className="pm-summary-stat">
                        <i className="fas fa-clipboard-list pm-summary-icon"></i>
                        <div className="pm-summary-content">
                            <span className="pm-summary-label">Weeks Recorded</span>
                            <span className="pm-summary-value">{historicalData.length}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export function PlantManagerSubmitPlugin({yph, yphGrade, yphLabel, lost, lostGrade, lostLabel, form, weekIso}) {
    const {preferences} = usePreferences()
    const isDark = preferences.themeMode === 'dark'
    const formatYph = v => {
        const n = typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) : NaN)
        return Number.isFinite(n) ? n.toFixed(2) : '--'
    }
    
    const plantCode = form?.plant || ''
    
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
                        <div className="pm-metric-value" style={{color: isDark ? 'var(--text-light)' : 'var(--text-primary)'}}>
                            {formatYph(yph)}
                        </div>
                        <div className="pm-metric-grade" style={{color: isDark ? 'var(--text-light)' : 'var(--text-primary)'}}>
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
                        <div className="pm-metric-value" style={{color: isDark ? 'var(--text-light)' : 'var(--text-primary)'}}>
                            {lost !== null ? lost : '--'}
                        </div>
                        <div className="pm-metric-grade" style={{color: isDark ? 'var(--text-light)' : 'var(--text-primary)'}}>
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
                plantCode={plantCode}
                currentYph={yph}
                currentLost={lost}
            />
        </div>
    )
}

export function PlantManagerReviewPlugin({yph, yphGrade, yphLabel, lost, lostGrade, lostLabel, form, weekIso}) {
    const {preferences} = usePreferences()
    const isDark = preferences.themeMode === 'dark'
    const formatYph = v => {
        const n = typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) : NaN)
        return Number.isFinite(n) ? n.toFixed(2) : '--'
    }
    
    const plantCode = form?.plant || ''
    
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
                        <div className="pm-metric-value" style={{color: isDark ? 'var(--text-light)' : 'var(--text-primary)'}}>
                            {formatYph(yph)}
                        </div>
                        <div className="pm-metric-grade" style={{color: isDark ? 'var(--text-light)' : 'var(--text-primary)'}}>
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
                        <div className="pm-metric-value" style={{color: isDark ? 'var(--text-light)' : 'var(--text-primary)'}}>
                            {lost !== null ? lost : '--'}
                        </div>
                        <div className="pm-metric-grade" style={{color: isDark ? 'var(--text-light)' : 'var(--text-primary)'}}>
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
                plantCode={plantCode}
                currentYph={yph}
                currentLost={lost}
            />
        </div>
    )
}
