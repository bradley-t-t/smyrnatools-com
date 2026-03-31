import React, { useCallback, useEffect, useMemo, useState } from 'react'

import LoadingScreen from '../../../app/components/common/LoadingScreen'
import TopSection from '../../../app/components/sections/TopSection'
import RoleModal, {
    RoleFormField,
    RoleModalBody,
    RoleModalFooter,
    RoleTextInput
} from '../../../app/components/ui/RoleModal'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { useRolesData } from '../../../app/hooks/useRolesData'

const getNamespace = (perm) => {
    const dot = perm.indexOf('.')
    return dot > 0 ? perm.substring(0, dot) : perm
}

const NAMESPACE_ICONS = {
    dashboard: 'fa-tachometer-alt',
    equipment: 'fa-truck',
    managers: 'fa-user-tie',
    mixers: 'fa-blender',
    operators: 'fa-hard-hat',
    plants: 'fa-industry',
    regions: 'fa-map-marked-alt',
    reports: 'fa-chart-bar',
    roles: 'fa-shield-alt',
    system: 'fa-cog',
    tractors: 'fa-truck-monster',
    trailers: 'fa-trailer',
    users: 'fa-users'
}

const NAMESPACE_COLORS = {
    dashboard: 'bg-blue-600',
    equipment: 'bg-slate-600',
    managers: 'bg-purple-600',
    mixers: 'bg-teal-600',
    operators: 'bg-orange-500',
    plants: 'bg-emerald-600',
    regions: 'bg-cyan-600',
    reports: 'bg-indigo-600',
    roles: 'bg-red-600',
    system: 'bg-slate-700',
    tractors: 'bg-amber-600',
    trailers: 'bg-lime-600',
    users: 'bg-violet-600'
}

/** Single permission row inside a role card. */
const PermissionRow = ({ permission, onRemove, hasITAccess, isSaving }) => {
    const ns = getNamespace(permission)
    const icon = NAMESPACE_ICONS[ns] || 'fa-key'
    const bgColor = NAMESPACE_COLORS[ns] || 'bg-slate-500'
    return (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 group transition-colors">
            <div className={`w-5 h-5 rounded ${bgColor} flex items-center justify-center shrink-0`}>
                <i className={`fas ${icon} text-white text-[8px]`} />
            </div>
            <span className="text-sm text-slate-700 flex-1 font-mono text-[13px]">{permission}</span>
            {hasITAccess && (
                <button
                    onClick={() => onRemove(permission)}
                    disabled={isSaving}
                    className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer border-none bg-transparent shrink-0 disabled:opacity-30"
                    title="Remove permission"
                >
                    <i className="fas fa-times text-[10px]" />
                </button>
            )}
        </div>
    )
}

