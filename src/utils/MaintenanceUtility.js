/**
 * Maintenance form helpers: status badges, date formatting, frequency labels,
 * field-type icons, form response initialization/parsing (with image support),
 * checklist validation, and response data building for submission.
 */
export function getStatusBadgeClass(status) {
    switch (status) {
        case 'overdue':
            return 'status-badge-danger'
        case 'pending':
            return 'status-badge-warning'
        case 'completed':
            return 'status-badge-success'
        case 'submitted':
            return 'status-badge-info'
        case 'approved':
            return 'status-badge-success'
        case 'rejected':
            return 'status-badge-danger'
        default:
            return 'status-badge-neutral'
    }
}
export function formatMaintenanceDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}
export function formatMaintenanceDateShort(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        weekday: 'short'
    })
}
export function formatFrequency(frequency, value = 1) {
    const labels = {
        biweekly: 'Bi-weekly',
        daily: value === 1 ? 'Daily' : `Every ${value} days`,
        monthly: value === 1 ? 'Monthly' : `Every ${value} months`,
        quarterly: 'Quarterly',
        weekly: value === 1 ? 'Weekly' : `Every ${value} weeks`,
        yearly: value === 1 ? 'Yearly' : `Every ${value} years`
    }
    return labels[frequency] || frequency
}
export function getFieldTypeIcon(type) {
    switch (type) {
        case 'short_answer':
            return 'fa-font'
        case 'long_answer':
            return 'fa-align-left'
        case 'checklist':
            return 'fa-check-square'
        case 'notes':
            return 'fa-sticky-note'
        default:
            return 'fa-question'
    }
}
export function getFieldTypeName(type) {
    switch (type) {
        case 'short_answer':
            return 'Short Answer'
        case 'long_answer':
            return 'Long Answer'
        case 'checklist':
            return 'Checklist'
        case 'notes':
            return 'Notes'
        default:
            return type
    }
}
export function initializeFormResponses(fields) {
    const initialResponses = {}
    const initialChecklists = {}
    fields.forEach((field) => {
        if (field.field_type === 'checklist' && field.options?.items) {
            initialChecklists[field.id] = field.options.items.reduce((acc, item) => {
                acc[item] = false
                return acc
            }, {})
        } else {
            initialResponses[field.id] = ''
        }
    })
    return { checklists: initialChecklists, responses: initialResponses }
}
export function parseSubmissionResponses(submissionResponses) {
    const responses = {}
    const checklists = {}
    const comments = {}
    if (!submissionResponses || submissionResponses.length === 0) {
        return { checklists, comments, responses }
    }
    submissionResponses.forEach((resp) => {
        if (resp.checklist_values) {
            checklists[resp.field_id] = resp.checklist_values
        } else {
            responses[resp.field_id] = resp.response_value || ''
        }
        if (resp.checklist_comments) {
            comments[resp.field_id] = resp.checklist_comments
        }
    })
    return { checklists, comments, responses }
}
function safeParseJson(value) {
    return typeof value === 'string' ? JSON.parse(value) : value
}
export function parseSubmissionResponsesWithImages(submissionResponses) {
    const responses = {}
    const checklists = {}
    const comments = {}
    const images = {}
    if (!submissionResponses?.length) {
        return { checklists, comments, images, responses }
    }
    submissionResponses.forEach((resp) => {
        const fieldId = String(resp.field_id)
        if (resp.checklist_values) {
            checklists[fieldId] = safeParseJson(resp.checklist_values)
        } else {
            responses[fieldId] = resp.response_value || ''
        }
        if (resp.checklist_comments) {
            comments[fieldId] = safeParseJson(resp.checklist_comments)
        }
        if (resp.image_url) {
            images[fieldId] = { uploaded: true, uploadedUrl: resp.image_url }
        }
        if (resp.checklist_images) {
            const checkImages = safeParseJson(resp.checklist_images)
            if (checkImages && typeof checkImages === 'object') {
                Object.entries(checkImages).forEach(([checkItem, imgUrl]) => {
                    images[`${fieldId}_${checkItem.trim()}`] = { uploaded: true, uploadedUrl: imgUrl }
                })
            }
        }
    })
    return { checklists, comments, images, responses }
}
export function validateChecklistField(field, checkState, comments) {
    if (!field.is_required) return true
    const checkItems = field.options?.items || []
    return checkItems.every((item) => {
        const isChecked = checkState?.[item] === true
        const hasComment = comments?.[item] && comments[item].trim() !== ''
        return isChecked || hasComment
    })
}
export function validateRequiredField(field, value) {
    if (!field.is_required) return true
    return value && value.trim() !== ''
}
export function buildResponseData(fields, responses, checklistStates, checklistComments, fieldImages = {}) {
    return fields.map((field) => {
        if (field.field_type === 'checklist') {
            const checklistImages = {}
            const checkItems = field.options?.items || []
            checkItems.forEach((checkItem) => {
                const imgData = fieldImages[`${field.id}_${checkItem}`]
                if (imgData?.uploadedUrl) {
                    checklistImages[checkItem] = imgData.uploadedUrl
                }
            })
            return {
                checklist_comments: checklistComments[field.id] || {},
                checklist_images: Object.keys(checklistImages).length > 0 ? checklistImages : null,
                checklist_values: checklistStates[field.id] || {},
                field_id: field.id
            }
        }
        return {
            field_id: field.id,
            image_url: fieldImages[field.id]?.uploadedUrl || null,
            response_value: responses[field.id] || ''
        }
    })
}
function hasUploadedImage(fieldImages, key) {
    return fieldImages[key]?.uploaded || fieldImages[key]?.uploadedUrl
}
export function validateFieldErrors(field, responses, checklistStates, checklistComments, fieldImages) {
    const errors = {}
    if (field.is_required) {
        if (field.field_type === 'checklist') {
            if (!validateChecklistField(field, checklistStates[field.id], checklistComments[field.id])) {
                errors[field.id] = 'Please complete all items or provide a comment for unchecked items'
            }
        } else if (!validateRequiredField(field, responses[field.id])) {
            errors[field.id] = 'This field is required'
        }
    }
    if (field.image_required) {
        if (field.field_type === 'checklist') {
            const checkState = checklistStates[field.id] || {}
            ;(field.options?.items || []).forEach((item) => {
                if (checkState[item] === true && !hasUploadedImage(fieldImages, `${field.id}_${item}`)) {
                    errors[`${field.id}_${item}_image`] = `Photo required for "${item}"`
                }
            })
        } else if (!hasUploadedImage(fieldImages, field.id)) {
            errors[`${field.id}_image`] = 'An image is required for this field'
        }
    }
    return errors
}
export function validateAllFieldErrors(fields, responses, checklistStates, checklistComments, fieldImages) {
    let allErrors = {}
    fields.forEach((field) => {
        allErrors = {
            ...allErrors,
            ...validateFieldErrors(field, responses, checklistStates, checklistComments, fieldImages)
        }
    })
    return allErrors
}
