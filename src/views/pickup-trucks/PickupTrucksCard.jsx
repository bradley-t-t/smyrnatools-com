import React from 'react'
import CardSection from '../../components/sections/CardSection'

function PickupTrucksCard({ pickup, onSelect, isDuplicateVin, isHighMileage }) {
    let statusColor = 'var(--accent)'
    if (pickup.status === 'Active') statusColor = 'var(--status-active)'
    else if (pickup.status === 'Stationary') statusColor = 'var(--status-stationary)'
    else if (pickup.status === 'Spare') statusColor = 'var(--status-spare)'
    else if (pickup.status === 'In Shop') statusColor = 'var(--status-inshop)'
    else if (pickup.status === 'Retired') statusColor = 'var(--status-retired)'
    else if (pickup.status === 'Sold') statusColor = 'var(--status-sold)'

    const assignedLabel = pickup.assigned || 'Not Assigned'

    return (
        <CardSection
            item={pickup}
            itemType="Pickup"
            itemNumber={assignedLabel}
            onSelect={onSelect}
            statusColor={statusColor}
        >
            <div className="detail-row">
                <div className="detail-label">VIN</div>
                <div className="detail-value">
                    <span>{pickup.vin || 'Unknown'}</span>
                    {isDuplicateVin && (
                        <span className="warning-badge" title="Duplicate VIN">
                            <i className="fas fa-exclamation-triangle"></i>
                        </span>
                    )}
                </div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Make</div>
                <div className="detail-value">{pickup.make || 'Unknown'}</div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Model</div>
                <div className="detail-value">{pickup.model || 'Unknown'}</div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Year</div>
                <div className="detail-value">{pickup.year || 'Unknown'}</div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Mileage</div>
                <div className="detail-value">
                    <span>{typeof pickup.mileage === 'number' ? pickup.mileage.toLocaleString() : 'Unknown'}</span>
                    {isHighMileage && (
                        <span className="warning-badge" title="High mileage">
                            <i className="fas fa-exclamation-triangle"></i>
                        </span>
                    )}
                </div>
            </div>
        </CardSection>
    )
}

export default PickupTrucksCard
