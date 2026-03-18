// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const TRAVEL_TIMES_TABLE = "plant_travel_times";
const PLANS_TABLE = "plans";
const TEMPLATES_TABLE = "plan_templates";

async function parseBody(req: Request): Promise<any> {
    try { return await req.json(); } catch { return {}; }
}

function nowISO(): string {
    return new Date().toISOString();
}

async function requireAuthenticated(supabase: any, headers: any): Promise<string | Response> {
    const {data, error} = await supabase.auth.getUser();
    if (error || !data?.user?.id) return errorResponse("Unauthorized", headers, 401);
    return data.user.id;
}

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const headers = getCorsHeaders(origin);
    try {
        const url = new URL(req.url);
        const endpoint = url.pathname.split("/").pop();
        const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
            global: {headers: {Authorization: req.headers.get("Authorization") || ""}}
        });

        switch (endpoint) {
            case "fetch-travel-times": {
                const {data, error} = await supabase.from(TRAVEL_TIMES_TABLE).select("*").order("from_plant_code");
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "upsert-travel-time": {
                const auth = await requireAuthenticated(supabase, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const {fromPlantCode, toPlantCode, travelMinutes} = body;
                if (!fromPlantCode || !toPlantCode || typeof travelMinutes !== "number") {
                    return errorResponse("fromPlantCode, toPlantCode, and travelMinutes are required", headers, 400);
                }
                const {error} = await supabase.from(TRAVEL_TIMES_TABLE).upsert({
                    from_plant_code: fromPlantCode, to_plant_code: toPlantCode, travel_minutes: travelMinutes, updated_at: nowISO()
                }, {onConflict: "from_plant_code,to_plant_code"});
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "delete-travel-time": {
                const auth = await requireAuthenticated(supabase, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const {fromPlantCode, toPlantCode} = body;
                if (!fromPlantCode || !toPlantCode) return errorResponse("fromPlantCode and toPlantCode are required", headers, 400);
                const {error} = await supabase.from(TRAVEL_TIMES_TABLE).delete().eq("from_plant_code", fromPlantCode).eq("to_plant_code", toPlantCode);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "fetch-plan": {
                const body = await parseBody(req);
                const {planDate} = body;
                if (!planDate) return errorResponse("planDate is required", headers, 400);
                const {data, error} = await supabase.from(PLANS_TABLE).select("*").eq("plan_date", planDate).single();
                if (error && error.code !== "PGRST116") return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? null}, headers);
            }
            case "save-plan": {
                const auth = await requireAuthenticated(supabase, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const {planDate, assignments, notes, plantProduction} = body;
                if (!planDate) return errorResponse("planDate is required", headers, 400);
                const {error} = await supabase.from(PLANS_TABLE).upsert({
                    plan_date: planDate, assignments: assignments ?? [], notes: notes ?? "",
                    plant_production: plantProduction ?? {}, updated_at: nowISO()
                }, {onConflict: "plan_date"});
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "fetch-templates": {
                const body = await parseBody(req);
                const {userId} = body;
                if (!userId) return errorResponse("userId is required", headers, 400);
                const {data, error} = await supabase.from(TEMPLATES_TABLE).select("*").eq("user_id", userId).order("created_at", {ascending: false});
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "save-template": {
                const auth = await requireAuthenticated(supabase, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const {name, assignments, notes} = body;
                if (!name) return errorResponse("name is required", headers, 400);
                const {error} = await supabase.from(TEMPLATES_TABLE).insert({
                    user_id: auth, name, assignments: assignments ?? [], notes: notes ?? "", created_at: nowISO()
                });
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "delete-template": {
                const auth = await requireAuthenticated(supabase, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const {templateId} = body;
                if (!templateId) return errorResponse("templateId is required", headers, 400);
                const {error} = await supabase.from(TEMPLATES_TABLE).delete().eq("id", templateId);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            default:
                return errorResponse("Unknown endpoint", headers, 404);
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
