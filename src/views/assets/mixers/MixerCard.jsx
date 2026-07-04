import React from 'react'

import Badge from '../../../app/components/common/Badge'
import StarRating from '../../../app/components/common/StarRating'
import CardSection from '../../../app/components/sections/CardSection'
import AssetStatsUtility from '../../../utils/AssetStatsUtility'
import VerifiedUtility from '../../../utils/VerifiedUtility'

/** Maps mixer status to card accent color. Shop sub-statuses handled separately. */
const STATUS_COLORS = {
    Active: 'var(--status-active)',
    'In Shop': 'var(--status-shop)',
    Retired: 'var(--text-tertiary)',
    Spare: 'var(--status-spare)'
}

/** Shop sub-status overrides for In Shop mixers (drawn from semantic tokens). */
const SHOP_SUB_STATUS_COLORS = {
    down_in_yard: 'var(--status-danger)',
    ready_for_pickup: 'var(--status-active)',
    third_party: 'var(--status-spare)',
    waiting_for_shop: 'var(--status-warning)'
}

const DEFAULT_STATUS_COLOR = 'var(--accent)'
const OVERDUE_STATUS_COLOR = 'var(--status-danger)'

/**
 * Grid-mode card for a single mixer. Displays plant, operator, status
 * (with In Shop sub-statuses), service/chip overdue warnings, cleanliness
 * rating with a "DIRTY" badge when below 3 stars, and verification state.
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
    const isVerified =
        typeof mixer.isVerified === 'function'
            ? mixer.isVerified(mixer.latestHistoryDate)
            : VerifiedUtility.isVerified(mixer.updatedLast, mixer.updatedAt, mixer.updatedBy)

    /** Shop sub-status overrides the base In Shop color when one is set. */
    const resolveStatusColor = () => {
        if (mixer.status === 'In Shop' && SHOP_SUB_STATUS_COLORS[mixer.shopStatus]) {
            return SHOP_SUB_STATUS_COLORS[mixer.shopStatus]
        }
        return (
            STATUS_COLORS[mixer.status] ??
            (AssetStatsUtility.isServiceOverdue(mixer.lastServiceDate) ? OVERDUE_STATUS_COLOR : DEFAULT_STATUS_COLOR)
        )
    }
    const statusColor = resolveStatusColor()

    const getDisplayStatus = () => {
        if (mixer.status !== 'In Shop') return mixer.status || 'Unknown'
        switch (mixer.shopStatus) {
            case 'down_in_yard':
                return 'Down In Yard'
            case 'waiting_for_shop':
                return 'Waiting For Shop'
            case 'third_party':
                return 'Third Party Work'
            case 'ready_for_pickup':
                return 'Ready For Pickup'
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
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Plant</div>
                <div className="text-sm font-medium text-text-primary">{plantName}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Status</div>
                <div className="text-sm font-medium flex items-center gap-2 text-text-primary">
                    <span>{getDisplayStatus()}</span>
                </div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Last Service</div>
                <div className="text-sm font-medium text-text-primary">
                    {mixer.lastServiceDate ? new Date(mixer.lastServiceDate).toLocaleDateString() : 'Unknown'}
                </div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Last Chip</div>
                <div className="text-sm font-medium text-text-primary">
                    {mixer.lastChipDate ? new Date(mixer.lastChipDate).toLocaleDateString() : 'Unknown'}
                </div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Cleanliness</div>
                {mixer.status === 'Retired' ? (
                    <span className="text-sm text-text-secondary">N/A</span>
                ) : (
                    <div className="flex items-center gap-2">
                        <StarRating value={mixer.cleanlinessRating} tone="warning" size="sm" />
                        {mixer.cleanlinessRating > 0 && mixer.cleanlinessRating < 3 && (
                            <Badge
                                tone="danger"
                                size="md"
                                shape="rounded-md"
                                title="This truck cannot run loads until the cleanliness is 3 stars or better. Do not ignore this warning."
                                className="cursor-help"
                            >
                                Dirty
                            </Badge>
                        )}
                    </div>
                )}
            </div>
        </CardSection>
    )
}

export default MixerCard
