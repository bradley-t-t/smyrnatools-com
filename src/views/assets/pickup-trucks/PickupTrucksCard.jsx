import React from 'react'

import CardSection from '../../../app/components/sections/CardSection'

/** Maps pickup truck status to card accent color. */
const STATUS_COLORS = {
    Active: 'var(--status-active)',
    'In Shop': 'var(--status-inshop)',
    Retired: 'var(--status-retired)',
    Sold: 'var(--status-sold)',
    Spare: 'var(--status-spare)',
    Stationary: 'var(--status-stationary)'
}

/**
 * Grid-mode card for a single pickup truck. Displays VIN (with duplicate
 * warning), make, model, year, and mileage (with high-mileage warning).
 * Status-based accent color supports Active, Stationary, Spare, In Shop,
 * Retired, and Sold.
 */
function PickupTrucksCard({ pickup, onSelect, isDuplicateVin, isHighMileage }) {
    const statusColor = STATUS_COLORS[pickup.status] ?? 'var(--accent)'
    const assignedLabel = pickup.assigned || 'Not Assigned'
    return (
        <CardSection
            item={pickup}
            itemType="Pickup"
            itemNumber={assignedLabel}
            onSelect={onSelect}
            statusColor={statusColor}
        >
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">VIN</div>
                <div className="text-sm font-medium">
                    <span>{pickup.vin || 'Unknown'}</span>
                    {isDuplicateVin && (
                        <span className="ml-1.5 text-amber-500" title="Duplicate VIN">
                            <i className="fas fa-exclamation-triangle"></i>
                        </span>
                    )}
                </div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Make</div>
                <div className="text-sm font-medium">{pickup.make || 'Unknown'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Model</div>
                <div className="text-sm font-medium">{pickup.model || 'Unknown'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Year</div>
                <div className="text-sm font-medium">{pickup.year || 'Unknown'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Mileage</div>
                <div className="text-sm font-medium">
                    <span>{typeof pickup.mileage === 'number' ? pickup.mileage.toLocaleString() : 'Unknown'}</span>
                    {isHighMileage && (
                        <span className="ml-1.5 text-amber-500" title="High mileage">
                            <i className="fas fa-exclamation-triangle"></i>
                        </span>
                    )}
                </div>
            </div>
        </CardSection>
    )
}
export default PickupTrucksCard
