import React from 'react'

import StarRating from '../../../app/components/common/StarRating'
import CardSection from '../../../app/components/sections/CardSection'
import AssetStatsUtility from '../../../utils/AssetStatsUtility'
import VerifiedUtility from '../../../utils/VerifiedUtility'

/** Maps tractor status to card accent color. */
const STATUS_COLORS = {
    Active: 'var(--status-active)',
    'In Shop': 'var(--status-inshop)',
    Retired: 'var(--status-retired)',
    Spare: 'var(--status-spare)'
}

/**
 * Grid-mode card for a single tractor. Displays plant, operator, status,
 * service overdue warning, blower indicator, cleanliness rating, and
 * verification state with tooltip.
 */
function TractorCard({
    tractor,
    operatorName,
    plantName,
    showOperatorWarning,
    onSelect,
    onShowCommentModal,
    onShowIssueModal
}) {
    const isVerified =
        typeof tractor.isVerified === 'function'
            ? tractor.isVerified(tractor.latestHistoryDate)
            : VerifiedUtility.isVerified(tractor.updatedLast, tractor.updatedAt, tractor.updatedBy)

    const statusColor =
        STATUS_COLORS[tractor.status] ??
        (AssetStatsUtility.isServiceOverdue(tractor.lastServiceDate) ? 'var(--error)' : 'var(--accent)')

    const verificationTooltip =
        !tractor.updatedLast || !tractor.updatedBy
            ? 'Tractor never verified'
            : tractor.latestHistoryDate && new Date(tractor.latestHistoryDate) > new Date(tractor.updatedLast)
              ? 'Changes recorded in history since last verification'
              : 'Tractor not verified since last Sunday'
    return (
        <CardSection
            item={tractor}
            itemType="Tractor"
            itemNumber={tractor.truckNumber}
            subtitle={operatorName || 'Not Assigned'}
            subtitleWarning={showOperatorWarning ? 'Assigned to multiple tractors' : null}
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
                <div className="text-sm font-medium">{tractor.status || 'Unknown'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Last Service</div>
                <div className="text-sm font-medium">
                    {tractor.lastServiceDate ? new Date(tractor.lastServiceDate).toLocaleDateString() : 'Unknown'}
                </div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Has Blower</div>
                <div className="text-sm font-medium">{tractor.hasBlower ? 'Yes' : 'No'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Cleanliness</div>
                <StarRating value={tractor.cleanlinessRating} tone="warning" size="sm" />
            </div>
        </CardSection>
    )
}
export default TractorCard
