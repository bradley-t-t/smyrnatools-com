import PickupTruck from '../models/pickup-trucks/PickupTruck'
import APIUtility from '../utils/APIUtility'
import { ValidationUtility } from '../utils/ValidationUtility'
import { supabase } from './DatabaseService'
import { UserService } from './UserService'

class PickupTruckServiceImpl {
    static async fetchAllCommentsCounts(pickupTruckIds) {
        if (!pickupTruckIds || pickupTruckIds.length === 0) return {}
        const { data, error } = await supabase
            .from('pickup_trucks_comments')
            .select('truck_id')
            .in('truck_id', pickupTruckIds)
        if (error) {
            console.error('Error fetching pickup truck comments counts:', error)
            return {}
        }
        const counts = {}
        pickupTruckIds.forEach((id) => (counts[id] = 0))
        ;(data || []).forEach((row) => {
            if (row.truck_id) counts[row.truck_id] = (counts[row.truck_id] || 0) + 1
        })
        return counts
    }

    static async fetchAllIssuesCounts(pickupTruckIds) {
        if (!pickupTruckIds || pickupTruckIds.length === 0) return {}
        const { data, error } = await supabase
            .from('pickup_trucks_maintenance')
            .select('truck_id, time_completed')
            .in('truck_id', pickupTruckIds)
        if (error) {
            console.error('Error fetching pickup truck issues counts:', error)
            return {}
        }
        const counts = {}
        pickupTruckIds.forEach((id) => (counts[id] = 0))
        ;(data || []).forEach((row) => {
            if (row.truck_id && !row.time_completed) {
                counts[row.truck_id] = (counts[row.truck_id] || 0) + 1
            }
        })
        return counts
    }

    static async getAll() {
        const { res, json } = await APIUtility.post('/pickup-truck-service/fetch-all')
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch pickup trucks')
        const data = json?.data ?? []
        return data.map(PickupTruck.fromApiFormat)
    }

    static async fetchAll(regionCodes = null) {
        const data = await this.getAll()

        const statusHistoryMap = {}
        const pickupIds = (data || []).map((p) => p.id).filter(Boolean)
        if (pickupIds.length > 0) {
            try {
                const { data: statusHistory } = await supabase
                    .from('pickup_trucks_history')
                    .select('truck_id, changed_at')
                    .eq('field_name', 'status')
                    .in('truck_id', pickupIds)
                    .order('changed_at', { ascending: false })

                if (statusHistory) {
                    for (const h of statusHistory) {
                        if (!statusHistoryMap[h.truck_id]) {
                            statusHistoryMap[h.truck_id] = h.changed_at
                        }
                    }
                }
            } catch (e) {}
        }

        const processedData = data.map((p) => {
            p.statusChangedAt = statusHistoryMap[p.id] || p.createdAt || null
            return p
        })

        if (regionCodes) {
            return processedData.filter((p) =>
                regionCodes.has(
                    String(p.assignedPlant || '')
                        .trim()
                        .toUpperCase()
                )
            )
        }
        return processedData
    }

    static async getById(id) {
        ValidationUtility.requireUUID(id, 'Pickup Truck ID is required')
        const { res, json } = await APIUtility.post('/pickup-truck-service/fetch-by-id', { id })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch pickup truck')
        const data = json?.data
        if (!data) return null
        return PickupTruck.fromApiFormat(data)
    }

    static async create(pickup, userId) {
        if (!userId) {
            const user = await UserService.getCurrentUser()
            userId = typeof user === 'object' && user !== null ? user.id : user
            if (!userId) throw new Error('Authentication required')
        }
        if (pickup && pickup.id) delete pickup.id
        const { res, json } = await APIUtility.post('/pickup-truck-service/create', { pickup, userId })
        if (!res.ok) throw new Error(json?.error || 'Failed to create pickup truck')
        return PickupTruck.fromApiFormat(json?.data)
    }

    static async update(id, pickup, userId) {
        const pickupId = typeof id === 'object' ? id.id : id
        ValidationUtility.requireUUID(pickupId, 'Pickup Truck ID is required')
        if (!userId) {
            const user = await UserService.getCurrentUser()
            userId = typeof user === 'object' && user !== null ? user.id : user
        }
        if (!userId) throw new Error('User ID is required')
        const { res, json } = await APIUtility.post('/pickup-truck-service/update', { id: pickupId, pickup, userId })
        if (!res.ok) throw new Error(json?.error || 'Failed to update pickup truck')
        return PickupTruck.fromApiFormat(json?.data)
    }

    static async remove(id) {
        ValidationUtility.requireUUID(id, 'Pickup Truck ID is required')
        const { res, json } = await APIUtility.post('/pickup-truck-service/delete', { id })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to delete pickup truck')
        return true
    }

    static async searchByVin(query) {
        if (!query?.trim()) throw new Error('Search query is required')
        const { res, json } = await APIUtility.post('/pickup-truck-service/search-by-vin', { query: query.trim() })
        if (!res.ok) throw new Error(json?.error || 'Failed to search pickup trucks by VIN')
        return (json?.data ?? []).map(PickupTruck.fromApiFormat)
    }

