// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";
// @ts-ignore
import {parseBody, nowIso, normalize, computeDiffs, handleFetchHistory, handleFetchComments, handleAddComment, handleDeleteComment, handleFetchIssues, handleAddIssue, handleCompleteIssue, handleDeleteIssue, handleDelete, handleSearchByField} from "../_shared/asset-helpers.ts";

const MAIN_TABLE = "pickup_trucks";
const HISTORY_TABLE = "pickup_trucks_history";
const COMMENTS_TABLE = "pickup_trucks_comments";
const MAINTENANCE_TABLE = "pickup_trucks_maintenance";
const HISTORY_ID_KEY = "truck_id";
const DIFF_FIELDS = ["vin", "make", "model", "year", "assigned", "assigned_plant", "status", "mileage", "comments"];

function parseMileage(raw: any, fallback?: any): number | null {
    if (typeof raw === "number") return Math.max(0, Math.floor(raw));
    if (typeof raw === "string" && raw.trim() !== "") return Math.max(0, Math.floor(Number(raw)));
    return fallback ?? null;
}

function resolveEndpoint(url: URL): string {
    const segments = url.pathname.split("/").filter(s => s);
    const serviceIndex = segments.findIndex(s => s === "pickup-truck-service");
    return serviceIndex >= 0 && segments[serviceIndex + 1] ? segments[serviceIndex + 1] : segments[segments.length - 1];
}

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const headers = getCorsHeaders(origin);
    try {
        const url = new URL(req.url);
        const endpoint = resolveEndpoint(url);
        const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {global: {headers: {Authorization: req.headers.get("Authorization") || ""}}});

        switch (endpoint) {
            case "fetch-all": {
                const {data, error} = await supabase.from(MAIN_TABLE).select("*").order("assigned_plant", {ascending: true}).order("assigned", {ascending: true}).order("make", {ascending: true}).order("model", {ascending: true});
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "fetch-by-id": {
                const body = await parseBody(req);
                const id = typeof body?.id === "string" ? body.id : null;
                if (!id) return errorResponse("Pickup Truck ID is required", headers, 400);
                const {data, error} = await supabase.from(MAIN_TABLE).select("*").eq("id", id).maybeSingle();
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? null}, headers);
            }
            case "create": {
                const body = await parseBody(req);
                const pickup = body?.pickup || body;
                const userId = typeof body?.userId === "string" && body.userId ? body.userId : null;
                if (!userId) return errorResponse("User ID is required", headers, 400);
                const now = nowIso();
                const apiData: Record<string, any> = {
                    vin: typeof pickup?.vin === "string" ? pickup.vin : null,
                    make: typeof pickup?.make === "string" ? pickup.make : null,
                    model: typeof pickup?.model === "string" ? pickup.model : null,
                    year: typeof pickup?.year === "number" ? pickup.year : (typeof pickup?.year === "string" ? pickup.year : null),
                    assigned: typeof pickup?.assigned === "string" ? (pickup.assigned.trim() === "" ? null : pickup.assigned) : null,
                    assigned_plant: typeof pickup?.assignedPlant === "string" ? pickup.assignedPlant : null,
                    status: typeof pickup?.status === "string" ? pickup.status : "Active",
                    mileage: parseMileage(pickup?.mileage),
                    comments: typeof pickup?.comments === "string" ? pickup.comments : null,
                    created_at: now, updated_at: now, updated_by: userId, updated_last: null
                };
                const {data, error} = await supabase.from(MAIN_TABLE).insert([apiData]).select().maybeSingle();
                if (error) return errorResponse("Operation failed", headers, 400);
                if (data?.id) await supabase.from(HISTORY_TABLE).insert({pickup_truck_id: data.id, field_name: "created", old_value: null, new_value: "Pickup Truck created", changed_at: now, changed_by: userId});
                return jsonResponse({data}, headers);
            }
            case "update": {
                const body = await parseBody(req);
                const id = typeof body?.pickupId === "string" ? body.pickupId : (typeof body?.id === "string" ? body.id : null);
                const pickup = body?.pickup || body?.data || body;
                const userId = typeof body?.userId === "string" && body.userId ? body.userId : null;
                if (!id) return errorResponse("Pickup Truck ID is required", headers, 400);
                if (!userId) return errorResponse("User ID is required", headers, 400);
                const {data: current, error: curErr} = await supabase.from(MAIN_TABLE).select("*").eq("id", id).maybeSingle();
                if (curErr) return errorResponse("Operation failed", headers, 400);
                if (!current) return errorResponse("Pickup Truck not found", headers, 404);
                const has = (key: string) => Object.prototype.hasOwnProperty.call(pickup, key);
                const normalizedAssigned = has('assigned') ? (pickup.assigned == null || (typeof pickup.assigned === 'string' && pickup.assigned.trim() === '') ? null : String(pickup.assigned)) : current.assigned;
                const normalizedAssignedPlant = has('assignedPlant') ? (pickup.assignedPlant == null ? null : String(pickup.assignedPlant)) : current.assigned_plant;
                const normalizedStatus = has('status') ? (pickup.status == null ? current.status : String(pickup.status)) : current.status;
                const apiData: Record<string, any> = {
                    vin: typeof pickup?.vin === "string" ? pickup.vin : current.vin,
                    make: typeof pickup?.make === "string" ? pickup.make : current.make,
                    model: typeof pickup?.model === "string" ? pickup.model : current.model,
                    year: typeof pickup?.year === "number" ? pickup.year : (typeof pickup?.year === "string" ? pickup.year : current.year),
                    assigned: normalizedAssigned,
                    assigned_plant: normalizedAssignedPlant,
                    status: normalizedStatus,
                    mileage: parseMileage(pickup?.mileage, current.mileage),
                    comments: typeof pickup?.comments === "string" ? pickup.comments : current.comments,
                    updated_at: nowIso(), updated_by: userId, updated_last: current.updated_last
                };
                const {data, error} = await supabase.from(MAIN_TABLE).update(apiData).eq("id", id).select().maybeSingle();
                if (error) return errorResponse("Operation failed", headers, 400);
                const diffs = computeDiffs(current, apiData, DIFF_FIELDS, HISTORY_ID_KEY, id, userId);
                if (diffs.length) {
                    const {error: histErr} = await supabase.from(HISTORY_TABLE).insert(diffs);
                    if (histErr) return errorResponse("Operation failed", headers, 400);
                }
                return jsonResponse({data}, headers);
            }
            case "delete":
                return handleDelete(supabase, await parseBody(req), MAIN_TABLE, HISTORY_TABLE, HISTORY_ID_KEY, "Pickup Truck", headers);
            case "search-by-vin":
                return handleSearchByField(supabase, await parseBody(req), MAIN_TABLE, "vin", "vin", headers);
            case "search-by-assigned":
                return handleSearchByField(supabase, await parseBody(req), MAIN_TABLE, "assigned", "assigned", headers);
            case "fetch-comments":
                return handleFetchComments(supabase, await parseBody(req), {main: MAIN_TABLE, history: HISTORY_TABLE, idKey: "pickupId", comments: COMMENTS_TABLE}, headers);
            case "add-comment":
                return handleAddComment(supabase, await parseBody(req), {main: MAIN_TABLE, history: HISTORY_TABLE, idKey: "pickupId", comments: COMMENTS_TABLE}, headers);
            case "delete-comment":
                return handleDeleteComment(supabase, await parseBody(req), COMMENTS_TABLE, headers);
            case "fetch-history":
                return handleFetchHistory(supabase, await parseBody(req), HISTORY_TABLE, HISTORY_ID_KEY, "pickupId", headers);
            case "fetch-issues":
                return handleFetchIssues(supabase, await parseBody(req), MAINTENANCE_TABLE, HISTORY_ID_KEY, "pickupId", headers);
            case "add-issue":
                return handleAddIssue(supabase, await parseBody(req), MAINTENANCE_TABLE, HISTORY_ID_KEY, "pickupId", headers);
            case "complete-issue":
                return handleCompleteIssue(supabase, await parseBody(req), MAINTENANCE_TABLE, headers);
            case "delete-issue":
                return handleDeleteIssue(supabase, await parseBody(req), MAINTENANCE_TABLE, headers);
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
