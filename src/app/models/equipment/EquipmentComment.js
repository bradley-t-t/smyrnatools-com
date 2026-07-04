import { createAssetComment } from '../comment/createAssetComment'

/** Equipment comment record with snake_case API mapping. */
export const EquipmentComment = createAssetComment({
    foreignKey: 'equipmentId',
    foreignKeyColumn: 'equipment_id'
})
