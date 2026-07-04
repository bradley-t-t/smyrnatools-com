import React from 'react'

import Badge from '../../../app/components/common/Badge'
import PhoneLink from '../../../app/components/common/PhoneLink'
import StarRating from '../../../app/components/common/StarRating'
import CardSection from '../../../app/components/sections/CardSection'
import DateUtility from '../../../utils/DateUtility'

/** Maps operator lifecycle statuses to their card accent colors. */
const STATUS_COLORS = {
    active: '#10b981',
    default: '#64748b',
    inactive: '#ef4444',
    terminated: '#6b7280'
}

/**
 * Grid-mode card for a single operator. Displays plant, status, employee ID,
 * phone, trainer badge, position, star rating, scheduled-off icon, and a
 * duplicate-name warning when applicable.
 */
function OperatorCard({
    operator,
    plantName,
    onSelect,
    onDelete: _onDelete,
    trainers,
    children,
    rating,
    isDuplicateName
}) {
    if (!operator) return null
    const statusColor = STATUS_COLORS[operator.status] || STATUS_COLORS.default
    let trainerName = 'None'
    if (operator.assignedTrainer && operator.assignedTrainer !== '0' && Array.isArray(trainers)) {
        const trainerObj = trainers.find((t) => t.employeeId === operator.assignedTrainer)
        trainerName = trainerObj ? trainerObj.name : 'Unknown'
    }
    const hasScheduledOff = Array.isArray(operator.daysOff) && operator.daysOff.length > 0
    const displayRating =
        typeof rating === 'number'
            ? rating
            : typeof operator.rating === 'number'
              ? operator.rating
              : Number(operator.rating) || 0
    return (
        <CardSection
            item={operator}
            itemType="Operator"
            itemNumber={operator.name}
            onSelect={onSelect ? () => onSelect(operator) : undefined}
            statusColor={statusColor}
        >
            {hasScheduledOff && (
                <Badge
                    tone="accent"
                    size="sm"
                    shape="pill"
                    icon="calendar-alt"
                    title="Has scheduled days off"
                    aria-label="Has scheduled days off"
                    className="absolute top-2 right-2"
                />
            )}
            {isDuplicateName && (
                <Badge
                    tone="warning"
                    size="sm"
                    shape="pill"
                    icon="exclamation-triangle"
                    title="Duplicate name"
                    aria-label="Duplicate name"
                    className="absolute top-2 right-8"
                />
            )}
            {children}
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Plant</div>
                <div className="text-sm font-medium">{plantName || 'None'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Status</div>
                <div className="text-sm font-medium">{operator.status || 'Unknown'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Employee ID</div>
                <div className="text-sm font-medium">{operator.smyrnaId || 'Not Assigned'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Phone</div>
                <div className="text-sm font-medium">
                    {operator.phone ? <PhoneLink phone={operator.phone} /> : 'Not Set'}
                </div>
            </div>
            {operator.status === 'Pending Start' && (
                <div className="flex justify-between items-center py-1">
                    <div className="text-sm text-text-secondary">Pending Start Date</div>
                    <div className="text-sm font-medium">
                        {operator.pendingStartDate ? DateUtility.formatDate(operator.pendingStartDate) : 'Not Set'}
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Role</div>
                <div className="text-sm font-medium">
                    {operator.isTrainer ? (
                        <Badge
                            tone="accent"
                            size="md"
                            shape="pill"
                            weight="semibold"
                            uppercase={false}
                            icon="graduation-cap"
                        >
                            Trainer
                        </Badge>
                    ) : (
                        'Operator'
                    )}
                </div>
            </div>
            {operator.position && (
                <div className="flex justify-between items-center py-1">
                    <div className="text-sm text-text-secondary">Position</div>
                    <div className="text-sm font-medium">{operator.position || 'Not Specified'}</div>
                </div>
            )}
            {!operator.isTrainer && operator.status !== 'Active' && (
                <div className="flex justify-between items-center py-1">
                    <div className="text-sm text-text-secondary">Trainer</div>
                    <div className="text-sm font-medium">{trainerName}</div>
                </div>
            )}
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Rating</div>
                <StarRating value={displayRating} tone="warning" size="sm" />
            </div>
        </CardSection>
    )
}
export default OperatorCard
