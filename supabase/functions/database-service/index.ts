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
    'pickup_truck_comments', 'roles', 'users_roles', 'reports', 'notifications'
]);

function sanitizeTableName(name: string | null): string | null {
    if (!name || typeof name !== 'string') return null;
    const cleaned = name.toLowerCase().replace(/[^a-z0-9_]/g, '');
    return ALLOWED_TABLES.has(cleaned) ? cleaned : null;
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
                if (error) return errorResponse(error.message, headers, 400);
                return jsonResponse({exists: Array.isArray(data) && data[0]?.exists === true}, headers);
            }
            case "get-all-records": {
                const body = await parseBody(req);
                const tableName = sanitizeTableName(stringField(body, "tableName"));
                if (!tableName) return errorResponse("Invalid or disallowed table name", headers, 400);
                const {data, error} = await supabase.rpc("execute_sql", {query: `SELECT * FROM ${tableName}`, params: []});
                if (error) return errorResponse(error.message, headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "fetch-all": {
                const body = await parseBody(req);
                const table = sanitizeTableName(stringField(body, "table"));
                if (!table) return errorResponse("Invalid or disallowed table name", headers, 400);
                const columns = stringField(body, "columns", "*")!;
                const orderBy = stringField(body, "orderBy", "id")!;
                const {data, error} = await supabase.from(table).select(columns).order(orderBy as any);
                if (error) return errorResponse(error.message, headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "fetch": {
                const body = await parseBody(req);
                const table = sanitizeTableName(stringField(body, "table"));
                const filterColumn = stringField(body, "filterColumn");
                if (!table || !filterColumn) return errorResponse("Invalid or disallowed table name or missing filterColumn", headers, 400);
                const {data, error} = await supabase.from(table).select(stringField(body, "columns", "*")!).eq(filterColumn, body?.value as any);
                if (error) return errorResponse(error.message, headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "insert": {
                const body = await parseBody(req);
                const table = sanitizeTableName(stringField(body, "table"));
                const item = body?.item ?? null;
                if (!table || !item) return errorResponse("Invalid or disallowed table name or missing item", headers, 400);
                const {data, error} = await supabase.from(table).insert(item).select("*");
                if (error) return errorResponse(error.message, headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "update": {
                const body = await parseBody(req);
                const table = sanitizeTableName(stringField(body, "table"));
                const filterColumn = stringField(body, "filterColumn");
                const dataUpdate = body?.data ?? null;
                if (!table || !filterColumn || dataUpdate === null) return errorResponse("Invalid or disallowed table name or missing fields", headers, 400);
                const {error} = await supabase.from(table).update(dataUpdate).eq(filterColumn, body?.value as any);
                if (error) return errorResponse(error.message, headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "delete": {
                const body = await parseBody(req);
                const table = sanitizeTableName(stringField(body, "table"));
                const filterColumn = stringField(body, "filterColumn");
                if (!table || !filterColumn) return errorResponse("Invalid or disallowed table name or missing fields", headers, 400);
                const {error} = await supabase.from(table).delete().eq(filterColumn, body?.value as any);
                if (error) return errorResponse(error.message, headers, 400);
                return jsonResponse({success: true}, headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500, {message: (error as Error).message});
    }
});
