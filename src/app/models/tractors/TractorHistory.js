import HistoryDisplayUtility from '../../../utils/HistoryDisplayUtility'

/**
 * Tractor field-change history entry. Strips time components from service date fields
 * during deserialization for cleaner display.
 */
export class TractorHistory {
    constructor(data = {}) {
        this.id = data.id ?? null
        this.tractorId = data.tractor_id ?? ''
        this.fieldName = data.field_name ?? ''
        this.oldValue = data.old_value ?? ''
        this.newValue = data.new_value ?? ''
        this.changedAt = data.changed_at ?? ''
        this.changedBy = data.changed_by ?? ''
    }
    static fromApiFormat(data) {
        if (!data) return null
        let oldValue = data.old_value
        let newValue = data.new_value
        if (['last_service_date'].includes(data.field_name)) {
            try {
                if (oldValue?.includes('T')) oldValue = oldValue.split('T')[0]
                if (newValue?.includes('T')) newValue = newValue.split('T')[0]
            } catch (error) {
                console.error('Error formatting date in history:', error)
            }
        }
        return new TractorHistory({
            changed_at: data.changed_at,
            changed_by: data.changed_by,
            field_name: data.field_name,
            id: data.id,
            new_value: newValue,
            old_value: oldValue,
            tractor_id: data.tractor_id
        })
    }
    toApiFormat() {
        return {
            changed_at: this.changedAt,
            changed_by: this.changedBy,
            field_name: this.fieldName,
            id: this.id,
            new_value: this.newValue,
            old_value: this.oldValue,
            tractor_id: this.tractorId
        }
    }
    getFormattedOldValue() {
        return TractorHistoryUtils.formatValueForDisplay(this.fieldName, this.oldValue)
    }
    getFormattedNewValue() {
        return TractorHistoryUtils.formatValueForDisplay(this.fieldName, this.newValue)
    }
}
/**
 * Display formatting helpers for tractor history values.
 * Delegates shared logic to HistoryDisplayUtility; handles tractor-specific blower formatting.
 */
export class TractorHistoryUtils {
    static formatValueForDisplay(fieldName, value) {
        if (!value) return ''
        if (['last_service_date'].includes(fieldName)) {
            const formatted = HistoryDisplayUtility.formatDateValue(value)
            if (formatted) return formatted
        }
        if (fieldName === 'cleanliness_rating') {
            const formatted = HistoryDisplayUtility.formatCleanlinessRating(value)
            if (formatted) return formatted
        }
        if (['assigned_operator', 'assigned_plant'].includes(fieldName)) {
            const formatted = HistoryDisplayUtility.formatAssignmentValue(value)
            if (formatted) return formatted
        }
        if (fieldName === 'status' && value === '0') return 'None'
        if (fieldName === 'has_blower') {
            return value ? 'Yes' : 'No'
        }
        return value
    }
    static areSameDates(date1, date2) {
        return HistoryDisplayUtility.areSameDates(date1, date2)
    }
}
