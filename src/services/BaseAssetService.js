import {
    apiPostOrThrow,
    apiPostRequireSuccess,
    fetchAllCountsFromTable,
    fetchAllOpenIssueCountsFromTable,
    fetchWithDetailsBase,
    normalizeSeverity,
    requireUserId,
    resolveEntityId,
    resolveUserIdOrAnonymous,
    toSnakeCase,
    uppercaseVin as uppercaseVinHelper
} from '../utils/BaseAssetUtility'
import { ValidationUtility } from '../utils/ValidationUtility'

/** Identity function used as the default row parser when none is configured. */
const identity = (row) => row

/**
 * Base service for fleet assets (mixers, tractors, trailers, equipment, pickup trucks).
 *
 * Provides the shared CRUD/history/comments/issues/verify pipeline. Concrete
 * services compose this by passing a config object — they only need to expose
 * their domain-typed method names (getAllMixers, fetchTractorById, etc.) as
 * thin delegations to the corresponding generic methods here.
 *
 * @param {Object} config
 * @param {string} config.servicePrefix          - API route prefix (e.g. '/mixer-service')
 * @param {string} config.entityName             - Human-readable name for errors (e.g. 'Mixer')
 * @param {string} config.entityKey              - JSON payload key for the entity body (e.g. 'mixer')
 * @param {string} config.entityIdParam          - Payload key for entity ID in subresource calls (e.g. 'mixerId')
 * @param {string} config.idColumn               - DB column for entity FK (e.g. 'mixer_id')
 * @param {string} config.commentsTable          - DB table for comments
 * @param {string} config.issuesTable            - DB table for maintenance issues
 * @param {string} [config.historyTable]         - DB table for history rows (used by fetchWithDetails)
 * @param {Function} [config.parseRow]           - Maps a raw API row to a domain model instance
 * @param {Function} [config.parseHistoryRow]    - Maps a raw history row to a domain model instance
 * @param {Function} [config.commentModelFn]     - Maps a raw comment row to a model instance
 * @param {Function} [config.enrichFn]           - Post-parse enrichment (e.g. attaches isVerified())
 * @param {boolean}  [config.uppercaseVin=false] - Uppercase entity.vin on create/update
 * @param {boolean}  [config.clearOperatorOnPlantChange=false] - Null assignedOperator when plant changes
 * @param {string[]} [config.allowedHistoryFields] - Whitelist for createHistoryEntry (snake_case)
 */
class BaseAssetService {
    constructor(config) {
        this.servicePrefix = config.servicePrefix
        this.entityName = config.entityName
        this.entityKey = config.entityKey || null
        this.entityIdParam = config.entityIdParam
        this.idColumn = config.idColumn
        this.commentsTable = config.commentsTable
        this.issuesTable = config.issuesTable
        this.historyTable = config.historyTable || null
        this.parseRow = config.parseRow || identity
        this.parseHistoryRow = config.parseHistoryRow || identity
        this.commentModelFn = config.commentModelFn || null
        this.enrichFn = config.enrichFn || null
        this.uppercaseVin = !!config.uppercaseVin
        this.clearOperatorOnPlantChange = !!config.clearOperatorOnPlantChange
        this.allowedHistoryFields = config.allowedHistoryFields || null
    }

    // ── Row parsing helpers ───────────────────────────────────────────

    /** Parses and (optionally) enriches a single row. Returns null for falsy input. */
    _hydrate(row) {
        if (!row) return null
        const parsed = this.parseRow(row)
        return this.enrichFn ? this.enrichFn(parsed) : parsed
    }

    _hydrateList(rows) {
        return (rows ?? []).map((row) => this._hydrate(row))
    }

    // ── Core CRUD ─────────────────────────────────────────────────────

    /** Fetches all entities (no enrichment by default — call sites that need it should map themselves). */
    async getAll() {
        const json = await apiPostOrThrow(
            `${this.servicePrefix}/fetch-all`,
            {},
            `Failed to fetch ${this.entityName.toLowerCase()}s`
        )
        return (json?.data ?? []).map((row) => this.parseRow(row))
    }

