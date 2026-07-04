import { createAssetHistory } from '../history/createAssetHistory'

/** Equipment field-change history entry with snake_case API mapping. */
export const EquipmentHistory = createAssetHistory({
    foreignKey: 'equipmentId',
    foreignKeyColumn: 'equipment_id'
})
