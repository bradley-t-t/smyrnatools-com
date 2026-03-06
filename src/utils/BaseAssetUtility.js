import { supabase } from '../services/DatabaseService'
import { UserService } from '../services/UserService'
import APIUtility from './APIUtility'
/**
 * Shared asset-level helpers used across all fleet services (Mixer, Tractor, Trailer, Equipment).
 * Provides user resolution, API wrappers, issue/comment counting, status history,
 * region filtering, severity normalization, and duplicate detection.
 */
const ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000000'
const VALID_SEVERITIES = ['Low', 'Medium', 'High']
const DEFAULT_SEVERITY = 'Medium'
export async function resolveUserId(userId) {
    if (userId) return userId
    const user = await UserService.getCurrentUser()
    return typeof user === 'object' && user !== null ? user.id : user
}
export async function requireUserId(userId, errorMessage = 'User ID is required') {
    const resolved = await resolveUserId(userId)
    if (!resolved) throw new Error(errorMessage)
    return resolved
}
export async function resolveUserIdOrAnonymous(userId) {
    return (await resolveUserId(userId)) || ANONYMOUS_USER_ID
}
export function uppercaseVin(entity) {
    if (entity && typeof entity === 'object' && 'vin' in entity && entity.vin) {
        entity.vin = entity.vin.toUpperCase()
    }
    return entity
}
export function resolveEntityId(entityOrId) {
    return typeof entityOrId === 'object' ? entityOrId.id : entityOrId
}
export function dispatchNotificationsRefresh(detail = null) {
    try {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('notifications-refresh', detail ? { detail } : undefined))
        }
    } catch {}
}
export async function apiPost(endpoint, payload = {}) {
    const { json, res } = await APIUtility.post(endpoint, payload)
    return { json, res }
}
export async function apiPostOrThrow(endpoint, payload, errorMessage) {
    const { json, res } = await apiPost(endpoint, payload)
    if (!res.ok) throw new Error(json?.error || errorMessage)
    return json
}
export async function apiPostRequireSuccess(endpoint, payload, errorMessage) {
    const { json, res } = await apiPost(endpoint, payload)
    if (!res.ok || json?.success !== true) throw new Error(json?.error || errorMessage)
    return true
}
export async function fetchAllCountsFromTable(tableName, idColumnName, entityIds) {
    if (!entityIds?.length) return {}
    const { data, error } = await supabase.from(tableName).select(idColumnName).in(idColumnName, entityIds)
    if (error) return {}
    const counts = {}
    entityIds.forEach((id) => (counts[id] = 0))
    ;(data || []).forEach((row) => {
        if (row[idColumnName]) counts[row[idColumnName]] = (counts[row[idColumnName]] || 0) + 1
    })
    return counts
}
export async function fetchAllOpenIssueCountsFromTable(tableName, idColumnName, entityIds) {
    if (!entityIds?.length) return {}
    const { data, error } = await supabase
        .from(tableName)
        .select(`${idColumnName}, time_completed`)
        .in(idColumnName, entityIds)
    if (error) return {}
    const counts = {}
    entityIds.forEach((id) => (counts[id] = 0))
    ;(data || []).forEach((row) => {
        if (row[idColumnName] && !row.time_completed) {
            counts[row[idColumnName]] = (counts[row[idColumnName]] || 0) + 1
        }
    })
    return counts
}
export async function fetchStatusHistoryMap(historyTableName, idColumnName, entityIds) {
    if (!entityIds?.length) return {}
    const statusHistoryMap = {}
    try {
        const { data: statusHistory } = await supabase
            .from(historyTableName)
            .select(`${idColumnName}, changed_at`)
            .eq('field_name', 'status')
            .in(idColumnName, entityIds)
            .order('changed_at', { ascending: false })
        if (statusHistory) {
            for (const entry of statusHistory) {
                if (!statusHistoryMap[entry[idColumnName]]) {
                    statusHistoryMap[entry[idColumnName]] = entry.changed_at
                }
            }
        }
    } catch {}
    return statusHistoryMap
}
export function ensureDefaultCounts(item) {
    return {
        ...item,
        commentsCount: typeof item.commentsCount === 'number' ? item.commentsCount : 0,
        openIssuesCount: typeof item.openIssuesCount === 'number' ? item.openIssuesCount : 0
    }
}
export function filterByRegionCodes(items, regionCodes, plantField = 'assignedPlant') {
    if (!regionCodes) return items
    return items.filter((item) =>
        regionCodes.has(
            String(item[plantField] || '')
                .trim()
                .toUpperCase()
        )
    )
}
export async function fetchWithDetailsBase({
    enrichFn = null,
    fetchAllFn,
    historyTableName,
    idColumnName,
    plantField = 'assignedPlant',
    regionCodes = null
}) {
    const base = await fetchAllFn().catch(() => [])
    const safeBase = Array.isArray(base) ? base : []
    const entityIds = safeBase.map((item) => item.id).filter(Boolean)
    const statusHistoryMap = await fetchStatusHistoryMap(historyTableName, idColumnName, entityIds)
    const processed = safeBase.map((item) => {
        const enriched = ensureDefaultCounts({
            ...item,
            statusChangedAt: statusHistoryMap[item.id] || item.createdAt || null
        })
        return enrichFn ? enrichFn(enriched) : enriched
    })
    return filterByRegionCodes(processed, regionCodes, plantField)
}
export function normalizeSeverity(severity) {
    return VALID_SEVERITIES.includes(severity) ? severity : DEFAULT_SEVERITY
}
export function getDuplicateFieldValues(items, fieldExtractor) {
    const counts = new Map()
    for (const item of items) {
        const key = fieldExtractor(item)
        if (!key) continue
        counts.set(key, (counts.get(key) || 0) + 1)
    }
    const duplicates = new Set()
    counts.forEach((count, key) => {
        if (count > 1) duplicates.add(key)
    })
    return duplicates
}
export async function ensureSpareIfNoOperatorBase(items, updateFn) {
    const needsUpdate = (items || []).filter((item) => {
        const hasNoOperator =
            !item.assignedOperator ||
            item.assignedOperator === '0' ||
            item.assignedOperator === 0 ||
            item.assignedOperator === null ||
            item.assignedOperator === 'null'
        return item.status === 'Active' && hasNoOperator
    })
    for (const item of needsUpdate) {
        try {
            await updateFn(item)
            item.status = 'Spare'
        } catch {}
    }
    return items
}
