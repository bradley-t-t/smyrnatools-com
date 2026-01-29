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
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

export function formatMaintenanceDateShort(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    })
}

export function formatFrequency(frequency, value = 1) {
    const labels = {
        daily: value === 1 ? 'Daily' : `Every ${value} days`,
        weekly: value === 1 ? 'Weekly' : `Every ${value} weeks`,
        biweekly: 'Bi-weekly',
        monthly: value === 1 ? 'Monthly' : `Every ${value} months`,
        quarterly: 'Quarterly',
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

    return { responses: initialResponses, checklists: initialChecklists }
}

export function parseSubmissionResponses(submissionResponses) {
    const responses = {}
    const checklists = {}
    const comments = {}

    if (!submissionResponses || submissionResponses.length === 0) {
        return { responses, checklists, comments }
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

    return { responses, checklists, comments }
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

export function buildResponseData(fields, responses, checklistStates, checklistComments) {
    return fields.map((field) => {
        if (field.field_type === 'checklist') {
            return {
                field_id: field.id,
                checklist_values: checklistStates[field.id] || {},
                checklist_comments: checklistComments[field.id] || {}
            }
        }
        return {
            field_id: field.id,
            response_value: responses[field.id] || ''
        }
    })
}
