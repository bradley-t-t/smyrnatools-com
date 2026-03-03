// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";
// @ts-ignore
import {parseBody, nowIso, toDbTimestamp, normalize, buildLatestMap, buildCountMap, computeDiffs, handleFetchHistory, handleAddHistory, handleFetchComments, handleAddComment, handleDeleteComment, handleFetchIssues, handleAddIssue, handleCompleteIssue, handleDeleteIssue, handleDelete, handleFetchByField, handleSearchByField, handleFetchNeedingService, handleFetchCleanlinessHistory, handleVerify, resolveUserId} from "../_shared/asset-helpers.ts";

const MAIN_TABLE = "heavy_equipment";
const HISTORY_TABLE = "heavy_equipment_history";
const COMMENTS_TABLE = "heavy_equipment_comments";
const MAINTENANCE_TABLE = "heavy_equipment_maintenance";
const ID_KEY = "equipment_id";
const ORDER_BY = "identifying_number";
const DIFF_FIELDS = ["identifying_number", "assigned_plant", "equipment_type", "status", "last_service_date", "hours_mileage", "cleanliness_rating", "condition_rating", "equipment_make", "equipment_model", "year_made"];

function getUserFriendlyError(error: string): string {
    if (!error) return "An unknown error occurred";
    const lower = error.toLowerCase();
    if (lower.includes("year_made_check") || lower.includes("heavy_equipment_year_made_check")) return "Year must be a valid year.";
    if ((lower.includes("duplicate key") && lower.includes("identifying_number")) || lower.includes("heavy_equipment_identifying_number_key")) return "This equipment number already exists in the system";
    if (lower.includes("check constraint") && lower.includes("rating")) return "Rating values must be between 1 and 5";
    if (lower.includes("foreign key") || lower.includes("violates foreign key constraint")) return "Invalid reference to related data. Please check your selections";
    if (lower.includes("not null") || lower.includes("null value")) {
        const match = error.match(/column "([^"]+)"/);
        const field = match ? match[1].replace(/_/g, " ") : "field";
        return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }
    if (lower.includes("permission denied") || lower.includes("insufficient privilege")) return "You don't have permission to perform this action";
    return error;
}

