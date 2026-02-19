import React, { useCallback, useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom'

import LoadingScreen from '../../app/components/common/LoadingScreen'
import EmptyState from '../../app/components/ui/EmptyState'
import RoleModal, {
    RoleFormField,
    RoleModalBody,
    RoleModalFooter,
    RoleModalScrollBody,
    RoleTextarea,
    RoleTextInput
} from '../../app/components/ui/RoleModal'
import { useRolesData } from '../../app/hooks/useRolesData'

const BRAND_COLOR = '#1e3a5f'
const BRAND_COLOR_HOVER = '#152d4a'

const getPermissionCount = (role) => (Array.isArray(role?.permissions) ? role.permissions.length : 0)
const getSortedPermissions = (permissions) =>
    Array.isArray(permissions) ? [...permissions].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())) : []

function PageHeader({ hasITAccess, onBulkAdd, onCreate, onSearch }) {
    return (
        <div
            className="sticky top-0 z-10 border-b border-slate-200 px-6 py-5"
            style={{
                backgroundColor: 'white',
                backgroundImage: `linear-gradient(rgba(30, 58, 95, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 58, 95, 0.02) 1px, transparent 1px), radial-gradient(circle at center, rgba(30, 58, 95, 0.015) 0%, transparent 50%)`,
                backgroundSize: '20px 20px, 20px 20px, 40px 40px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}
        >
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Roles & Permissions</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {hasITAccess ? 'Manage' : 'View'} all roles and their permission nodes
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {hasITAccess && (
                        <>
                            <ActionButton icon="fas fa-layer-group" onClick={onBulkAdd} variant="secondary">
                                Bulk Add
                            </ActionButton>
                            <ActionButton icon="fas fa-plus" onClick={onCreate} variant="primary">
                                Create Role
                            </ActionButton>
                            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                                <i className="fas fa-shield-alt" />
                                IT Access
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

function ActionButton({ children, disabled, icon, onClick, variant = 'primary' }) {
    const baseClasses = 'flex items-center gap-2 px-4 py-2.5 font-semibold rounded-lg transition-colors text-sm'
    const variantClasses =
        variant === 'primary'
            ? `bg-[${BRAND_COLOR}] hover:bg-[${BRAND_COLOR_HOVER}] text-white`
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
    return (
        <button className={`${baseClasses} ${variantClasses}`} disabled={disabled} onClick={onClick} type="button">
            {icon && <i className={icon} />}
            {children}
        </button>
    )
}

function SearchBar({ onClick }) {
    return (
        <button
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
            onClick={onClick}
            type="button"
        >
            <i className="fas fa-search text-slate-400" />
            <span>Search permission nodes...</span>
        </button>
    )
}

function AlertMessage({ message, type = 'success' }) {
    if (!message) return null
    const isSuccess = type === 'success'
    return (
        <div
            className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border ${isSuccess ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}
        >
            <i className={`fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
            <span className="text-sm font-medium">{message}</span>
        </div>
    )
}

function RoleCard({ hasITAccess, isExpanded, onEditPermissions, onEditWeight, onToggle, role }) {
    const permissionCount = getPermissionCount(role)
    const permissions = getSortedPermissions(role.permissions)

    return (
        <div
            className={`bg-white rounded-xl border ${isExpanded ? 'border-[#1e3a5f]/30 shadow-md' : 'border-slate-200'} overflow-hidden transition-all`}
        >
            <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-4">
                    <div className="size-11 bg-[#1e3a5f]/10 rounded-xl flex items-center justify-center">
                        <i className="fas fa-user-shield text-[#1e3a5f]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">{role.name}</h3>
                        <RoleMetadata
                            hasITAccess={hasITAccess}
                            onEditWeight={onEditWeight}
                            permissionCount={permissionCount}
                            weight={role.weight}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {hasITAccess && (
                        <button
                            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
                            onClick={(e) => {
                                e.stopPropagation()
                                onEditPermissions()
                            }}
                            type="button"
                        >
                            <i className="fas fa-edit text-xs" />
                            Edit
                        </button>
                    )}
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-slate-400`} />
                </div>
            </div>
            {isExpanded && <PermissionsPanel permissions={permissions} />}
        </div>
    )
}

function RoleMetadata({ hasITAccess, onEditWeight, permissionCount, weight }) {
    return (
        <div className="flex items-center gap-4 mt-1">
            <span
                className={`flex items-center gap-1.5 text-xs text-slate-500 ${hasITAccess ? 'cursor-pointer hover:text-[#1e3a5f]' : ''}`}
                onClick={(e) => {
                    if (hasITAccess) {
                        e.stopPropagation()
                        onEditWeight()
                    }
                }}
            >
                <i className="fas fa-weight-hanging" />
                Weight: {weight || 0}
                {hasITAccess && <i className="fas fa-pencil-alt text-[10px] ml-1" />}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <i className="fas fa-key" />
                {permissionCount} {permissionCount === 1 ? 'permission' : 'permissions'}
            </span>
        </div>
    )
}

function PermissionsPanel({ permissions }) {
    if (!permissions.length) {
        return (
            <div className="border-t border-slate-200 px-5 py-4 bg-slate-50">
                <div className="flex items-center gap-3 py-8 justify-center text-slate-400">
                    <i className="fas fa-info-circle" />
                    <span>No permissions assigned to this role</span>
                </div>
            </div>
        )
    }
    return (
        <div className="border-t border-slate-200 px-5 py-4 bg-slate-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {permissions.map((permission, index) => (
                    <PermissionBadge key={index} permission={permission} />
                ))}
            </div>
        </div>
    )
}

function PermissionBadge({ permission }) {
    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
            <i className="fas fa-check-circle text-emerald-500 text-xs" />
            <span className="font-mono text-slate-700 text-xs truncate">{permission}</span>
        </div>
    )
}

function CreateRoleModal({ isOpen, onClose, onCreate }) {
    const [name, setName] = useState('')
    const [weight, setWeight] = useState(0)
    const [isCreating, setIsCreating] = useState(false)

    const handleCreate = async () => {
        if (!name.trim()) return
        setIsCreating(true)
        try {
            await onCreate(name, weight)
            setName('')
            setWeight(0)
            onClose()
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <RoleModal
            isOpen={isOpen}
            onClose={onClose}
            subtitle="Add Role"
            title="Create New Role"
            titleIcon="fas fa-plus-circle"
        >
            <RoleModalBody>
                <RoleFormField label="Role Name">
                    <RoleTextInput onChange={setName} placeholder="Enter role name" value={name} />
                </RoleFormField>
                <RoleFormField label="Weight">
                    <RoleTextInput
                        onChange={setWeight}
                        placeholder="Enter weight (0-100)"
                        type="number"
                        value={weight}
                    />
                </RoleFormField>
            </RoleModalBody>
            <RoleModalFooter
                disabled={!name.trim()}
                isLoading={isCreating}
                loadingText="Creating..."
                onCancel={onClose}
                onSubmit={handleCreate}
                submitText="Create Role"
            />
        </RoleModal>
    )
}

function EditPermissionsModal({ isOpen, onClose, onSave, role }) {
    const [permissions, setPermissions] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (role) setPermissions(Array.isArray(role.permissions) ? role.permissions.join('\n') : '')
    }, [role])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await onSave(role.id, permissions)
            onClose()
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <RoleModal
            isOpen={isOpen}
            maxWidth="max-w-lg"
            onClose={onClose}
            subtitle="One permission per line"
            title={`Edit ${role?.name ?? 'Role'}`}
            titleIcon="fas fa-key"
        >
            <RoleModalBody>
                <RoleFormField label="Permissions" sublabel="(one per line)">
                    <textarea
                        className="w-full h-64 px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-700 focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 resize-none"
                        disabled={isSaving}
                        onChange={(e) => setPermissions(e.target.value)}
                        placeholder="Enter permissions (one per line)&#10;Example:&#10;dashboard.view&#10;mixers.view&#10;mixers.edit"
                        value={permissions}
                    />
                </RoleFormField>
            </RoleModalBody>
            <RoleModalFooter
                isLoading={isSaving}
                loadingText="Saving..."
                onCancel={onClose}
                onSubmit={handleSave}
                submitIcon="fas fa-save"
                submitText="Save Changes"
            />
        </RoleModal>
    )
}

