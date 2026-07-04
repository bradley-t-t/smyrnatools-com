import PickupTruck from '../app/models/pickup-trucks/PickupTruck'
import { PickupTruckComment } from '../app/models/pickup-trucks/PickupTruckComment'
import { PickupTruckHistory } from '../app/models/pickup-trucks/PickupTruckHistory'
import { getDuplicateFieldValues } from '../utils/BaseAssetUtility'
import { createAssetService } from './BaseAssetService'

const SERVICE_PREFIX = '/pickup-truck-service'

const base = createAssetService({
    commentModelFn: PickupTruckComment.fromRow,
    commentsTable: 'pickup_trucks_comments',
    entityIdParam: 'pickupId',
    entityKey: 'pickup',
    entityName: 'Pickup Truck',
    historyTable: 'pickup_trucks_history',
    idColumn: 'truck_id',
    issuesTable: 'pickup_trucks_maintenance',
    parseHistoryRow: PickupTruckHistory.fromApiFormat,
    parseRow: (row) => (row ? PickupTruck.fromApiFormat(row) : null),
    servicePrefix: SERVICE_PREFIX
})

/** Pickup truck CRUD, comments, issues, history, and verification service. */
export const PickupTruckService = {
    ...base,
    create(pickup, userId) {
        return base._base.create(pickup, userId)
    },
    /** Fetches all pickups enriched with comment/issue counts and status history.
     *  Consumed generically by useAssetData as `service.fetchAll(codes)` when the
     *  config has no `fetchItems` override. */
    fetchAll(regionCodes = null) {
        return base._base.fetchWithDetails(regionCodes)
    },
    /** Fetches change history for a pickup. Invoked dynamically via
     *  HISTORY_SERVICE_MAP in useHistoryDataFetchers. */
    fetchHistory(pickupId, limit = null) {
        return base._base.getHistory(pickupId, limit)
    },
    getAll() {
        return base._base.getAll()
    },
    getById(id) {
        return base._base.fetchById(id)
    },

    getDuplicateAssigned(pickups) {
        return getDuplicateFieldValues(pickups, (p) => {
            const key = String(p.assigned || '')
                .trim()
                .toLowerCase()
            return key || null
        })
    },

    getDuplicateVINs(pickups) {
        return getDuplicateFieldValues(pickups, (p) => {
            const key = String(p.vin || '')
                .trim()
                .toUpperCase()
                .replace(/\s+/g, '')
            return key || null
        })
    },

    remove(id) {
        return base._base.delete(id)
    },

    update(id, pickup, userId) {
        return base._base.update(id, pickup, userId)
    }
}
