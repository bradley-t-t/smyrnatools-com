// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const ALLOWED_TABLES = new Set([
    'users', 'users_preferences', 'users_presence', 'users_sessions',
    'mixers', 'operators', 'tractors', 'trailers', 'equipment', 'pickup_trucks',
    'plants', 'regions', 'list_items',
    'mixer_comments', 'mixer_history', 'mixer_images',
    'tractor_comments', 'tractor_history', 'trailer_comments',
    'equipment_comments', 'equipment_history', 'operator_history',
    'pickup_truck_comments', 'roles', 'users_roles', 'reports', 'notifications', 'documents'
]);

const ALLOWED_COLUMNS: Record<string, Set<string>> = {
    users: new Set(['id', 'email', 'name', 'created_at', 'updated_at']),
    users_preferences: new Set(['user_id', 'default_view_mode', 'equipment_filters', 'mixer_filters', 'operator_filters', 'tractor_filters', 'trailer_filters', 'manager_filters', 'last_viewed_filters', 'selected_region', 'region_overlay_minimized', 'created_at', 'updated_at']),
    users_presence: new Set(['id', 'user_id', 'status', 'last_seen', 'created_at', 'updated_at']),
    users_sessions: new Set(['id', 'user_id', 'browser', 'os', 'device', 'user_agent', 'last_active', 'created_at']),
    mixers: new Set(['id', 'truck_number', 'vin', 'make', 'model', 'year', 'status', 'assigned_operator', 'assigned_plant', 'drum_type', 'cleanliness_rating', 'last_service', 'created_at', 'updated_at']),
    operators: new Set(['employee_id', 'name', 'status', 'position', 'plant', 'created_at', 'updated_at']),
    tractors: new Set(['id', 'tractor_number', 'vin', 'make', 'model', 'year', 'status', 'type', 'assigned_operator', 'assigned_plant', 'last_service', 'created_at', 'updated_at']),
    trailers: new Set(['id', 'trailer_number', 'vin', 'make', 'model', 'year', 'status', 'type', 'assigned_plant', 'created_at', 'updated_at']),
    equipment: new Set(['id', 'identifying_number', 'description', 'make', 'model', 'year_made', 'status', 'assigned_plant', 'category', 'created_at', 'updated_at']),
    pickup_trucks: new Set(['id', 'truck_number', 'vin', 'make', 'model', 'year', 'status', 'assigned_to', 'assigned_plant', 'created_at', 'updated_at']),
    plants: new Set(['id', 'plant_name', 'plant_code', 'address', 'city', 'state', 'created_at', 'updated_at']),
    regions: new Set(['id', 'name', 'region_code', 'type', 'plant_codes', 'created_at', 'updated_at']),
    list_items: new Set(['id', 'description', 'comments', 'status', 'priority', 'assigned_to', 'plant_code', 'category', 'planned_date', 'created_at', 'updated_at', 'created_by']),
    reports: new Set(['id', 'report_name', 'user_id', 'plant_code', 'week', 'completed', 'report_date_range_start', 'report_date_range_end', 'data', 'created_at', 'updated_at']),
    notifications: new Set(['id', 'user_id', 'title', 'message', 'read', 'type', 'created_at']),
    documents: new Set(['id', 'name', 'file_path', 'file_type', 'file_size', 'uploaded_by', 'created_at', 'updated_at']),
};

function sanitizeTableName(name: string | null): string | null {
    if (!name || typeof name !== 'string') return null;
    const cleaned = name.toLowerCase().replace(/[^a-z0-9_]/g, '');
    return ALLOWED_TABLES.has(cleaned) ? cleaned : null;
}

function sanitizeColumns(table: string, columns: string): string {
    if (columns === '*') return '*';
    const allowlist = ALLOWED_COLUMNS[table];
    if (!allowlist) return '*';
    const requested = columns.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
    const safe = requested.filter(c => allowlist.has(c));
    return safe.length > 0 ? safe.join(', ') : '*';
}

function sanitizeColumnName(table: string, column: string): string | null {
    if (!column || typeof column !== 'string') return null;
    const cleaned = column.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const allowlist = ALLOWED_COLUMNS[table];
    if (!allowlist) return cleaned;
    return allowlist.has(cleaned) ? cleaned : null;
}