/** Expandable role card showing name, weight, permission count, and permission list. */
const RoleCard = ({
    role,
    isExpanded,
    onToggle,
    hasITAccess,
    accentColor,
    onRemovePermission,
    onAddPermission,
    onEditWeight,
    savingPerms
}) => {
    const [addingPerm, setAddingPerm] = useState(false)
    const [newPerm, setNewPerm] = useState('')
    const permissions = Array.isArray(role.permissions) ? [...role.permissions].sort() : []
    const namespaces = [...new Set(permissions.map(getNamespace))].sort()
    const isElevated = (role.weight || 0) > 75

    const handleAddPerm = () => {
        const trimmed = newPerm.trim()
        if (!trimmed) return
        onAddPermission(role.id, trimmed)
        setNewPerm('')
        setAddingPerm(false)
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header — always visible */}
            <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={onToggle}
            >
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${accentColor}15`, color: accentColor }}
                >
                    <i className="fas fa-shield-alt text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold text-slate-800">{role.name}</span>
                        {isElevated && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                Elevated
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-400">Weight: {role.weight || 0}</span>
                        <span className="text-slate-200 text-[8px]">●</span>
                        <span className="text-xs text-slate-400">{permissions.length} permissions</span>
                        <span className="text-slate-200 text-[8px]">●</span>
                        <span className="text-xs text-slate-400">{namespaces.length} namespaces</span>
                    </div>
                </div>
                <i
                    className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-slate-300 text-xs transition-transform`}
                />
            </div>

            {/* Expanded content */}
            {isExpanded && (
                <div className="border-t border-slate-100">
                    {/* Actions bar */}
                    {hasITAccess && (
                        <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-100">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setAddingPerm(true)
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-none cursor-pointer transition-colors"
                                style={{ background: `${accentColor}15`, color: accentColor }}
                            >
                                <i className="fas fa-plus text-[9px]" />
                                Add Permission
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onEditWeight(role)
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-600 border-none cursor-pointer hover:bg-slate-300 transition-colors"
                            >
                                <i className="fas fa-balance-scale text-[9px]" />
                                Edit Weight
                            </button>
                        </div>
                    )}

                    {/* Add permission inline */}
                    {addingPerm && (
                        <div className="flex items-center gap-2 px-5 py-3 bg-blue-50 border-b border-blue-100">
                            <input
                                type="text"
                                value={newPerm}
                                onChange={(e) => setNewPerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddPerm()}
                                placeholder="e.g. reports.qc_strength"
                                autoFocus
                                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                            <button
                                onClick={handleAddPerm}
                                disabled={!newPerm.trim()}
                                className="px-3 py-2 rounded-lg text-xs font-semibold text-white border-none cursor-pointer disabled:opacity-40"
                                style={{ background: accentColor }}
                            >
                                Add
                            </button>
                            <button
                                onClick={() => {
                                    setAddingPerm(false)
                                    setNewPerm('')
                                }}
                                className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-200 text-slate-600 border-none cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* Permissions grouped by namespace */}
                    <div className="px-4 py-3">
                        {permissions.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-sm">
                                <i className="fas fa-lock text-2xl mb-2 block" />
                                No permissions assigned
                            </div>
                        ) : (
                            namespaces.map((ns) => {
                                const nsPerms = permissions.filter((p) => getNamespace(p) === ns)
                                const icon = NAMESPACE_ICONS[ns] || 'fa-key'
                                return (
                                    <div key={ns} className="mb-3 last:mb-0">
                                        <div className="flex items-center gap-2 px-1 mb-1">
                                            <i className={`fas ${icon} text-[10px] text-slate-400`} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                {ns}
                                            </span>
                                            <span className="text-[10px] text-slate-300">{nsPerms.length}</span>
                                        </div>
                                        {nsPerms.map((perm) => (
                                            <PermissionRow
                                                key={perm}
                                                permission={perm}
                                                hasITAccess={hasITAccess}
                                                isSaving={savingPerms.has(`${role.id}:${perm}`)}
                                                onRemove={(p) => onRemovePermission(role.id, p)}
                                            />
                                        ))}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

/** Modal for creating a new role. */
const CreateRoleModal = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState('')
    const [weight, setWeight] = useState(10)
    if (!isOpen) return null
    return (
        <RoleModal isOpen={isOpen} onClose={onClose} title="Create Role">
            <RoleModalBody>
                <RoleFormField label="Role Name">
                    <RoleTextInput value={name} onChange={setName} placeholder="e.g. Plant Manager" autoFocus />
                </RoleFormField>
                <RoleFormField label="Weight">
                    <RoleTextInput value={weight} onChange={(v) => setWeight(Number(v) || 0)} type="number" />
                </RoleFormField>
            </RoleModalBody>
            <RoleModalFooter
                onCancel={onClose}
                onConfirm={() => {
                    if (!name.trim()) return
                    onCreate(name.trim(), weight)
                    setName('')
                    setWeight(10)
                    onClose()
                }}
                confirmLabel="Create"
                confirmDisabled={!name.trim()}
            />
        </RoleModal>
    )
}

/** Modal for editing role weight. */
const EditWeightModal = ({ role, onClose, onSave }) => {
    const [weight, setWeight] = useState(role?.weight || 0)
    if (!role) return null
    return (
        <RoleModal isOpen={true} onClose={onClose} title={`Edit Weight — ${role.name}`}>
            <RoleModalBody>
                <RoleFormField label="Weight" hint="Roles with weight > 75 are elevated (admin)">
                    <RoleTextInput value={weight} onChange={(v) => setWeight(Number(v) || 0)} type="number" autoFocus />
                </RoleFormField>
            </RoleModalBody>
            <RoleModalFooter
                onCancel={onClose}
                onConfirm={() => {
                    onSave(role.id, weight)
                    onClose()
                }}
                confirmLabel="Save"
            />
        </RoleModal>
    )
}

/** Modal for bulk-adding a permission to one or more roles. */
const BulkAddModal = ({ isOpen, onClose, roles, onBulkAdd, accentColor }) => {
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
                    <div className="text-xs text-slate-400 -mt-2 mb-2 px-1">
                        Already on: {alreadyHave.map((r) => r.name).join(', ')}
                    </div>
                )}
                <RoleFormField label="Add to Roles">
                    <div className="flex items-center gap-2 mb-2">
                        <button
                            onClick={selectAll}
                            className="text-[11px] font-semibold px-2 py-1 rounded bg-slate-100 text-slate-600 border-none cursor-pointer hover:bg-slate-200"
                        >
                            Select All
                        </button>
                        <button
                            onClick={selectNone}
                            className="text-[11px] font-semibold px-2 py-1 rounded bg-slate-100 text-slate-600 border-none cursor-pointer hover:bg-slate-200"
                        >
                            Select None
                        </button>
                        <span className="text-[11px] text-slate-400 ml-auto">{selectedRoleIds.size} selected</span>
                    </div>
                    <div className="max-h-[280px] overflow-y-auto border border-slate-200 rounded-lg">
                        {sortedRoles.map((role) => {
                            const isSelected = selectedRoleIds.has(role.id)
                            const alreadyHasIt =
                                permission.trim() &&
                                Array.isArray(role.permissions) &&
                                role.permissions.includes(permission.trim())
                            return (
                                <label
                                    key={role.id}
                                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-slate-100 last:border-b-0 ${
                                        isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                                    } ${alreadyHasIt ? 'opacity-40' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleRole(role.id)}
                                        disabled={alreadyHasIt}
                                        className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium text-slate-800">{role.name}</span>
                                        <span className="text-xs text-slate-400 ml-2">w:{role.weight || 0}</span>
                                    </div>
                                    {alreadyHasIt && (
                                        <span className="text-[10px] text-slate-400 shrink-0">already has</span>
                                    )}
                                </label>
                            )
                        })}
                    </div>
                </RoleFormField>
            </RoleModalBody>
            <RoleModalFooter
                onCancel={onClose}
                onConfirm={handleSubmit}
                confirmLabel={
                    saving ? 'Adding...' : `Add to ${selectedRoleIds.size} Role${selectedRoleIds.size !== 1 ? 's' : ''}`
                }
                confirmDisabled={!permission.trim() || selectedRoleIds.size === 0 || saving}
            />
        </RoleModal>
    )
}

function RolesView() {
    const {
        bulkAddPermissions,
        createRole,
        error,
        hasITAccess,
        isLoading,
        loadData,
        message,
        removePermissionFromAllRoles,
        removePermissionFromRole: _removePermissionFromRole,
        roles,
        setError,
        updateRolePermissions,
        updateRoleWeight
    } = useRolesData()
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const [searchQuery, setSearchQuery] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showBulkAddModal, setShowBulkAddModal] = useState(false)
    const [editingWeightRole, setEditingWeightRole] = useState(null)
    const [expandedRoleId, setExpandedRoleId] = useState(null)
    const [savingPerms, setSavingPerms] = useState(new Set())

    useEffect(() => {
        loadData()
    }, [loadData])

    const sortedRoles = useMemo(() => {
        let filtered = [...roles].sort((a, b) => (b.weight || 0) - (a.weight || 0))
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase()
            filtered = filtered.filter((r) => {
                const perms = Array.isArray(r.permissions) ? r.permissions : []
                return r.name.toLowerCase().includes(q) || perms.some((p) => p.toLowerCase().includes(q))
            })
        }
        return filtered
    }, [roles, searchQuery])

    const totalPermissions = useMemo(() => {
        const permSet = new Set()
        for (const role of roles) {
            if (Array.isArray(role.permissions)) {
                for (const p of role.permissions) permSet.add(p)
            }
        }
        return permSet.size
    }, [roles])

    const handleRemovePermission = useCallback(
        async (roleId, permission) => {
            if (!hasITAccess) return
            const cellKey = `${roleId}:${permission}`
            setSavingPerms((prev) => new Set(prev).add(cellKey))
            try {
                const role = roles.find((r) => r.id === roleId)
                if (!role) return
                const currentPerms = Array.isArray(role.permissions) ? role.permissions : []
                const newPerms = currentPerms.filter((p) => p !== permission)
                await updateRolePermissions(roleId, newPerms.join('\n'))
            } catch (err) {
                setError(`Failed to remove: ${err.message}`)
            } finally {
                setSavingPerms((prev) => {
                    const next = new Set(prev)
                    next.delete(cellKey)
                    return next
                })
            }
        },
        [hasITAccess, roles, updateRolePermissions, setError]
    )

    const handleAddPermission = useCallback(
        async (roleId, permission) => {
            if (!hasITAccess) return
            const cellKey = `${roleId}:${permission}`
            setSavingPerms((prev) => new Set(prev).add(cellKey))
            try {
                const role = roles.find((r) => r.id === roleId)
                if (!role) return
                const currentPerms = Array.isArray(role.permissions) ? role.permissions : []
                if (currentPerms.includes(permission)) return
                const newPerms = [...currentPerms, permission]
                await updateRolePermissions(roleId, newPerms.join('\n'))
            } catch (err) {
                setError(`Failed to add: ${err.message}`)
            } finally {
                setSavingPerms((prev) => {
                    const next = new Set(prev)
                    next.delete(cellKey)
                    return next
                })
            }
        },
        [hasITAccess, roles, updateRolePermissions, setError]
    )

    const handleCreateRole = useCallback(
        async (name, weight) => {
            try {
                await createRole(name, weight)
            } catch (err) {
                setError(`Failed to create role: ${err.message}`)
            }
        },
        [createRole, setError]
    )

    const handleSaveWeight = useCallback(
        async (roleId, weight) => {
            try {
                await updateRoleWeight(roleId, weight)
            } catch (err) {
                setError(`Failed to update weight: ${err.message}`)
            }
        },
        [updateRoleWeight, setError]
    )

    const badge = `${roles.length} Total`

    if (isLoading && roles.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <LoadingScreen inline message="Loading roles..." />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-16">
            <TopSection
                title="Roles & Permissions"
                badge={badge}
                hideViewModeToggle
                hidePlantFilter
                sticky
                searchPlaceholder="Search roles or permissions..."
                searchInput={searchQuery}
                onSearchInputChange={setSearchQuery}
                onClearSearch={() => setSearchQuery('')}
                addButtonLabel={hasITAccess ? 'New Role' : undefined}
                onAddClick={hasITAccess ? () => setShowCreateModal(true) : undefined}
                customActions={
                    hasITAccess ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowBulkAddModal(true)}
                                className="flex items-center gap-2 border-none rounded-xl text-sm font-semibold px-5 py-3 cursor-pointer transition-all bg-slate-100 text-slate-600 hover:bg-slate-200"
                            >
                                <i className="fas fa-layer-group" />
                                Bulk Add
                            </button>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold">
                                <i className="fas fa-shield-alt text-[10px]" />
                                IT Access
                            </div>
                        </div>
                    ) : null
                }
            />

            <div className="px-3 py-4 sm:px-4 md:px-6 lg:px-8">
                {/* Alerts */}
                {message && (
                    <div className="flex items-center gap-2 mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
                        <i className="fas fa-check-circle shrink-0" />
                        {message}
                    </div>
                )}
                {error && (
                    <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        <i className="fas fa-exclamation-circle shrink-0" />
                        {error}
                    </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 mb-5 px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <i className="fas fa-shield-alt text-slate-500 text-xs" />
                        </div>
                        <div>
                            <span className="text-lg font-bold text-slate-800">{roles.length}</span>
                            <span className="text-xs text-slate-400 ml-1.5">roles</span>
                        </div>
                    </div>
                    <div className="w-px h-8 bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <i className="fas fa-key text-slate-500 text-xs" />
                        </div>
                        <div>
                            <span className="text-lg font-bold text-slate-800">{totalPermissions}</span>
                            <span className="text-xs text-slate-400 ml-1.5">unique permissions</span>
                        </div>
                    </div>
                </div>

                {/* Role cards */}
                <div className="space-y-3">
                    {sortedRoles.map((role) => (
                        <RoleCard
                            key={role.id}
                            role={role}
                            isExpanded={expandedRoleId === role.id}
                            onToggle={() => setExpandedRoleId(expandedRoleId === role.id ? null : role.id)}
                            hasITAccess={hasITAccess}
                            accentColor={accentColor}
                            onRemovePermission={handleRemovePermission}
                            onAddPermission={handleAddPermission}
                            onEditWeight={setEditingWeightRole}
                            savingPerms={savingPerms}
                        />
                    ))}
                    {sortedRoles.length === 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-slate-400">
                            <i className="fas fa-search text-3xl mb-3 block" />
                            <div className="text-sm">No roles match your search</div>
                        </div>
                    )}
                </div>
            </div>

            <CreateRoleModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateRole}
            />
            <EditWeightModal
                role={editingWeightRole}
                onClose={() => setEditingWeightRole(null)}
                onSave={handleSaveWeight}
            />
            <BulkAddModal
                isOpen={showBulkAddModal}
                onClose={() => setShowBulkAddModal(false)}
                roles={roles}
                accentColor={accentColor}
                onBulkAdd={async (roleIds, permission) => {
                    try {
                        await bulkAddPermissions(roleIds, permission)
                    } catch (err) {
                        setError(`Bulk add failed: ${err.message}`)
                    }
                }}
            />
        </div>
    )
}
export default RolesView
