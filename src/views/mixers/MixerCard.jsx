import React from 'react';
import MixerUtility from '../../utils/MixerUtility';
import CardSection from '../../components/sections/CardSection';

function MixerCard({
                       mixer,
                       operatorName,
                       plantName,
                       showOperatorWarning,
                       onSelect,
                       onShowCommentModal,
                       onShowIssueModal
                   }) {
    const isServiceOverdue = MixerUtility.isServiceOverdue(mixer.lastServiceDate);
    const isChipOverdue = MixerUtility.isChipOverdue(mixer.lastChipDate);
    const isVerified = typeof mixer.isVerified === 'function'
        ? mixer.isVerified(mixer.latestHistoryDate)
        : MixerUtility.isVerified(mixer.updatedLast, mixer.updatedAt, mixer.updatedBy, mixer.latestHistoryDate);

    let statusColor = 'var(--accent)';
    if (mixer.status === 'Active') statusColor = 'var(--status-active)';
    else if (mixer.status === 'Spare') statusColor = 'var(--status-spare)';
    else if (mixer.status === 'In Shop') statusColor = 'var(--status-inshop)';
    else if (mixer.status === 'Retired') statusColor = 'var(--status-retired)';
    else if (MixerUtility.isServiceOverdue(mixer.lastServiceDate)) statusColor = 'var(--error)';

    const verificationTooltip = !mixer.updatedLast || !mixer.updatedBy
        ? 'Mixer never verified'
        : mixer.latestHistoryDate && new Date(mixer.latestHistoryDate) > new Date(mixer.updatedLast)
            ? 'Changes recorded in history since last verification'
            : 'Mixer not verified since last Sunday';

    return (
        <CardSection
            item={mixer}
            itemType="Mixer"
            itemNumber={mixer.truckNumber}
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
                <div className="detail-value">{mixer.status || 'Unknown'}</div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Operator</div>
                <div className="detail-value">
                    {operatorName}
                    {showOperatorWarning && (
                        <span className="warning-badge" title="Assigned to multiple mixers">
                            <i className="fas fa-exclamation-triangle"></i>
                        </span>
                    )}
                </div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Employee ID</div>
                <div className="detail-value">{mixer.operatorSmyrnaId || 'Not Assigned'}</div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Last Service</div>
                <div className={`detail-value ${mixer.lastServiceDate && isServiceOverdue ? 'overdue' : ''}`}>
                    {mixer.lastServiceDate ? new Date(mixer.lastServiceDate).toLocaleDateString() : 'Unknown'}
                </div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Last Chip</div>
                <div className={`detail-value ${mixer.lastChipDate && isChipOverdue ? 'overdue' : ''}`}>
                    {mixer.lastChipDate ? new Date(mixer.lastChipDate).toLocaleDateString() : 'Unknown'}
                </div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Cleanliness</div>
                <div className="detail-value">
                    {mixer.cleanlinessRating ? (
                        <div className="stars-container">
                            {[...Array(5)].map((_, i) => (
                                <i
                                    key={i}
                                    className={`fas fa-star ${i < mixer.cleanlinessRating ? 'filled-star' : 'empty-star'}`}
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

export default MixerCard;
