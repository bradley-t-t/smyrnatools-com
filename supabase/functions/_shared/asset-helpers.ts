// @ts-ignore
import {jsonResponse, errorResponse} from "./cors.ts";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
const SESSIONS_TABLE = "users_sessions";
const SESSION_EXPIRY_DAYS = 7;

/** Validates the caller's session against the users_sessions table and returns the authenticated userId. */
export async function requireAuthenticated(supabase: any, req: Request, headers: any): Promise<string | Response> {
    const userId = req.headers.get("x-user-id");
    const sessionId = req.headers.get("x-session-id");
    if (!userId || !sessionId) return errorResponse("Unauthorized", headers, 401);
    const {data, error} = await supabase.from(SESSIONS_TABLE).select("id, last_active").eq("id", sessionId).eq("user_id", userId).maybeSingle();
    if (error || !data) return errorResponse("Unauthorized", headers, 401);
    if (data.last_active) {
        const lastActive = new Date(data.last_active);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - SESSION_EXPIRY_DAYS);
        if (lastActive < expiryDate) return errorResponse("Session expired", headers, 401);
    }
    supabase.from(SESSIONS_TABLE).update({last_active: new Date().toISOString()}).eq("id", sessionId).then(() => {}).catch(() => {});
    return userId;
}

const PERMISSIONS_TABLE = "users_permissions";
const ROLES_SELECT = "role_id, users_roles(weight)";

export async function getUserWeight(supabase: any, userId: string): Promise<number> {
    const {data} = await supabase.from(PERMISSIONS_TABLE).select(ROLES_SELECT).eq("user_id", userId);
    if (!data?.length) return 0;
    return Math.max(...data.map((d: any) => d.users_roles?.weight ?? 0));
}

export async function requireOwnerOrHigherRole(supabase: any, callerId: string, ownerId: string | null, headers: any): Promise<Response | null> {
    if (!ownerId || callerId === ownerId) return null;
    const callerWeight = await getUserWeight(supabase, callerId);
    const ownerWeight = await getUserWeight(supabase, ownerId);
    if (callerWeight > ownerWeight) return null;
    return errorResponse("Forbidden: insufficient privileges to modify another user's record", headers, 403);
}

const ALLOWED_SEVERITIES = ["Low", "Medium", "High"];
const DEFAULT_HISTORY_LIMIT = 200;
const DEFAULT_SERVICE_THRESHOLD_DAYS = 30;
const DEFAULT_CLEANLINESS_MONTHS = 6;

export function nowIso(): string {
    return new Date().toISOString();
}

export function toDbTimestamp(v: any): string | null {
    if (!v) return null;
    if (typeof v === "string") return v;
    if (v instanceof Date) return v.toISOString();
    return null;
}

export async function parseBody(req: Request): Promise<any> {
    try { return await req.json(); } catch { return {}; }
}

export function normalize(field: string, value: any): any {
    if (value === undefined || value === null) return null;
    const f = String(field || "").toLowerCase();
    let v: any = value;
    if (typeof v === "string") v = v.trim();
    if (v === "") return null;
    if (f.includes("date")) {
        const d = new Date(v);
        return isNaN(d.getTime()) ? String(v) : d.toISOString().split("T")[0];
    }
    if (f.includes("rating") || f.includes("hours") || f.includes("mileage") || f.includes("year")) {
        const n = Number(v);
        return Number.isFinite(n) ? n : v;
    }
    if (f.startsWith("has_") || f.startsWith("is_") || f.includes("verification")) {
        if (v === true || v === "true" || v === 1 || v === "1") return true;
        if (v === false || v === "false" || v === 0 || v === "0") return false;
    }
    if (f.startsWith("assigned_") || f.endsWith("_id") || f.includes("operator") || f.includes("tractor")) {
        if (v === "0" || v === 0) return null;
    }
    return v;
}

export function normalizeYear(raw: any): number | null {
    const y = normalize("year", raw);
    return y != null && Number.isFinite(Number(y)) ? Number(y) : null;
}

export function resolveUserId(body: any, req: Request): string | null {
    return (typeof body?.userId === "string" && body.userId) ? body.userId : (req.headers.get("X-User-Id") || null);
}

export function resolveChangedBy(body: any, req: Request): string {
    return (typeof body?.changedBy === "string" && body.changedBy) ? body.changedBy : (req.headers.get("X-User-Id") || SYSTEM_USER_ID);
}

