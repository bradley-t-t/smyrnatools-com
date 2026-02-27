import { Equipment } from '../models/equipment/Equipment'
import { EquipmentComment } from '../models/equipment/EquipmentComment'
import { EquipmentHistory } from '../models/equipment/EquipmentHistory'
import {
    apiPostOrThrow,
    apiPostRequireSuccess,
    dispatchNotificationsRefresh,
    fetchAllCountsFromTable,
    fetchAllOpenIssueCountsFromTable,
    fetchWithDetailsBase,
    normalizeSeverity,
    requireUserId,
    resolveEntityId,
    resolveUserIdOrAnonymous
} from '../utils/BaseAssetUtility'
import EquipmentUtility from '../utils/EquipmentUtility'
import { ValidationUtility } from '../utils/ValidationUtility'

const SERVICE_PREFIX = '/equipment-service'

function attachIsVerified(equipment) {
    if (!equipment) return equipment
    if (typeof equipment.isVerified !== 'function') {
        equipment.isVerified = function (latestHistoryDate) {
            return EquipmentUtility.isVerified(
                this.updatedLast,
                this.updatedAt,
                this.updatedBy,
                latestHistoryDate ?? this.latestHistoryDate
            )
        }
    }
    return equipment
}

class EquipmentServiceImpl {
    static async fetchAllCommentsCounts(equipmentIds) {
        return fetchAllCountsFromTable('heavy_equipment_comments', 'equipment_id', equipmentIds)
    }

    static async fetchAllIssuesCounts(equipmentIds) {
        return fetchAllOpenIssueCountsFromTable('heavy_equipment_maintenance', 'equipment_id', equipmentIds)
    }

