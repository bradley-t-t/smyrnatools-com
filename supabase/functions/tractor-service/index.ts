// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";
// @ts-ignore
import {parseBody, nowIso, toDbTimestamp, normalize, normalizeYear, buildLatestMap, buildCountMap, computeDiffs, handleFetchHistory, handleAddHistory, handleFetchComments, handleAddComment, handleDeleteComment, handleFetchIssues, handleAddIssue, handleCompleteIssue, handleDeleteIssue, handleDelete, handleFetchByField, handleSearchByField, handleFetchNeedingService, handleFetchCleanlinessHistory, handleVerify} from "../_shared/asset-helpers.ts";

const MAIN_TABLE = "tractors";
const HISTORY_TABLE = "tractors_history";
const COMMENTS_TABLE = "tractors_comments";
const MAINTENANCE_TABLE = "tractors_maintenance";
const ID_KEY = "tractor_id";
const ORDER_BY = "truck_number";
const DIFF_FIELDS = ["truck_number", "assigned_plant", "assigned_operator", "last_service_date", "cleanliness_rating", "has_blower", "vin", "make", "model", "year", "freight", "status"];
const INACTIVE_STATUSES = ["In Shop", "Retired", "Spare"];

function resolveOperatorStatus(assignedOperator: any, status: string): { operator: any; status: string } {
    let op = assignedOperator;
    let st = status;
    if (op === null || op === "" || op === "0") op = null;
    if (!op && st === "Active") st = "Spare";
    if (op && st !== "Active") st = "Active";
    if (INACTIVE_STATUSES.includes(st) && op) op = null;
    return {operator: op, status: st};
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
            case "fetch-all": {
                const {data, error} = await supabase.from(MAIN_TABLE).select("*").order(ORDER_BY, {ascending: true});
                if (error) return errorResponse("Operation failed", headers, 400);
                const latestMap: Record<string, string> = {};
                const issuesMap: Record<string, number> = {};
                const commentsMap: Record<string, number> = {};
                try { const {data: hist} = await supabase.from(HISTORY_TABLE).select("tractor_id, changed_at").order("changed_at", {ascending: false}); Object.assign(latestMap, buildLatestMap(hist, ID_KEY)); } catch {}
                try { const {data: openIssues} = await supabase.from(MAINTENANCE_TABLE).select("tractor_id, time_completed").is("time_completed", null); Object.assign(issuesMap, buildCountMap(openIssues, ID_KEY)); } catch {}
                try { const {data: comments} = await supabase.from(COMMENTS_TABLE).select("tractor_id"); Object.assign(commentsMap, buildCountMap(comments, ID_KEY)); } catch {}
                return jsonResponse({data: (data || []).map((m: any) => ({...m, latestHistoryDate: latestMap[m.id] ?? null, openIssuesCount: issuesMap[m.id] ?? 0, commentsCount: commentsMap[m.id] ?? 0}))}, headers);
            }
            case "fetch-by-id": {
                const body = await parseBody(req);
                const id = typeof body?.id === "string" ? body.id : null;
                if (!id) return errorResponse("Tractor ID is required", headers, 400);
                const {data, error} = await supabase.from(MAIN_TABLE).select("*").eq("id", id).maybeSingle();
                if (error) return errorResponse("Operation failed", headers, 400);
                if (!data) return jsonResponse({data: null}, headers);
                const {data: hist, error: histErr} = await supabase.from(HISTORY_TABLE).select("changed_at").eq(ID_KEY, id).order("changed_at", {ascending: false}).limit(1).maybeSingle();
                if (histErr) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: {...data, latestHistoryDate: hist?.changed_at ?? null}}, headers);
            }
            case "fetch-active": {
                const {data, error} = await supabase.from(MAIN_TABLE).select("*").eq("status", "Active").order(ORDER_BY, {ascending: true});
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "fetch-history":
                return handleFetchHistory(supabase, await parseBody(req), HISTORY_TABLE, ID_KEY, "tractorId", headers);
            case "create": {
                const body = await parseBody(req);
                const tractor = body?.tractor || body;
                const userId = typeof body?.userId === "string" && body.userId ? body.userId : null;
                if (!userId) return errorResponse("User ID is required", headers, 400);
                const now = nowIso();
                const apiData: Record<string, any> = {
                    truck_number: tractor?.truckNumber ?? tractor?.truck_number,
                    assigned_plant: tractor?.assignedPlant ?? tractor?.assigned_plant,
                    assigned_operator: tractor?.assignedOperator ?? tractor?.assigned_operator ?? null,
                    last_service_date: toDbTimestamp(tractor?.lastServiceDate ?? tractor?.last_service_date),
                    cleanliness_rating: typeof tractor?.cleanlinessRating === "number" ? tractor.cleanlinessRating : (typeof tractor?.cleanliness_rating === "number" ? tractor.cleanliness_rating : 0),
                    has_blower: typeof tractor?.hasBlower === "boolean" ? tractor.hasBlower : (typeof tractor?.has_blower === "boolean" ? tractor.has_blower : null),
                    vin: tractor?.vin ?? null, make: tractor?.make ?? null, model: tractor?.model ?? null,
                    year: normalizeYear(tractor?.year),
                    freight: typeof tractor?.freight === "string" ? tractor.freight : null,
                    status: tractor?.status ?? "Active",
                    created_at: now, updated_at: now, updated_by: userId
                };
                const {data, error} = await supabase.from(MAIN_TABLE).insert([apiData]).select().maybeSingle();
                if (error) return errorResponse("Operation failed", headers, 400);
                if (data?.id) await supabase.from(HISTORY_TABLE).insert({[ID_KEY]: data.id, field_name: "created", old_value: null, new_value: "Tractor created", changed_at: now, changed_by: userId});
                return jsonResponse({data}, headers);
            }
            case "update": {
                const body = await parseBody(req);
                const id = typeof body?.tractorId === "string" ? body.tractorId : (typeof body?.id === "string" ? body.id : null);
                const tractor = body?.tractor || body?.data || body;
                const userId = typeof body?.userId === "string" && body.userId ? body.userId : null;
                if (!id) return errorResponse("Tractor ID is required", headers, 400);
                if (!userId) return errorResponse("User ID is required", headers, 400);
                const {data: current, error: currentErr} = await supabase.from(MAIN_TABLE).select("*").eq("id", id).maybeSingle();
                if (currentErr) return errorResponse("Operation failed", headers, 400);
                if (!current) return errorResponse("Tractor not found", headers, 404);
                const rawOp = "assignedOperator" in tractor ? tractor.assignedOperator : current.assigned_operator;
                const rawStatus = "status" in tractor ? tractor.status : current.status;
                const {operator: assignedOperator, status} = resolveOperatorStatus(rawOp, rawStatus);
                const apiData: Record<string, any> = {
                    truck_number: "truckNumber" in tractor ? tractor.truckNumber : current.truck_number,
                    assigned_plant: "assignedPlant" in tractor ? tractor.assignedPlant : current.assigned_plant,
                    assigned_operator: assignedOperator,
                    last_service_date: "lastServiceDate" in tractor ? toDbTimestamp(tractor.lastServiceDate) : current.last_service_date,
                    cleanliness_rating: "cleanlinessRating" in tractor ? (typeof tractor.cleanlinessRating === "number" ? tractor.cleanlinessRating : Number(tractor.cleanlinessRating)) : current.cleanliness_rating,
                    has_blower: "hasBlower" in tractor ? (typeof tractor.hasBlower === "boolean" ? tractor.hasBlower : Boolean(tractor.hasBlower)) : current.has_blower,
                    vin: "vin" in tractor ? tractor.vin : current.vin,
                    make: "make" in tractor ? tractor.make : current.make,
                    model: "model" in tractor ? tractor.model : current.model,
                    year: "year" in tractor ? (normalizeYear(tractor.year) ?? current.year) : current.year,
                    freight: "freight" in tractor ? (typeof tractor.freight === "string" ? tractor.freight : String(tractor.freight)) : current.freight,
                    status,
                    updated_last: typeof tractor?.updatedLast === "string" ? tractor.updatedLast : current.updated_last
                };
                const diffs = computeDiffs(current, apiData, DIFF_FIELDS, ID_KEY, id, userId);
                if (diffs.length) { apiData.updated_at = nowIso(); apiData.updated_by = userId; } else { apiData.updated_at = current.updated_at; apiData.updated_by = current.updated_by; }
                const {data, error} = await supabase.from(MAIN_TABLE).update(apiData).eq("id", id).select().maybeSingle();
                if (error) return errorResponse("Operation failed", headers, 400);
                if (diffs.length) {
                    const {error: histErr} = await supabase.from(HISTORY_TABLE).insert(diffs);
                    if (histErr) {
                        return errorResponse("Operation failed", headers, 400);
                    }
                }
                return jsonResponse({data}, headers);
            }
            case "delete":
                return handleDelete(supabase, await parseBody(req), MAIN_TABLE, HISTORY_TABLE, ID_KEY, "Tractor", headers);
            case "fetch-comments":
                return handleFetchComments(supabase, await parseBody(req), {main: MAIN_TABLE, history: HISTORY_TABLE, idKey: "tractorId", comments: COMMENTS_TABLE}, headers);
            case "add-comment":
                return handleAddComment(supabase, await parseBody(req), {main: MAIN_TABLE, history: HISTORY_TABLE, idKey: "tractorId", comments: COMMENTS_TABLE}, headers);
            case "delete-comment":
                return handleDeleteComment(supabase, await parseBody(req), COMMENTS_TABLE, headers);
            case "fetch-issues":
                return handleFetchIssues(supabase, await parseBody(req), MAINTENANCE_TABLE, ID_KEY, "tractorId", headers);
            case "add-issue":
                return handleAddIssue(supabase, await parseBody(req), MAINTENANCE_TABLE, ID_KEY, "tractorId", headers);
            case "complete-issue":
                return handleCompleteIssue(supabase, await parseBody(req), MAINTENANCE_TABLE, headers);
            case "delete-issue":
                return handleDeleteIssue(supabase, await parseBody(req), MAINTENANCE_TABLE, headers);
            case "fetch-by-operator":
                return handleFetchByField(supabase, await parseBody(req), MAIN_TABLE, "assigned_operator", "operatorId", ORDER_BY, headers);
            case "fetch-by-status":
                return handleFetchByField(supabase, await parseBody(req), MAIN_TABLE, "status", "status", ORDER_BY, headers);
            case "search-by-truck-number":
                return handleSearchByField(supabase, await parseBody(req), MAIN_TABLE, "truck_number", ORDER_BY, headers);
            case "fetch-needing-service":
                return handleFetchNeedingService(supabase, await parseBody(req), MAIN_TABLE, ORDER_BY, headers);
            case "fetch-cleanliness-history":
                return handleFetchCleanlinessHistory(supabase, await parseBody(req), HISTORY_TABLE, ID_KEY, "tractorId", headers);
            case "add-history":
                return handleAddHistory(supabase, await parseBody(req), req, HISTORY_TABLE, ID_KEY, "tractorId", headers);
            case "verify":
                return handleVerify(supabase, await parseBody(req), req, MAIN_TABLE, ID_KEY, "tractorId", headers);
            default:
                return errorResponse("Unknown endpoint", headers, 404);
        }
    } catch (e) {
        return errorResponse("Internal server error", headers, 500);
    }
});
