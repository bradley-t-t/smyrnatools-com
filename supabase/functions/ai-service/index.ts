// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
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

const DEFAULT_MODEL = "grok-4";
const DEFAULT_TEMPERATURE = 0.3;

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const headers = getCorsHeaders(origin);

    try {
        const grokApiKey = Deno.env.get("GROK_API_KEY");
        if (!grokApiKey) return errorResponse("AI service not configured", headers, 503);

        const url = new URL(req.url);
        const endpoint = url.pathname.split("/").pop();

        switch (endpoint) {
            case "generate": {
                const body = await req.json().catch(() => ({}));
                const auth = await requireAuthenticated(null, req, headers, body);
                if (auth instanceof Response) return auth;
                const {systemPrompt, messages, model, temperature} = body;

                if (!systemPrompt || !Array.isArray(messages)) {
                    return errorResponse("systemPrompt and messages are required", headers, 400);
                }

                const response = await fetch(GROK_API_URL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${grokApiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        messages: [{role: "system", content: systemPrompt}, ...messages],
                        model: model || DEFAULT_MODEL,
                        stream: false,
                        temperature: temperature ?? DEFAULT_TEMPERATURE
                    })
                });

                if (response.status === 429) return errorResponse("Rate limited", headers, 429);
                if (!response.ok) {
                    const errorText = await response.text().catch(() => "Unknown error");
                    return errorResponse("AI request failed", headers, response.status, {detail: errorText});
                }

                const data = await response.json();
                const content = data.choices?.[0]?.message?.content ?? null;
                return jsonResponse({content}, headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
