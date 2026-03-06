import React from 'react'

import CardSection from '../../app/components/sections/CardSection'
import MixerUtility from '../../utils/MixerUtility'
/**
 * Grid-mode card for a single mixer. Displays plant, operator, status
 * (with In Shop sub-statuses), service/chip overdue warnings, cleanliness
 * rating with a "DOWNED" badge when below 3 stars, and verification state.
 */
function MixerCard({
    mixer,
    operatorName,
    plantName,
    showOperatorWarning,
    onSelect,
    onShowCommentModal,
    onShowIssueModal
}) {
    const isServiceOverdue = MixerUtility.isServiceOverdue(mixer.lastServiceDate)
    const isChipOverdue = MixerUtility.isChipOverdue(mixer.lastChipDate)
    const isVerified =
        typeof mixer.isVerified === 'function'
            ? mixer.isVerified(mixer.latestHistoryDate)
            : MixerUtility.isVerified(mixer.updatedLast, mixer.updatedAt, mixer.updatedBy, mixer.latestHistoryDate)
    let statusColor = 'var(--accent)'
    if (mixer.status === 'Active') statusColor = 'var(--status-active)'
    else if (mixer.status === 'Spare') statusColor = 'var(--status-spare)'
    else if (mixer.status === 'In Shop' && mixer.shopStatus === 'down_in_yard') statusColor = 'var(--error)'
    else if (mixer.status === 'In Shop' && mixer.shopStatus === 'waiting_for_shop') statusColor = 'var(--warning)'
    else if (mixer.status === 'In Shop' && mixer.shopStatus === 'third_party') statusColor = '#7c3aed'
    else if (mixer.status === 'In Shop') statusColor = 'var(--status-inshop)'
    else if (mixer.status === 'Retired') statusColor = 'var(--status-retired)'
    else if (MixerUtility.isServiceOverdue(mixer.lastServiceDate)) statusColor = 'var(--error)'
    const getDisplayStatus = () => {
        if (mixer.status !== 'In Shop') return mixer.status || 'Unknown'
        switch (mixer.shopStatus) {
            case 'down_in_yard':
                return 'Down In Yard'
            case 'waiting_for_shop':
                return 'Waiting For Shop'
            case 'third_party':
                return 'Third Party Work'
            case 'in_shop':
            default:
                return 'In Shop'
        }
    }
    const verificationTooltip =
        !mixer.updatedLast || !mixer.updatedBy
            ? 'Mixer never verified'
            : mixer.latestHistoryDate && new Date(mixer.latestHistoryDate) > new Date(mixer.updatedLast)
              ? 'Changes recorded in history since last verification'
              : 'Mixer not verified since last Sunday'
    return (
        <CardSection
            item={mixer}
            itemType="Mixer"
            itemNumber={mixer.truckNumber}
            subtitle={operatorName || 'Not Assigned'}
            subtitleWarning={showOperatorWarning ? 'Assigned to multiple mixers' : null}
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
                <div className="detail-value" style={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
                    <span>{getDisplayStatus()}</span>
                </div>
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
                    {mixer.status === 'Retired' ? (
                        <span style={{ color: 'var(--text-secondary)' }}>N/A</span>
                    ) : mixer.cleanlinessRating ? (
                        <div style={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
                            <div className="stars-container">
                                {[...Array(5)].map((_, i) => (
                                    <i
                                        key={i}
                                        className={`fas fa-star ${i < mixer.cleanlinessRating ? 'filled-star' : 'empty-star'}`}
                                        aria-hidden="true"
                                    ></i>
                                ))}
                            </div>
                            {mixer.cleanlinessRating < 3 && (
                                <span
                                    className="downed-badge"
                                    title="This truck cannot run loads until the cleanliness is 3 stars or better. Do not ignore this warning."
                                    style={{
                                        backgroundColor: 'var(--error)',
                                        borderRadius: '4px',
                                        color: 'white',
                                        cursor: 'help',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        padding: '2px 6px'
                                    }}
                                >
                                    DOWNED
                                </span>
                            )}
                        </div>
                    ) : (
                        'Not Rated'
                    )}
                </div>
            </div>
        </CardSection>
    )
}
export default MixerCard
