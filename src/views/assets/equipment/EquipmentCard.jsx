import React from 'react'

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
    const isServiceOverdue = AssetStatsUtility.isServiceOverdue(equipment.lastServiceDate)
    // Verification can be a method (attached at runtime) or computed statically via VerifiedUtility.
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
                <div className="text-sm text-gray-500 dark:text-gray-400">Plant</div>
                <div className="text-sm font-medium">{plantName}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
                <div className="text-sm font-medium">{equipment.status || 'Unknown'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Type</div>
                <div className="text-sm font-medium">{equipment.equipmentType || 'Not Assigned'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Last Service</div>
                <div
                    className={`text-sm font-medium ${equipment.lastServiceDate && isServiceOverdue ? 'text-red-600' : ''}`}
                >
                    {equipment.lastServiceDate ? new Date(equipment.lastServiceDate).toLocaleDateString() : 'Unknown'}
                </div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Hours/Mileage</div>
                <div className="text-sm font-medium">
                    {equipment.hoursMileage ? equipment.hoursMileage : 'Not Recorded'}
                </div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Cleanliness</div>
                <div className="text-sm font-medium">
                    {equipment.cleanlinessRating ? (
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <i
                                    key={i}
                                    className={`fas fa-star ${i < equipment.cleanlinessRating ? 'text-yellow-400' : 'text-gray-300'}`}
                                    aria-hidden="true"
                                ></i>
                            ))}
                        </div>
                    ) : (
                        'Not Rated'
                    )}
                </div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Condition</div>
                <div className="text-sm font-medium">
                    {equipment.conditionRating ? (
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <i
                                    key={i}
                                    className={`fas fa-star ${i < equipment.conditionRating ? 'text-yellow-400' : 'text-gray-300'}`}
                                    aria-hidden="true"
                                ></i>
                            ))}
                        </div>
                    ) : (
                        'Not Rated'
                    )}
                </div>
            </div>
        </CardSection>
    )
}
export default EquipmentCard
