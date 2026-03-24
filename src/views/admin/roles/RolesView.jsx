import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import LoadingScreen from '../../../app/components/common/LoadingScreen'
import RoleModal, {
    RoleFormField,
    RoleModalBody,
    RoleModalFooter,
    RoleTextInput
} from '../../../app/components/ui/RoleModal'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { useIsMobile } from '../../../app/hooks/useIsMobile'
import { useRolesData } from '../../../app/hooks/useRolesData'
/** Extracts the namespace prefix from a permission string (e.g. "dashboard" from "dashboard.view"). */
const getNamespace = (perm) => {
    const dot = perm.indexOf('.')
    return dot > 0 ? perm.substring(0, dot) : perm
}
/** Groups an array of permission strings by their namespace prefix, sorted alphabetically. */
const groupByNamespace = (permissions) => {
    const groups = {}
    for (const perm of permissions) {
        const ns = getNamespace(perm)
        if (!groups[ns]) groups[ns] = []
        groups[ns].push(perm)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
}
/** Namespace icon mapping for visual variety. */
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
const getNamespaceIcon = (ns) => NAMESPACE_ICONS[ns] || 'fa-key'
/**
 * Admin view for managing roles and their permission nodes via an interactive
 * permission matrix. Rows are permission nodes grouped by namespace, columns
 * are roles. IT users can toggle individual cells, add new permissions, and
 * create roles. Non-IT users see a read-only view.
 */
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
    const isMobile = useIsMobile()
    const [searchQuery, setSearchQuery] = useState('')
    const [collapsedNamespaces, setCollapsedNamespaces] = useState(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [addPermModal, setAddPermModal] = useState({ initialPerm: '', open: false })
    const [editingWeight, setEditingWeight] = useState(null)
    const [pendingWeightValue, setPendingWeightValue] = useState(0)
    const [savingCells, setSavingCells] = useState(new Set())
    const [showMobileRole, setShowMobileRole] = useState(null)
    const matrixScrollRef = useRef(null)
    useEffect(() => {
        loadData()
    }, [loadData])
    // Build the full permission set from all roles
    const allPermissions = useMemo(() => {
        const permSet = new Set()
        for (const role of roles) {
            if (Array.isArray(role.permissions)) {
                for (const p of role.permissions) permSet.add(p)
            }
        }
        return [...permSet].sort((a, b) => a.localeCompare(b))
    }, [roles])
    // Filter permissions by search
    const filteredPermissions = useMemo(() => {
        if (!searchQuery.trim()) return allPermissions
        const q = searchQuery.trim().toLowerCase()
        return allPermissions.filter((p) => p.toLowerCase().includes(q))
    }, [allPermissions, searchQuery])
    const groupedPermissions = useMemo(() => groupByNamespace(filteredPermissions), [filteredPermissions])
    // Collapse all namespaces by default once permissions are loaded
    useEffect(() => {
        if (collapsedNamespaces === null && allPermissions.length > 0) {
            setCollapsedNamespaces(new Set(allPermissions.map(getNamespace)))
        }
    }, [allPermissions, collapsedNamespaces])
    const toggleNamespace = useCallback((ns) => {
        setCollapsedNamespaces((prev) => {
            const next = new Set(prev || [])
            next.has(ns) ? next.delete(ns) : next.add(ns)
            return next
        })
    }, [])
    // Toggle a single cell in the matrix
    const handleTogglePermission = useCallback(
        async (roleId, permission, currentlyHas) => {
            if (!hasITAccess) return
            const cellKey = `${roleId}:${permission}`
            setSavingCells((prev) => new Set(prev).add(cellKey))
            try {
                const role = roles.find((r) => r.id === roleId)
                if (!role) return
                const currentPerms = Array.isArray(role.permissions) ? role.permissions : []
                const newPerms = currentlyHas
                    ? currentPerms.filter((p) => p !== permission)
                    : [...currentPerms, permission]
                await updateRolePermissions(roleId, newPerms.join('\n'))
            } catch (err) {
                setError(`Failed to update: ${err.message}`)
            } finally {
                setSavingCells((prev) => {
                    const next = new Set(prev)
                    next.delete(cellKey)
                    return next
                })
            }
        },
        [hasITAccess, roles, updateRolePermissions, setError]
    )
    // Grant a permission to ALL roles at once
    const handleGrantToAll = useCallback(
        async (permission) => {
            if (!hasITAccess) return
            try {
                const roleIds = new Set(
                    roles
                        .filter((r) => {
                            const perms = Array.isArray(r.permissions) ? r.permissions : []
                            return !perms.includes(permission)
                        })
                        .map((r) => r.id)
                )
                if (roleIds.size === 0) return
                await bulkAddPermissions(roleIds, permission)
            } catch (err) {
                setError(`Failed to grant: ${err.message}`)
            }
        },
        [hasITAccess, roles, bulkAddPermissions, setError]
    )
    // Revoke a permission from ALL roles
    const handleRevokeFromAll = useCallback(
        async (permission) => {
            if (!hasITAccess) return
            if (!window.confirm(`Remove "${permission}" from all roles?`)) return
            try {
                const affected = roles
                    .filter((r) => Array.isArray(r.permissions) && r.permissions.includes(permission))
                    .map((r) => ({ role: r }))
                if (affected.length === 0) return
                await removePermissionFromAllRoles(permission, affected)
            } catch (err) {
                setError(`Failed to revoke: ${err.message}`)
            }
        },
        [hasITAccess, roles, removePermissionFromAllRoles, setError]
    )
    // Save weight edit
    const handleSaveWeight = useCallback(async () => {
        if (editingWeight === null) return
        try {
            await updateRoleWeight(editingWeight, pendingWeightValue)
        } catch (err) {
            setError(`Failed to update weight: ${err.message}`)
        }
        setEditingWeight(null)
    }, [editingWeight, pendingWeightValue, updateRoleWeight, setError])
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
    // Stats
    const totalPermissions = allPermissions.length
    const totalRoles = roles.length
    const namespacesCount = new Set(allPermissions.map(getNamespace)).size
    if (isLoading && roles.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <LoadingScreen inline message="Loading roles..." />
            </div>
        )
    }
    // Mobile: show a role-centric card list instead of the matrix
    if (isMobile) {
        return (
            <div className="min-h-screen bg-slate-50">
                <MobileHeader
                    accentColor={accentColor}
                    hasITAccess={hasITAccess}
                    totalRoles={totalRoles}
                    totalPermissions={totalPermissions}
                    onCreateRole={() => setShowCreateModal(true)}
                />
                <div className="px-4 py-4">
                    <AlertMessage message={message} type="success" />
                    <AlertMessage message={error} type="error" />
                    <MobileRoleList
                        roles={roles}
                        hasITAccess={hasITAccess}
                        accentColor={accentColor}
                        showMobileRole={showMobileRole}
                        setShowMobileRole={setShowMobileRole}
                        onTogglePermission={handleTogglePermission}
                        savingCells={savingCells}
                    />
                </div>
                <CreateRoleModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateRole}
                />
            </div>
        )
    }
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div
                className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm"
                style={{
                    backgroundImage: `
                        linear-gradient(${accentColor}10 1px, transparent 1px),
                        linear-gradient(90deg, ${accentColor}10 1px, transparent 1px),
                        radial-gradient(circle at center, ${accentColor}08 0%, transparent 50%)
                    `,
                    backgroundPosition: '0 0, 0 0, 0 0',
                    backgroundSize: '20px 20px, 20px 20px, 40px 40px'
                }}
            >
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between gap-4 mb-3">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold text-slate-800 m-0">Roles & Permissions</h1>
                            {hasITAccess && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold">
                                    <i className="fas fa-shield-alt text-[10px]" />
                                    IT Access
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2.5">
                            <button
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border-none cursor-pointer transition-colors bg-slate-100 hover:bg-slate-200 text-slate-700"
                                onClick={() => {
                                    const exportData = roles.map((r) => ({
                                        name: r.name,
                                        weight: r.weight,
                                        permissions: Array.isArray(r.permissions) ? [...r.permissions].sort() : []
                                    }))
                                    const json = JSON.stringify(exportData, null, 2)
                                    navigator.clipboard
                                        .writeText(json)
                                        .then(() => {
                                            alert('Permissions copied to clipboard')
                                        })
                                        .catch(() => {
                                            const blob = new Blob([json], { type: 'application/json' })
                                            const url = URL.createObjectURL(blob)
                                            const a = document.createElement('a')
                                            a.href = url
                                            a.download = 'roles-permissions.json'
                                            a.click()
                                            URL.revokeObjectURL(url)
                                        })
                                }}
                                type="button"
                            >
                                <i className="fas fa-download" />
                                Export
                            </button>
                            {hasITAccess && (
                                <>
                                    <button
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border-none cursor-pointer transition-colors bg-slate-100 hover:bg-slate-200 text-slate-700"
                                        onClick={() => setAddPermModal({ initialPerm: '', open: true })}
                                        type="button"
                                    >
                                        <i className="fas fa-key" />
                                        Add Permission
                                    </button>
                                    <button
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white border-none cursor-pointer"
                                        style={{ backgroundColor: accentColor }}
                                        onClick={() => setShowCreateModal(true)}
                                        type="button"
                                    >
                                        <i className="fas fa-plus" />
                                        New Role
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Search */}
                        <div className="relative flex-1 max-w-md">
                            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none py-2.5 pl-10 pr-4 placeholder:text-slate-400"
                                placeholder="Filter permissions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 bg-slate-200 rounded text-slate-500 text-[10px] cursor-pointer border-none"
                                    onClick={() => setSearchQuery('')}
                                    type="button"
                                >
                                    <i className="fas fa-times" />
                                </button>
                            )}
                        </div>
                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <i className="fas fa-user-shield" />
                                {totalRoles} roles
                            </span>
                            <span className="flex items-center gap-1.5">
                                <i className="fas fa-key" />
                                {totalPermissions} permissions
                            </span>
                            <span className="flex items-center gap-1.5">
                                <i className="fas fa-folder" />
                                {namespacesCount} namespaces
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            {/* Messages */}
            <div className="px-6 pt-4">
                <AlertMessage message={message} type="success" />
                <AlertMessage message={error} type="error" />
            </div>
            {/* Matrix */}
            {roles.length === 0 || allPermissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                    <i className="fas fa-th text-5xl mb-4" />
                    <p className="text-lg font-semibold text-slate-600 mb-1">No Data Yet</p>
                    <p className="text-sm">Create a role and add permissions to populate the matrix.</p>
                </div>
            ) : (
                <div className="px-6 py-4">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div
                            className="overflow-y-auto"
                            ref={matrixScrollRef}
                            style={{ maxHeight: 'calc(100vh - 320px)' }}
                        >
                            <table className="w-full border-collapse table-fixed">
                                <thead className="sticky top-0 z-[6]">
                                    <tr>
                                        <th className="sticky left-0 z-[7] bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-2 border-b border-r border-slate-200 w-52">
                                            Permission
                                        </th>
                                        {roles.map((role) => {
                                            const permCount = Array.isArray(role.permissions)
                                                ? role.permissions.length
                                                : 0
                                            return (
                                                <th
                                                    key={role.id}
                                                    className="text-center border-b border-slate-200 px-1 py-2 bg-slate-50"
                                                >
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span
                                                            className="text-[11px] font-bold text-slate-700 leading-tight truncate max-w-full"
                                                            title={role.name}
                                                        >
                                                            {role.name}
                                                        </span>
                                                        {editingWeight === role.id ? (
                                                            <div className="flex items-center gap-0.5">
                                                                <input
                                                                    type="number"
                                                                    className="w-10 text-center text-[10px] border border-slate-300 rounded px-0.5 py-0 outline-none"
                                                                    value={pendingWeightValue}
                                                                    onChange={(e) =>
                                                                        setPendingWeightValue(
                                                                            parseInt(e.target.value) || 0
                                                                        )
                                                                    }
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleSaveWeight()
                                                                        if (e.key === 'Escape') setEditingWeight(null)
                                                                    }}
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    className="text-emerald-600 text-[9px] cursor-pointer bg-transparent border-none p-0"
                                                                    onClick={handleSaveWeight}
                                                                    type="button"
                                                                >
                                                                    <i className="fas fa-check" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span
                                                                className={`text-[9px] text-slate-400 leading-none ${hasITAccess ? 'cursor-pointer hover:text-slate-600' : ''}`}
                                                                onClick={() => {
                                                                    if (!hasITAccess) return
                                                                    setEditingWeight(role.id)
                                                                    setPendingWeightValue(role.weight || 0)
                                                                }}
                                                            >
                                                                w:{role.weight || 0} &middot; {permCount}
                                                                {hasITAccess && (
                                                                    <i className="fas fa-pencil-alt ml-0.5 text-[7px]" />
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </th>
                                            )
                                        })}
                                        {hasITAccess && (
                                            <th
                                                className="text-center border-b border-slate-200 px-1 py-2 bg-slate-50"
                                                style={{ width: 52 }}
                                            />
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedPermissions.map(([namespace, perms]) => {
                                        const isCollapsed = !collapsedNamespaces || collapsedNamespaces.has(namespace)
                                        const nsIcon = getNamespaceIcon(namespace)
                                        const nsCounts = roles.map((role) => {
                                            const rp = Array.isArray(role.permissions) ? role.permissions : []
                                            return perms.filter((p) => rp.includes(p)).length
                                        })
                                        return (
                                            <React.Fragment key={namespace}>
                                                <tr
                                                    className="cursor-pointer hover:bg-slate-100 transition-colors"
                                                    onClick={() => toggleNamespace(namespace)}
                                                >
                                                    <td className="sticky left-0 z-[4] bg-slate-50 px-3 py-1.5 border-b border-r border-slate-100 text-[12px] font-semibold text-slate-600">
                                                        <div className="flex items-center gap-2">
                                                            <i
                                                                className={`fas fa-chevron-${isCollapsed ? 'right' : 'down'} text-[8px] text-slate-400 w-2.5`}
                                                            />
                                                            <i className={`fas ${nsIcon} text-slate-400 text-[10px]`} />
                                                            <span>{namespace}</span>
                                                            <span className="text-[10px] text-slate-400 font-normal">
                                                                ({perms.length})
                                                            </span>
                                                        </div>
                                                    </td>
                                                    {nsCounts.map((count, i) => (
                                                        <td
                                                            key={roles[i].id}
                                                            className="text-center border-b border-slate-100 px-1 py-1.5"
                                                        >
                                                            <span
                                                                className={`text-[10px] font-semibold ${count === perms.length ? 'text-emerald-600' : count > 0 ? 'text-slate-500' : 'text-slate-300'}`}
                                                            >
                                                                {count}/{perms.length}
                                                            </span>
                                                        </td>
                                                    ))}
                                                    {hasITAccess && <td className="border-b border-slate-100" />}
                                                </tr>
                                                {!isCollapsed &&
                                                    perms.map((perm) => {
                                                        const shortName = perm.substring(namespace.length + 1) || perm
                                                        return (
                                                            <tr
                                                                key={perm}
                                                                className="hover:bg-blue-50 transition-colors group"
                                                            >
                                                                <td className="sticky left-0 z-[3] bg-white group-hover:bg-blue-50 transition-colors px-3 py-[5px] border-b border-r border-slate-100">
                                                                    <code className="text-[11px] text-slate-500 font-mono pl-5">
                                                                        <span className="text-slate-300">
                                                                            {namespace}.
                                                                        </span>
                                                                        {shortName}
                                                                    </code>
                                                                </td>
                                                                {roles.map((role) => {
                                                                    const rp = Array.isArray(role.permissions)
                                                                        ? role.permissions
                                                                        : []
                                                                    const has = rp.includes(perm)
                                                                    const cellKey = `${role.id}:${perm}`
                                                                    const isSaving = savingCells.has(cellKey)
                                                                    return (
                                                                        <td
                                                                            key={role.id}
                                                                            className="text-center border-b border-slate-100 px-1 py-[5px]"
                                                                        >
                                                                            <MatrixCell
                                                                                has={has}
                                                                                isSaving={isSaving}
                                                                                canEdit={hasITAccess}
                                                                                accentColor={accentColor}
                                                                                onClick={() =>
                                                                                    handleTogglePermission(
                                                                                        role.id,
                                                                                        perm,
                                                                                        has
                                                                                    )
                                                                                }
                                                                            />
                                                                        </td>
                                                                    )
                                                                })}
                                                                {hasITAccess && (
                                                                    <td className="text-center border-b border-slate-100 px-1 py-[5px]">
                                                                        <RowActions
                                                                            perm={perm}
                                                                            roles={roles}
                                                                            onGrantAll={() => handleGrantToAll(perm)}
                                                                            onRevokeAll={() =>
                                                                                handleRevokeFromAll(perm)
                                                                            }
                                                                            onSelectRoles={() =>
                                                                                setAddPermModal({
                                                                                    initialPerm: perm,
                                                                                    open: true
                                                                                })
                                                                            }
                                                                        />
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        )
                                                    })}
                                            </React.Fragment>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* Legend bar */}
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mt-3">
                        <div className="flex items-center gap-5 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-emerald-500 border border-emerald-400">
                                    <i className="fas fa-check text-white text-[7px]" />
                                </span>
                                Granted
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="inline-block w-4 h-4 rounded border border-slate-200 bg-slate-50" />
                                Not granted
                            </span>
                            <span className="text-slate-300">|</span>
                            <span>
                                {totalPermissions} permissions across {totalRoles} roles
                            </span>
                        </div>
                        {hasITAccess && (
                            <span className="text-[11px] text-slate-400">
                                <i className="fas fa-mouse-pointer mr-1 text-[9px]" />
                                Click cells to toggle permissions
                            </span>
                        )}
                    </div>
                </div>
            )}
            <CreateRoleModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateRole}
            />
            <AddPermissionModal
                isOpen={addPermModal.open}
                initialPerm={addPermModal.initialPerm}
                roles={roles}
                onClose={() => setAddPermModal({ initialPerm: '', open: false })}
                onGrant={async (roleIds, perm) => {
                    await bulkAddPermissions(roleIds, perm)
                    setAddPermModal({ initialPerm: '', open: false })
                }}
            />
        </div>
    )
}
/** Single cell in the permission matrix — a compact styled checkbox. */
function MatrixCell({ has, isSaving, canEdit, accentColor: _accentColor, onClick }) {
    if (isSaving) {
        return (
            <div className="inline-flex items-center justify-center w-5 h-5">
                <i className="fas fa-spinner fa-spin text-slate-400 text-[9px]" />
            </div>
        )
    }
    return (
        <button
            type="button"
            className={`inline-flex items-center justify-center w-5 h-5 rounded border transition-all duration-100 ${
                has
                    ? 'border-emerald-400 bg-emerald-500 hover:bg-emerald-600'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
            } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={canEdit ? onClick : undefined}
            disabled={!canEdit}
            aria-label={has ? 'Granted' : 'Not granted'}
        >
            {has && <i className="fas fa-check text-white text-[8px]" />}
        </button>
    )
}
/** Row-level actions: select specific roles, grant to all, revoke from all. */
function RowActions({ perm, roles, onGrantAll, onRevokeAll, onSelectRoles }) {
    const allHave = roles.every((r) => Array.isArray(r.permissions) && r.permissions.includes(perm))
    const noneHave = roles.every((r) => !Array.isArray(r.permissions) || !r.permissions.includes(perm))
    return (
        <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                type="button"
                className="w-5 h-5 rounded bg-slate-100 text-slate-500 text-[8px] cursor-pointer hover:bg-slate-200 transition-colors flex items-center justify-center border-none"
                onClick={onSelectRoles}
                title="Grant to specific roles..."
            >
                <i className="fas fa-list-check" />
            </button>
            {!allHave && (
                <button
                    type="button"
                    className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 text-[8px] cursor-pointer hover:bg-emerald-100 transition-colors flex items-center justify-center border-none"
                    onClick={onGrantAll}
                    title="Grant to all roles"
                >
                    <i className="fas fa-plus" />
                </button>
            )}
            {!noneHave && (
                <button
                    type="button"
                    className="w-5 h-5 rounded bg-red-50 text-red-500 text-[8px] cursor-pointer hover:bg-red-100 transition-colors flex items-center justify-center border-none"
                    onClick={onRevokeAll}
                    title="Revoke from all roles"
                >
                    <i className="fas fa-times" />
                </button>
            )}
        </div>
    )
}
/**
 * Modal for adding a new permission node and granting it to one or more roles at once.
 * When initialPerm is provided (triggered from a matrix row), the permission field is pre-filled
 * and locked so the user just picks which roles to grant it to.
 */
function AddPermissionModal({ isOpen, onClose, onGrant, roles, initialPerm }) {
    const [perm, setPerm] = useState('')
    const [selectedRoleIds, setSelectedRoleIds] = useState(new Set())
    const [submitting, setSubmitting] = useState(false)
    const isPreFilled = !!initialPerm
    useEffect(() => {
        if (isOpen) {
            setPerm(initialPerm || '')
            setSelectedRoleIds(new Set())
        }
    }, [isOpen, initialPerm])
    const toggleRole = (id) =>
        setSelectedRoleIds((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    const toggleAll = () =>
        setSelectedRoleIds((prev) => (prev.size === roles.length ? new Set() : new Set(roles.map((r) => r.id))))
    const handleSubmit = async () => {
        if (!perm.trim() || !selectedRoleIds.size) return
        setSubmitting(true)
        try {
            await onGrant(selectedRoleIds, perm.trim())
        } finally {
            setSubmitting(false)
        }
    }
    const trimmedPerm = perm.trim()
    const canSubmit = trimmedPerm.length > 0 && selectedRoleIds.size > 0
    return (
        <RoleModal
            isOpen={isOpen}
            onClose={onClose}
            title={isPreFilled ? 'Grant to Roles' : 'Add Permission'}
            subtitle={
                isPreFilled
                    ? `Select which roles should receive "${trimmedPerm}"`
                    : 'Define a permission node and grant it to one or more roles'
            }
            titleIcon="fas fa-key"
        >
            <RoleModalBody>
                <RoleFormField label="Permission Node">
                    <RoleTextInput
                        value={perm}
                        onChange={isPreFilled ? () => {} : setPerm}
                        placeholder="e.g. reports.lostloads"
                        disabled={isPreFilled}
                    />
                    {!isPreFilled && (
                        <p className="text-xs text-slate-400 mt-1">
                            Use dot notation: <code className="font-mono">namespace.action</code>
                        </p>
                    )}
                </RoleFormField>
                <RoleFormField label={`Roles — ${selectedRoleIds.size} of ${roles.length} selected`}>
                    <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto border border-slate-200 rounded-lg">
                        <button
                            type="button"
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 text-left border-b border-slate-100 sticky top-0 bg-white"
                            onClick={toggleAll}
                        >
                            <div
                                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                    selectedRoleIds.size === roles.length
                                        ? 'border-emerald-400 bg-emerald-500'
                                        : 'border-slate-300'
                                }`}
                            >
                                {selectedRoleIds.size === roles.length && (
                                    <i className="fas fa-check text-white text-[7px]" />
                                )}
                            </div>
                            {selectedRoleIds.size === roles.length ? 'Deselect all' : 'Select all'}
                        </button>
                        {roles.map((role) => {
                            const isSelected = selectedRoleIds.has(role.id)
                            const alreadyHas =
                                trimmedPerm && Array.isArray(role.permissions) && role.permissions.includes(trimmedPerm)
                            return (
                                <button
                                    key={role.id}
                                    type="button"
                                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors"
                                    onClick={() => toggleRole(role.id)}
                                >
                                    <div
                                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                            isSelected ? 'border-emerald-400 bg-emerald-500' : 'border-slate-300'
                                        }`}
                                    >
                                        {isSelected && <i className="fas fa-check text-white text-[7px]" />}
                                    </div>
                                    <span className="flex-1 text-slate-700">{role.name}</span>
                                    {alreadyHas && (
                                        <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                                            already granted
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </RoleFormField>
            </RoleModalBody>
            <RoleModalFooter
                disabled={!canSubmit}
                isLoading={submitting}
                loadingText="Granting..."
                onCancel={onClose}
                onSubmit={handleSubmit}
                submitText={
                    selectedRoleIds.size > 0
                        ? `Grant to ${selectedRoleIds.size} Role${selectedRoleIds.size !== 1 ? 's' : ''}`
                        : 'Select roles to continue'
                }
            />
        </RoleModal>
    )
}
function AlertMessage({ message, type = 'success' }) {
    if (!message) return null
    const isSuccess = type === 'success'
    return (
        <div
            className={`mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border ${isSuccess ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}
        >
            <i className={`fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
            <span className="text-sm font-medium">{message}</span>
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
            subtitle="Add a new role column to the matrix"
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
/** Mobile header with compact stats. */
function MobileHeader({ accentColor, hasITAccess, totalRoles, totalPermissions, onCreateRole }) {
    return (
        <div
            className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm px-4 py-3"
            style={{
                backgroundImage: `
                    linear-gradient(${accentColor}10 1px, transparent 1px),
                    linear-gradient(90deg, ${accentColor}10 1px, transparent 1px),
                    radial-gradient(circle at center, ${accentColor}08 0%, transparent 50%)
                `,
                backgroundPosition: '0 0, 0 0, 0 0',
                backgroundSize: '20px 20px, 20px 20px, 40px 40px'
            }}
        >
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-lg font-bold text-slate-800 m-0">Roles</h1>
                <div className="flex items-center gap-2">
                    {hasITAccess && (
                        <button
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white border-none cursor-pointer"
                            style={{ backgroundColor: accentColor }}
                            onClick={onCreateRole}
                            type="button"
                        >
                            <i className="fas fa-plus text-xs" />
                            New Role
                        </button>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>{totalRoles} roles</span>
                <span>{totalPermissions} permissions</span>
            </div>
        </div>
    )
}
/** Mobile role list — each role is an expandable card showing its permissions. */
function MobileRoleList({
    roles,
    hasITAccess: _hasITAccess,
    accentColor,
    showMobileRole,
    setShowMobileRole,
    onTogglePermission: _onTogglePermission,
    savingCells: _savingCells
}) {
    if (roles.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <i className="fas fa-user-shield text-4xl mb-4" />
                <p>No roles found</p>
            </div>
        )
    }
    return (
        <div className="space-y-3">
            {roles.map((role) => {
                const isOpen = showMobileRole === role.id
                const perms = Array.isArray(role.permissions) ? [...role.permissions].sort() : []
                const grouped = groupByNamespace(perms)
                return (
                    <div key={role.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <button
                            className="w-full flex items-center justify-between px-4 py-3.5 cursor-pointer bg-transparent border-none text-left"
                            onClick={() => setShowMobileRole(isOpen ? null : role.id)}
                            type="button"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `${accentColor}15` }}
                                >
                                    <i className="fas fa-user-shield" style={{ color: accentColor, fontSize: 14 }} />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">{role.name}</div>
                                    <div className="text-xs text-slate-400">
                                        w:{role.weight || 0} &middot; {perms.length} permissions
                                    </div>
                                </div>
                            </div>
                            <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-slate-400 text-xs`} />
                        </button>
                        {isOpen && (
                            <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
                                {grouped.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-4">No permissions</p>
                                ) : (
                                    grouped.map(([ns, nsPerms]) => (
                                        <div key={ns} className="mb-3 last:mb-0">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <i
                                                    className={`fas ${getNamespaceIcon(ns)} text-slate-400 text-[10px]`}
                                                />
                                                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                                    {ns}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {nsPerms.map((perm) => {
                                                    const short = perm.substring(ns.length + 1) || perm
                                                    return (
                                                        <span
                                                            key={perm}
                                                            className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-mono text-slate-600"
                                                        >
                                                            <i className="fas fa-check-circle text-emerald-500 text-[9px]" />
                                                            {short}
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
export default RolesView
