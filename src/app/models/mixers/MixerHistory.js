import HistoryDisplayUtility from '../../../utils/HistoryDisplayUtility'

/**
 * Mixer field-change history entry. Strips time components from date fields
 * during deserialization for cleaner display.
 */
export class MixerHistory {
    constructor(data = {}) {
        this.id = data.id ?? null
        this.mixerId = data.mixer_id ?? ''
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
        if (['last_service_date', 'last_chip_date'].includes(data.field_name)) {
            try {
                if (oldValue?.includes('T')) oldValue = oldValue.split('T')[0]
                if (newValue?.includes('T')) newValue = newValue.split('T')[0]
            } catch (error) {
                console.error('Failed to strip time from mixer history date field:', error)
            }
        }
        return new MixerHistory({
            changed_at: data.changed_at,
            changed_by: data.changed_by,
            field_name: data.field_name,
            id: data.id,
            mixer_id: data.mixer_id,
            new_value: newValue,
            old_value: oldValue
        })
    }
    toApiFormat() {
        return {
            changed_at: this.changedAt,
            changed_by: this.changedBy,
            field_name: this.fieldName,
            id: this.id,
            mixer_id: this.mixerId,
            new_value: this.newValue,
            old_value: this.oldValue
        }
    }
    getFormattedOldValue() {
        return MixerHistoryUtils.formatValueForDisplay(this.fieldName, this.oldValue)
    }
    getFormattedNewValue() {
        return MixerHistoryUtils.formatValueForDisplay(this.fieldName, this.newValue)
    }
}
/**
 * Display formatting helpers for mixer history values.
 * Delegates shared logic to HistoryDisplayUtility; handles mixer-specific date fields.
 */
export class MixerHistoryUtils {
    static formatValueForDisplay(fieldName, value) {
        if (!value) return ''
        if (['last_service_date', 'last_chip_date'].includes(fieldName)) {
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
        return value
    }
    static areSameDates(date1, date2) {
        return HistoryDisplayUtility.areSameDates(date1, date2)
    }
}
