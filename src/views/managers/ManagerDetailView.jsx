import React, { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../app/context/AuthContext'
import { usePreferences } from '../../app/context/PreferencesContext'
import PlantDropdownModal from '../../components/common/PlantDropdownModal'
import DetailViewSection from '../../components/sections/DetailViewSection'
import { DatabaseService, supabase } from '../../services/DatabaseService'
import { RegionService } from '../../services/RegionService'
import { UserService } from '../../services/UserService'
import { AuthUtility } from '../../utils/AuthUtility'

function ManagerDetailView({ managerId, onClose }) {
    const { preferences } = usePreferences()
    const { user } = useAuth()
    const [manager, setManager] = useState(null)
    const [plants, setPlants] = useState([])
    const [availableRoles, setAvailableRoles] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [message, setMessage] = useState('')
    const [originalValues, setOriginalValues] = useState({})
    const [isReadOnly, setIsReadOnly] = useState(false)
    const [currentUserRoleWeight, setCurrentUserRoleWeight] = useState(0)
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [plantCode, setPlantCode] = useState('')
    const [roleName, setRoleName] = useState('')
    const [password, setPassword] = useState('')
    const [showPasswordField, setShowPasswordField] = useState(false)
    const [regionPlantCodes, setRegionPlantCodes] = useState(new Set())
    const [showPlantModal, setShowPlantModal] = useState(false)
    const [canEditManager, setCanEditManager] = useState(false)
    const [canDeleteManager, setCanDeleteManager] = useState(false)

    useEffect(() => {
        document.body.classList.add('in-detail-view')
        return () => document.body.classList.remove('in-detail-view')
    }, [])

    useEffect(() => {
        if (managerId) {
            Promise.all([fetchManagerDetails(), fetchPlants(), fetchRoles(), fetchCurrentUserRole()]).catch(() => {})
        }
    }, [managerId])

    useEffect(() => {
        if (!manager || isLoading) return
        const hasChanges =
            firstName !== originalValues.firstName ||
            lastName !== originalValues.lastName ||
            email !== originalValues.email ||
            plantCode !== originalValues.plantCode ||
            roleName !== originalValues.roleName ||
            (showPasswordField && password)
        setHasUnsavedChanges(hasChanges)
    }, [firstName, lastName, email, plantCode, roleName, password, showPasswordField, originalValues, isLoading])

    useEffect(() => {
        if (!manager) return
        const canEditAny = currentUserRoleWeight > 75
        const canEditByWeight = currentUserRoleWeight > (manager.roleWeight || 0)
        setIsReadOnly(!(canEditAny || canEditByWeight))
    }, [manager, currentUserRoleWeight])

    useEffect(() => {
        let cancelled = false

        async function loadRegionPlants() {
            let regionCode = preferences.selectedRegion?.code || ''
            try {
                if (!regionCode) {
                    const u = await UserService.getCurrentUser()
                    const uid = u?.id || ''
                    if (uid) {
                        const profilePlant = await UserService.getUserPlant(uid)
                        const plant =
                            typeof profilePlant === 'string'
                                ? profilePlant
                                : profilePlant?.plant_code || profilePlant?.plantCode || ''
                        if (plant) {
                            const regions = await RegionService.fetchRegionsByPlantCode(plant)
                            const r = Array.isArray(regions) && regions.length ? regions[0] : null
                            regionCode = r ? r.regionCode || r.region_code || '' : ''
                        }
                    }
                }
                if (!regionCode) {
                    if (!cancelled) setRegionPlantCodes(new Set())
                    return
                }
                const regionPlants = await RegionService.fetchRegionPlants(regionCode)
                if (cancelled) return
                const codes = new Set(
                    regionPlants
                        .map((p) =>
                            String(p.plantCode || p.plant_code || '')
                                .trim()
                                .toUpperCase()
                        )
                        .filter(Boolean)
                )
                setRegionPlantCodes(codes)
                if (plantCode && !codes.has(String(plantCode).trim().toUpperCase())) setPlantCode(plantCode)
            } catch {
                if (!cancelled) setRegionPlantCodes(new Set())
            }
        }

        loadRegionPlants()

        return () => {
            cancelled = true
        }
    }, [preferences.selectedRegion?.code, plantCode])

    const filteredPlants = useMemo(() => {
        const regionType = preferences.selectedRegion?.type
        const allPlants = plants
            .slice()
            .sort(
                (a, b) =>
                    parseInt(a.plant_code?.replace(/\D/g, '') || '0') -
                    parseInt(b.plant_code?.replace(/\D/g, '') || '0')
            )
        if (regionType === 'Office') return allPlants
        if (!regionPlantCodes || regionPlantCodes.size === 0) return allPlants
        return plants
            .filter((p) =>
                regionPlantCodes.has(
                    String(p.plant_code || '')
                        .trim()
                        .toUpperCase()
                )
            )
            .sort(
                (a, b) =>
                    parseInt(a.plant_code?.replace(/\D/g, '') || '0') -
                    parseInt(b.plant_code?.replace(/\D/g, '') || '0')
            )
    }, [plants, regionPlantCodes, preferences.selectedRegion?.type])

    async function fetchCurrentUserRole() {
        try {
            if (!user?.id) return
            const highestRole = await UserService.getHighestRole(user.id)
            setCurrentUserRoleWeight(highestRole?.weight || 0)
        } catch {
            setCurrentUserRoleWeight(0)
        }
    }

    async function fetchRoles() {
        try {
            const rolesData = await DatabaseService.getAllRecords('users_roles')
            if (rolesData?.length) {
                setAvailableRoles(rolesData)
                return
            }

            const { data, error } = await supabase.from('users_roles').select('*')
            if (error) throw error
            setAvailableRoles(data || [])
        } catch {
            setAvailableRoles([])
        }
    }

    async function fetchManagerDetails() {
        setIsLoading(true)
        try {
            const [
                { data: userData, error: userError },
                { data: profileData, error: profileError },
                { data: permissionData, error: permissionError }
            ] = await Promise.all([
                supabase.from('users').select('*').eq('id', managerId).single(),
                supabase.from('users_profiles').select('*').eq('id', managerId).single(),
                supabase.from('users_permissions').select('role_id').eq('user_id', managerId).single()
            ])

            if (userError) throw userError
            if (profileError) throw profileError
            if (permissionError && permissionError.code !== 'PGRST116') throw permissionError

            let rName = 'User',
                roleId = null,
                roleWeight = 0
            if (permissionData?.role_id) {
                const { data: roleData, error: roleError } = await supabase
                    .from('users_roles')
                    .select('name, id, weight')
                    .eq('id', permissionData.role_id)
                    .single()
                if (!roleError && roleData) {
                    rName = roleData.name
                    roleId = roleData.id
                    roleWeight = roleData.weight || 0
                }
            }

            const managerData = {
                createdAt: profileData.created_at,
                email: userData.email,
                firstName: profileData.first_name,
                id: managerId,
                lastName: profileData.last_name,
                plantCode: profileData.plant_code,
                roleId,
                roleName: rName,
                roleWeight,
                updatedAt: profileData.updated_at
            }

            setManager(managerData)
            setFirstName(managerData.firstName)
            setLastName(managerData.lastName)
            setEmail(managerData.email)
            setPlantCode(managerData.plantCode)
            setRoleName(managerData.roleName)
            setOriginalValues({
                email: managerData.email,
                firstName: managerData.firstName,
                lastName: managerData.lastName,
                plantCode: managerData.plantCode,
                roleName: managerData.roleName
            })
            setHasUnsavedChanges(false)
        } catch (error) {
            console.error('Error fetching manager details:', error)
            setMessage('Error fetching manager details')
            setTimeout(() => setMessage(''), 3000)
        } finally {
            setIsLoading(false)
        }
    }

    async function fetchPlants() {
        try {
            const { data, error } = await supabase.from('plants').select('*')
            if (error) throw error
            setPlants(data || [])
        } catch {}
    }

    async function handleSave() {
        if (isReadOnly) return
        if (!manager?.id) {
            alert('Error: Cannot save manager with undefined ID')
            throw new Error('Cannot save manager with undefined ID')
        }

        if (!plantCode || !plantCode.trim()) {
            setMessage('Plant must be assigned before saving.')
            return
        }

        setIsSaving(true)
        try {
            const { data: checkManager } = await supabase
                .from('users_profiles')
                .select('id')
                .eq('id', manager.id)
                .single()
            if (!checkManager) throw new Error(`Manager with ID ${manager.id} not found`)

            const [{ error: profileError }, { error: userError }] = await Promise.all([
                supabase
                    .from('users_profiles')
                    .update({
                        first_name: firstName,
                        last_name: lastName,
                        plant_code: plantCode,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', manager.id),
                supabase
                    .from('users')
                    .update({
                        email,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', manager.id)
            ])

            if (profileError) throw profileError
            if (userError) throw userError

            const selectedRole = availableRoles.find((role) => role.name === roleName)
            if (!selectedRole) throw new Error(`Role '${roleName}' not found in available roles.`)

            const { data: existingPermission } = await supabase
                .from('users_permissions')
                .select('id')
                .eq('user_id', managerId)
            const updateData = {
                role_id: selectedRole.id,
                updated_at: new Date().toISOString()
            }
            const { error: permError } = existingPermission?.length
                ? await supabase.from('users_permissions').update(updateData).eq('user_id', managerId)
                : await supabase.from('users_permissions').insert({
                      ...updateData,
                      created_at: new Date().toISOString(),
                      user_id: managerId
                  })
            if (permError) throw permError

            if (showPasswordField && password) {
                const { data: userData, error: userFetchError } = await supabase
                    .from('users')
                    .select('salt')
                    .eq('id', managerId)
                    .single()
                if (userFetchError) throw userFetchError
                const passwordHash = await AuthUtility.hashPassword(password, userData.salt)
                const { error: passwordError } = await supabase
                    .from('users')
                    .update({
                        password_hash: passwordHash,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', managerId)
                if (passwordError) throw passwordError
            }

            setMessage('Changes saved successfully!')
            setTimeout(() => setMessage(''), 3000)
            setOriginalValues({ email, firstName, lastName, plantCode, roleName })
            setHasUnsavedChanges(false)
            setShowPasswordField(false)
            setPassword('')
            await fetchManagerDetails()
        } catch (error) {
            console.error('Error saving manager:', error)
            setMessage(`Error saving changes: ${error.message || 'Unknown error'}`)
            setTimeout(() => setMessage(''), 5000)
        } finally {
            setIsSaving(false)
        }
    }

    async function handleDelete() {
        if (!manager) return
        if (!showDeleteConfirmation) {
            setShowDeleteConfirmation(true)
            return
        }

        try {
            const { error } = await supabase.from('users').delete().eq('id', managerId)
            if (error) throw error
            alert('Manager deleted successfully')
            onClose()
        } catch {
            alert('Error deleting manager')
        } finally {
            setShowDeleteConfirmation(false)
        }
    }

    const handleBackClick = async () => {
        if (!isReadOnly && hasUnsavedChanges) {
            await handleSave()
        }
        onClose()
    }

    const getPlantName = (plantCode) => {
        const plant = plants.find((p) => p.plant_code === plantCode)
        return plant ? plant.plant_name : plantCode || 'No Plant'
    }

    const selectedPlantObj = plants.find((p) => p.plant_code === plantCode)
    const plantDisplayText = plantCode
        ? `(${selectedPlantObj?.plant_code || plantCode}) ${selectedPlantObj?.plant_name || ''}`
        : 'Select Plant'

    return (
        <DetailViewSection
            title={manager ? `${manager.firstName} ${manager.lastName || 'Manager Details'}` : 'Manager Details'}
            onClose={onClose}
            onBack={handleBackClick}
            isSaving={isSaving}
            message={message}
            itemAssignedPlant={manager?.plantCode}
            onCanEditChange={setCanEditManager}
            isLoading={isLoading}
            loadingMessage="Loading manager details..."
            notFound={!manager && !isLoading}
            notFoundMessage="Manager Not Found"
            notFoundDescription="Could not find the requested manager. They may have been deleted."
            footerActions={
                <>
                    {!isReadOnly && canEditManager ? (
                        <>
                            <button
                                className="global-button-secondary"
                                onClick={handleSave}
                                disabled={isSaving}
                                style={{ flex: 1, justifyContent: 'center' }}
                            >
                                <i className="fas fa-save"></i>
                                <span>{isSaving ? 'Saving...' : 'Save'}</span>
                            </button>
                            {canDeleteManager && (
                                <button
                                    className="global-button-secondary"
                                    onClick={() => setShowDeleteConfirmation(true)}
                                    disabled={isSaving}
                                    style={{ flex: 1, justifyContent: 'center' }}
                                >
                                    <i className="fas fa-trash-alt"></i>
                                    <span>Delete</span>
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="sidebar-readonly-notice">
                            <i className="fas fa-lock"></i>
                            <span>View-Only Mode</span>
                        </div>
                    )}
                </>
            }
            showDeleteConfirmation={showDeleteConfirmation}
            onDeleteConfirm={handleDelete}
            onDeleteCancel={() => setShowDeleteConfirmation(false)}
            deleteTitle="Confirm Delete"
            deleteMessage={
                manager
                    ? `Are you sure you want to delete ${manager.firstName} ${manager.lastName}? This action cannot be undone.`
                    : 'Are you sure you want to delete this manager? This action cannot be undone.'
            }
            modals={
                showPlantModal && (
                    <PlantDropdownModal
                        isOpen={showPlantModal}
                        onClose={() => setShowPlantModal(false)}
                        plants={filteredPlants}
                        onSelect={(code) => {
                            setPlantCode(code)
                            setShowPlantModal(false)
                        }}
                        searchPlaceholder="Search plants..."
                    />
                )
            }
        >
            <DetailViewSection.Section id="basic" title="Manager Information" icon="fas fa-user">
                {(isReadOnly || !canEditManager) && (
                    <div
                        style={{
                            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                            border: '1px solid #fcd34d',
                            borderRadius: 12,
                            display: 'flex',
                            gap: 12,
                            gridColumn: '1 / -1',
                            padding: '16px 20px'
                        }}
                    >
                        <i className="fas fa-lock" style={{ color: '#b45309', fontSize: 20, marginTop: 2 }}></i>
                        <div>
                            <div style={{ color: '#92400e', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                                View-Only Mode
                            </div>
                            <div style={{ color: '#a16207', fontSize: 13, lineHeight: 1.5 }}>
                                You do not have permission to edit this manager. Contact an administrator if you need to
                                make changes.
                            </div>
                        </div>
                    </div>
                )}
                <DetailViewSection.Card title="Basic Information" icon="fas fa-id-card">
                    <div className="form-group">
                        <label>First Name</label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="form-control"
                            readOnly={isReadOnly || !canEditManager}
                        />
                    </div>
                    <div className="form-group">
                        <label>Last Name</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="form-control"
                            readOnly={isReadOnly || !canEditManager}
                        />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="form-control"
                            readOnly={isReadOnly || !canEditManager}
                        />
                    </div>
                </DetailViewSection.Card>
                <DetailViewSection.Card title="Assignment" icon="fas fa-building">
                    <div className="form-group">
                        <label>Plant</label>
                        <button
                            className="operator-select-button form-control"
                            onClick={() => !isReadOnly && canEditManager && setShowPlantModal(true)}
                            type="button"
                            disabled={isReadOnly || !canEditManager}
                            style={{ cursor: isReadOnly || !canEditManager ? 'not-allowed' : 'pointer' }}
                        >
                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {plantDisplayText}
                            </span>
                        </button>
                    </div>
                    <div className="form-group">
                        <label>Role</label>
                        <select
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                            className="form-control"
                            disabled={isReadOnly || !canEditManager}
                        >
                            {availableRoles.length ? (
                                availableRoles.map((role) => (
                                    <option key={role.id} value={role.name}>
                                        {role.name}
                                    </option>
                                ))
                            ) : (
                                <option value="">Loading roles...</option>
                            )}
                        </select>
                    </div>
                </DetailViewSection.Card>
            </DetailViewSection.Section>

            {!isReadOnly && canEditManager && (
                <DetailViewSection.Section id="security" title="Security" icon="fas fa-shield-alt">
                    <DetailViewSection.Card title="Password Management" icon="fas fa-key">
                        {!showPasswordField ? (
                            <div className="form-group">
                                <label>Password</label>
                                <div style={{ alignItems: 'center', display: 'flex', gap: 12, marginTop: 8 }}>
                                    <span style={{ color: '#64748b', fontSize: 14 }}>••••••••</span>
                                    <button
                                        className="global-button-secondary"
                                        onClick={() => setShowPasswordField(true)}
                                        style={{ fontSize: 14, padding: '8px 16px' }}
                                    >
                                        <i className="fas fa-key"></i> Change Password
                                    </button>
                                </div>
                                <p style={{ color: '#64748b', fontSize: 13, marginBottom: 0, marginTop: 8 }}>
                                    Click &quot;Change Password&quot; to set a new password for this manager.
                                </p>
                            </div>
                        ) : (
                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="form-control"
                                    autoFocus
                                />
                                <p style={{ color: '#64748b', fontSize: 13, marginBottom: 12, marginTop: 8 }}>
                                    Enter a new password and click &quot;Save&quot; to apply it.
                                </p>
                                <button
                                    className="global-button-secondary"
                                    onClick={() => {
                                        setShowPasswordField(false)
                                        setPassword('')
                                    }}
                                    style={{ fontSize: 14, padding: '8px 16px' }}
                                >
                                    <i className="fas fa-times"></i> Cancel
                                </button>
                            </div>
                        )}
                    </DetailViewSection.Card>
                </DetailViewSection.Section>
            )}
        </DetailViewSection>
    )
}

export default ManagerDetailView
