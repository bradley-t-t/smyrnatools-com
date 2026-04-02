// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const LIST_ITEMS_TABLE = "list_items";
const PLANNED_ITEMS_TABLE = "list_planned_items";
const ACTIVITY_TABLE = "list_items_activity";
const PROFILES_TABLE = "users_profiles";

async function parseBody(req: Request): Promise<any> {
    try { return await req.json(); } catch { return {}; }
}

function nowISO(): string {
    return new Date().toISOString();
}

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

const PERMISSIONS_TABLE = "users_permissions";
const ROLES_SELECT = "role_id, users_roles(weight)";

async function getUserWeight(_supabase: any, userId: string): Promise<number> {
    const admin = getAdminClient();
    const {data} = await admin.from(PERMISSIONS_TABLE).select(ROLES_SELECT).eq("user_id", userId);
    if (!data?.length) return 0;
    return Math.max(...data.map((d: any) => d.users_roles?.weight ?? 0));
}

async function requireOwnerOrHigherRole(supabase: any, callerId: string, ownerId: string | null, headers: any): Promise<Response | null> {
    if (!ownerId || callerId === ownerId) return null;
    const callerWeight = await getUserWeight(supabase, callerId);
    const ownerWeight = await getUserWeight(supabase, ownerId);
    if (callerWeight > ownerWeight) return null;
    return errorResponse("Forbidden: insufficient privileges to modify another user's record", headers, 403);
}

async function requireElevated(supabase: any, callerId: string, headers: any): Promise<Response | null> {
    const weight = await getUserWeight(supabase, callerId);
    if (weight > 75) return null;
    return errorResponse("Forbidden: insufficient privileges for bulk operations", headers, 403);
}

const TRACKED_FIELDS = ["status", "priority", "responsible_role", "plant_code", "deadline", "description", "comments"];

async function logActivity(admin: any, entry: {list_item_id: string, user_id: string, action: string, field_name?: string|null, old_value?: string|null, new_value?: string|null, item_description?: string|null}): Promise<void> {
    try {
        await admin.from(ACTIVITY_TABLE).insert({
            list_item_id: entry.list_item_id,
            user_id: entry.user_id,
            action: entry.action,
            field_name: entry.field_name ?? null,
            old_value: entry.old_value ?? null,
            new_value: entry.new_value ?? null,
            item_description: entry.item_description ?? null
        });
    } catch {}
}

