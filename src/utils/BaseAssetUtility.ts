import { Database } from '../services/DatabaseService'
import { UserService } from '../services/UserService'
import APIUtility from './APIUtility'

interface EntityWithId {
    id: string
    [key: string]: unknown
}

interface ApiPostResult {
    json: Record<string, unknown>
    res: Response
}

interface CountMap {
    [entityId: string]: number
}

interface StatusHistoryMap {
    [entityId: string]: string
}

interface ItemWithCounts {
    commentsCount: number
    openIssuesCount: number
    [key: string]: unknown
}

interface FleetItem extends Record<string, unknown> {
    id: string
    createdAt?: string
    status?: string
    assignedOperator?: string | number | null
}

interface FetchWithDetailsBaseParams {
    enrichFn?: ((item: ItemWithCounts & { statusChangedAt: string | null }) => ItemWithCounts) | null
    fetchAllFn: () => Promise<FleetItem[]>
    historyTableName: string
    idColumnName: string
    plantField?: string
    regionCodes?: Set<string> | null
}

/** Resolves an entity object or raw ID string to its `id` property. */
const resolveEntityId = (entityOrId: EntityWithId | string): string =>
    typeof entityOrId === 'object' && entityOrId?.id ? entityOrId.id : (entityOrId as string)

/** Resolves an entity to its ID, throwing if falsy. */
export const requireEntityId = (entityOrId: EntityWithId | string | null | undefined, label = 'ID'): string => {
    if (!entityOrId) throw new Error(`${label} is required`)
    return resolveEntityId(entityOrId)
}

/**
 * Shared asset-level helpers used across all fleet services (Mixer, Tractor, Trailer, Equipment).
 * Provides user resolution, API wrappers, issue/comment counting, status history,
 * region filtering, severity normalization, and duplicate detection.
 */
const ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000000'
const VALID_SEVERITIES = ['Low', 'Medium', 'High'] as const
type Severity = (typeof VALID_SEVERITIES)[number]
const DEFAULT_SEVERITY: Severity = 'Medium'

export { resolveEntityId }

async function resolveUserId(userId?: string | null): Promise<string | null> {
    if (userId) return userId
    const user = await UserService.getCurrentUser()
    return typeof user === 'object' && user !== null ? user.id : user
}

export async function requireUserId(userId?: string | null, errorMessage = 'User ID is required'): Promise<string> {
    const resolved = await resolveUserId(userId)
    if (!resolved) throw new Error(errorMessage)
    return resolved
}

export async function resolveUserIdOrAnonymous(userId?: string | null): Promise<string> {
    return (await resolveUserId(userId)) || ANONYMOUS_USER_ID
}

export function uppercaseVin<T extends Record<string, unknown>>(entity: T): T {
    if (entity && typeof entity === 'object' && 'vin' in entity && entity.vin) {
        ;(entity as Record<string, unknown>).vin = (entity.vin as string).toUpperCase()
    }
    return entity
}

export async function apiPost(endpoint: string, payload: Record<string, unknown> = {}): Promise<ApiPostResult> {
    const { json, res } = await APIUtility.post(endpoint, payload)
    return { json, res }
}

export async function apiPostOrThrow(
    endpoint: string,
    payload: Record<string, unknown>,
    errorMessage: string
): Promise<Record<string, unknown>> {
    const { json, res } = await apiPost(endpoint, payload)
    if (!res.ok) throw new Error((json?.error as string) || errorMessage)
    return json
}

export async function apiPostRequireSuccess(
    endpoint: string,
    payload: Record<string, unknown>,
    errorMessage: string
): Promise<true> {
    const { json, res } = await apiPost(endpoint, payload)
    if (!res.ok || json?.success !== true) throw new Error((json?.error as string) || errorMessage)
    return true
}

export async function fetchAllCountsFromTable(
    tableName: string,
    idColumnName: string,
    entityIds: string[]
): Promise<CountMap> {
    if (!entityIds?.length) return {}
    const { data, error } = await Database.from(tableName).select(idColumnName).in(idColumnName, entityIds)
    if (error) return {}
    const counts: CountMap = {}
    entityIds.forEach((id) => (counts[id] = 0))
    ;((data as Record<string, string>[]) || []).forEach((row) => {
        if (row[idColumnName]) counts[row[idColumnName]] = (counts[row[idColumnName]] || 0) + 1
    })
    return counts
}

