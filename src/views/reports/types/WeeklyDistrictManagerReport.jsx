import React, {useEffect, useState} from 'react'
import '../styles/Reports.css'
import {ReportUtility} from '../../../utils/ReportUtility'
import {usePreferences} from '../../../app/context/PreferencesContext'
import {RegionService} from '../../../services/RegionService'

function DailyRecapSection({form, handleChange, readOnly}) {
    const days = [
        {key: 'monday', label: 'Monday', icon: 'fa-calendar-day'},
        {key: 'tuesday', label: 'Tuesday', icon: 'fa-calendar-day'},
        {key: 'wednesday', label: 'Wednesday', icon: 'fa-calendar-day'},
        {key: 'thursday', label: 'Thursday', icon: 'fa-calendar-day'},
        {key: 'friday', label: 'Friday', icon: 'fa-calendar-day'},
        {key: 'saturday', label: 'Saturday', icon: 'fa-calendar-week'}
    ]

    return (
        <div className="dm-daily-recap-section">
            <div className="dm-daily-recap-header">
                <h3 className="dm-daily-recap-title">
                    <i className="fas fa-clipboard-list"></i>
                    Daily Activity Recaps
                </h3>
                <p className="dm-daily-recap-subtitle">
                    Document key activities, accomplishments, and notes for each day of the week
                </p>
            </div>
            <div className="dm-daily-recap-grid">
                {days.map(day => (
                    <div key={day.key} className="dm-daily-card">
                        <div className="dm-daily-card-header">
                            <i className={`fas ${day.icon} dm-daily-icon`}></i>
                            <span className="dm-daily-label">{day.label}</span>
                            <span className="dm-daily-required">*</span>
                        </div>
                        <textarea
                            className="dm-daily-textarea"
                            value={form[day.key] ?? ''}
                            onChange={e => handleChange(e, day.key)}
                            placeholder={`Enter ${day.label.toLowerCase()} activities, meetings, issues, accomplishments...`}
                            required
                            disabled={readOnly}
                            rows={6}
                        />
                        <div className="dm-daily-char-count">
                            {(form[day.key] ?? '').length} characters
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function DistrictManagerSubmitPlugin({maintenanceItems, plants, form, setForm, readOnly}) {
    const {preferences} = usePreferences()
    const [allowedCodes, setAllowedCodes] = useState(null)
    useEffect(() => {
        let mounted = true
        ;(async () => {
            const regionCode = preferences?.selectedRegion?.code || ''
            const codes = await RegionService.getAllowedPlantCodes(regionCode)
            if (mounted) setAllowedCodes(codes)
        })()
        return () => {
            mounted = false
        }
    }, [preferences?.selectedRegion?.code])

    const plantCodes = plants ? new Set(plants.map(p => p.plant_code || p.code).filter(Boolean)) : null
    const baseFiltered = maintenanceItems && plantCodes ? maintenanceItems.filter(item => plantCodes.has(item.plant_code)) : maintenanceItems || []
    const finalFiltered = allowedCodes ? baseFiltered.filter(item => allowedCodes.has(String(item.plant_code || '').trim().toUpperCase())) : baseFiltered

    function handleChange(e, name) {
        if (setForm) setForm(prev => ({...prev, [name]: e.target.value}))
    }

    function getPlantName(plantCode) {
        const plant = plants?.find(p => (p.plant_code || p.code) === plantCode)
        return plant?.name || plantCode || ''
    }

    function truncateText(text, maxLength) {
        if (!text) return ''
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
    }

    const completedCount = finalFiltered.length
    const overdueCount = finalFiltered.filter(item => item.isOverdue).length

    return (
        <div className="dm-report-plugin">
            <DailyRecapSection form={form} handleChange={handleChange} readOnly={readOnly}/>
            <div className="dm-report-header">
                <h3 className="dm-report-title">Weekly Completed Maintenance Items</h3>
                <div className="dm-report-stats">
                    <div className="dm-stat-card dm-stat-completed">
                        <div className="dm-stat-icon">
                            <i className="fas fa-check-circle"></i>
                        </div>
                        <div className="dm-stat-content">
                            <div className="dm-stat-label">Completed</div>
                            <div className="dm-stat-value">{completedCount}</div>
                        </div>
                    </div>
                    {overdueCount > 0 && (
                        <div className="dm-stat-card dm-stat-overdue">
                            <div className="dm-stat-icon">
                                <i className="fas fa-exclamation-triangle"></i>
                            </div>
                            <div className="dm-stat-content">
                                <div className="dm-stat-label">Were Overdue</div>
                                <div className="dm-stat-value">{overdueCount}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {finalFiltered.length > 0 ? (
                <div className="dm-items-container">
                    <div className="dm-items-table-wrapper">
                        <table className="dm-items-table">
                            <thead>
                            <tr>
                                <th className="dm-th-description">Description</th>
                                <th className="dm-th-plant">Plant</th>
                                <th className="dm-th-deadline">Deadline</th>
                                <th className="dm-th-completed">Completed</th>
                            </tr>
                            </thead>
                            <tbody>
                            {finalFiltered.map(item => (
                                <tr key={item.id} className={`dm-item-row ${item.isOverdue ? 'dm-item-overdue' : ''}`}>
                                    <td className="dm-td-description">
                                        <div className="dm-item-desc-wrapper">
                                            <i
                                                className={`fas ${item.completed ? 'fa-check-circle' : item.isOverdue ? 'fa-exclamation-triangle' : 'fa-clock'} dm-item-icon ${item.completed ? 'dm-item-icon-success' : item.isOverdue ? 'dm-item-icon-error' : 'dm-item-icon-pending'}`}
                                            />
                                            <span className="dm-item-text" title={item.description}>
                                                    {truncateText(item.description, 80)}
                                                </span>
                                        </div>
                                    </td>
                                    <td className="dm-td-plant">
                                            <span className="dm-plant-badge" title={getPlantName(item.plant_code)}>
                                                {truncateText(getPlantName(item.plant_code), 25)}
                                            </span>
                                    </td>
                                    <td className="dm-td-deadline">
                                        {item.deadline ? ReportUtility.formatDate(item.deadline) : '—'}
                                    </td>
                                    <td className="dm-td-completed">
                                            <span className="dm-completed-badge">
                                                {item.completed_at ? ReportUtility.formatDate(item.completed_at) : '—'}
                                            </span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="dm-empty-state">
                    <i className="fas fa-clipboard-check dm-empty-icon"></i>
                    <p className="dm-empty-text">No maintenance items were completed this week</p>
                </div>
            )}
        </div>
    )
}

export function DistrictManagerReviewPlugin({maintenanceItems, plants, form}) {
    const {preferences} = usePreferences()
    const [allowedCodes, setAllowedCodes] = useState(null)
    useEffect(() => {
        let mounted = true
        ;(async () => {
            const regionCode = preferences?.selectedRegion?.code || ''
            const codes = await RegionService.getAllowedPlantCodes(regionCode)
            if (mounted) setAllowedCodes(codes)
        })()
        return () => {
            mounted = false
        }
    }, [preferences?.selectedRegion?.code])

    const plantCodes = plants ? new Set(plants.map(p => p.plant_code || p.code).filter(Boolean)) : null
    const baseFiltered = maintenanceItems && plantCodes ? maintenanceItems.filter(item => plantCodes.has(item.plant_code)) : maintenanceItems || []
    const finalFiltered = allowedCodes ? baseFiltered.filter(item => allowedCodes.has(String(item.plant_code || '').trim().toUpperCase())) : baseFiltered

    function handleChange() {
    }

    function getPlantName(plantCode) {
        const plant = plants?.find(p => (p.plant_code || p.code) === plantCode)
        return plant?.name || plantCode || ''
    }

    function truncateText(text, maxLength) {
        if (!text) return ''
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
    }

    const completedCount = finalFiltered.length
    const overdueCount = finalFiltered.filter(item => item.isOverdue).length

    return (
        <div className="dm-report-plugin">
            <DailyRecapSection form={form} handleChange={handleChange} readOnly={true}/>
            <div className="dm-report-header">
                <h3 className="dm-report-title">Weekly Completed Maintenance Items</h3>
                <div className="dm-report-stats">
                    <div className="dm-stat-card dm-stat-completed">
                        <div className="dm-stat-icon">
                            <i className="fas fa-check-circle"></i>
                        </div>
                        <div className="dm-stat-content">
                            <div className="dm-stat-label">Completed</div>
                            <div className="dm-stat-value">{completedCount}</div>
                        </div>
                    </div>
                    {overdueCount > 0 && (
                        <div className="dm-stat-card dm-stat-overdue">
                            <div className="dm-stat-icon">
                                <i className="fas fa-exclamation-triangle"></i>
                            </div>
                            <div className="dm-stat-content">
                                <div className="dm-stat-label">Were Overdue</div>
                                <div className="dm-stat-value">{overdueCount}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {finalFiltered.length > 0 ? (
                <div className="dm-items-container">
                    <div className="dm-items-table-wrapper">
                        <table className="dm-items-table">
                            <thead>
                            <tr>
                                <th className="dm-th-description">Description</th>
                                <th className="dm-th-plant">Plant</th>
                                <th className="dm-th-deadline">Deadline</th>
                                <th className="dm-th-completed">Completed</th>
                            </tr>
                            </thead>
                            <tbody>
                            {finalFiltered.map(item => (
                                <tr key={item.id} className={`dm-item-row ${item.isOverdue ? 'dm-item-overdue' : ''}`}>
                                    <td className="dm-td-description">
                                        <div className="dm-item-desc-wrapper">
                                            <i
                                                className={`fas ${item.completed ? 'fa-check-circle' : item.isOverdue ? 'fa-exclamation-triangle' : 'fa-clock'} dm-item-icon`}
                                            />
                                            <span className="dm-item-text" title={item.description}>
                                                    {truncateText(item.description, 80)}
                                                </span>
                                        </div>
                                    </td>
                                    <td className="dm-td-plant">
                                            <span className="dm-plant-badge" title={getPlantName(item.plant_code)}>
                                                {truncateText(getPlantName(item.plant_code), 25)}
                                            </span>
                                    </td>
                                    <td className="dm-td-deadline">
                                        {item.deadline ? ReportUtility.formatDate(item.deadline) : '—'}
                                    </td>
                                    <td className="dm-td-completed">
                                            <span className="dm-completed-badge">
                                                {item.completed_at ? ReportUtility.formatDate(item.completed_at) : '—'}
                                            </span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="dm-empty-state">
                    <i className="fas fa-clipboard-check dm-empty-icon"></i>
                    <p className="dm-empty-text">No maintenance items were completed this week</p>
                </div>
            )}
        </div>
    )
}