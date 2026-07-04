import { MixerService } from '../../services/MixerService'
import { OperatorService } from '../../services/OperatorService'
import { UserService } from '../../services/UserService'
import { DateUtility } from '../../utils/DateUtility'
import { ValidationUtility } from '../../utils/ValidationUtility'

/** Keys allowed on `overrideValues` that should NOT count as edits. */
const SAVE_META_KEYS = ['silent', 'prevAssignedOperator']

export function hasMaterialOverrides(overrideValues) {
    return Object.keys(overrideValues || {}).filter((k) => !SAVE_META_KEYS.includes(k)).length > 0
}

/** Returns the merged value, preferring override if explicitly present. */
function pickOverride(overrideValues, key, fallback) {
    return Object.prototype.hasOwnProperty.call(overrideValues, key) ? overrideValues[key] : fallback
}

/**
 * Applies the business rules that reconcile (operator, status):
 *  - Moving from Active -> non-Active drops the assigned operator
 *  - Any assigned operator forces status back to Active
 *  - No operator + Active falls back to Spare
 */
export function reconcileOperatorAndStatus({ assignedOperatorValue, originalStatus, statusValue }) {
    let nextOperator = assignedOperatorValue
    let nextStatus = statusValue
    if (originalStatus === 'Active' && nextStatus !== 'Active' && nextOperator) nextOperator = null
    if (nextOperator && nextStatus !== 'Active') nextStatus = 'Active'
    if ((!nextOperator || nextOperator === '' || nextOperator === null) && nextStatus === 'Active') nextStatus = 'Spare'
    return { nextOperator, nextStatus }
}

export async function hasOpenMaintenanceIssues(mixerId) {
    const issues = await MixerService.fetchIssues(mixerId)
    return Array.isArray(issues) && issues.some((issue) => !issue?.time_completed)
}