function EditWeightModal({ isOpen, onClose, onSave, role }) {
    const [weight, setWeight] = useState(0)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (role) setWeight(role.weight || 0)
    }, [role])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await onSave(role.id, weight)
            onClose()
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <RoleModal
            isOpen={isOpen}
            onClose={onClose}
            subtitle="Role priority level"
            title={`Edit ${role?.name ?? 'Role'} Weight`}
            titleIcon="fas fa-weight-hanging"
        >
            <RoleModalBody>
                <RoleFormField label="Weight">
                    <RoleTextInput
                        onChange={setWeight}
                        placeholder="Enter weight (0-100)"
                        type="number"
                        value={weight}
                    />
                </RoleFormField>
            </RoleModalBody>
            <RoleModalFooter
                isLoading={isSaving}
                loadingText="Saving..."
                onCancel={onClose}
                onSubmit={handleSave}
                submitIcon="fas fa-save"
                submitText="Save Weight"
            />
        </RoleModal>
    )
}

function BulkAddModal({ isOpen, onClose, onSubmit, roles }) {
    const [selectedRoles, setSelectedRoles] = useState(new Set())
    const [permissionText, setPermissionText] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const toggleRole = (roleId) => {
        setSelectedRoles((prev) => {
            const next = new Set(prev)
            next.has(roleId) ? next.delete(roleId) : next.add(roleId)
            return next
        })
    }

    const handleSubmit = async () => {
        if (!selectedRoles.size || !permissionText.trim()) return
        setIsSubmitting(true)
        try {
            await onSubmit(selectedRoles, permissionText)
            setSelectedRoles(new Set())
            setPermissionText('')
            onClose()
        } finally {
            setIsSubmitting(false)
        }
    }

    const permissionCount = permissionText.split('\n').filter((p) => p.trim()).length

    return (
        <RoleModal
            isOpen={isOpen}
            maxWidth="max-w-lg max-h-[85vh] flex flex-col"
            onClose={isSubmitting ? undefined : onClose}
            subtitle="Add permission nodes to multiple roles"
            title="Bulk Add Permissions"
            titleIcon="fas fa-layer-group"
        >
            <RoleModalScrollBody>
                <RoleFormField label="Select Roles">
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                        {roles.map((role) => (
                            <label
                                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer"
                                key={role.id}
                            >
                                <input
                                    checked={selectedRoles.has(role.id)}
                                    className="size-4 text-[#1e3a5f] rounded border-slate-300 focus:ring-[#1e3a5f]"
                                    disabled={isSubmitting}
                                    onChange={() => toggleRole(role.id)}
                                    type="checkbox"
                                />
                                <span className="flex-1 font-medium text-slate-700">{role.name}</span>
                                <span className="text-xs text-slate-400">{getPermissionCount(role)} permissions</span>
                            </label>
                        ))}
                    </div>
                </RoleFormField>
                <RoleFormField label="Permission Nodes to Add" sublabel="(one per line)">
                    <RoleTextarea
                        disabled={isSubmitting}
                        onChange={setPermissionText}
                        placeholder="Enter permission nodes (one per line)&#10;Example:&#10;dashboard.view&#10;mixers.view&#10;reports.view"
                        value={permissionText}
                    />
                </RoleFormField>
                {selectedRoles.size > 0 && permissionText.trim() && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm">
                        <i className="fas fa-info-circle" />
                        <span>
                            Will add <strong>{permissionCount}</strong> permission{permissionCount === 1 ? '' : 's'} to{' '}
                            <strong>{selectedRoles.size}</strong> role{selectedRoles.size === 1 ? '' : 's'}
                        </span>
                    </div>
                )}
            </RoleModalScrollBody>
            <RoleModalFooter
                disabled={!selectedRoles.size || !permissionText.trim()}
                isLoading={isSubmitting}
                loadingText="Adding..."
                onCancel={onClose}
                onSubmit={handleSubmit}
                submitText="Add to Selected Roles"
            />
        </RoleModal>
    )
}

