import React from 'react'

import CardSection from '../../../app/components/sections/CardSection'
import DateUtility from '../../../utils/DateUtility'
import GrammarUtility from '../../../utils/GrammarUtility'

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
                <span className="absolute top-2 right-2 text-blue-500 text-xs">
                    <i className="fas fa-calendar-alt"></i>
                </span>
            )}
            {isDuplicateName && (
                <i
                    className="fas fa-exclamation-triangle absolute top-2 right-8 text-amber-500 text-xs"
                    title="Duplicate name"
                    aria-label="Duplicate name"
                ></i>
            )}
            {children}
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Plant</div>
                <div className="text-sm font-medium">{plantName || 'None'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
                <div className="text-sm font-medium">{operator.status || 'Unknown'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Employee ID</div>
                <div className="text-sm font-medium">{operator.smyrnaId || 'Not Assigned'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Phone</div>
                <div className="text-sm font-medium">
                    {operator.phone ? GrammarUtility.formatPhone(operator.phone) : 'Not Set'}
                </div>
            </div>
            {operator.status === 'Pending Start' && (
                <div className="flex justify-between items-center py-1">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Pending Start Date</div>
                    <div className="text-sm font-medium">
                        {operator.pendingStartDate ? DateUtility.formatDate(operator.pendingStartDate) : 'Not Set'}
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Role</div>
                <div className="text-sm font-medium">
                    {operator.isTrainer ? (
                        <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded">
                            Trainer
                        </span>
                    ) : (
                        'Operator'
                    )}
                </div>
            </div>
            {operator.position && (
                <div className="flex justify-between items-center py-1">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Position</div>
                    <div className="text-sm font-medium">{operator.position || 'Not Specified'}</div>
                </div>
            )}
            {!operator.isTrainer && operator.status !== 'Active' && (
                <div className="flex justify-between items-center py-1">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Trainer</div>
                    <div className="text-sm font-medium">{trainerName}</div>
                </div>
            )}
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Rating</div>
                <div className="text-sm font-medium">
                    <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                            <i
                                key={i}
                                className={`fas fa-star ${i < displayRating ? 'text-yellow-400' : 'text-gray-300'}`}
                                aria-hidden="true"
                            ></i>
                        ))}
                    </div>
                </div>
            </div>
        </CardSection>
    )
}
export default OperatorCard