async function logFieldChanges(admin: any, userId: string, itemId: string, oldItem: any, newItem: any, description: string): Promise<void> {
    for (const field of TRACKED_FIELDS) {
        const oldVal = String(oldItem[field] ?? "");
        const newVal = String(newItem[field] ?? "");
        if (oldVal !== newVal) {
            await logActivity(admin, {
                list_item_id: itemId, user_id: userId, action: "updated",
                field_name: field, old_value: oldVal || null, new_value: newVal || null,
                item_description: description
            });
        }
    }
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
                const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
                const admin = getAdminClient();
                const {data, error} = await admin.from(LIST_ITEMS_TABLE).select("*").order("created_at", {ascending: false});
                if (error) return errorResponse("Operation failed: " + (error.message || error.code), headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "fetch-items-with-profiles": {
                const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
                const admin = getAdminClient();
                const {data: items, error: itemsError} = await admin.from(LIST_ITEMS_TABLE).select("*").order("created_at", {ascending: false});
                if (itemsError) return errorResponse("Operation failed: " + (itemsError.message || itemsError.code), headers, 400);
                const idsSet = new Set<string>();
                (items ?? []).forEach((i: any) => {
                    if (i?.user_id) idsSet.add(i.user_id);
                    if (i?.completed_by) idsSet.add(i.completed_by);
                });
                let profiles: any[] = [];
                if (idsSet.size) {
                    const {data: profs, error: profsError} = await admin.from(PROFILES_TABLE).select("id, first_name, last_name").in("id", Array.from(idsSet));
                    if (profsError) return errorResponse("Operation failed", headers, 400);
                    profiles = profs ?? [];
                }
                return jsonResponse({data: items ?? [], profiles}, headers);
            }
            case "fetch-plants": {
                const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
                const {data, error} = await supabase.from("plants").select("*").order("plant_code");
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "fetch-creator-profiles": {
                const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const userIds: string[] = Array.isArray(body?.userIds) ? body.userIds.filter((v: any) => typeof v === "string" && v.trim()) : [];
                if (!userIds.length) return jsonResponse({profiles: []}, headers);
                const {data, error} = await supabase.from(PROFILES_TABLE).select("id, first_name, last_name").in("id", userIds);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({profiles: data ?? []}, headers);
            }
            case "create": {
                const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const {description, plantCode, deadline, comments, status, responsible_role, priority} = body;
                if (typeof description !== "string" || !description.trim()) return errorResponse("Description is required", headers, 400);
                const id = crypto.randomUUID();
                const now = nowISO();
                const validPriorities = ["none", "low", "medium", "high", "urgent"];
                const safePriority = typeof priority === "string" && validPriorities.includes(priority) ? priority : "none";
                const admin = getAdminClient();
                const {error} = await admin.from(LIST_ITEMS_TABLE).insert({
                    id, user_id: auth,
                    plant_code: typeof plantCode === "string" ? plantCode.trim() : "",
                    description: description.trim(),
                    deadline: typeof deadline === "string" ? deadline : (deadline instanceof Date ? deadline.toISOString() : deadline ?? null),
                    comments: typeof comments === "string" ? comments.trim() : "",
                    created_at: now, completed: false, completed_at: null, completed_by: null,
                    priority: safePriority,
                    status: typeof status === "string" ? status : "pending",
                    responsible_role: typeof responsible_role === "string" && responsible_role ? responsible_role : null
                });
                if (error) return errorResponse("Operation failed", headers, 400);
                logActivity(admin, {list_item_id: id, user_id: auth, action: "created", item_description: description.trim()});
                return jsonResponse({success: true, id}, headers);
            }
            case "update": {
                const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const item = body?.item ?? body;
                if (!item?.id || typeof item.id !== "string") return errorResponse("Item ID is required", headers, 400);
                if (typeof item.description !== "string" || !item.description.trim()) return errorResponse("Description is required", headers, 400);
                const validPriorities = ["none", "low", "medium", "high", "urgent"];
                const safePriority = typeof item.priority === "string" && validPriorities.includes(item.priority) ? item.priority : "none";
                const admin = getAdminClient();
                const {data: oldItem} = await admin.from(LIST_ITEMS_TABLE).select("*").eq("id", item.id).maybeSingle();
                const updatePayload = {
                    plant_code: typeof item.plant_code === "string" ? item.plant_code.trim() : "",
                    description: item.description.trim(),
                    deadline: item.deadline ?? null,
                    comments: typeof item.comments === "string" ? item.comments.trim() : "",
                    completed: !!item.completed, completed_at: item.completed_at ?? null,
                    priority: safePriority,
                    status: typeof item.status === "string" ? item.status : "pending",
                    responsible_role: typeof item.responsible_role === "string" && item.responsible_role ? item.responsible_role : null
                };
                const {error} = await admin.from(LIST_ITEMS_TABLE).update(updatePayload).eq("id", item.id);
                if (error) return errorResponse("Operation failed", headers, 400);
                if (oldItem) logFieldChanges(admin, auth, item.id, oldItem, updatePayload, item.description.trim());
                return jsonResponse({success: true}, headers);
            }
            case "toggle-completion": {
                const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const {id, completed} = body;
                if (typeof id !== "string" || !id) return errorResponse("Item ID is required", headers, 400);
                const now = nowISO();
                const admin = getAdminClient();
                const {data: existingItem} = await admin.from(LIST_ITEMS_TABLE).select("completed, description").eq("id", id).maybeSingle();
                let newStatus: boolean | null = typeof completed === "boolean" ? completed : null;
                if (newStatus === null) newStatus = existingItem ? !existingItem.completed : true;
                const {error} = await admin.from(LIST_ITEMS_TABLE).update({
                    completed: newStatus, completed_at: newStatus ? now : null,
                    completed_by: newStatus ? auth : null, status: newStatus ? "completed" : "pending"
                }).eq("id", id);
                if (error) return errorResponse("Operation failed", headers, 400);
                logActivity(admin, {
                    list_item_id: id, user_id: auth,
                    action: newStatus ? "completed" : "uncompleted",
                    field_name: "status",
                    old_value: newStatus ? "pending" : "completed",
                    new_value: newStatus ? "completed" : "pending",
                    item_description: existingItem?.description ?? null
                });
                return jsonResponse({success: true}, headers);
            }
            case "delete": {
                const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const {id} = body;
                if (typeof id !== "string" || !id) return errorResponse("Item ID is required", headers, 400);
                const admin = getAdminClient();
                const {data: item} = await admin.from(LIST_ITEMS_TABLE).select("user_id, description").eq("id", id).maybeSingle();
                if (!item) return errorResponse("Item not found", headers, 404);
                const ownerErr = await requireOwnerOrHigherRole(supabase, auth, item.user_id, headers);
                if (ownerErr) return ownerErr;
                logActivity(admin, {list_item_id: id, user_id: auth, action: "deleted", item_description: item.description ?? null});
                const {error} = await admin.from(LIST_ITEMS_TABLE).delete().eq("id", id);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "fetch-planned-items": {
                const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                let query = supabase.from(PLANNED_ITEMS_TABLE).select("*");
                if (body?.startDate) query = query.gte("planned_date", body.startDate);
                if (body?.endDate) query = query.lte("planned_date", body.endDate);
                const {data, error} = await query.order("planned_date");
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "add-planned-item": {
                const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const {listItemId, plannedDate} = body;
                if (typeof listItemId !== "string" || !listItemId) return errorResponse("List item ID is required", headers, 400);
                if (typeof plannedDate !== "string" || !plannedDate) return errorResponse("Planned date is required", headers, 400);
                const id = crypto.randomUUID();
                const {error} = await supabase.from(PLANNED_ITEMS_TABLE).insert({
                    id, list_item_id: listItemId, planned_date: plannedDate, created_by: auth
                });
                if (error) return errorResponse(error.code === "23505" ? "Item already planned for this date" : "Operation failed", headers, 400);
                return jsonResponse({success: true, id}, headers);
            }
            case "remove-planned-item": {
                const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const {listItemId, plannedDate} = body;
                if (typeof listItemId !== "string" || !listItemId) return errorResponse("List item ID is required", headers, 400);
                if (typeof plannedDate !== "string" || !plannedDate) return errorResponse("Planned date is required", headers, 400);
                const {data: planned} = await supabase.from(PLANNED_ITEMS_TABLE).select("created_by").eq("list_item_id", listItemId).eq("planned_date", plannedDate).maybeSingle();
                if (!planned) return errorResponse("Planned item not found", headers, 404);
                const ownerErr = await requireOwnerOrHigherRole(supabase, auth, planned.created_by, headers);
                if (ownerErr) return ownerErr;
                const {error} = await supabase.from(PLANNED_ITEMS_TABLE).delete().eq("list_item_id", listItemId).eq("planned_date", plannedDate);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "clear-planned-items": {
                const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
                const elevErr = await requireElevated(supabase, auth, headers); if (elevErr) return elevErr;
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
            case "fetch-activity": {
                const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const limit = typeof body?.limit === "number" && body.limit > 0 ? Math.min(body.limit, 200) : 100;
                const offset = typeof body?.offset === "number" && body.offset >= 0 ? body.offset : 0;
                const admin = getAdminClient();
                const {data, error} = await admin.from(ACTIVITY_TABLE)
                    .select("*")
                    .order("created_at", {ascending: false})
                    .range(offset, offset + limit - 1);
                if (error) return errorResponse("Operation failed", headers, 400);
                const userIds = new Set<string>();
                (data ?? []).forEach((a: any) => { if (a?.user_id) userIds.add(a.user_id); });
                let profiles: any[] = [];
                if (userIds.size) {
                    const {data: profs} = await admin.from(PROFILES_TABLE).select("id, first_name, last_name").in("id", Array.from(userIds));
                    profiles = profs ?? [];
                }
                return jsonResponse({data: data ?? [], profiles}, headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});