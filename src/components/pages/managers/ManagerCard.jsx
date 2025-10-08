import React from 'react';
import './styles/Managers.css';
import ThemeUtility from '../../../utils/ThemeUtility';

function ManagerCard({manager, plantName, onSelect}) {
    const roleColor = ThemeUtility.getRoleColor(manager.roleName, manager.roleWeight);

    const handleCardClick = () => {
        if (onSelect && typeof onSelect === 'function') {
            onSelect(manager);
        }
    };

    const cardProps = onSelect ? {onClick: handleCardClick} : {};

    return (
        <div className="manager-card" {...cardProps}>
            <div
                className="card-status-indicator"
                style={{
                    backgroundColor: roleColor
                }}
                title={manager.roleName || 'Unknown'}
            ></div>
            <div className="card-content">
                <div className="card-header">
                    <h3
                        className="manager-name"
                    >
                        {manager.firstName} {manager.lastName}
                    </h3>
                </div>
                <div className="card-details">
                    <div className="detail-row">
                        <div className="detail-label">Email</div>
                        <div className="detail-value">{manager.email || 'Not Assigned'}</div>
                    </div>
                    <div className="detail-row">
                        <div className="detail-label">Plant</div>
                        <div className="detail-value">{plantName || 'None'}</div>
                    </div>
                    <div className="detail-row">
                        <div className="detail-label">Role</div>
                        <div className="detail-value">
                            <span
                                className="manager-role-badge"
                                style={{
                                    backgroundColor: roleColor
                                }}
                                title={`Role: ${manager.roleName}, Weight: ${manager.roleWeight || 0}`}
                            >
                                {manager.roleName || 'Unknown'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ManagerCard;