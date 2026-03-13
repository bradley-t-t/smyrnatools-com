import PickupTruck from '../app/models/pickup-trucks/PickupTruck'
import {
    apiPostOrThrow,
    apiPostRequireSuccess,
    fetchWithDetailsBase,
    getDuplicateFieldValues,
    requireUserId,
    resolveEntityId
} from '../utils/BaseAssetUtility'
import { ValidationUtility } from '../utils/ValidationUtility'
import BaseAssetService from './BaseAssetService'

const SERVICE_PREFIX = '/pickup-truck-service'

const baseService = new BaseAssetService({
    commentsTable: 'pickup_trucks_comments',
    entityIdParam: 'pickupId',
    entityName: 'Pickup Truck',
    idColumn: 'truck_id',
    issuesTable: 'pickup_trucks_maintenance',
    servicePrefix: SERVICE_PREFIX
})

/**
 * Pickup truck CRUD, comments, issues, history, and verification service.
 * Delegates shared asset operations to BaseAssetService.
 */
class PickupTruckServiceImpl {
    static async fetchAllCommentsCounts(pickupTruckIds) {
        return baseService.fetchAllCommentsCounts(pickupTruckIds)
    }
    static async fetchAllIssuesCounts(pickupTruckIds) {
        return baseService.fetchAllIssuesCounts(pickupTruckIds)
    }
    static async getAll() {
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-all`, {}, 'Failed to fetch pickup trucks')
        return (json?.data ?? []).map(PickupTruck.fromApiFormat)
    }
    /** Fetches all pickup trucks with enriched details, optionally filtered by region. */
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
    /** Verifies a pickup truck by updating its last-verified timestamp. */
    static async verify(pickupId, userId) {
        const id = resolveEntityId(pickupId)
        ValidationUtility.requireUUID(id, 'Pickup Truck ID is required')
        const resolvedUserId = await requireUserId(userId)
        const payload = { id, pickup: { updatedLast: new Date().toISOString() }, userId: resolvedUserId }
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/update`, payload, 'Failed to verify pickup truck')
        return PickupTruck.fromApiFormat(json?.data)
    }
    /** Detects duplicate VINs across pickup trucks for data quality alerts. */
    static getDuplicateVINs(pickups) {
        return getDuplicateFieldValues(pickups, (p) => {
            const key = String(p.vin || '')
                .trim()
                .toUpperCase()
                .replace(/\s+/g, '')
            return key || null
        })
    }
    /** Detects duplicate assignee names for data quality alerts. */
    static getDuplicateAssigned(pickups) {
        return getDuplicateFieldValues(pickups, (p) => {
            const key = String(p.assigned || '')
                .trim()
                .toLowerCase()
            return key || null
        })
    }
    static async fetchComments(pickupId) {
        return baseService.fetchComments(pickupId)
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
        return baseService.fetchIssues(pickupId)
    }
    static async completeIssue(issueId) {
        return baseService.completeIssue(issueId)
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
        return baseService.deleteIssue(issueId)
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
