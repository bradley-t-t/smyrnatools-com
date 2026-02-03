import { v4 as uuidv4 } from 'uuid'

import { Mixer } from '../models/mixers/Mixer'
import { MixerComment } from '../models/mixers/MixerComment'
import { MixerHistory } from '../models/mixers/MixerHistory'
import { MixerImage } from '../models/mixers/MixerImage'
import APIUtility from '../utils/APIUtility'
import CleanupUtility from '../utils/CleanupUtility'
import MixerUtility from '../utils/MixerUtility'
import { ValidationUtility } from '../utils/ValidationUtility'
import { supabase } from './DatabaseService'
import { UserService } from './UserService'

class MixerServiceImpl {
    static async getAllMixers() {
        const { res, json } = await APIUtility.post('/mixer-service/fetch-all')
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch mixers')
        const data = json?.data ?? []
        return data.map((mixer) => new Mixer(mixer))
    }

    static async fetchMixers() {
        return this.getAllMixers()
    }

    static _attachIsVerified(m) {
        if (!m) return m
        if (typeof m.isVerified !== 'function') {
            m.isVerified = function (latestHistoryDate) {
                return MixerUtility.isVerified(
                    this.updatedLast,
                    this.updatedAt,
                    this.updatedBy,
                    latestHistoryDate ?? this.latestHistoryDate
                )
            }
        }
        return m
    }

    static async getMixerById(id) {
        ValidationUtility.requireUUID(id, 'Mixer ID is required')
        const { res, json } = await APIUtility.post('/mixer-service/fetch-by-id', { id })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch mixer')
        const data = json?.data
        if (!data) return null
        return new Mixer(data)
    }

    static async fetchMixerById(id) {
        ValidationUtility.requireUUID(id, 'Invalid mixer ID')
        const mixer = await this.getMixerById(id)
        if (!mixer) return null
        return this._attachIsVerified(mixer)
    }

    static async getLatestHistoryDate(mixerId) {
        if (!mixerId) return null
        const { res, json } = await APIUtility.post('/mixer-service/fetch-history', { limit: 1, mixerId })
        if (!res.ok) return null
        const first = (json?.data ?? [])[0]
        return first?.changed_at ?? null
    }

    static async getActiveMixers() {
        const { res, json } = await APIUtility.post('/mixer-service/fetch-active')
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch active mixers')
        return (json?.data ?? []).map((mixer) => new Mixer(mixer))
    }

    static async getMixerHistory(mixerId, limit = null) {
        ValidationUtility.requireUUID(mixerId, 'Mixer ID is required')
        const payload = { mixerId }
        if (limit && Number.isInteger(limit) && limit > 0) payload.limit = limit
        const { res, json } = await APIUtility.post('/mixer-service/fetch-history', payload)
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch mixer history')
        return (json?.data ?? []).map((entry) => new MixerHistory(entry))
    }

    static async addMixer(mixer, userId) {
        if (mixer && typeof mixer === 'object' && 'vin' in mixer && mixer.vin) {
            mixer.vin = mixer.vin.toUpperCase()
        }
        const { res, json } = await APIUtility.post('/mixer-service/create', { mixer, userId })
        if (!res.ok) throw new Error(json?.error || 'Failed to create mixer')
        return new Mixer(json?.data)
    }

    static async createMixer(mixer, userId) {
        if (!userId) {
            const user = await UserService.getCurrentUser()
            userId = typeof user === 'object' && user !== null ? user.id : user
            if (!userId) throw new Error('Authentication required')
        }
        if (mixer.id) delete mixer.id
        if (mixer.vin) {
            mixer.vin = mixer.vin.toUpperCase()
        }
        return this.addMixer(mixer, userId)
    }

    static async updateMixer(mixerId, mixer, userId, _prevMixerState = null) {
        const id = typeof mixerId === 'object' ? mixerId.id : mixerId
        ValidationUtility.requireUUID(id, 'Mixer ID is required')
        if (!userId) {
            const user = await UserService.getCurrentUser()
            userId = typeof user === 'object' && user !== null ? user.id : user
        }
        if (!userId) throw new Error('User ID is required')
        if (mixer && typeof mixer === 'object' && 'vin' in mixer && mixer.vin) {
            mixer.vin = mixer.vin.toUpperCase()
        }

        if (_prevMixerState && _prevMixerState.assignedPlant !== mixer.assignedPlant) {
            mixer.assignedOperator = null
        }

        const { res, json } = await APIUtility.post('/mixer-service/update', { id, mixer, userId })
        if (!res.ok) throw new Error(json?.error || 'Failed to update mixer')
        return new Mixer(json?.data)
    }

    static async deleteMixer(id) {
        ValidationUtility.requireUUID(id, 'Mixer ID is required')
        const { res, json } = await APIUtility.post('/mixer-service/delete', { id })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to delete mixer')
        return true
    }

