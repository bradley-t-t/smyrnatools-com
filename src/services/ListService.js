import APIUtility from '../utils/APIUtility'
import CacheUtility from '../utils/CacheUtility'
import DateUtility from '../utils/DateUtility'
import FormatUtility from '../utils/FormatUtility'
import GrammarUtility from '../utils/GrammarUtility'
import { UserService } from './UserService'

/**
 * Consolidated status configuration — single source of truth for label, icon, and Tailwind color per status.
 */
const STATUS_CONFIG = {
    blocked: { color: 'text-red-500', cssClass: 'blocked', icon: 'fa-ban', label: 'Blocked' },
    completed: { color: 'text-green-500', cssClass: 'completed', icon: 'fa-check-circle', label: 'Completed' },
    in_progress: { color: 'text-blue-400', cssClass: 'in-progress', icon: 'fa-spinner', label: 'In Progress' },
    ordered_materials: {
        color: 'text-sky-400',
        cssClass: 'ordered',
        icon: 'fa-truck-loading',
        label: 'Ordered Materials'
    },
    overdue: { color: 'text-red-500', cssClass: 'overdue', icon: 'fa-exclamation-circle', label: 'Overdue' },
    pending: { color: 'text-blue-500', cssClass: 'pending', icon: 'fa-clock', label: 'Pending' },
    waiting: { color: 'text-yellow-500', cssClass: 'waiting', icon: 'fa-hourglass-half', label: 'Waiting' }
}
const DEFAULT_STATUS = STATUS_CONFIG.pending

/**
 * Task list management service handling CRUD, filtering, sorting, and status tracking
 * for plant-level list items. Caches items and creator profiles for performance.
 */
