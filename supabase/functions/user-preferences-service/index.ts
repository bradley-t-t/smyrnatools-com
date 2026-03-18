// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const PREFERENCES_TABLE = "users_preferences";
const SESSIONS_TABLE = "users_sessions";
const SESSION_EXPIRY_DAYS = 7;

function getAdminClient(): any {
    return createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
}

async function requireAuthenticated(_supabase: any, req: Request, headers: any, body?: any): Promise<string | Response> {
    let userId = body?.__sessionUserId || req.headers.get("x-user-id") || null;
    let sessionId = body?.__sessionId || req.headers.get("x-session-id") || null;
    if (!userId || !sessionId) { try { const b = await req.clone().json(); userId = userId || b?.__sessionUserId; sessionId = sessionId || b?.__sessionId; } catch {} }
    if (!userId || !sessionId) return errorResponse("Unauthorized", headers, 401);
    const admin = getAdminClient();
    const {data, error} = await admin.from(SESSIONS_TABLE).select("id, last_active").eq("id", sessionId).eq("user_id", userId).maybeSingle();
    if (error || !data) return errorResponse("Unauthorized", headers, 401);
    if (data.last_active) {
        const lastActive = new Date(data.last_active);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - SESSION_EXPIRY_DAYS);
        if (lastActive < expiryDate) return errorResponse("Session expired", headers, 401);
    }
    admin.from(SESSIONS_TABLE).update({last_active: new Date().toISOString()}).eq("id", sessionId).then(() => {}).catch(() => {});
    return userId;
}

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
    if (error) return errorResponse("Operation failed", headers, 400);
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
                const auth = await requireAuthenticated(supabase, req, headers);
                if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const userId = requireStringId(body, "userId");
                if (!userId) return errorResponse("User ID is required", headers, 400);
                if (auth !== userId) return errorResponse("Forbidden", headers, 403);
                const {data, error} = await supabase.from(PREFERENCES_TABLE).select("*").eq("user_id", userId).maybeSingle();
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? null}, headers);
            }
            case "save-mixer-filters": {
                const auth = await requireAuthenticated(supabase, req, headers);
                if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const userId = requireStringId(body, "userId");
                if (!userId) return errorResponse("User ID is required", headers, 400);
                if (auth !== userId) return errorResponse("Forbidden", headers, 403);
                if (body.filters == null) return errorResponse("Filters are required", headers, 400);
                return upsertPreference(supabase, userId, "mixer_filters", body.filters, headers);
            }
            case "save-last-viewed-filters": {
                const auth = await requireAuthenticated(supabase, req, headers);
                if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const userId = requireStringId(body, "userId");
                if (!userId) return errorResponse("User ID is required", headers, 400);
                if (auth !== userId) return errorResponse("Forbidden", headers, 403);
                if (body.filters == null) return errorResponse("Filters are required", headers, 400);
                return upsertPreference(supabase, userId, "last_viewed_filters", body.filters, headers);
            }
            case "dismiss-tutorial": {
                const auth = await requireAuthenticated(supabase, req, headers);
                if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const userId = requireStringId(body, "userId");
                const tutorialId = body?.tutorialId;
                if (!userId) return errorResponse("User ID is required", headers, 400);
                if (auth !== userId) return errorResponse("Forbidden", headers, 403);
                if (!tutorialId) return errorResponse("Tutorial ID is required", headers, 400);
                const {data: userExists} = await supabase.from("users").select("id").eq("id", userId).maybeSingle();
                if (!userExists) return jsonResponse({success: true}, headers);
                const {data: existing} = await supabase.from("users_tutorials")
                    .select("id").eq("user_id", userId).eq("tutorial_id", tutorialId).maybeSingle();
                if (existing) return jsonResponse({success: true}, headers);
                const {error} = await supabase.from("users_tutorials").insert({
                    dismissed_at: nowISO(), tutorial_id: tutorialId, user_id: userId
                });
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "get-dismissed-tutorials": {
                const auth = await requireAuthenticated(supabase, req, headers);
                if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const userId = requireStringId(body, "userId");
                if (!userId) return errorResponse("User ID is required", headers, 400);
                if (auth !== userId) return errorResponse("Forbidden", headers, 403);
                const {data, error} = await supabase.from("users_tutorials").select("tutorial_id").eq("user_id", userId);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ? data.map((d: any) => d.tutorial_id) : []}, headers);
            }
            case "reset-all-tutorials": {
                const auth = await requireAuthenticated(supabase, req, headers);
                if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const userId = requireStringId(body, "userId");
                if (!userId) return errorResponse("User ID is required", headers, 400);
                if (auth !== userId) return errorResponse("Forbidden", headers, 403);
                const {error} = await supabase.from("users_tutorials").delete().eq("user_id", userId);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "reset-tutorial": {
                const auth = await requireAuthenticated(supabase, req, headers);
                if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const userId = requireStringId(body, "userId");
                const tutorialId = body?.tutorialId;
                if (!userId) return errorResponse("User ID is required", headers, 400);
                if (auth !== userId) return errorResponse("Forbidden", headers, 403);
                if (!tutorialId) return errorResponse("Tutorial ID is required", headers, 400);
                const {error} = await supabase.from("users_tutorials")
                    .delete().eq("user_id", userId).eq("tutorial_id", tutorialId);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "should-show-prompt": {
                const auth = await requireAuthenticated(supabase, req, headers);
                if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const userId = requireStringId(body, "userId");
                const promptType = body?.promptType;
                if (!userId || !promptType) return jsonResponse({show: true}, headers);
                if (auth !== userId) return errorResponse("Forbidden", headers, 403);
                const {data, error} = await supabase.from("app_install_prompts")
                    .select("*").eq("user_id", userId).eq("prompt_type", promptType).maybeSingle();
                if (error) return jsonResponse({show: true}, headers);
                if (!data) return jsonResponse({show: true}, headers);
                if (data.action === "dismissed_forever" || data.action === "installed") {
                    return jsonResponse({show: false}, headers);
                }
                if (data.action === "remind_later" && data.reminded_at) {
                    const daysSince = (Date.now() - new Date(data.reminded_at).getTime()) / (1000 * 60 * 60 * 24);
                    return jsonResponse({show: daysSince >= 7}, headers);
                }
                return jsonResponse({show: false}, headers);
            }
            case "record-prompt-action": {
                const auth = await requireAuthenticated(supabase, req, headers);
                if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const userId = requireStringId(body, "userId");
                const promptType = body?.promptType;
                const action = body?.action;
                if (!userId) return errorResponse("User ID is required", headers, 400);
                if (auth !== userId) return errorResponse("Forbidden", headers, 403);
                if (!promptType || !action) return errorResponse("Prompt type and action are required", headers, 400);
                const dataToUpsert: Record<string, any> = {
                    action, device_type: body?.deviceType || null,
                    prompt_type: promptType, updated_at: nowISO(), user_id: userId
                };
                if (action === "remind_later") dataToUpsert.reminded_at = nowISO();
                const {data, error} = await supabase.from("app_install_prompts")
                    .upsert(dataToUpsert, {onConflict: "user_id,prompt_type"}).select().single();
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data, success: true}, headers);
            }
            case "save-all": {
                const auth = await requireAuthenticated(supabase, req, headers);
                if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const userId = requireStringId(body, "userId");
                if (!userId) return errorResponse("User ID is required", headers, 400);
                if (auth !== userId) return errorResponse("Forbidden", headers, 403);
                const upsertData = body.data;
                if (!upsertData) return errorResponse("Data is required", headers, 400);
                const now = nowISO();
                const {error} = await supabase.from(PREFERENCES_TABLE).upsert(
                    {...upsertData, user_id: userId, updated_at: now, created_at: upsertData.created_at || now},
                    {onConflict: "user_id"}
                );
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