    static async getAllEquipments() {
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-all`, {}, 'Failed to fetch equipment')
        return (json?.data ?? []).map((row) => new Equipment(row))
    }

    static async fetchEquipments() {
        return this.getAllEquipments()
    }

    static async getEquipmentById(id) {
        ValidationUtility.requireUUID(id, 'Equipment ID is required')
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-by-id`, { id }, 'Failed to fetch equipment')
        return json?.data ? new Equipment(json.data) : null
    }

    static async fetchEquipmentById(id) {
        ValidationUtility.requireUUID(id, 'Invalid equipment ID')
        const equipment = await this.getEquipmentById(id)
        return equipment ? attachIsVerified(equipment) : null
    }

    static async getActiveEquipments() {
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-active`, {}, 'Failed to fetch active equipment')
        return (json?.data ?? []).map((row) => new Equipment(row))
    }

    static async getEquipmentHistory(equipmentId, limit = null) {
        ValidationUtility.requireUUID(equipmentId, 'Equipment ID is required')
        const payload = { equipmentId }
        if (limit && Number.isInteger(limit) && limit > 0) payload.limit = limit
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-history`,
            payload,
            'Failed to fetch equipment history'
        )
        return (json?.data ?? []).map((entry) => EquipmentHistory.fromApiFormat(entry))
    }

    static async addEquipment(equipment, userId) {
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/create`,
            { equipment, userId },
            'Failed to create equipment'
        )
        return json?.data ? new Equipment(json.data) : null
    }

    static async createEquipment(equipment, userId) {
        const resolvedUserId = await requireUserId(userId, 'Authentication required')
        if (equipment.id) delete equipment.id
        return this.addEquipment(equipment, resolvedUserId)
    }

    static async updateEquipment(equipmentId, equipment, userId, _prevEquipmentState = null) {
        const id = resolveEntityId(equipmentId)
        ValidationUtility.requireUUID(id, 'Equipment ID is required')
        const resolvedUserId = await requireUserId(userId)
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/update`,
            { equipment, id, userId: resolvedUserId },
            'Failed to update equipment'
        )
        const updated = json?.data ? new Equipment(json.data) : null
        if (updated) {
            dispatchNotificationsRefresh({ id, plant: updated.assignedPlant, type: 'equipment' })
        }
        return updated
    }

    static async deleteEquipment(id) {
        ValidationUtility.requireUUID(id, 'Equipment ID is required')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/delete`, { id }, 'Failed to delete equipment')
    }

    static async createHistoryEntry(equipmentId, fieldName, oldValue, newValue, changedBy) {
        ValidationUtility.requireUUID(equipmentId, 'Equipment ID is required')
        if (!fieldName) throw new Error('Field name required')
        const userId = await resolveUserIdOrAnonymous(changedBy)
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/add-history`,
            {
                changedBy: userId,
                equipmentId,
                fieldName,
                newValue,
                oldValue
            },
            'Failed to create history entry'
        )
        return json?.data
    }

    static async getCleanlinessHistory(equipmentId = null, months = 6) {
        const payload = {}
        if (equipmentId) payload.equipmentId = equipmentId
        if (months) payload.months = months
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-cleanliness-history`,
            payload,
            'Failed to fetch cleanliness history'
        )
        return json?.data ?? []
    }

    static async getConditionHistory(equipmentId = null, months = 6) {
        const payload = {}
        if (equipmentId) payload.equipmentId = equipmentId
        if (months) payload.months = months
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-condition-history`,
            payload,
            'Failed to fetch condition history'
        )
        return json?.data ?? []
    }

    static async getEquipmentsByStatus(status) {
        if (!status) throw new Error('Status is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-by-status`,
            { status },
            'Failed to fetch equipment by status'
        )
        return (json?.data ?? []).map((row) => new Equipment(row))
    }

    static async searchEquipmentsByIdentifyingNumber(query) {
        if (!query?.trim()) throw new Error('Search query is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/search-by-identifying-number`,
            { query: query.trim() },
            'Failed to search equipment'
        )
        return (json?.data ?? []).map((row) => new Equipment(row))
    }

    static async getEquipmentsNeedingService(dayThreshold = 30) {
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-needing-service`,
            { dayThreshold },
            'Failed to fetch equipment needing service'
        )
        return (json?.data ?? []).map((row) => new Equipment(row))
    }

    static async fetchComments(equipmentId) {
        ValidationUtility.requireUUID(equipmentId, 'Equipment ID is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-comments`,
            { equipmentId },
            'Failed to fetch comments'
        )
        return (json?.data ?? []).map((row) => EquipmentComment.fromRow(row))
    }

    static async addComment(equipmentId, text, author) {
        ValidationUtility.requireUUID(equipmentId, 'Equipment ID is required')
        if (!text?.trim()) throw new Error('Comment text is required')
        if (!author?.trim()) throw new Error('Author is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/add-comment`,
            {
                author: author.trim(),
                equipmentId,
                text: text.trim()
            },
            'Failed to add comment'
        )
        return json?.data ? EquipmentComment.fromRow(json.data) : null
    }

    static async deleteComment(commentId) {
        ValidationUtility.requireUUID(commentId, 'Comment ID is required')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/delete-comment`, { commentId }, 'Failed to delete comment')
    }

    static async _fetchHistoryDates() {
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-history`,
            { limit: 1 },
            'Failed to fetch history'
        ).catch(() => null)
        if (!json) return {}
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
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-issues`, { equipmentId }, 'Failed to fetch issues')
        return json?.data ?? []
    }

    static async addIssue(equipmentId, issueText, severity, createdBy = null) {
        ValidationUtility.requireUUID(equipmentId, 'Equipment ID is required')
        if (!issueText?.trim()) throw new Error('Issue description is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/add-issue`,
            {
                equipmentId,
                issue: issueText.trim(),
                severity: normalizeSeverity(severity),
                userId: createdBy
            },
            'Failed to add issue'
        )
        return json?.data
    }

    static async deleteIssue(issueId) {
        ValidationUtility.requireUUID(issueId, 'Issue ID is required')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/delete-issue`, { issueId }, 'Failed to delete issue')
    }

    static async completeIssue(issueId) {
        ValidationUtility.requireUUID(issueId, 'Issue ID is required')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/complete-issue`, { issueId }, 'Failed to complete issue')
    }

    static async fetchEquipmentsWithDetails(regionCodes = null) {
        return fetchWithDetailsBase({
            fetchAllFn: () => this.getAllEquipments(),
            historyTableName: 'heavy_equipment_history',
            idColumnName: 'equipment_id',
            regionCodes
        })
    }

    static async verifyEquipment(equipmentId, userId) {
        ValidationUtility.requireUUID(equipmentId, 'Equipment ID is required')
        const resolvedUserId = await requireUserId(userId)
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/verify`,
            { id: equipmentId, userId: resolvedUserId },
            'Failed to verify equipment'
        )
        const equipment = new Equipment(json?.data)
        dispatchNotificationsRefresh({ id: equipmentId, plant: equipment.assignedPlant, type: 'equipment' })
        return attachIsVerified(equipment)
    }
}

export const EquipmentService = EquipmentServiceImpl
