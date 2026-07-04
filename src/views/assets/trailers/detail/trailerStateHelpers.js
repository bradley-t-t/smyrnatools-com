import Trailer from '../../../../app/models/trailers/Trailer'
import { Database } from '../../../../services/DatabaseService'
import { TrailerService } from '../../../../services/TrailerService'
import { UserService } from '../../../../services/UserService'
import { getPlantName, getTractorName } from './trailerDetailHelpers'

const VALID_TRAILER_TYPES = ['Cement', 'End Dump']

/**
 * Reset-style snapshot of the user-editable trailer fields, used by the
 * detail view's "originalValues" tracking and applied after any successful
 * save / re-fetch.
 */
export function buildOriginalValuesFromTrailer(updatedTrailer) {
    return {
        assignedPlant: updatedTrailer.assignedPlant,
        assignedTractor: updatedTrailer.assignedTractor,
        cleanlinessRating: updatedTrailer.cleanlinessRating,
        status: updatedTrailer.status,
        trailerNumber: updatedTrailer.trailerNumber,
        trailerType: updatedTrailer.trailerType
    }
}

/**
 * Pushes a freshly-fetched trailer record into every individual field setter
 * that backs the detail-view form. Centralizes the repeated state-sync block.
 */
export function applyTrailerToFormState(updatedTrailer, setters) {
    setters.setTrailer(updatedTrailer)
    setters.setTrailerNumber(updatedTrailer.trailerNumber || '')
    setters.setAssignedPlant(updatedTrailer.assignedPlant || '')
    setters.setTrailerType(updatedTrailer.trailerType || '')
    setters.setCleanlinessRating(updatedTrailer.cleanlinessRating || 0)
    setters.setStatus(updatedTrailer.status || '')
    setters.setOriginalValues(buildOriginalValuesFromTrailer(updatedTrailer))
}

/**
 * Resolves the override-or-current value for a save call. Used in lieu of the
 * verbose `Object.prototype.hasOwnProperty.call(overrideValues, key) ? ... : ...`
 * triplets in the original handleSave.
 */
function pickOverride(overrideValues, key, fallback) {
    return Object.prototype.hasOwnProperty.call(overrideValues, key) ? overrideValues[key] : fallback
}

/**
 * Computes the effective status for a save, honoring the override map and the
 * business rules: "Active without tractor" downgrades to Spare, assigning a
 * tractor promotes to Active, but an explicit override always wins.
 */
function resolveStatusForSave(overrideValues, currentStatus, currentAssignedTractor) {
    let statusValue = pickOverride(overrideValues, 'status', currentStatus)
    const assignedTractorValue = pickOverride(overrideValues, 'assignedTractor', currentAssignedTractor)
    if (
        (!assignedTractorValue || assignedTractorValue === '' || assignedTractorValue === null) &&
        statusValue === 'Active'
    ) {
        statusValue = 'Spare'
    }
    if (assignedTractorValue && statusValue !== 'Active') {
        statusValue = 'Active'
    }
    if (Object.prototype.hasOwnProperty.call(overrideValues, 'status')) {
        statusValue = overrideValues.status
    }
    return statusValue
}

/**
 * Verifies that a status change to "In Shop" is allowed (at least one open
 * maintenance issue). Returns true when transition is permitted.
 */
async function canTransitionToInShop(trailer, originalStatus, nextStatus) {
    if (nextStatus !== 'In Shop' || originalStatus === 'In Shop') return true
    const { data: openIssues } = await Database.from('trailers_maintenance')
        .select('id')
        .eq('trailer_id', trailer.id)
        .is('time_completed', null)
    return Array.isArray(openIssues) && openIssues.length > 0
}

/**
 * Save handler core. Performs validation, persists via TrailerService, and
 * applies the result to form state through the provided setter bag.
 */
