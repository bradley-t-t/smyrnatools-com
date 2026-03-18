// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";
// @ts-ignore
import {parseBody, nowIso, buildLatestMap, buildCountMap, handleFetchHistory, handleAddHistory, handleFetchComments, handleAddComment, handleDeleteComment, handleFetchIssues, handleAddIssue, handleCompleteIssue, handleDeleteIssue, handleDelete, handleFetchByField, handleSearchByField, handleFetchCleanlinessHistory} from "../_shared/asset-helpers.ts";

const MAIN_TABLE = "trailers";
const HISTORY_TABLE = "trailers_history";
const COMMENTS_TABLE = "trailers_comments";
const MAINTENANCE_TABLE = "trailers_maintenance";
const ID_KEY = "trailer_id";
const ORDER_BY = "trailer_number";
const DIFF_FIELDS = ["trailer_number", "assigned_plant", "trailer_type", "assigned_tractor", "cleanliness_rating", "status"];

async function requireAuthenticated(supabase: any, headers: any): Promise<Response | null> {
    const {data, error} = await supabase.auth.getUser();
    if (error || !data?.user?.id) return errorResponse("Unauthorized", headers, 401);
    return null;
}

function normTrailer(v: any, field: string): any {
    if (v === undefined || v === null) return null;
    return field === "cleanliness_rating" ? (typeof v === "number" ? v : Number(v)) : v;
}