function SearchModal({ hasITAccess, isOpen, onClose, onRemoveFromAll, onRemoveFromRole, roles }) {
    const [query, setQuery] = useState('')

    const searchResults = useMemo(() => {
        if (!query.trim()) return []
        const lowerQuery = query.toLowerCase()
        return roles
            .map((role) => ({
                matchingPermissions: (role.permissions ?? []).filter((perm) => perm.toLowerCase().includes(lowerQuery)),
                role
            }))
            .filter((result) => result.matchingPermissions.length > 0)
    }, [query, roles])

    const handleRemoveFromAll = async () => {
        if (!window.confirm(`Are you sure you want to remove "${query.trim()}" from all roles that have it?`)) return
        await onRemoveFromAll(query.trim(), searchResults)
    }

    const handleRemoveFromRole = async (roleId, roleName) => {
        if (!window.confirm(`Remove "${query.trim()}" from "${roleName}"?`)) return
        await onRemoveFromRole(query.trim(), roleId)
    }

    if (!isOpen) return null

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 px-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[70vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
                    <div className="flex-1 flex items-center gap-3">
                        <i className="fas fa-search text-slate-400" />
                        <input
                            autoFocus
                            className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400"
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search for permission nodes across all roles..."
                            type="text"
                            value={query}
                        />
                    </div>
                    <button
                        className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400"
                        onClick={onClose}
                        type="button"
                    >
                        <i className="fas fa-times" />
                    </button>
                </div>

                {searchResults.length > 0 && (
                    <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                        <div className="text-sm text-slate-600">
                            <span className="font-semibold">{searchResults.length}</span>{' '}
                            {searchResults.length === 1 ? 'role' : 'roles'} found matching &ldquo;{query.trim()}&rdquo;
                        </div>
                        {hasITAccess && query.trim() && (
                            <button
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs font-medium transition-colors"
                                onClick={handleRemoveFromAll}
                                type="button"
                            >
                                <i className="fas fa-trash-alt" />
                                Remove from All
                            </button>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto">
                    {searchResults.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {searchResults.map((result, index) => {
                                const hasExactMatch = result.role.permissions.includes(query.trim())
                                return (
                                    <div className="px-5 py-4" key={index}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-800">{result.role.name}</span>
                                                <span className="text-xs text-slate-400">
                                                    {result.matchingPermissions.length}{' '}
                                                    {result.matchingPermissions.length === 1 ? 'match' : 'matches'}
                                                </span>
                                            </div>
                                            {hasITAccess && hasExactMatch && (
                                                <button
                                                    className="size-7 flex items-center justify-center rounded-lg bg-red-100 hover:bg-red-200 text-red-500 transition-colors"
                                                    onClick={() =>
                                                        handleRemoveFromRole(result.role.id, result.role.name)
                                                    }
                                                    type="button"
                                                >
                                                    <i className="fas fa-times text-xs" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {result.matchingPermissions.map((perm, pIndex) => {
                                                const isExact = perm === query.trim()
                                                return (
                                                    <div
                                                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono ${isExact ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                                                        key={pIndex}
                                                    >
                                                        <span>{perm}</span>
                                                        {isExact && (
                                                            <span className="px-1.5 py-0.5 bg-emerald-200 text-emerald-700 rounded text-[10px] font-semibold">
                                                                exact
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <i className="fas fa-search text-4xl mb-4" />
                            <p>Search by permission nodes.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
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
        removePermissionFromRole,
        roles,
        setError,
        updateRolePermissions,
        updateRoleWeight
    } = useRolesData()

    const [expandedRoles, setExpandedRoles] = useState(new Set())
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showBulkAddModal, setShowBulkAddModal] = useState(false)
    const [showSearchModal, setShowSearchModal] = useState(false)
    const [editingPermissionsRole, setEditingPermissionsRole] = useState(null)
    const [editingWeightRole, setEditingWeightRole] = useState(null)

    useEffect(() => {
        loadData()
    }, [loadData])

    const toggleRole = useCallback((roleId) => {
        setExpandedRoles((prev) => {
            const next = new Set(prev)
            next.has(roleId) ? next.delete(roleId) : next.add(roleId)
            return next
        })
    }, [])

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

    const handleSavePermissions = useCallback(
        async (roleId, permissions) => {
            try {
                await updateRolePermissions(roleId, permissions)
            } catch (err) {
                setError(`Failed to save permissions: ${err.message}`)
            }
        },
        [updateRolePermissions, setError]
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

    const handleBulkAdd = useCallback(
        async (selectedRoles, permissionText) => {
            try {
                await bulkAddPermissions(selectedRoles, permissionText)
            } catch (err) {
                setError(`Failed to add permissions: ${err.message}`)
            }
        },
        [bulkAddPermissions, setError]
    )

    const handleRemoveFromRole = useCallback(
        async (permission, roleId) => {
            try {
                await removePermissionFromRole(permission, roleId)
            } catch (err) {
                setError(`Failed to remove permission: ${err.message}`)
            }
        },
        [removePermissionFromRole, setError]
    )

    const handleRemoveFromAll = useCallback(
        async (permission, affectedRoles) => {
            try {
                await removePermissionFromAllRoles(permission, affectedRoles)
            } catch (err) {
                setError(`Failed to remove permission: ${err.message}`)
            }
        },
        [removePermissionFromAllRoles, setError]
    )

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <LoadingScreen inline message="Loading roles..." />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                hasITAccess={hasITAccess}
                onBulkAdd={() => setShowBulkAddModal(true)}
                onCreate={() => setShowCreateModal(true)}
                onSearch={() => setShowSearchModal(true)}
            />

            <div className="max-w-6xl mx-auto px-6 py-6">
                <div className="mb-6">
                    <SearchBar onClick={() => setShowSearchModal(true)} />
                </div>

                <AlertMessage message={message} type="success" />
                <AlertMessage message={error} type="error" />

                {roles.length === 0 ? (
                    <EmptyState
                        icon="fa-users-slash"
                        subtitle="There are no roles configured in the system."
                        title="No Roles Found"
                    />
                ) : (
                    <div className="space-y-4">
                        {roles.map((role) => (
                            <RoleCard
                                hasITAccess={hasITAccess}
                                isExpanded={expandedRoles.has(role.id)}
                                key={role.id}
                                onEditPermissions={() => setEditingPermissionsRole(role)}
                                onEditWeight={() => setEditingWeightRole(role)}
                                onToggle={() => toggleRole(role.id)}
                                role={role}
                            />
                        ))}
                    </div>
                )}
            </div>

            <CreateRoleModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateRole}
            />

            <EditPermissionsModal
                isOpen={!!editingPermissionsRole}
                onClose={() => setEditingPermissionsRole(null)}
                onSave={handleSavePermissions}
                role={editingPermissionsRole}
            />

            <EditWeightModal
                isOpen={!!editingWeightRole}
                onClose={() => setEditingWeightRole(null)}
                onSave={handleSaveWeight}
                role={editingWeightRole}
            />

            <BulkAddModal
                isOpen={showBulkAddModal}
                onClose={() => setShowBulkAddModal(false)}
                onSubmit={handleBulkAdd}
                roles={roles}
            />

            <SearchModal
                hasITAccess={hasITAccess}
                isOpen={showSearchModal}
                onClose={() => setShowSearchModal(false)}
                onRemoveFromAll={handleRemoveFromAll}
                onRemoveFromRole={handleRemoveFromRole}
                roles={roles}
            />
        </div>
    )
}

export default RolesView