    static async createHistoryEntry(mixerId, fieldName, oldValue, newValue, changedBy) {
        ValidationUtility.requireUUID(mixerId, 'Mixer ID is required')
        if (!fieldName) throw new Error('Field name required')
        let userId = changedBy
        if (!userId) {
            const user = await UserService.getCurrentUser()
            userId = typeof user === 'object' && user !== null ? user.id : user
        }
        if (!userId) userId = '00000000-0000-0000-0000-000000000000'
        if (fieldName === 'vin') newValue = (newValue || '').toUpperCase()
        const { res, json } = await APIUtility.post('/mixer-service/add-history', {
            changedBy: userId,
            fieldName,
            mixerId,
            newValue,
            oldValue
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to create history entry')
        return json?.data
    }

    static async getCleanlinessHistory(mixerId = null, months = 6) {
        const payload = {}
        if (mixerId) payload.mixerId = mixerId
        if (months) payload.months = months
        const { res, json } = await APIUtility.post('/mixer-service/fetch-cleanliness-history', payload)
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch cleanliness history')
        return json?.data ?? []
    }

    static async getMixersByOperator(operatorId) {
        ValidationUtility.requireUUID(operatorId, 'Operator ID is required')
        const { res, json } = await APIUtility.post('/mixer-service/fetch-by-operator', { operatorId })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch mixers by operator')
        return (json?.data ?? []).map((mixer) => new Mixer(mixer))
    }

    static async getMixersByStatus(status) {
        if (!status) throw new Error('Status is required')
        const { res, json } = await APIUtility.post('/mixer-service/fetch-by-status', { status })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch mixers by status')
        return (json?.data ?? []).map((mixer) => new Mixer(mixer))
    }

    static async searchMixersByTruckNumber(query) {
        if (!query?.trim()) throw new Error('Search query is required')
        const { res, json } = await APIUtility.post('/mixer-service/search-by-truck-number', { query: query.trim() })
        if (!res.ok) throw new Error(json?.error || 'Failed to search mixers')
        return (json?.data ?? []).map((mixer) => new Mixer(mixer))
    }

    static async searchMixersByVin(query) {
        if (!query?.trim()) throw new Error('Search query is required')
        const upper = query.trim().toUpperCase()
        const { res, json } = await APIUtility.post('/mixer-service/search-by-vin', { query: upper })
        if (!res.ok) throw new Error(json?.error || 'Failed to search mixers by VIN')
        return (json?.data ?? []).map((row) => this._attachIsVerified(new Mixer(row)))
    }

    static async searchMixersByVinProcessed(query) {
        const vinMixers = await this.searchMixersByVin(query)
        return vinMixers.map((m) => {
            m.isVerified = () => MixerUtility.isVerified(m.updatedLast, m.updatedAt, m.updatedBy, m.latestHistoryDate)
            if (typeof m.openIssuesCount !== 'number') m.openIssuesCount = 0
            if (typeof m.commentsCount !== 'number') m.commentsCount = 0
            return m
        })
    }

    static async getMixersNeedingService(dayThreshold = 30) {
        const { res, json } = await APIUtility.post('/mixer-service/fetch-needing-service', { dayThreshold })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch mixers needing service')
        return (json?.data ?? []).map((mixer) => new Mixer(mixer))
    }

    static async fetchComments(mixerId) {
        ValidationUtility.requireUUID(mixerId, 'Mixer ID is required')
        const { res, json } = await APIUtility.post('/mixer-service/fetch-comments', { mixerId })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch comments')
        return (json?.data ?? []).map((row) => MixerComment.fromRow(row))
    }

    static async addComment(mixerId, text, author) {
        ValidationUtility.requireUUID(mixerId, 'Mixer ID is required')
        if (!text?.trim()) throw new Error('Comment text is required')
        if (!author?.trim()) throw new Error('Author is required')
        const { res, json } = await APIUtility.post('/mixer-service/add-comment', {
            author: author.trim(),
            mixerId,
            text: text.trim()
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to add comment')
        return json?.data ? MixerComment.fromRow(json.data) : null
    }

    static async deleteComment(commentId) {
        ValidationUtility.requireUUID(commentId, 'Comment ID is required')
        const { res, json } = await APIUtility.post('/mixer-service/delete-comment', { commentId })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to delete comment')
        return true
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
        const { res, json } = await APIUtility.post('/mixer-service/fetch-images', { mixerId })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch mixer images')
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
        const { res, json } = await APIUtility.post('/mixer-service/upload-image', {
            contentType,
            fileBase64,
            fileName,
            mixerId
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to upload mixer image')
        return MixerImage.fromRow(json?.data)
    }

    static async deleteMixerImage(imageId) {
        ValidationUtility.requireUUID(imageId, 'Image ID is required')
        const { res, json } = await APIUtility.post('/mixer-service/delete-image', { imageId })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to delete mixer image')
        return true
    }

    static async fetchIssues(mixerId) {
        ValidationUtility.requireUUID(mixerId, 'Mixer ID is required')
        const { res, json } = await APIUtility.post('/mixer-service/fetch-issues', { mixerId })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch issues')
        return json?.data ?? []
    }

    static async completeIssue(issueId) {
        ValidationUtility.requireUUID(issueId, 'Issue ID is required')
        const { res, json } = await APIUtility.post('/mixer-service/complete-issue', { issueId })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to complete issue')
        return true
    }

    static async addIssue(mixerId, issue, severity, createdBy = null) {
        ValidationUtility.requireUUID(mixerId, 'Mixer ID is required')
        if (!issue?.trim()) throw new Error('Issue description is required')
        if (!['Low', 'Medium', 'High'].includes(severity)) throw new Error('Severity must be Low, Medium, or High')
        const { res, json } = await APIUtility.post('/mixer-service/add-issue', {
            issue: issue.trim(),
            mixerId,
            severity,
            userId: createdBy
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to add issue')
        return json?.data
    }

    static async deleteIssue(issueId) {
        ValidationUtility.requireUUID(issueId, 'Issue ID is required')
        const { res, json } = await APIUtility.post('/mixer-service/delete-issue', { issueId })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to delete issue')
        return true
    }

    static async fetchMixersWithDetails(regionCodes = null) {
        const base = await this.getAllMixers().catch(() => [])

        const mixerIds = base.map((m) => m.id).filter(Boolean)
        let statusHistoryMap = {}
        if (mixerIds.length > 0) {
            try {
                const { data: statusHistory } = await supabase
                    .from('mixers_history')
                    .select('mixer_id, changed_at')
                    .eq('field_name', 'status')
                    .in('mixer_id', mixerIds)
                    .order('changed_at', { ascending: false })

                if (statusHistory) {
                    for (const h of statusHistory) {
                        if (!statusHistoryMap[h.mixer_id]) {
                            statusHistoryMap[h.mixer_id] = h.changed_at
                        }
                    }
                }
            } catch (e) {}
        }

        const processedBase = (Array.isArray(base) ? base : []).map((m) => {
            const mixer = { ...m }

            mixer.isVerified = () =>
                MixerUtility.isVerified(mixer.updatedLast, mixer.updatedAt, mixer.updatedBy, mixer.latestHistoryDate)
            if (typeof mixer.openIssuesCount !== 'number') mixer.openIssuesCount = 0
            if (typeof mixer.commentsCount !== 'number') mixer.commentsCount = 0

            mixer.statusChangedAt = statusHistoryMap[mixer.id] || null

            return mixer
        })
        if (regionCodes) {
            return processedBase.filter((m) =>
                regionCodes.has(
                    String(m.assignedPlant || '')
                        .trim()
                        .toUpperCase()
                )
            )
        }
        return processedBase
    }

    static async ensureSpareIfNoOperator(mixersList) {
        const toUpdate = (mixersList || []).filter((m) => {
            const hasNoOperator =
                !m.assignedOperator ||
                m.assignedOperator === '0' ||
                m.assignedOperator === 0 ||
                m.assignedOperator === null ||
                m.assignedOperator === 'null'
            return m.status === 'Active' && hasNoOperator
        })

        for (const m of toUpdate) {
            try {
                const updates = {
                    assignedOperator: null,
                    status: 'Spare',
                    updatedAt: null,
                    updatedBy: null,
                    updatedLast: null
                }
                await this.updateMixer(m.id, updates)
                m.status = 'Spare'
                m.assignedOperator = null
                m.updatedLast = null
                m.updatedAt = null
                m.updatedBy = null
            } catch (error) {}
        }
        return mixersList
    }

    static async cleanupNullOperators(mixers = null) {
        return CleanupUtility.cleanupNullOperators(
            mixers,
            (id, updates, userId) => this.updateMixer(id, updates, userId),
            () => this.getAllMixers()
        )
    }

    static async verifyMixer(mixerId, userId) {
        ValidationUtility.requireUUID(mixerId, 'Mixer ID is required')
        if (!userId) {
            const user = await UserService.getCurrentUser()
            userId = typeof user === 'object' && user !== null ? user.id : user
        }
        if (!userId) throw new Error('User ID is required')
        const { res, json } = await APIUtility.post('/mixer-service/verify', { id: mixerId, userId })
        if (!res.ok) throw new Error(json?.error || 'Failed to verify mixer')
        const mixer = new Mixer(json?.data)
        try {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent('notifications-refresh', {
                        detail: {
                            id: mixerId,
                            plant: mixer.assignedPlant,
                            type: 'mixer'
                        }
                    })
                )
            }
        } catch {}
        return this._attachIsVerified(mixer)
    }
}

export const MixerService = MixerServiceImpl
