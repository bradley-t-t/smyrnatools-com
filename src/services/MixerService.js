import { v4 as uuidv4 } from 'uuid'

import { Mixer } from '../app/models/mixers/Mixer'
import { MixerComment } from '../app/models/mixers/MixerComment'
import { MixerHistory } from '../app/models/mixers/MixerHistory'
import { MixerImage } from '../app/models/mixers/MixerImage'
import {
    apiPostOrThrow,
    apiPostRequireSuccess,
    ensureSpareIfNoOperatorBase,
    fetchWithDetailsBase,
    normalizeSeverity,
    requireUserId,
    resolveEntityId,
    uppercaseVin
} from '../utils/BaseAssetUtility'
import CleanupUtility from '../utils/CleanupUtility'
import { ValidationUtility } from '../utils/ValidationUtility'
import VerifiedUtility from '../utils/VerifiedUtility'
import BaseAssetService from './BaseAssetService'

const SERVICE_PREFIX = '/mixer-service'

const baseService = new BaseAssetService({
    commentModelFn: MixerComment.fromRow,
    commentsTable: 'mixers_comments',
    entityIdParam: 'mixerId',
    entityName: 'Mixer',
    idColumn: 'mixer_id',
    issuesTable: 'mixers_maintenance',
    servicePrefix: SERVICE_PREFIX
})

/** Attaches an isVerified() method using current mixer field values. */
function enrichMixerWithVerification(mixer) {
    if (!mixer) return mixer
    mixer.isVerified = () => VerifiedUtility.isVerified(mixer.updatedLast, mixer.updatedAt, mixer.updatedBy)
    return mixer
}
/**
 * Mixer CRUD, history, comments, issues, images, and verification service.
 * Delegates shared asset operations to BaseAssetService.
 */
