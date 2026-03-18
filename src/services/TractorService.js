import { Tractor } from '../app/models/tractors/Tractor'
import { TractorComment } from '../app/models/tractors/TractorComment'
import { TractorHistory } from '../app/models/tractors/TractorHistory'
import {
    apiPostOrThrow,
    apiPostRequireSuccess,
    ensureSpareIfNoOperatorBase,
    fetchWithDetailsBase,
    normalizeSeverity,
    requireUserId,
    resolveEntityId,
    resolveUserIdOrAnonymous,
    toSnakeCase,
    uppercaseVin
} from '../utils/BaseAssetUtility'
import CleanupUtility from '../utils/CleanupUtility'
import { ValidationUtility } from '../utils/ValidationUtility'
import VerifiedUtility from '../utils/VerifiedUtility'
import BaseAssetService from './BaseAssetService'

const SERVICE_PREFIX = '/tractor-service'

const baseService = new BaseAssetService({
    commentModelFn: TractorComment.fromRow,
    commentsTable: 'tractors_comments',
    entityIdParam: 'tractorId',
    entityName: 'Tractor',
    idColumn: 'tractor_id',
    issuesTable: 'tractors_maintenance',
    servicePrefix: SERVICE_PREFIX
})

/** Fields that are allowed in the tractor history audit trail. */
const ALLOWED_HISTORY_FIELDS = [
    'truck_number',
    'assigned_plant',
    'assigned_operator',
    'last_service_date',
    'cleanliness_rating',
    'has_blower',
    'vin',
    'make',
    'model',
    'year',
    'freight',
    'status'
]
/** Attaches an isVerified() method and uppercases VIN on a tractor instance. */
function enrichTractorWithVerification(tractor) {
    tractor.vin = (tractor.vin || '').toUpperCase()
    tractor.isVerified = () => VerifiedUtility.isVerified(tractor.updatedLast, tractor.updatedAt, tractor.updatedBy)
    return tractor
}
/**
 * Tractor CRUD, history, comments, issues, and verification service.
 * Delegates shared asset operations to BaseAssetService.
 */
