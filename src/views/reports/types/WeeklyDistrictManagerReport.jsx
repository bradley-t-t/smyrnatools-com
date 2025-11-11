import React from 'react'
import '../styles/Reports.css'
import {ReportUtility} from '../../../utils/ReportUtility'

export function DistrictManagerSubmitPlugin({maintenanceItems, plants}) {
    const plantCodes = plants ? new Set(plants.map(p => p.plant_code || p.code).filter(Boolean)) : null
    
    const filteredItems = maintenanceItems && plantCodes 
        ? maintenanceItems.filter(item => plantCodes.has(item.plant_code))
        : maintenanceItems || []

    if (filteredItems.length === 0) return null

    function getPlantName(plantCode) {
        const plant = plants?.find(p => (p.plant_code || p.code) === plantCode)
        return plant?.name || plantCode || ''
    }

    function truncateText(text, maxLength) {
        if (!text) return ''
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
    }

    return (
        <div className="rpt-section">
            <div className="rpt-section-title">
                Items Completed This Week
            </div>
            <div className="mixers-list-table-container rpt-table-container">
                <table className="mixers-list-table">
                    <thead>
                    <tr>
                        <th>Description</th>
                        <th>Plant</th>
                        <th>Deadline</th>
                        <th>Completed</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredItems.map(item => (
                        <tr key={item.id} className={item.completed ? 'completed' : ''}>
                            <td title={item.description}>
                                <i
                                    className={`fas ${item.completed ? 'fa-check-circle' : item.isOverdue ? 'fa-exclamation-triangle' : 'fa-clock'} rpt-status-icon`}
                                    style={{color: item.completed ? 'var(--success)' : item.isOverdue ? 'var(--error)' : 'var(--accent)'}}
                                />
                                {truncateText(item.description, 60)}
                            </td>
                            <td title={getPlantName(item.plant_code)}>
                                {truncateText(getPlantName(item.plant_code), 20)}
                            </td>
                            <td>
                                {item.deadline ? ReportUtility.formatDate(item.deadline) : ''}
                            </td>
                            <td>
                                {item.completed_at ? ReportUtility.formatDate(item.completed_at) : ''}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export function DistrictManagerReviewPlugin({maintenanceItems, plants}) {
    const plantCodes = plants ? new Set(plants.map(p => p.plant_code || p.code).filter(Boolean)) : null
    
    const filteredItems = maintenanceItems && plantCodes 
        ? maintenanceItems.filter(item => plantCodes.has(item.plant_code))
        : maintenanceItems || []

    if (filteredItems.length === 0) return null

    function getPlantName(plantCode) {
        const plant = plants?.find(p => (p.plant_code || p.code) === plantCode)
        return plant?.name || plantCode || ''
    }

    function truncateText(text, maxLength) {
        if (!text) return ''
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
    }

    return (
        <div className="rpt-section">
            <div className="rpt-section-title">
                Items Completed This Week
            </div>
            <div className="mixers-list-table-container rpt-table-container">
                <table className="mixers-list-table">
                    <thead>
                    <tr>
                        <th>Description</th>
                        <th>Plant</th>
                        <th>Deadline</th>
                        <th>Completed</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredItems.map(item => (
                        <tr key={item.id} className={item.completed ? 'completed' : ''}>
                            <td title={item.description}>
                                <i
                                    className={`fas ${item.completed ? 'fa-check-circle' : item.isOverdue ? 'fa-exclamation-triangle' : 'fa-clock'} rpt-status-icon`}
                                    style={{color: item.completed ? 'var(--success)' : item.isOverdue ? 'var(--error)' : 'var(--accent)'}}
                                />
                                {truncateText(item.description, 60)}
                            </td>
                            <td title={getPlantName(item.plant_code)}>
                                {truncateText(getPlantName(item.plant_code), 20)}
                            </td>
                            <td>
                                {item.deadline ? ReportUtility.formatDate(item.deadline) : ''}
                            </td>
                            <td>
                                {item.completed_at ? ReportUtility.formatDate(item.completed_at) : ''}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}