function parsePositiveHours(raw) {
    if (raw === '' || raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : null
}

function clampCleanliness(raw) {
    if (!raw || isNaN(raw) || raw < 1) return 1
    return raw
}

/**
 * Builds the full updated mixer payload merging current form state, the
 * original mixer record, and any override fields the caller passed.
 */
export function buildUpdatedMixerPayload({
    assignedOperatorValue,
    formState,
    mixer,
    overrideValues,
    shopStatusForSave,
    statusValue,
    userId
}) {
    return {
        ...mixer,
        assignedOperator: assignedOperatorValue || null,
        assignedPlant: overrideValues.assignedPlant ?? formState.assignedPlant,
        cleanlinessRating: clampCleanliness(overrideValues.cleanlinessRating ?? formState.cleanlinessRating),
        hours: parsePositiveHours(overrideValues.hours ?? formState.hours),
        id: mixer.id,
        lastChipDate: DateUtility.toDbDate(overrideValues.lastChipDate ?? formState.lastChipDate),
        lastServiceDate: DateUtility.toDbDate(overrideValues.lastServiceDate ?? formState.lastServiceDate),
        make: overrideValues.make ?? formState.make,
        model: overrideValues.model ?? formState.model,
        shopStatus: shopStatusForSave,
        status: statusValue,
        truckNumber: overrideValues.truckNumber ?? formState.truckNumber,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
        updatedLast: mixer.updatedLast,
        vin: ((overrideValues.vin ?? formState.vin) || '').toUpperCase(),
        year: overrideValues.year ?? formState.year
    }
}

/** Returns the shop_status value to persist - only meaningful when "In Shop". */
export function resolveShopStatusForSave(statusValue, overrideValues, currentShopStatus) {
    if (statusValue !== 'In Shop') return null
    return overrideValues.shopStatus ?? currentShopStatus ?? 'in_shop'
}

/** Creates assigned_mixer history entries on each side of the assignment change. */
export async function recordAssignmentHistory({ mixerForHistory, updatedMixer, userId }) {
    if (mixerForHistory.assignedOperator === updatedMixer.assignedOperator) return
    if (mixerForHistory.assignedOperator) {
        await OperatorService.createHistoryEntry(
            mixerForHistory.assignedOperator,
            'assigned_mixer',
            updatedMixer.truckNumber,
            null,
            userId
        )
    }
    if (updatedMixer.assignedOperator) {
        await OperatorService.createHistoryEntry(
            updatedMixer.assignedOperator,
            'assigned_mixer',
            null,
            updatedMixer.truckNumber,
            userId
        )
    }
}

export function formatSaveError(error) {
    if (!error?.message || typeof error.message !== 'string') return 'Unknown error'
    if (error.message.includes('duplicate key') && error.message.includes('mixers_truck_number_key')) {
        return 'This truck number already exists. Please use a different truck number.'
    }
    return error.message
}

export async function fetchCurrentUserId() {
    const userObj = await UserService.getCurrentUser()
    return typeof userObj === 'object' && userObj !== null ? userObj.id : userObj
}

export function resolveSaveInputs({ formState, overrideValues }) {
    return {
        assignedOperatorValue: pickOverride(overrideValues, 'assignedOperator', formState.assignedOperator),
        statusValue: pickOverride(overrideValues, 'status', formState.status)
    }
}

export function buildHistoryMixer(mixer, overrideValues) {
    return {
        ...mixer,
        assignedOperator: pickOverride(overrideValues, 'prevAssignedOperator', mixer.assignedOperator)
    }
}

export function computeVerificationRequirements({ hours, make, mixer: _mixer, model, vin, year }) {
    const vinOk = ValidationUtility.isVIN(vin)
    const makeOk = !!String(make ?? '').trim()
    const modelOk = !!String(model ?? '').trim()
    const yearOk = !!String(year ?? '').trim()
    const hoursOk = isValidHoursValue(hours)
    const allOk = vinOk && makeOk && modelOk && yearOk && hoursOk
    let errorMessage = 'Please fill all required fields before verifying.'
    if (!vinOk) errorMessage = 'Invalid VIN. Please enter a valid 17-character VIN.'
    else if (!hoursOk) errorMessage = 'Please enter a valid engine hours reading (0 or greater).'
    return { allOk, errorMessage }
}

function isValidHoursValue(value) {
    const raw = String(value ?? '').trim()
    if (!raw) return false
    const num = Number(raw)
    return Number.isFinite(num) && num >= 0
}

/**
 * Returns the override map for verifying a mixer, including trimmed VIN/make/
 * model/year and any updated service/chip dates that differ from the persisted
 * values.
 */
export function buildVerificationOverrides({ hours, lastChipDate, lastServiceDate, make, mixer, model, vin, year }) {
    const overrides = { silent: true }
    if (vin && vin.trim()) overrides.vin = String(vin).trim().toUpperCase()
    if (make && make.trim()) overrides.make = String(make).trim()
    if (model && model.trim()) overrides.model = String(model).trim()
    if (year && year.trim()) overrides.year = String(year).trim()
    const trimmedHours = String(hours ?? '').trim()
    if (trimmedHours) {
        const parsedHours = Number(trimmedHours)
        if (Number.isFinite(parsedHours) && parsedHours >= 0 && parsedHours !== mixer.hours) {
            overrides.hours = parsedHours
        }
    }
    const existingService = mixer.lastServiceDate ? new Date(mixer.lastServiceDate) : null
    const existingChip = mixer.lastChipDate ? new Date(mixer.lastChipDate) : null
    const incomingService = lastServiceDate
        ? lastServiceDate instanceof Date
            ? lastServiceDate
            : new Date(lastServiceDate)
        : null
    const incomingChip = lastChipDate ? (lastChipDate instanceof Date ? lastChipDate : new Date(lastChipDate)) : null
    if (incomingService && (!existingService || existingService.getTime() !== incomingService.getTime())) {
        overrides.lastServiceDate = incomingService
    }
    if (incomingChip && (!existingChip || existingChip.getTime() !== incomingChip.getTime())) {
        overrides.lastChipDate = incomingChip
    }
    return overrides
}

export async function persistMixerUpdate({ mixerForHistory, updatedMixer, userId }) {
    await MixerService.updateMixer(updatedMixer.id, updatedMixer, undefined, mixerForHistory)
    await recordAssignmentHistory({ mixerForHistory, updatedMixer, userId })
}
