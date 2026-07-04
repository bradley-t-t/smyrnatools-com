import { Equipment } from '../app/models/equipment/Equipment'
import { EquipmentComment } from '../app/models/equipment/EquipmentComment'
import { EquipmentHistory } from '../app/models/equipment/EquipmentHistory'
import VerifiedUtility from '../utils/VerifiedUtility'
import { createAssetService } from './BaseAssetService'

/** Attaches a lazy isVerified() method using current row state. */
function attachIsVerified(equipment) {
    if (!equipment) return equipment
    if (typeof equipment.isVerified !== 'function') {
        equipment.isVerified = function () {
            return VerifiedUtility.isVerified(this.updatedLast, this.updatedAt, this.updatedBy)
        }
    }
    return equipment
}

const base = createAssetService({
    commentModelFn: EquipmentComment.fromRow,
    commentsTable: 'heavy_equipment_comments',
    enrichFn: attachIsVerified,
    entityIdParam: 'equipmentId',
    entityKey: 'equipment',
    entityName: 'Equipment',
    historyTable: 'heavy_equipment_history',
    idColumn: 'equipment_id',
    issuesTable: 'heavy_equipment_maintenance',
    parseHistoryRow: EquipmentHistory.fromApiFormat,
    parseRow: (row) => (row ? new Equipment(row) : null),
    servicePrefix: '/equipment-service'
})

/** Heavy equipment CRUD, history, comments, issues, and verification service. */
export const EquipmentService = {
    ...base,
    createEquipment(equipment, userId) {
        return base._base.create(equipment, userId)
    },
    deleteEquipment(id) {
        return base._base.delete(id)
    },
    fetchEquipmentById(id) {
        return base._base.fetchById(id)
    },
    fetchEquipmentsWithDetails(regionCodes = null) {
        return base._base.fetchWithDetails(regionCodes)
    },
    getAllEquipments() {
        return base._base.getAll()
    },
    /** Fetches change history for equipment. Invoked dynamically via
     *  HISTORY_SERVICE_MAP in useHistoryDataFetchers. */
    getEquipmentHistory(equipmentId, limit = null) {
        return base._base.getHistory(equipmentId, limit)
    },
    updateEquipment(equipmentId, equipment, userId) {
        return base._base.update(equipmentId, equipment, userId)
    },
    verifyEquipment(equipmentId, userId) {
        return base._base.verify(equipmentId, userId)
    }
}
