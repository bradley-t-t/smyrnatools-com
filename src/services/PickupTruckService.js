import PickupTruck from '../models/pickup-trucks/PickupTruck'
import {
    apiPostOrThrow,
    apiPostRequireSuccess,
    fetchAllCountsFromTable,
    fetchAllOpenIssueCountsFromTable,
    fetchWithDetailsBase,
    getDuplicateFieldValues,
    requireUserId,
    resolveEntityId
} from '../utils/BaseAssetUtility'
import { ValidationUtility } from '../utils/ValidationUtility'

const SERVICE_PREFIX = '/pickup-truck-service'

class PickupTruckServiceImpl {
    static async fetchAllCommentsCounts(pickupTruckIds) {
        return fetchAllCountsFromTable('pickup_trucks_comments', 'truck_id', pickupTruckIds)
    }

    static async fetchAllIssuesCounts(pickupTruckIds) {
        return fetchAllOpenIssueCountsFromTable('pickup_trucks_maintenance', 'truck_id', pickupTruckIds)
    }

    static async getAll() {
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-all`, {}, 'Failed to fetch pickup trucks')
        return (json?.data ?? []).map(PickupTruck.fromApiFormat)
    }

    static async fetchAll(regionCodes = null) {
        return fetchWithDetailsBase({
            fetchAllFn: () => this.getAll(),
            historyTableName: 'pickup_trucks_history',
            idColumnName: 'truck_id',
            regionCodes
        })
    }

    static async getById(id) {
        ValidationUtility.requireUUID(id, 'Pickup Truck ID is required')
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-by-id`, { id }, 'Failed to fetch pickup truck')
        return json?.data ? PickupTruck.fromApiFormat(json.data) : null
    }

    static async create(pickup, userId) {
        const resolvedUserId = await requireUserId(userId, 'Authentication required')
        if (pickup?.id) delete pickup.id
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/create`,
            { pickup, userId: resolvedUserId },
            'Failed to create pickup truck'
        )
        return PickupTruck.fromApiFormat(json?.data)
    }

    static async update(id, pickup, userId) {
        const pickupId = resolveEntityId(id)
        ValidationUtility.requireUUID(pickupId, 'Pickup Truck ID is required')
        const resolvedUserId = await requireUserId(userId)
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/update`,
            { id: pickupId, pickup, userId: resolvedUserId },
            'Failed to update pickup truck'
        )
        return PickupTruck.fromApiFormat(json?.data)
    }

    static async remove(id) {
        ValidationUtility.requireUUID(id, 'Pickup Truck ID is required')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/delete`, { id }, 'Failed to delete pickup truck')
    }

    static async searchByVin(query) {
        if (!query?.trim()) throw new Error('Search query is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/search-by-vin`,
            { query: query.trim() },
            'Failed to search pickup trucks by VIN'
        )
        return (json?.data ?? []).map(PickupTruck.fromApiFormat)
    }

    static async searchByAssigned(query) {
        if (!query?.trim()) throw new Error('Search query is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/search-by-assigned`,
            { query: query.trim() },
            'Failed to search pickup trucks by assignee'
        )
        return (json?.data ?? []).map(PickupTruck.fromApiFormat)
    }

    static async verify(pickupId, userId) {
        const id = resolveEntityId(pickupId)
        ValidationUtility.requireUUID(id, 'Pickup Truck ID is required')
        const resolvedUserId = await requireUserId(userId)
        const payload = { id, pickup: { updatedLast: new Date().toISOString() }, userId: resolvedUserId }
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/update`, payload, 'Failed to verify pickup truck')
        return PickupTruck.fromApiFormat(json?.data)
    }

    static getDuplicateVINs(pickups) {
        return getDuplicateFieldValues(pickups, (p) => {
            const key = String(p.vin || '')
                .trim()
                .toUpperCase()
                .replace(/\s+/g, '')
            return key || null
        })
    }

    static getDuplicateAssigned(pickups) {
        return getDuplicateFieldValues(pickups, (p) => {
            const key = String(p.assigned || '')
                .trim()
                .toLowerCase()
            return key || null
        })
    }

    static async fetchComments(pickupId) {
        ValidationUtility.requireUUID(pickupId, 'Pickup Truck ID is required')
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-comments`, { pickupId }, 'Failed to fetch comments')
        return json?.data ?? []
    }

    static async addComment(pickupId, text, author) {
        ValidationUtility.requireUUID(pickupId, 'Pickup Truck ID is required')
        if (!text?.trim()) throw new Error('Comment text is required')
        if (!author) throw new Error('Author is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/add-comment`,
            { author, pickupId, text },
            'Failed to add comment'
        )
        return json?.data
    }

    static async deleteComment(commentId) {
        ValidationUtility.requireUUID(commentId, 'Comment ID is required')
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/delete-comment`, { commentId }, 'Failed to delete comment')
        return json?.success ?? false
    }

    static async fetchIssues(pickupId) {
        ValidationUtility.requireUUID(pickupId, 'Pickup Truck ID is required')
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-issues`, { pickupId }, 'Failed to fetch issues')
        return json?.data ?? []
    }

    static async completeIssue(issueId) {
        ValidationUtility.requireUUID(issueId, 'Issue ID is required')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/complete-issue`, { issueId }, 'Failed to complete issue')
    }

    static async addIssue(pickupId, issue, severity, createdBy = null) {
        ValidationUtility.requireUUID(pickupId, 'Pickup Truck ID is required')
        if (!issue?.trim()) throw new Error('Issue description is required')
        if (!['Low', 'Medium', 'High'].includes(severity)) throw new Error('Severity must be Low, Medium, or High')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/add-issue`,
            {
                issue: issue.trim(),
                pickupId,
                severity,
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

    static async fetchHistory(pickupId, limit = null) {
        ValidationUtility.requireUUID(pickupId, 'Pickup Truck ID is required')
        const payload = { pickupId }
        if (limit !== null && Number.isInteger(limit) && limit > 0) payload.limit = limit
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-history`, payload, 'Failed to fetch history')
        return json?.data ?? []
    }
}

export const PickupTruckService = PickupTruckServiceImpl
export default PickupTruckServiceImpl
