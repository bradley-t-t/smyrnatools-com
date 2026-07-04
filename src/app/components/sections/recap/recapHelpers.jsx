import React from 'react'

import { FIELD_NAME_ICONS, FIELD_NAME_LABELS, INACTIVE_STATUSES } from '../../../constants/recapConstants'

export const formatFieldName = (fieldName) => {
    if (!fieldName) return 'Unknown Field'
    return FIELD_NAME_LABELS[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export const formatValue = (value, fieldName, operatorNames) => {
    if (value === null || value === undefined || value === '' || value === 'null') return 'None'
    if (fieldName === 'assigned_operator') {
        if (value === '0') return 'None'
        const opData = operatorNames[value]
        if (opData) {
            const isTerminated = opData.status === 'Terminated'
            if (isTerminated) {
                return (
                    <span className="operator-terminated">
                        <span className="operator-name-strikethrough">{opData.name}</span>
                        <span className="terminated-badge">Terminated</span>
                    </span>
                )
            }
            return opData.name
        }
        return value
    }
    if (fieldName === 'cleanliness_rating' || fieldName === 'condition_rating') {
        const num = parseInt(value)
        if (!isNaN(num)) return `${num} Star${num !== 1 ? 's' : ''}`
    }
    if (fieldName === 'last_service_date' || fieldName === 'last_chip_date') {
        try {
            return new Date(value).toLocaleDateString()
        } catch {
            return value
        }
    }
    if (fieldName === 'down_in_yard' || fieldName === 'is_trainer' || fieldName === 'automatic_restriction') {
        return value === 'true' || value === true ? 'Yes' : 'No'
    }
    if (fieldName === 'rating') {
        const num = parseFloat(value)
        if (!isNaN(num)) return num.toFixed(1)
    }
    if (fieldName === 'pending_start_date') {
        try {
            return new Date(value).toLocaleDateString()
        } catch {
            return value
        }
    }
    return String(value)
}

export const formatDate = (dateStr) => {
    try {
        const date = new Date(dateStr)
        const now = new Date()
        const diff = now - date
        const mins = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)
        if (mins < 1) return 'Just now'
        if (mins < 60) return `${mins}m ago`
        if (hours < 24) return `${hours}h ago`
        if (days < 7) return `${days}d ago`
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            month: 'short'
        })
    } catch {
        return dateStr
    }
}

export const getChangeIcon = (fieldName) => FIELD_NAME_ICONS[fieldName] || 'fa-solid fa-pen'

export const isTerminatedGroup = (group) => {
    if (group.type !== 'operator') return false
    const status = (group.status || '').toLowerCase()
    if (status === 'terminated' || status === 'do not hire') return true
    return group.changes.some((c) => {
        if (c.field_name !== 'status') return false
        const val = (c.new_value || '').toLowerCase()
        return val === 'terminated' || val === 'do not hire'
    })
}

export { INACTIVE_STATUSES }
