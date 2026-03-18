import React, { useCallback, useEffect, useMemo, useState } from 'react'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import DetailViewSection from '../../../app/components/sections/DetailViewSection'
import { useAuth } from '../../../app/context/AuthContext'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { Database } from '../../../services/DatabaseService'
import { PlantService } from '../../../services/PlantService'
import { UserService } from '../../../services/UserService'
import APIUtility from '../../../utils/APIUtility'
/**
 * Detail/edit view for a single manager. Provides name, email, plant,
 * and role editing with inline password reset. Enforces role-weight-based
 * permissions — users can only edit managers with a lower role weight
 * (or if their own weight exceeds 75). Region-scopes the plant picker.
 *
 * @param {string} managerId - ID of the manager to display.
 * @param {Function} onClose - Callback to return to the list view.
 */
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
    const [additionalPlants, setAdditionalPlants] = useState([])
    const [roleName, setRoleName] = useState('')
    const [password, setPassword] = useState('')
    const [showPasswordField, setShowPasswordField] = useState(false)
    const [regionPlantCodes, setRegionPlantCodes] = useState(new Set())
    const [showPlantModal, setShowPlantModal] = useState(false)
    const [showAdditionalPlantsModal, setShowAdditionalPlantsModal] = useState(false)
    const [canEditManager, setCanEditManager] = useState(false)
    const [canDeleteManager, _setCanDeleteManager] = useState(false)
    useEffect(() => {
        document.body.classList.add('in-detail-view')
        return () => document.body.classList.remove('in-detail-view')
    }, [])
    const fetchCurrentUserRole = useCallback(
        async function fetchCurrentUserRole() {
            try {
                if (!user?.id) return
                const highestRole = await UserService.getHighestRole(user.id)
                setCurrentUserRoleWeight(highestRole?.weight || 0)
            } catch {
                setCurrentUserRoleWeight(0)
            }
        },
        [user?.id]
    )
    const fetchManagerDetails = useCallback(
        async function fetchManagerDetails() {
            setIsLoading(true)
            try {
                const [
                    { data: userData, error: userError },
                    { data: profileData, error: profileError },
                    { data: permissionData, error: permissionError }
                ] = await Promise.all([
                    Database.from('users').select('*').eq('id', managerId).single(),
                    Database.from('users_profiles').select('*').eq('id', managerId).single(),
                    Database.from('users_permissions').select('role_id').eq('user_id', managerId).single()
                ])
                if (userError) throw userError
                if (profileError) throw profileError
                if (permissionError && permissionError.code !== 'PGRST116') throw permissionError
                let rName = 'User',
                    roleId = null,
                    roleWeight = 0
                if (permissionData?.role_id) {
                    const { data: roleData, error: roleError } = await Database.from('users_roles')
                        .select('name, id, weight')
                        .eq('id', permissionData.role_id)
                        .single()
                    if (!roleError && roleData) {
                        rName = roleData.name
                        roleId = roleData.id
                        roleWeight = roleData.weight || 0
                    }
                }
                const additionalAssignedPlants = Array.isArray(profileData.additional_assigned_plants)
                    ? profileData.additional_assigned_plants
                    : []
                const managerData = {
                    additionalAssignedPlants: additionalAssignedPlants,
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
                setAdditionalPlants(additionalAssignedPlants)
                setRoleName(managerData.roleName)
                setOriginalValues({
                    additionalPlants: additionalAssignedPlants,
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
        },
        [managerId]
    )
    useEffect(() => {
        if (managerId) {
            Promise.all([fetchManagerDetails(), fetchPlants(), fetchRoles(), fetchCurrentUserRole()]).catch(() => {})
        }
    }, [managerId, fetchCurrentUserRole, fetchManagerDetails])
    useEffect(() => {
        if (!manager || isLoading) return
        const additionalPlantsChanged =
            JSON.stringify([...(additionalPlants || [])].sort()) !==
            JSON.stringify([...(originalValues.additionalPlants || [])].sort())
        const hasChanges =
            firstName !== originalValues.firstName ||
            lastName !== originalValues.lastName ||
            email !== originalValues.email ||
            plantCode !== originalValues.plantCode ||
            roleName !== originalValues.roleName ||
            additionalPlantsChanged ||
            (showPasswordField && password)
        setHasUnsavedChanges(hasChanges)
    }, [
        firstName,
        lastName,
        email,
        plantCode,
        roleName,
        additionalPlants,
        password,
        showPasswordField,
        originalValues,
        isLoading,
        manager
    ])
    // Enforce read-only mode unless the current user outranks this manager (or has weight > 75).
    useEffect(() => {
        if (!manager) return
        const canEditAny = currentUserRoleWeight > 75
        const canEditByWeight = currentUserRoleWeight > (manager.roleWeight || 0)
        setIsReadOnly(!(canEditAny || canEditByWeight))
    }, [manager, currentUserRoleWeight])
    // Re-assert the manager's role once both roles and manager data are available
    useEffect(() => {
        if (!manager?.roleName || !availableRoles.length) return
        const matchingRole = availableRoles.find((r) => r.name === manager.roleName)
        if (matchingRole && roleName !== manager.roleName && roleName === originalValues.roleName) {
            setRoleName(manager.roleName)
        }
    }, [availableRoles, manager, roleName, originalValues.roleName])
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
                            const regions = await PlantService.fetchRegionsByPlantCode(plant)
                            const r = Array.isArray(regions) && regions.length ? regions[0] : null
                            regionCode = r ? r.regionCode || r.region_code || '' : ''
                        }
                    }
                }
                if (!regionCode) {
                    if (!cancelled) setRegionPlantCodes(new Set())
                    return
                }
                const regionPlants = await PlantService.fetchRegionPlants(regionCode)
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
    async function fetchRoles() {
        try {
            const rolesData = await UserService.getAllRoles()
            setAvailableRoles(rolesData)
        } catch {
            setAvailableRoles([])
        }
    }
    async function fetchPlants() {
        try {
            const { data, error } = await Database.from('plants').select('*')
            if (error) throw error
            setPlants(data || [])
        } catch (error) {
            console.error('Failed to fetch plants for manager detail view:', error)
        }
    }
    async function handleSave() {
        if (isReadOnly) return
        if (!manager?.id) {
            setMessage('Error: Cannot save manager with undefined ID')
            setTimeout(() => setMessage(''), 5000)
            return
        }
        if (!plantCode || !plantCode.trim()) {
            setMessage('Plant must be assigned before saving.')
            return
        }
        setIsSaving(true)
        try {
            const { data: checkManager } = await Database.from('users_profiles')
                .select('id')
                .eq('id', manager.id)
                .single()
            if (!checkManager) throw new Error(`Manager with ID ${manager.id} not found`)
            const selectedRole = availableRoles.find((role) => role.name === roleName)
            if (!selectedRole) throw new Error(`Role '${roleName}' not found in available roles.`)
            await UserService.updateManager(managerId, {
                email,
                profile: {
                    additional_assigned_plants: additionalPlants.length ? additionalPlants : null,
                    first_name: firstName,
                    last_name: lastName,
                    plant_code: plantCode
                },
                roleId: selectedRole.id
            })
            if (showPasswordField && password) {
                const { res: pwRes, json: pwJson } = await APIUtility.post('/auth-service/admin-update-password', {
                    password,
                    userId: managerId
                })
                if (!pwRes.ok) throw new Error(pwJson?.error || 'Failed to update password')
            }
            setMessage('Changes saved successfully!')
            setTimeout(() => setMessage(''), 3000)
            setOriginalValues({ additionalPlants, email, firstName, lastName, plantCode, roleName })
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
            await UserService.deleteManager(managerId)
            setMessage('Manager deleted successfully')
            setTimeout(() => onClose(), 1500)
        } catch {
            setMessage('Error deleting manager')
            setTimeout(() => setMessage(''), 5000)
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
    const _getPlantName = (code) => {
        const plant = plants.find((p) => p.plant_code === code)
        return plant ? plant.plant_name : code || 'No Plant'
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
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-light bg-bg-primary px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                <i className="fas fa-save"></i>
                                <span>{isSaving ? 'Saving...' : 'Save'}</span>
                            </button>
                            {canDeleteManager && (
                                <button
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-light bg-bg-primary px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover"
                                    onClick={() => setShowDeleteConfirmation(true)}
                                    disabled={isSaving}
                                >
                                    <i className="fas fa-trash-alt"></i>
                                    <span>Delete</span>
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-text-secondary text-sm font-medium">
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
                <>
                    {showPlantModal && (
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
                    )}
                    {showAdditionalPlantsModal && (
                        <PlantDropdownModal
                            isOpen={showAdditionalPlantsModal}
                            onClose={() => setShowAdditionalPlantsModal(false)}
                            plants={filteredPlants.filter((p) => p.plant_code !== plantCode)}
                            onSelect={(code) => {
                                setAdditionalPlants((prev) =>
                                    prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
                                )
                            }}
                            searchPlaceholder="Search plants..."
                            allowMultiple={true}
                            selectedPlantCodes={additionalPlants}
                        />
                    )}
                </>
            }
        >
            <DetailViewSection.Section id="basic" title="Manager Information" icon="fas fa-user">
                {(isReadOnly || !canEditManager) && (
                    <div className="col-span-full flex gap-3 rounded-xl border border-border-medium bg-gradient-to-br from-bg-hover to-border-medium px-5 py-4">
                        <i className="fas fa-lock text-text-secondary text-xl mt-0.5"></i>
                        <div>
                            <div className="text-text-primary text-[15px] font-semibold mb-1">View-Only Mode</div>
                            <div className="text-text-secondary text-[13px] leading-normal">
                                You do not have permission to edit this manager. Contact an administrator if you need to
                                make changes.
                            </div>
                        </div>
                    </div>
                )}
                <DetailViewSection.Card title="Basic Information" icon="fas fa-id-card">
                    <div className="flex flex-col gap-1.5">
                        <label>First Name</label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                            readOnly={isReadOnly || !canEditManager}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label>Last Name</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                            readOnly={isReadOnly || !canEditManager}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                            readOnly={isReadOnly || !canEditManager}
                        />
                    </div>
                </DetailViewSection.Card>
                <DetailViewSection.Card title="Assignment" icon="fas fa-building">
                    <div className="flex flex-col gap-1.5">
                        <label>Plant</label>
                        <button
                            className={`w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary text-left outline-none transition-colors focus:border-accent ${isReadOnly || !canEditManager ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            onClick={() => !isReadOnly && canEditManager && setShowPlantModal(true)}
                            type="button"
                            disabled={isReadOnly || !canEditManager}
                        >
                            <span className="block overflow-hidden text-ellipsis">{plantDisplayText}</span>
                        </button>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label>Additional Plants</label>
                        <button
                            className={`w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary text-left outline-none transition-colors focus:border-accent ${isReadOnly || !canEditManager ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            onClick={() => !isReadOnly && canEditManager && setShowAdditionalPlantsModal(true)}
                            type="button"
                            disabled={isReadOnly || !canEditManager}
                        >
                            <span className="block overflow-hidden text-ellipsis">
                                {additionalPlants.length
                                    ? additionalPlants
                                          .map((code) => {
                                              const p = plants.find((pl) => pl.plant_code === code)
                                              return `(${code}) ${p?.plant_name || ''}`
                                          })
                                          .join(', ')
                                    : 'No additional plants'}
                            </span>
                        </button>
                        {additionalPlants.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {additionalPlants.map((code) => {
                                    const p = plants.find((pl) => pl.plant_code === code)
                                    return (
                                        <span
                                            key={code}
                                            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                                        >
                                            ({code}) {p?.plant_name || ''}
                                            {!isReadOnly && canEditManager && (
                                                <button
                                                    type="button"
                                                    className="ml-1 text-blue-400 hover:text-blue-700"
                                                    onClick={() =>
                                                        setAdditionalPlants((prev) => prev.filter((c) => c !== code))
                                                    }
                                                >
                                                    <i className="fas fa-times text-[10px]" />
                                                </button>
                                            )}
                                        </span>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label>Role</label>
                        <div className="relative">
                            <select
                                value={roleName}
                                onChange={(e) => setRoleName(e.target.value)}
                                className={`w-full appearance-none rounded-xl border border-border-light bg-bg-secondary pl-4 pr-10 py-3 text-sm outline-none transition-colors focus:border-accent ${isReadOnly || !canEditManager ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${roleName ? 'text-text-primary' : 'text-text-secondary'}`}
                                disabled={isReadOnly || !canEditManager || !availableRoles.length || !roleName}
                            >
                                {!availableRoles.length || !roleName ? (
                                    <option value={roleName}>{roleName || 'Loading...'}</option>
                                ) : (
                                    availableRoles.map((role) => (
                                        <option key={role.id} value={role.name}>
                                            {role.name}
                                        </option>
                                    ))
                                )}
                            </select>
                            <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-xs text-text-secondary pointer-events-none" />
                        </div>
                    </div>
                </DetailViewSection.Card>
            </DetailViewSection.Section>
            {!isReadOnly && canEditManager && (
                <DetailViewSection.Section id="security" title="Security" icon="fas fa-shield-alt">
                    <DetailViewSection.Card title="Password Management" icon="fas fa-key">
                        {!showPasswordField ? (
                            <div className="flex flex-col gap-1.5">
                                <label>Password</label>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-text-secondary text-sm">••••••••</span>
                                    <button
                                        className="flex items-center gap-2 rounded-xl border border-border-light bg-bg-primary px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover"
                                        onClick={() => setShowPasswordField(true)}
                                    >
                                        <i className="fas fa-key"></i> Change Password
                                    </button>
                                </div>
                                <p className="text-text-secondary text-[13px] mt-2 mb-0">
                                    Click &quot;Change Password&quot; to set a new password for this manager.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                                    autoFocus
                                />
                                <p className="text-text-secondary text-[13px] mt-2 mb-3">
                                    Enter a new password and click &quot;Save&quot; to apply it.
                                </p>
                                <button
                                    className="flex items-center gap-2 rounded-xl border border-border-light bg-bg-primary px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover"
                                    onClick={() => {
                                        setShowPasswordField(false)
                                        setPassword('')
                                    }}
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
