// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
// @ts-ignore
import { errorResponse, getCorsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts'

const ALLOWED_TABLES = new Set([
    'users',
    'users_preferences',
    'users_presence',
    'users_sessions',
    'mixers',
    'operators',
    'tractors',
    'trailers',
    'equipment',
    'pickup_trucks',
    'plants',
    'regions',
    'mixer_comments',
    'mixer_history',
    'mixer_images',
    'tractor_comments',
    'tractor_history',
    'trailer_comments',
    'equipment_comments',
    'equipment_history',
    'operator_history',
    'pickup_truck_comments',
    'roles',
    'users_roles',
    'notifications',
    'users_pinned_conversations'
])

const ALLOWED_COLUMNS: Record<string, Set<string>> = {
    users: new Set(['id', 'email', 'name', 'last_login_at', 'created_at', 'updated_at']),
    users_preferences: new Set([
        'user_id',
        'default_view_mode',
        'equipment_filters',
        'mixer_filters',
        'operator_filters',
        'tractor_filters',
        'trailer_filters',
        'manager_filters',
        'last_viewed_filters',
        'selected_region',
        'region_overlay_minimized',
        'created_at',
        'updated_at'
    ]),
    users_presence: new Set(['id', 'user_id', 'status', 'last_seen', 'created_at', 'updated_at']),
    users_sessions: new Set(['user_id', 'browser', 'os', 'device', 'user_agent', 'last_active', 'created_at']),
    mixers: new Set([
        'id',
        'truck_number',
        'vin',
        'make',
        'model',
        'year',
        'status',
        'assigned_operator',
        'assigned_plant',
        'drum_type',
        'cleanliness_rating',
        'last_service',
        'created_at',
        'updated_at'
    ]),
    operators: new Set(['employee_id', 'name', 'status', 'position', 'plant', 'created_at', 'updated_at']),
    tractors: new Set([
        'id',
        'tractor_number',
        'vin',
        'make',
        'model',
        'year',
        'status',
        'type',
        'assigned_operator',
        'assigned_plant',
        'last_service',
        'created_at',
        'updated_at'
    ]),
    trailers: new Set([
        'id',
        'trailer_number',
        'vin',
        'make',
        'model',
        'year',
        'status',
        'type',
        'assigned_plant',
        'created_at',
        'updated_at'
    ]),
    equipment: new Set([
        'id',
        'identifying_number',
        'description',
        'make',
        'model',
        'year_made',
        'status',
        'assigned_plant',
        'category',
        'created_at',
        'updated_at'
    ]),
    pickup_trucks: new Set([
        'id',
        'truck_number',
        'vin',
        'make',
        'model',
        'year',
        'status',
        'assigned_to',
        'assigned_plant',
        'created_at',
        'updated_at'
    ]),
    plants: new Set(['id', 'plant_name', 'plant_code', 'address', 'city', 'state', 'created_at', 'updated_at']),
    regions: new Set(['id', 'name', 'region_code', 'type', 'plant_codes', 'created_at', 'updated_at']),
    notifications: new Set(['id', 'user_id', 'title', 'message', 'read', 'type', 'created_at']),
    roles: new Set(['id', 'name', 'weight', 'permissions', 'created_at', 'updated_at']),
    users_roles: new Set(['id', 'name', 'weight', 'permissions', 'created_at', 'updated_at']),
    users_pinned_conversations: new Set(['id', 'user_id', 'conversation_id', 'created_at']),
    mixer_comments: new Set(['id', 'mixer_id', 'user_id', 'comment', 'created_at', 'updated_at']),
    mixer_history: new Set(['id', 'mixer_id', 'user_id', 'field', 'old_value', 'new_value', 'created_at']),
    mixer_images: new Set(['id', 'mixer_id', 'image_path', 'uploaded_by', 'created_at']),
    tractor_comments: new Set(['id', 'tractor_id', 'user_id', 'comment', 'created_at', 'updated_at']),
    tractor_history: new Set(['id', 'tractor_id', 'user_id', 'field', 'old_value', 'new_value', 'created_at']),
    trailer_comments: new Set(['id', 'trailer_id', 'user_id', 'comment', 'created_at', 'updated_at']),
    equipment_comments: new Set(['id', 'equipment_id', 'user_id', 'comment', 'created_at', 'updated_at']),
    equipment_history: new Set(['id', 'equipment_id', 'user_id', 'field', 'old_value', 'new_value', 'created_at']),
    operator_history: new Set(['id', 'employee_id', 'user_id', 'field', 'old_value', 'new_value', 'created_at']),
    pickup_truck_comments: new Set(['id', 'pickup_truck_id', 'user_id', 'comment', 'created_at', 'updated_at'])
}

function sanitizeTableName(name: string | null): string | null {
    if (!name || typeof name !== 'string') return null
    const cleaned = name.toLowerCase().replace(/[^a-z0-9_]/g, '')
    return ALLOWED_TABLES.has(cleaned) ? cleaned : null
}

// Tables that require row-level scoping to the caller's own user_id.
// Filters MUST be ('user_id' | 'id') === auth, otherwise the request is rejected.
const CALLER_SCOPED_TABLES: Record<string, string> = {
    users: 'id',
    users_sessions: 'user_id',
    users_preferences: 'user_id',
    users_presence: 'user_id',
    users_pinned_conversations: 'user_id'
}

// For caller-scoped (sensitive) tables, '*' is expanded to the explicit
// allowlist — never the raw DB '*' — to guarantee no unlisted column leaks.
// For other tables, '*' passes through and arbitrary column names are
// rejected unless they match the table's allowlist.
function sanitizeColumns(table: string, columns: string): string | null {
    const allowlist = ALLOWED_COLUMNS[table]
    if (columns === '*') {
        if (CALLER_SCOPED_TABLES[table]) {
            if (!allowlist) return null
            return [...allowlist].join(', ')
        }
        return '*'
    }
    if (!allowlist) return null
    const requested = columns
        .split(',')
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean)
    const safe = requested.filter((c) => allowlist.has(c))
    return safe.length > 0 ? safe.join(', ') : null
}

