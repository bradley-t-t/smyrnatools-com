import React from 'react'

import { getNamespace, NAMESPACE_COLORS, NAMESPACE_ICONS } from './permissionMeta'

/** Single permission row inside a role card. */
const PermissionRow = ({ permission, onRemove, hasITAccess, isSaving }) => {
    const ns = getNamespace(permission)
    const icon = NAMESPACE_ICONS[ns] || 'fa-key'
    const bgColor = NAMESPACE_COLORS[ns] || 'bg-bg-tertiary'
    return (
        <div className="group flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors duration-150 hover:bg-bg-hover">
            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${bgColor}`}>
                <i className={`fas ${icon} text-[8px] text-white`} aria-hidden="true" />
            </div>
            <span className="flex-1 font-mono text-[13px] text-text-primary">{permission}</span>
            {hasITAccess && (
                <button type="button"
                    onClick={() => onRemove(permission)}
                    disabled={isSaving}
                    className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-text-tertiary opacity-0 transition-all duration-150 hover:bg-status-danger/15 hover:text-status-danger group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-danger active:scale-[0.92] disabled:opacity-30 disabled:active:scale-100"
                    title="Remove permission"
                    aria-label={`Remove permission ${permission}`}
                >
                    <i className="fas fa-times text-[10px]" aria-hidden="true" />
                </button>
            )}
        </div>
    )
}

export default PermissionRow
