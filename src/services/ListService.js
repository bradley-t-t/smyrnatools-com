import APIUtility from '../utils/APIUtility'
import CacheUtility from '../utils/CacheUtility'
import DateUtility from '../utils/DateUtility'
import FormatUtility from '../utils/FormatUtility'
import GrammarUtility from '../utils/GrammarUtility'
import { AIService } from './AIService'
import { UserService } from './UserService'

const PRIORITY_CACHE_TTL_MS = 30 * 60_000
const MAX_PLANNED_ITEMS_PER_DAY = 3
const PRIORITY_CACHE_PREFIX = 'ai:priority:'

/** Priority levels with display config — ordered from highest to lowest severity. */
const PRIORITY_CONFIG = {
    urgent: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'fa-fire', label: 'Urgent' },
    high: {
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        icon: 'fa-arrow-up',
        label: 'High'
    },
    medium: {
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        icon: 'fa-minus',
        label: 'Medium'
    },
    low: { color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', icon: 'fa-arrow-down', label: 'Low' },
    none: {
        color: 'text-slate-400',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        icon: 'fa-minus',
        label: 'No Priority'
    }
}
const PRIORITY_OPTIONS = [
    { label: 'No Priority', value: 'none' },
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' }
]
const DEFAULT_PRIORITY = PRIORITY_CONFIG.none

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
    async createListItem(
        plantCode,
        description,
        deadline,
        comments,
        status = 'pending',
        responsibleRole = null,
        priority = 'none'
    ) {
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
            priority: priority || 'none',
            responsible_role: responsibleRole || null,
            status: status || 'pending',
            userId
        })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to create list item')
        CacheUtility.delete('list:items-with-profiles')
        await this.fetchListItems({ force: true })
        this.invalidateAllPriorityScores()
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
            priority: item.priority || 'none',
            responsible_role: item.responsible_role || null,
            status: item.status || 'pending'
        }
        const { res, json } = await APIUtility.post('/list-service/update', { item: update })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to update list item')
        CacheUtility.delete('list:items-with-profiles')
        CacheUtility.delete(`${PRIORITY_CACHE_PREFIX}${item.id}`)
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
    /** Returns priority display metadata (label, icon, Tailwind classes) for a given priority value. */
    getPriorityConfig(priority) {
        return PRIORITY_CONFIG[priority] ?? DEFAULT_PRIORITY
    }
    /** Returns the ordered list of priority options for dropdowns. */
    getPriorityOptions() {
        return PRIORITY_OPTIONS
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
    /**
     * Builds a chronological activity feed from list items.
     * Derives events from creation timestamps, completion records, and current status.
     * @param {Array} items - List items to build activity from.
     * @returns {Array<{type: string, timestamp: string, item: object, userId: string, description: string}>}
     */
    buildActivityFeed(items) {
        const events = []
        for (const item of items) {
            if (item.created_at) {
                events.push({
                    type: 'created',
                    timestamp: item.created_at,
                    item,
                    userId: item.user_id,
                    description: item.description
                })
            }
            if (item.completed && item.completed_at) {
                events.push({
                    type: 'completed',
                    timestamp: item.completed_at,
                    item,
                    userId: item.completed_by,
                    description: item.description
                })
            }
        }
        events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        return events
    }
    /**
     * Formats a timestamp into a human-readable relative string (e.g. "2 hours ago", "Yesterday").
     * Falls back to absolute date for anything older than 7 days.
     * @param {string} timestamp - ISO timestamp string.
     * @returns {string} Relative or absolute time label.
     */
    formatRelativeTime(timestamp) {
        if (!timestamp) return ''
        const now = new Date()
        const then = new Date(timestamp)
        const diffMs = now - then
        const diffMinutes = Math.floor(diffMs / 60_000)
        const diffHours = Math.floor(diffMs / 3_600_000)
        const diffDays = Math.floor(diffMs / 86_400_000)
        if (diffMinutes < 1) return 'Just now'
        if (diffMinutes < 60) return `${diffMinutes}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return `${diffDays}d ago`
        return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
    /** Invalidates all cached priority scores so the next auto-plan re-scores everything. */
    invalidateAllPriorityScores() {
        const keysToDelete = Object.keys(CacheUtility.caches).filter((key) => key.startsWith(PRIORITY_CACHE_PREFIX))
        for (const key of keysToDelete) CacheUtility.delete(key)
    }
    /**
     * Retrieves cached priority scores for items that have them, identifies items needing scoring.
     * @returns {{ cached: Map<string, number>, uncached: Array }} Partitioned results.
     */
    partitionItemsByScoreCache(openItems) {
        const cached = new Map()
        const uncached = []
        for (const item of openItems) {
            const score = CacheUtility.get(`${PRIORITY_CACHE_PREFIX}${item.id}`)
            if (score !== null) {
                cached.set(item.id, score)
            } else {
                uncached.push(item)
            }
        }
        return { cached, uncached }
    }
    /**
     * AI-powered auto-plan: scores open items by operational priority, then distributes
     * the highest-priority items across the week while respecting deadlines and existing plans.
     * Returns assignments grouped by day for progressive rendering.
     * @param {Array<{dateStr: string}>} weekDates - Mon-Sat date objects from the planner.
     * @param {Array<{list_item_id: string, planned_date: string}>} existingPlannedItems - Already-planned records.
     * @returns {Promise<Map<string, Array<string>>>} Map of dateStr → array of itemIds.
     */
    async autoPlanWeek(weekDates, existingPlannedItems) {
        const openItems = this.listItems.filter((item) => !item.completed && item.status !== 'completed')
        if (openItems.length === 0) return new Map()
        const alreadyPlannedIds = new Set(existingPlannedItems.map((pi) => pi.list_item_id))
        const plannable = openItems.filter((item) => !alreadyPlannedIds.has(item.id))
        if (plannable.length === 0) return new Map()
        const allScores = await this.getScoresForItems(plannable)
        if (!allScores || allScores.size === 0) return new Map()
        const ranked = [...plannable]
            .map((item) => ({ item, score: allScores.get(item.id) ?? 5 }))
            .sort((a, b) => b.score - a.score)
        const flatAssignments = this.distributeItemsAcrossWeek(ranked, weekDates, existingPlannedItems)
        const byDay = new Map()
        for (const { itemId, plannedDate } of flatAssignments) {
            if (!byDay.has(plannedDate)) byDay.set(plannedDate, [])
            byDay.get(plannedDate).push(itemId)
        }
        return byDay
    }
    /**
     * Computes a deterministic priority score (1-10) from an item's structured fields.
     * Used as the immediate/fallback scoring — no API call needed.
     */
    computeDeterministicScore(item) {
        let score = 5
        if (item.status === 'blocked') score = 9
        else if (item.status === 'overdue' || this.isOverdue(item)) score = 9
        else if (item.status === 'in_progress') score = 7
        else if (item.status === 'ordered_materials') score = 6
        else if (item.status === 'waiting') score = 4
        else if (item.status === 'pending') score = 5
        if (item.deadline) {
            const daysUntilDeadline = (new Date(item.deadline) - new Date()) / (1000 * 60 * 60 * 24)
            if (daysUntilDeadline < 0) score = Math.max(score, 9)
            else if (daysUntilDeadline <= 2) score = Math.min(10, score + 2)
            else if (daysUntilDeadline <= 5) score = Math.min(10, score + 1)
        }
        if (item.responsible_role === 'maintenance') score = Math.min(10, score + 1)
        return score
    }
    /**
     * Fetches priority scores for items. Uses cached AI scores when available,
     * falls back to deterministic scoring, and calls AI for uncached items
     * to get scores + update deadline/status.
     * @returns {Promise<Map<string, number>>} Map of itemId → priority score.
     */
    async getScoresForItems(items) {
        const scores = new Map()
        const uncached = []
        for (const item of items) {
            const cached = CacheUtility.get(`${PRIORITY_CACHE_PREFIX}${item.id}`)
            if (cached !== null) {
                scores.set(item.id, cached)
            } else {
                uncached.push(item)
                scores.set(item.id, this.computeDeterministicScore(item))
            }
        }
        if (uncached.length > 0) {
            try {
                const aiResults = await AIService.prioritizeListItems(uncached)
                if (aiResults) {
                    for (const [itemId, data] of aiResults) {
                        scores.set(itemId, data.score)
                        CacheUtility.set(`${PRIORITY_CACHE_PREFIX}${itemId}`, data.score, PRIORITY_CACHE_TTL_MS)
                    }
                    await this.applyAIUpdates(uncached, aiResults)
                }
            } catch {
                // Deterministic scores already set as fallback
            }
        }
        return scores
    }
    /**
     * Applies AI-recommended deadline and status updates to list items.
     * Only updates if the AI suggestion differs from the current value.
     */
    async applyAIUpdates(items, aiResults) {
        for (const item of items) {
            const aiData = aiResults.get(item.id)
            if (!aiData) continue
            const updates = {}
            let needsUpdate = false
            if (aiData.status && aiData.status !== item.status && !item.completed) {
                updates.status = aiData.status
                needsUpdate = true
            }
            if (aiData.deadline) {
                const aiDeadline = new Date(`${aiData.deadline}T17:00:00.000Z`)
                const currentDeadline = item.deadline ? new Date(item.deadline) : null
                if (!currentDeadline || aiDeadline < currentDeadline) {
                    updates.deadline = aiDeadline.toISOString()
                    needsUpdate = true
                }
            }
            if (needsUpdate) {
                try {
                    await this.updateListItem({ ...item, ...updates })
                } catch {}
            }
        }
    }
    /**
     * Distributes ranked items across the week's days, respecting deadlines and per-day caps.
     * Items with deadlines within the week are placed on or before their deadline day.
     */
    distributeItemsAcrossWeek(rankedItems, weekDates, existingPlannedItems) {
        const today = new Date().toISOString().split('T')[0]
        const maxPlanDate = new Date()
        maxPlanDate.setDate(maxPlanDate.getDate() + 7)
        const oneWeekAhead = maxPlanDate.toISOString().split('T')[0]
        const futureDays = weekDates.filter((d) => d.dateStr >= today && d.dateStr <= oneWeekAhead)
        if (futureDays.length === 0) return []
        const daySlots = new Map()
        for (const day of futureDays) {
            const existingCount = existingPlannedItems.filter((pi) => pi.planned_date === day.dateStr).length
            daySlots.set(day.dateStr, MAX_PLANNED_ITEMS_PER_DAY - existingCount)
        }
        const totalAvailableSlots = [...daySlots.values()].reduce((sum, slots) => sum + Math.max(0, slots), 0)
        const itemsToPlace = rankedItems.slice(0, totalAvailableSlots)
        const assignments = []
        const deadlineItems = []
        const flexibleItems = []
        const dateStrings = futureDays.map((d) => d.dateStr)
        const weekStart = dateStrings[0]
        const weekEnd = dateStrings[dateStrings.length - 1]
        for (const entry of itemsToPlace) {
            const deadlineDate = entry.item.deadline ? entry.item.deadline.split('T')[0] : null
            if (deadlineDate && deadlineDate >= weekStart && deadlineDate <= weekEnd) {
                deadlineItems.push({ ...entry, deadlineDate })
            } else {
                flexibleItems.push(entry)
            }
        }
        for (const entry of deadlineItems) {
            const targetDateIndex = dateStrings.findIndex((d) => d >= entry.deadlineDate)
            const targetDate = targetDateIndex >= 0 ? dateStrings[targetDateIndex] : null
            let placed = false
            if (targetDate && daySlots.get(targetDate) > 0) {
                assignments.push({ itemId: entry.item.id, plannedDate: targetDate })
                daySlots.set(targetDate, daySlots.get(targetDate) - 1)
                placed = true
            }
            if (!placed) {
                for (let i = (targetDateIndex >= 0 ? targetDateIndex : dateStrings.length) - 1; i >= 0; i--) {
                    if (daySlots.get(dateStrings[i]) > 0) {
                        assignments.push({ itemId: entry.item.id, plannedDate: dateStrings[i] })
                        daySlots.set(dateStrings[i], daySlots.get(dateStrings[i]) - 1)
                        placed = true
                        break
                    }
                }
            }
            if (!placed) {
                for (const dateStr of dateStrings) {
                    if (daySlots.get(dateStr) > 0) {
                        assignments.push({ itemId: entry.item.id, plannedDate: dateStr })
                        daySlots.set(dateStr, daySlots.get(dateStr) - 1)
                        break
                    }
                }
            }
        }
        let dayIndex = 0
        for (const entry of flexibleItems) {
            let placed = false
            for (let attempt = 0; attempt < dateStrings.length; attempt++) {
                const dateStr = dateStrings[(dayIndex + attempt) % dateStrings.length]
                if (daySlots.get(dateStr) > 0) {
                    assignments.push({ itemId: entry.item.id, plannedDate: dateStr })
                    daySlots.set(dateStr, daySlots.get(dateStr) - 1)
                    dayIndex = (dayIndex + attempt + 1) % dateStrings.length
                    placed = true
                    break
                }
            }
            if (!placed) break
        }
        return assignments
    }
}
export const ListService = new ListServiceImpl()
