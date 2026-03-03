// @ts-ignore
import {createClient} from "@supabase/supabase-js";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const PRESENCE_TABLE = "users_presence";
const STALE_THRESHOLD_MS = 2 * 60 * 1000;

function createSupabaseClient(auth: string) {
    return createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        {global: {headers: {Authorization: auth}}}
    );
}

async function parseBody(req: Request): Promise<any> {
    try { return await req.json(); } catch { return {}; }
}

function resolveClient(headerAuth: string, body: any) {
    if ((!headerAuth || !headerAuth.trim()) && body?.token) {
        return createSupabaseClient(`Bearer ${body.token}`);
    }
    return createSupabaseClient(headerAuth);
}

function nowISO(): string {
    return new Date().toISOString();
}

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const headers = getCorsHeaders(origin);
    try {
        const url = new URL(req.url);
        const endpoint = url.pathname.split("/").pop();
        const headerAuth = req.headers.get("Authorization") || "";
        let supabase = createSupabaseClient(headerAuth);

        switch (endpoint) {
            case "set-online":
            case "set-offline":
            case "heartbeat":
            case "update-activity": {
                const body = await parseBody(req);
                supabase = resolveClient(headerAuth, body);
                const userId = body?.userId;
                if (typeof userId !== "string" || !userId) return errorResponse("User ID is required", headers, 400);
                const now = nowISO();
                const updateMap: Record<string, any> = {
                    "set-online": {is_online: true, last_seen: now, last_activity: now, updated_at: now},
                    "set-offline": {is_online: false, last_seen: now, updated_at: now},
                    "heartbeat": {last_seen: now, updated_at: now},
                    "update-activity": {last_activity: now, last_seen: now, updated_at: now}
                };
                const isUpsert = endpoint === "set-online";
                const {error} = isUpsert
                    ? await supabase.from(PRESENCE_TABLE).upsert({user_id: userId, ...updateMap[endpoint]}, {onConflict: "user_id"})
                    : await supabase.from(PRESENCE_TABLE).update(updateMap[endpoint]).eq("user_id", userId);
                if (error) return errorResponse(error.message, headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "cleanup": {
                const staleTime = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
                const {error} = await supabase.from(PRESENCE_TABLE)
                    .update({is_online: false, updated_at: nowISO()})
                    .eq("is_online", true)
                    .lt("last_seen", staleTime);
                if (error) return errorResponse(error.message, headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "fetch-online-users": {
                const {data, error} = await supabase.from(PRESENCE_TABLE)
                    .select("user_id, last_seen, last_activity")
                    .eq("is_online", true)
                    .order("last_activity", {ascending: false});
                if (error) return errorResponse(error.message, headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500, {message: (error as Error).message});
    }
});