function trailerChanged(before: any, after: any, field: string): boolean {
    const b = normTrailer(before, field);
    const a = normTrailer(after, field);
    return field === "cleanliness_rating" ? Number(b) !== Number(a) : String(b ?? "") !== String(a ?? "");
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
                const {data: hist} = await supabase.from(HISTORY_TABLE).select("trailer_id, changed_at").order("changed_at", {ascending: false});
                const {data: openIssues} = await supabase.from(MAINTENANCE_TABLE).select("trailer_id, time_completed").is("time_completed", null);
                const {data: comments} = await supabase.from(COMMENTS_TABLE).select("trailer_id");
                const latestMap = buildLatestMap(hist, ID_KEY);
                const issuesMap = buildCountMap(openIssues, ID_KEY);
                const commentsMap = buildCountMap(comments, ID_KEY);
                return jsonResponse({data: (data || []).map((m: any) => ({...m, latestHistoryDate: latestMap[m.id] ?? null, openIssuesCount: issuesMap[m.id] ?? 0, commentsCount: commentsMap[m.id] ?? 0}))}, headers);
            }
            case "fetch-by-id": {
                const body = await parseBody(req);
                const id = typeof body?.id === "string" ? body.id : null;
                if (!id) return errorResponse("Trailer ID is required", headers, 400);
                const {data, error} = await supabase.from(MAIN_TABLE).select("*").eq("id", id).maybeSingle();
                if (error) return errorResponse("Operation failed", headers, 400);
                if (!data) return jsonResponse({data: null}, headers);
                const {data: hist} = await supabase.from(HISTORY_TABLE).select("changed_at").eq(ID_KEY, id).order("changed_at", {ascending: false}).limit(1).maybeSingle();
                return jsonResponse({data: {...data, latestHistoryDate: hist?.changed_at ?? null}}, headers);
            }
            case "fetch-active": {
                const {data, error} = await supabase.from(MAIN_TABLE).select("*").eq("status", "Active").order(ORDER_BY, {ascending: true});
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "fetch-history":
                return handleFetchHistory(supabase, await parseBody(req), HISTORY_TABLE, ID_KEY, "trailerId", headers);
            case "create": {
                const authErr = await requireAuthenticated(supabase, headers);
                if (authErr) return authErr;
                const body = await parseBody(req);
                const trailer = body?.trailer || body;
                const userId = typeof body?.userId === "string" && body.userId ? body.userId : null;
                if (!userId) return errorResponse("User ID is required", headers, 400);
                const now = nowIso();
                const apiData: Record<string, any> = {
                    trailer_number: trailer?.trailerNumber ?? trailer?.trailer_number,
                    assigned_plant: trailer?.assignedPlant ?? trailer?.assigned_plant,
                    trailer_type: trailer?.trailerType ?? trailer?.trailer_type ?? "Cement",
                    assigned_tractor: trailer?.assignedTractor ?? trailer?.assigned_tractor ?? null,
                    cleanliness_rating: typeof trailer?.cleanlinessRating === "number" ? trailer.cleanlinessRating : (typeof trailer?.cleanliness_rating === "number" ? trailer.cleanliness_rating : 1),
                    status: trailer?.status ?? "Active",
                    created_at: now, updated_at: now, updated_last: trailer?.updatedLast ?? null, updated_by: userId
                };
                const {data, error} = await supabase.from(MAIN_TABLE).insert([apiData]).select().maybeSingle();
                if (error) return errorResponse("Operation failed", headers, 400);
                if (data?.id) await supabase.from(HISTORY_TABLE).insert({[ID_KEY]: data.id, field_name: "created", old_value: null, new_value: "Trailer created", changed_at: now, changed_by: userId});
                return jsonResponse({data}, headers);
            }
            case "update": {
                const authErr = await requireAuthenticated(supabase, headers);
                if (authErr) return authErr;
                const body = await parseBody(req);
                const id = typeof body?.trailerId === "string" ? body.trailerId : (typeof body?.id === "string" ? body.id : null);
                const trailer = body?.trailer || body?.data || body;
                const userId = typeof body?.userId === "string" && body.userId ? body.userId : null;
                if (!id) return errorResponse("Trailer ID is required", headers, 400);
                if (!userId) return errorResponse("User ID is required", headers, 400);
                const {data: current, error: currentErr} = await supabase.from(MAIN_TABLE).select("*").eq("id", id).maybeSingle();
                if (currentErr) return errorResponse("Operation failed", headers, 400);
                if (!current) return errorResponse("Trailer not found", headers, 404);
                const apiData: Record<string, any> = {
                    trailer_number: trailer?.trailerNumber ?? current.trailer_number,
                    assigned_plant: trailer?.assignedPlant ?? current.assigned_plant,
                    trailer_type: trailer?.trailerType ?? current.trailer_type,
                    assigned_tractor: Object.prototype.hasOwnProperty.call(trailer || {}, 'assignedTractor') ? trailer.assignedTractor : current.assigned_tractor,
                    cleanliness_rating: typeof trailer?.cleanlinessRating === "number" ? trailer.cleanlinessRating : current.cleanliness_rating,
                    status: trailer?.status ?? current.status,
                    updated_at: nowIso(), updated_by: userId,
                    updated_last: typeof trailer?.updatedLast === "string" ? trailer.updatedLast : current.updated_last
                };
                const {data, error} = await supabase.from(MAIN_TABLE).update(apiData).eq("id", id).select().maybeSingle();
                if (error) return errorResponse("Operation failed", headers, 400);
                const diffs: Array<Record<string, any>> = [];
                for (const field of DIFF_FIELDS) {
                    if (trailerChanged(current[field], apiData[field], field)) diffs.push({[ID_KEY]: id, field_name: field, old_value: current[field]?.toString?.() ?? null, new_value: apiData[field]?.toString?.() ?? null, changed_at: nowIso(), changed_by: userId});
                }
                if (diffs.length) {
                    const {error: histErr} = await supabase.from(HISTORY_TABLE).insert(diffs);
                    if (histErr) return errorResponse("Operation failed", headers, 400);
                }
                return jsonResponse({data}, headers);
            }
            case "delete": {
                const authErr = await requireAuthenticated(supabase, headers);
                if (authErr) return authErr;
                return handleDelete(supabase, await parseBody(req), MAIN_TABLE, HISTORY_TABLE, ID_KEY, "Trailer", headers);
            }
            case "fetch-comments":
                return handleFetchComments(supabase, await parseBody(req), {main: MAIN_TABLE, history: HISTORY_TABLE, idKey: "trailerId", comments: COMMENTS_TABLE}, headers);
            case "add-comment": {
                const authErr = await requireAuthenticated(supabase, headers);
                if (authErr) return authErr;
                return handleAddComment(supabase, await parseBody(req), {main: MAIN_TABLE, history: HISTORY_TABLE, idKey: "trailerId", comments: COMMENTS_TABLE}, headers);
            }
            case "delete-comment": {
                const authErr = await requireAuthenticated(supabase, headers);
                if (authErr) return authErr;
                return handleDeleteComment(supabase, await parseBody(req), COMMENTS_TABLE, headers);
            }
            case "fetch-issues":
                return handleFetchIssues(supabase, await parseBody(req), MAINTENANCE_TABLE, ID_KEY, "trailerId", headers);
            case "add-issue": {
                const authErr = await requireAuthenticated(supabase, headers);
                if (authErr) return authErr;
                return handleAddIssue(supabase, await parseBody(req), MAINTENANCE_TABLE, ID_KEY, "trailerId", headers);
            }
            case "complete-issue": {
                const authErr = await requireAuthenticated(supabase, headers);
                if (authErr) return authErr;
                return handleCompleteIssue(supabase, await parseBody(req), MAINTENANCE_TABLE, headers);
            }
            case "delete-issue": {
                const authErr = await requireAuthenticated(supabase, headers);
                if (authErr) return authErr;
                return handleDeleteIssue(supabase, await parseBody(req), MAINTENANCE_TABLE, headers);
            }
            case "fetch-by-status":
                return handleFetchByField(supabase, await parseBody(req), MAIN_TABLE, "status", "status", ORDER_BY, headers);
            case "search-by-trailer-number":
                return handleSearchByField(supabase, await parseBody(req), MAIN_TABLE, "trailer_number", ORDER_BY, headers);
            case "fetch-cleanliness-history":
                return handleFetchCleanlinessHistory(supabase, await parseBody(req), HISTORY_TABLE, ID_KEY, "trailerId", headers);
            case "add-history": {
                const authErr = await requireAuthenticated(supabase, headers);
                if (authErr) return authErr;
                return handleAddHistory(supabase, await parseBody(req), req, HISTORY_TABLE, ID_KEY, "trailerId", headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
