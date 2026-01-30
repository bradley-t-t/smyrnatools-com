import React, { useEffect, useState } from 'react'

import { usePreferences } from '../../../app/context/PreferencesContext'
import { RegionService } from '../../../services/RegionService'
import { ReportUtility } from '../../../utils/ReportUtility'

const dmReportStyles = `
.dm-daily-recap-section { background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 1.5rem; margin-bottom: 1.5rem; }
.dm-daily-recap-header { margin-bottom: 1.25rem; }
.dm-daily-recap-title { display: flex; align-items: center; gap: 0.75rem; font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0; }
.dm-daily-recap-subtitle { font-size: 0.875rem; color: #64748b; margin: 0.5rem 0 0 0; }
.dm-daily-recap-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
.dm-daily-card { background: #f8fafc; border-radius: 8px; padding: 1rem; border: 1px solid #e5e7eb; }
.dm-daily-card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
.dm-daily-icon { color: #1e3a5f; font-size: 0.875rem; }
.dm-daily-label { font-weight: 600; color: #1e293b; }
.dm-daily-required { color: #ef4444; }
.dm-daily-textarea { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem; color: #1e293b; background: white; resize: vertical; min-height: 100px; box-sizing: border-box; }
.dm-daily-textarea:disabled { background: #f8fafc; color: #64748b; }
.dm-daily-char-count { font-size: 0.75rem; color: #94a3b8; text-align: right; margin-top: 0.25rem; }
.dm-report-plugin { }
.dm-report-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem; }
.dm-report-title { font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0; }
.dm-report-stats { display: flex; gap: 1rem; }
.dm-stat-card { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border-radius: 8px; background: #f8fafc; border: 1px solid #e5e7eb; }
.dm-stat-completed { background: #d1fae5; border-color: #a7f3d0; }
.dm-stat-overdue { background: #fee2e2; border-color: #fecaca; }
.dm-stat-icon { font-size: 1.25rem; }
.dm-stat-completed .dm-stat-icon { color: #059669; }
.dm-stat-overdue .dm-stat-icon { color: #dc2626; }
.dm-stat-content { }
.dm-stat-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
.dm-stat-value { font-size: 1.25rem; font-weight: 700; color: #1e293b; }
.dm-items-container { background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }
.dm-items-table-wrapper { overflow-x: auto; }
.dm-items-table { width: 100%; border-collapse: collapse; }
.dm-items-table th { background: #f8fafc; padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; }
.dm-items-table td { padding: 0.75rem 1rem; font-size: 0.9375rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
.dm-items-table tr:last-child td { border-bottom: none; }
.dm-item-row:hover { background: #f8fafc; }
.dm-item-overdue { background: #fef2f2; }
.dm-item-desc-wrapper { display: flex; align-items: center; gap: 0.75rem; }
.dm-item-icon { font-size: 1rem; }
.dm-item-icon-success { color: #059669; }
.dm-item-icon-error { color: #dc2626; }
.dm-item-icon-pending { color: #f59e0b; }
.dm-item-text { color: #1e293b; }
.dm-plant-badge { display: inline-flex; padding: 0.25rem 0.5rem; background: #eff6ff; color: #1e40af; border-radius: 6px; font-size: 0.8125rem; font-weight: 500; }
.dm-completed-badge { display: inline-flex; padding: 0.25rem 0.5rem; background: #d1fae5; color: #059669; border-radius: 6px; font-size: 0.8125rem; font-weight: 500; }
.dm-empty-state { text-align: center; padding: 3rem 2rem; color: #64748b; }
.dm-empty-icon { font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem; }
.dm-empty-text { font-size: 1rem; margin: 0; }
`

