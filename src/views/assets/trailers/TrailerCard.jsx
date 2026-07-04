import React from 'react'

import StarRating from '../../../app/components/common/StarRating'
import CardSection from '../../../app/components/sections/CardSection'
import AssetStatsUtility from '../../../utils/AssetStatsUtility'

/** Maps trailer status to card accent color. */
const STATUS_COLORS = {
    Active: 'var(--status-active)',
    'In Shop': 'var(--status-inshop)',
    Retired: 'var(--status-retired)',
    Spare: 'var(--status-spare)'
}

/**
 * Grid-mode card for a single trailer. Displays plant, trailer type, status,
 * service overdue warning, assigned tractor/operator with multi-assignment
 * warning, and cleanliness rating.
 */
function TrailerCard({
    trailer,
    tractorName,
    operatorName,
    plantName,
    showTractorWarning,
    showOperatorWarning,
    onSelect,
    onShowCommentModal,
    onShowIssueModal
}) {
    const actualTractorName = tractorName || operatorName
    const actualShowWarning = showTractorWarning || showOperatorWarning

    const statusColor =
        STATUS_COLORS[trailer.status] ??
        (AssetStatsUtility.isServiceOverdue(trailer.lastServiceDate, 90) ? 'var(--error)' : 'var(--accent)')

    return (
        <CardSection
            item={trailer}
            itemType="Trailer"
            itemNumber={trailer.trailerNumber}
            subtitle={actualTractorName || 'Not Assigned'}
            subtitleWarning={actualShowWarning ? 'Assigned to multiple trailers' : null}
            onSelect={onSelect}
            onShowCommentModal={onShowCommentModal}
            onShowIssueModal={onShowIssueModal}
            statusColor={statusColor}
        >
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Plant</div>
                <div className="text-sm font-medium">{plantName}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Trailer Type</div>
                <div className="text-sm font-medium">{trailer.trailerType || 'Unknown'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Status</div>
                <div className="text-sm font-medium">{trailer.status || 'Unknown'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Last Service</div>
                <div className="text-sm font-medium">
                    {trailer.lastServiceDate ? new Date(trailer.lastServiceDate).toLocaleDateString() : 'Unknown'}
                </div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Cleanliness</div>
                <StarRating value={trailer.cleanlinessRating} tone="warning" size="sm" />
            </div>
        </CardSection>
    )
}
export default TrailerCard
