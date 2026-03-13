import React from 'react'

import CardSection from '../../../app/components/sections/CardSection'
import AssetStatsUtility from '../../../utils/AssetStatsUtility'
import VerifiedUtility from '../../../utils/VerifiedUtility'
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
    const isServiceOverdue = AssetStatsUtility.isServiceOverdue(tractor.lastServiceDate)
    const isVerified =
        typeof tractor.isVerified === 'function'
            ? tractor.isVerified(tractor.latestHistoryDate)
            : VerifiedUtility.isVerified(tractor.updatedLast, tractor.updatedAt, tractor.updatedBy)
    let statusColor = 'var(--accent)'
    if (tractor.status === 'Active') statusColor = 'var(--status-active)'
    else if (tractor.status === 'Spare') statusColor = 'var(--status-spare)'
    else if (tractor.status === 'In Shop') statusColor = 'var(--status-inshop)'
    else if (tractor.status === 'Retired') statusColor = 'var(--status-retired)'
    else if (AssetStatsUtility.isServiceOverdue(tractor.lastServiceDate)) statusColor = 'var(--error)'
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
            <div className="detail-row">
                <div className="detail-label">Plant</div>
                <div className="detail-value">{plantName}</div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Status</div>
                <div className="detail-value">{tractor.status || 'Unknown'}</div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Last Service</div>
                <div className={`detail-value ${tractor.lastServiceDate && isServiceOverdue ? 'overdue' : ''}`}>
                    {tractor.lastServiceDate ? new Date(tractor.lastServiceDate).toLocaleDateString() : 'Unknown'}
                </div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Has Blower</div>
                <div className="detail-value">{tractor.hasBlower ? 'Yes' : 'No'}</div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Cleanliness</div>
                <div className="detail-value">
                    {tractor.cleanlinessRating ? (
                        <div className="stars-container">
                            {[...Array(5)].map((_, i) => (
                                <i
                                    key={i}
                                    className={`fas fa-star ${i < tractor.cleanlinessRating ? 'filled-star' : 'empty-star'}`}
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
export default TractorCard