    /** Fetches one entity by ID, with enrichment applied. */
    async fetchById(id) {
        const resolvedId = resolveEntityId(id)
        ValidationUtility.requireUUID(resolvedId, `Invalid ${this.entityName} ID`)
        const json = await apiPostOrThrow(
            `${this.servicePrefix}/fetch-by-id`,
            { id: resolvedId },
            `Failed to fetch ${this.entityName.toLowerCase()}`
        )
        return this._hydrate(json?.data)
    }

    /** Creates a new entity. Strips any provided id, normalizes VIN, resolves user. */
    async create(entity, userId) {
        const resolvedUserId = await requireUserId(userId, 'Authentication required')
        if (entity?.id) delete entity.id
        if (this.uppercaseVin) uppercaseVinHelper(entity)
        const payload = { [this.entityKey]: entity, userId: resolvedUserId }
        const json = await apiPostOrThrow(
            `${this.servicePrefix}/create`,
            payload,
            `Failed to create ${this.entityName.toLowerCase()}`
        )
        return this.parseRow(json?.data)
    }

    /**
     * Updates an entity. Optionally normalizes VIN and clears the operator
     * assignment when the plant changes (prevents cross-plant operator orphans).
     */
    async update(idOrEntity, entity, userId, prevState = null) {
        const id = resolveEntityId(idOrEntity)
        ValidationUtility.requireUUID(id, `${this.entityName} ID is required`)
        const resolvedUserId = await requireUserId(userId)
        if (this.uppercaseVin) uppercaseVinHelper(entity)
        if (this.clearOperatorOnPlantChange && prevState?.assignedPlant !== entity?.assignedPlant) {
            entity.assignedOperator = null
        }
        const payload = { id, [this.entityKey]: entity, userId: resolvedUserId }
        const json = await apiPostOrThrow(
            `${this.servicePrefix}/update`,
            payload,
            `Failed to update ${this.entityName.toLowerCase()}`
        )
        return this.parseRow(json?.data)
    }

    /** Calls the service's delete endpoint for the given ID. */
    async delete(id) {
        ValidationUtility.requireUUID(id, `${this.entityName} ID is required`)
        return apiPostRequireSuccess(
            `${this.servicePrefix}/delete`,
            { id },
            `Failed to delete ${this.entityName.toLowerCase()}`
        )
    }

    /** Calls the service's verify endpoint with the current user ID. */
    async verify(id, userId) {
        const resolvedId = resolveEntityId(id)
        ValidationUtility.requireUUID(resolvedId, `${this.entityName} ID is required`)
        const resolvedUserId = await requireUserId(userId)
        const json = await apiPostOrThrow(
            `${this.servicePrefix}/verify`,
            { id: resolvedId, userId: resolvedUserId },
            `Failed to verify ${this.entityName.toLowerCase()}`
        )
        return this._hydrate(json?.data)
    }

    // ── Search & filter ───────────────────────────────────────────────

    /** VIN search — uppercases the query and returns parsed (un-enriched) rows. */
    async searchByVin(query) {
        if (!query?.trim()) throw new Error('Search query is required')
        const json = await apiPostOrThrow(
            `${this.servicePrefix}/search-by-vin`,
            { query: query.trim().toUpperCase() },
            `Failed to search ${this.entityName.toLowerCase()}s by VIN`
        )
        return (json?.data ?? []).map((row) => this.parseRow(row))
    }

    /** Returns all entities currently assigned to the given operator UUID. */
    async getByOperator(operatorId) {
        ValidationUtility.requireUUID(operatorId, 'Operator ID is required')
        const json = await apiPostOrThrow(
            `${this.servicePrefix}/fetch-by-operator`,
            { operatorId },
            `Failed to fetch ${this.entityName.toLowerCase()}s by operator`
        )
        return (json?.data ?? []).map((row) => this.parseRow(row))
    }

