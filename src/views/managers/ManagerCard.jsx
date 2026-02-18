import React from 'react'

import CardSection from '../../app/components/sections/CardSection'

function ManagerCard({ manager, plantName, onSelect }) {
    const roleColor = '#1e3a5f'

    return (
        <CardSection
            item={manager}
            itemType="Manager"
            itemNumber={`${manager.firstName} ${manager.lastName}`}
            onSelect={onSelect ? () => onSelect(manager) : undefined}
            statusColor={roleColor}
        >
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
        </CardSection>
    )
}

export default ManagerCard
