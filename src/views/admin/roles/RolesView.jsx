import React, { useCallback, useEffect, useMemo, useState } from 'react'

import Badge from '../../../app/components/common/Badge'
import TopSection from '../../../app/components/sections/TopSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { useRolePermissionHandlers } from '../../../app/hooks/useRolePermissionHandlers'
import { useRolesData } from '../../../app/hooks/useRolesData'
import BulkAddModal from './parts/BulkAddModal'
import CreateRoleModal from './parts/CreateRoleModal'
import EditWeightModal from './parts/EditWeightModal'
import RoleCard from './parts/RoleCard'
import RolesLoadingSkeleton from './parts/RolesLoadingSkeleton'

const ELEVATED_WEIGHT_THRESHOLD = 75
const DEFAULT_ACCENT_COLOR = '#1e3a5f'

function RolesView() {
    const {
        bulkAddPermissions,
        createRole,
        error,
        hasITAccess,
        isLoading,
        loadData,
        message,
        removePermissionFromAllRoles: _removePermissionFromAllRoles,
        removePermissionFromRole: _removePermissionFromRole,
        roles,
        setError,
        updateRolePermissions,
        updateRoleWeight
    } = useRolesData()
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || DEFAULT_ACCENT_COLOR
    const [searchQuery, setSearchQuery] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showBulkAddModal, setShowBulkAddModal] = useState(false)
    const [editingWeightRole, setEditingWeightRole] = useState(null)
    const [expandedRoleId, setExpandedRoleId] = useState(null)

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

    /** Number of roles whose weight crosses the elevated threshold (> 75). */
    const elevatedCount = useMemo(
        () => roles.filter((r) => (r.weight || 0) > ELEVATED_WEIGHT_THRESHOLD).length,
        [roles]
    )

    const { savingPerms, handleRemovePermission, handleAddPermission, handlePastePermissions } =
        useRolePermissionHandlers({ hasITAccess, roles, setError, updateRolePermissions })

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

    const handleBulkAdd = useCallback(
        async (roleIds, permission) => {
            try {
                await bulkAddPermissions(roleIds, permission)
            } catch (err) {
                setError(`Bulk add failed: ${err.message}`)
            }
        },
        [bulkAddPermissions, setError]
    )

    const badge = `${roles.length} Roles · ${totalPermissions} Permissions · ${elevatedCount} Elevated`

    if (isLoading && roles.length === 0) return <RolesLoadingSkeleton />

    return (
        <div className="min-h-screen bg-bg-secondary pb-16">
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
                            <button type="button"
                                onClick={() => setShowBulkAddModal(true)}
                                className="inline-flex items-center gap-2 rounded-md bg-bg-tertiary px-4 py-2 text-sm font-semibold text-text-secondary transition-colors duration-150 hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:scale-[0.98]"
                            >
                                <i className="fas fa-layer-group text-[12px]" aria-hidden="true" />
                                Bulk Add
                            </button>
                            <Badge
                                tone="success"
                                size="lg"
                                shape="pill"
                                weight="semibold"
                                icon="shield-halved"
                                uppercase={false}
                                title="You have IT administrator access"
                            >
                                IT Access
                            </Badge>
                        </div>
                    ) : null
                }
            />

            <div className="px-3 py-4 sm:px-4 md:px-6 lg:px-8">
                {/* Alerts */}
                {message && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="mb-4 flex items-center gap-2 rounded-card border border-status-active/30 bg-status-active/10 p-3 text-sm text-text-primary animate-fade-slide-in motion-reduce:animate-none"
                    >
                        <i className="fas fa-check-circle shrink-0 text-status-active" aria-hidden="true" />
                        {message}
                    </div>
                )}
                {error && (
                    <div
                        role="alert"
                        aria-live="assertive"
                        className="mb-4 flex items-center gap-2 rounded-card border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-text-primary animate-fade-slide-in motion-reduce:animate-none"
                    >
                        <i className="fas fa-exclamation-circle shrink-0 text-status-danger" aria-hidden="true" />
                        {error}
                    </div>
                )}

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
                            onPastePermissions={handlePastePermissions}
                            onEditWeight={setEditingWeightRole}
                            savingPerms={savingPerms}
                        />
                    ))}
                    {sortedRoles.length === 0 && (
                        <div className="flex flex-col items-center justify-center rounded-card border border-border-light bg-bg-primary px-6 py-16 text-center animate-fade-in motion-reduce:animate-none">
                            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent">
                                <i className="fas fa-shield-alt text-3xl" aria-hidden="true" />
                            </div>
                            <h3 className="mb-2 font-heading text-xl font-semibold text-text-primary">
                                No Roles Found
                            </h3>
                            <p className="max-w-md text-sm text-text-secondary">
                                {searchQuery ? 'No roles match your search.' : 'There are no roles in the system yet.'}
                            </p>
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
                onBulkAdd={handleBulkAdd}
            />
        </div>
    )
}

export default RolesView