class MixerServiceImpl {
    static async getAllMixers() {
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-all`, {}, 'Failed to fetch mixers')
        return (json?.data ?? []).map((mixer) => new Mixer(mixer))
    }
    static async fetchMixers() {
        return this.getAllMixers()
    }
    /** Fetches a single mixer by UUID. */
    static async getMixerById(id) {
        ValidationUtility.requireUUID(id, 'Mixer ID is required')
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-by-id`, { id }, 'Failed to fetch mixer')
        return json?.data ? new Mixer(json.data) : null
    }
    /** Fetches a mixer by ID with verification status attached. */
    static async fetchMixerById(id) {
        ValidationUtility.requireUUID(id, 'Invalid mixer ID')
        const mixer = await this.getMixerById(id)
        return mixer ? enrichMixerWithVerification(mixer) : null
    }
    /** Fetches the most recent history entry date for a mixer. */
    static async getLatestHistoryDate(mixerId) {
        return baseService.getLatestHistoryDate(mixerId)
    }
    static async getActiveMixers() {
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-active`, {}, 'Failed to fetch active mixers')
        return (json?.data ?? []).map((mixer) => new Mixer(mixer))
    }
    static async getMixerHistory(mixerId, limit = null) {
        ValidationUtility.requireUUID(mixerId, 'Mixer ID is required')
        const payload = { mixerId }
        if (limit && Number.isInteger(limit) && limit > 0) payload.limit = limit
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-history`, payload, 'Failed to fetch mixer history')
        return (json?.data ?? []).map((entry) => new MixerHistory(entry))
    }
    /** Creates a new mixer, uppercasing VIN before submission. */
    static async addMixer(mixer, userId) {
        uppercaseVin(mixer)
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/create`, { mixer, userId }, 'Failed to create mixer')
        return new Mixer(json?.data)
    }
    /** Creates a mixer with user ID resolution, ID cleanup, and VIN normalization. */
    static async createMixer(mixer, userId) {
        const resolvedUserId = await requireUserId(userId, 'Authentication required')
        if (mixer.id) delete mixer.id
        uppercaseVin(mixer)
        return this.addMixer(mixer, resolvedUserId)
    }
    /**
     * Updates a mixer record. Clears operator assignment when the plant changes
     * to prevent cross-plant operator assignments.
     */
    static async updateMixer(mixerId, mixer, userId, prevMixerState = null) {
        const id = resolveEntityId(mixerId)
        ValidationUtility.requireUUID(id, 'Mixer ID is required')
        const resolvedUserId = await requireUserId(userId)
        uppercaseVin(mixer)
        if (prevMixerState?.assignedPlant !== mixer.assignedPlant) {
            mixer.assignedOperator = null
        }
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/update`,
            { id, mixer, userId: resolvedUserId },
            'Failed to update mixer'
        )
        return new Mixer(json?.data)
    }
    static async deleteMixer(id) {
        ValidationUtility.requireUUID(id, 'Mixer ID is required')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/delete`, { id }, 'Failed to delete mixer')
    }
    /** Records a field-level change in the mixer history audit trail. Uppercases VIN values. */
    static async createHistoryEntry(mixerId, fieldName, oldValue, newValue, changedBy) {
        return baseService.createHistoryEntry(mixerId, fieldName, oldValue, newValue, changedBy)
    }
    static async getCleanlinessHistory(mixerId = null, months = 6) {
        const payload = {}
        if (mixerId) payload.mixerId = mixerId
        if (months) payload.months = months
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-cleanliness-history`,
            payload,
            'Failed to fetch cleanliness history'
        )
        return json?.data ?? []
    }
    static async getMixersByOperator(operatorId) {
        ValidationUtility.requireUUID(operatorId, 'Operator ID is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-by-operator`,
            { operatorId },
            'Failed to fetch mixers by operator'
        )
        return (json?.data ?? []).map((mixer) => new Mixer(mixer))
    }
    static async getMixersByStatus(status) {
        if (!status) throw new Error('Status is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-by-status`,
            { status },
            'Failed to fetch mixers by status'
        )
        return (json?.data ?? []).map((mixer) => new Mixer(mixer))
    }
    static async searchMixersByTruckNumber(query) {
        if (!query?.trim()) throw new Error('Search query is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/search-by-truck-number`,
            { query: query.trim() },
            'Failed to search mixers'
        )
        return (json?.data ?? []).map((mixer) => new Mixer(mixer))
    }
    static async searchMixersByVin(query) {
        if (!query?.trim()) throw new Error('Search query is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/search-by-vin`,
            { query: query.trim().toUpperCase() },
            'Failed to search mixers by VIN'
        )
        return (json?.data ?? []).map((row) => enrichMixerWithVerification(new Mixer(row)))
    }
    static async searchMixersByVinProcessed(query) {
        return (await this.searchMixersByVin(query)).map(enrichMixerWithVerification)
    }
    static async getMixersNeedingService(dayThreshold = 30) {
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-needing-service`,
            { dayThreshold },
            'Failed to fetch mixers needing service'
        )
        return (json?.data ?? []).map((mixer) => new Mixer(mixer))
    }
    static async fetchAllCommentsCounts(mixerIds) {
        return baseService.fetchAllCommentsCounts(mixerIds)
    }
    static async fetchAllIssuesCounts(mixerIds) {
        return baseService.fetchAllIssuesCounts(mixerIds)
    }
    static async fetchComments(mixerId) {
        return baseService.fetchComments(mixerId)
    }
    static async addComment(mixerId, text, author) {
        return baseService.addComment(mixerId, text, author)
    }
    static async deleteComment(commentId) {
        return baseService.deleteComment(commentId)
    }
    static async _fetchHistoryDates() {
        const mixers = await this.getAllMixers()
        return Object.fromEntries(mixers.map((m) => [m.id, m.latestHistoryDate ?? null]))
    }
    static async fetchMixerImages(mixerId) {
        ValidationUtility.requireUUID(mixerId, 'Mixer ID is required')
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-images`, { mixerId }, 'Failed to fetch mixer images')
        return (json?.data ?? []).map((image) => MixerImage.fromRow(image))
    }
    static async uploadMixerImage(mixerId, file) {
        ValidationUtility.requireUUID(mixerId, 'Mixer ID is required')
        if (!file) throw new Error('File is required')
        const ext = (file.name?.split('.')?.pop() || '').trim()
        const fileName = `mixer_${mixerId}_${uuidv4()}${ext ? '.' + ext : ''}`
        const fileBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                const result = reader.result
                if (typeof result === 'string') {
                    const idx = result.indexOf(',')
                    resolve(idx >= 0 ? result.substring(idx + 1) : result)
                } else {
                    const b64 = btoa(String.fromCharCode(...new Uint8Array(result)))
                    resolve(b64)
                }
            }
            reader.onerror = () => reject(new Error('Failed to read file'))
            reader.readAsDataURL(file)
        })
        const contentType = file.type || 'application/octet-stream'
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/upload-image`,
            {
                contentType,
                fileBase64,
                fileName,
                mixerId
            },
            'Failed to upload mixer image'
        )
        return MixerImage.fromRow(json?.data)
    }
    static async deleteMixerImage(imageId) {
        ValidationUtility.requireUUID(imageId, 'Image ID is required')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/delete-image`, { imageId }, 'Failed to delete mixer image')
    }
    static async fetchIssues(mixerId) {
        return baseService.fetchIssues(mixerId)
    }
    static async completeIssue(issueId) {
        return baseService.completeIssue(issueId)
    }
    static async addIssue(mixerId, issue, severity, createdBy = null) {
        ValidationUtility.requireUUID(mixerId, 'Mixer ID is required')
        if (!issue?.trim()) throw new Error('Issue description is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/add-issue`,
            {
                issue: issue.trim(),
                mixerId,
                severity: normalizeSeverity(severity),
                userId: createdBy
            },
            'Failed to add issue'
        )
        return json?.data
    }
    static async deleteIssue(issueId) {
        return baseService.deleteIssue(issueId)
    }
    /**
     * Fetches all mixers with enriched details (comments count, issues count, status history, verification).
     * Optionally filtered by region codes.
     */
    static async fetchMixersWithDetails(regionCodes = null) {
        return fetchWithDetailsBase({
            enrichFn: enrichMixerWithVerification,
            fetchAllFn: () => this.getAllMixers(),
            historyTableName: 'mixers_history',
            idColumnName: 'mixer_id',
            regionCodes
        })
    }
    /** Sets unassigned-operator mixers to Spare status in batch. */
    static async ensureSpareIfNoOperator(mixersList) {
        return ensureSpareIfNoOperatorBase(mixersList, async (m) => {
            await this.updateMixer(m.id, {
                assignedOperator: null,
                status: 'Spare',
                updatedAt: null,
                updatedBy: null,
                updatedLast: null
            })
            m.assignedOperator = null
            m.updatedLast = null
            m.updatedAt = null
            m.updatedBy = null
        })
    }
    /** Batch-corrects null operator fields by setting affected mixers to Spare. */
    static async cleanupNullOperators(mixers = null) {
        return CleanupUtility.cleanupNullOperators(
            mixers,
            (id, updates, userId) => this.updateMixer(id, updates, userId),
            () => this.getAllMixers()
        )
    }
    /** Marks a mixer as verified by the given user and refreshes notification badges. */
    static async verifyMixer(mixerId, userId) {
        ValidationUtility.requireUUID(mixerId, 'Mixer ID is required')
        const resolvedUserId = await requireUserId(userId)
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/verify`,
            { id: mixerId, userId: resolvedUserId },
            'Failed to verify mixer'
        )
        return enrichMixerWithVerification(new Mixer(json?.data))
    }
}
export const MixerService = MixerServiceImpl