function sanitizeColumnName(table: string, column: string): string | null {
    if (!column || typeof column !== 'string') return null
    const cleaned = column.toLowerCase().replace(/[^a-z0-9_]/g, '')
    const allowlist = ALLOWED_COLUMNS[table]
    if (!allowlist) return /^[a-z0-9_]+$/.test(cleaned) ? cleaned : null
    return allowlist.has(cleaned) ? cleaned : null
}

// @ts-ignore
import { requireAuthenticated } from '../_shared/requireSession.ts'

async function parseBody(req: Request): Promise<any> {
    try {
        return await req.json()
    } catch {
        return {}
    }
}

function stringField(body: any, key: string, fallback?: string): string | null {
    return typeof body?.[key] === 'string' ? body[key] : (fallback ?? null)
}

Deno.serve(async (req) => {
    const origin = req.headers.get('origin')
    if (req.method === 'OPTIONS') return handleOptions(origin)
    const headers = getCorsHeaders(origin)
    try {
        const url = new URL(req.url)
        const endpoint = url.pathname.split('/').pop()
        const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { autoRefreshToken: false, persistSession: false } })

        switch (endpoint) {
            case 'table-exists': {
                const auth = await requireAuthenticated(supabase, req, headers)
                if (auth instanceof Response) return auth
                const body = await parseBody(req)
                const tableName = sanitizeTableName(stringField(body, 'tableName'))
                if (!tableName) return errorResponse('Invalid or disallowed table name', headers, 400)
                const query = `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) as exists`
                const { data, error } = await supabase.rpc('execute_sql', { query, params: [tableName] })
                if (error) return errorResponse('Operation failed', headers, 400)
                return jsonResponse({ exists: Array.isArray(data) && data[0]?.exists === true }, headers)
            }
            case 'get-all-records': {
                return errorResponse('Raw SQL query endpoint has been removed for security', headers, 403)
            }
            case 'fetch-all': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const table = sanitizeTableName(stringField(body, 'table'))
                if (!table) return errorResponse('Invalid or disallowed table name', headers, 400)
                if (CALLER_SCOPED_TABLES[table])
                    return errorResponse('This table requires a scoped fetch — use fetch with the caller filter', headers, 403)
                const columns = sanitizeColumns(table, stringField(body, 'columns', '*')!)
                if (!columns) return errorResponse('Invalid or unsupported columns for this table', headers, 400)
                const orderByRaw = stringField(body, 'orderBy', 'id')!
                const orderBy = sanitizeColumnName(table, orderByRaw)
                let query: any = supabase.from(table).select(columns)
                if (orderBy) query = query.order(orderBy)
                const { data, error } = await query
                if (error) return errorResponse('Failed to fetch records', headers, 400)
                return jsonResponse({ data: data ?? [] }, headers)
            }
            case 'fetch': {
                const body = await parseBody(req)
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const table = sanitizeTableName(stringField(body, 'table'))
                const filterColumnRaw = stringField(body, 'filterColumn')
                if (!table || !filterColumnRaw)
                    return errorResponse('Invalid or disallowed table name or missing filterColumn', headers, 400)
                const filterColumn = sanitizeColumnName(table, filterColumnRaw)
                if (!filterColumn) return errorResponse('Invalid filter column', headers, 400)
                const scopedColumn = CALLER_SCOPED_TABLES[table]
                if (scopedColumn) {
                    if (filterColumn !== scopedColumn)
                        return errorResponse('This table can only be queried by ' + scopedColumn, headers, 403)
                    if (body?.value !== auth)
                        return errorResponse('Forbidden: can only query your own records', headers, 403)
                }
                const columns = sanitizeColumns(table, stringField(body, 'columns', '*')!)
                if (!columns) return errorResponse('Invalid or unsupported columns for this table', headers, 400)
                const { data, error } = await supabase
                    .from(table)
                    .select(columns)
                    .eq(filterColumn, body?.value as any)
                if (error) return errorResponse('Failed to fetch records', headers, 400)
                return jsonResponse({ data: data ?? [] }, headers)
            }
            case 'insert':
            case 'update':
            case 'delete':
                return errorResponse(
                    'Generic mutation endpoints have been removed for security. Use the appropriate service endpoint instead.',
                    headers,
                    403
                )
            default:
                return errorResponse('Invalid endpoint', headers, 404, { path: url.pathname })
        }
    } catch (error) {
        return errorResponse('Internal server error', headers, 500)
    }
})