async function parseBody(req: Request): Promise<any> {
    try {
        return await req.json();
    } catch {
        return {};
    }
}

function stringField(body: any, key: string, fallback?: string): string | null {
    return typeof body?.[key] === "string" ? body[key] : fallback ?? null;
}

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const headers = getCorsHeaders(origin);
    try {
        const url = new URL(req.url);
        const endpoint = url.pathname.split("/").pop();
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {global: {headers: {Authorization: req.headers.get("Authorization") || ""}}}
        );

        switch (endpoint) {
            case "table-exists": {
                const body = await parseBody(req);
                const tableName = sanitizeTableName(stringField(body, "tableName"));
                if (!tableName) return errorResponse("Invalid or disallowed table name", headers, 400);
                const query = `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) as exists`;
                const {data, error} = await supabase.rpc("execute_sql", {query, params: [tableName]});
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({exists: Array.isArray(data) && data[0]?.exists === true}, headers);
            }
            case "get-all-records": {
                const body = await parseBody(req);
                const tableName = sanitizeTableName(stringField(body, "tableName"));
                if (!tableName) return errorResponse("Invalid or disallowed table name", headers, 400);
                const {data, error} = await supabase.rpc("execute_sql", {query: `SELECT * FROM ${tableName}`, params: []});
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "fetch-all": {
                const body = await parseBody(req);
                const table = sanitizeTableName(stringField(body, "table"));
                if (!table) return errorResponse("Invalid or disallowed table name", headers, 400);
                const columns = sanitizeColumns(table, stringField(body, "columns", "*")!);
                const orderByRaw = stringField(body, "orderBy", "id")!;
                const orderBy = sanitizeColumnName(table, orderByRaw) ?? "id";
                const {data, error} = await supabase.from(table).select(columns).order(orderBy as any);
                if (error) return errorResponse("Failed to fetch records", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "fetch": {
                const body = await parseBody(req);
                const table = sanitizeTableName(stringField(body, "table"));
                const filterColumnRaw = stringField(body, "filterColumn");
                if (!table || !filterColumnRaw) return errorResponse("Invalid or disallowed table name or missing filterColumn", headers, 400);
                const filterColumn = sanitizeColumnName(table, filterColumnRaw);
                if (!filterColumn) return errorResponse("Invalid filter column", headers, 400);
                const columns = sanitizeColumns(table, stringField(body, "columns", "*")!);
                const {data, error} = await supabase.from(table).select(columns).eq(filterColumn, body?.value as any);
                if (error) return errorResponse("Failed to fetch records", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "insert": {
                const body = await parseBody(req);
                const table = sanitizeTableName(stringField(body, "table"));
                const item = body?.item ?? null;
                if (!table || !item) return errorResponse("Invalid or disallowed table name or missing item", headers, 400);
                const {data, error} = await supabase.from(table).insert(item).select("*");
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "update": {
                const body = await parseBody(req);
                const table = sanitizeTableName(stringField(body, "table"));
                const filterColumnRaw = stringField(body, "filterColumn");
                const dataUpdate = body?.data ?? null;
                if (!table || !filterColumnRaw || dataUpdate === null) return errorResponse("Invalid or disallowed table name or missing fields", headers, 400);
                const filterCol = sanitizeColumnName(table, filterColumnRaw);
                if (!filterCol) return errorResponse("Invalid filter column", headers, 400);
                const {error} = await supabase.from(table).update(dataUpdate).eq(filterCol, body?.value as any);
                if (error) return errorResponse("Failed to update record", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "delete": {
                const body = await parseBody(req);
                const table = sanitizeTableName(stringField(body, "table"));
                const filterColumnRaw = stringField(body, "filterColumn");
                if (!table || !filterColumnRaw) return errorResponse("Invalid or disallowed table name or missing fields", headers, 400);
                const filterCol = sanitizeColumnName(table, filterColumnRaw);
                if (!filterCol) return errorResponse("Invalid filter column", headers, 400);
                const {error} = await supabase.from(table).delete().eq(filterCol, body?.value as any);
                if (error) return errorResponse("Failed to delete record", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
