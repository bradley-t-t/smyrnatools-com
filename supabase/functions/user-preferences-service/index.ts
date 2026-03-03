// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const PREFERENCES_TABLE = "users_preferences";

async function parseBody(req: Request): Promise<any> {
    try { return await req.json(); } catch { return {}; }
}

function requireStringId(body: any, key: string): string | null {
    const val = body?.[key];
    return typeof val === "string" && val ? val : null;
}

function nowISO(): string {
    return new Date().toISOString();
}

async function upsertPreference(supabase: any, userId: string, field: string, value: unknown, headers: Record<string, string>): Promise<Response> {
    const now = nowISO();
    const {error} = await supabase.from(PREFERENCES_TABLE).upsert(
        {user_id: userId, [field]: value, updated_at: now, created_at: now},
        {onConflict: "user_id"}
    );
    if (error) return errorResponse(error.message, headers, 400);
    return jsonResponse({success: true}, headers);
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
            case "get": {
                const body = await parseBody(req);
                const userId = requireStringId(body, "userId");
                if (!userId) return errorResponse("User ID is required", headers, 400);
                const {data, error} = await supabase.from(PREFERENCES_TABLE).select("*").eq("user_id", userId).maybeSingle();
                if (error) return errorResponse(error.message, headers, 400);
                return jsonResponse({data: data ?? null}, headers);
            }
            case "save-mixer-filters": {
                const body = await parseBody(req);
                const userId = requireStringId(body, "userId");
                if (!userId) return errorResponse("User ID is required", headers, 400);
                if (body.filters == null) return errorResponse("Filters are required", headers, 400);
                return upsertPreference(supabase, userId, "mixer_filters", body.filters, headers);
            }
            case "save-last-viewed-filters": {
                const body = await parseBody(req);
                const userId = requireStringId(body, "userId");
                if (!userId) return errorResponse("User ID is required", headers, 400);
                if (body.filters == null) return errorResponse("Filters are required", headers, 400);
                return upsertPreference(supabase, userId, "last_viewed_filters", body.filters, headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500, {message: (error as Error).message});
    }
});
