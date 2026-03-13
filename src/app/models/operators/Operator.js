import ValidationUtility from '../../../utils/ValidationUtility'
/**
 * Operator domain model. Handles dual snake_case/camelCase field resolution,
 * UUID-based employee IDs, trainer assignments, and API serialization
 * with UUID validation guards.
 */
export class Operator {
    constructor(data = {}) {
        this.employeeId = data.employee_id ?? data.employeeId ?? ValidationUtility.generateUUID()
        this.smyrnaId = data.smyrna_id ?? data.smyrnaId ?? null
        this.name = data.name?.trim() ?? ''
        this.plantCode = data.plant_code ?? data.plantCode ?? null
        this.status = data.status ?? 'Active'
        this.isTrainer = data.is_trainer === true || String(data.is_trainer).toLowerCase() === 'true'
        this.assignedTrainer = data.assigned_trainer ?? data.assignedTrainer ?? null
        this.position = data.position ?? null
        this.createdAt = data.created_at ?? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
        this.updatedAt = data.updated_at ?? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
        this.pendingStartDate = data.pending_start_date ?? data.pendingStartDate ?? null
        this.phone = data.phone ?? data.phone ?? null
    }
    static fromApiFormat(data) {
        if (!data) return null
        return new Operator({
            assigned_trainer: data.assigned_trainer ?? data.assignedTrainer ?? null,
            automatic_restriction: data.automatic_restriction ?? data.automaticRestriction ?? false,
            created_at: data.created_at ?? data.createdAt ?? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
            employee_id: data.employee_id ?? data.employeeId ?? ValidationUtility.generateUUID(),
            is_trainer: data.is_trainer ?? data.isTrainer ?? false,
            name: data.name ?? '',
            pending_start_date: data.pending_start_date ?? data.pendingStartDate ?? null,
            phone: data.phone ?? null,
            plant_code: data.plant_code ?? data.plantCode ?? null,
            position: data.position ?? null,
            smyrna_id: data.smyrna_id ?? data.smyrnaId ?? null,
            status: data.status ?? 'Active',
            updated_at: data.updated_at ?? data.updatedAt ?? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
        })
    }
    static fromRow(row) {
        return this.fromApiFormat(row)
    }
    toApiFormat() {
        if (!ValidationUtility.isValidUUID(this.employeeId)) {
            throw new Error('Invalid employee_id: Must be a valid UUID')
        }
        if (this.smyrnaId && ValidationUtility.isValidUUID(this.smyrnaId)) {
            throw new Error('smyrna_id cannot be a UUID')
        }
        return {
            assigned_trainer: ValidationUtility.safeUUID(this.assignedTrainer),
            automatic_restriction: this.automaticRestriction ?? false,
            created_at: this.createdAt ?? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
            employee_id: this.employeeId,
            is_trainer: this.isTrainer ?? false,
            name: this.name?.trim() || '',
            pending_start_date: this.pendingStartDate ?? null,
            phone: this.phone ?? null,
            plant_code: this.plantCode ?? null,
            position: this.position ?? null,
            smyrna_id: this.smyrnaId ?? null,
            status: this.status || 'Active',
            updated_at: this.updatedAt ?? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
        }
    }
}
