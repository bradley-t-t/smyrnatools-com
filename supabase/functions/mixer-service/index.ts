// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";
// @ts-ignore
import {parseBody, nowIso, toDbTimestamp, normalize, normalizeYear, buildLatestMap, computeDiffs, handleFetchHistory, handleAddHistory, handleFetchComments, handleAddComment, handleDeleteComment, handleFetchIssues, handleAddIssue, handleCompleteIssue, handleDeleteIssue, handleDelete, handleFetchByField, handleSearchByField, handleFetchNeedingService, handleFetchCleanlinessHistory, handleVerify, decodeBase64ToUint8Array, requireAuthenticated} from "../_shared/asset-helpers.ts";

const MAIN_TABLE = "mixers";
const HISTORY_TABLE = "mixers_history";
const COMMENTS_TABLE = "mixers_comments";
const MAINTENANCE_TABLE = "mixers_maintenance";
const IMAGES_TABLE = "mixers_images";
const ID_KEY = "mixer_id";
const ORDER_BY = "truck_number";
const DIFF_FIELDS = ["truck_number", "assigned_plant", "assigned_operator", "last_service_date", "last_chip_date", "cleanliness_rating", "vin", "make", "model", "year", "status", "shop_status"];
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
                const {data: hist, error: histErr} = await supabase.from(HISTORY_TABLE).select("mixer_id, changed_at").order("changed_at", {ascending: false});
                if (histErr) return errorResponse("Operation failed", headers, 400);
                const latestMap = buildLatestMap(hist, ID_KEY);
                return jsonResponse({data: (data || []).map((m: any) => ({...m, latestHistoryDate: latestMap[m.id] ?? null}))}, headers);
            }
            case "fetch-by-id": {
                const body = await parseBody(req);
                const id = typeof body?.id === "string" ? body.id : null;
                if (!id) return errorResponse("Mixer ID is required", headers, 400);
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
                return handleFetchHistory(supabase, await parseBody(req), HISTORY_TABLE, ID_KEY, "mixerId", headers);
            case "create": {
                const auth = await requireAuthenticated(supabase, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const mixer = body?.mixer || body;
                const userId = auth;
                const now = nowIso();
                const apiData: Record<string, any> = {
                    truck_number: mixer?.truckNumber ?? mixer?.truck_number,
                    assigned_plant: mixer?.assignedPlant ?? mixer?.assigned_plant,
                    assigned_operator: mixer?.assignedOperator ?? mixer?.assigned_operator ?? null,
                    last_service_date: toDbTimestamp(mixer?.lastServiceDate ?? mixer?.last_service_date),
                    last_chip_date: toDbTimestamp(mixer?.lastChipDate ?? mixer?.last_chip_date),
                    cleanliness_rating: typeof mixer?.cleanlinessRating === "number" ? mixer.cleanlinessRating : (typeof mixer?.cleanliness_rating === "number" ? mixer.cleanliness_rating : 0),
                    vin: mixer?.vin ?? null, make: mixer?.make ?? null, model: mixer?.model ?? null,
                    year: normalizeYear(mixer?.year),
                    status: mixer?.status ?? "Active",
                    shop_status: mixer?.shopStatus ?? mixer?.shop_status ?? null,
                    created_at: now, updated_at: now, updated_by: userId
                };
                const {data, error} = await supabase.from(MAIN_TABLE).insert([apiData]).select().maybeSingle();
                if (error) return errorResponse("Operation failed", headers, 400);
                if (data?.id) await supabase.from(HISTORY_TABLE).insert({[ID_KEY]: data.id, field_name: "created", old_value: null, new_value: "Mixer created", changed_at: now, changed_by: userId});
                return jsonResponse({data}, headers);
            }
            case "update": {
                const auth = await requireAuthenticated(supabase, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const id = typeof body?.mixerId === "string" ? body.mixerId : (typeof body?.id === "string" ? body.id : null);
                const mixer = body?.mixer || body?.data || body;
                const userId = auth;
                if (!id) return errorResponse("Mixer ID is required", headers, 400);
                const {data: current, error: currentErr} = await supabase.from(MAIN_TABLE).select("*").eq("id", id).maybeSingle();
                if (currentErr) return errorResponse("Operation failed", headers, 400);
                if (!current) return errorResponse("Mixer not found", headers, 404);
                const rawOp = "assignedOperator" in mixer ? mixer.assignedOperator : current.assigned_operator;
                const rawStatus = "status" in mixer ? mixer.status : current.status;
                const {operator: assignedOperator, status} = resolveOperatorStatus(rawOp, rawStatus);
                const apiData: Record<string, any> = {
                    truck_number: "truckNumber" in mixer ? mixer.truckNumber : current.truck_number,
                    assigned_plant: "assignedPlant" in mixer ? mixer.assignedPlant : current.assigned_plant,
                    assigned_operator: assignedOperator,
                    last_service_date: "lastServiceDate" in mixer ? toDbTimestamp(mixer.lastServiceDate) : current.last_service_date,
                    last_chip_date: "lastChipDate" in mixer ? toDbTimestamp(mixer.lastChipDate) : current.last_chip_date,
                    cleanliness_rating: "cleanlinessRating" in mixer ? (typeof mixer.cleanlinessRating === "number" ? mixer.cleanlinessRating : Number(mixer.cleanlinessRating)) : current.cleanliness_rating,
                    vin: "vin" in mixer ? mixer.vin : current.vin,
                    make: "make" in mixer ? mixer.make : current.make,
                    model: "model" in mixer ? mixer.model : current.model,
                    year: "year" in mixer ? (normalizeYear(mixer.year) ?? current.year) : current.year,
                    status,
                    shop_status: "shopStatus" in mixer ? mixer.shopStatus : ("shop_status" in mixer ? mixer.shop_status : current.shop_status),
                    updated_last: typeof mixer?.updatedLast === "string" ? mixer.updatedLast : current.updated_last
                };
                const diffs = computeDiffs(current, apiData, DIFF_FIELDS, ID_KEY, id, userId);
                if (diffs.length) { apiData.updated_at = nowIso(); apiData.updated_by = userId; } else { apiData.updated_at = current.updated_at; apiData.updated_by = current.updated_by; }
                const {data, error} = await supabase.from(MAIN_TABLE).update(apiData).eq("id", id).select().maybeSingle();
                if (error) return errorResponse("Operation failed", headers, 400);
                if (diffs.length) {
                    const {error: histErr} = await supabase.from(HISTORY_TABLE).insert(diffs);
                    if (histErr) return errorResponse("Operation failed", headers, 400);
                }
                return jsonResponse({data}, headers);
            }
            case "delete":
                return handleDelete(supabase, await parseBody(req), MAIN_TABLE, HISTORY_TABLE, ID_KEY, "Mixer", headers);
            case "fetch-comments":
                return handleFetchComments(supabase, await parseBody(req), {main: MAIN_TABLE, history: HISTORY_TABLE, idKey: "mixerId", comments: COMMENTS_TABLE}, headers);
            case "add-comment":
                return handleAddComment(supabase, await parseBody(req), {main: MAIN_TABLE, history: HISTORY_TABLE, idKey: "mixerId", comments: COMMENTS_TABLE}, headers);
            case "delete-comment":
                return handleDeleteComment(supabase, await parseBody(req), COMMENTS_TABLE, headers);
            case "fetch-images": {
                const body = await parseBody(req);
                const mixerId = typeof body?.mixerId === "string" ? body.mixerId : null;
                if (!mixerId) return errorResponse("Mixer ID is required", headers, 400);
                const {data, error} = await supabase.from(IMAGES_TABLE).select("*").eq(ID_KEY, mixerId);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "upload-image": {
                const auth = await requireAuthenticated(supabase, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const mixerId = typeof body?.mixerId === "string" ? body.mixerId : null;
                const fileName = typeof body?.fileName === "string" ? body.fileName : null;
                const fileBase64 = typeof body?.fileBase64 === "string" ? body.fileBase64 : null;
                const contentType = typeof body?.contentType === "string" ? body.contentType : "application/octet-stream";
                if (!mixerId) return errorResponse("Mixer ID is required", headers, 400);
                if (!fileName || !fileBase64) return errorResponse("File name and base64 content are required", headers, 400);
                const pathInBucket = `mixer_images/${fileName}`;
                const {error: uploadError} = await supabase.storage.from("smyrna").upload(pathInBucket, decodeBase64ToUint8Array(fileBase64), {contentType});
                if (uploadError) return errorResponse("Operation failed", headers, 400);
                const {data, error} = await supabase.from(IMAGES_TABLE).insert({mixer_id: mixerId, image_url: `smyrna/${pathInBucket}`, created_at: nowIso()}).select().maybeSingle();
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data}, headers);
            }
            case "delete-image": {
                const auth = await requireAuthenticated(supabase, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const imageId = typeof body?.imageId === "string" ? body.imageId : null;
                if (!imageId) return errorResponse("Image ID is required", headers, 400);
                const {data: imageData, error: fetchError} = await supabase.from(IMAGES_TABLE).select("image_url").eq("id", imageId).maybeSingle();
                if (fetchError) return errorResponse("Operation failed", headers, 400);
                if (imageData?.image_url) {
                    const relPath = imageData.image_url.startsWith("smyrna/") ? imageData.image_url.substring("smyrna/".length) : imageData.image_url;
                    const {error: deleteFileError} = await supabase.storage.from("smyrna").remove([relPath]);
                    if (deleteFileError) return errorResponse("Operation failed", headers, 400);
                }
                const {error} = await supabase.from(IMAGES_TABLE).delete().eq("id", imageId);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "fetch-issues":
                return handleFetchIssues(supabase, await parseBody(req), MAINTENANCE_TABLE, ID_KEY, "mixerId", headers);
            case "add-issue":
                return handleAddIssue(supabase, await parseBody(req), MAINTENANCE_TABLE, ID_KEY, "mixerId", headers);
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
            case "search-by-vin":
                return handleSearchByField(supabase, await parseBody(req), MAIN_TABLE, "vin", ORDER_BY, headers);
            case "fetch-needing-service":
                return handleFetchNeedingService(supabase, await parseBody(req), MAIN_TABLE, ORDER_BY, headers);
            case "fetch-cleanliness-history":
                return handleFetchCleanlinessHistory(supabase, await parseBody(req), HISTORY_TABLE, ID_KEY, "mixerId", headers);
            case "add-history":
                return handleAddHistory(supabase, await parseBody(req), req, HISTORY_TABLE, ID_KEY, "mixerId", headers);
            case "verify":
                return handleVerify(supabase, await parseBody(req), req, MAIN_TABLE, ID_KEY, "mixerId", headers);
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
