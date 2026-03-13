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
import { ValidationUtility } from '../utils/ValidationUtility'
import VerifiedUtility from '../utils/VerifiedUtility'
const SERVICE_PREFIX = '/equipment-service'
/** Attaches a lazy isVerified() method to an equipment instance using VerifiedUtility logic. */
function attachIsVerified(equipment) {
    if (!equipment) return equipment
    if (typeof equipment.isVerified !== 'function') {
        equipment.isVerified = function () {
            return VerifiedUtility.isVerified(this.updatedLast, this.updatedAt, this.updatedBy)
        }
    }
    return equipment
}
/**
 * Heavy equipment CRUD, history, comments, issues, and verification service.
 * Delegates shared asset operations to BaseAssetUtility.
 */
class EquipmentServiceImpl {
    /** Fetches comment counts for multiple equipment IDs in a single query. */
    static async fetchAllCommentsCounts(equipmentIds) {
        return fetchAllCountsFromTable('heavy_equipment_comments', 'equipment_id', equipmentIds)
    }
    /** Fetches open issue counts for multiple equipment IDs in a single query. */
    static async fetchAllIssuesCounts(equipmentIds) {
        return fetchAllOpenIssueCountsFromTable('heavy_equipment_maintenance', 'equipment_id', equipmentIds)
    }
    /** Fetches all equipment records. */
    static async getAllEquipments() {
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-all`, {}, 'Failed to fetch equipment')
        return (json?.data ?? []).map((row) => new Equipment(row))
    }
    /** Alias for getAllEquipments for backward compatibility. */
    static async fetchEquipments() {
        return this.getAllEquipments()
    }
    /** Fetches a single equipment record by UUID with model instantiation. */
    static async getEquipmentById(id) {
        ValidationUtility.requireUUID(id, 'Equipment ID is required')
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-by-id`, { id }, 'Failed to fetch equipment')
        return json?.data ? new Equipment(json.data) : null
    }
    /** Fetches equipment by ID with verification status attached. */
    static async fetchEquipmentById(id) {
        ValidationUtility.requireUUID(id, 'Invalid equipment ID')
        const equipment = await this.getEquipmentById(id)
        return equipment ? attachIsVerified(equipment) : null
    }
    /** Fetches only active-status equipment records. */
    static async getActiveEquipments() {
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-active`, {}, 'Failed to fetch active equipment')
        return (json?.data ?? []).map((row) => new Equipment(row))
    }
    /** Fetches change history for a specific equipment, optionally limited. */
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
    /** Creates a new equipment record via the edge function. */
    static async addEquipment(equipment, userId) {
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/create`,
            { equipment, userId },
            'Failed to create equipment'
        )
        return json?.data ? new Equipment(json.data) : null
    }
    /** Creates equipment with user ID resolution and ID cleanup. */
    static async createEquipment(equipment, userId) {
        const resolvedUserId = await requireUserId(userId, 'Authentication required')
        if (equipment.id) delete equipment.id
        return this.addEquipment(equipment, resolvedUserId)
    }
    /**
     * Updates an equipment record and dispatches a notifications refresh
     * so verification status badges update across the UI.
     */
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
    /** Soft-deletes an equipment record. */
    static async deleteEquipment(id) {
        ValidationUtility.requireUUID(id, 'Equipment ID is required')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/delete`, { id }, 'Failed to delete equipment')
    }
    /** Records a field-level change in the equipment history audit trail. */
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
    /** Fetches cleanliness rating history, optionally filtered by equipment ID and time range. */
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
    /** Fetches condition rating history, optionally filtered by equipment ID and time range. */
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
    /** Fetches all equipment with a specific status value. */
    static async getEquipmentsByStatus(status) {
        if (!status) throw new Error('Status is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-by-status`,
            { status },
            'Failed to fetch equipment by status'
        )
        return (json?.data ?? []).map((row) => new Equipment(row))
    }
    /** Searches equipment by identifying number (partial match). */
    static async searchEquipmentsByIdentifyingNumber(query) {
        if (!query?.trim()) throw new Error('Search query is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/search-by-identifying-number`,
            { query: query.trim() },
            'Failed to search equipment'
        )
        return (json?.data ?? []).map((row) => new Equipment(row))
    }
    /** Fetches equipment that hasn't been serviced within the given day threshold. */
    static async getEquipmentsNeedingService(dayThreshold = 30) {
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-needing-service`,
            { dayThreshold },
            'Failed to fetch equipment needing service'
        )
        return (json?.data ?? []).map((row) => new Equipment(row))
    }
    /** Fetches all comments for a specific equipment record. */
    static async fetchComments(equipmentId) {
        ValidationUtility.requireUUID(equipmentId, 'Equipment ID is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-comments`,
            { equipmentId },
            'Failed to fetch comments'
        )
        return (json?.data ?? []).map((row) => EquipmentComment.fromRow(row))
    }
    /** Adds a text comment to an equipment record. */
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
    /** Deletes a comment by its UUID. */
    static async deleteComment(commentId) {
        ValidationUtility.requireUUID(commentId, 'Comment ID is required')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/delete-comment`, { commentId }, 'Failed to delete comment')
    }
    /** Fetches all open issues for a specific equipment record. */
    static async fetchIssues(equipmentId) {
        ValidationUtility.requireUUID(equipmentId, 'Equipment ID is required')
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-issues`, { equipmentId }, 'Failed to fetch issues')
        return json?.data ?? []
    }
    /** Reports a new maintenance issue with severity classification. */
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
    /** Deletes an issue by its UUID. */
    static async deleteIssue(issueId) {
        ValidationUtility.requireUUID(issueId, 'Issue ID is required')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/delete-issue`, { issueId }, 'Failed to delete issue')
    }
    /** Marks an issue as completed/resolved. */
    static async completeIssue(issueId) {
        ValidationUtility.requireUUID(issueId, 'Issue ID is required')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/complete-issue`, { issueId }, 'Failed to complete issue')
    }
    /**
     * Fetches all equipment with enriched details (comments count, issues count, status history).
     * Optionally filtered by region codes.
     */
    static async fetchEquipmentsWithDetails(regionCodes = null) {
        return fetchWithDetailsBase({
            fetchAllFn: () => this.getAllEquipments(),
            historyTableName: 'heavy_equipment_history',
            idColumnName: 'equipment_id',
            regionCodes
        })
    }
    /** Marks equipment as verified by the given user and refreshes notification badges. */
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
