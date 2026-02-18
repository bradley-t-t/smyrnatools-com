import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import LoadingScreen from '../../app/components/common/LoadingScreen'
import { supabase } from '../../services/DatabaseService'
import { UserService } from '../../services/UserService'

function RolesView() {
    const [roles, setRoles] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [hasITAccess, setHasITAccess] = useState(false)
    const [expandedRoles, setExpandedRoles] = useState(new Set())
    const [editingRole, setEditingRole] = useState(null)
    const [editedPermissions, setEditedPermissions] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newRoleName, setNewRoleName] = useState('')
    const [newRoleWeight, setNewRoleWeight] = useState(0)
    const [isCreating, setIsCreating] = useState(false)
    const [editingWeight, setEditingWeight] = useState(null)
    const [editedWeight, setEditedWeight] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [showSearchModal, setShowSearchModal] = useState(false)
    const [showBulkAddModal, setShowBulkAddModal] = useState(false)
    const [selectedRoles, setSelectedRoles] = useState(new Set())
    const [bulkPermissionText, setBulkPermissionText] = useState('')
    const [isBulkAdding, setIsBulkAdding] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setIsLoading(true)
        setError('')
        try {
            const user = await UserService.getCurrentUser()
            if (!user?.id) {
                setError('Unable to authenticate user')
                setIsLoading(false)
                return
            }

            const userRoles = await UserService.getUserRoles(user.id)
            const hasIT = userRoles.some((role) => role.name === 'IT Access')
            setHasITAccess(hasIT)

            const allRoles = await UserService.getAllRoles()
            const sortedRoles = allRoles.sort((a, b) => (b.weight || 0) - (a.weight || 0))
            setRoles(sortedRoles)
        } catch (err) {
            console.error('Error loading roles:', err)
            setError('Failed to load roles. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const toggleRole = (roleId) => {
        const newExpanded = new Set(expandedRoles)
        if (newExpanded.has(roleId)) {
            newExpanded.delete(roleId)
        } else {
            newExpanded.add(roleId)
        }
        setExpandedRoles(newExpanded)
    }

    const startEditing = (role) => {
        if (!hasITAccess) return
        const newExpanded = new Set(expandedRoles)
        newExpanded.add(role.id)
        setExpandedRoles(newExpanded)
        setEditingRole(role.id)
        setEditedPermissions(Array.isArray(role.permissions) ? role.permissions.join('\n') : '')
        setMessage('')
        setError('')
    }

    const cancelEditing = () => {
        setEditingRole(null)
        setEditedPermissions('')
        setMessage('')
        setError('')
    }

    const savePermissions = async () => {
        if (!editingRole || !hasITAccess) {
            return
        }

        setIsSaving(true)
        setMessage('')
        setError('')

        try {
            const permissionsArray = editedPermissions
                .split('\n')
                .map((p) => p.trim())
                .filter((p) => p.length > 0)

            const uniquePermissions = [...new Set(permissionsArray)]
            const sortedPermissions = uniquePermissions.sort((a, b) => a.localeCompare(b))

            const { error: updateError } = await supabase
                .from('users_roles')
                .update({ permissions: sortedPermissions })
                .eq('id', editingRole)

            if (updateError) {
                throw updateError
            }

            UserService.clearCache()
            await loadData()

            const newExpanded = new Set(expandedRoles)
            newExpanded.delete(editingRole)
            setExpandedRoles(newExpanded)

            setEditingRole(null)
            setEditedPermissions('')
            setMessage('Permissions updated successfully (duplicates removed, sorted alphabetically)')
            setTimeout(() => setMessage(''), 3000)
        } catch (err) {
            console.error('Error saving permissions:', err)
            setError(`Failed to save permissions: ${err.message || 'Please try again.'}`)
        } finally {
            setIsSaving(false)
        }
    }

    const getPermissionCount = (role) => {
        if (!role.permissions) return 0
        return Array.isArray(role.permissions) ? role.permissions.length : 0
    }

    const formatPermissions = (permissions) => {
        if (!permissions || !Array.isArray(permissions)) return []
        return permissions.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    }

    const createRole = async () => {
        if (!newRoleName.trim() || !hasITAccess) return

        setIsCreating(true)
        setError('')

        try {
            const { error: createError } = await supabase
                .from('users_roles')
                .insert([
                    {
                        name: newRoleName.trim(),
                        permissions: [],
                        weight: newRoleWeight
                    }
                ])
                .select()

            if (createError) {
                throw createError
            }

            UserService.clearCache()
            await loadData()
            setShowCreateModal(false)
            setNewRoleName('')
            setNewRoleWeight(0)
            setMessage(`Role "${newRoleName}" created successfully`)
            setTimeout(() => setMessage(''), 3000)
        } catch (err) {
            console.error('Error creating role:', err)
            setError(`Failed to create role: ${err.message}`)
        } finally {
            setIsCreating(false)
        }
    }

    const startEditingWeight = (role) => {
        if (!hasITAccess) return
        setEditingWeight(role.id)
        setEditedWeight(role.weight || 0)
    }

    const saveWeight = async (roleId) => {
        if (!hasITAccess) return

        try {
            const { error: updateError } = await supabase
                .from('users_roles')
                .update({ weight: editedWeight })
                .eq('id', roleId)

            if (updateError) {
                throw updateError
            }

            UserService.clearCache()
            await loadData()
            setEditingWeight(null)
            setMessage('Weight updated successfully')
            setTimeout(() => setMessage(''), 3000)
        } catch (err) {
            console.error('Error updating weight:', err)
            setError(`Failed to update weight: ${err.message}`)
        }
    }

    const cancelEditingWeight = () => {
        setEditingWeight(null)
        setEditedWeight(0)
    }

    const searchPermissions = (query) => {
        setSearchQuery(query)

        if (!query.trim()) {
            setSearchResults([])
            return
        }

        const results = []
        const lowerQuery = query.toLowerCase()

        roles.forEach((role) => {
            if (role.permissions && Array.isArray(role.permissions)) {
                const matchingPermissions = role.permissions.filter((perm) => perm.toLowerCase().includes(lowerQuery))

                if (matchingPermissions.length > 0) {
                    results.push({
                        matchingPermissions: matchingPermissions,
                        role: role
                    })
                }
            }
        })

        setSearchResults(results)
    }

    const openSearch = () => {
        setShowSearchModal(true)
        setSearchQuery('')
        setSearchResults([])
    }

    const closeSearch = () => {
        setShowSearchModal(false)
        setSearchQuery('')
        setSearchResults([])
    }

    const removePermissionFromAll = async (permissionToRemove) => {
        if (!hasITAccess || !permissionToRemove) return

        if (!window.confirm(`Are you sure you want to remove "${permissionToRemove}" from all roles that have it?`)) {
            return
        }

        setError('')
        setMessage('')

        try {
            let rolesModified = 0

            for (const result of searchResults) {
                const role = result.role
                const hasExactMatch = role.permissions.includes(permissionToRemove)

                if (hasExactMatch) {
                    const updatedPermissions = role.permissions.filter((p) => p !== permissionToRemove)
                    const sortedPermissions = updatedPermissions.sort((a, b) => a.localeCompare(b))

                    const { error: updateError } = await supabase
                        .from('users_roles')
                        .update({ permissions: sortedPermissions })
                        .eq('id', role.id)

                    if (updateError) {
                        throw updateError
                    }

                    rolesModified++
                }
            }

            UserService.clearCache()
            await loadData()

            const updatedResults = searchResults
                .map((result) => {
                    const updatedPermissions = result.matchingPermissions.filter((p) => p !== permissionToRemove)
                    return {
                        ...result,
                        matchingPermissions: updatedPermissions
                    }
                })
                .filter((result) => result.matchingPermissions.length > 0)

            setSearchResults(updatedResults)

            setMessage(
                `Successfully removed "${permissionToRemove}" from ${rolesModified} ${rolesModified === 1 ? 'role' : 'roles'}`
            )
            setTimeout(() => setMessage(''), 5000)
        } catch (err) {
            console.error('Error removing permission:', err)
            setError(`Failed to remove permission: ${err.message}`)
        }
    }

    const removePermissionFromRole = async (permissionToRemove, roleId, roleName) => {
        if (!hasITAccess || !permissionToRemove || !roleId) return

        if (!window.confirm(`Remove "${permissionToRemove}" from "${roleName}"?`)) {
            return
        }

        setError('')
        setMessage('')

        try {
            const role = roles.find((r) => r.id === roleId)
            if (!role) return

            const updatedPermissions = role.permissions.filter((p) => p !== permissionToRemove)
            const sortedPermissions = updatedPermissions.sort((a, b) => a.localeCompare(b))

            const { error: updateError } = await supabase
                .from('users_roles')
                .update({ permissions: sortedPermissions })
                .eq('id', roleId)

            if (updateError) {
                throw updateError
            }

            UserService.clearCache()
            await loadData()

            const updatedResults = searchResults
                .map((result) => {
                    if (result.role.id === roleId) {
                        const updatedPermissions = result.matchingPermissions.filter((p) => p !== permissionToRemove)
                        return {
                            ...result,
                            matchingPermissions: updatedPermissions
                        }
                    }
                    return result
                })
                .filter((result) => result.matchingPermissions.length > 0)

            setSearchResults(updatedResults)

            setMessage(`Successfully removed "${permissionToRemove}" from "${roleName}"`)
            setTimeout(() => setMessage(''), 3000)
        } catch (err) {
            console.error('Error removing permission:', err)
            setError(`Failed to remove permission: ${err.message}`)
        }
    }

    const toggleRoleSelection = (roleId) => {
        const newSelection = new Set(selectedRoles)
        if (newSelection.has(roleId)) {
            newSelection.delete(roleId)
        } else {
            newSelection.add(roleId)
        }
        setSelectedRoles(newSelection)
    }

    const openBulkAddModal = () => {
        setShowBulkAddModal(true)
        setSelectedRoles(new Set())
        setBulkPermissionText('')
        setError('')
        setMessage('')
    }

    const closeBulkAddModal = () => {
        setShowBulkAddModal(false)
        setSelectedRoles(new Set())
        setBulkPermissionText('')
    }

    const bulkAddPermission = async () => {
        if (!hasITAccess || selectedRoles.size === 0 || !bulkPermissionText.trim()) {
            return
        }

        const permissionsToAdd = bulkPermissionText
            .split('\n')
            .map((p) => p.trim())
            .filter((p) => p.length > 0)

        if (permissionsToAdd.length === 0) {
            setError('Please enter at least one permission node')
            return
        }

        setIsBulkAdding(true)
        setError('')
        setMessage('')

        try {
            let rolesModified = 0

            for (const roleId of selectedRoles) {
                const role = roles.find((r) => r.id === roleId)
                if (!role) continue

                const existingPermissions = Array.isArray(role.permissions) ? role.permissions : []
                const combinedPermissions = [...existingPermissions, ...permissionsToAdd]
                const uniquePermissions = [...new Set(combinedPermissions)]
                const sortedPermissions = uniquePermissions.sort((a, b) => a.localeCompare(b))

                const permissionsChanged =
                    JSON.stringify(existingPermissions.sort()) !== JSON.stringify(sortedPermissions)

                if (permissionsChanged) {
                    const { error: updateError } = await supabase
                        .from('users_roles')
                        .update({ permissions: sortedPermissions })
                        .eq('id', roleId)

                    if (updateError) {
                        throw updateError
                    }

                    rolesModified++
                }
            }

            UserService.clearCache()
            await loadData()
            closeBulkAddModal()

            const permText = permissionsToAdd.length === 1 ? 'permission' : 'permissions'
            const roleText = rolesModified === 1 ? 'role' : 'roles'
            setMessage(`Successfully added ${permissionsToAdd.length} ${permText} to ${rolesModified} ${roleText}`)
            setTimeout(() => setMessage(''), 5000)
        } catch (err) {
            console.error('Error adding permissions:', err)
            setError(`Failed to add permissions: ${err.message}`)
        } finally {
            setIsBulkAdding(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <LoadingScreen message="Loading roles..." inline={true} />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div
                className="sticky top-0 z-10 border-b border-slate-200 px-6 py-5"
                style={{
                    backgroundColor: 'white',
                    backgroundImage: `
                        linear-gradient(rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                        radial-gradient(circle at center, rgba(30, 58, 95, 0.015) 0%, transparent 50%)
                    `,
                    backgroundPosition: '0 0, 0 0, 0 0',
                    backgroundSize: '20px 20px, 20px 20px, 40px 40px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}
            >
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Roles & Permissions</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {hasITAccess
                                ? 'View and manage all roles and their permission nodes'
                                : 'View all roles and their permission nodes'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {hasITAccess && (
                            <button
                                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-sm"
                                onClick={openBulkAddModal}
                            >
                                <i className="fas fa-layer-group"></i>
                                Bulk Add
                            </button>
                        )}
                        {hasITAccess && (
                            <button
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#1e3a5f] hover:bg-[#152d4a] text-white font-semibold rounded-lg transition-colors text-sm"
                                onClick={() => setShowCreateModal(true)}
                            >
                                <i className="fas fa-plus"></i>
                                Create Role
                            </button>
                        )}
                        {hasITAccess && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                                <i className="fas fa-shield-alt"></i>
                                IT Access
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-6">
                <div className="mb-6">
                    <button
                        className="w-full flex items-center gap-3 px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
                        onClick={openSearch}
                    >
                        <i className="fas fa-search text-slate-400"></i>
                        <span>Search permission nodes...</span>
                    </button>
                </div>

                {message && (
                    <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
                        <i className="fas fa-check-circle"></i>
                        <span className="text-sm font-medium">{message}</span>
                    </div>
                )}

                {error && (
                    <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                        <i className="fas fa-exclamation-circle"></i>
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                <div className="space-y-4">
                    {roles.map((role) => {
                        const isExpanded = expandedRoles.has(role.id)
                        const isEditing = editingRole === role.id
                        const permissionCount = getPermissionCount(role)
                        const permissions = formatPermissions(role.permissions)

                        return (
                            <div
                                key={role.id}
                                className={`bg-white rounded-xl border ${isExpanded ? 'border-[#1e3a5f]/30 shadow-md' : 'border-slate-200'} overflow-hidden transition-all`}
                            >
                                <div
                                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => !isEditing && toggleRole(role.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 bg-[#1e3a5f]/10 rounded-xl flex items-center justify-center">
                                            <i className="fas fa-user-shield text-[#1e3a5f]"></i>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">{role.name}</h3>
                                            <div className="flex items-center gap-4 mt-1">
                                                {editingWeight === role.id && hasITAccess ? (
                                                    <span className="flex items-center gap-2 text-xs text-slate-500">
                                                        <i className="fas fa-weight-hanging"></i>
                                                        Weight:
                                                        <input
                                                            type="number"
                                                            value={editedWeight}
                                                            onChange={(e) =>
                                                                setEditedWeight(parseInt(e.target.value) || 0)
                                                            }
                                                            className="w-16 px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#1e3a5f]"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <button
                                                            className="w-6 h-6 bg-emerald-100 hover:bg-emerald-200 text-emerald-600 rounded flex items-center justify-center"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                saveWeight(role.id)
                                                            }}
                                                        >
                                                            <i className="fas fa-check text-xs"></i>
                                                        </button>
                                                        <button
                                                            className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded flex items-center justify-center"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                cancelEditingWeight()
                                                            }}
                                                        >
                                                            <i className="fas fa-times text-xs"></i>
                                                        </button>
                                                    </span>
                                                ) : (
                                                    <span
                                                        className={`flex items-center gap-1.5 text-xs text-slate-500 ${hasITAccess ? 'cursor-pointer hover:text-[#1e3a5f]' : ''}`}
                                                        onClick={(e) => {
                                                            if (hasITAccess) {
                                                                e.stopPropagation()
                                                                startEditingWeight(role)
                                                            }
                                                        }}
                                                    >
                                                        <i className="fas fa-weight-hanging"></i>
                                                        Weight: {role.weight || 0}
                                                        {hasITAccess && (
                                                            <i className="fas fa-pencil-alt text-[10px] ml-1"></i>
                                                        )}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <i className="fas fa-key"></i>
                                                    {permissionCount}{' '}
                                                    {permissionCount === 1 ? 'permission' : 'permissions'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {hasITAccess && !isEditing && (
                                            <button
                                                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    startEditing(role)
                                                }}
                                            >
                                                <i className="fas fa-edit text-xs"></i>
                                                Edit
                                            </button>
                                        )}
                                        {!isEditing && (
                                            <i
                                                className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-slate-400`}
                                            ></i>
                                        )}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-slate-200 px-5 py-4 bg-slate-50">
                                        {isEditing ? (
                                            <div>
                                                <div className="mb-4">
                                                    <h4 className="font-semibold text-slate-800 mb-1">
                                                        Edit Permissions for {role.name}
                                                    </h4>
                                                    <p className="text-sm text-slate-500">
                                                        Enter one permission node per line
                                                    </p>
                                                </div>
                                                <textarea
                                                    className="w-full h-64 px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-700 focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 resize-none"
                                                    value={editedPermissions}
                                                    onChange={(e) => setEditedPermissions(e.target.value)}
                                                    placeholder="Enter permissions (one per line)&#10;Example:&#10;dashboard.view&#10;mixers.view&#10;mixers.edit"
                                                />
                                                <div className="flex items-center gap-3 mt-4">
                                                    <button
                                                        className="flex items-center gap-2 px-4 py-2.5 bg-[#1e3a5f] hover:bg-[#152d4a] text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
                                                        onClick={savePermissions}
                                                        disabled={isSaving}
                                                    >
                                                        {isSaving ? (
                                                            <>
                                                                <i className="fas fa-spinner fa-spin"></i>
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="fas fa-save"></i>
                                                                Save Changes
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
                                                        onClick={cancelEditing}
                                                        disabled={isSaving}
                                                    >
                                                        <i className="fas fa-times"></i>
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                {permissionCount === 0 ? (
                                                    <div className="flex items-center gap-3 py-8 justify-center text-slate-400">
                                                        <i className="fas fa-info-circle"></i>
                                                        <span>No permissions assigned to this role</span>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                        {permissions.map((permission, index) => (
                                                            <div
                                                                key={index}
                                                                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                                                            >
                                                                <i className="fas fa-check-circle text-emerald-500 text-xs"></i>
                                                                <span className="font-mono text-slate-700 text-xs truncate">
                                                                    {permission}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {roles.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <i className="fas fa-users-slash text-3xl text-slate-400"></i>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No Roles Found</h3>
                        <p className="text-slate-500">There are no roles configured in the system.</p>
                    </div>
                )}
            </div>

            {showSearchModal &&
                ReactDOM.createPortal(
                    <div
                        className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 px-4"
                        onClick={closeSearch}
                    >
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
                        <div
                            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[70vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
                                <div className="flex-1 flex items-center gap-3">
                                    <i className="fas fa-search text-slate-400"></i>
                                    <input
                                        type="text"
                                        placeholder="Search for permission nodes across all roles..."
                                        value={searchQuery}
                                        onChange={(e) => searchPermissions(e.target.value)}
                                        className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400"
                                        autoFocus
                                    />
                                </div>
                                <button
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400"
                                    onClick={closeSearch}
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>

                            {searchResults.length > 0 && (
                                <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                                    <div className="text-sm text-slate-600">
                                        <span className="font-semibold">{searchResults.length}</span>{' '}
                                        {searchResults.length === 1 ? 'role' : 'roles'} found matching &ldquo;
                                        {searchQuery.trim()}&rdquo;
                                    </div>
                                    {hasITAccess && searchQuery.trim() && (
                                        <button
                                            className="flex items-center gap-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs font-medium transition-colors"
                                            onClick={() => removePermissionFromAll(searchQuery.trim())}
                                        >
                                            <i className="fas fa-trash-alt"></i>
                                            Remove from All
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto">
                                {searchResults.length > 0 ? (
                                    <div className="divide-y divide-slate-100">
                                        {searchResults.map((result, index) => {
                                            const hasExactMatch = result.role.permissions.includes(searchQuery.trim())
                                            return (
                                                <div key={index} className="px-5 py-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-slate-800">
                                                                {result.role.name}
                                                            </span>
                                                            <span className="text-xs text-slate-400">
                                                                {result.matchingPermissions.length}{' '}
                                                                {result.matchingPermissions.length === 1
                                                                    ? 'match'
                                                                    : 'matches'}
                                                            </span>
                                                        </div>
                                                        {hasITAccess && hasExactMatch && (
                                                            <button
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-100 hover:bg-red-200 text-red-500 transition-colors"
                                                                onClick={() =>
                                                                    removePermissionFromRole(
                                                                        searchQuery.trim(),
                                                                        result.role.id,
                                                                        result.role.name
                                                                    )
                                                                }
                                                            >
                                                                <i className="fas fa-times text-xs"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {result.matchingPermissions.map((perm, pIndex) => {
                                                            const isExact = perm === searchQuery.trim()
                                                            return (
                                                                <div
                                                                    key={pIndex}
                                                                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono ${isExact ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
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
                                        <i className="fas fa-search text-4xl mb-4"></i>
                                        <p>Search by permission nodes.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            {showCreateModal &&
                ReactDOM.createPortal(
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
                        <div
                            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#1e3a5f]">
                                <div className="flex items-center gap-3">
                                    <i className="fas fa-plus-circle text-white"></i>
                                    <div>
                                        <h2 className="font-bold text-white">Create New Role</h2>
                                        <span className="text-xs text-white/70">Add Role</span>
                                    </div>
                                </div>
                                <button
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <div className="px-6 py-5">
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Role Name</label>
                                    <input
                                        type="text"
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        placeholder="Enter role name"
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Weight</label>
                                    <input
                                        type="number"
                                        value={newRoleWeight}
                                        onChange={(e) => setNewRoleWeight(parseInt(e.target.value) || 0)}
                                        placeholder="Enter weight (0-100)"
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                                <button
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#1e3a5f] hover:bg-[#152d4a] text-white font-semibold rounded-xl transition-colors text-sm disabled:opacity-50"
                                    onClick={createRole}
                                    disabled={!newRoleName.trim() || isCreating}
                                >
                                    {isCreating ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-plus"></i>
                                            Create Role
                                        </>
                                    )}
                                </button>
                                <button
                                    className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors text-sm disabled:opacity-50"
                                    onClick={() => setShowCreateModal(false)}
                                    disabled={isCreating}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            {showBulkAddModal &&
                ReactDOM.createPortal(
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                        onClick={() => !isBulkAdding && closeBulkAddModal()}
                    >
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
                        <div
                            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#1e3a5f]">
                                <div className="flex items-center gap-3">
                                    <i className="fas fa-layer-group text-white"></i>
                                    <div>
                                        <h2 className="font-bold text-white">Bulk Add Permissions</h2>
                                        <span className="text-xs text-white/70">
                                            Add permission nodes to multiple roles
                                        </span>
                                    </div>
                                </div>
                                {!isBulkAdding && (
                                    <button
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white"
                                        onClick={closeBulkAddModal}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto px-6 py-5">
                                <div className="mb-5">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Select Roles
                                    </label>
                                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                                        {roles.map((role) => (
                                            <label
                                                key={role.id}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRoles.has(role.id)}
                                                    onChange={() => toggleRoleSelection(role.id)}
                                                    disabled={isBulkAdding}
                                                    className="w-4 h-4 text-[#1e3a5f] rounded border-slate-300 focus:ring-[#1e3a5f]"
                                                />
                                                <span className="flex-1 font-medium text-slate-700">{role.name}</span>
                                                <span className="text-xs text-slate-400">
                                                    {getPermissionCount(role)} permissions
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Permission Nodes to Add
                                        <span className="font-normal text-slate-400 ml-1">(one per line)</span>
                                    </label>
                                    <textarea
                                        className="w-full h-40 px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-700 focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 resize-none"
                                        value={bulkPermissionText}
                                        onChange={(e) => setBulkPermissionText(e.target.value)}
                                        placeholder="Enter permission nodes (one per line)&#10;Example:&#10;dashboard.view&#10;mixers.view&#10;reports.view"
                                        disabled={isBulkAdding}
                                    />
                                </div>
                                {selectedRoles.size > 0 && bulkPermissionText.trim() && (
                                    <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm">
                                        <i className="fas fa-info-circle"></i>
                                        <span>
                                            Will add{' '}
                                            <strong>
                                                {bulkPermissionText.split('\n').filter((p) => p.trim()).length}
                                            </strong>{' '}
                                            permission
                                            {bulkPermissionText.split('\n').filter((p) => p.trim()).length === 1
                                                ? ''
                                                : 's'}{' '}
                                            to <strong>{selectedRoles.size}</strong> role
                                            {selectedRoles.size === 1 ? '' : 's'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                                <button
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#1e3a5f] hover:bg-[#152d4a] text-white font-semibold rounded-xl transition-colors text-sm disabled:opacity-50"
                                    onClick={bulkAddPermission}
                                    disabled={selectedRoles.size === 0 || !bulkPermissionText.trim() || isBulkAdding}
                                >
                                    {isBulkAdding ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i>
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-plus"></i>
                                            Add to Selected Roles
                                        </>
                                    )}
                                </button>
                                <button
                                    className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors text-sm disabled:opacity-50"
                                    onClick={closeBulkAddModal}
                                    disabled={isBulkAdding}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    )
}

export default RolesView
