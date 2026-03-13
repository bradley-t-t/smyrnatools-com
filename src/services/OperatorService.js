import { Operator } from '../models/operators/Operator'
import { OperatorHistory } from '../models/operators/OperatorHistory'
import {
    apiPost,
    apiPostOrThrow,
    apiPostRequireSuccess,
    fetchAllCountsFromTable,
    fetchStatusHistoryMap,
    filterByRegionCodes,
    getDuplicateFieldValues
} from '../utils/BaseAssetUtility'
import ValidationUtility from '../utils/ValidationUtility'
import { supabase } from './DatabaseService'
import { MixerService } from './MixerService'
import { TractorService } from './TractorService'
const SERVICE_PREFIX = '/operator-service'
/**
 * Operator CRUD, history, comments, and assignment management service.
 * Handles plant-based operator queries, trainer management, and cross-references
 * with mixer/tractor assignments when operators change plants.
 */
class OperatorServiceImpl {
    /** Fetches comment counts for multiple operator IDs in a single query. */
    async fetchAllCommentsCounts(operatorIds) {
        return fetchAllCountsFromTable('operators_comments', 'operator_id', operatorIds)
    }
    /** Fetches all operator records from the API. */
    async getAllOperators() {
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/list`, {}, 'Failed to fetch operators')
        return (json?.data ?? []).map((op) => new Operator(op))
    }
    /** Fetches only active-status operators. */
    async fetchActiveOperators() {
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/list-active`, {}, 'Failed to fetch active operators')
        return (json?.data ?? []).map((op) => new Operator(op))
    }
    /** Fetches operators assigned to a specific plant. */
    async fetchOperatorsByPlant(plantCode) {
        if (!plantCode) throw new Error('Plant code is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/list-by-plant`,
            { plantCode },
            'Failed to fetch operators by plant'
        )
        return (json?.data ?? []).map((op) => new Operator(op))
    }
    /** Fetches operators with tractor-driver position type. */
    async fetchTractorOperators() {
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/list-tractor`, {}, 'Failed to fetch tractor operators')
        return (json?.data ?? []).map((op) => new Operator(op))
    }
    /** Fetches a single operator by employee ID, returning null if not found. */
    async getOperatorByEmployeeId(employeeId) {
        if (!employeeId || !ValidationUtility.isValidUUID(employeeId)) throw new Error('Invalid Employee ID')
        const { res, json } = await apiPost(`${SERVICE_PREFIX}/get-by-employee-id`, { employeeId })
        if (!res.ok) return null
        const data = json?.data ?? null
        if (!data) return null
        data.smyrna_id = data.smyrna_id ?? ''
        return new Operator(data)
    }
    /** Creates a new operator, auto-generating an employee ID if not valid. */
    async createOperator(operator) {
        const op = operator instanceof Operator ? operator : new Operator(operator)
        if (!ValidationUtility.isValidUUID(op.employeeId)) op.employeeId = ValidationUtility.generateUUID()
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/create`,
            { operator: op.toApiFormat() },
            'Failed to create operator'
        )
        return new Operator(json?.data)
    }
    /**
     * Updates an operator record. When the plant changes, automatically unassigns
     * the operator from all active mixers and tractors at the old plant.
     */
    async updateOperator(operator) {
        if (!operator.employeeId || !ValidationUtility.isValidUUID(operator.employeeId))
            throw new Error('Invalid Employee ID')
        const op = operator instanceof Operator ? operator : new Operator(operator)
        const update = op.toApiFormat()
        delete update.created_at
        const currentOperator = await this.getOperatorByEmployeeId(operator.employeeId)
        if (currentOperator?.plantCode !== op.plantCode) {
            const assignedMixers = await MixerService.getMixersByOperator(operator.employeeId)
            for (const mixer of assignedMixers) {
                if (mixer.status === 'Active') {
                    await MixerService.updateMixer(mixer.id, { ...mixer, assignedOperator: null, status: 'Spare' })
                }
            }
            const assignedTractors = await TractorService.getTractorsByOperator(operator.employeeId)
            for (const tractor of assignedTractors) {
                if (tractor.status === 'Active') {
                    await TractorService.updateTractor(tractor.id, {
                        ...tractor,
                        assignedOperator: null,
                        status: 'Spare'
                    })
                }
            }
        }
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/update`, { operator: update }, 'Failed to update operator')
        return new Operator(json?.data)
    }
    /** Deletes an operator by employee ID. */
    async deleteOperator(employeeId) {
        if (!employeeId || !ValidationUtility.isValidUUID(employeeId)) throw new Error('Invalid Employee ID')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/delete`, { employeeId }, 'Operator was not deleted')
    }
    /** Fetches all operators marked as trainers. */
    async getAllTrainers() {
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/list-trainers`, {}, 'Failed to fetch trainers')
        return (json?.data ?? []).map((op) => new Operator(op))
    }
    /**
     * Fetches operators directly from Supabase with status change history enrichment.
     * Optionally filtered by region codes for scoped views.
     */
    async fetchOperators(regionCodes = null) {
        try {
            const { data, error } = await supabase.from('operators').select('*')
            if (error) throw error
            const operatorIds = (data || []).map((op) => op.employee_id).filter(Boolean)
            const statusHistoryMap = await fetchStatusHistoryMap('operators_history', 'operator_id', operatorIds)
            const formattedOperators = data.map((op) => {
                const rawPending = op.pending_start_date || ''
                const normalizedPending =
                    typeof rawPending === 'string' && rawPending.includes('T') ? rawPending.slice(0, 10) : rawPending
                return {
                    assignedTrainer: op.assigned_trainer,
                    createdAt: op.created_at || null,
                    employeeId: op.employee_id,
                    isTrainer: op.is_trainer,
                    name: op.name,
                    pendingStartDate: normalizedPending,
                    phone: op.phone || '',
                    plantCode: op.plant_code,
                    position: op.position,
                    rating: typeof op.rating === 'number' ? op.rating : Number(op.rating) || 0,
                    smyrnaId: op.smyrna_id || '',
                    status: op.status,
                    statusChangedAt: statusHistoryMap[op.employee_id] || op.created_at || null
                }
            })
            return filterByRegionCodes(formattedOperators, regionCodes, 'plantCode')
        } catch {
            return []
        }
    }
    /** Fetches all plants from the database. */
    async fetchPlants() {
        try {
            const { data, error } = await supabase.from('plants').select('*')
            if (error) throw error
            return data
        } catch {
            return []
        }
    }
    /** Fetches trainer-eligible operators (employee ID + name). */
    async fetchTrainers() {
        try {
            const { data, error } = await supabase.from('operators').select('employee_id, name').eq('is_trainer', true)
            if (error) throw error
            return data.map((t) => ({ employeeId: t.employee_id, name: t.name }))
        } catch {
            return []
        }
    }
    /** Fetches operators enriched with availability status based on active mixer assignments. */
    async fetchOperatorsWithAvailability(mixers = []) {
        const operators = await this.fetchOperators()
        return operators.map((operator) => ({
            ...operator,
            isAvailable:
                operator.status === 'Active' &&
                !mixers.some((mixer) => mixer.assignedOperator === operator.employeeId && mixer.status === 'Active')
        }))
    }
    /** Checks if an operator is currently assigned to an active mixer. */
    isOperatorAssigned(operatorId, mixers = []) {
        if (!operatorId || operatorId === '0') return false
        return mixers.some((mixer) => mixer.assignedOperator === operatorId && mixer.status === 'Active')
    }
    /** Detects duplicate operator names for data quality alerts. */
    getDuplicateNames(operators) {
        return getDuplicateFieldValues(operators, (op) => {
            const key = (op?.name || '').trim().toLowerCase()
            return key || null
        })
    }
    /** Fetches change history for a specific operator. */
    async getOperatorHistory(operatorId, limit = null) {
        const payload = { limit, operatorId }
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-history`,
            payload,
            'Failed to fetch operator history'
        )
        return (json?.data ?? []).map((entry) => new OperatorHistory(entry))
    }
    /** Records a field-level change in the operator history audit trail. */
    async createHistoryEntry(operatorId, fieldName, oldValue, newValue, changedBy) {
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/add-history`,
            {
                changedBy,
                fieldName,
                newValue,
                oldValue,
                operatorId
            },
            'Failed to create history entry'
        )
        return json?.data
    }
    async fetchComments(operatorId) {
        if (!operatorId || !ValidationUtility.isValidUUID(operatorId)) throw new Error('Invalid Operator ID')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-comments`,
            { operatorId },
            'Failed to fetch comments'
        )
        return json?.data ?? []
    }
    async addComment(operatorId, text, userId) {
        if (!operatorId || !ValidationUtility.isValidUUID(operatorId)) throw new Error('Invalid Operator ID')
        if (!text || !text.trim()) throw new Error('Comment text is required')
        if (!userId || !ValidationUtility.isValidUUID(userId)) throw new Error('Invalid User ID')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/add-comment`,
            {
                operatorId,
                text: text.trim(),
                userId
            },
            'Failed to add comment'
        )
        return json?.data
    }
    async deleteComment(commentId) {
        if (!commentId || !ValidationUtility.isValidUUID(commentId)) throw new Error('Invalid Comment ID')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/delete-comment`, { commentId }, 'Failed to delete comment')
    }
}
export const OperatorService = new OperatorServiceImpl()
