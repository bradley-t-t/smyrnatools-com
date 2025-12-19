import React, {useEffect, useState} from 'react';
import ReactDOM from 'react-dom';
import {UserService} from '../../services/UserService';
import {supabase} from '../../services/DatabaseService';
import LoadingScreen from '../../components/common/LoadingScreen';
import './styles/Roles.css';

function RolesView() {
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasITAccess, setHasITAccess] = useState(false);
    const [expandedRoles, setExpandedRoles] = useState(new Set());
    const [editingRole, setEditingRole] = useState(null);
    const [editedPermissions, setEditedPermissions] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleWeight, setNewRoleWeight] = useState(0);
    const [isCreating, setIsCreating] = useState(false);
    const [editingWeight, setEditingWeight] = useState(null);
    const [editedWeight, setEditedWeight] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showBulkAddModal, setShowBulkAddModal] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState(new Set());
    const [bulkPermissionText, setBulkPermissionText] = useState('');
    const [isBulkAdding, setIsBulkAdding] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const user = await UserService.getCurrentUser();
            if (!user?.id) {
                setError('Unable to authenticate user');
                setIsLoading(false);
                return;
            }

            const userRoles = await UserService.getUserRoles(user.id);
            const hasIT = userRoles.some(role => role.name === 'IT Access');
            setHasITAccess(hasIT);

            const allRoles = await UserService.getAllRoles();
            const sortedRoles = allRoles.sort((a, b) => (b.weight || 0) - (a.weight || 0));
            setRoles(sortedRoles);
        } catch (err) {
            console.error('Error loading roles:', err);
            setError('Failed to load roles. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleRole = (roleId) => {
        const newExpanded = new Set(expandedRoles);
        if (newExpanded.has(roleId)) {
            newExpanded.delete(roleId);
        } else {
            newExpanded.add(roleId);
        }
        setExpandedRoles(newExpanded);
    };

    const startEditing = (role) => {
        if (!hasITAccess) return;
        const newExpanded = new Set(expandedRoles);
        newExpanded.add(role.id);
        setExpandedRoles(newExpanded);
        setEditingRole(role.id);
        setEditedPermissions(Array.isArray(role.permissions) ? role.permissions.join('\n') : '');
        setMessage('');
        setError('');
    };

    const cancelEditing = () => {
        setEditingRole(null);
        setEditedPermissions('');
        setMessage('');
        setError('');
    };

    const savePermissions = async () => {
        if (!editingRole || !hasITAccess) {
            return;
        }

        setIsSaving(true);
        setMessage('');
        setError('');

        try {
            const permissionsArray = editedPermissions
                .split('\n')
                .map(p => p.trim())
                .filter(p => p.length > 0);

            const uniquePermissions = [...new Set(permissionsArray)];
            const sortedPermissions = uniquePermissions.sort((a, b) => a.localeCompare(b));

            const {data, error: updateError} = await supabase
                .from('users_roles')
                .update({permissions: sortedPermissions})
                .eq('id', editingRole);

            if (updateError) {
                throw updateError;
            }

            UserService.clearCache();
            await loadData();

            const newExpanded = new Set(expandedRoles);
            newExpanded.delete(editingRole);
            setExpandedRoles(newExpanded);

            setEditingRole(null);
            setEditedPermissions('');
            setMessage('Permissions updated successfully (duplicates removed, sorted alphabetically)');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error('Error saving permissions:', err);
            setError(`Failed to save permissions: ${err.message || 'Please try again.'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const getPermissionCount = (role) => {
        if (!role.permissions) return 0;
        return Array.isArray(role.permissions) ? role.permissions.length : 0;
    };

    const formatPermissions = (permissions) => {
        if (!permissions || !Array.isArray(permissions)) return [];
        return permissions.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    };

    const createRole = async () => {
        if (!newRoleName.trim() || !hasITAccess) return;

        setIsCreating(true);
        setError('');

        try {
            const {error: createError} = await supabase
                .from('users_roles')
                .insert([{
                    name: newRoleName.trim(),
                    weight: newRoleWeight,
                    permissions: []
                }])
                .select();

            if (createError) {
                throw createError;
            }

            UserService.clearCache();
            await loadData();
            setShowCreateModal(false);
            setNewRoleName('');
            setNewRoleWeight(0);
            setMessage(`Role "${newRoleName}" created successfully`);
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error('Error creating role:', err);
            setError(`Failed to create role: ${err.message}`);
        } finally {
            setIsCreating(false);
        }
    };

    const startEditingWeight = (role) => {
        if (!hasITAccess) return;
        setEditingWeight(role.id);
        setEditedWeight(role.weight || 0);
    };

    const saveWeight = async (roleId) => {
        if (!hasITAccess) return;

        try {
            const {error: updateError} = await supabase
                .from('users_roles')
                .update({weight: editedWeight})
                .eq('id', roleId);

            if (updateError) {
                throw updateError;
            }

            UserService.clearCache();
            await loadData();
            setEditingWeight(null);
            setMessage('Weight updated successfully');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error('Error updating weight:', err);
            setError(`Failed to update weight: ${err.message}`);
        }
    };

    const cancelEditingWeight = () => {
        setEditingWeight(null);
        setEditedWeight(0);
    };

    const searchPermissions = (query) => {
        setSearchQuery(query);

        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        const results = [];
        const lowerQuery = query.toLowerCase();

        roles.forEach(role => {
            if (role.permissions && Array.isArray(role.permissions)) {
                const matchingPermissions = role.permissions.filter(perm =>
                    perm.toLowerCase().includes(lowerQuery)
                );

                if (matchingPermissions.length > 0) {
                    results.push({
                        role: role,
                        matchingPermissions: matchingPermissions
                    });
                }
            }
        });

        setSearchResults(results);
    };

    const openSearch = () => {
        setShowSearchModal(true);
        setSearchQuery('');
        setSearchResults([]);
    };

    const closeSearch = () => {
        setShowSearchModal(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    const removePermissionFromAll = async (permissionToRemove) => {
        if (!hasITAccess || !permissionToRemove) return;

        if (!window.confirm(`Are you sure you want to remove "${permissionToRemove}" from all roles that have it?`)) {
            return;
        }

        setError('');
        setMessage('');

        try {
            let rolesModified = 0;

            for (const result of searchResults) {
                const role = result.role;
                const hasExactMatch = role.permissions.includes(permissionToRemove);

                if (hasExactMatch) {
                    const updatedPermissions = role.permissions.filter(p => p !== permissionToRemove);
                    const sortedPermissions = updatedPermissions.sort((a, b) => a.localeCompare(b));

                    const {error: updateError} = await supabase
                        .from('users_roles')
                        .update({permissions: sortedPermissions})
                        .eq('id', role.id);

                    if (updateError) {
                        throw updateError;
                    }

                    rolesModified++;
                }
            }

            UserService.clearCache();
            await loadData();

            const updatedResults = searchResults
                .map(result => {
                    const updatedPermissions = result.matchingPermissions.filter(p => p !== permissionToRemove);
                    return {
                        ...result,
                        matchingPermissions: updatedPermissions
                    };
                })
                .filter(result => result.matchingPermissions.length > 0);

            setSearchResults(updatedResults);

            setMessage(`Successfully removed "${permissionToRemove}" from ${rolesModified} ${rolesModified === 1 ? 'role' : 'roles'}`);
            setTimeout(() => setMessage(''), 5000);
        } catch (err) {
            console.error('Error removing permission:', err);
            setError(`Failed to remove permission: ${err.message}`);
        }
    };

    const removePermissionFromRole = async (permissionToRemove, roleId, roleName) => {
        if (!hasITAccess || !permissionToRemove || !roleId) return;

        if (!window.confirm(`Remove "${permissionToRemove}" from "${roleName}"?`)) {
            return;
        }

        setError('');
        setMessage('');

        try {
            const role = roles.find(r => r.id === roleId);
            if (!role) return;

            const updatedPermissions = role.permissions.filter(p => p !== permissionToRemove);
            const sortedPermissions = updatedPermissions.sort((a, b) => a.localeCompare(b));

            const {error: updateError} = await supabase
                .from('users_roles')
                .update({permissions: sortedPermissions})
                .eq('id', roleId);

            if (updateError) {
                throw updateError;
            }

            UserService.clearCache();
            await loadData();

            const updatedResults = searchResults
                .map(result => {
                    if (result.role.id === roleId) {
                        const updatedPermissions = result.matchingPermissions.filter(p => p !== permissionToRemove);
                        return {
                            ...result,
                            matchingPermissions: updatedPermissions
                        };
                    }
                    return result;
                })
                .filter(result => result.matchingPermissions.length > 0);

            setSearchResults(updatedResults);

            setMessage(`Successfully removed "${permissionToRemove}" from "${roleName}"`);
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error('Error removing permission:', err);
            setError(`Failed to remove permission: ${err.message}`);
        }
    };

    const toggleRoleSelection = (roleId) => {
        const newSelection = new Set(selectedRoles);
        if (newSelection.has(roleId)) {
            newSelection.delete(roleId);
        } else {
            newSelection.add(roleId);
        }
        setSelectedRoles(newSelection);
    };

    const openBulkAddModal = () => {
        setShowBulkAddModal(true);
        setSelectedRoles(new Set());
        setBulkPermissionText('');
        setError('');
        setMessage('');
    };

    const closeBulkAddModal = () => {
        setShowBulkAddModal(false);
        setSelectedRoles(new Set());
        setBulkPermissionText('');
    };

    const bulkAddPermission = async () => {
        if (!hasITAccess || selectedRoles.size === 0 || !bulkPermissionText.trim()) {
            return;
        }

        const permissionsToAdd = bulkPermissionText
            .split('\n')
            .map(p => p.trim())
            .filter(p => p.length > 0);

        if (permissionsToAdd.length === 0) {
            setError('Please enter at least one permission node');
            return;
        }

        setIsBulkAdding(true);
        setError('');
        setMessage('');

        try {
            let rolesModified = 0;

            for (const roleId of selectedRoles) {
                const role = roles.find(r => r.id === roleId);
                if (!role) continue;

                const existingPermissions = Array.isArray(role.permissions) ? role.permissions : [];
                const combinedPermissions = [...existingPermissions, ...permissionsToAdd];
                const uniquePermissions = [...new Set(combinedPermissions)];
                const sortedPermissions = uniquePermissions.sort((a, b) => a.localeCompare(b));

                const permissionsChanged = JSON.stringify(existingPermissions.sort()) !== JSON.stringify(sortedPermissions);

                if (permissionsChanged) {
                    const {error: updateError} = await supabase
                        .from('users_roles')
                        .update({permissions: sortedPermissions})
                        .eq('id', roleId);

                    if (updateError) {
                        throw updateError;
                    }

                    rolesModified++;
                }
            }

            UserService.clearCache();
            await loadData();
            closeBulkAddModal();

            const permText = permissionsToAdd.length === 1 ? 'permission' : 'permissions';
            const roleText = rolesModified === 1 ? 'role' : 'roles';
            setMessage(`Successfully added ${permissionsToAdd.length} ${permText} to ${rolesModified} ${roleText}`);
            setTimeout(() => setMessage(''), 5000);
        } catch (err) {
            console.error('Error adding permissions:', err);
            setError(`Failed to add permissions: ${err.message}`);
        } finally {
            setIsBulkAdding(false);
        }
    };

    if (isLoading) {
        return (
            <div className="roles-view">
                <LoadingScreen message="Loading roles..." inline={true}/>
            </div>
        );
    }

    return (
        <>
            <div className="roles-view">
                <div className="roles-header">
                    <div className="roles-header-content">
                        <h1>Roles & Permissions</h1>
                        <p className="roles-subtitle">
                            {hasITAccess
                                ? 'View and manage all roles and their permission nodes'
                                : 'View all roles and their permission nodes'}
                        </p>
                    </div>
                    <div className="roles-header-actions">
                        {hasITAccess && (
                            <button
                                className="bulk-add-button"
                                onClick={openBulkAddModal}
                            >
                                <i className="fas fa-layer-group"></i>
                                Bulk Add Permissions
                            </button>
                        )}
                        {hasITAccess && (
                            <button
                                className="create-role-button"
                                onClick={() => setShowCreateModal(true)}
                            >
                                <i className="fas fa-plus"></i>
                                Create Role
                            </button>
                        )}
                        {hasITAccess && (
                            <div className="roles-badge">
                                <i className="fas fa-shield-alt"></i>
                                IT Access
                            </div>
                        )}
                    </div>
                </div>

                <div className="roles-search-trigger">
                    <button
                        className="search-trigger-button"
                        onClick={openSearch}
                    >
                        <i className="fas fa-search"></i>
                        Search permission nodes
                    </button>
                </div>

                {showSearchModal && typeof document !== 'undefined' && document.body && ReactDOM.createPortal(
                    <div className="search-modal-backdrop" onClick={closeSearch}>
                        <div className="search-modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="search-modal-header">
                                <div className="roles-search-bar-modal">
                                    <i className="fas fa-search"></i>
                                    <input
                                        type="text"
                                        placeholder="Search for permission nodes across all roles..."
                                        value={searchQuery}
                                        onChange={(e) => searchPermissions(e.target.value)}
                                        className="search-input"
                                        autoFocus
                                    />
                                </div>
                                <button
                                    className="close-search-button"
                                    onClick={closeSearch}
                                    title="Close search"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            {searchResults.length > 0 ? (
                                <>
                                    <div className="search-results-header-info">
                                        <div className="search-results-info">
                                        <span
                                            className="search-results-count">{searchResults.length} {searchResults.length === 1 ? 'role' : 'roles'} found</span>
                                            <span
                                                className="search-results-query">matching &ldquo;{searchQuery.trim()}&rdquo;</span>
                                        </div>
                                        {hasITAccess && searchQuery.trim() && (
                                            <button
                                                className="bulk-remove-button"
                                                onClick={() => removePermissionFromAll(searchQuery.trim())}
                                                title={`Remove exact matches of "${searchQuery.trim()}" from all roles`}
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                                Remove from All
                                            </button>
                                        )}
                                    </div>
                                    <div className="search-modal-body">
                                        <div className="search-results-list">
                                            {searchResults.map((result, index) => {
                                                const hasExactMatch = result.role.permissions.includes(searchQuery.trim());
                                                return (
                                                    <div key={index} className="search-result-item">
                                                        <div className="search-result-item-header">
                                                            <div className="search-result-role-info">
                                                            <span
                                                                className="search-result-role-name">{result.role.name}</span>
                                                                <span className="search-result-match-count">
                                                                {result.matchingPermissions.length} {result.matchingPermissions.length === 1 ? 'match' : 'matches'}
                                                            </span>
                                                            </div>
                                                            {hasITAccess && hasExactMatch && (
                                                                <button
                                                                    className="single-remove-button"
                                                                    onClick={() => removePermissionFromRole(searchQuery.trim(), result.role.id, result.role.name)}
                                                                    title={`Remove exact match from this role`}
                                                                >
                                                                    <i className="fas fa-times"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="search-result-permissions-list">
                                                            {result.matchingPermissions.map((perm, pIndex) => {
                                                                const isExact = perm === searchQuery.trim();
                                                                return (
                                                                    <div key={pIndex}
                                                                         className={`permission-item ${isExact ? 'exact-match' : 'partial-match'}`}>
                                                                        <span className="permission-text">{perm}</span>
                                                                        {isExact &&
                                                                            <span className="exact-badge">exact</span>}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="search-modal-body">
                                    <div className="no-search-results">
                                        <i className="fas fa-search"></i>
                                        <p>Search by permission nodes.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body
                )}

                {message && (
                    <div className="roles-message success">
                        <i className="fas fa-check-circle"></i>
                        {message}
                    </div>
                )}

                {error && (
                    <div className="roles-message error">
                        <i className="fas fa-exclamation-circle"></i>
                        {error}
                    </div>
                )}

                {!searchQuery && (
                    <>
                        <div className="roles-list">
                            {roles.map((role) => {
                                const isExpanded = expandedRoles.has(role.id);
                                const isEditing = editingRole === role.id;
                                const permissionCount = getPermissionCount(role);
                                const permissions = formatPermissions(role.permissions);

                                return (
                                    <div key={role.id} className={`role-card ${isExpanded ? 'expanded' : ''}`}>
                                        <div className="role-card-header"
                                             onClick={() => !isEditing && toggleRole(role.id)}>
                                            <div className="role-card-title">
                                                <div className="role-icon">
                                                    <i className="fas fa-user-shield"></i>
                                                </div>
                                                <div className="role-info">
                                                    <h3>{role.name}</h3>
                                                    <div className="role-meta">
                                                        {editingWeight === role.id && hasITAccess ? (
                                                            <span className="role-weight editing">
                                                    <i className="fas fa-weight-hanging"></i>
                                                    Weight:
                                                    <input
                                                        type="number"
                                                        value={editedWeight}
                                                        onChange={(e) => setEditedWeight(parseInt(e.target.value) || 0)}
                                                        className="weight-input"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <button
                                                        className="weight-save-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            saveWeight(role.id);
                                                        }}
                                                    >
                                                        <i className="fas fa-check"></i>
                                                    </button>
                                                    <button
                                                        className="weight-cancel-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            cancelEditingWeight();
                                                        }}
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </span>
                                                        ) : (
                                                            <span
                                                                className="role-weight"
                                                                onClick={(e) => {
                                                                    if (hasITAccess) {
                                                                        e.stopPropagation();
                                                                        startEditingWeight(role);
                                                                    }
                                                                }}
                                                                style={hasITAccess ? {cursor: 'pointer'} : {}}
                                                                title={hasITAccess ? 'Click to edit weight' : ''}
                                                            >
                                                    <i className="fas fa-weight-hanging"></i>
                                                    Weight: {role.weight || 0}
                                                                {hasITAccess &&
                                                                    <i className="fas fa-pencil-alt" style={{
                                                                        marginLeft: '0.375rem',
                                                                        fontSize: '0.625rem'
                                                                    }}></i>}
                                                </span>
                                                        )}
                                                        <span className="role-permissions-count">
                                                <i className="fas fa-key"></i>
                                                            {permissionCount} {permissionCount === 1 ? 'permission' : 'permissions'}
                                            </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="role-card-actions">
                                                {hasITAccess && !isEditing && (
                                                    <button
                                                        className="role-edit-button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            startEditing(role);
                                                        }}
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                        Edit
                                                    </button>
                                                )}
                                                {!isEditing && (
                                                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} expand-icon`}></i>
                                                )}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="role-card-content">
                                                {isEditing ? (
                                                    <div className="role-edit-section">
                                                        <div className="edit-header">
                                                            <h4>Edit Permissions for {role.name}</h4>
                                                            <p>Enter one permission node per line</p>
                                                        </div>
                                                        <textarea
                                                            className="permissions-editor"
                                                            value={editedPermissions}
                                                            onChange={(e) => setEditedPermissions(e.target.value)}
                                                            placeholder="Enter permissions (one per line)&#10;Example:&#10;dashboard.view&#10;mixers.view&#10;mixers.edit"
                                                            rows={12}
                                                        />
                                                        <div className="edit-actions">
                                                            <button
                                                                className="save-button"
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
                                                                className="cancel-button"
                                                                onClick={cancelEditing}
                                                                disabled={isSaving}
                                                            >
                                                                <i className="fas fa-times"></i>
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="permissions-list">
                                                        {permissionCount === 0 ? (
                                                            <div className="no-permissions">
                                                                <i className="fas fa-info-circle"></i>
                                                                No permissions assigned to this role
                                                            </div>
                                                        ) : (
                                                            <div className="permissions-grid">
                                                                {permissions.map((permission, index) => (
                                                                    <div key={index} className="permission-node">
                                                                        <i className="fas fa-check-circle"></i>
                                                                        <span>{permission}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {roles.length === 0 && !isLoading && (
                            <div className="no-roles">
                                <i className="fas fa-users-slash"></i>
                                <h3>No Roles Found</h3>
                                <p>There are no roles configured in the system.</p>
                            </div>
                        )}
                    </>
                )}

                {showCreateModal && typeof document !== 'undefined' && document.body && ReactDOM.createPortal(
                    <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="modal-header-content">
                                    <i className="fas fa-plus-circle"></i>
                                    <div>
                                        <h2>Create New Role</h2>
                                        <span className="modal-subtitle">Add Role</span>
                                    </div>
                                </div>
                                <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <div className="modal-content-scrollable">
                                <div className="modal-body-content">
                                    <div className="form-group">
                                        <label>Role Name</label>
                                        <input
                                            type="text"
                                            value={newRoleName}
                                            onChange={(e) => setNewRoleName(e.target.value)}
                                            placeholder="Enter role name"
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Weight</label>
                                        <input
                                            type="number"
                                            value={newRoleWeight}
                                            onChange={(e) => setNewRoleWeight(parseInt(e.target.value) || 0)}
                                            placeholder="Enter weight (0-100)"
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="save-button"
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
                                    className="cancel-button"
                                    onClick={() => setShowCreateModal(false)}
                                    disabled={isCreating}
                                >
                                    <i className="fas fa-times"></i>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {showBulkAddModal && typeof document !== 'undefined' && document.body && ReactDOM.createPortal(
                    <div className="modal-backdrop" onClick={() => !isBulkAdding && closeBulkAddModal()}>
                        <div className="modal-content bulk-add-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="modal-header-content">
                                    <i className="fas fa-layer-group"></i>
                                    <div>
                                        <h2>Bulk Add Permissions</h2>
                                        <span className="modal-subtitle">Add permission nodes to multiple roles</span>
                                    </div>
                                </div>
                                {!isBulkAdding && (
                                    <button className="modal-close" onClick={closeBulkAddModal}>
                                        <i className="fas fa-times"></i>
                                    </button>
                                )}
                            </div>
                            <div className="modal-content-scrollable">
                                <div className="modal-body-content">
                                    <div className="form-group">
                                        <label>Select Roles</label>
                                        <div className="roles-selection-list">
                                            {roles.map(role => (
                                                <div key={role.id} className="role-selection-item">
                                                    <label className="role-checkbox-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedRoles.has(role.id)}
                                                            onChange={() => toggleRoleSelection(role.id)}
                                                            disabled={isBulkAdding}
                                                        />
                                                        <span className="role-checkbox-name">{role.name}</span>
                                                        <span className="role-checkbox-count">
                                                        {getPermissionCount(role)} permissions
                                                    </span>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>
                                            Permission Nodes to Add
                                            <span className="label-hint">(one per line)</span>
                                        </label>
                                        <textarea
                                            className="permissions-editor"
                                            value={bulkPermissionText}
                                            onChange={(e) => setBulkPermissionText(e.target.value)}
                                            placeholder="Enter permission nodes (one per line)&#10;Example:&#10;dashboard.view&#10;mixers.view&#10;reports.view"
                                            rows={8}
                                            disabled={isBulkAdding}
                                        />
                                    </div>
                                    {selectedRoles.size > 0 && bulkPermissionText.trim() && (
                                        <div className="bulk-add-summary">
                                            <i className="fas fa-info-circle"></i>
                                            <span>
                                            Will add <strong>{bulkPermissionText.split('\n').filter(p => p.trim()).length}</strong> permission
                                                {bulkPermissionText.split('\n').filter(p => p.trim()).length === 1 ? '' : 's'} to{' '}
                                                <strong>{selectedRoles.size}</strong> role{selectedRoles.size === 1 ? '' : 's'}
                                        </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="save-button"
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
                                    className="cancel-button"
                                    onClick={closeBulkAddModal}
                                    disabled={isBulkAdding}
                                >
                                    <i className="fas fa-times"></i>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </>
    );
}

export default RolesView;
