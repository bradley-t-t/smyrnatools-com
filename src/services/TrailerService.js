import Trailer from '../app/models/trailers/Trailer'
import {
    apiPostOrThrow,
    apiPostRequireSuccess,
    fetchWithDetailsBase,
    normalizeSeverity,
    resolveEntityId
} from '../utils/BaseAssetUtility'
import { ValidationUtility } from '../utils/ValidationUtility'
import BaseAssetService from './BaseAssetService'

const SERVICE_PREFIX = '/trailer-service'

const baseService = new BaseAssetService({
    commentsTable: 'trailers_comments',
    entityIdParam: 'trailerId',
    entityName: 'Trailer',
    idColumn: 'trailer_id',
    issuesTable: 'trailers_maintenance',
    servicePrefix: SERVICE_PREFIX
})

/**
 * Trailer CRUD, comments, issues, history, and search service.
 * Uses a plain object pattern (vs class) and delegates shared operations to BaseAssetService.
 */
const TrailerService = {
    /** Adds a text comment to a trailer record. */
    async addComment(trailerId, commentText, userId) {
        ValidationUtility.requireUUID(trailerId, `Invalid trailer ID format: ${trailerId}`)
        if (!commentText?.trim()) throw new Error('Comment text is required')
        if (!userId?.trim?.()) throw new Error('Author is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/add-comment`,
            {
                author: userId.trim(),
                text: commentText.trim(),
                trailerId
            },
            'Failed to add comment'
        )
        return json?.data ?? null
    },
    /** Reports a new maintenance issue with severity classification. */
    async addIssue(trailerId, issueText, severity, createdBy = null) {
        ValidationUtility.requireUUID(trailerId, `Invalid trailer ID format: ${trailerId}`)
        if (!issueText?.trim()) throw new Error('Issue description is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/add-issue`,
            {
                issue: issueText.trim(),
                severity: normalizeSeverity(severity),
                trailerId,
                userId: createdBy
            },
            'Failed to add issue'
        )
        return json?.data ?? null
    },
    /** Marks an issue as completed/resolved. */
    async completeIssue(issueId) {
        return baseService.completeIssue(issueId)
    },
    /** Records a field-level change in the trailer history audit trail. */
    async createHistoryEntry(trailerId, fieldName, oldValue, newValue, changedBy) {
        return baseService.createHistoryEntry(trailerId, fieldName, oldValue, newValue, changedBy)
    },
    /** Creates a new trailer record. */
    async createTrailer(trailer, userId) {
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/create`, { trailer, userId }, 'Failed to create trailer')
        return json?.data ? Trailer.fromApiFormat(json.data) : null
    },
    async deleteComment(commentId) {
        ValidationUtility.requireUUID(commentId, `Invalid comment ID format: ${commentId}`)
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/delete-comment`, { commentId }, 'Failed to delete comment')
    },
    async deleteIssue(issueId) {
        ValidationUtility.requireUUID(issueId, `Invalid issue ID format: ${issueId}`)
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/delete-issue`, { issueId }, 'Failed to delete issue')
    },
    async deleteTrailer(id) {
        ValidationUtility.requireUUID(id, `Invalid trailer ID format: ${id}`)
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/delete`, { id }, 'Failed to delete trailer')
    },
    async fetchAllCommentsCounts(trailerIds) {
        return baseService.fetchAllCommentsCounts(trailerIds)
    },
    async fetchAllIssuesCounts(trailerIds) {
        return baseService.fetchAllIssuesCounts(trailerIds)
    },
    async fetchComments(trailerId) {
        ValidationUtility.requireUUID(trailerId, `Invalid trailer ID format: ${trailerId}`)
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-comments`, { trailerId }, 'Failed to fetch comments')
        return json?.data ?? []
    },
    async fetchIssues(trailerId) {
        return baseService.fetchIssues(trailerId)
    },

    /** Fetches a single trailer by ID, handling both string and object ID arguments. */
    async fetchTrailerById(trailerId) {
        if (!trailerId) throw new Error('Trailer ID is required')
        if (typeof trailerId === 'object') trailerId = trailerId.id || trailerId.trailerId || ''
        ValidationUtility.requireUUID(trailerId, `Invalid trailer ID format: ${trailerId}`)
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-by-id`, { id: trailerId }, 'Failed to fetch trailer')
        return json?.data ? Trailer.fromApiFormat(json.data) : null
    },

    /** Fetches all trailers from the API. */
    async fetchTrailers() {
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-all`, {}, 'Failed to fetch trailers')
        return (json?.data ?? []).map(Trailer.fromApiFormat)
    },
    /**
     * Fetches all trailers with enriched details (comments count, issues count, status history).
     * Optionally filtered by region codes.
     */
    async fetchTrailersWithDetails(regionCodes = null) {
        return fetchWithDetailsBase({
            fetchAllFn: () => this.fetchTrailers(),
            historyTableName: 'trailers_history',
            idColumnName: 'trailer_id',
            regionCodes
        })
    },
    async getActiveTrailers() {
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-active`, {}, 'Failed to fetch active trailers')
        return (json?.data ?? []).map(Trailer.fromApiFormat)
    },
    async getCleanlinessHistory(trailerId = null, months = 6) {
        const payload = {}
        if (trailerId) {
            ValidationUtility.requireUUID(trailerId, `Invalid trailer ID format: ${trailerId}`)
            payload.trailerId = trailerId
        }
        if (months) payload.months = months
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-cleanliness-history`,
            payload,
            'Failed to fetch cleanliness history'
        )
        return json?.data ?? []
    },
    async getTrailerHistory(trailerId, limit = null) {
        ValidationUtility.requireUUID(trailerId, `Invalid trailer ID format: ${trailerId}`)
        const payload = { trailerId }
        if (limit && Number.isInteger(limit)) payload.limit = limit
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-history`, payload, 'Failed to fetch trailer history')
        return json?.data ?? []
    },
    async getTrailersByStatus(status) {
        if (!status) throw new Error('Status is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-by-status`,
            { status },
            'Failed to fetch trailers by status'
        )
        return (json?.data ?? []).map(Trailer.fromApiFormat)
    },
    async searchTrailersByTrailerNumber(query) {
        if (!query?.trim()) throw new Error('Search query is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/search-by-trailer-number`,
            { query: query.trim() },
            'Failed to search trailers'
        )
        return (json?.data ?? []).map(Trailer.fromApiFormat)
    },
    async searchTrailersByVin(query) {
        if (!query?.trim()) throw new Error('Search query is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/search-by-vin`,
            { query: query.trim().toUpperCase() },
            'Failed to search trailers by VIN'
        )
        return (json?.data ?? []).map(Trailer.fromApiFormat)
    },
    /** Searches trailers by VIN with defaults for missing count properties. */
    async searchTrailersByVinProcessed(query) {
        const vinTrailers = await this.searchTrailersByVin(query)
        return vinTrailers.map((t) => {
            if (typeof t.openIssuesCount !== 'number') t.openIssuesCount = 0
            if (typeof t.commentsCount !== 'number') t.commentsCount = 0
            return t
        })
    },
    /** Updates a trailer record, ensuring proper model instantiation. */
    async updateTrailer(trailerId, updatedTrailer, userId, _oldTrailer) {
        const id = resolveEntityId(trailerId)
        ValidationUtility.requireUUID(id, `Invalid trailer ID format: ${id}`)
        const trailer = updatedTrailer instanceof Trailer ? updatedTrailer : Trailer.ensureInstance(updatedTrailer)
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/update`,
            { id, trailer, userId },
            'Failed to update trailer'
        )
        return json?.data ? Trailer.fromApiFormat(json.data) : null
    }
}
export { TrailerService }
export default TrailerService
