import React, { useState, useEffect } from 'react';
import { UserService } from '../../services/UserService';
import { supabase } from '../../services/DatabaseService';
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
            console.log('Cannot save - editingRole:', editingRole, 'hasITAccess:', hasITAccess);
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

            console.log('Saving permissions for role:', editingRole);
            console.log('Permissions:', sortedPermissions);

            const { data, error: updateError } = await supabase
                .from('users_roles')
                .update({ permissions: sortedPermissions })
                .eq('id', editingRole);

            if (updateError) {
                throw updateError;
            }

            console.log('Update successful:', data);

            UserService.clearCache();
            await loadData();
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
            const { error: createError } = await supabase
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
            const { error: updateError } = await supabase
                .from('users_roles')
                .update({ weight: editedWeight })
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

    if (isLoading) {
        return (
            <div className="roles-view">
                <LoadingScreen message="Loading roles..." inline={true} />
            </div>
        );
    }

    return (
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

            <div className="roles-search-bar">
                <i className="fas fa-search"></i>
                <input
                    type="text"
                    placeholder="Search for permission nodes across all roles..."
                    value={searchQuery}
                    onChange={(e) => searchPermissions(e.target.value)}
                    className="search-input"
                />
                {searchQuery && (
                    <button 
                        className="clear-search"
                        onClick={() => searchPermissions('')}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                )}
            </div>

            {searchResults.length > 0 && (
                <div className="search-results">
                    <h3>Search Results ({searchResults.length} {searchResults.length === 1 ? 'role' : 'roles'})</h3>
                    {searchResults.map((result, index) => (
                        <div key={index} className="search-result-card">
                            <div className="search-result-header">
                                <i className="fas fa-user-shield"></i>
                                <span className="search-result-role">{result.role.name}</span>
                                <span className="search-result-count">
                                    {result.matchingPermissions.length} {result.matchingPermissions.length === 1 ? 'match' : 'matches'}
                                </span>
                            </div>
                            <div className="search-result-permissions">
                                {result.matchingPermissions.map((perm, pIndex) => (
                                    <span key={pIndex} className="search-result-permission">
                                        {perm}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
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

            <div className="roles-stats">
                <div className="stat-card">
                    <div className="stat-icon">
                        <i className="fas fa-users-cog"></i>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Total Roles</div>
                        <div className="stat-value">{roles.length}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">
                        <i className="fas fa-key"></i>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Total Permissions</div>
                        <div className="stat-value">
                            {roles.reduce((sum, role) => sum + getPermissionCount(role), 0)}
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">
                        <i className="fas fa-edit"></i>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Edit Access</div>
                        <div className="stat-value">{hasITAccess ? 'Yes' : 'No'}</div>
                    </div>
                </div>
            </div>

            <div className="roles-list">
                {roles.map((role) => {
                    const isExpanded = expandedRoles.has(role.id);
                    const isEditing = editingRole === role.id;
                    const permissionCount = getPermissionCount(role);
                    const permissions = formatPermissions(role.permissions);

                    return (
                        <div key={role.id} className={`role-card ${isExpanded ? 'expanded' : ''}`}>
                            <div className="role-card-header" onClick={() => !isEditing && toggleRole(role.id)}>
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
                                                    {hasITAccess && <i className="fas fa-pencil-alt" style={{marginLeft: '0.375rem', fontSize: '0.625rem'}}></i>}
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

            {showCreateModal && (
                <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create New Role</h3>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
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
                </div>
            )}
        </div>
    );
}

export default RolesView;
