import React from 'react';
import {TractorUtility} from '../../../utils/TractorUtility';
import CardSection from '../../sections/CardSection';

function TractorCard({
    tractor,
    operatorName,
    plantName,
    showOperatorWarning,
    onSelect,
    onShowCommentModal,
    onShowIssueModal
}) {
    const isServiceOverdue = TractorUtility.isServiceOverdue(tractor.lastServiceDate);
    const isVerified = typeof tractor.isVerified === 'function'
        ? tractor.isVerified(tractor.latestHistoryDate)
        : TractorUtility.isVerified(tractor.updatedLast, tractor.updatedAt, tractor.updatedBy, tractor.latestHistoryDate);

    let statusColor = 'var(--accent)';
    if (tractor.status === 'Active') statusColor = 'var(--status-active)';
    else if (tractor.status === 'Spare') statusColor = 'var(--status-spare)';
    else if (tractor.status === 'In Shop') statusColor = 'var(--status-inshop)';
    else if (tractor.status === 'Retired') statusColor = 'var(--status-retired)';
    else if (TractorUtility.isServiceOverdue(tractor.lastServiceDate)) statusColor = 'var(--error)';

    const verificationTooltip = !tractor.updatedLast || !tractor.updatedBy
        ? 'Tractor never verified'
        : tractor.latestHistoryDate && new Date(tractor.latestHistoryDate) > new Date(tractor.updatedLast)
            ? 'Changes recorded in history since last verification'
            : 'Tractor not verified since last Sunday';

    return (
        <CardSection
            item={tractor}
            itemType="Tractor"
            itemNumber={tractor.truckNumber}
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
                <div className="detail-label">Operator</div>
                <div className="detail-value">
                    {operatorName}
                    {showOperatorWarning && (
                        <span className="warning-badge" title="Assigned to multiple tractors">
                            <i className="fas fa-exclamation-triangle"></i>
                        </span>
                    )}
                </div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Employee ID</div>
                <div className="detail-value">{tractor.operatorSmyrnaId || 'Not Assigned'}</div>
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
                    ) : 'Not Rated'}
                </div>
            </div>
        </CardSection>
    );
}

export default TractorCard;