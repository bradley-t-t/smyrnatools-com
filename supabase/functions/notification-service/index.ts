// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const READS_TABLE = "notification_reads";

async function parseBody(req: Request): Promise<any> {
    try { return await req.json(); } catch { return {}; }
}

async function requireAuthenticated(supabase: any, headers: any): Promise<Response | null> {
    const {data, error} = await supabase.auth.getUser();
    if (error || !data?.user?.id) return errorResponse("Unauthorized", headers, 401);
    return null;
}

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const headers = getCorsHeaders(origin);
    try {
        const url = new URL(req.url);
        const endpoint = url.pathname.split("/").pop();
        const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {global: {headers: {Authorization: req.headers.get("Authorization") || ""}}});

        switch (endpoint) {
            case "mark-read": {
                const authErr = await requireAuthenticated(supabase, headers);
                if (authErr) return authErr;
                const body = await parseBody(req);
                const {userId, dbId} = body;
                if (!userId || !dbId) return errorResponse("userId and dbId are required", headers, 400);
                const {error} = await supabase.from(READS_TABLE).upsert(
                    {notification_id: dbId, read_at: new Date().toISOString(), user_id: userId},
                    {onConflict: "notification_id,user_id"}
                );
                if (error) return errorResponse("Failed to mark as read", headers, 500);
                return jsonResponse(true, headers);
            }
            case "mark-all-read": {
                const authErr = await requireAuthenticated(supabase, headers);
                if (authErr) return authErr;
                const body = await parseBody(req);
                const {userId, dbIds} = body;
                if (!userId || !Array.isArray(dbIds) || !dbIds.length) return errorResponse("userId and dbIds are required", headers, 400);
                const rows = dbIds.map((id: string) => ({notification_id: id, read_at: new Date().toISOString(), user_id: userId}));
                const {error} = await supabase.from(READS_TABLE).upsert(rows, {onConflict: "notification_id,user_id"});
                if (error) return errorResponse("Failed to mark all as read", headers, 500);
                return jsonResponse(true, headers);
            }
            case "delete-notification": {
                const authErr = await requireAuthenticated(supabase, headers);
                if (authErr) return authErr;
                const body = await parseBody(req);
                const {userId, dbId} = body;
                if (!userId || !dbId) return errorResponse("userId and dbId are required", headers, 400);
                const now = new Date().toISOString();
                const {error} = await supabase.from(READS_TABLE).upsert(
                    {deleted_at: now, notification_id: dbId, read_at: now, user_id: userId},
                    {onConflict: "notification_id,user_id"}
                );
                if (error) return errorResponse("Failed to delete notification", headers, 500);
                return jsonResponse(true, headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
