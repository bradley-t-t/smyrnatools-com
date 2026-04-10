// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";
const SESSIONS_TABLE = "users_sessions";
const SESSION_EXPIRY_DAYS = 7;

function getAdminClient(): any {
    return createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
}

async function parseBody(req: Request): Promise<any> {
    try { return await req.json(); } catch { return {}; }
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


Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const headers = getCorsHeaders(origin);

    try {
        const url = new URL(req.url);
        const endpoint = url.pathname.split("/").pop();
        const body = await parseBody(req);
        const auth = await requireAuthenticated(null, req, headers, body);
        if (auth instanceof Response) return auth;
        const userId = auth as string;
        const admin = getAdminClient();

        switch (endpoint) {
            // ── Plant CRUD ───────────────────────────────────────────────────
            case "upsert-plant": {

                const {id, plant_code, plant_label, notes} = body;
                if (!plant_code || !plant_label) return errorResponse("plant_code and plant_label are required", headers, 400);
                const now = new Date().toISOString();
                const payload: any = {plant_code, plant_label, notes: notes || null, updated_at: now};
                if (id) payload.id = id;
                else payload.created_at = now;
                const {data, error} = await admin.from("nrmca_plants").upsert(payload).select().single();
                if (error) return errorResponse(error.message, headers, 500);
                return jsonResponse(data, headers);
            }

            case "delete-plant": {

                const plantId = body?.id ? String(body.id) : null;
                if (!plantId) return errorResponse("id is required", headers, 400);
                const {error} = await admin.from("nrmca_plants").delete().eq("id", plantId);
                if (error) return errorResponse(error.message, headers, 500);
                return jsonResponse(true, headers);
            }

            // ── Scale CRUD ───────────────────────────────────────────────────
            case "upsert-scale": {

                const {id, nrmca_plant_id, plant_code, scale_name, scale_type, calibration_interval_days, notes} = body;
                if (!nrmca_plant_id || !scale_name) return errorResponse("nrmca_plant_id and scale_name are required", headers, 400);
                const now = new Date().toISOString();
                const payload: any = {
                    nrmca_plant_id, plant_code: plant_code || null, scale_name,
                    scale_type: scale_type || "batch",
                    calibration_interval_days: Number(calibration_interval_days) || 365,
                    notes: notes || null, updated_at: now
                };
                if (id) payload.id = id;
                else payload.created_at = now;
                const {data, error} = await admin.from("nrmca_scales").upsert(payload).select().single();
                if (error) return errorResponse(error.message, headers, 500);
                return jsonResponse(data, headers);
            }

            case "delete-scale": {

                const scaleId = body?.id ? String(body.id) : null;
                if (!scaleId) return errorResponse("id is required", headers, 400);
                const {error} = await admin.from("nrmca_scales").delete().eq("id", scaleId);
                if (error) return errorResponse(error.message, headers, 500);
                return jsonResponse(true, headers);
            }

            // ── Log Renewal ──────────────────────────────────────────────────
            case "log-renewal": {

                const {nrmca_plant_id, renewed_at, renewal_expires_at, notes} = body;
                if (!nrmca_plant_id || !renewed_at) return errorResponse("nrmca_plant_id and renewed_at are required", headers, 400);
                const now = new Date().toISOString();
                const [{error: histErr}, {error: updateErr}] = await Promise.all([
                    admin.from("nrmca_renewals").insert({
                        nrmca_plant_id, renewed_at,
                        renewal_expires_at: renewal_expires_at || null,
                        notes: notes || null, created_by: userId, created_at: now
                    }),
                    admin.from("nrmca_plants").update({
                        renewed_at, renewal_expires_at: renewal_expires_at || null, updated_at: now
                    }).eq("id", nrmca_plant_id)
                ]);
                if (histErr) return errorResponse(histErr.message, headers, 500);
                if (updateErr) return errorResponse(updateErr.message, headers, 500);
                return jsonResponse(true, headers);
            }

            // ── Log Calibration ──────────────────────────────────────────────
            case "log-calibration": {

                const {scale_id, calibrated_at, calibrated_by, notes} = body;
                if (!scale_id || !calibrated_at) return errorResponse("scale_id and calibrated_at are required", headers, 400);
                const now = new Date().toISOString();
                const [{error: histErr}, {error: updateErr}] = await Promise.all([
                    admin.from("nrmca_scale_calibrations").insert({
                        scale_id, calibrated_at, calibrated_by: calibrated_by || null,
                        notes: notes || null, created_by: userId, created_at: now
                    }),
                    admin.from("nrmca_scales").update({
                        calibrated_at, calibrated_by: calibrated_by || null, updated_at: now
                    }).eq("id", scale_id)
                ]);
                if (histErr) return errorResponse(histErr.message, headers, 500);
                if (updateErr) return errorResponse(updateErr.message, headers, 500);
                return jsonResponse(true, headers);
            }

            default:
                return errorResponse("Unknown endpoint", headers, 404);
        }
    } catch (err: any) {
        const headers = getCorsHeaders(req.headers.get("origin"));
        return errorResponse(err?.message || "Internal server error", headers, 500);
    }
});
