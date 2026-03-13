import React from 'react'

import CardSection from '../../../app/components/sections/CardSection'

/** Grid-mode card for a single manager displaying email, plant, and role badge. */
function ManagerCard({ manager, plantName, onSelect }) {
    const roleColor = 'var(--accent)'
    return (
        <CardSection
            item={manager}
            itemType="Manager"
            itemNumber={`${manager.firstName} ${manager.lastName}`}
            onSelect={onSelect ? () => onSelect(manager) : undefined}
            statusColor={roleColor}
        >
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Email</div>
                <div className="text-sm font-medium">{manager.email || 'Not Assigned'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Plant</div>
                <div className="text-sm font-medium">{plantName || 'None'}</div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Role</div>
                <div className="text-sm font-medium">
                    <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-semibold text-white"
                        style={{ backgroundColor: roleColor }}
                        title={`Role: ${manager.roleName}, Weight: ${manager.roleWeight || 0}`}
                    >
                        {manager.roleName || 'Unknown'}
                    </span>
                </div>
            </div>
            <div className="flex justify-between items-center py-1">
                <div className="text-sm text-gray-500 dark:text-gray-400">Last Login</div>
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