export class TractorService {
    static async getAllTractors() {
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-all`, {}, 'Failed to fetch tractors')
        return (json?.data ?? []).map(Tractor.fromApiFormat)
    }
    static async fetchTractors() {
        return this.getAllTractors()
    }
    static async getTractorById(id) {
        ValidationUtility.requireUUID(id, 'Tractor ID is required')
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-by-id`, { id }, 'Failed to fetch tractor')
        return json?.data ? Tractor.fromApiFormat(json.data) : null
    }
    static async fetchTractorById(id) {
        ValidationUtility.requireUUID(id, 'Invalid tractor ID')
        const tractor = await this.getTractorById(id)
        return tractor ? enrichTractorWithVerification(tractor) : null
    }
    /** Fetches the most recent history entry date for a tractor. */
    static async getLatestHistoryDate(tractorId) {
        return baseService.getLatestHistoryDate(tractorId)
    }
    static async getActiveTractors() {
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-active`, {}, 'Failed to fetch active tractors')
        return (json?.data ?? []).map(Tractor.fromApiFormat)
    }
    static async getTractorHistory(tractorId, limit = null) {
        ValidationUtility.requireUUID(tractorId, 'Tractor ID is required')
        const payload = { tractorId }
        if (limit && Number.isInteger(limit) && limit > 0) payload.limit = limit
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-history`, payload, 'Failed to fetch tractor history')
        return (json?.data ?? []).map(TractorHistory.fromApiFormat)
    }
    /** Creates a new tractor, uppercasing VIN before submission. */
    static async addTractor(tractor, userId) {
        uppercaseVin(tractor)
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/create`, { tractor, userId }, 'Failed to create tractor')
        return Tractor.fromApiFormat(json?.data)
    }
    /** Creates a tractor with user ID resolution, ID cleanup, and VIN normalization. */
    static async createTractor(tractor, userId) {
        const resolvedUserId = await requireUserId(userId, 'Authentication required')
        if (tractor.id) delete tractor.id
        uppercaseVin(tractor)
        return this.addTractor(tractor, resolvedUserId)
    }
    /**
     * Updates a tractor record. Clears operator assignment when the plant changes
     * to prevent cross-plant operator assignments.
     */
    static async updateTractor(tractorId, tractor, userId, _prevTractorState = null) {
        const id = resolveEntityId(tractorId)
        ValidationUtility.requireUUID(id, 'Tractor ID is required')
        const resolvedUserId = await requireUserId(userId)
        uppercaseVin(tractor)
        if (_prevTractorState?.assignedPlant !== tractor.assignedPlant) {
            tractor.assignedOperator = null
        }
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/update`,
            { id, tractor, userId: resolvedUserId },
            'Failed to update tractor'
        )
        return Tractor.fromApiFormat(json?.data)
    }
    /** Marks a tractor as verified. */
    static async verifyTractor(tractorId, userId) {
        const id = resolveEntityId(tractorId)
        ValidationUtility.requireUUID(id, 'Tractor ID is required')
        const resolvedUserId = await requireUserId(userId)
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/verify`,
            { id, userId: resolvedUserId },
            'Failed to verify tractor'
        )
        return Tractor.fromApiFormat(json?.data)
    }
    static async deleteTractor(id) {
        ValidationUtility.requireUUID(id, 'Tractor ID is required')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/delete`, { id }, 'Failed to delete tractor')
    }
    /**
     * Records a field-level change in the tractor history audit trail.
     * Only allowed fields are recorded; VIN values are uppercased.
     */
    static async createHistoryEntry(tractorId, fieldName, oldValue, newValue, changedBy) {
        ValidationUtility.requireUUID(tractorId, 'Tractor ID is required')
        if (!fieldName) throw new Error('Field name required')
        const snakeCaseField = toSnakeCase(fieldName)
        if (!ALLOWED_HISTORY_FIELDS.includes(snakeCaseField)) return null
        const finalNewValue = snakeCaseField === 'vin' ? (newValue || '').toUpperCase() : newValue
        // Tractor has custom field filtering logic, so we call the API directly
        // rather than delegating to baseService.createHistoryEntry
        const userId = await resolveUserIdOrAnonymous(changedBy)
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/add-history`,
            {
                changedBy: userId,
                fieldName: snakeCaseField,
                newValue: finalNewValue,
                oldValue,
                tractorId
            },
            'Failed to create history entry'
        )
        return json?.data
    }
    static async getCleanlinessHistory(tractorId = null, months = 6) {
        const payload = {}
        if (tractorId) payload.tractorId = tractorId
        if (months) payload.months = months
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-cleanliness-history`,
            payload,
            'Failed to fetch cleanliness history'
        )
        return json?.data ?? []
    }
    static async getTractorsByOperator(operatorId) {
        ValidationUtility.requireUUID(operatorId, 'Operator ID is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-by-operator`,
            { operatorId },
            'Failed to fetch tractors by operator'
        )
        return (json?.data ?? []).map(Tractor.fromApiFormat)
    }
    static async getTractorsByStatus(status) {
        if (!status) throw new Error('Status is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-by-status`,
            { status },
            'Failed to fetch tractors by status'
        )
        return (json?.data ?? []).map(Tractor.fromApiFormat)
    }
    static async searchTractorsByTruckNumber(query) {
        if (!query?.trim()) throw new Error('Search query is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/search-by-truck-number`,
            { query: query.trim() },
            'Failed to search tractors'
        )
        return (json?.data ?? []).map(Tractor.fromApiFormat)
    }
    static async searchTractorsByVin(query) {
        if (!query?.trim()) throw new Error('Search query is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/search-by-vin`,
            { query: query.trim().toUpperCase() },
            'Failed to search tractors by VIN'
        )
        return (json?.data ?? []).map(Tractor.fromApiFormat)
    }
    static async searchTractorsByVinProcessed(query) {
        const vinTractors = await this.searchTractorsByVin(query)
        return vinTractors.map((t) => {
            t.isVerified = () => VerifiedUtility.isVerified(t.updatedLast, t.updatedAt, t.updatedBy)
            if (typeof t.openIssuesCount !== 'number') t.openIssuesCount = 0
            if (typeof t.commentsCount !== 'number') t.commentsCount = 0
            return t
        })
    }
    static async getTractorsNeedingService(dayThreshold = 30) {
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-needing-service`,
            { dayThreshold },
            'Failed to fetch tractors needing service'
        )
        return (json?.data ?? []).map(Tractor.fromApiFormat)
    }
    static async fetchAllCommentsCounts(tractorIds) {
        return baseService.fetchAllCommentsCounts(tractorIds)
    }
    static async fetchAllIssuesCounts(tractorIds) {
        return baseService.fetchAllIssuesCounts(tractorIds)
    }
    static async fetchComments(tractorId) {
        return baseService.fetchComments(tractorId)
    }
    static async addComment(tractorId, text, author) {
        return baseService.addComment(tractorId, text, author)
    }
    static async deleteComment(commentId) {
        return baseService.deleteComment(commentId)
    }
    static async _fetchHistoryDates() {
        const tractors = await this.getAllTractors()
        return Object.fromEntries(tractors.map((t) => [t.id, t.latestHistoryDate ?? null]))
    }
    static async fetchIssues(tractorId) {
        return baseService.fetchIssues(tractorId)
    }
    static async addIssue(tractorId, issueText, severity, createdBy = null) {
        ValidationUtility.requireUUID(tractorId, 'Tractor ID is required')
        if (!issueText?.trim()) throw new Error('Issue description is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/add-issue`,
            {
                issue: issueText.trim(),
                severity: normalizeSeverity(severity),
                tractorId,
                userId: createdBy
            },
            'Failed to add issue'
        )
        return json?.data
    }
    static async deleteIssue(issueId) {
        return baseService.deleteIssue(issueId)
    }
    static async completeIssue(issueId) {
        return baseService.completeIssue(issueId)
    }
    /**
     * Fetches all tractors with enriched details (comments count, issues count, status history, verification).
     * Optionally filtered by region codes.
     */
    static async fetchTractorsWithDetails(regionCodes = null) {
        return fetchWithDetailsBase({
            enrichFn: enrichTractorWithVerification,
            fetchAllFn: () => this.getAllTractors(),
            historyTableName: 'tractors_history',
            idColumnName: 'tractor_id',
            regionCodes
        })
    }
    /** Sets unassigned-operator tractors to Spare status in batch. */
    static async ensureSpareIfNoOperator(tractorsList) {
        return ensureSpareIfNoOperatorBase(tractorsList, async (t) => {
            await this.updateTractor(t.id, { ...t, status: 'Spare' }, undefined, t)
        })
    }
    /** Batch-corrects null operator fields by setting affected tractors to Spare. */
    static async cleanupNullOperators(tractors = null) {
        return CleanupUtility.cleanupNullOperators(
            tractors,
            (id, updates, userId) => this.updateTractor(id, updates, userId),
            () => this.getAllTractors()
        )
    }
}
