import React from 'react'
import { ListService } from '../../services/ListService'

function ListItemCard({ item, plantName, creatorName, onSelect, truncateText }) {
    const handleCardClick = () => {
        onSelect?.(item)
    }
    const formatDate = (dateString) => ListService.formatDate(dateString)
    const isOverdue = () => ListService.isOverdue(item)
    const statusClass = item.completed ? 'status-completed' : isOverdue() ? 'status-overdue' : 'status-pending'

    return (
        <div className={`list-item-card ${item.completed ? 'completed' : ''}`} onClick={onSelect && handleCardClick}>
            <div
                className={`card-status-indicator ${statusClass}`}
                title={item.completed ? 'Completed' : isOverdue() ? 'Overdue' : 'Pending'}
            />
            <div className="card-content">
                <div className="card-header">
                    <h3 className="item-description">
                        {truncateText ? ListService.truncateText(item.description, 5, true) : item.description}
                    </h3>
                </div>
                <div className="card-details">
                    <div className="detail-row">
                        <div className="detail-label">Plant</div>
                        <div className="detail-value" title={plantName || 'None'}>
                            {truncateText ? ListService.truncateText(plantName || 'None', 25) : plantName || 'None'}
                        </div>
                    </div>
                    <div className="detail-row">
                        <div className="detail-label">Deadline</div>
                        <div className="detail-value deadline">{formatDate(item.deadline)}</div>
                    </div>
                    <div className="detail-row">
                        <div className="detail-label">Created By</div>
                        <div className="detail-value" title={creatorName || 'Unknown'}>
                            {truncateText
                                ? ListService.truncateText(creatorName || 'Unknown', 20)
                                : creatorName || 'Unknown'}
                        </div>
                    </div>
                    <div className="detail-row">
                        <div className="detail-label">Status</div>
                        <div className="detail-value">
                            {item.completed ? (
                                <span className="completed-badge">Completed</span>
                            ) : isOverdue() ? (
                                <span className="overdue-badge">Overdue</span>
                            ) : (
                                <span className="pending-badge">Pending</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ListItemCard
