import {Operator} from '../models/operators/Operator'
import UserUtility from '../utils/UserUtility'
import {supabase} from './DatabaseService'
import APIUtility from '../utils/APIUtility'
import {MixerService} from './MixerService'
import {TractorService} from './TractorService'
import {OperatorHistory} from "../models/operators/OperatorHistory";

class OperatorServiceImpl {
    async getAllOperators() {
        const {res, json} = await APIUtility.post('/operator-service/list')
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch operators')
        return (json?.data ?? []).map(op => new Operator(op))
    }

    async fetchActiveOperators() {
        const {res, json} = await APIUtility.post('/operator-service/list-active')
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch active operators')
        return (json?.data ?? []).map(op => new Operator(op))
    }

    async fetchOperatorsByPlant(plantCode) {
        if (!plantCode) throw new Error('Plant code is required')
        const {res, json} = await APIUtility.post('/operator-service/list-by-plant', {plantCode})
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch operators by plant')
        return (json?.data ?? []).map(op => new Operator(op))
    }

    async fetchTractorOperators() {
        const {res, json} = await APIUtility.post('/operator-service/list-tractor')
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch tractor operators')
        return (json?.data ?? []).map(op => new Operator(op))
    }

    async getOperatorByEmployeeId(employeeId) {
        if (!employeeId || !UserUtility.isValidUUID(employeeId)) throw new Error('Invalid Employee ID')
        const {res, json} = await APIUtility.post('/operator-service/get-by-employee-id', {employeeId})
        if (!res.ok) return null
        const data = json?.data || null
        if (!data) return null
        data.smyrna_id = data.smyrna_id ?? ''
        return new Operator(data)
    }

    async createOperator(operator) {
        const op = operator instanceof Operator ? operator : new Operator(operator)
        if (!UserUtility.isValidUUID(op.employeeId)) op.employeeId = UserUtility.generateUUID()
        const payload = {operator: op.toApiFormat()}
        const {res, json} = await APIUtility.post('/operator-service/create', payload)
        if (!res.ok) throw new Error(json?.error || 'Failed to create operator')
        return new Operator(json?.data)
    }