export function buildCountMap(rows: any[], idKey: string): Record<string, number> {
    const map: Record<string, number> = {};
    for (const row of rows || []) {
        const id = (row as any)[idKey];
        map[id] = (map[id] || 0) + 1;
    }
    return map;
}

export function buildLatestMap(rows: any[], idKey: string, dateKey = "changed_at"): Record<string, string> {
    const map: Record<string, string> = {};
    for (const h of rows || []) {
        const id = (h as any)[idKey];
        if (!map[id]) map[id] = (h as any)[dateKey];
    }
    return map;
}

export function computeDiffs(
    current: Record<string, any>,
    apiData: Record<string, any>,
    fields: string[],
    idKey: string,
    idValue: string,
    userId: string,
    normalizeFn: (field: string, value: any) => any = normalize
): Array<Record<string, any>> {
    const diffs: Array<Record<string, any>> = [];
    for (const field of fields) {
        const b = normalizeFn(field, current[field]);
        const a = normalizeFn(field, apiData[field]);
        if (b !== a) diffs.push({
            [idKey]: idValue, field_name: field,
            old_value: b != null ? String(b) : null,
            new_value: a != null ? String(a) : null,
            changed_at: nowIso(), changed_by: userId
        });
    }
    return diffs;
}

interface AssetTables {
    main: string;
    history: string;
    idKey: string;
    comments?: string;
    maintenance?: string;
}

export async function handleFetchComments(supabase: any, body: any, tables: AssetTables, headers: Record<string, string>): Promise<Response> {
    const entityId = typeof body?.[tables.idKey] === "string" ? body[tables.idKey] : null;
    if (!entityId) return errorResponse(`${tables.idKey} is required`, headers, 400);
    const fkCol = tables.idKey.replace(/Id$/, "_id").replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
    const {data, error} = await supabase.from(tables.comments!).select("*").eq(fkCol, entityId).order("created_at", {ascending: false});
    if (error) return errorResponse("Operation failed", headers, 400);
    return jsonResponse({data: data ?? []}, headers);
}

export async function handleAddComment(supabase: any, body: any, req: Request, tables: AssetTables, headers: Record<string, string>): Promise<Response> {
    const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
    const entityId = typeof body?.[tables.idKey] === "string" ? body[tables.idKey] : null;
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const author = typeof body?.author === "string" ? body.author.trim() : "";
    if (!entityId) return errorResponse(`${tables.idKey} is required`, headers, 400);
    if (!text) return errorResponse("Comment text is required", headers, 400);
    if (!author) return errorResponse("Author is required", headers, 400);
    const fkCol = tables.idKey.replace(/Id$/, "_id").replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
    const {data, error} = await supabase.from(tables.comments!).insert([{[fkCol]: entityId, text, author, created_at: nowIso()}]).select().maybeSingle();
    if (error) return errorResponse("Operation failed", headers, 400);
    return jsonResponse({data}, headers);
}

export async function handleDeleteComment(supabase: any, body: any, req: Request, table: string, headers: Record<string, string>): Promise<Response> {
    const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
    const commentId = typeof body?.commentId === "string" ? body.commentId : null;
    if (!commentId) return errorResponse("Comment ID is required", headers, 400);
    const {error} = await supabase.from(table).delete().eq("id", commentId);
    if (error) return errorResponse("Operation failed", headers, 400);
    return jsonResponse({success: true}, headers);
}

export async function handleFetchHistory(supabase: any, body: any, table: string, idKey: string, bodyKey: string, headers: Record<string, string>): Promise<Response> {
    const entityId = typeof body?.[bodyKey] === "string" ? body[bodyKey] : null;
    const limit = Number.isInteger(body?.limit) ? body.limit : null;
    if (!entityId) return errorResponse(`${bodyKey} is required`, headers, 400);
    let query = supabase.from(table).select("*").eq(idKey, entityId).order("changed_at", {ascending: false});
    if (limit && limit > 0) query = query.limit(limit);
    const {data, error} = await query;
    if (error) return errorResponse("Operation failed", headers, 400);
    return jsonResponse({data: data ?? []}, headers);
}

