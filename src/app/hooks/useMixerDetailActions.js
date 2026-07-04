import { useCallback, useState } from 'react'

import { MixerService } from '../../services/MixerService'
import { PlantService } from '../../services/PlantService'
import { UserService } from '../../services/UserService'
import { ValidationUtility } from '../../utils/ValidationUtility'
import {
    buildHistoryMixer,
    buildUpdatedMixerPayload,
    buildVerificationOverrides,
    computeVerificationRequirements,
    fetchCurrentUserId,
    formatSaveError,
    hasMaterialOverrides,
    hasOpenMaintenanceIssues,
    persistMixerUpdate,
    reconcileOperatorAndStatus,
    resolveSaveInputs,
    resolveShopStatusForSave
} from './mixerSaveHelpers'
import { buildOriginalValues } from './useMixerDetailEditState'

/**
 * Encapsulates all mutating operations for the mixer detail view: save,
 * delete, verify, region transfer, and operator assignment refresh. Side
 * effects (messages, refetches) are wired through the parent's setters so
 * the UI stays in sync.
 */
export default function useMixerDetailActions({
    editState,
    mixer,
    mixerId,
    onClose,
    operatorsState,
    setMessage,
    setMissingFields,
    setMixer,
    setShowDeleteConfirmation,
    setShowMissingFieldsModal,
    setShowOperatorModal,
    setUpdatedByEmail,
    showOperatorModal
}) {
    const [isSaving, setIsSaving] = useState(false)
    const { lastUnassignedOperatorId, setLastUnassignedOperatorId, refreshOperators, fetchOperatorsForModal } =
        operatorsState

    const {
        assignedOperator,
        hasUnsavedChanges,
        hours,
        lastChipDate,
        lastServiceDate,
        make,
        model,
        originalValues,
        setAssignedOperator,
        setAssignedPlant,
        setHasUnsavedChanges,
        setOriginalValues,
        setStatus,
        shopStatus,
        status,
        vin,
        year
    } = editState

    const flashMessage = useCallback(
        (text, durationMs = 3000) => {
            setMessage(text)
            setTimeout(() => setMessage(''), durationMs)
        },
        [setMessage]
    )

    const getOperatorName = useCallback(
        (operatorId) => {
            if (!operatorId || operatorId === '0') return 'None'
            const operator = operatorsState.operators.find((op) => op.employeeId === operatorId)
            if (!operator) return 'Unknown'
            return operator.position ? `${operator.name} (${operator.position})` : operator.name
        },
        [operatorsState.operators]
    )

    const refreshAfterAssignmentChange = useCallback(async () => {
        await refreshOperators()
        await fetchOperatorsForModal()
        const updatedMixer = await MixerService.fetchMixerById(mixerId)
        setMixer(updatedMixer)
    }, [fetchOperatorsForModal, mixerId, refreshOperators, setMixer])

    const handleRegionTransfer = useCallback(
        async (newRegionCode, newPlantCode) => {
            if (!mixer?.id || !newRegionCode || !newPlantCode) {
                throw new Error('Invalid mixer, region, or plant')
            }
            const newRegion = await PlantService.fetchRegionByCode(newRegionCode)
            if (!newRegion) throw new Error('Target region not found')
            setIsSaving(true)
            setMessage('')
            try {
                const userId = await fetchCurrentUserId()
                const updatedMixer = { ...mixer, assignedOperator: null, assignedPlant: newPlantCode }
                const result = await MixerService.updateMixer(mixer.id, updatedMixer, userId, mixer)
                setMixer(result)
                setAssignedPlant(newPlantCode)
                setAssignedOperator('')
                setOriginalValues({ ...originalValues, assignedOperator: '', assignedPlant: newPlantCode })
                setHasUnsavedChanges(false)
                flashMessage(`Successfully transferred to ${newRegion.regionName}`)
            } catch (error) {
                console.error('Region transfer failed:', error)
                throw error
            } finally {
                setIsSaving(false)
            }
        },
        [
            flashMessage,
            mixer,
            originalValues,
            setAssignedOperator,
            setAssignedPlant,
            setHasUnsavedChanges,
            setMessage,
            setMixer,
            setOriginalValues
        ]
    )

    const handleSave = useCallback(
        async (overrideValues = {}) => {
            if (!mixer?.id) {
                alert('Error: Cannot save mixer with undefined ID')
                return
            }
            if (!hasUnsavedChanges && !hasMaterialOverrides(overrideValues)) return

            setIsSaving(true)
            try {
                const userId = await fetchCurrentUserId()
                const { assignedOperatorValue: rawOperator, statusValue: rawStatus } = resolveSaveInputs({
                    formState: editState,
                    overrideValues
                })

                if (rawStatus === 'In Shop' && originalValues.status !== 'In Shop') {
                    const hasIssues = await hasOpenMaintenanceIssues(mixer.id)
                    if (!hasIssues) {
                        setIsSaving(false)
                        flashMessage(
                            'Cannot change status to "In Shop" without having at least one open issue. Please add an issue first.',
                            5000
                        )
                        return
                    }
                }

                const { nextOperator, nextStatus } = reconcileOperatorAndStatus({
                    assignedOperatorValue: rawOperator,
                    originalStatus: originalValues.status,
                    statusValue: rawStatus
                })
                const mixerForHistory = buildHistoryMixer(mixer, overrideValues)
                const shopStatusForSave = resolveShopStatusForSave(nextStatus, overrideValues, shopStatus)
                const updatedMixer = buildUpdatedMixerPayload({
                    assignedOperatorValue: nextOperator,
                    formState: editState,
                    mixer,
                    overrideValues,
                    shopStatusForSave,
                    statusValue: nextStatus,
                    userId
                })

                await persistMixerUpdate({ mixerForHistory, updatedMixer, userId })
                setMixer(updatedMixer)
                if (!overrideValues.silent) {
                    flashMessage('Changes saved successfully! Mixer needs verification.', 5000)
                }
                setOriginalValues(buildOriginalValues(updatedMixer))
                setHasUnsavedChanges(false)
            } catch (error) {
                alert(`Error saving changes: ${formatSaveError(error)}`)
            } finally {
                setIsSaving(false)
            }
        },
        [
            editState,
            flashMessage,
            hasUnsavedChanges,
            mixer,
            originalValues,
            setHasUnsavedChanges,
            setMixer,
            setOriginalValues,
            shopStatus
        ]
    )

    const handleDelete = useCallback(async () => {
        if (!mixer) return
        try {
            await MixerService.deleteMixer(mixer.id)
            alert('Mixer deleted successfully')
            onClose()
        } catch {
            alert('Error deleting mixer')
        } finally {
            setShowDeleteConfirmation(false)
        }
    }, [mixer, onClose, setShowDeleteConfirmation])

    const handleVerifyMixer = useCallback(() => {
        if (status === 'Retired') {
            flashMessage('Cannot verify: Retired mixers cannot be verified.', 4000)
            return
        }
        const missing = []
        if (!mixer.vin || !ValidationUtility.isVIN(mixer.vin)) missing.push('VIN')
        if (!mixer.make) missing.push('Make')
        if (!mixer.model) missing.push('Model')
        if (!mixer.year) missing.push('Year')
        setMissingFields(missing)
        setShowMissingFieldsModal(true)
    }, [flashMessage, mixer, setMissingFields, setShowMissingFieldsModal, status])

    const handleSaveMissingFields = useCallback(async () => {
        try {
            const requirements = computeVerificationRequirements({ hours, make, mixer, model, vin, year })
            if (!requirements.allOk) {
                flashMessage(requirements.errorMessage, 4000)
                return
            }
            const overrides = buildVerificationOverrides({
                hours,
                lastChipDate,
                lastServiceDate,
                make,
                mixer,
                model,
                vin,
                year
            })
            await handleSave(overrides)
            if (
                status === 'Active' &&
                (!assignedOperator || assignedOperator === '0' || getOperatorName(assignedOperator) === 'Unknown')
            ) {
                flashMessage('Cannot verify: Assigned operator is missing or invalid.', 4000)
                return
            }
            if (hasUnsavedChanges) {
                await handleSave().catch(() => {
                    alert('Failed to save your changes before verification. Please try saving manually first.')
                    throw new Error('Failed to save changes before verification')
                })
            }
            const userId = await fetchCurrentUserId()
            const verified = await MixerService.verifyMixer(mixer.id, userId)
            setMixer(verified)
            flashMessage('Mixer verified successfully!')
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
        } catch {
            alert('Failed to save missing fields. Please try again.')
        }
    }, [
        assignedOperator,
        flashMessage,
        getOperatorName,
        handleSave,
        hasUnsavedChanges,
        hours,
        lastChipDate,
        lastServiceDate,
        make,
        mixer,
        model,
        setHasUnsavedChanges,
        setMissingFields,
        setMixer,
        setShowMissingFieldsModal,
        setUpdatedByEmail,
        status,
        vin,
        year
    ])

    const handleBackClick = useCallback(async () => {
        if (hasUnsavedChanges) await handleSave()
        onClose()
    }, [handleSave, hasUnsavedChanges, onClose])

    const handleOperatorAssign = useCallback(
        async (operatorId) => {
            const newOperator = operatorId === '0' ? '' : operatorId
            const newStatus = newOperator ? 'Active' : status
            setShowOperatorModal(false)
            if (!newOperator) return
            try {
                await handleSave({ assignedOperator: newOperator, status: newStatus })
                setAssignedOperator(newOperator)
                setStatus(newStatus)
                setLastUnassignedOperatorId(null)
                await refreshAfterAssignmentChange()
                flashMessage('Operator assigned and status set to Active')
                setHasUnsavedChanges(false)
            } catch {
                flashMessage('Error assigning operator. Please try again.')
            }
        },
        [
            flashMessage,
            handleSave,
            refreshAfterAssignmentChange,
            setAssignedOperator,
            setHasUnsavedChanges,
            setLastUnassignedOperatorId,
            setShowOperatorModal,
            setStatus,
            status
        ]
    )

    const handleOperatorUnassign = useCallback(async () => {
        try {
            const prevOperator = assignedOperator
            await handleSave({ assignedOperator: null, prevAssignedOperator: prevOperator, status: 'Spare' })
            setAssignedOperator(null)
            setStatus('Spare')
            setLastUnassignedOperatorId(prevOperator)
            await refreshAfterAssignmentChange()
            flashMessage('Operator unassigned and status set to Spare')
            if (showOperatorModal) {
                setShowOperatorModal(false)
                setTimeout(() => setShowOperatorModal(true), 0)
            }
        } catch {
            flashMessage('Error unassigning operator. Please try again.')
        }
    }, [
        assignedOperator,
        flashMessage,
        handleSave,
        refreshAfterAssignmentChange,
        setAssignedOperator,
        setLastUnassignedOperatorId,
        setShowOperatorModal,
        setStatus,
        showOperatorModal
    ])

    const handleOperatorUndoUnassign = useCallback(async () => {
        try {
            await handleSave({ assignedOperator: lastUnassignedOperatorId, status: 'Active' })
            setAssignedOperator(lastUnassignedOperatorId)
            setStatus('Active')
            setLastUnassignedOperatorId(null)
            await refreshAfterAssignmentChange()
            flashMessage('Operator re-assigned and status set to Active')
        } catch {
            flashMessage('Error undoing unassign. Please try again.')
        }
    }, [
        flashMessage,
        handleSave,
        lastUnassignedOperatorId,
        refreshAfterAssignmentChange,
        setAssignedOperator,
        setLastUnassignedOperatorId,
        setStatus
    ])

    const handleStatusChange = useCallback(
        async (newStatus, fetchMixer) => {
            if (assignedOperator && originalValues.status === 'Active' && newStatus !== 'Active') {
                await handleSave({ assignedOperator: null, status: newStatus })
                setStatus(newStatus)
                setAssignedOperator(null)
                setLastUnassignedOperatorId(assignedOperator)
                flashMessage('Status changed and operator unassigned')
                await refreshOperators()
                await fetchOperatorsForModal()
                const updatedMixer = await fetchMixer()
                setMixer(updatedMixer)
                return
            }
            setStatus(newStatus)
        },
        [
            assignedOperator,
            fetchOperatorsForModal,
            flashMessage,
            handleSave,
            originalValues.status,
            refreshOperators,
            setAssignedOperator,
            setLastUnassignedOperatorId,
            setMixer,
            setStatus
        ]
    )

    return {
        getOperatorName,
        handleBackClick,
        handleDelete,
        handleOperatorAssign,
        handleOperatorUnassign,
        handleOperatorUndoUnassign,
        handleRegionTransfer,
        handleSave,
        handleSaveMissingFields,
        handleStatusChange,
        handleVerifyMixer,
        isSaving
    }
}