async function enrichEquipment(supabase: any, data: any, id: string): Promise<Record<string, any>> {
    const {data: hist} = await supabase.from(HISTORY_TABLE).select("equipment_id, changed_at").eq(ID_KEY, id).order("changed_at", {ascending: false}).limit(1);
    const {data: openIssues} = await supabase.from(MAINTENANCE_TABLE).select(ID_KEY).eq(ID_KEY, id).is("time_completed", null);
    const {data: comments} = await supabase.from(COMMENTS_TABLE).select(ID_KEY).eq(ID_KEY, id);
    return {...data, latestHistoryDate: hist?.[0]?.changed_at ?? null, openIssuesCount: openIssues?.length ?? 0, commentsCount: comments?.length ?? 0};
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
                if (error) return errorResponse(error.message, headers, 400);
                const {data: hist} = await supabase.from(HISTORY_TABLE).select("equipment_id, changed_at").order("changed_at", {ascending: false});
                const {data: openIssues} = await supabase.from(MAINTENANCE_TABLE).select("equipment_id, time_completed").is("time_completed", null);
                const {data: comments} = await supabase.from(COMMENTS_TABLE).select("equipment_id");
                const latestMap = buildLatestMap(hist, ID_KEY);
                const issuesMap = buildCountMap(openIssues, ID_KEY);
                const commentsMap = buildCountMap(comments, ID_KEY);
                return jsonResponse({data: (data || []).map((m: any) => ({...m, latestHistoryDate: latestMap[m.id] ?? null, openIssuesCount: issuesMap[m.id] ?? 0, commentsCount: commentsMap[m.id] ?? 0}))}, headers);
            }
            case "fetch-by-id": {
                const body = await parseBody(req);
                const id = typeof body?.id === "string" ? body.id : null;
                if (!id) return errorResponse("Equipment ID is required", headers, 400);
                const {data, error} = await supabase.from(MAIN_TABLE).select("*").eq("id", id).maybeSingle();
                if (error) return errorResponse(error.message, headers, 400);
                if (!data) return jsonResponse({data: null}, headers);
                const {data: hist, error: histErr} = await supabase.from(HISTORY_TABLE).select("changed_at").eq(ID_KEY, id).order("changed_at", {ascending: false}).limit(1).maybeSingle();
                if (histErr) return errorResponse(histErr.message, headers, 400);
                return jsonResponse({data: {...data, latestHistoryDate: hist?.changed_at ?? null}}, headers);
            }
            case "fetch-active": {
                const {data, error} = await supabase.from(MAIN_TABLE).select("*").eq("status", "Active").order(ORDER_BY, {ascending: true});
                if (error) return errorResponse(error.message, headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "fetch-history":
                return handleFetchHistory(supabase, await parseBody(req), HISTORY_TABLE, ID_KEY, "equipmentId", headers);
            case "create": {
                const body = await parseBody(req);
                const equipment = body?.equipment || body;
                const userId = typeof body?.userId === "string" && body.userId ? body.userId : null;
                if (!userId) return errorResponse("User ID is required", headers, 400);
                const now = nowIso();
                const apiData: Record<string, any> = {
                    identifying_number: equipment?.identifyingNumber ?? equipment?.identifying_number,
                    assigned_plant: equipment?.assignedPlant ?? equipment?.assigned_plant,
                    equipment_type: equipment?.equipmentType ?? equipment?.equipment_type,
                    status: equipment?.status ?? "Active",
                    last_service_date: toDbTimestamp(equipment?.lastServiceDate ?? equipment?.last_service_date),
                    hours_mileage: equipment?.hoursMileage != null ? Number(equipment.hoursMileage) : (equipment?.hours_mileage != null ? Number(equipment.hours_mileage) : null),
                    cleanliness_rating: equipment?.cleanlinessRating != null ? Number(equipment.cleanlinessRating) : (equipment?.cleanliness_rating != null ? Number(equipment.cleanliness_rating) : null),
                    condition_rating: equipment?.conditionRating != null ? Number(equipment.conditionRating) : (equipment?.condition_rating != null ? Number(equipment.condition_rating) : null),
                    equipment_make: equipment?.equipmentMake ?? equipment?.equipment_make ?? null,
                    equipment_model: equipment?.equipmentModel ?? equipment?.equipment_model ?? null,
                    year_made: equipment?.yearMade != null ? Number(equipment.yearMade) : (equipment?.year_made != null ? Number(equipment.year_made) : null),
                    created_at: now, updated_at: now, updated_by: userId
                };
                const {data, error} = await supabase.from(MAIN_TABLE).insert([apiData]).select().maybeSingle();
                if (error) return errorResponse(getUserFriendlyError(error.message), headers, 400);
                if (data?.id) await supabase.from(HISTORY_TABLE).insert({[ID_KEY]: data.id, field_name: "created", old_value: null, new_value: "Equipment created", changed_at: now, changed_by: userId});
                return jsonResponse({data}, headers);
            }
            case "update": {
                const body = await parseBody(req);
                const id = typeof body?.equipmentId === "string" ? body.equipmentId : (typeof body?.id === "string" ? body.id : null);
                const equipment = body?.equipment || body?.data || body;
                const userId = typeof body?.userId === "string" && body.userId ? body.userId : null;
                if (!id) return errorResponse("Equipment ID is required", headers, 400);
                if (!userId) return errorResponse("User ID is required", headers, 400);
                const {data: current, error: currentErr} = await supabase.from(MAIN_TABLE).select("*").eq("id", id).maybeSingle();
                if (currentErr) return errorResponse(currentErr.message, headers, 400);
                if (!current) return errorResponse("Equipment not found", headers, 404);
                const apiData: Record<string, any> = {
                    identifying_number: "identifyingNumber" in equipment ? equipment.identifyingNumber : current.identifying_number,
                    assigned_plant: "assignedPlant" in equipment ? equipment.assignedPlant : current.assigned_plant,
                    assigned_operator: "assignedOperator" in equipment ? equipment.assignedOperator : current.assigned_operator,
                    equipment_type: "equipmentType" in equipment ? equipment.equipmentType : current.equipment_type,
                    status: "status" in equipment ? equipment.status : current.status,
                    last_service_date: "lastServiceDate" in equipment ? toDbTimestamp(equipment.lastServiceDate) : current.last_service_date,
                    hours_mileage: "hoursMileage" in equipment ? Number(equipment.hoursMileage) : current.hours_mileage,
                    cleanliness_rating: "cleanlinessRating" in equipment ? Number(equipment.cleanlinessRating) : current.cleanliness_rating,
                    condition_rating: "conditionRating" in equipment ? Number(equipment.conditionRating) : current.condition_rating,
                    equipment_make: "equipmentMake" in equipment ? equipment.equipmentMake : current.equipment_make,
                    equipment_model: "equipmentModel" in equipment ? equipment.equipmentModel : current.equipment_model,
                    year_made: "yearMade" in equipment ? Number(equipment.yearMade) : current.year_made,
                    vin: "vin" in equipment ? equipment.vin : current.vin,
                    make: "make" in equipment ? equipment.make : current.make,
                    model: "model" in equipment ? equipment.model : current.model,
                    year: "year" in equipment ? Number(equipment.year) : current.year,
                    updated_last: typeof equipment?.updatedLast === "string" ? equipment.updatedLast : current.updated_last
                };
                const diffs = computeDiffs(current, apiData, DIFF_FIELDS, ID_KEY, id, userId);
                if (diffs.length) { apiData.updated_at = nowIso(); apiData.updated_by = userId; } else { apiData.updated_at = current.updated_at; apiData.updated_by = current.updated_by; }
                const {data, error} = await supabase.from(MAIN_TABLE).update(apiData).eq("id", id).select().maybeSingle();
                if (error) return errorResponse(getUserFriendlyError(error.message), headers, 400);
                if (diffs.length) {
                    const {error: histErr} = await supabase.from(HISTORY_TABLE).insert(diffs);
                    if (histErr) return errorResponse(histErr.message, headers, 400);
                }
                return jsonResponse({data: await enrichEquipment(supabase, data, id)}, headers);
            }
            case "delete":
                return handleDelete(supabase, await parseBody(req), MAIN_TABLE, HISTORY_TABLE, ID_KEY, "Equipment", headers);
            case "fetch-comments":
                return handleFetchComments(supabase, await parseBody(req), {main: MAIN_TABLE, history: HISTORY_TABLE, idKey: "equipmentId", comments: COMMENTS_TABLE}, headers);
            case "add-comment":
                return handleAddComment(supabase, await parseBody(req), {main: MAIN_TABLE, history: HISTORY_TABLE, idKey: "equipmentId", comments: COMMENTS_TABLE}, headers);
            case "delete-comment":
                return handleDeleteComment(supabase, await parseBody(req), COMMENTS_TABLE, headers);
            case "fetch-issues":
                return handleFetchIssues(supabase, await parseBody(req), MAINTENANCE_TABLE, ID_KEY, "equipmentId", headers);
            case "add-issue":
                return handleAddIssue(supabase, await parseBody(req), MAINTENANCE_TABLE, ID_KEY, "equipmentId", headers);
            case "complete-issue":
                return handleCompleteIssue(supabase, await parseBody(req), MAINTENANCE_TABLE, headers);
            case "delete-issue":
                return handleDeleteIssue(supabase, await parseBody(req), MAINTENANCE_TABLE, headers);
            case "fetch-by-status":
                return handleFetchByField(supabase, await parseBody(req), MAIN_TABLE, "status", "status", ORDER_BY, headers);
            case "search-by-identifying-number":
                return handleSearchByField(supabase, await parseBody(req), MAIN_TABLE, "identifying_number", ORDER_BY, headers);
            case "fetch-needing-service":
                return handleFetchNeedingService(supabase, await parseBody(req), MAIN_TABLE, ORDER_BY, headers);
            case "fetch-cleanliness-history":
                return handleFetchCleanlinessHistory(supabase, await parseBody(req), HISTORY_TABLE, ID_KEY, "equipmentId", headers);
            case "fetch-condition-history": {
                const body = await parseBody(req);
                const equipmentId = typeof body?.equipmentId === "string" ? body.equipmentId : null;
                const months = Number.isInteger(body?.months) ? body.months : 6;
                const threshold = new Date();
                threshold.setMonth(threshold.getMonth() - months);
                let query = supabase.from(HISTORY_TABLE).select("*").eq("field_name", "condition_rating").gte("changed_at", threshold.toISOString()).order("changed_at", {ascending: true}).limit(200);
                if (equipmentId) query = query.eq(ID_KEY, equipmentId);
                const {data, error} = await query;
                if (error) return errorResponse(error.message, headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "add-history":
                return handleAddHistory(supabase, await parseBody(req), req, HISTORY_TABLE, ID_KEY, "equipmentId", headers);
            case "verify": {
                const body = await parseBody(req);
                const id = typeof body?.id === "string" ? body.id : (typeof body?.equipmentId === "string" ? body.equipmentId : null);
                const userId = resolveUserId(body, req);
                if (!id) return errorResponse("Equipment ID is required", headers, 400);
                if (!userId) return errorResponse("User ID is required", headers, 400);
                const {data, error} = await supabase.from(MAIN_TABLE).update({updated_last: nowIso(), updated_by: userId}).eq("id", id).select().maybeSingle();
                if (error) return errorResponse(error.message, headers, 400);
                return jsonResponse({data: await enrichEquipment(supabase, data, id)}, headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500, {message: (error as Error).message});
    }
});
