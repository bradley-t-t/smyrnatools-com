export class OperatorHistory {
    constructor(data = {}) {
        this.id = data.id ?? null
        this.operatorId = data.operator_id ?? ''
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

        return new OperatorHistory({
            changed_at: data.changed_at,
            changed_by: data.changed_by,
            field_name: data.field_name,
            id: data.id,
            new_value: newValue,
            old_value: oldValue,
            operator_id: data.operator_id
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
            operator_id: this.operatorId
        }
    }

    getFormattedOldValue() {
        return OperatorHistoryUtils.formatValueForDisplay(this.fieldName, this.oldValue)
    }

    getFormattedNewValue() {
        return OperatorHistoryUtils.formatValueForDisplay(this.fieldName, this.newValue)
    }
}

export class OperatorHistoryUtils {
    static formatValueForDisplay(fieldName, value) {
        if (!value) return ''

        if (['hire_date', 'termination_date'].includes(fieldName)) {
            try {
                const date = new Date(value)
                if (!isNaN(date.getTime())) return date.toLocaleDateString()
            } catch (error) {}
        }

        if (fieldName === 'status') {
            if (value === 'active') return 'Active'
            if (value === 'inactive') return 'Inactive'
        }

        return value
    }

    static areSameDates(date1, date2) {
        if (!date1 && !date2) return true
        if (!date1 || !date2) return false

        try {
            return new Date(date1).toISOString().split('T')[0] === new Date(date2).toISOString().split('T')[0]
        } catch {
            return false
        }
    }
}
