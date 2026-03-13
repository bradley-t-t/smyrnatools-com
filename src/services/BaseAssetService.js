import {
    apiPostOrThrow,
    apiPostRequireSuccess,
    fetchAllCountsFromTable,
    fetchAllOpenIssueCountsFromTable,
    resolveUserIdOrAnonymous
} from '../utils/BaseAssetUtility'
import { ValidationUtility } from '../utils/ValidationUtility'

/**
 * Base class for asset services that share common patterns for comments,
 * issues, history, and bulk count operations. Each concrete service provides
 * a config object specifying its table names, column names, and entity label.
 */
class BaseAssetService {
    /**
     * @param {Object} config
     * @param {string} config.servicePrefix     - API route prefix (e.g. '/mixer-service')
     * @param {string} config.commentsTable      - database table for comments (e.g. 'mixers_comments')
     * @param {string} config.issuesTable        - database table for issues (e.g. 'mixers_maintenance')
     * @param {string} config.idColumn           - Column name for entity FK (e.g. 'mixer_id')
     * @param {string} config.entityIdParam      - API payload key for entity ID (e.g. 'mixerId')
     * @param {string} config.entityName         - Human-readable name for error messages (e.g. 'Mixer')
     * @param {Function} [config.commentModelFn] - Optional function to map raw comment rows to model instances
     */
    constructor(config) {
        this.servicePrefix = config.servicePrefix
        this.commentsTable = config.commentsTable
        this.issuesTable = config.issuesTable
        this.idColumn = config.idColumn
        this.entityIdParam = config.entityIdParam
        this.entityName = config.entityName
        this.commentModelFn = config.commentModelFn || null
    }

    // ── Comments ──────────────────────────────────────────────────────

    async fetchComments(entityId) {
        ValidationUtility.requireUUID(entityId, `${this.entityName} ID is required`)
        const json = await apiPostOrThrow(
            `${this.servicePrefix}/fetch-comments`,
            { [this.entityIdParam]: entityId },
            'Failed to fetch comments'
        )
        const rows = json?.data ?? []
        return this.commentModelFn ? rows.map(this.commentModelFn) : rows
    }

    async addComment(entityId, text, author) {
        ValidationUtility.requireUUID(entityId, `${this.entityName} ID is required`)
        if (!text?.trim()) throw new Error('Comment text is required')
        if (!author?.trim?.()) throw new Error('Author is required')
        const json = await apiPostOrThrow(
            `${this.servicePrefix}/add-comment`,
            {
                author: typeof author === 'string' ? author.trim() : author,
                [this.entityIdParam]: entityId,
                text: typeof text === 'string' ? text.trim() : text
            },
            'Failed to add comment'
        )
        const row = json?.data
        if (!row) return null
        return this.commentModelFn ? this.commentModelFn(row) : row
    }

    async deleteComment(commentId) {
        ValidationUtility.requireUUID(commentId, 'Comment ID is required')
        return apiPostRequireSuccess(`${this.servicePrefix}/delete-comment`, { commentId }, 'Failed to delete comment')
    }

    // ── Issues ────────────────────────────────────────────────────────

    async fetchIssues(entityId) {
        ValidationUtility.requireUUID(entityId, `${this.entityName} ID is required`)
        const json = await apiPostOrThrow(
            `${this.servicePrefix}/fetch-issues`,
            { [this.entityIdParam]: entityId },
            'Failed to fetch issues'
        )
        return json?.data ?? []
    }

    async completeIssue(issueId) {
        ValidationUtility.requireUUID(issueId, 'Issue ID is required')
        return apiPostRequireSuccess(`${this.servicePrefix}/complete-issue`, { issueId }, 'Failed to complete issue')
    }

    async deleteIssue(issueId) {
        ValidationUtility.requireUUID(issueId, 'Issue ID is required')
        return apiPostRequireSuccess(`${this.servicePrefix}/delete-issue`, { issueId }, 'Failed to delete issue')
    }

    // ── Bulk Counts ───────────────────────────────────────────────────

    async fetchAllCommentsCounts(entityIds) {
        return fetchAllCountsFromTable(this.commentsTable, this.idColumn, entityIds)
    }

    async fetchAllIssuesCounts(entityIds) {
        return fetchAllOpenIssueCountsFromTable(this.issuesTable, this.idColumn, entityIds)
    }

    // ── History ───────────────────────────────────────────────────────

    /**
     * Records a field-level change in the entity's history audit trail.
     * Uppercases VIN values automatically.
     */
    async createHistoryEntry(entityId, fieldName, oldValue, newValue, changedBy) {
        ValidationUtility.requireUUID(entityId, `${this.entityName} ID is required`)
        if (!fieldName) throw new Error('Field name required')
        const userId = await resolveUserIdOrAnonymous(changedBy)
        const finalNewValue = fieldName === 'vin' ? (newValue || '').toUpperCase() : newValue
        const json = await apiPostOrThrow(
            `${this.servicePrefix}/add-history`,
            {
                changedBy: userId,
                fieldName,
                [this.entityIdParam]: entityId,
                newValue: finalNewValue,
                oldValue
            },
            'Failed to create history entry'
        )
        return json?.data
    }

    /** Fetches the most recent history entry date for an entity. */
    async getLatestHistoryDate(entityId) {
        if (!entityId) return null
        const json = await apiPostOrThrow(
            `${this.servicePrefix}/fetch-history`,
            { limit: 1, [this.entityIdParam]: entityId },
            'Failed to fetch history'
        ).catch(() => null)
        if (!json) return null
        return (json?.data ?? [])[0]?.changed_at ?? null
    }
}

export default BaseAssetService