export async function handleAddHistory(supabase: any, body: any, req: Request, table: string, idKey: string, bodyKey: string, headers: Record<string, string>): Promise<Response> {
    const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
    const entityId = typeof body?.[bodyKey] === "string" ? body[bodyKey] : null;
    const fieldName = typeof body?.fieldName === "string" ? body.fieldName : null;
    if (!entityId) return errorResponse(`${bodyKey} is required`, headers, 400);
    if (!fieldName) return errorResponse("Field name required", headers, 400);
    const oldValue = body?.oldValue == null ? null : String(body.oldValue);
    const newValue = body?.newValue == null ? null : String(body.newValue);
    const b = normalize(fieldName, oldValue);
    const a = normalize(fieldName, newValue);
    if (b === a) return jsonResponse({data: null, skipped: true}, headers);
    const userId = auth;
    const {data, error} = await supabase.from(table).insert({
        [idKey]: entityId, field_name: fieldName,
        old_value: b != null ? String(b) : null, new_value: a != null ? String(a) : null,
        changed_at: nowIso(), changed_by: userId
    }).select().maybeSingle();
    if (error) return errorResponse("Operation failed", headers, 400);
    return jsonResponse({data}, headers);
}

export async function handleFetchIssues(supabase: any, body: any, table: string, idKey: string, bodyKey: string, headers: Record<string, string>): Promise<Response> {
    const entityId = typeof body?.[bodyKey] === "string" ? body[bodyKey] : null;
    if (!entityId) return errorResponse(`${bodyKey} is required`, headers, 400);
    const {data, error} = await supabase.from(table).select("*").eq(idKey, entityId).order("time_created", {ascending: false});
    if (error) return errorResponse("Operation failed", headers, 400);
    return jsonResponse({data: data ?? []}, headers);
}

export async function handleAddIssue(supabase: any, body: any, req: Request, table: string, idKey: string, bodyKey: string, headers: Record<string, string>): Promise<Response> {
    const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
    const entityId = typeof body?.[bodyKey] === "string" ? body[bodyKey] : null;
    const issue = typeof body?.issue === "string" ? body.issue.trim() : "";
    const severityIn = typeof body?.severity === "string" ? body.severity : "";
    if (!entityId) return errorResponse(`${bodyKey} is required`, headers, 400);
    if (!issue) return errorResponse("Issue description is required", headers, 400);
    const severity = ALLOWED_SEVERITIES.includes(severityIn) ? severityIn : "Medium";
    const {data, error} = await supabase.from(table).insert({
        id: crypto.randomUUID(), [idKey]: entityId, issue, severity, time_created: nowIso(), created_by: auth
    }).select().maybeSingle();
    if (error) return errorResponse("Operation failed", headers, 400);
    return jsonResponse({data}, headers);
}

export async function handleCompleteIssue(supabase: any, body: any, req: Request, table: string, headers: Record<string, string>): Promise<Response> {
    const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
    const issueId = typeof body?.issueId === "string" ? body.issueId : null;
    if (!issueId) return errorResponse("Issue ID is required", headers, 400);
    const {error} = await supabase.from(table).update({time_completed: nowIso()}).eq("id", issueId);
    if (error) return errorResponse("Operation failed", headers, 400);
    return jsonResponse({success: true}, headers);
}

export async function handleDeleteIssue(supabase: any, body: any, req: Request, table: string, headers: Record<string, string>): Promise<Response> {
    const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
    const issueId = typeof body?.issueId === "string" ? body.issueId : null;
    if (!issueId) return errorResponse("Issue ID is required", headers, 400);
    const {data: issue} = await supabase.from(table).select("created_by").eq("id", issueId).maybeSingle();
    if (!issue) return errorResponse("Issue not found or already deleted", headers, 404);
    const ownerErr = await requireOwnerOrHigherRole(supabase, auth, issue.created_by, headers);
    if (ownerErr) return ownerErr;
    const {error} = await supabase.from(table).delete().eq("id", issueId);
    if (error) return errorResponse("Operation failed", headers, 400);
    return jsonResponse({success: true}, headers);
}

