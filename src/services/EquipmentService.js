import { Equipment } from '../models/equipment/Equipment'
import { EquipmentComment } from '../models/equipment/EquipmentComment'
import { EquipmentHistory } from '../models/equipment/EquipmentHistory'
import APIUtility from '../utils/APIUtility'
import EquipmentUtility from '../utils/EquipmentUtility'
import { ValidationUtility } from '../utils/ValidationUtility'
import { supabase } from './DatabaseService'
import { UserService } from './UserService'

class EquipmentServiceImpl {
    static async fetchAllCommentsCounts(equipmentIds) {
        if (!equipmentIds || equipmentIds.length === 0) return {}
        const { data, error } = await supabase
            .from('heavy_equipment_comments')
            .select('equipment_id')
            .in('equipment_id', equipmentIds)
        if (error) {
            console.error('Error fetching equipment comments counts:', error)
            return {}
        }
        const counts = {}
        equipmentIds.forEach((id) => (counts[id] = 0))
        ;(data || []).forEach((row) => {
            if (row.equipment_id) counts[row.equipment_id] = (counts[row.equipment_id] || 0) + 1
        })
        return counts
    }

    static async fetchAllIssuesCounts(equipmentIds) {
        if (!equipmentIds || equipmentIds.length === 0) return {}
        const { data, error } = await supabase
            .from('heavy_equipment_maintenance')
            .select('equipment_id, time_completed')
            .in('equipment_id', equipmentIds)
        if (error) {
            console.error('Error fetching equipment issues counts:', error)
            return {}
        }
        const counts = {}
        equipmentIds.forEach((id) => (counts[id] = 0))
        ;(data || []).forEach((row) => {
            if (row.equipment_id && !row.time_completed) {
                counts[row.equipment_id] = (counts[row.equipment_id] || 0) + 1
            }
        })
        return counts
    }

    static async getAllEquipments() {
        const { res, json } = await APIUtility.post('/equipment-service/fetch-all')
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch equipment')
        const data = json?.data ?? []
        return data.map((row) => new Equipment(row))
    }

    static async fetchEquipments() {
        return this.getAllEquipments()
    }

    static _attachIsVerified(e) {
        if (!e) return e
        if (typeof e.isVerified !== 'function') {
            e.isVerified = function (latestHistoryDate) {
                return EquipmentUtility.isVerified(
                    this.updatedLast,
                    this.updatedAt,
                    this.updatedBy,
                    latestHistoryDate ?? this.latestHistoryDate
                )
            }
        }
        return e
    }

    static async getEquipmentById(id) {
        ValidationUtility.requireUUID(id, 'Equipment ID is required')
        const { res, json } = await APIUtility.post('/equipment-service/fetch-by-id', { id })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch equipment')
        const data = json?.data
        if (!data) return null
        return new Equipment(data)
    }

    static async fetchEquipmentById(id) {
        ValidationUtility.requireUUID(id, 'Invalid equipment ID')
        const equipment = await this.getEquipmentById(id)
        if (!equipment) return null
        return this._attachIsVerified(equipment)
    }

    static async getActiveEquipments() {
        const { res, json } = await APIUtility.post('/equipment-service/fetch-active')
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch active equipment')
        return (json?.data ?? []).map((row) => new Equipment(row))
    }

    static async getEquipmentHistory(equipmentId, limit = null) {
        ValidationUtility.requireUUID(equipmentId, 'Equipment ID is required')
        const payload = { equipmentId }
        if (limit && Number.isInteger(limit) && limit > 0) payload.limit = limit
        const { res, json } = await APIUtility.post('/equipment-service/fetch-history', payload)
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch equipment history')
        return (json?.data ?? []).map((entry) => EquipmentHistory.fromApiFormat(entry))
    }

    static async addEquipment(equipment, userId) {
        const { res, json } = await APIUtility.post('/equipment-service/create', { equipment, userId })
        if (!res.ok) throw new Error(json?.error || 'Failed to create equipment')
        return json?.data ? new Equipment(json.data) : null
    }

    static async createEquipment(equipment, userId) {
        if (!userId) {
            const user = await UserService.getCurrentUser()
            userId = typeof user === 'object' && user !== null ? user.id : user
            if (!userId) throw new Error('Authentication required')
        }
        if (equipment.id) delete equipment.id
        return this.addEquipment(equipment, userId)
    }

