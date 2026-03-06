// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const OPERATORS_TABLE = "operators";
const HISTORY_TABLE = "operators_history";
const COMMENTS_TABLE = "operators_comments";
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

async function parseBody(req: Request): Promise<any> {
    try { return await req.json(); } catch { return {}; }
}

function nowTimestamp(): string {
    return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function toBool(val: unknown): boolean {
    return val === true || String(val).toLowerCase() === "true";
}

function requireOperatorId(body: any, key = "operatorId"): string | null {
    const val = body?.[key];
    return typeof val === "string" && val && val !== "undefined" ? val : null;
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
            case "list": {
                const {data, error} = await supabase.from(OPERATORS_TABLE).select("*").order("name");
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "list-active": {
                const {data, error} = await supabase.from(OPERATORS_TABLE).select("*").eq("status", "Active").order("name");
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "list-by-plant": {
                const body = await parseBody(req);
                const plantCode = typeof body?.plantCode === "string" ? body.plantCode : null;
                if (!plantCode) return errorResponse("Plant code is required", headers, 400);
                const {data, error} = await supabase.from(OPERATORS_TABLE).select("*").eq("plant_code", plantCode).eq("position", "Mixer Operator").order("name");
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "list-tractor": {
                const {data, error} = await supabase.from(OPERATORS_TABLE).select("*").eq("position", "Tractor Operator").order("name");
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "list-trainers": {
                const {data, error} = await supabase.from(OPERATORS_TABLE).select("*").eq("is_trainer", true).order("name");
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "fetch-operators": {
                const [{data: activeData, error: activeError}, {data: otherData, error: otherError}] = await Promise.all([
                    supabase.from(OPERATORS_TABLE).select("*").eq("status", "Active").order("name"),
                    supabase.from(OPERATORS_TABLE).select("*").not("status", "eq", "Active").order("name")
                ]);
                if (activeError || otherError) return errorResponse("Failed to fetch operators", headers, 400);
                return jsonResponse({data: [...(activeData ?? []), ...(otherData ?? [])]}, headers);
            }
            case "get-by-employee-id": {
                const body = await parseBody(req);
                const employeeId = typeof body?.employeeId === "string" ? body.employeeId : null;
                if (!employeeId) return errorResponse("Invalid Employee ID", headers, 400);
                const {data, error} = await supabase.from(OPERATORS_TABLE).select("*").eq("employee_id", employeeId).single();
                if (error || !data) return jsonResponse({data: null}, headers);
                return jsonResponse({data}, headers);
            }
            case "create": {
                const body = await parseBody(req);
                const input = body?.operator ?? body;
                const now = nowTimestamp();
                const rawStatus = typeof input?.status === "string" ? input.status.trim() : "Active";
                const isActive = rawStatus.toLowerCase() === "active";
                const row = {
                    employee_id: typeof input?.employee_id === "string" && input.employee_id ? input.employee_id : crypto.randomUUID(),
                    smyrna_id: input?.smyrna_id ?? null,
                    name: typeof input?.name === "string" ? input.name.trim() : "",
                    plant_code: input?.plant_code ?? null,
                    status: rawStatus,
                    is_trainer: toBool(input?.is_trainer),
                    assigned_trainer: isActive ? null : input?.assigned_trainer ?? null,
                    position: input?.position ?? null,
                    created_at: input?.created_at ?? now,
                    updated_at: now,
                    pending_start_date: input?.pending_start_date ?? null,
                    phone: input?.phone ?? null
                };
                const {data, error} = await supabase.from(OPERATORS_TABLE).insert(row).select("*").single();
                if (error) return errorResponse("Operation failed", headers, 400);
                if (data?.employee_id) {
                    await supabase.from(HISTORY_TABLE).insert({
                        operator_id: data.employee_id, field_name: "created", old_value: null, new_value: "Operator created", changed_at: now, changed_by: SYSTEM_USER_ID
                    });
                }
                return jsonResponse({data}, headers);
            }
            case "update": {
                const body = await parseBody(req);
                const input = body?.operator ?? body;
                const employeeId = typeof input?.employee_id === "string" ? input.employee_id : null;
                if (!employeeId) return errorResponse("Invalid Employee ID", headers, 400);
                const now = nowTimestamp();
                const rawStatus = typeof input?.status === "string" ? input.status.trim() : "Active";
                const isActive = rawStatus.toLowerCase() === "active";
                const updateObj: Record<string, any> = {
                    smyrna_id: input?.smyrna_id ?? null,
                    name: typeof input?.name === "string" ? input.name.trim() : "",
                    plant_code: input?.plant_code ?? null,
                    status: rawStatus,
                    is_trainer: toBool(input?.is_trainer),
                    assigned_trainer: isActive ? null : input?.assigned_trainer ?? null,
                    position: input?.position ?? null,
                    created_at: input?.created_at ?? undefined,
                    updated_at: now,
                    pending_start_date: input?.pending_start_date ?? null,
                    phone: input?.phone ?? null,
                    automatic_restriction: toBool(input?.automatic_restriction)
                };
                Object.keys(updateObj).forEach((k) => updateObj[k] === undefined && delete updateObj[k]);
                const {data, error} = await supabase.from(OPERATORS_TABLE).update(updateObj).eq("employee_id", employeeId).select("*").maybeSingle();
                if (error) return errorResponse("Operation failed", headers, 400);
                if (!data) return errorResponse("Operator not found", headers, 404);
                return jsonResponse({data}, headers);
            }
            case "delete": {
                const body = await parseBody(req);
                const employeeId = typeof body?.employeeId === "string" ? body.employeeId : null;
                if (!employeeId) return errorResponse("Invalid Employee ID", headers, 400);
                const {data, error} = await supabase.from(OPERATORS_TABLE).delete().eq("employee_id", employeeId).select("*");
                if (error) return errorResponse("Operation failed", headers, 400);
                if (!data?.length) return errorResponse("Operator was not deleted", headers, 404);
                return jsonResponse({success: true}, headers);
            }
            case "fetch-history": {
                const body = await parseBody(req);
                const operatorId = requireOperatorId(body);
                const limit = Number.isInteger(body?.limit) ? body.limit : null;
                if (!operatorId) return errorResponse("Operator ID is required", headers, 400);
                let query = supabase.from(HISTORY_TABLE).select("*").eq("operator_id", operatorId).order("changed_at", {ascending: false});
                if (limit && limit > 0) query = query.limit(limit);
                const {data, error} = await query;
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "add-history": {
                const body = await parseBody(req);
                const operatorId = requireOperatorId(body);
                const fieldName = typeof body?.fieldName === "string" ? body.fieldName : null;
                if (!operatorId) return errorResponse("Operator ID is required", headers, 400);
                if (!fieldName) return errorResponse("Field name required", headers, 400);
                const oldValue = body?.oldValue == null ? null : String(body.oldValue);
                const newValue = body?.newValue == null ? null : String(body.newValue);
                if (oldValue === newValue) return jsonResponse({data: null, skipped: true}, headers);
                const userId = (typeof body?.changedBy === "string" && body.changedBy) ? body.changedBy : (req.headers.get("X-User-Id") || SYSTEM_USER_ID);
                const {data, error} = await supabase.from(HISTORY_TABLE).insert({
                    operator_id: operatorId, field_name: fieldName, old_value: oldValue, new_value: newValue, changed_at: new Date().toISOString(), changed_by: userId
                }).select().maybeSingle();
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data}, headers);
            }
            case "fetch-comments": {
                const body = await parseBody(req);
                const operatorId = requireOperatorId(body);
                if (!operatorId) return errorResponse("Operator ID is required", headers, 400);
                const {data, error} = await supabase.from(COMMENTS_TABLE).select("*").eq("operator_id", operatorId).order("created_at", {ascending: false});
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "add-comment": {
                const body = await parseBody(req);
                const operatorId = requireOperatorId(body);
                const text = typeof body?.text === "string" && body.text.trim() ? body.text.trim() : null;
                const userId = typeof body?.userId === "string" && body.userId !== "undefined" ? body.userId : null;
                if (!operatorId) return errorResponse("Operator ID is required", headers, 400);
                if (!text) return errorResponse("Comment text is required", headers, 400);
                if (!userId) return errorResponse("User ID is required", headers, 400);
                const {data, error} = await supabase.from(COMMENTS_TABLE).insert({
                    id: crypto.randomUUID(), operator_id: operatorId, text, author: userId, created_at: new Date().toISOString()
                }).select().single();
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data}, headers);
            }
            case "delete-comment": {
                const body = await parseBody(req);
                const commentId = typeof body?.commentId === "string" && body.commentId !== "undefined" ? body.commentId : null;
                if (!commentId) return errorResponse("Comment ID is required", headers, 400);
                const {data, error} = await supabase.from(COMMENTS_TABLE).delete().eq("id", commentId).select("*");
                if (error) return errorResponse("Operation failed", headers, 400);
                if (!data?.length) return errorResponse("Comment not found", headers, 404);
                return jsonResponse({success: true}, headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