    /** Fetches all entities enriched with comment/issue counts and status history. */
    async fetchWithDetails(regionCodes = null) {
        return fetchWithDetailsBase({
            enrichFn: this.enrichFn || undefined,
            fetchAllFn: () => this.getAll(),
            historyTableName: this.historyTable,
            idColumnName: this.idColumn,
            regionCodes
        })
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

    async addIssue(entityId, issue, severity, createdBy = null) {
        ValidationUtility.requireUUID(entityId, `${this.entityName} ID is required`)
        if (!issue?.trim()) throw new Error('Issue description is required')
        const json = await apiPostOrThrow(
            `${this.servicePrefix}/add-issue`,
            {
                [this.entityIdParam]: entityId,
                issue: issue.trim(),
                severity: normalizeSeverity(severity),
                userId: createdBy
            },
            'Failed to add issue'
        )
        return json?.data
    }

    async completeIssue(issueId) {
        ValidationUtility.requireUUID(issueId, 'Issue ID is required')
        return apiPostRequireSuccess(`${this.servicePrefix}/complete-issue`, { issueId }, 'Failed to complete issue')
    }

    async deleteIssue(issueId) {
        ValidationUtility.requireUUID(issueId, 'Issue ID is required')
        return apiPostRequireSuccess(`${this.servicePrefix}/delete-issue`, { issueId }, 'Failed to delete issue')
    }

    // ── Bulk counts ───────────────────────────────────────────────────

    async fetchAllCommentsCounts(entityIds) {
        return fetchAllCountsFromTable(this.commentsTable, this.idColumn, entityIds)
    }

    async fetchAllIssuesCounts(entityIds) {
        return fetchAllOpenIssueCountsFromTable(this.issuesTable, this.idColumn, entityIds)
    }

    // ── History ───────────────────────────────────────────────────────

    /**
     * Fetches change history for one entity, optionally limited. History rows
     * pass through `parseHistoryRow` for domain-model hydration.
     */
    async getHistory(entityId, limit = null) {
        ValidationUtility.requireUUID(entityId, `${this.entityName} ID is required`)
        const payload = { [this.entityIdParam]: entityId }
        if (limit && Number.isInteger(limit) && limit > 0) payload.limit = limit
        const json = await apiPostOrThrow(
            `${this.servicePrefix}/fetch-history`,
            payload,
            `Failed to fetch ${this.entityName.toLowerCase()} history`
        )
        return (json?.data ?? []).map((row) => this.parseHistoryRow(row))
    }

    /**
     * Records a field-level change in the entity's history audit trail. When
     * `allowedHistoryFields` is configured, fields outside the whitelist are
     * silently dropped. VIN values are auto-uppercased.
     */
    async createHistoryEntry(entityId, fieldName, oldValue, newValue, changedBy) {
        ValidationUtility.requireUUID(entityId, `${this.entityName} ID is required`)
        if (!fieldName) throw new Error('Field name required')
        const snake = toSnakeCase(fieldName)
        if (this.allowedHistoryFields && !this.allowedHistoryFields.includes(snake)) return null
        const userId = await resolveUserIdOrAnonymous(changedBy)
        const finalNewValue = snake === 'vin' ? (newValue || '').toUpperCase() : newValue
        const json = await apiPostOrThrow(
            `${this.servicePrefix}/add-history`,
            {
                changedBy: userId,
                fieldName: snake,
                [this.entityIdParam]: entityId,
                newValue: finalNewValue,
                oldValue
            },
            'Failed to create history entry'
        )
        return json?.data
    }

    /** Returns the timestamp of the most recent history entry, or null. */
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

/**
 * Factory that creates a service object with all generic asset methods pre-bound.
 * Spread the result into an entity-specific service object, then add entity-named
 * CRUD aliases and any unique methods on top.
 */
export function createAssetService(config) {
    const base = new BaseAssetService(config)
    return {
        _base: base,
        addComment: (entityId, text, author) => base.addComment(entityId, text, author),
        addIssue: (entityId, issue, severity, createdBy = null) => base.addIssue(entityId, issue, severity, createdBy),
        completeIssue: (issueId) => base.completeIssue(issueId),
        createHistoryEntry: (entityId, fieldName, oldValue, newValue, changedBy) =>
            base.createHistoryEntry(entityId, fieldName, oldValue, newValue, changedBy),
        deleteComment: (commentId) => base.deleteComment(commentId),
        deleteIssue: (issueId) => base.deleteIssue(issueId),
        fetchAllCommentsCounts: (entityIds) => base.fetchAllCommentsCounts(entityIds),
        fetchAllIssuesCounts: (entityIds) => base.fetchAllIssuesCounts(entityIds),
        fetchComments: (entityId) => base.fetchComments(entityId),
        fetchIssues: (entityId) => base.fetchIssues(entityId),
        getLatestHistoryDate: (entityId) => base.getLatestHistoryDate(entityId)
    }
}

export default BaseAssetService
