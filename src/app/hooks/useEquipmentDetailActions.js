import { useEffect, useState } from 'react'

import { Database } from '../../services/DatabaseService'
import { EquipmentService } from '../../services/EquipmentService'
import { PlantService } from '../../services/PlantService'
import { UserService } from '../../services/UserService'

/**
 * Save / delete / verify / region-transfer action handlers for the equipment
 * detail view. Wraps the data hook state and orchestrates the various
 * persistence flows while keeping the UI free of business rules.
 *
 * @param {object} state - Return value of {@link useEquipmentDetail}.
 * @param {string} equipmentId - Equipment ID being edited.
 * @param {Function} onClose - Closes the detail view.
 * @param {Function} [onSaved] - Optional callback fired after a successful save/verify.
 * @returns {object} Action handlers + supporting permission/modal state.
 */
export default function useEquipmentDetailActions(state, equipmentId, onClose, onSaved) {
    const {
        assignedPlant,
        cleanlinessRating,
        conditionRating,
        equipment,
        equipmentType,
        hasUnsavedChanges,
        hours,
        hoursMileage,
        identifyingNumber,
        lastServiceDate,
        make,
        model,
        originalValues,
        setAssignedPlant,
        setEquipment,
        setHasUnsavedChanges,
        setMessage,
        setOriginalValues,
        setUpdatedByEmail,
        status,
        year
    } = state

    const [isSaving, setIsSaving] = useState(false)
    const [canEditEquipment, setCanEditEquipment] = useState(false)
    const [canDeleteEquipment, setCanDeleteEquipment] = useState(false)
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false)
    const [missingFields, setMissingFields] = useState([])

    useEffect(() => {
        const checkDeletePermission = async () => {
            try {
                const currentUser = await UserService.getCurrentUser()
                const userId = currentUser?.id || currentUser
                if (userId) {
                    const hasPermission = await UserService.hasPermission(userId, 'detailview.delete')
                    setCanDeleteEquipment(hasPermission)
                } else {
                    setCanDeleteEquipment(false)
                }
            } catch (error) {
                setCanDeleteEquipment(false)
            }
        }
        checkDeletePermission()
    }, [])

    async function handleRegionTransfer(newRegionCode, newPlantCode) {
        if (!equipment?.id || !newRegionCode || !newPlantCode) {
            throw new Error('Invalid equipment, region, or plant')
        }
        const newRegion = await PlantService.fetchRegionByCode(newRegionCode)
        if (!newRegion) {
            throw new Error('Target region not found')
        }
        setIsSaving(true)
        setMessage('')
        try {
            const userObj = await UserService.getCurrentUser()
            const userId = typeof userObj === 'object' && userObj !== null ? userObj.id : userObj
            const updatedEquipment = {
                ...equipment,
                assignedPlant: newPlantCode
            }
            const result = await EquipmentService.updateEquipment(equipment.id, updatedEquipment, userId, equipment)
            setEquipment(result)
            setAssignedPlant(newPlantCode)
            setOriginalValues({
                ...originalValues,
                assignedPlant: newPlantCode
            })
            setHasUnsavedChanges(false)
            setMessage(`Successfully transferred to ${newRegion.regionName}`)
            setTimeout(() => setMessage(''), 3000)
        } catch (error) {
            console.error('Region transfer failed:', error)
            throw error
        } finally {
            setIsSaving(false)
        }
    }

    async function handleSave(overrides = {}) {
        if (!equipment?.id) {
            alert('Error: Cannot save equipment with undefined ID')
            return null
        }
        const relevantOverrideKeys = Object.keys(overrides || {}).filter((k) => !['silent'].includes(k))
        if (!hasUnsavedChanges && relevantOverrideKeys.length === 0) {
            return equipment
        }
        setIsSaving(true)
        try {
            const user = await UserService.getCurrentUser()
            const userId = user && typeof user === 'object' ? user.id : user
            if (!userId) {
                setMessage('Error saving changes: User ID is required')
                return null
            }
            const statusValue = overrides.status ?? status
            // Business rule: equipment cannot be set to "In Shop" unless it has at least one open maintenance issue.
            if (statusValue === 'In Shop' && originalValues.status !== 'In Shop') {
                const { data: openIssues } = await Database.from('heavy_equipment_maintenance')
                    .select('id')
                    .eq('equipment_id', equipment.id)
                    .is('time_completed', null)
                if (!openIssues || openIssues.length === 0) {
                    setIsSaving(false)
                    setMessage(
                        'Cannot change status to "In Shop" without having at least one open issue. Please add an issue first.'
                    )
                    setTimeout(() => setMessage(''), 5000)
                    return null
                }
            }
            // Floor ratings to 1 on save — a rating of 0 is treated as "not yet rated" in the UI.
            let cleanlinessValue = cleanlinessRating
            let conditionValue = conditionRating
            if (!conditionValue || isNaN(conditionValue) || conditionValue < 1) conditionValue = 1
            const parsedHours = (() => {
                if (hours === '' || hours == null) return null
                const n = Number(hours)
                return Number.isFinite(n) && n >= 0 ? n : null
            })()
            const updatedEquipment = {
                assignedPlant,
                cleanlinessRating: cleanlinessValue,
                conditionRating: conditionValue,
                equipmentMake: make,
                equipmentModel: model,
                equipmentType,
                hours: parsedHours,
                hoursMileage: hoursMileage ? parseFloat(hoursMileage) : null,
                identifyingNumber,
                lastServiceDate,
                status,
                updatedLast: equipment.updatedLast,
                yearMade: year ? parseInt(year) : null,
                ...overrides
            }
            const result = await EquipmentService.updateEquipment(equipment.id, updatedEquipment, userId)
            if (!result) {
                setMessage('Error saving changes: No data returned from server')
                return null
            }
            setEquipment(result)
            if (!overrides.silent) {
                setMessage('Changes saved successfully! Equipment needs verification.')
                setTimeout(() => setMessage(''), 5000)
            }
            setOriginalValues({
                assignedPlant: result.assignedPlant,
                cleanlinessRating: result.cleanlinessRating,
                conditionRating: result.conditionRating,
                equipmentMake: result.equipmentMake,
                equipmentModel: result.equipmentModel,
                equipmentType: result.equipmentType,
                hours: result.hours != null ? String(result.hours) : '',
                hoursMileage: result.hoursMileage ? result.hoursMileage.toString() : '',
                identifyingNumber: result.identifyingNumber,
                lastServiceDate: result.lastServiceDate,
                status: result.status,
                yearMade: result.yearMade ? result.yearMade.toString() : ''
            })
            setHasUnsavedChanges(false)
            if (onSaved) {
                onSaved(result)
            }
            return result
        } catch (error) {
            console.error('Save error:', error)
            console.error('Error details:', {
                equipmentId: equipment?.id,
                message: error.message,
                stack: error.stack
            })
            let errorMessage = 'Unknown error'
            if (error.message && typeof error.message === 'string') {
                if (
                    error.message.includes('duplicate key') &&
                    error.message.includes('equipment_equipment_number_key')
                ) {
                    errorMessage = `This equipment number already exists. Please use a different equipment number.`
                } else {
                    errorMessage = error.message
                }
            }
            setMessage('Error saving changes: ' + errorMessage)
            return null
        } finally {
            setIsSaving(false)
        }
    }

    async function handleDelete() {
        if (!equipment) return
        if (!showDeleteConfirmation) return setShowDeleteConfirmation(true)
        try {
            await EquipmentService.deleteEquipment(equipment.id)
            alert('Equipment deleted successfully')
            onClose()
        } catch (error) {
            alert('Error deleting equipment')
        } finally {
            setShowDeleteConfirmation(false)
        }
    }

    async function handleBackClick() {
        if (hasUnsavedChanges) {
            await handleSave()
        }
        onClose()
    }

    async function verifyAndPersist(overrides) {
        const candidateEquipment = {
            ...equipment,
            equipmentMake: overrides.equipmentMake ?? make ?? equipment.equipmentMake,
            equipmentModel: overrides.equipmentModel ?? model ?? equipment.equipmentModel,
            lastServiceDate: overrides.lastServiceDate ?? equipment.lastServiceDate,
            yearMade: overrides.yearMade ?? year ?? equipment.yearMade
        }
        if (hasUnsavedChanges) {
            await handleSave().catch(() => {
                alert('Failed to save your changes before verification. Please try saving manually first.')
                throw new Error('Failed to save changes before verification')
            })
        }
        const userObj = await UserService.getCurrentUser()
        const userId = typeof userObj === 'object' && userObj !== null ? userObj.id : userObj
        const verified = await EquipmentService.verifyEquipment(candidateEquipment.id, userId)
        setEquipment(verified)
        setMessage('Equipment verified successfully!')
        setTimeout(() => setMessage(''), 3000)
        setHasUnsavedChanges(false)
        setShowMissingFieldsModal(false)
        setMissingFields([])
        if (verified.updatedBy) {
            try {
                const userName = await UserService.getUserDisplayName(verified.updatedBy)
                setUpdatedByEmail(userName)
            } catch {
                setUpdatedByEmail('Unknown User')
            }
        }
        if (onSaved) {
            onSaved(verified)
        }
    }

    async function handleVerifyEquipment() {
        try {
            const missing = []
            if (!make || !make.trim()) missing.push('Make')
            if (!model || !model.trim()) missing.push('Model')
            if (!year || year === '0') missing.push('Year')
            if (missing.length > 0) {
                setMissingFields(missing)
                setShowMissingFieldsModal(true)
                return
            }
            const overrides = {}
            const incomingService = lastServiceDate
                ? lastServiceDate instanceof Date
                    ? lastServiceDate
                    : new Date(lastServiceDate)
                : null
            const existingService = equipment.lastServiceDate ? new Date(equipment.lastServiceDate) : null
            if (incomingService && (!existingService || existingService.getTime() !== incomingService.getTime()))
                overrides.lastServiceDate = incomingService
            await handleSave(overrides)
            await verifyAndPersist(overrides)
        } catch (error) {
            alert('Failed to verify equipment. Please try again.')
        }
    }

    async function handleSaveAndVerify() {
        try {
            const overrides = {
                equipmentMake: make,
                equipmentModel: model,
                lastServiceDate: lastServiceDate,
                yearMade: year ? parseInt(year) : null
            }
            const existingService = equipment.lastServiceDate ? new Date(equipment.lastServiceDate) : null
            const incomingService = lastServiceDate
                ? lastServiceDate instanceof Date
                    ? lastServiceDate
                    : new Date(lastServiceDate)
                : null
            if (incomingService && (!existingService || existingService.getTime() !== incomingService.getTime()))
                overrides.lastServiceDate = incomingService
            await handleSave(overrides)
            await verifyAndPersist(overrides)
        } catch (error) {
            alert('Failed to save missing fields. Please try again.')
        }
    }

    return {
        canDeleteEquipment,
        canEditEquipment,
        handleBackClick,
        handleDelete,
        handleRegionTransfer,
        handleSave,
        handleSaveAndVerify,
        handleVerifyEquipment,
        isSaving,
        missingFields,
        setCanEditEquipment,
        setShowDeleteConfirmation,
        setShowMissingFieldsModal,
        showDeleteConfirmation,
        showMissingFieldsModal
    }
}
