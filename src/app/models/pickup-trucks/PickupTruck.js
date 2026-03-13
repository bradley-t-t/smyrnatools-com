import { DateUtility } from '../../../utils/DateUtility'
/**
 * Pickup truck domain model. Maps snake_case API data to camelCase properties
 * with safe mileage coercion and database timestamp serialization.
 */
export class PickupTruck {
    constructor(data = {}) {
        this.id = data.id ?? null
        this.vin = data.vin ?? ''
        this.make = data.make ?? ''
        this.model = data.model ?? ''
        this.year = data.year ?? ''
        this.assigned = data.assigned ?? ''
        this.assignedPlant = data.assigned_plant ?? ''
        this.status = data.status ?? 'Active'
        this.mileage =
            typeof data.mileage === 'number'
                ? data.mileage
                : typeof data.mileage === 'string' && data.mileage.trim() !== ''
                  ? Number(data.mileage)
                  : 0
        this.comments = data.comments ?? ''
        this.createdAt = data.created_at ?? new Date().toISOString()
        this.updatedAt = data.updated_at ?? new Date().toISOString()
        this.updatedLast = data.updated_last ?? null
        this.updatedBy = data.updated_by ?? null
    }
    static fromApiFormat(data) {
        if (!data) return null
        return new PickupTruck(data)
    }
    toApiFormat() {
        const apiObject = {
            assigned: this.assigned || null,
            assigned_plant: this.assignedPlant || null,
            comments: this.comments || null,
            created_at: DateUtility.toDbTimestamp(this.createdAt) || DateUtility.nowDb(),
            make: this.make || null,
            mileage: typeof this.mileage === 'number' && this.mileage >= 0 ? this.mileage : null,
            model: this.model || null,
            status: this.status || null,
            updated_at: DateUtility.nowDb(),
            updated_by: this.updatedBy || null,
            updated_last: DateUtility.toDbTimestamp(this.updatedLast),
            vin: this.vin || null,
            year: this.year || null
        }
        if (this.id) apiObject.id = this.id
        return apiObject
    }
}
export default PickupTruck