export async function fetchAllOpenIssueCountsFromTable(
    tableName: string,
    idColumnName: string,
    entityIds: string[]
): Promise<CountMap> {
    if (!entityIds?.length) return {}
    const { data, error } = await Database.from(tableName)
        .select(`${idColumnName}, time_completed`)
        .in(idColumnName, entityIds)
    if (error) return {}
    const counts: CountMap = {}
    entityIds.forEach((id) => (counts[id] = 0))
    ;((data as Record<string, string | null>[]) || []).forEach((row) => {
        if (row[idColumnName] && !row.time_completed) {
            counts[row[idColumnName] as string] = (counts[row[idColumnName] as string] || 0) + 1
        }
    })
    return counts
}

export async function fetchStatusHistoryMap(
    historyTableName: string,
    idColumnName: string,
    entityIds: string[]
): Promise<StatusHistoryMap> {
    if (!entityIds?.length) return {}
    const statusHistoryMap: StatusHistoryMap = {}
    try {
        const { data: statusHistory } = await Database.from(historyTableName)
            .select(`${idColumnName}, changed_at`)
            .eq('field_name', 'status')
            .in(idColumnName, entityIds)
            .order('changed_at', { ascending: false })
        if (statusHistory) {
            for (const entry of statusHistory as Record<string, string>[]) {
                if (!statusHistoryMap[entry[idColumnName]]) {
                    statusHistoryMap[entry[idColumnName]] = entry.changed_at
                }
            }
        }
    } catch (error) {
        console.error(`Failed to fetch status history from ${historyTableName}:`, error)
    }
    return statusHistoryMap
}

export function ensureDefaultCounts(item: Record<string, unknown>): ItemWithCounts {
    return {
        ...item,
        commentsCount: typeof item.commentsCount === 'number' ? item.commentsCount : 0,
        openIssuesCount: typeof item.openIssuesCount === 'number' ? item.openIssuesCount : 0
    }
}

export function filterByRegionCodes<T extends Record<string, unknown>>(
    items: T[],
    regionCodes: Set<string> | null | undefined,
    plantField = 'assignedPlant'
): T[] {
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
}: FetchWithDetailsBaseParams): Promise<ItemWithCounts[]> {
    const base = await fetchAllFn().catch(() => [])
    const safeBase = Array.isArray(base) ? base : []
    const entityIds = safeBase.map((item) => item.id).filter(Boolean)
    const statusHistoryMap = await fetchStatusHistoryMap(historyTableName, idColumnName, entityIds)
    const processed = safeBase.map((item) => {
        const enriched = ensureDefaultCounts({
            ...item,
            statusChangedAt: statusHistoryMap[item.id] || item.createdAt || null
        })
        return enrichFn ? enrichFn(enriched as ItemWithCounts & { statusChangedAt: string | null }) : enriched
    })
    return filterByRegionCodes(processed, regionCodes, plantField)
}

/** Converts camelCase field names to snake_case for API compatibility. */
export function toSnakeCase(fieldName: string): string {
    return fieldName.includes('_') ? fieldName : fieldName.replace(/([A-Z])/g, '_$1').toLowerCase()
}

export function normalizeSeverity(severity: string): Severity {
    return (VALID_SEVERITIES as readonly string[]).includes(severity) ? (severity as Severity) : DEFAULT_SEVERITY
}

export function getDuplicateFieldValues<T>(items: T[], fieldExtractor: (item: T) => string | null): Set<string> {
    const counts = new Map<string, number>()
    for (const item of items) {
        const key = fieldExtractor(item)
        if (!key) continue
        counts.set(key, (counts.get(key) || 0) + 1)
    }
    const duplicates = new Set<string>()
    counts.forEach((count, key) => {
        if (count > 1) duplicates.add(key)
    })
    return duplicates
}

/** Returns true when the item has no valid operator assignment. */
export function hasNoOperator(item: FleetItem): boolean {
    return (
        !item.assignedOperator ||
        item.assignedOperator === '0' ||
        item.assignedOperator === 0 ||
        item.assignedOperator === null ||
        item.assignedOperator === 'null'
    )
}
