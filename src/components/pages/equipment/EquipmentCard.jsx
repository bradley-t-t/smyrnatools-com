import React from 'react';
import EquipmentUtility from '../../../utils/EquipmentUtility';
import CardSection from '../../sections/CardSection';

function EquipmentCard({equipment, plantName, onSelect, onShowCommentModal, onShowIssueModal}) {
    const isServiceOverdue = EquipmentUtility.isServiceOverdue(equipment.lastServiceDate);

    let statusColor = 'var(--accent)';
    if (equipment.status === 'Active') statusColor = 'var(--status-active)';
    else if (equipment.status === 'Spare') statusColor = 'var(--status-spare)';
    else if (equipment.status === 'In Shop') statusColor = 'var(--status-inshop)';
    else if (equipment.status === 'Retired') statusColor = 'var(--status-retired)';
    else if (EquipmentUtility.isServiceOverdue(equipment.lastServiceDate)) statusColor = 'var(--error)';

    return (
        <CardSection
            item={equipment}
            itemType={equipment.equipmentType}
            itemNumber={equipment.identifyingNumber}
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
                <div className="detail-label">Status</div>
                <div className="detail-value">{equipment.status || 'Unknown'}</div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Type</div>
                <div className="detail-value">{equipment.equipmentType || 'Not Assigned'}</div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Last Service</div>
                <div className={`detail-value ${equipment.lastServiceDate && isServiceOverdue ? 'overdue' : ''}`}>
                    {equipment.lastServiceDate ? new Date(equipment.lastServiceDate).toLocaleDateString() : 'Unknown'}
                </div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Hours/Mileage</div>
                <div className="detail-value">{equipment.hoursMileage ? equipment.hoursMileage : 'Not Recorded'}</div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Cleanliness</div>
                <div className="detail-value">
                    {equipment.cleanlinessRating ? (
                        <div className="stars-container">
                            {[...Array(5)].map((_, i) => (
                                <i
                                    key={i}
                                    className={`fas fa-star ${i < equipment.cleanlinessRating ? 'filled-star' : 'empty-star'}`}
                                    aria-hidden="true"
                                ></i>
                            ))}
                        </div>
                    ) : 'Not Rated'}
                </div>
            </div>
            <div className="detail-row">
                <div className="detail-label">Condition</div>
                <div className="detail-value">
                    {equipment.conditionRating ? (
                        <div className="stars-container">
                            {[...Array(5)].map((_, i) => (
                                <i
                                    key={i}
                                    className={`fas fa-star ${i < equipment.conditionRating ? 'filled-star' : 'empty-star'}`}
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

export default EquipmentCard;