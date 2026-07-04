import { createAssetHistory } from '../history/createAssetHistory'

/** Pickup truck field-change history entry with snake_case API mapping.
 *  Uses `truck_id` (the canonical FK column for pickup-truck tables). */
export const PickupTruckHistory = createAssetHistory({
    foreignKey: 'truckId',
    foreignKeyColumn: 'truck_id'
})
