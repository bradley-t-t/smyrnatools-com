import React from 'react'

import CardSection from '../../../app/components/sections/CardSection'
import AssetStatsUtility from '../../../utils/AssetStatsUtility'
import VerifiedUtility from '../../../utils/VerifiedUtility'

/** Maps mixer status to card accent color. Shop sub-statuses handled separately. */
const STATUS_COLORS = {
    Active: 'var(--status-active)',
    'In Shop': 'var(--status-inshop)',
    Retired: 'var(--status-retired)',
    Spare: 'var(--status-spare)'
}

/** Shop sub-status overrides for In Shop mixers. */
const SHOP_SUB_STATUS_COLORS = {
    down_in_yard: 'var(--error)',
    ready_for_pickup: 'var(--success)',
    third_party: '#7c3aed',
    waiting_for_shop: 'var(--warning)'
}

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
    const isServiceOverdue = AssetStatsUtility.isServiceOverdue(mixer.lastServiceDate)
    const isChipOverdue = AssetStatsUtility.isChipOverdue(mixer.lastChipDate)
    const isVerified =
        typeof mixer.isVerified === 'function'
            ? mixer.isVerified(mixer.latestHistoryDate)
            : VerifiedUtility.isVerified(mixer.updatedLast, mixer.updatedAt, mixer.updatedBy)

    // Resolve status color: shop sub-statuses override the base In Shop color
    const resolveStatusColor = () => {
        if (mixer.status === 'In Shop' && SHOP_SUB_STATUS_COLORS[mixer.shopStatus]) {
            return SHOP_SUB_STATUS_COLORS[mixer.shopStatus]
        }
        return (
            STATUS_COLORS[mixer.status] ??
            (AssetStatsUtility.isServiceOverdue(mixer.lastServiceDate) ? 'var(--error)' : 'var(--accent)')
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
                <div className="text-sm text-gray-500 dark:text-gray-400">Plant</div>
                <div className="text-sm font-medium">{plantName}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
                <div className="text-sm font-medium flex items-center gap-2">
                    <span>{getDisplayStatus()}</span>
                </div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Last Service</div>
                <div
                    className={`text-sm font-medium ${mixer.lastServiceDate && isServiceOverdue ? 'text-red-600' : ''}`}
                >
                    {mixer.lastServiceDate ? new Date(mixer.lastServiceDate).toLocaleDateString() : 'Unknown'}
                </div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Last Chip</div>
                <div className={`text-sm font-medium ${mixer.lastChipDate && isChipOverdue ? 'text-red-600' : ''}`}>
                    {mixer.lastChipDate ? new Date(mixer.lastChipDate).toLocaleDateString() : 'Unknown'}
                </div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Cleanliness</div>
                <div className="text-sm font-medium">
                    {mixer.status === 'Retired' ? (
                        <span className="text-[color:var(--text-secondary)]">N/A</span>
                    ) : mixer.cleanlinessRating ? (
                        <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <i
                                        key={i}
                                        className={`fas fa-star ${i < mixer.cleanlinessRating ? 'text-yellow-400' : 'text-gray-300'}`}
                                        aria-hidden="true"
                                    ></i>
                                ))}
                            </div>
                            {mixer.cleanlinessRating < 3 && (
                                <span
                                    title="This truck cannot run loads until the cleanliness is 3 stars or better. Do not ignore this warning."
                                    className="bg-[#fee2e2] text-[#dc2626] rounded text-[11px] font-bold px-1.5 py-0.5 cursor-help"
                                >
                                    DIRTY
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
