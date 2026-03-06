import { v4 as uuidv4 } from 'uuid'

import { Mixer } from '../models/mixers/Mixer'
import { MixerComment } from '../models/mixers/MixerComment'
import { MixerHistory } from '../models/mixers/MixerHistory'
import { MixerImage } from '../models/mixers/MixerImage'
import {
    apiPostOrThrow,
    apiPostRequireSuccess,
    dispatchNotificationsRefresh,
    ensureSpareIfNoOperatorBase,
    fetchAllCountsFromTable,
    fetchAllOpenIssueCountsFromTable,
    fetchWithDetailsBase,
    requireUserId,
    resolveEntityId,
    resolveUserIdOrAnonymous,
    uppercaseVin
} from '../utils/BaseAssetUtility'
import CleanupUtility from '../utils/CleanupUtility'
import MixerUtility from '../utils/MixerUtility'
import { ValidationUtility } from '../utils/ValidationUtility'
const SERVICE_PREFIX = '/mixer-service'
/** Attaches a lazy isVerified() method to a mixer instance using MixerUtility logic. */
function attachIsVerified(mixer) {
    if (!mixer) return mixer
    if (typeof mixer.isVerified !== 'function') {
        mixer.isVerified = function (latestHistoryDate) {
            return MixerUtility.isVerified(
                this.updatedLast,
                this.updatedAt,
                this.updatedBy,
                latestHistoryDate ?? this.latestHistoryDate
            )
        }
    }
    return mixer
}
/** Attaches an isVerified() method directly using current mixer field values. */
function enrichMixerWithVerification(mixer) {
    mixer.isVerified = () =>
        MixerUtility.isVerified(mixer.updatedLast, mixer.updatedAt, mixer.updatedBy, mixer.latestHistoryDate)
    return mixer
}
/**
 * Mixer CRUD, history, comments, issues, images, and verification service.
 * Delegates shared asset operations to BaseAssetUtility.
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
        return mixer ? attachIsVerified(mixer) : null
    }
    /** Fetches the most recent history entry date for a mixer. */
    static async getLatestHistoryDate(mixerId) {
        if (!mixerId) return null
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/fetch-history`,
            { limit: 1, mixerId },
            'Failed to fetch history'
        ).catch(() => null)
        if (!json) return null
        return (json?.data ?? [])[0]?.changed_at ?? null
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
    static async updateMixer(mixerId, mixer, userId, _prevMixerState = null) {
        const id = resolveEntityId(mixerId)
        ValidationUtility.requireUUID(id, 'Mixer ID is required')
        const resolvedUserId = await requireUserId(userId)
        uppercaseVin(mixer)
        if (_prevMixerState?.assignedPlant !== mixer.assignedPlant) {
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
        ValidationUtility.requireUUID(mixerId, 'Mixer ID is required')
        if (!fieldName) throw new Error('Field name required')
        const userId = await resolveUserIdOrAnonymous(changedBy)
        const finalNewValue = fieldName === 'vin' ? (newValue || '').toUpperCase() : newValue
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/add-history`,
            {
                changedBy: userId,
                fieldName,
                mixerId,
                newValue: finalNewValue,
                oldValue
            },
            'Failed to create history entry'
        )
        return json?.data
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
        return (json?.data ?? []).map((row) => attachIsVerified(new Mixer(row)))
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
        return fetchAllCountsFromTable('mixers_comments', 'mixer_id', mixerIds)
    }
    static async fetchAllIssuesCounts(mixerIds) {
        return fetchAllOpenIssueCountsFromTable('mixers_maintenance', 'mixer_id', mixerIds)
    }
    static async fetchComments(mixerId) {
        ValidationUtility.requireUUID(mixerId, 'Mixer ID is required')
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-comments`, { mixerId }, 'Failed to fetch comments')
        return (json?.data ?? []).map((row) => MixerComment.fromRow(row))
    }
    static async addComment(mixerId, text, author) {
        ValidationUtility.requireUUID(mixerId, 'Mixer ID is required')
        if (!text?.trim()) throw new Error('Comment text is required')
        if (!author?.trim()) throw new Error('Author is required')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/add-comment`,
            {
                author: author.trim(),
                mixerId,
                text: text.trim()
            },
            'Failed to add comment'
        )
        return json?.data ? MixerComment.fromRow(json.data) : null
    }
    static async deleteComment(commentId) {
        ValidationUtility.requireUUID(commentId, 'Comment ID is required')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/delete-comment`, { commentId }, 'Failed to delete comment')
    }
    static async _fetchHistoryDates() {
        const mixers = await this.getAllMixers()
        const map = {}
        mixers.forEach((m) => {
            map[m.id] = m.latestHistoryDate ?? null
        })
        return map
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
        ValidationUtility.requireUUID(mixerId, 'Mixer ID is required')
        const json = await apiPostOrThrow(`${SERVICE_PREFIX}/fetch-issues`, { mixerId }, 'Failed to fetch issues')
        return json?.data ?? []
    }
    static async completeIssue(issueId) {
        ValidationUtility.requireUUID(issueId, 'Issue ID is required')
        return apiPostRequireSuccess(`${SERVICE_PREFIX}/complete-issue`, { issueId }, 'Failed to complete issue')
    }
    static async addIssue(mixerId, issue, severity, createdBy = null) {
        ValidationUtility.requireUUID(mixerId, 'Mixer ID is required')
        if (!issue?.trim()) throw new Error('Issue description is required')
        if (!['Low', 'Medium', 'High'].includes(severity)) throw new Error('Severity must be Low, Medium, or High')
        const json = await apiPostOrThrow(
            `${SERVICE_PREFIX}/add-issue`,
            {
                issue: issue.trim(),
                mixerId,
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
        const mixer = new Mixer(json?.data)
        dispatchNotificationsRefresh({ id: mixerId, plant: mixer.assignedPlant, type: 'mixer' })
        return attachIsVerified(mixer)
    }
}
export const MixerService = MixerServiceImpl
