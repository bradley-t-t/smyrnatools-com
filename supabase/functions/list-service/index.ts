// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const LIST_ITEMS_TABLE = "list_items";
const PLANNED_ITEMS_TABLE = "list_planned_items";
const PROFILES_TABLE = "users_profiles";

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
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {global: {headers: {Authorization: req.headers.get("Authorization") || ""}}}
        );

        switch (endpoint) {
            case "fetch-items": {
                const {data, error} = await supabase.from(LIST_ITEMS_TABLE).select("*").order("created_at", {ascending: false});
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "fetch-items-with-profiles": {
                const {data: items, error: itemsError} = await supabase.from(LIST_ITEMS_TABLE).select("*").order("created_at", {ascending: false});
                if (itemsError) return errorResponse("Operation failed", headers, 400);
                const idsSet = new Set<string>();
                (items ?? []).forEach((i: any) => {
                    if (i?.user_id) idsSet.add(i.user_id);
                    if (i?.completed_by) idsSet.add(i.completed_by);
                });
                let profiles: any[] = [];
                if (idsSet.size) {
                    const {data: profs, error: profsError} = await supabase.from(PROFILES_TABLE).select("id, first_name, last_name").in("id", Array.from(idsSet));
                    if (profsError) return errorResponse("Operation failed", headers, 400);
                    profiles = profs ?? [];
                }
                return jsonResponse({data: items ?? [], profiles}, headers);
            }
            case "fetch-plants": {
                const {data, error} = await supabase.from("plants").select("*").order("plant_code");
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "fetch-creator-profiles": {
                const body = await parseBody(req);
                const userIds: string[] = Array.isArray(body?.userIds) ? body.userIds.filter((v: any) => typeof v === "string" && v.trim()) : [];
                if (!userIds.length) return jsonResponse({profiles: []}, headers);
                const {data, error} = await supabase.from(PROFILES_TABLE).select("id, first_name, last_name").in("id", userIds);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({profiles: data ?? []}, headers);
            }
            case "create": {
                const body = await parseBody(req);
                const {userId, description, plantCode, deadline, comments, status, responsible_role} = body;
                if (typeof userId !== "string" || !userId) return errorResponse("User ID is required", headers, 400);
                if (typeof description !== "string" || !description.trim()) return errorResponse("Description is required", headers, 400);
                const id = crypto.randomUUID();
                const now = nowISO();
                const {error} = await supabase.from(LIST_ITEMS_TABLE).insert({
                    id, user_id: userId,
                    plant_code: typeof plantCode === "string" ? plantCode.trim() : "",
                    description: description.trim(),
                    deadline: typeof deadline === "string" ? deadline : (deadline instanceof Date ? deadline.toISOString() : deadline ?? null),
                    comments: typeof comments === "string" ? comments.trim() : "",
                    created_at: now, completed: false, completed_at: null, completed_by: null,
                    status: typeof status === "string" ? status : "pending",
                    responsible_role: typeof responsible_role === "string" && responsible_role ? responsible_role : null
                });
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true, id}, headers);
            }
            case "update": {
                const body = await parseBody(req);
                const item = body?.item ?? body;
                if (!item?.id || typeof item.id !== "string") return errorResponse("Item ID is required", headers, 400);
                if (typeof item.description !== "string" || !item.description.trim()) return errorResponse("Description is required", headers, 400);
                const {error} = await supabase.from(LIST_ITEMS_TABLE).update({
                    plant_code: typeof item.plant_code === "string" ? item.plant_code.trim() : "",
                    description: item.description.trim(),
                    deadline: item.deadline ?? null,
                    comments: typeof item.comments === "string" ? item.comments.trim() : "",
                    completed: !!item.completed, completed_at: item.completed_at ?? null,
                    status: typeof item.status === "string" ? item.status : "pending",
                    responsible_role: typeof item.responsible_role === "string" && item.responsible_role ? item.responsible_role : null
                }).eq("id", item.id);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "toggle-completion": {
                const body = await parseBody(req);
                const {id, currentUserId, completed} = body;
                if (typeof id !== "string" || !id) return errorResponse("Item ID is required", headers, 400);
                if (typeof currentUserId !== "string" || !currentUserId) return errorResponse("No authenticated user", headers, 400);
                const now = nowISO();
                let newStatus: boolean | null = typeof completed === "boolean" ? completed : null;
                if (newStatus === null) {
                    const {data, error} = await supabase.from(LIST_ITEMS_TABLE).select("completed").eq("id", id).maybeSingle();
                    if (error) return errorResponse("Operation failed", headers, 400);
                    newStatus = data ? !data.completed : true;
                }
                const {error} = await supabase.from(LIST_ITEMS_TABLE).update({
                    completed: newStatus, completed_at: newStatus ? now : null,
                    completed_by: newStatus ? currentUserId : null, status: newStatus ? "completed" : "pending"
                }).eq("id", id);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "delete": {
                const body = await parseBody(req);
                const {id} = body;
                if (typeof id !== "string" || !id) return errorResponse("Item ID is required", headers, 400);
                const {error} = await supabase.from(LIST_ITEMS_TABLE).delete().eq("id", id);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "fetch-planned-items": {
                const body = await parseBody(req);
                let query = supabase.from(PLANNED_ITEMS_TABLE).select("*");
                if (body?.startDate) query = query.gte("planned_date", body.startDate);
                if (body?.endDate) query = query.lte("planned_date", body.endDate);
                const {data, error} = await query.order("planned_date");
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "add-planned-item": {
                const body = await parseBody(req);
                const {listItemId, plannedDate, userId} = body;
                if (typeof listItemId !== "string" || !listItemId) return errorResponse("List item ID is required", headers, 400);
                if (typeof plannedDate !== "string" || !plannedDate) return errorResponse("Planned date is required", headers, 400);
                const id = crypto.randomUUID();
                const {error} = await supabase.from(PLANNED_ITEMS_TABLE).insert({
                    id, list_item_id: listItemId, planned_date: plannedDate, created_by: typeof userId === "string" ? userId : null
                });
                if (error) return errorResponse(error.code === "23505" ? "Item already planned for this date" : "Operation failed", headers, 400);
                return jsonResponse({success: true, id}, headers);
            }
            case "remove-planned-item": {
                const body = await parseBody(req);
                const {listItemId, plannedDate} = body;
                if (typeof listItemId !== "string" || !listItemId) return errorResponse("List item ID is required", headers, 400);
                if (typeof plannedDate !== "string" || !plannedDate) return errorResponse("Planned date is required", headers, 400);
                const {error} = await supabase.from(PLANNED_ITEMS_TABLE).delete().eq("list_item_id", listItemId).eq("planned_date", plannedDate);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "clear-planned-items": {
                const body = await parseBody(req);
                const {startDate, endDate} = body;
                if (!startDate && !endDate) return errorResponse("Date range required for clear operation", headers, 400);
                let query = supabase.from(PLANNED_ITEMS_TABLE).delete();
                if (startDate) query = query.gte("planned_date", startDate);
                if (endDate) query = query.lte("planned_date", endDate);
                const {error} = await query;
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