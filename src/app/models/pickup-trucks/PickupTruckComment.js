import { createAssetComment } from '../comment/createAssetComment'

/** Pickup truck comment record with snake_case API mapping. The DB FK column
 *  is `truck_id` (shared with the rest of the pickup-truck schema), not
 *  `pickup_truck_id`. */
export const PickupTruckComment = createAssetComment({
    foreignKey: 'truckId',
    foreignKeyColumn: 'truck_id'
})
