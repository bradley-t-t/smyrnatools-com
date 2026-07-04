import { Operator } from '../app/models/operators/Operator'
import { OperatorHistory } from '../app/models/operators/OperatorHistory'
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
import { Database } from './DatabaseService'
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
        if (!(await ValidationUtility.isValidUUID(op.employeeId)))
            op.employeeId = await ValidationUtility.generateUUID()
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
            const [assignedMixers, assignedTractors] = await Promise.all([
                MixerService.getMixersByOperator(operator.employeeId),
                TractorService.getTractorsByOperator(operator.employeeId)
            ])
            const mixerUpdates = assignedMixers
                .filter((mixer) => mixer.status === 'Active')
                .map((mixer) =>
                    MixerService.updateMixer(mixer.id, { ...mixer, assignedOperator: null, status: 'Spare' })
                )
            const tractorUpdates = assignedTractors
                .filter((tractor) => tractor.status === 'Active')
                .map((tractor) =>
                    TractorService.updateTractor(tractor.id, { ...tractor, assignedOperator: null, status: 'Spare' })
                )
            await Promise.all([...mixerUpdates, ...tractorUpdates])
        }
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/update`, { operator: update }, 'Failed to update operator')
        return new Operator(json?.data)
    }
    /** Deletes an operator by employee ID. */
    async deleteOperator(employeeId) {
        if (!employeeId || !ValidationUtility.isValidUUID(employeeId)) throw new Error('Invalid Employee ID')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/delete`, { employeeId }, 'Operator was not deleted')
    }
    /**
     * Fetches operators directly from the database with status change history enrichment.
     * Optionally filtered by region codes for scoped views.
     */
    async fetchOperators(regionCodes = null) {
        try {
            const { data, error } = await Database.from('operators').select('*')
            if (error) throw error
            const operatorIds = (data || []).map((op) => op.employee_id).filter(Boolean)
            const statusHistoryMap = await fetchStatusHistoryMap('operators_history', 'operator_id', operatorIds)
            const formattedOperators = data.map((op) => {
                const model = new Operator(op)
                return {
                    ...model,
                    phone: model.phone || '',
                    rating: typeof op.rating === 'number' ? op.rating : Number(op.rating) || 0,
                    smyrnaId: model.smyrnaId || '',
                    statusChangedAt: statusHistoryMap[op.employee_id] || op.created_at || null
                }
            })
            return filterByRegionCodes(formattedOperators, regionCodes, 'plantCode')
        } catch (err) {
            console.error('Failed to fetch operators:', err)
            return []
        }
    }
    /** Fetches trainer-eligible operators (employee ID + name). */
    async fetchTrainers() {
        try {
            const { data, error } = await Database.from('operators').select('employee_id, name').eq('is_trainer', true)
            if (error) throw error
            return data.map((t) => ({ employeeId: t.employee_id, name: t.name }))
        } catch (err) {
            console.error('Failed to fetch trainers:', err)
            return []
        }
    }
    /** Fetches change history for a specific operator. Invoked dynamically
     *  via HISTORY_SERVICE_MAP in useHistoryDataFetchers. */
    async getOperatorHistory(operatorId, limit = null) {
        const payload = { limit, operatorId }
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-history`,
            payload,
            'Failed to fetch operator history'
        )
        return (json?.data ?? []).map((entry) => new OperatorHistory(entry))
    }
    /** Detects duplicate operator names for data quality alerts. */
    getDuplicateNames(operators) {
        return getDuplicateFieldValues(operators, (op) => {
            const key = (op?.name || '').trim().toLowerCase()
            return key || null
        })
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
}
export const OperatorService = new OperatorServiceImpl()
