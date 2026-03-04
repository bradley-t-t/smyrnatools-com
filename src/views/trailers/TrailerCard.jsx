import React from 'react'

import CardSection from '../../app/components/sections/CardSection'
import { TrailerUtility } from '../../utils/TrailerUtility'

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
    const isServiceOverdue = TrailerUtility.isServiceOverdue(trailer.lastServiceDate)

    let statusColor = 'var(--accent)'
    if (trailer.status === 'Active') statusColor = 'var(--status-active)'
    else if (trailer.status === 'Spare') statusColor = 'var(--status-spare)'
    else if (trailer.status === 'In Shop') statusColor = 'var(--status-inshop)'
    else if (trailer.status === 'Retired') statusColor = 'var(--status-retired)'
    else if (TrailerUtility.isServiceOverdue(trailer.lastServiceDate)) statusColor = 'var(--error)'

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
            <div className="detail-row">
                <div className="detail-label">Plant</div>
                <div className="detail-value">{plantName}</div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Trailer Type</div>
                <div className="detail-value">{trailer.trailerType || 'Unknown'}</div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Status</div>
                <div className="detail-value">{trailer.status || 'Unknown'}</div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Last Service</div>
                <div className={`detail-value ${trailer.lastServiceDate && isServiceOverdue ? 'overdue' : ''}`}>
                    {trailer.lastServiceDate ? new Date(trailer.lastServiceDate).toLocaleDateString() : 'Unknown'}
                </div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Cleanliness</div>
                <div className="detail-value">
                    {trailer.cleanlinessRating ? (
                        <div className="stars-container">
                            {[...Array(5)].map((_, i) => (
                                <i
                                    key={i}
                                    className={`fas fa-star ${i < trailer.cleanlinessRating ? 'filled-star' : 'empty-star'}`}
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
