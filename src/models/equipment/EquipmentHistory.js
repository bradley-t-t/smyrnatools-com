/** Equipment field-change history entry with snake_case API mapping. */
export class EquipmentHistory {
    constructor({ id, equipmentId, fieldName, oldValue, newValue, changedAt, changedBy }) {
        this.id = id
        this.equipmentId = equipmentId
        this.fieldName = fieldName
        this.oldValue = oldValue
        this.newValue = newValue
        this.changedAt = changedAt ? new Date(changedAt) : null
        this.changedBy = changedBy
    }
    static fromApiFormat(data) {
        return new EquipmentHistory({
            changedAt: data.changed_at,
            changedBy: data.changed_by,
            equipmentId: data.equipment_id,
            fieldName: data.field_name,
            id: data.id,
            newValue: data.new_value,
            oldValue: data.old_value
        })
    }
}