    static async updateEquipment(equipmentId, equipment, userId, _prevEquipmentState = null) {
        const id = typeof equipmentId === 'object' ? equipmentId.id : equipmentId
        ValidationUtility.requireUUID(id, 'Equipment ID is required')
        if (!userId) {
            const user = await UserService.getCurrentUser()
            userId = typeof user === 'object' && user !== null ? user.id : user
        }
        if (!userId) throw new Error('User ID is required')
        const { res, json } = await APIUtility.post('/equipment-service/update', { equipment, id, userId })
        if (!res.ok) {
            console.error('Equipment update failed:', {
                error: json?.error,
                fullResponse: json,
                status: res.status,
                statusText: res.statusText
            })
            throw new Error(json?.error || 'Failed to update equipment')
        }
        const updated = json?.data ? new Equipment(json.data) : null
        try {
            if (updated && typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent('notifications-refresh', {
                        detail: {
                            id,
                            plant: updated.assignedPlant,
                            type: 'equipment'
                        }
                    })
                )
            }
        } catch {}
        return updated
    }

    static async deleteEquipment(id) {
        ValidationUtility.requireUUID(id, 'Equipment ID is required')
        const { res, json } = await APIUtility.post('/equipment-service/delete', { id })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to delete equipment')
        return true
    }

    static async createHistoryEntry(equipmentId, fieldName, oldValue, newValue, changedBy) {
        ValidationUtility.requireUUID(equipmentId, 'Equipment ID is required')
        if (!fieldName) throw new Error('Field name required')
        let userId = changedBy
        if (!userId) {
            const user = await UserService.getCurrentUser()
            userId = typeof user === 'object' && user !== null ? user.id : user
        }
        if (!userId) userId = '00000000-0000-0000-0000-000000000000'
        const { res, json } = await APIUtility.post('/equipment-service/add-history', {
            changedBy: userId,
            equipmentId,
            fieldName,
            newValue,
            oldValue
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to create history entry')
        return json?.data
    }

    static async getCleanlinessHistory(equipmentId = null, months = 6) {
        const payload = {}
        if (equipmentId) payload.equipmentId = equipmentId
        if (months) payload.months = months
        const { res, json } = await APIUtility.post('/equipment-service/fetch-cleanliness-history', payload)
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch cleanliness history')
        return json?.data ?? []
    }

    static async getConditionHistory(equipmentId = null, months = 6) {
        const payload = {}
        if (equipmentId) payload.equipmentId = equipmentId
        if (months) payload.months = months
        const { res, json } = await APIUtility.post('/equipment-service/fetch-condition-history', payload)
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch condition history')
        return json?.data ?? []
    }

    static async getEquipmentsByStatus(status) {
        if (!status) throw new Error('Status is required')
        const { res, json } = await APIUtility.post('/equipment-service/fetch-by-status', { status })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch equipment by status')
        return (json?.data ?? []).map((row) => new Equipment(row))
    }

    static async searchEquipmentsByIdentifyingNumber(query) {
        if (!query?.trim()) throw new Error('Search query is required')
        const { res, json } = await APIUtility.post('/equipment-service/search-by-identifying-number', {
            query: query.trim()
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to search equipment')
        return (json?.data ?? []).map((row) => new Equipment(row))
    }

    static async getEquipmentsNeedingService(dayThreshold = 30) {
        const { res, json } = await APIUtility.post('/equipment-service/fetch-needing-service', { dayThreshold })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch equipment needing service')
        return (json?.data ?? []).map((row) => new Equipment(row))
    }

    static async fetchComments(equipmentId) {
        ValidationUtility.requireUUID(equipmentId, 'Equipment ID is required')
        const { res, json } = await APIUtility.post('/equipment-service/fetch-comments', { equipmentId })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch comments')
        return (json?.data ?? []).map((row) => EquipmentComment.fromRow(row))
    }

    static async addComment(equipmentId, text, author) {
        ValidationUtility.requireUUID(equipmentId, 'Equipment ID is required')
        if (!text?.trim()) throw new Error('Comment text is required')
        if (!author?.trim()) throw new Error('Author is required')
        const { res, json } = await APIUtility.post('/equipment-service/add-comment', {
            author: author.trim(),
            equipmentId,
            text: text.trim()
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to add comment')
        return json?.data ? EquipmentComment.fromRow(json.data) : null
    }

    static async deleteComment(commentId) {
        ValidationUtility.requireUUID(commentId, 'Comment ID is required')
        const { res, json } = await APIUtility.post('/equipment-service/delete-comment', { commentId })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to delete comment')
        return true
    }

    static async _fetchHistoryDates() {
        const { res, json } = await APIUtility.post('/equipment-service/fetch-history', { limit: 1 })
        if (!res.ok) return {}
        const historyDates = {}
        for (const entry of json?.data ?? []) {
            const id = entry?.equipment_id
            const at = entry?.changed_at
            if (id && (!historyDates[id] || new Date(at) > new Date(historyDates[id]))) historyDates[id] = at
        }
        return historyDates
    }

    static async fetchIssues(equipmentId) {
        ValidationUtility.requireUUID(equipmentId, 'Equipment ID is required')
        const { res, json } = await APIUtility.post('/equipment-service/fetch-issues', { equipmentId })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch issues')
        return json?.data ?? []
    }

    static async addIssue(equipmentId, issueText, severity, createdBy = null) {
        ValidationUtility.requireUUID(equipmentId, 'Equipment ID is required')
        if (!issueText?.trim()) throw new Error('Issue description is required')
        const validSeverities = ['Low', 'Medium', 'High']
        const finalSeverity = validSeverities.includes(severity) ? severity : 'Medium'
        const { res, json } = await APIUtility.post('/equipment-service/add-issue', {
            equipmentId,
            issue: issueText.trim(),
            severity: finalSeverity,
            userId: createdBy
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to add issue')
        return json?.data
    }

    static async deleteIssue(issueId) {
        ValidationUtility.requireUUID(issueId, 'Issue ID is required')
        const { res, json } = await APIUtility.post('/equipment-service/delete-issue', { issueId })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to delete issue')
        return true
    }

    static async completeIssue(issueId) {
        ValidationUtility.requireUUID(issueId, 'Issue ID is required')
        const { res, json } = await APIUtility.post('/equipment-service/complete-issue', { issueId })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to complete issue')
        return true
    }

    static async fetchEquipmentsWithDetails(regionCodes = null) {
        const base = await this.getAllEquipments().catch(() => [])

        const statusHistoryMap = {}
        const equipmentIds = (base || []).map((e) => e.id).filter(Boolean)
        if (equipmentIds.length > 0) {
            try {
                const { data: statusHistory } = await supabase
                    .from('heavy_equipment_history')
                    .select('equipment_id, changed_at')
                    .eq('field_name', 'status')
                    .in('equipment_id', equipmentIds)
                    .order('changed_at', { ascending: false })

                if (statusHistory) {
                    for (const h of statusHistory) {
                        if (!statusHistoryMap[h.equipment_id]) {
                            statusHistoryMap[h.equipment_id] = h.changed_at
                        }
                    }
                }
            } catch (e) {}
        }

        const processedBase = (Array.isArray(base) ? base : []).map((e) => {
            const equipment = { ...e }
            if (typeof equipment.openIssuesCount !== 'number') equipment.openIssuesCount = 0
            if (typeof equipment.commentsCount !== 'number') equipment.commentsCount = 0
            equipment.statusChangedAt = statusHistoryMap[equipment.id] || equipment.createdAt || null
            return equipment
        })
        if (regionCodes) {
            return processedBase.filter((e) =>
                regionCodes.has(
                    String(e.assignedPlant || '')
                        .trim()
                        .toUpperCase()
                )
            )
        }
        return processedBase
    }

    static async verifyEquipment(equipmentId, userId) {
        ValidationUtility.requireUUID(equipmentId, 'Equipment ID is required')
        if (!userId) {
            const user = await UserService.getCurrentUser()
            userId = typeof user === 'object' && user !== null ? user.id : user
        }
        if (!userId) throw new Error('User ID is required')
        const { res, json } = await APIUtility.post('/equipment-service/verify', { id: equipmentId, userId })
        if (!res.ok) throw new Error(json?.error || 'Failed to verify equipment')
        const equipment = new Equipment(json?.data)
        try {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent('notifications-refresh', {
                        detail: {
                            id: equipmentId,
                            plant: equipment.assignedPlant,
                            type: 'equipment'
                        }
                    })
                )
            }
        } catch {}
        return this._attachIsVerified(equipment)
    }
}

export const EquipmentService = EquipmentServiceImpl
