import React from 'react';
import CardSection from '../../components/sections/CardSection';
import './styles/Operators.css';
import ThemeUtility from '../../utils/ThemeUtility';
import formatUtility from '../../utils/FormatUtility';
import GrammarUtility from '../../utils/GrammarUtility';

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
    if (!operator) return null;
    const statusColor = ThemeUtility.operatorStatusColors[operator.status] || ThemeUtility.operatorStatusColors.default;

    let trainerName = 'None';
    if (
        operator.assignedTrainer &&
        operator.assignedTrainer !== '0' &&
        Array.isArray(trainers)
    ) {
        const trainerObj = trainers.find(t => t.employeeId === operator.assignedTrainer);
        trainerName = trainerObj ? trainerObj.name : 'Unknown';
    }

    const hasScheduledOff = Array.isArray(operator.daysOff) && operator.daysOff.length > 0;
    const displayRating = typeof rating === 'number' ? rating : (typeof operator.rating === 'number' ? operator.rating : Number(operator.rating) || 0);

    return (
        <CardSection
            item={operator}
            itemType="Operator"
            itemNumber={operator.name}
            onSelect={onSelect ? () => onSelect(operator) : undefined}
            statusColor={statusColor}
        >
            {hasScheduledOff && (
                <span className="operator-scheduledoff-icon">
                    <i className="fas fa-calendar-alt"></i>
                </span>
            )}
            {isDuplicateName && (
                <i
                    className="fas fa-exclamation-triangle duplicate-warning-icon"
                    title="Duplicate name"
                    aria-label="Duplicate name"
                ></i>
            )}
            {children}
            <div className="detail-row">
                <div className="detail-label">Plant</div>
                <div className="detail-value">{plantName || 'None'}</div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Status</div>
                <div className="detail-value">{operator.status || 'Unknown'}</div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Employee ID</div>
                <div className="detail-value">{operator.smyrnaId || 'Not Assigned'}</div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Phone</div>
                <div className="detail-value">{operator.phone ? GrammarUtility.formatPhone(operator.phone) : 'Not Set'}</div>
            </div>
            {operator.status === 'Pending Start' && (
                <div className="detail-row">
                    <div className="detail-label">Pending Start Date</div>
                    <div className="detail-value">
                        {operator.pendingStartDate
                            ? formatUtility.formatDate(operator.pendingStartDate)
                            : 'Not Set'}
                    </div>
                </div>
            )}
            <div className="detail-row">
                <div className="detail-label">Role</div>
                <div className="detail-value">
                    {operator.isTrainer ? (
                        <span className="trainer-badge">Trainer</span>
                    ) : 'Operator'}
                </div>
            </div>
            {operator.position && (
                <div className="detail-row">
                    <div className="detail-label">Position</div>
                    <div className="detail-value">{operator.position || 'Not Specified'}</div>
                </div>
            )}
            {!operator.isTrainer && operator.status !== 'Active' && (
                <div className="detail-row">
                    <div className="detail-label">Trainer</div>
                    <div className="detail-value">{trainerName}</div>
                </div>
            )}
            <div className="detail-row">
                <div className="detail-label">Rating</div>
                <div className="detail-value">
                    <div className="stars-container">
                        {[...Array(5)].map((_, i) => (
                            <i
                                key={i}
                                className={`fas fa-star ${i < displayRating ? 'filled-star' : 'empty-star'}`}
                                aria-hidden="true"
                            ></i>
                        ))}
                    </div>
                </div>
            </div>
        </CardSection>
    );
}

export default OperatorCard;
