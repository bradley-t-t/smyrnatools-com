import { DateUtility } from '../../../utils/DateUtility'
import VerifiedUtility from '../../../utils/VerifiedUtility'
/**
 * Mixer domain model. Maps snake_case API data to camelCase properties,
 * provides serialization (toApiFormat), status/operator mutations,
 * and service/chip date calculations.
 */
export class Mixer {
    constructor(data = {}) {
        this.id = data.id ?? null
        this.truckNumber = data.truck_number ?? ''
        this.assignedPlant = data.assigned_plant ?? ''
        this.assignedOperator = data.assigned_operator ?? ''
        this.lastServiceDate = data.last_service_date ?? null
        this.lastChipDate = data.last_chip_date ?? null
        this.cleanlinessRating = data.cleanliness_rating ?? 0
        this.status = data.status ?? 'Active'
        this.createdAt = data.created_at ?? new Date().toISOString()
        this.updatedAt = data.updated_at ?? new Date().toISOString()
        this.updatedLast = data.updated_last ?? new Date().toISOString()
        this.updatedBy = data.updated_by ?? null
        this.vin = (data.vin ?? '').toUpperCase()
        this.make = data.make ?? ''
        this.model = data.model ?? ''
        this.year = data.year ?? ''
        this.shopStatus = data.shop_status ?? data.shopStatus ?? null
        this.latestHistoryDate = data.latestHistoryDate ?? null
        this.openIssuesCount = data.openIssuesCount ?? 0
        this.commentsCount = data.commentsCount ?? 0
        this.statusChangedAt = data.status_changed_at ?? data.statusChangedAt ?? null
    }
    static fromApiFormat(data) {
        if (!data) return null
        return new Mixer(data)
    }
    static fromRow(row) {
        return this.fromApiFormat(row)
    }
    static ensureInstance(obj) {
        if (obj instanceof Mixer) return obj
        return Mixer.fromApiFormat(obj)
    }
    toApiFormat() {
        const apiObject = {
            assigned_operator: this.assignedOperator || null,
            assigned_plant: this.assignedPlant,
            cleanliness_rating: this.cleanlinessRating,
            created_at: DateUtility.toDbTimestamp(this.createdAt) || DateUtility.nowDb(),
            last_chip_date: DateUtility.toDbDate(this.lastChipDate),
            last_service_date: DateUtility.toDbDate(this.lastServiceDate),
            make: this.make,
            model: this.model,
            shop_status: this.shopStatus,
            status: this.status,
            truck_number: this.truckNumber,
            updated_at: DateUtility.toDbTimestamp(this.updatedAt) || DateUtility.nowDb(),
            updated_by: this.updatedBy,
            updated_last: DateUtility.toDbTimestamp(this.updatedLast),
            vin: (this.vin || '').toUpperCase(),
            year: this.year
        }
        if (this.id) apiObject.id = this.id
        return apiObject
    }
    toRow() {
        return this.toApiFormat()
    }
    getDaysSinceService() {
        if (!this.lastServiceDate) return null
        return Math.ceil((new Date() - new Date(this.lastServiceDate)) / 86400000)
    }
    getDaysSinceChip() {
        if (!this.lastChipDate) return null
        return Math.ceil((new Date() - new Date(this.lastChipDate)) / 86400000)
    }
    getStatus() {
        return this.status || 'Unknown'
    }
    setStatus(newStatus) {
        if (!newStatus) return this
        this.status = newStatus
        if (['In Shop', 'Retired', 'Spare'].includes(newStatus)) {
            this.assignedOperator = null
        }
        return this
    }
    assignOperator(operatorId) {
        this.assignedOperator = operatorId || null
        if (this.assignedOperator && this.status !== 'Active') {
            this.status = 'Active'
        }
        return this
    }
    getFormattedServiceDate() {
        return this.lastServiceDate ? new Date(this.lastServiceDate).toLocaleDateString() : 'Not available'
    }
    getFormattedChipDate() {
        return this.lastChipDate ? new Date(this.lastChipDate).toLocaleDateString() : 'Not available'
    }
    isVerified() {
        return VerifiedUtility.isVerified(this.updatedLast, this.updatedAt, this.updatedBy)
    }
    verify(userId) {
        const now = new Date().toISOString()
        this.updatedLast = now
        this.updatedBy = userId
        return this
    }
}
