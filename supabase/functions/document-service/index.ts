// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const DOCUMENTS_TABLE = "documents";

async function parseBody(req: Request): Promise<any> {
    try { return await req.json(); } catch { return {}; }
}

const SESSIONS_TABLE = "users_sessions";
const SESSION_EXPIRY_DAYS = 7;

async function requireAuthenticated(supabase: any, req: Request, headers: any): Promise<string | Response> {
    const userId = req.headers.get("x-user-id");
    const sessionId = req.headers.get("x-session-id");
    if (!userId || !sessionId) return errorResponse("Unauthorized", headers, 401);
    const {data, error} = await supabase.from(SESSIONS_TABLE).select("id, last_active").eq("id", sessionId).eq("user_id", userId).maybeSingle();
    if (error || !data) return errorResponse("Unauthorized", headers, 401);
    if (data.last_active) {
        const lastActive = new Date(data.last_active);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - SESSION_EXPIRY_DAYS);
        if (lastActive < expiryDate) return errorResponse("Session expired", headers, 401);
    }
    supabase.from(SESSIONS_TABLE).update({last_active: new Date().toISOString()}).eq("id", sessionId).then(() => {}).catch(() => {});
    return userId;
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
            case "insert-record": {
                const auth = await requireAuthenticated(supabase, req, headers);
                if (auth instanceof Response) return auth;
                const userId = auth;
                const body = await parseBody(req);
                const {record} = body;
                if (!record) return errorResponse("Record is required", headers, 400);
                const safeRecord = {...record, uploaded_by: userId};
                const {data, error} = await supabase.from(DOCUMENTS_TABLE).insert(safeRecord).select().single();
                if (error) return errorResponse("Failed to insert document record", headers, 500);
                return jsonResponse(data, headers);
            }
            case "delete": {
                const auth = await requireAuthenticated(supabase, req, headers);
                if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const docId = typeof body?.id === "string" ? body.id : null;
                if (!docId) return errorResponse("Document ID is required", headers, 400);
                const {error} = await supabase.from(DOCUMENTS_TABLE).delete().eq("id", docId);
                if (error) return errorResponse("Failed to delete document", headers, 500);
                return jsonResponse(true, headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
