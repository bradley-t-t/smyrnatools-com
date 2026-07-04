import React from 'react'

import StarRating from '../../../app/components/common/StarRating'
import CardSection from '../../../app/components/sections/CardSection'
import AssetStatsUtility from '../../../utils/AssetStatsUtility'
import VerifiedUtility from '../../../utils/VerifiedUtility'

/** Maps equipment status to card accent color. */
const STATUS_COLORS = {
    Active: 'var(--status-active)',
    'In Shop': 'var(--status-inshop)',
    Retired: 'var(--status-retired)',
    Spare: 'var(--status-spare)'
}

/**
 * Grid-mode card for a single equipment item. Displays key details
 * (plant, status, type, service date, hours/mileage, cleanliness, condition)
 * along with verification state and status-colored accent. Delegates
 * layout and interaction chrome to the shared CardSection component.
 */
function EquipmentCard({ equipment, plantName, onSelect, onShowCommentModal, onShowIssueModal }) {
    const isVerified =
        typeof equipment.isVerified === 'function'
            ? equipment.isVerified(equipment.latestHistoryDate)
            : VerifiedUtility.isVerified(equipment.updatedLast, equipment.updatedAt, equipment.updatedBy)

    const statusColor =
        STATUS_COLORS[equipment.status] ??
        (AssetStatsUtility.isServiceOverdue(equipment.lastServiceDate) ? 'var(--error)' : 'var(--accent)')

    const verificationTooltip =
        !equipment.updatedLast || !equipment.updatedBy
            ? 'Equipment never verified'
            : equipment.latestHistoryDate && new Date(equipment.latestHistoryDate) > new Date(equipment.updatedLast)
              ? 'Changes recorded in history since last verification'
              : 'Equipment not verified since last Monday'
    return (
        <CardSection
            item={equipment}
            itemType={equipment.equipmentType}
            itemNumber={equipment.identifyingNumber}
            onSelect={onSelect}
            onShowCommentModal={onShowCommentModal}
            onShowIssueModal={onShowIssueModal}
            statusColor={statusColor}
            isVerified={isVerified}
            verificationTooltip={verificationTooltip}
        >
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Plant</div>
                <div className="text-sm font-medium">{plantName}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Status</div>
                <div className="text-sm font-medium">{equipment.status || 'Unknown'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Type</div>
                <div className="text-sm font-medium">{equipment.equipmentType || 'Not Assigned'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Last Service</div>
                <div className="text-sm font-medium">
                    {equipment.lastServiceDate ? new Date(equipment.lastServiceDate).toLocaleDateString() : 'Unknown'}
                </div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Hours/Mileage</div>
                <div className="text-sm font-medium">
                    {equipment.hoursMileage ? equipment.hoursMileage : 'Not Recorded'}
                </div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Cleanliness</div>
                <StarRating value={equipment.cleanlinessRating} tone="warning" size="sm" />
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Condition</div>
                <StarRating value={equipment.conditionRating} tone="warning" size="sm" />
            </div>
        </CardSection>
    )
}
export default EquipmentCard