export async function handleDelete(supabase: any, body: any, req: Request, mainTable: string, historyTable: string, historyIdKey: string, entityLabel: string, headers: Record<string, string>): Promise<Response> {
    const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
    const id = typeof body?.id === "string" ? body.id : null;
    if (!id) return errorResponse(`${entityLabel} ID is required`, headers, 400);
    const {data: entity} = await supabase.from(mainTable).select("updated_by").eq("id", id).maybeSingle();
    if (!entity) return errorResponse(`${entityLabel} not found`, headers, 404);
    const ownerErr = await requireOwnerOrHigherRole(supabase, auth, entity.updated_by, headers);
    if (ownerErr) return ownerErr;
    const {error: hErr} = await supabase.from(historyTable).delete().eq(historyIdKey, id);
    if (hErr) return errorResponse("Operation failed", headers, 400);
    const {error} = await supabase.from(mainTable).delete().eq("id", id);
    if (error) return errorResponse("Operation failed", headers, 400);
    return jsonResponse({success: true}, headers);
}

export async function handleFetchByField(supabase: any, body: any, table: string, field: string, bodyKey: string, orderBy: string, headers: Record<string, string>): Promise<Response> {
    const value = typeof body?.[bodyKey] === "string" ? body[bodyKey] : null;
    if (!value) return errorResponse(`${bodyKey} is required`, headers, 400);
    const {data, error} = await supabase.from(table).select("*").eq(field, value).order(orderBy, {ascending: true});
    if (error) return errorResponse("Operation failed", headers, 400);
    return jsonResponse({data: data ?? []}, headers);
}

export async function handleSearchByField(supabase: any, body: any, table: string, field: string, orderBy: string, headers: Record<string, string>): Promise<Response> {
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    if (!query) return errorResponse("Search query is required", headers, 400);
    const {data, error} = await supabase.from(table).select("*").ilike(field, `%${query}%`).order(orderBy, {ascending: true});
    if (error) return errorResponse("Operation failed", headers, 400);
    return jsonResponse({data: data ?? []}, headers);
}

export async function handleFetchNeedingService(supabase: any, body: any, table: string, orderBy: string, headers: Record<string, string>): Promise<Response> {
    const dayThreshold = Number.isInteger(body?.dayThreshold) ? body.dayThreshold : DEFAULT_SERVICE_THRESHOLD_DAYS;
    const {data, error} = await supabase.from(table).select("*").order(orderBy, {ascending: true});
    if (error) return errorResponse("Operation failed", headers, 400);
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - dayThreshold);
    return jsonResponse({data: (data || []).filter((m: any) => !m.last_service_date || new Date(m.last_service_date) < thresholdDate)}, headers);
}

export async function handleFetchCleanlinessHistory(supabase: any, body: any, table: string, idKey: string, bodyKey: string, headers: Record<string, string>): Promise<Response> {
    const entityId = typeof body?.[bodyKey] === "string" ? body[bodyKey] : null;
    const months = Number.isInteger(body?.months) ? body.months : DEFAULT_CLEANLINESS_MONTHS;
    const threshold = new Date();
    threshold.setMonth(threshold.getMonth() - months);
    let query = supabase.from(table).select("*").eq("field_name", "cleanliness_rating").gte("changed_at", threshold.toISOString()).order("changed_at", {ascending: true}).limit(DEFAULT_HISTORY_LIMIT);
    if (entityId) query = query.eq(idKey, entityId);
    const {data, error} = await query;
    if (error) return errorResponse("Operation failed", headers, 400);
    return jsonResponse({data: data ?? []}, headers);
}

export async function handleVerify(supabase: any, body: any, req: Request, table: string, idKey: string, bodyIdKey: string, headers: Record<string, string>): Promise<Response> {
    const auth = await requireAuthenticated(supabase, req, headers); if (auth instanceof Response) return auth;
    const id = typeof body?.id === "string" ? body.id : (typeof body?.[bodyIdKey] === "string" ? body[bodyIdKey] : null);
    const userId = auth;
    if (!id) return errorResponse(`${bodyIdKey} is required`, headers, 400);
    const patch: Record<string, any> = {updated_last: nowIso(), updated_by: userId};
    const y = normalizeYear(body?.year ?? body?.data?.year);
    if (y != null) patch.year = y;
    const {data, error} = await supabase.from(table).update(patch).eq("id", id).select().maybeSingle();
    if (error) return errorResponse("Operation failed", headers, 400);
    return jsonResponse({data}, headers);
}

export function decodeBase64ToUint8Array(base64: string): Uint8Array {
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    return bytes;
}

