import { useEffect, useState } from 'react'

import { Database } from '../../services/DatabaseService'
import { OperatorService } from '../../services/OperatorService'
import { PlantService } from '../../services/PlantService'
import { TractorService } from '../../services/TractorService'
import { UserService } from '../../services/UserService'
import { ValidationUtility } from '../../utils/ValidationUtility'
import { TRACTOR_STATUSES_FORCING_UNASSIGN } from '../constants/tractorDetailConstants'

/** Formats a Date (or parseable string) into the Postgres timestamptz literal saved by the service. */
function formatDateForSave(date) {
    if (!date) return null
    const parsedDate = date instanceof Date ? date : new Date(date)
    if (isNaN(parsedDate.getTime())) return null
    return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')} ${String(parsedDate.getHours()).padStart(2, '0')}:${String(parsedDate.getMinutes()).padStart(2, '0')}:${String(parsedDate.getSeconds()).padStart(2, '0')}+00`
}

/** Resolves a current user object (or id string) down to the user id. */
async function resolveCurrentUserId() {
    const userObj = await UserService.getCurrentUser()
    return typeof userObj === 'object' && userObj !== null ? userObj.id : userObj
}

/**
 * Encapsulates the tractor save/delete/verify/region-transfer side-effects so
 * the detail view component stays focused on rendering.
 */