function DailyRecapSection({ form, handleChange, readOnly }) {
    const days = [
        { icon: 'fa-calendar-day', key: 'monday', label: 'Monday' },
        { icon: 'fa-calendar-day', key: 'tuesday', label: 'Tuesday' },
        { icon: 'fa-calendar-day', key: 'wednesday', label: 'Wednesday' },
        { icon: 'fa-calendar-day', key: 'thursday', label: 'Thursday' },
        { icon: 'fa-calendar-day', key: 'friday', label: 'Friday' },
        { icon: 'fa-calendar-week', key: 'saturday', label: 'Saturday' }
    ]

    return (
        <div className="dm-daily-recap-section">
            <style>{dmReportStyles}</style>
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
                {days.map((day) => (
                    <div key={day.key} className="dm-daily-card">
                        <div className="dm-daily-card-header">
                            <i className={`fas ${day.icon} dm-daily-icon`}></i>
                            <span className="dm-daily-label">{day.label}</span>
                            <span className="dm-daily-required">*</span>
                        </div>
                        <textarea
                            className="dm-daily-textarea"
                            value={form[day.key] ?? ''}
                            onChange={(e) => handleChange(e, day.key)}
                            placeholder={`Enter ${day.label.toLowerCase()} activities, meetings, issues, accomplishments...`}
                            required
                            disabled={readOnly}
                            rows={6}
                        />
                        <div className="dm-daily-char-count">{(form[day.key] ?? '').length} characters</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function DistrictManagerSubmitPlugin({ maintenanceItems, plants, form, setForm, readOnly }) {
    const { preferences } = usePreferences()
    const [allowedCodes, setAllowedCodes] = useState(null)
    useEffect(() => {
        let mounted = true
        const loadCodes = async () => {
            const regionCode = preferences?.selectedRegion?.code || ''
            const codes = await RegionService.getAllowedPlantCodes(regionCode)
            if (mounted) setAllowedCodes(codes)
        }
        loadCodes()
        return () => {
            mounted = false
        }
    }, [preferences?.selectedRegion?.code])

    const plantCodes = plants ? new Set(plants.map((p) => p.plant_code || p.code).filter(Boolean)) : null
    const baseFiltered =
        maintenanceItems && plantCodes
            ? maintenanceItems.filter((item) => plantCodes.has(item.plant_code))
            : maintenanceItems || []
    const finalFiltered = allowedCodes
        ? baseFiltered.filter((item) =>
              allowedCodes.has(
                  String(item.plant_code || '')
                      .trim()
                      .toUpperCase()
              )
          )
        : baseFiltered

    function handleChange(e, name) {
        if (setForm) setForm((prev) => ({ ...prev, [name]: e.target.value }))
    }

    function getPlantName(plantCode) {
        const plant = plants?.find((p) => (p.plant_code || p.code) === plantCode)
        return plant?.name || plantCode || ''
    }

    function truncateText(text, maxLength) {
        if (!text) return ''
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
    }

    const completedCount = finalFiltered.length
    const overdueCount = finalFiltered.filter((item) => item.isOverdue).length

    return (
        <div className="dm-report-plugin">
            <DailyRecapSection form={form} handleChange={handleChange} readOnly={readOnly} />
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
                                {finalFiltered.map((item) => (
                                    <tr
                                        key={item.id}
                                        className={`dm-item-row ${item.isOverdue ? 'dm-item-overdue' : ''}`}
                                    >
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

export function DistrictManagerReviewPlugin({ maintenanceItems, plants, form }) {
    const { preferences } = usePreferences()
    const [allowedCodes, setAllowedCodes] = useState(null)
    useEffect(() => {
        let mounted = true
        const loadCodes = async () => {
            const regionCode = preferences?.selectedRegion?.code || ''
            const codes = await RegionService.getAllowedPlantCodes(regionCode)
            if (mounted) setAllowedCodes(codes)
        }
        loadCodes()
        return () => {
            mounted = false
        }
    }, [preferences?.selectedRegion?.code])

    const plantCodes = plants ? new Set(plants.map((p) => p.plant_code || p.code).filter(Boolean)) : null
    const baseFiltered =
        maintenanceItems && plantCodes
            ? maintenanceItems.filter((item) => plantCodes.has(item.plant_code))
            : maintenanceItems || []
    const finalFiltered = allowedCodes
        ? baseFiltered.filter((item) =>
              allowedCodes.has(
                  String(item.plant_code || '')
                      .trim()
                      .toUpperCase()
              )
          )
        : baseFiltered

    function handleChange() {}

    function getPlantName(plantCode) {
        const plant = plants?.find((p) => (p.plant_code || p.code) === plantCode)
        return plant?.name || plantCode || ''
    }

    function truncateText(text, maxLength) {
        if (!text) return ''
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
    }

    const completedCount = finalFiltered.length
    const overdueCount = finalFiltered.filter((item) => item.isOverdue).length

    return (
        <div className="dm-report-plugin">
            <DailyRecapSection form={form} handleChange={handleChange} readOnly={true} />
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
                                {finalFiltered.map((item) => (
                                    <tr
                                        key={item.id}
                                        className={`dm-item-row ${item.isOverdue ? 'dm-item-overdue' : ''}`}
                                    >
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