    async updateOperator(operator) {
        if (!operator.employeeId || !UserUtility.isValidUUID(operator.employeeId)) throw new Error('Invalid Employee ID')
        const op = operator instanceof Operator ? operator : new Operator(operator)
        const update = op.toApiFormat()
        delete update.created_at

        const currentOperator = await this.getOperatorByEmployeeId(operator.employeeId)
        if (currentOperator && currentOperator.plantCode !== op.plantCode) {
            const assignedMixers = await MixerService.getMixersByOperator(operator.employeeId)
            for (const mixer of assignedMixers) {
                if (mixer.status === 'Active') {
                    await MixerService.updateMixer(mixer.id, {...mixer, assignedOperator: null, status: 'Spare'})
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

        const {res, json} = await APIUtility.post('/operator-service/update', {operator: update})
        if (!res.ok) throw new Error(json?.error || 'Failed to update operator')
        return new Operator(json?.data)
    }

    async deleteOperator(employeeId) {
        if (!employeeId || !UserUtility.isValidUUID(employeeId)) throw new Error('Invalid Employee ID')
        const {res, json} = await APIUtility.post('/operator-service/delete', {employeeId})
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Operator was not deleted')
        return true
    }

    async getAllTrainers() {
        const {res, json} = await APIUtility.post('/operator-service/list-trainers')
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch trainers')
        return (json?.data ?? []).map(op => new Operator(op))
    }

    async fetchOperators(regionCodes = null) {
        try {
            const {data, error} = await supabase.from('operators').select('*')
            if (error) throw error
            const formattedOperators = data.map(op => {
                const rawPending = op.pending_start_date || ''
                const normalizedPending = (typeof rawPending === 'string' && rawPending.includes('T')) ? rawPending.slice(0, 10) : rawPending
                return {
                    employeeId: op.employee_id,
                    smyrnaId: op.smyrna_id || '',
                    name: op.name,
                    plantCode: op.plant_code,
                    status: op.status,
                    isTrainer: op.is_trainer,
                    assignedTrainer: op.assigned_trainer,
                    position: op.position,
                    pendingStartDate: normalizedPending,
                    rating: typeof op.rating === 'number' ? op.rating : Number(op.rating) || 0,
                    phone: op.phone || ''
                }
            })
            if (regionCodes) {
                return formattedOperators.filter(op => regionCodes.has(String(op.plantCode || '').trim().toUpperCase()))
            }
            return formattedOperators
        } catch {
            return []
        }
    }

    async fetchPlants() {
        try {
            const {data, error} = await supabase.from('plants').select('*');
            if (error) throw error;
            return data
        } catch {
            return []
        }
    }

    async fetchTrainers() {
        try {
            const {data, error} = await supabase.from('operators').select('employee_id, name').eq('is_trainer', true);
            if (error) throw error;
            return data.map(t => ({employeeId: t.employee_id, name: t.name}))
        } catch {
            return []
        }
    }

    async fetchOperatorsWithAvailability(mixers = []) {
        const operators = await this.fetchOperators()
        return operators.map(operator => ({
            ...operator,
            isAvailable: operator.status === 'Active' && !mixers.some(mixer =>
                mixer.assignedOperator === operator.employeeId && mixer.status === 'Active'
            )
        }))
    }

    isOperatorAssigned(operatorId, mixers = []) {
        if (!operatorId || operatorId === '0') return false
        return mixers.some(mixer =>
            mixer.assignedOperator === operatorId && mixer.status === 'Active'
        )
    }

    async getOperatorById(employeeId) {
        if (!employeeId || !UserUtility.isValidUUID(employeeId)) throw new Error('Invalid Employee ID')
        const {res, json} = await APIUtility.post('/operator-service/get-by-employee-id', {employeeId})
        if (!res.ok) return null
        const data = json?.data || null
        if (!data) return null
        data.smyrna_id = data.smyrna_id ?? ''
        return new Operator(data)
    }

    getDuplicateNames(operators) {
        const counts = new Map()
        operators.forEach(op => {
            const key = (op?.name || '').trim().toLowerCase();
            if (!key) return;
            counts.set(key, (counts.get(key) || 0) + 1)
        })
        const dups = new Set();
        counts.forEach((count, key) => {
            if (count > 1) dups.add(key)
        });
        return dups
    }

    async getOperatorHistory(operatorId, limit = null) {
        const payload = {operatorId, limit}
        const {res, json} = await APIUtility.post('/operator-service/fetch-history', payload)
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch operator history')
        return (json?.data ?? []).map(entry => new OperatorHistory(entry))
    }

    async createHistoryEntry(operatorId, fieldName, oldValue, newValue, changedBy) {
        const payload = {operatorId, fieldName, oldValue, newValue, changedBy}
        const {res, json} = await APIUtility.post('/operator-service/add-history', payload)
        if (!res.ok) throw new Error(json?.error || 'Failed to create history entry')
        return json?.data
    }

    async fetchComments(operatorId) {
        if (!operatorId || !UserUtility.isValidUUID(operatorId)) throw new Error('Invalid Operator ID')
        const {res, json} = await APIUtility.post('/operator-service/fetch-comments', {operatorId})
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch comments')
        return json?.data ?? []
    }

    async addComment(operatorId, text, userId) {
        if (!operatorId || !UserUtility.isValidUUID(operatorId)) throw new Error('Invalid Operator ID')
        if (!text || !text.trim()) throw new Error('Comment text is required')
        if (!userId || !UserUtility.isValidUUID(userId)) throw new Error('Invalid User ID')
        const {res, json} = await APIUtility.post('/operator-service/add-comment', {
            operatorId,
            text: text.trim(),
            userId
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to add comment')
        return json?.data
    }

    async deleteComment(commentId) {
        if (!commentId || !UserUtility.isValidUUID(commentId)) throw new Error('Invalid Comment ID')
        const {res, json} = await APIUtility.post('/operator-service/delete-comment', {commentId})
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to delete comment')
        return true
    }
}

export const OperatorService = new OperatorServiceImpl()