export default function useTractorDetailActions(state, tractorId, onClose) {
    const {
        assignedOperator,
        assignedPlant,
        cleanlinessRating,
        freight,
        hasBlower,
        hasUnsavedChanges,
        hours,
        lastServiceDate,
        make,
        model,
        originalValues,
        setAssignedOperator,
        setAssignedPlant,
        setHasUnsavedChanges,
        setOriginalValues,
        setTractor,
        setUpdatedByEmail,
        setVin,
        setYear,
        status,
        tractor,
        truckNumber,
        vin,
        year
    } = state

    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false)
    const [missingFields, setMissingFields] = useState([])
    const [canEditTractor, setCanEditTractor] = useState(false)
    const [canDeleteTractor, setCanDeleteTractor] = useState(false)

    useEffect(() => {
        async function checkDeletePermission() {
            try {
                const currentUser = await UserService.getCurrentUser()
                const userId = currentUser?.id || currentUser
                if (!userId) return setCanDeleteTractor(false)
                setCanDeleteTractor(await UserService.hasPermission(userId, 'detailview.delete'))
            } catch {
                setCanDeleteTractor(false)
            }
        }
        checkDeletePermission()
    }, [])

    function flashMessage(text, durationMs = 3000) {
        setMessage(text)
        setTimeout(() => setMessage(''), durationMs)
    }

    async function handleRegionTransfer(newRegionCode, newPlantCode) {
        if (!tractor?.id || !newRegionCode || !newPlantCode) {
            throw new Error('Invalid tractor, region, or plant')
        }
        const newRegion = await PlantService.fetchRegionByCode(newRegionCode)
        if (!newRegion) throw new Error('Target region not found')
        setIsSaving(true)
        setMessage('')
        try {
            const userId = await resolveCurrentUserId()
            const updatedTractor = { ...tractor, assignedOperator: null, assignedPlant: newPlantCode }
            const result = await TractorService.updateTractor(tractor.id, updatedTractor, userId, tractor)
            setTractor(result)
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
    }

    async function handleSave(overrideValues = {}) {
        if (!tractor?.id) {
            alert('Error: Cannot save tractor with undefined ID')
            return
        }
        const relevantOverrideKeys = Object.keys(overrideValues || {}).filter(
            (k) => !['silent', 'prevAssignedOperator'].includes(k)
        )
        if (!hasUnsavedChanges && relevantOverrideKeys.length === 0) return

        setIsSaving(true)
        try {
            const userId = await resolveCurrentUserId()
            let assignedOperatorValue = Object.prototype.hasOwnProperty.call(overrideValues, 'assignedOperator')
                ? overrideValues.assignedOperator
                : assignedOperator
            let statusValue = Object.prototype.hasOwnProperty.call(overrideValues, 'status')
                ? overrideValues.status
                : status

            if (statusValue === 'In Shop' && originalValues.status !== 'In Shop') {
                const { data: openIssues } = await Database.from('tractors_maintenance')
                    .select('id')
                    .eq('tractor_id', tractor.id)
                    .is('time_completed', null)
                if (!openIssues || openIssues.length === 0) {
                    setIsSaving(false)
                    flashMessage(
                        'Cannot change status to "In Shop" without having at least one open issue. Please add an issue first.',
                        5000
                    )
                    return
                }
            }

            if (!assignedOperatorValue && statusValue === 'Active') statusValue = 'Spare'
            if (assignedOperatorValue && statusValue !== 'Active') statusValue = 'Active'
            if (TRACTOR_STATUSES_FORCING_UNASSIGN.includes(statusValue) && assignedOperatorValue) {
                assignedOperatorValue = null
            }

            const tractorForHistory = {
                ...tractor,
                assignedOperator: Object.prototype.hasOwnProperty.call(overrideValues, 'prevAssignedOperator')
                    ? overrideValues.prevAssignedOperator
                    : tractor.assignedOperator
            }

            let cleanlinessValue = overrideValues.cleanlinessRating ?? cleanlinessRating
            if (!cleanlinessValue || isNaN(cleanlinessValue) || cleanlinessValue < 1) cleanlinessValue = 1

            const parsedHours = (() => {
                const raw = overrideValues.hours ?? hours
                if (raw === '' || raw == null) return null
                const n = Number(raw)
                return Number.isFinite(n) && n >= 0 ? n : null
            })()

            const parsedYear = (() => {
                const y = overrideValues.year ?? year
                const n = Number(y)
                return Number.isFinite(n) && n > 0 ? n : null
            })()

            const updatedTractor = {
                ...tractor,
                assignedOperator: assignedOperatorValue || null,
                assignedPlant: overrideValues.assignedPlant ?? assignedPlant,
                cleanlinessRating: cleanlinessValue,
                freight: overrideValues.freight ?? freight,
                hasBlower: overrideValues.hasBlower ?? hasBlower,
                hours: parsedHours,
                id: tractor.id,
                lastServiceDate: formatDateForSave(overrideValues.lastServiceDate ?? lastServiceDate),
                make: overrideValues.make ?? make,
                model: overrideValues.model ?? model,
                status: statusValue,
                truckNumber: overrideValues.truckNumber ?? truckNumber,
                updatedAt: new Date().toISOString(),
                updatedBy: userId,
                updatedLast: tractor.updatedLast,
                vin: ((overrideValues.vin ?? vin) || '').toUpperCase(),
                year: parsedYear
            }

            await TractorService.updateTractor(updatedTractor.id, updatedTractor, undefined, tractorForHistory)

            if (tractorForHistory.assignedOperator !== updatedTractor.assignedOperator) {
                if (tractorForHistory.assignedOperator) {
                    await OperatorService.createHistoryEntry(
                        tractorForHistory.assignedOperator,
                        'assigned_tractor',
                        updatedTractor.truckNumber,
                        null,
                        userId
                    )
                }
                if (updatedTractor.assignedOperator) {
                    await OperatorService.createHistoryEntry(
                        updatedTractor.assignedOperator,
                        'assigned_tractor',
                        null,
                        updatedTractor.truckNumber,
                        userId
                    )
                }
            }

            const refreshedTractor = await TractorService.fetchTractorById(tractor.id)
            setTractor(refreshedTractor)
            if (!overrideValues.silent) {
                flashMessage('Changes saved successfully! Tractor needs verification.', 5000)
            }
            setOriginalValues({
                assignedOperator: refreshedTractor.assignedOperator,
                assignedPlant: refreshedTractor.assignedPlant,
                cleanlinessRating: refreshedTractor.cleanlinessRating,
                freight: refreshedTractor.freight || '',
                hasBlower: refreshedTractor.hasBlower,
                hours: refreshedTractor.hours != null ? String(refreshedTractor.hours) : '',
                lastServiceDate: refreshedTractor.lastServiceDate ? new Date(refreshedTractor.lastServiceDate) : null,
                make: refreshedTractor.make,
                model: refreshedTractor.model,
                status: refreshedTractor.status,
                truckNumber: refreshedTractor.truckNumber,
                vin: (refreshedTractor.vin || '').toUpperCase(),
                year: String(refreshedTractor.year || '')
            })
            setVin((refreshedTractor.vin || '').toUpperCase())
            setYear(String(refreshedTractor.year || ''))
            setHasUnsavedChanges(false)
        } catch (error) {
            let errorMessage = 'Unknown error'
            if (error.message && typeof error.message === 'string') {
                errorMessage =
                    error.message.includes('duplicate key') && error.message.includes('tractors_truck_number_key')
                        ? 'This truck number already exists. Please use a different truck number.'
                        : error.message
            }
            alert(`Error saving changes: ${errorMessage}`)
        } finally {
            setIsSaving(false)
        }
    }

    async function handleDelete() {
        if (!tractor) return
        if (!showDeleteConfirmation) return setShowDeleteConfirmation(true)
        try {
            await TractorService.deleteTractor(tractor.id)
            alert('Tractor deleted successfully')
            onClose()
        } catch {
            alert('Error deleting tractor')
        } finally {
            setShowDeleteConfirmation(false)
        }
    }

    async function handleVerifyTractor() {
        if (status === 'Retired') {
            flashMessage('Cannot verify: Retired tractors cannot be verified.', 4000)
            return
        }
        const missing = []
        if (!tractor.vin || !ValidationUtility.isVIN(tractor.vin)) missing.push('VIN')
        if (!tractor.make) missing.push('Make')
        if (!tractor.model) missing.push('Model')
        if (!tractor.year) missing.push('Year')
        setMissingFields(missing)
        setShowMissingFieldsModal(true)
    }

    async function handleSaveMissingFields() {
        const vinOk = ValidationUtility.isVIN(vin)
        const makeOk = !!String(make ?? '').trim()
        const modelOk = !!String(model ?? '').trim()
        const yearOk = !!String(year ?? '').trim()
        const trimmedHours = String(hours ?? '').trim()
        const parsedHours = Number(trimmedHours)
        const hoursOk = trimmedHours !== '' && Number.isFinite(parsedHours) && parsedHours >= 0
        if (!(vinOk && makeOk && modelOk && yearOk && hoursOk)) {
            const errorMessage = !vinOk
                ? 'Invalid VIN. Please enter a valid 17-character VIN.'
                : !hoursOk
                  ? 'Please enter a valid engine hours reading (0 or greater).'
                  : 'Please fill all required fields before verifying.'
            flashMessage(errorMessage, 4000)
            return
        }
        const overrides = { silent: true }
        if (vin && vin.trim()) overrides.vin = String(vin).trim().toUpperCase()
        if (make && String(make).trim()) overrides.make = String(make).trim()
        if (model && String(model).trim()) overrides.model = String(model).trim()
        if (year && String(year).trim()) overrides.year = String(year).trim()
        if (parsedHours !== tractor.hours) overrides.hours = parsedHours
        const parseDate = (d) => (d ? new Date(d) : null)
        const existingService = parseDate(tractor.lastServiceDate)
        const incomingService = lastServiceDate
            ? lastServiceDate instanceof Date
                ? lastServiceDate
                : new Date(lastServiceDate)
            : null
        if (incomingService && (!existingService || existingService.getTime() !== incomingService.getTime())) {
            overrides.lastServiceDate = incomingService
        }
        await handleSave(overrides)
        const refreshed = await TractorService.fetchTractorById(tractorId)
        setTractor(refreshed)
        setVin((refreshed.vin || '').toUpperCase())
        setYear(String(refreshed.year || ''))
        if (hasUnsavedChanges) {
            await handleSave().catch(() => {
                alert('Failed to save your changes before verification. Please try saving manually first.')
                throw new Error('Failed to save changes before verification')
            })
        }
        const userId = await resolveCurrentUserId()
        const updated = await TractorService.verifyTractor(tractor.id, userId)
        if (updated) {
            setTractor(updated)
            flashMessage('Tractor verified successfully!')
            if (updated.updatedBy) {
                try {
                    const userName = await UserService.getUserDisplayName(updated.updatedBy)
                    setUpdatedByEmail(userName)
                } catch {
                    setUpdatedByEmail('Unknown User')
                }
            }
        }
        setHasUnsavedChanges(false)
        setShowMissingFieldsModal(false)
    }

    async function handleBackClick() {
        if (hasUnsavedChanges) await handleSave()
        onClose()
    }

    function getOperatorName(operatorId, operators) {
        if (!operatorId || operatorId === '0') return 'None'
        const operator = operators.find((op) => op.employeeId === operatorId)
        return operator ? (operator.position ? `${operator.name} (${operator.position})` : operator.name) : 'Unknown'
    }

    return {
        canDeleteTractor,
        canEditTractor,
        flashMessage,
        getOperatorName,
        handleBackClick,
        handleDelete,
        handleRegionTransfer,
        handleSave,
        handleSaveMissingFields,
        handleVerifyTractor,
        isSaving,
        message,
        missingFields,
        setCanEditTractor,
        setMessage,
        setShowDeleteConfirmation,
        setShowMissingFieldsModal,
        showDeleteConfirmation,
        showMissingFieldsModal
    }
}