    static async searchByAssigned(query) {
        if (!query?.trim()) throw new Error('Search query is required')
        const { res, json } = await APIUtility.post('/pickup-truck-service/search-by-assigned', { query: query.trim() })
        if (!res.ok) throw new Error(json?.error || 'Failed to search pickup trucks by assignee')
        return (json?.data ?? []).map(PickupTruck.fromApiFormat)
    }

    static async verify(pickupId, userId) {
        const id = typeof pickupId === 'object' ? pickupId.id : pickupId
        ValidationUtility.requireUUID(id, 'Pickup Truck ID is required')
        if (!userId) {
            const user = await UserService.getCurrentUser()
            userId = typeof user === 'object' && user !== null ? user.id : user
        }
        if (!userId) throw new Error('User ID is required')
        const payload = { id, pickup: { updatedLast: new Date().toISOString() }, userId }
        const { res, json } = await APIUtility.post('/pickup-truck-service/update', payload)
        if (!res.ok) throw new Error(json?.error || 'Failed to verify pickup truck')
        return PickupTruck.fromApiFormat(json?.data)
    }

    static getDuplicateVINs(pickups) {
        const counts = new Map()
        for (const p of pickups) {
            const key = String(p.vin || '')
                .trim()
                .toUpperCase()
                .replace(/\s+/g, '')
            if (!key) continue
            counts.set(key, (counts.get(key) || 0) + 1)
        }
        const dups = new Set()
        counts.forEach((count, key) => {
            if (count > 1) dups.add(key)
        })
        return dups
    }

    static getDuplicateAssigned(pickups) {
        const counts = new Map()
        for (const p of pickups) {
            const key = String(p.assigned || '')
                .trim()
                .toLowerCase()
            if (!key) continue
            counts.set(key, (counts.get(key) || 0) + 1)
        }
        const dups = new Set()
        counts.forEach((count, key) => {
            if (count > 1) dups.add(key)
        })
        return dups
    }

    static async fetchComments(pickupId) {
        ValidationUtility.requireUUID(pickupId, 'Pickup Truck ID is required')
        const { res, json } = await APIUtility.post('/pickup-truck-service/fetch-comments', { pickupId })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch comments')
        return json?.data ?? []
    }

    static async addComment(pickupId, text, author) {
        ValidationUtility.requireUUID(pickupId, 'Pickup Truck ID is required')
        if (!text?.trim()) throw new Error('Comment text is required')
        if (!author) throw new Error('Author is required')
        const { res, json } = await APIUtility.post('/pickup-truck-service/add-comment', { author, pickupId, text })
        if (!res.ok) throw new Error(json?.error || 'Failed to add comment')
        return json?.data
    }

    static async deleteComment(commentId) {
        ValidationUtility.requireUUID(commentId, 'Comment ID is required')
        const { res, json } = await APIUtility.post('/pickup-truck-service/delete-comment', { commentId })
        if (!res.ok) throw new Error(json?.error || 'Failed to delete comment')
        return json?.success ?? false
    }

    static async fetchIssues(pickupId) {
        ValidationUtility.requireUUID(pickupId, 'Pickup Truck ID is required')
        const { res, json } = await APIUtility.post('/pickup-truck-service/fetch-issues', { pickupId })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch issues')
        return json?.data ?? []
    }

    static async completeIssue(issueId) {
        ValidationUtility.requireUUID(issueId, 'Issue ID is required')
        const { res, json } = await APIUtility.post('/pickup-truck-service/complete-issue', { issueId })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to complete issue')
        return true
    }

    static async addIssue(pickupId, issue, severity, createdBy = null) {
        ValidationUtility.requireUUID(pickupId, 'Pickup Truck ID is required')
        if (!issue?.trim()) throw new Error('Issue description is required')
        if (!['Low', 'Medium', 'High'].includes(severity)) throw new Error('Severity must be Low, Medium, or High')
        const { res, json } = await APIUtility.post('/pickup-truck-service/add-issue', {
            issue: issue.trim(),
            pickupId,
            severity,
            userId: createdBy
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to add issue')
        return json?.data
    }

    static async deleteIssue(issueId) {
        ValidationUtility.requireUUID(issueId, 'Issue ID is required')
        const { res, json } = await APIUtility.post('/pickup-truck-service/delete-issue', { issueId })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to delete issue')
        return true
    }

    static async fetchHistory(pickupId, limit = null) {
        ValidationUtility.requireUUID(pickupId, 'Pickup Truck ID is required')
        const payload = { pickupId }
        if (limit !== null && Number.isInteger(limit) && limit > 0) {
            payload.limit = limit
        }
        const { res, json } = await APIUtility.post('/pickup-truck-service/fetch-history', payload)
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch history')
        return json?.data ?? []
    }
}

export const PickupTruckService = PickupTruckServiceImpl
export default PickupTruckServiceImpl
