import React from 'react'

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
    const isServiceOverdue = AssetStatsUtility.isServiceOverdue(trailer.lastServiceDate, 90)

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
                <div className="text-sm text-gray-500 dark:text-gray-400">Plant</div>
                <div className="text-sm font-medium">{plantName}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Trailer Type</div>
                <div className="text-sm font-medium">{trailer.trailerType || 'Unknown'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
                <div className="text-sm font-medium">{trailer.status || 'Unknown'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Last Service</div>
                <div
                    className={`text-sm font-medium ${trailer.lastServiceDate && isServiceOverdue ? 'text-red-600' : ''}`}
                >
                    {trailer.lastServiceDate ? new Date(trailer.lastServiceDate).toLocaleDateString() : 'Unknown'}
                </div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Cleanliness</div>
                <div className="text-sm font-medium">
                    {trailer.cleanlinessRating ? (
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <i
                                    key={i}
                                    className={`fas fa-star ${i < trailer.cleanlinessRating ? 'text-yellow-400' : 'text-gray-300'}`}
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
export default TrailerCard
