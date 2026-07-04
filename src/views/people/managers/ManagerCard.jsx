import React from 'react'

import Badge from '../../../app/components/common/Badge'
import CardSection from '../../../app/components/sections/CardSection'
import { getRoleColor } from '../../../utils/RoleColorUtility'

/** Grid-mode card for a single manager displaying email, plant, and role badge. */
function ManagerCard({ manager, plantName, onSelect }) {
    const roleColor = getRoleColor(manager)
    return (
        <CardSection
            item={manager}
            itemType="Manager"
            itemNumber={`${manager.firstName} ${manager.lastName}`}
            onSelect={onSelect ? () => onSelect(manager) : undefined}
            statusColor={roleColor}
        >
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Email</div>
                <div className="text-sm font-medium">{manager.email || 'Not Assigned'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Plant</div>
                <div className="text-sm font-medium">{plantName || 'None'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Role</div>
                <div className="text-sm font-medium">
                    <Badge
                        variant="custom"
                        bg={roleColor}
                        fg="#ffffff"
                        size="md"
                        weight="semibold"
                        title={`Role: ${manager.roleName}, Weight: ${manager.roleWeight || 0}`}
                    >
                        {manager.roleName || 'Unknown'}
                    </Badge>
                </div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-text-secondary">Last Login</div>
                <div className="text-sm font-medium">
                    {manager.lastLoginAt
                        ? new Date(manager.lastLoginAt + 'T00:00:00').toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                          })
                        : 'Never'}
                </div>
            </div>
        </CardSection>
    )
}
export default ManagerCard