export async function saveTrailerWithOverrides({ trailer, current, overrideValues, setters, deps }) {
    if (!trailer?.id) {
        alert('Error: Cannot save trailer with undefined ID')
        return
    }
    deps.setIsSaving(true)
    try {
        const userObj = await UserService.getCurrentUser()
        const userId = typeof userObj === 'object' && userObj !== null ? userObj.id : userObj
        const assignedTractorValue = pickOverride(overrideValues, 'assignedTractor', current.assignedTractor)
        let trailerTypeValue = pickOverride(overrideValues, 'trailerType', current.trailerType)
        let statusValue = resolveStatusForSave(overrideValues, current.status, current.assignedTractor)
        const allowed = await canTransitionToInShop(trailer, current.originalStatus, statusValue)
        if (!allowed) {
            deps.setIsSaving(false)
            deps.setMessage(
                'Cannot change status to "In Shop" without having at least one open issue. Please add an issue first.'
            )
            setTimeout(() => deps.setMessage(''), 5000)
            return
        }
        if (!VALID_TRAILER_TYPES.includes(trailerTypeValue)) {
            trailerTypeValue = 'Cement'
        }
        const trailerForHistory = {
            ...trailer,
            assignedTractor: pickOverride(overrideValues, 'prevAssignedTractor', trailer.assignedTractor)
        }
        let cleanlinessValue = overrideValues.cleanlinessRating ?? current.cleanlinessRating
        if (!cleanlinessValue || isNaN(cleanlinessValue) || cleanlinessValue < 1) cleanlinessValue = 1
        const updatedTrailer = new Trailer({
            assigned_plant: overrideValues.assignedPlant ?? current.assignedPlant,
            assigned_tractor: assignedTractorValue || null,
            cleanliness_rating: cleanlinessValue,
            created_at: trailer.createdAt,
            id: trailer.id,
            status: statusValue,
            trailer_number: overrideValues.trailerNumber ?? current.trailerNumber,
            trailer_type: trailerTypeValue,
            updated_at: new Date().toISOString(),
            updated_by: userId,
            updated_last: trailer.updatedLast
        })
        await TrailerService.updateTrailer(updatedTrailer.id, updatedTrailer, userId, trailerForHistory)
        setters.setTrailer(updatedTrailer)
        setters.setTrailerNumber(updatedTrailer.trailerNumber || '')
        setters.setAssignedPlant(updatedTrailer.assignedPlant || '')
        setters.setTrailerType(updatedTrailer.trailerType || '')
        setters.setAssignedTractor(updatedTrailer.assignedTractor || '')
        setters.setCleanlinessRating(updatedTrailer.cleanlinessRating || 0)
        setters.setStatus(updatedTrailer.status || '')
        deps.setMessage('Changes saved successfully!')
        setTimeout(() => deps.setMessage(''), 5000)
        setters.setOriginalValues(buildOriginalValuesFromTrailer(updatedTrailer))
        deps.setHasUnsavedChanges(false)
    } catch (error) {
        let errorMessage = 'Unknown error'
        if (error.message && typeof error.message === 'string') {
            if (error.message.includes('duplicate key') && error.message.includes('trailers_trailer_number_key')) {
                errorMessage = `This trailer number already exists. Please use a different trailer number.`
            } else {
                errorMessage = error.message
            }
        }
        alert(`Error saving changes: ${errorMessage}`)
    } finally {
        deps.setIsSaving(false)
    }
}

/**
 * Builds a mailto: payload summarizing the trailer + comments + open issues.
 * Unused by the current UI; preserved for parity with the original file.
 */
export function buildTrailerExportEmail(trailer, plants, tractors, comments, issues) {
    if (!trailer) return null
    const hasComments = comments && comments.length > 0
    const openIssues = (issues || []).filter((issue) => !issue.time_completed)
    const summary = `Trailer Summary for Trailer #${trailer.trailerNumber || ''}
Basic Information
Trailer Number: ${trailer.trailerNumber || ''}
Assigned Plant: ${getPlantName(trailer.assignedPlant, plants)}
Trailer Type: ${trailer.trailerType || ''}
Assigned Tractor: ${getTractorName(trailer.assignedTractor, tractors)}
Cleanliness Rating: ${trailer.cleanlinessRating || 'N/A'}
Comments
${
    hasComments
        ? comments
              .map(
                  (c) =>
                      `- ${c.author || 'Unknown'}: ${c.comment || c.text} (${new Date(c.created_at || c.createdAt).toLocaleString()})`
              )
              .join('\n')
        : 'No comments.'
}
Issues (${openIssues.length})
${
    openIssues.length > 0
        ? openIssues
              .map(
                  (i) =>
                      `- ${i.issue || i.title || i.description || ''} (${new Date(i.time_created || i.created_at).toLocaleString()})`
              )
              .join('\n')
        : 'No open issues.'
}
`
    return {
        body: encodeURIComponent(summary),
        subject: encodeURIComponent(`Trailer Summary for Trailer #${trailer.trailerNumber || ''}`)
    }
}
