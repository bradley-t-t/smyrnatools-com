/**
 * Maps raw database realtime payloads into the camelCase shape used by the
 * operators list state. Kept identical to the original inline mappers so live
 * INSERT/UPDATE behaviour does not change.
 */

const nowIso = () => new Date().toISOString()

export const mapOperatorInsertPayload = (newData) => ({
    assignedTrainer: newData.assigned_trainer ?? null,
    automaticRestriction: newData.automatic_restriction ?? false,
    createdAt: newData.created_at ?? nowIso(),
    employeeId: newData.employee_id,
    isTrainer: newData.is_trainer ?? false,
    name: newData.name ?? '',
    pendingStartDate: newData.pending_start_date ?? null,
    phone: newData.phone ?? null,
    plantCode: newData.plant_code ?? null,
    position: newData.position ?? null,
    rating: newData.rating ?? 0,
    smyrnaId: newData.smyrna_id ?? null,
    status: newData.status ?? 'Active',
    updatedAt: newData.updated_at ?? nowIso()
})

export const applyOperatorUpdatePayload = (operator, updatedData) => ({
    ...operator,
    assignedTrainer: updatedData.assigned_trainer ?? operator.assignedTrainer,
    automaticRestriction: updatedData.automatic_restriction ?? operator.automaticRestriction,
    employeeId: updatedData.employee_id ?? operator.employeeId,
    isTrainer: updatedData.is_trainer ?? operator.isTrainer,
    name: updatedData.name ?? operator.name,
    pendingStartDate: updatedData.pending_start_date ?? operator.pendingStartDate,
    phone: updatedData.phone ?? operator.phone,
    plantCode: updatedData.plant_code ?? operator.plantCode,
    position: updatedData.position ?? operator.position,
    rating: updatedData.rating ?? operator.rating,
    smyrnaId: updatedData.smyrna_id ?? operator.smyrnaId,
    status: updatedData.status ?? operator.status,
    updatedAt: updatedData.updated_at ?? operator.updatedAt
})
