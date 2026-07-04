import React, { useState } from 'react'

import RoleModal, {
    RoleFormField,
    RoleModalBody,
    RoleModalFooter,
    RoleTextInput
} from '../../../../app/components/ui/RoleModal'

/** Modal for bulk-adding a permission to one or more roles. */
const BulkAddModal = ({ isOpen, onClose, roles, onBulkAdd, accentColor: _accentColor }) => {
    const [permission, setPermission] = useState('')
    const [selectedRoleIds, setSelectedRoleIds] = useState(new Set())
    const [saving, setSaving] = useState(false)

    const toggleRole = (id) => {
        setSelectedRoleIds((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const selectAll = () => {
        setSelectedRoleIds(new Set(roles.map((r) => r.id)))
    }

    const selectNone = () => {
        setSelectedRoleIds(new Set())
    }

    const handleSubmit = async () => {
        if (!permission.trim() || selectedRoleIds.size === 0) return
        setSaving(true)
        await onBulkAdd(selectedRoleIds, permission.trim())
        setSaving(false)
        setPermission('')
        setSelectedRoleIds(new Set())
        onClose()
    }

    if (!isOpen) return null

    const sortedRoles = [...roles].sort((a, b) => (b.weight || 0) - (a.weight || 0))
    const alreadyHave = sortedRoles.filter(
        (r) => permission.trim() && Array.isArray(r.permissions) && r.permissions.includes(permission.trim())
    )

    return (
        <RoleModal isOpen={isOpen} onClose={onClose} title="Bulk Add Permission">
            <RoleModalBody>
                <RoleFormField label="Permission Node">
                    <RoleTextInput
                        value={permission}
                        onChange={setPermission}
                        placeholder="e.g. reports.qc_strength"
                        autoFocus
                    />
                </RoleFormField>
                {permission.trim() && alreadyHave.length > 0 && (
                    <div className="-mt-2 mb-2 px-1 text-xs text-text-tertiary">
                        Already on: {alreadyHave.map((r) => r.name).join(', ')}
                    </div>
                )}
                <RoleFormField label="Add to Roles">
                    <div className="mb-2 flex items-center gap-2">
                        <button type="button"
                            onClick={selectAll}
                            className="rounded-md bg-bg-tertiary px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors duration-150 hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.97]"
                        >
                            Select All
                        </button>
                        <button type="button"
                            onClick={selectNone}
                            className="rounded-md bg-bg-tertiary px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors duration-150 hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.97]"
                        >
                            Select None
                        </button>
                        <span className="ml-auto text-[11px] tabular-nums text-text-tertiary">
                            {selectedRoleIds.size} selected
                        </span>
                    </div>
                    <div className="max-h-[280px] overflow-y-auto rounded-md border border-border-light bg-bg-primary">
                        {sortedRoles.map((role) => {
                            const isSelected = selectedRoleIds.has(role.id)
                            const alreadyHasIt =
                                permission.trim() &&
                                Array.isArray(role.permissions) &&
                                role.permissions.includes(permission.trim())
                            return (
                                <label
                                    key={role.id}
                                    className={`flex cursor-pointer items-center gap-3 border-b border-border-light px-3 py-2.5 transition-colors duration-150 last:border-b-0 ${
                                        isSelected ? 'bg-accent/10' : 'hover:bg-bg-hover'
                                    } ${alreadyHasIt ? 'cursor-not-allowed opacity-40' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleRole(role.id)}
                                        disabled={alreadyHasIt}
                                        className="h-4 w-4 cursor-pointer rounded accent-accent disabled:cursor-not-allowed"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <span className="text-sm font-medium text-text-primary">{role.name}</span>
                                        <span className="ml-2 text-xs font-mono tabular-nums text-text-tertiary">
                                            w:{role.weight || 0}
                                        </span>
                                    </div>
                                    {alreadyHasIt && (
                                        <span className="shrink-0 text-[10px] uppercase tracking-wider text-text-tertiary">
                                            already has
                                        </span>
                                    )}
                                </label>
                            )
                        })}
                    </div>
                </RoleFormField>
            </RoleModalBody>
            <RoleModalFooter
                onCancel={onClose}
                onSubmit={handleSubmit}
                submitText={`Add to ${selectedRoleIds.size} Role${selectedRoleIds.size !== 1 ? 's' : ''}`}
                loadingText="Adding..."
                isLoading={saving}
                disabled={!permission.trim() || selectedRoleIds.size === 0}
            />
        </RoleModal>
    )
}

export default BulkAddModal
