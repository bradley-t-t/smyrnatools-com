import React, { useCallback, useEffect, useState } from 'react'

import DetailViewSection from '../../../app/components/sections/DetailViewSection'
import { useAuth } from '../../../app/context/AuthContext'
import { usePreferences } from '../../../app/context/PreferencesContext'
import {
    fetchManagerRecord,
    useAvailableRoles,
    useCurrentUserRoleWeight,
    useFilteredPlants,
    usePlants,
    useRegionPlantCodes
} from '../../../app/hooks/useManagerDetailData'
import { Database } from '../../../services/DatabaseService'
import { UserService } from '../../../services/UserService'
import APIUtility from '../../../utils/APIUtility'
import ManagerAssignmentCard from './detail/ManagerAssignmentCard'
import ManagerBasicInfoCard from './detail/ManagerBasicInfoCard'
import ManagerDetailFooterActions from './detail/ManagerDetailFooterActions'
import ManagerDetailModals from './detail/ManagerDetailModals'
import ManagerReadOnlyBanner from './detail/ManagerReadOnlyBanner'
import ManagerSecuritySection from './detail/ManagerSecuritySection'

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
    const { plants, fetchPlants } = usePlants()
    const { availableRoles, fetchRoles } = useAvailableRoles()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [message, setMessage] = useState('')
    const [originalValues, setOriginalValues] = useState({})
    const [isReadOnly, setIsReadOnly] = useState(false)
    const { currentUserRoleWeight, fetchCurrentUserRole } = useCurrentUserRoleWeight(user?.id)
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [plantCode, setPlantCode] = useState('')
    const [additionalPlants, setAdditionalPlants] = useState([])
    const [roleName, setRoleName] = useState('')
    const [password, setPassword] = useState('')
    const [showPasswordField, setShowPasswordField] = useState(false)
    const [showPlantModal, setShowPlantModal] = useState(false)
    const [showAdditionalPlantsModal, setShowAdditionalPlantsModal] = useState(false)
    const [canEditManager, setCanEditManager] = useState(false)
    const [canDeleteManager, setCanDeleteManager] = useState(false)

    useEffect(() => {
        document.body.classList.add('in-detail-view')
        return () => document.body.classList.remove('in-detail-view')
    }, [])

    useEffect(() => {
        if (!user?.id) {
            setCanDeleteManager(false)
            return
        }
        let cancelled = false
        UserService.getUserRoles(user.id)
            .then((roles) => {
                if (!cancelled) setCanDeleteManager(roles.some((role) => role?.name === 'IT Access'))
            })
            .catch(() => {
                if (!cancelled) setCanDeleteManager(false)
            })
        return () => {
            cancelled = true
        }
    }, [user?.id])

    const fetchManagerDetails = useCallback(
        async function fetchManagerDetails() {
            setIsLoading(true)
            try {
                const managerData = await fetchManagerRecord(managerId)
                setManager(managerData)
                setFirstName(managerData.firstName)
                setLastName(managerData.lastName)
                setEmail(managerData.email)
                setPlantCode(managerData.plantCode)
                setAdditionalPlants(managerData.additionalAssignedPlants)
                setRoleName(managerData.roleName)
                setOriginalValues({
                    additionalPlants: managerData.additionalAssignedPlants,
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const regionPlantCodes = useRegionPlantCodes(preferences.selectedRegion?.code, plantCode, setPlantCode)
    const filteredPlants = useFilteredPlants(plants, regionPlantCodes, preferences.selectedRegion?.type)

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
                <ManagerDetailFooterActions
                    isReadOnly={isReadOnly}
                    canEditManager={canEditManager}
                    canDeleteManager={canDeleteManager}
                    isSaving={isSaving}
                    onSave={handleSave}
                    onRequestDelete={() => setShowDeleteConfirmation(true)}
                />
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
                <ManagerDetailModals
                    showPlantModal={showPlantModal}
                    onClosePlantModal={() => setShowPlantModal(false)}
                    filteredPlants={filteredPlants}
                    onSelectPlant={(code) => {
                        setPlantCode(code)
                        setShowPlantModal(false)
                    }}
                    showAdditionalPlantsModal={showAdditionalPlantsModal}
                    onCloseAdditionalPlantsModal={() => setShowAdditionalPlantsModal(false)}
                    additionalPlantOptions={filteredPlants.filter((p) => p.plant_code !== plantCode)}
                    onToggleAdditionalPlant={(code) =>
                        setAdditionalPlants((prev) =>
                            prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
                        )
                    }
                    additionalPlants={additionalPlants}
                />
            }
        >
            <DetailViewSection.Section id="basic" title="Manager Information" icon="fas fa-user">
                {(isReadOnly || !canEditManager) && <ManagerReadOnlyBanner />}
                <ManagerBasicInfoCard
                    firstName={firstName}
                    onFirstNameChange={setFirstName}
                    lastName={lastName}
                    onLastNameChange={setLastName}
                    email={email}
                    onEmailChange={setEmail}
                    isReadOnly={isReadOnly}
                    canEditManager={canEditManager}
                />
                <ManagerAssignmentCard
                    plantDisplayText={plantDisplayText}
                    onOpenPlantModal={() => setShowPlantModal(true)}
                    additionalPlants={additionalPlants}
                    onOpenAdditionalPlantsModal={() => setShowAdditionalPlantsModal(true)}
                    onRemoveAdditionalPlant={(code) => setAdditionalPlants((prev) => prev.filter((c) => c !== code))}
                    plants={plants}
                    roleName={roleName}
                    onRoleNameChange={setRoleName}
                    availableRoles={availableRoles}
                    isReadOnly={isReadOnly}
                    canEditManager={canEditManager}
                />
            </DetailViewSection.Section>
            {!isReadOnly && canEditManager && (
                <ManagerSecuritySection
                    showPasswordField={showPasswordField}
                    onShowPasswordField={() => setShowPasswordField(true)}
                    password={password}
                    onPasswordChange={setPassword}
                    onCancelPasswordChange={() => {
                        setShowPasswordField(false)
                        setPassword('')
                    }}
                />
            )}
        </DetailViewSection>
    )
}

export default ManagerDetailView