class ListServiceImpl {
    listItems = []
    creatorProfiles = {}
    plants = []
    plantDistribution = {}
    /**
     * Fetches all list items with their creator profiles in a single call.
     * Uses a 60-second cache to reduce redundant API calls.
     */
    async fetchListItems(opts = {}) {
        const { force = false } = opts || {}
        const user = await UserService.getCurrentUser()
        if (!user) throw new Error('No authenticated user')
        if (!force) {
            const cached = CacheUtility.get('list:items-with-profiles')
            if (cached && Array.isArray(cached.items)) {
                this.listItems = cached.items
                this.creatorProfiles = cached.profiles || {}
                return this.listItems
            }
        }
        const { res, json } = await APIUtility.post('/list-service/fetch-items-with-profiles')
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch list items')
        const data = json?.data ?? []
        const profilesArr = json?.profiles ?? []
        const profiles = {}
        for (const p of profilesArr) {
            if (p?.id) profiles[p.id] = p
        }
        const cleaned = data.map((i) => ({
            ...i,
            comments: GrammarUtility.cleanComments(i?.comments || ''),
            description: GrammarUtility.cleanDescription(i?.description || '')
        }))
        this.listItems = cleaned
        this.creatorProfiles = profiles
        CacheUtility.set('list:items-with-profiles', { items: cleaned, profiles }, 60_000)
        return this.listItems
    }
    /** Fetches available plants for list item assignment with a 10-minute cache. */
    async fetchPlants(opts = {}) {
        const { force = false } = opts || {}
        if (!force) {
            const cached = CacheUtility.get('list:plants')
            if (cached && Array.isArray(cached)) {
                this.plants = cached
                return this.plants
            }
        }
        const { res, json } = await APIUtility.post('/list-service/fetch-plants')
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch plants')
        this.plants = json?.data ?? []
        CacheUtility.set('list:plants', this.plants, 10 * 60_000)
        return this.plants
    }
    /** Fetches display profiles for list item creators by their user IDs. */
    async fetchCreatorProfiles(listItems) {
        const userIds = [...new Set(listItems.map((item) => item.user_id).filter((id) => id))]
        const newProfiles = { ...this.creatorProfiles }
        if (userIds.length === 0) {
            this.creatorProfiles = newProfiles
            return this.creatorProfiles
        }
        const { res, json } = await APIUtility.post('/list-service/fetch-creator-profiles', { userIds })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch creator profiles')
        const profiles = json?.profiles ?? []
        profiles.forEach((profile) => (newProfiles[profile.id] = profile))
        this.creatorProfiles = newProfiles
        return this.creatorProfiles
    }
    /** Creates a new list item with grammar-cleaned description and comments. */
    async createListItem(plantCode, description, deadline, comments, status = 'pending', responsibleRole = null) {
        const user = await UserService.getCurrentUser()
        if (!user) throw new Error('No authenticated user')
        const desc = GrammarUtility.cleanDescription(description || '')
        if (!desc?.trim()) throw new Error('Description is required')
        const userId = user.id
        if (!userId) throw new Error('User ID is required')
        const deadlineString = deadline instanceof Date ? deadline.toISOString() : deadline
        const { res, json } = await APIUtility.post('/list-service/create', {
            comments: GrammarUtility.cleanComments(comments || ''),
            deadline: deadlineString,
            description: desc,
            plantCode,
            responsible_role: responsibleRole || null,
            status: status || 'pending',
            userId
        })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to create list item')
        CacheUtility.delete('list:items-with-profiles')
        await this.fetchListItems({ force: true })
        return true
    }
    /** Updates an existing list item with grammar-cleaned text fields. */
    async updateListItem(item) {
        if (!item?.id) throw new Error('Item ID is required')
        const desc = GrammarUtility.cleanDescription(item?.description || '')
        if (!desc.trim()) throw new Error('Description is required')
        const update = {
            comments: GrammarUtility.cleanComments(item?.comments || ''),
            completed: item.completed ?? false,
            completed_at: item.completed_at,
            deadline: item.deadline,
            description: desc,
            id: item.id,
            plant_code: item.plant_code?.trim() ?? '',
            responsible_role: item.responsible_role || null,
            status: item.status || 'pending'
        }
        const { res, json } = await APIUtility.post('/list-service/update', { item: update })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to update list item')
        CacheUtility.delete('list:items-with-profiles')
        await this.fetchListItems({ force: true })
        return true
    }
    /** Toggles the completion status of a list item and records the completing user. */
    async toggleCompletion(item, currentUserId) {
        if (!item?.id) throw new Error('Item ID is required')
        if (!currentUserId) throw new Error('No authenticated user')
        const newCompletionStatus = !item.completed
        const { res, json } = await APIUtility.post('/list-service/toggle-completion', {
            completed: newCompletionStatus,
            currentUserId,
            id: item.id
        })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to toggle completion')
        CacheUtility.delete('list:items-with-profiles')
        await this.fetchListItems({ force: true })
        return true
    }
    /** Deletes a list item and triggers a notifications refresh. */
    async deleteListItem(id) {
        if (!id) throw new Error('Item ID is required')
        const { res, json } = await APIUtility.post('/list-service/delete', { id })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to delete list item')
        CacheUtility.delete('list:items-with-profiles')
        await this.fetchListItems({ force: true })
        if (typeof window !== 'undefined') {
            try {
                window.dispatchEvent(new CustomEvent('notifications-refresh'))
            } catch (err) {
                console.error('Failed to dispatch notifications-refresh event:', err)
            }
        }
        return true
    }
    /**
     * Filters and sorts list items by plant, search term, completion status, and status type.
     * Overdue items are prioritized in non-completed views.
     */
    getFilteredItems({ plantCode, searchTerm, showCompleted, statusFilter }) {
        let items = [...this.listItems]
        if (plantCode && plantCode !== 'All') items = items.filter((item) => item.plant_code === plantCode)
        if (searchTerm?.trim()) {
            const term = searchTerm.toLowerCase().trim()
            items = items.filter(
                (item) =>
                    (item.description || '').toLowerCase().includes(term) ||
                    (item.comments || '').toLowerCase().includes(term)
            )
        }
        if (!showCompleted) items = items.filter((item) => !item.completed)
        if (statusFilter === 'completed') items = items.filter((item) => item.completed)
        if (statusFilter === 'overdue') items = items.filter((item) => this.isOverdue(item) && !item.completed)
        if (statusFilter === 'pending') items = items.filter((item) => !this.isOverdue(item) && !item.completed)
        if (statusFilter === 'completed') {
            items.sort((a, b) => {
                const aCompletedAt = new Date(a.completed_at).getTime() || 0
                const bCompletedAt = new Date(b.completed_at).getTime() || 0
                return bCompletedAt - aCompletedAt
            })
        } else {
            items.sort((a, b) => {
                const aOverdue = this.isOverdue(a) && !a.completed
                const bOverdue = this.isOverdue(b) && !b.completed
                if (aOverdue && !bOverdue) return -1
                if (!aOverdue && bOverdue) return 1
                const aDeadline = new Date(a.deadline).getTime() || 0
                const bDeadline = new Date(b.deadline).getTime() || 0
                return aDeadline - bDeadline
            })
        }
        return items
    }
    /** Formats a date string for display (e.g., "Jan 5, 2026, 02:30 PM"). Delegates to DateUtility. */
    formatDate(dateString) {
        if (!dateString) return 'N/A'
        const result = DateUtility.formatDateTime(dateString)
        return result || 'Invalid Date'
    }
    /** Formats a date string into an HTML datetime-local input value. Delegates to DateUtility. */
    formatDateForInput(dateString) {
        return DateUtility.formatDateTimeLocal(dateString)
    }
    /** Returns true if the item has a deadline that has passed and is not completed. */
    isOverdue(item) {
        return item.deadline && !item.completed && new Date(item.deadline) < new Date()
    }
    /** Returns status display metadata (Tailwind color class, icon, label) based on item state and deadline. */
    calculateStatusInfo(item) {
        if (!item) return { color: 'text-gray-500', icon: 'question-circle', label: 'Unknown' }
        if (item.completed || item.status === 'completed')
            return { color: 'text-green-500', icon: 'check-circle', label: 'Completed' }
        if (item.status === 'in_progress') return { color: 'text-blue-400', icon: 'spinner', label: 'In Progress' }
        if (item.status === 'ordered_materials')
            return { color: 'text-sky-400', icon: 'truck-loading', label: 'Ordered Materials' }
        if (item.status === 'blocked') return { color: 'text-red-500', icon: 'ban', label: 'Blocked' }
        if (item.status === 'waiting') return { color: 'text-yellow-500', icon: 'hourglass-half', label: 'Waiting' }
        const deadline = new Date(item.deadline)
        const now = new Date()
        if (isNaN(deadline.getTime())) return { color: 'text-gray-500', icon: 'calendar-times', label: 'No Deadline' }
        if (deadline < now || item.status === 'overdue')
            return { color: 'text-red-500', icon: 'exclamation-circle', label: 'Overdue' }
        const hours = (deadline - now) / (1000 * 60 * 60)
        if (hours < 24) return { color: 'text-yellow-500', icon: 'clock', label: 'Due Soon' }
        return { color: 'text-blue-500', icon: 'calendar-check', label: 'Pending' }
    }
    /** Maps a status key to its human-readable label via STATUS_CONFIG. */
    getStatusLabel(status) {
        return (STATUS_CONFIG[status] ?? DEFAULT_STATUS).label
    }
    /** Maps a status key to its FontAwesome icon class via STATUS_CONFIG. */
    getStatusIcon(status) {
        return (STATUS_CONFIG[status] ?? DEFAULT_STATUS).icon
    }
    /** Maps a status key to its CSS color class name via STATUS_CONFIG. */
    getStatusColor(status) {
        return (STATUS_CONFIG[status] ?? DEFAULT_STATUS).cssClass
    }
    /** Maps a responsible role key to its display label. */
    getResponsibleRoleLabel(role) {
        const labels = {
            district_manager: 'District Manager',
            maintenance: 'Maintenance',
            plant_manager: 'Plant Manager'
        }
        return labels[role] || 'Unassigned'
    }
    /** Maps a responsible role key to its FontAwesome icon class. */
    getResponsibleRoleIcon(role) {
        const icons = {
            district_manager: 'fa-user-shield',
            maintenance: 'fa-wrench',
            plant_manager: 'fa-user-tie'
        }
        return icons[role] || 'fa-users'
    }
    /** Resolves a plant code to its display name from the cached plants list. */
    getPlantName(plantCode) {
        const plant = this.plants.find((p) => p.plant_code === plantCode)
        return plant ? plant.plant_name : plantCode || 'No Plant'
    }
    /** Truncates text by character count or word count with ellipsis. Delegates to FormatUtility. */
    truncateText(text, maxLength, byWords = false) {
        return FormatUtility.truncateText(text, maxLength, byWords)
    }
    /** Resolves a creator's display name from the cached profiles. */
    getCreatorName(userId) {
        if (!userId) return 'Unknown'
        const profile = this.creatorProfiles[userId]
        if (profile) {
            const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            return name || userId.slice(0, 8)
        }
        return userId.slice(0, 8)
    }
    /** Computes per-plant distribution of total, completed, pending, and overdue items. */
    getPlantDistribution(listItems) {
        const distribution = {}
        const uniquePlants = [...new Set(listItems.map((item) => item.plant_code || 'Unassigned'))]
        uniquePlants.forEach((plant) => {
            distribution[plant] = { Completed: 0, Overdue: 0, Pending: 0, Total: 0 }
        })
        listItems.forEach((item) => {
            const plant = item.plant_code || 'Unassigned'
            distribution[plant].Total++
            if (item.completed) {
                distribution[plant].Completed++
            } else {
                distribution[plant].Pending++
                if (this.isOverdue(item)) distribution[plant].Overdue++
            }
        })
        this.plantDistribution = distribution
        return distribution
    }
    /** Fetches planned items within a date range for calendar views. */
    async fetchPlannedItems(startDate, endDate) {
        const { res, json } = await APIUtility.post('/list-service/fetch-planned-items', { endDate, startDate })
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch planned items')
        return json?.data ?? []
    }
    /** Associates a list item with a planned date for scheduling. */
    async addPlannedItem(listItemId, plannedDate) {
        const user = await UserService.getCurrentUser()
        const { res, json } = await APIUtility.post('/list-service/add-planned-item', {
            listItemId,
            plannedDate,
            userId: user?.id
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to add planned item')
        return json
    }
    /** Removes a planned date association from a list item. */
    async removePlannedItem(listItemId, plannedDate) {
        const { res, json } = await APIUtility.post('/list-service/remove-planned-item', { listItemId, plannedDate })
        if (!res.ok) throw new Error(json?.error || 'Failed to remove planned item')
        return json
    }
    /** Clears all planned items within a date range. */
    async clearPlannedItems(startDate, endDate) {
        const { res, json } = await APIUtility.post('/list-service/clear-planned-items', { endDate, startDate })
        if (!res.ok) throw new Error(json?.error || 'Failed to clear planned items')
        return json
    }
}
export const ListService = new ListServiceImpl()
