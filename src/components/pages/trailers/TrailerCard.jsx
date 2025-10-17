import React from 'react';
import {TrailerUtility} from '../../../utils/TrailerUtility';
import CardSection from '../../sections/CardSection';

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
    const actualTractorName = tractorName || operatorName;
    const actualShowWarning = showTractorWarning || showOperatorWarning;
    const isServiceOverdue = TrailerUtility.isServiceOverdue(trailer.lastServiceDate);

    let statusColor = 'var(--accent)';
    if (trailer.status === 'Active') statusColor = 'var(--status-active)';
    else if (trailer.status === 'Spare') statusColor = 'var(--status-spare)';
    else if (trailer.status === 'In Shop') statusColor = 'var(--status-inshop)';
    else if (trailer.status === 'Retired') statusColor = 'var(--status-retired)';
    else if (TrailerUtility.isServiceOverdue(trailer.lastServiceDate)) statusColor = 'var(--error)';

    return (
        <CardSection
            item={trailer}
            itemType="Trailer"
            itemNumber={trailer.trailerNumber}
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
                <div className="detail-label">Assigned Tractor</div>
                <div className="detail-value">
                    {actualTractorName}
                    {actualShowWarning && (
                        <span className="warning-badge" title="Assigned to multiple trailers">
                            <i className="fas fa-exclamation-triangle"></i>
                        </span>
                    )}
                </div>
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
                    ) : 'Not Rated'}
                </div>
            </div>
        </CardSection>
    );
}

export default TrailerCard;