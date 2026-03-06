// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const TRAVEL_TIMES_TABLE = "plant_travel_times";
const PLANS_TABLE = "users_plans";

async function parseBody(req: Request): Promise<any> {
    try { return await req.json(); } catch { return {}; }
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
                const body = await parseBody(req);
                const {fromPlantCode, toPlantCode} = body;
                if (!fromPlantCode || !toPlantCode) return errorResponse("fromPlantCode and toPlantCode are required", headers, 400);
                const {error} = await supabase.from(TRAVEL_TIMES_TABLE).delete().eq("from_plant_code", fromPlantCode).eq("to_plant_code", toPlantCode);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "fetch-user-plan": {
                const body = await parseBody(req);
                const {userId, planDate} = body;
                if (!userId || !planDate) return errorResponse("userId and planDate are required", headers, 400);
                const {data, error} = await supabase.from(PLANS_TABLE).select("*").eq("user_id", userId).eq("plan_date", planDate).single();
                if (error && error.code !== "PGRST116") return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? null}, headers);
            }
            case "save-user-plan": {
                const body = await parseBody(req);
                const {userId, planDate, assignments, notes} = body;
                if (!userId || !planDate) return errorResponse("userId and planDate are required", headers, 400);
                const {error} = await supabase.from(PLANS_TABLE).upsert({
                    user_id: userId, plan_date: planDate, assignments: assignments ?? [], notes: notes ?? "", updated_at: nowISO()
                }, {onConflict: "user_id,plan_date"});
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
