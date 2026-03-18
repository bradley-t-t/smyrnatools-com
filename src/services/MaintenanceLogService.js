import APIUtility from '../utils/APIUtility'
import { Database } from './DatabaseService'
import { UserService } from './UserService'

const MAINT_FUNCTION = '/maintenance-service'

const EQUIPMENT_TABLE = 'maintenance_log_equipment'
const ENTRIES_TABLE = 'maintenance_log_entries'
const CATEGORIES_TABLE = 'maintenance_log_categories'
const SERVICE_TYPES_TABLE = 'maintenance_log_service_types'
const SUMMARY_VIEW = 'maintenance_log_equipment_summary'
const STORAGE_BUCKET = 'smyrna'
const STORAGE_PREFIX = 'maintenance-logs'
const AUTH_ERROR = 'User not authenticated'

/** Resolves the current authenticated user with display name or throws. */
async function requireAuth() {
    const session = await UserService.getCurrentUser()
    if (!session?.id) throw new Error(AUTH_ERROR)
    const name = await UserService.getUserDisplayName(session.id)
    return { id: session.id, name }
}

/** Resolves display names for entries using getUserDisplayName. */
async function resolvePerformerNames(entries) {
    const needsResolving = entries.filter(
        (e) => e.performed_by && (!e.performed_by_name || e.performed_by_name.startsWith('User '))
    )
    if (!needsResolving.length) return entries

    const uniqueIds = [...new Set(needsResolving.map((e) => e.performed_by))]
    const nameMap = new Map()
    await Promise.all(
        uniqueIds.map(async (id) => {
            try {
                const name = await UserService.getUserDisplayName(id)
                if (name && !name.startsWith('User ')) nameMap.set(id, name)
            } catch {
                /* skip unresolvable users */
            }
        })
    )

    return entries.map((entry) => {
        const resolved = nameMap.get(entry.performed_by)
        return resolved ? { ...entry, performed_by_name: resolved } : entry
    })
}

export const MaintenanceLogService = {
    // ── Categories ──────────────────────────────────────────────

    /** Fetches all active equipment categories. */
    async fetchCategories() {
        const { data, error } = await Database.from(CATEGORIES_TABLE).select('*').eq('is_active', true).order('name')
        if (error) throw error
        return data || []
    },

    // ── Service Types ───────────────────────────────────────────

    /** Fetches all active service types. */
    async fetchServiceTypes() {
        const { data, error } = await Database.from(SERVICE_TYPES_TABLE).select('*').eq('is_active', true).order('name')
        if (error) throw error
        return data || []
    },

    // ── Equipment ───────────────────────────────────────────────

    /** Fetches equipment summary view with latest service info. Optionally filtered by plant codes. */
    async fetchEquipmentSummary(plantCodes) {
        let query = Database.from(SUMMARY_VIEW).select('*')
        if (plantCodes?.length) {
            query = query.in('plant_code', plantCodes)
        }
        const { data, error } = await query.order('plant_code').order('name')
        if (error) throw error
        return data || []
    },

    /** Creates a new equipment record. */
    async createEquipment(equipment) {
        const user = await requireAuth()
        const { res, json } = await APIUtility.post(`${MAINT_FUNCTION}/create-equipment`, {
            equipment,
            userId: user.id
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to create equipment')
        return json.data
    },

    /** Deletes an equipment record and its service history by ID. */
    async deleteEquipment(id) {
        await requireAuth()
        const { res, json } = await APIUtility.post(`${MAINT_FUNCTION}/delete-equipment`, { id })
        if (!res.ok) throw new Error(json?.error || 'Failed to delete equipment')
    },

    /** Updates an equipment record by ID. */
    async updateEquipment(id, updates) {
        await requireAuth()
        const { res, json } = await APIUtility.post(`${MAINT_FUNCTION}/update-equipment`, { id, updates })
        if (!res.ok) throw new Error(json?.error || 'Failed to update equipment')
        return json.data
    },

    // ── Service Log Entries ─────────────────────────────────────

    /** Fetches service history for a specific piece of equipment. Resolves user names from performed_by IDs. */
    async fetchServiceHistory(equipmentId) {
        const { data, error } = await Database.from(ENTRIES_TABLE)
            .select('*, maintenance_log_service_types(name)')
            .eq('equipment_id', equipmentId)
            .order('service_date', { ascending: false })
        if (error) throw error
        return resolvePerformerNames(data || [])
    },

    /** Fetches recent service entries across all equipment. Optionally limited. */
    async fetchRecentEntries(limit = 10) {
        const { data, error } = await Database.from(ENTRIES_TABLE)
            .select('*, maintenance_log_equipment(name, plant_code), maintenance_log_service_types(name)')
            .eq('status', 'completed')
            .order('service_date', { ascending: false })
            .limit(limit)
        if (error) throw error
        return resolvePerformerNames(data || [])
    },

    /** Creates a new service log entry. */
    async createEntry(entry) {
        const user = await requireAuth()
        const userName = user.name || `User ${user.id.slice(0, 8)}`
        const { res, json } = await APIUtility.post(`${MAINT_FUNCTION}/create-entry`, {
            entry,
            userId: user.id,
            userName
        })
        if (!res.ok) throw new Error(json?.error || 'Failed to create entry')
        return json.data
    },

    /** Updates a service log entry by ID. */
    async updateEntry(id, updates) {
        await requireAuth()
        const { res, json } = await APIUtility.post(`${MAINT_FUNCTION}/update-entry`, { id, updates })
        if (!res.ok) throw new Error(json?.error || 'Failed to update entry')
        return json.data
    },

    // ── Attachments ─────────────────────────────────────────────

    /** Uploads an attachment file to storage. Returns the public URL. */
    async uploadAttachment(file, equipmentId) {
        const user = await requireAuth()
        const timestamp = Date.now()
        const ext = file.name.split('.').pop()
        const path = `${STORAGE_PREFIX}/${equipmentId}/${user.id}_${timestamp}.${ext}`
        const { error } = await Database.storage.from(STORAGE_BUCKET).upload(path, file, {
            cacheControl: '3600',
            upsert: false
        })
        if (error) throw error
        const { data: urlData } = Database.storage.from(STORAGE_BUCKET).getPublicUrl(path)
        return urlData?.publicUrl || ''
    },

    // ── Stats ───────────────────────────────────────────────────

    /** Computes status counts from a list of equipment summary rows. */
    getStatusCounts(equipment) {
        const counts = { total: 0, ok: 0, dueSoon: 0, overdue: 0, neverServiced: 0 }
        for (const item of equipment) {
            counts.total++
            switch (item.service_status) {
                case 'ok':
                    counts.ok++
                    break
                case 'due_soon':
                    counts.dueSoon++
                    break
                case 'overdue':
                    counts.overdue++
                    break
                case 'never_serviced':
                    counts.neverServiced++
                    break
                default:
                    counts.ok++
            }
        }
        return counts
    },

    /** Groups upcoming/overdue entries by date for calendar display. */
    getCalendarEvents(equipment) {
        const events = {}
        for (const item of equipment) {
            const date = item.next_service_date || item.last_service_date
            if (!date) continue
            if (!events[date]) events[date] = []
            events[date].push(item)
        }
        return events
    }
}
