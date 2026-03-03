// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions} from "../_shared/cors.ts";

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const corsHeaders = getCorsHeaders(origin);
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
                const {data, error} = await supabase.from("operators").select("*").order("name");
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data: data ?? []}), {headers: corsHeaders});
            }
            case "list-active": {
                const {data, error} = await supabase.from("operators").select("*").eq("status", "Active").order("name");
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data: data ?? []}), {headers: corsHeaders});
            }
            case "list-by-plant": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    body = {};
                }
                const plantCode = typeof body?.plantCode === "string" ? body.plantCode : null;
                if (!plantCode) return new Response(JSON.stringify({error: "Plant code is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {data, error} = await supabase
                    .from("operators")
                    .select("*")
                    .eq("plant_code", plantCode)
                    .eq("position", "Mixer Operator")
                    .order("name");
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data: data ?? []}), {headers: corsHeaders});
            }
            case "list-tractor": {
                const {data, error} = await supabase
                    .from("operators")
                    .select("*")
                    .eq("position", "Tractor Operator")
                    .order("name");
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data: data ?? []}), {headers: corsHeaders});
            }
            case "list-trainers": {
                const {data, error} = await supabase.from("operators").select("*").eq("is_trainer", true).order("name");
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data: data ?? []}), {headers: corsHeaders});
            }
            case "fetch-operators": {
                const [{data: activeData, error: activeError}, {
                    data: otherData,
                    error: otherError
                }] = await Promise.all([
                    supabase.from("operators").select("*").eq("status", "Active").order("name"),
                    supabase.from("operators").select("*").not("status", "eq", "Active").order("name")
                ]);
                if (activeError || otherError) {
                    const err = activeError ?? otherError;
                    return new Response(JSON.stringify({error: err?.message || "Failed to fetch operators"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const combined = [...(activeData ?? []), ...(otherData ?? [])];
                return new Response(JSON.stringify({data: combined}), {headers: corsHeaders});
            }
            case "get-by-employee-id": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    body = {};
                }
                const employeeId = typeof body?.employeeId === "string" ? body.employeeId : null;
                if (!employeeId) return new Response(JSON.stringify({error: "Invalid Employee ID"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {
                    data,
                    error
                } = await supabase.from("operators").select("*").eq("employee_id", employeeId).single();
                if (error || !data) return new Response(JSON.stringify({data: null}), {headers: corsHeaders});
                return new Response(JSON.stringify({data}), {headers: corsHeaders});
            }
            case "create": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    body = {};
                }
                const input = body?.operator ?? body;
                const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
                let employee_id = typeof input?.employee_id === "string" && input.employee_id ? input.employee_id : crypto.randomUUID();
                const rawStatus = typeof input?.status === "string" ? input.status.trim() : "Active";
                const status = rawStatus;
                const isActive = rawStatus.toLowerCase() === "active";
                const row = {
                    employee_id,
                    smyrna_id: input?.smyrna_id ?? null,
                    name: typeof input?.name === "string" ? input.name.trim() : "",
                    plant_code: input?.plant_code ?? null,
                    status,
                    is_trainer: input?.is_trainer === true || String(input?.is_trainer).toLowerCase() === "true",
                    assigned_trainer: isActive ? null : input?.assigned_trainer ?? null,
                    position: input?.position ?? null,
                    created_at: input?.created_at ?? now,
                    updated_at: now,
                    pending_start_date: input?.pending_start_date ?? null,
                    phone: input?.phone ?? null
                };
                const {data, error} = await supabase.from("operators").insert(row).select("*").single();
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (data && (data as any).employee_id) {
                    const creationHistory = {
                        operator_id: (data as any).employee_id,
                        field_name: "created",
                        old_value: null,
                        new_value: "Operator created",
                        changed_at: now,
                        changed_by: "00000000-0000-0000-0000-000000000000"
                    };
                    await supabase.from("operators_history").insert(creationHistory);
                }
                return new Response(JSON.stringify({data}), {headers: corsHeaders});
            }
            case "update": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    body = {};
                }
                const input = body?.operator ?? body;
                const employeeId = typeof input?.employee_id === "string" ? input.employee_id : null;
                if (!employeeId) return new Response(JSON.stringify({error: "Invalid Employee ID"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
                const rawStatus = typeof input?.status === "string" ? input.status.trim() : "Active";
                const status = rawStatus;
                const isActive = rawStatus.toLowerCase() === "active";
                const updateObj: Record<string, any> = {
                    smyrna_id: input?.smyrna_id ?? null,
                    name: typeof input?.name === "string" ? input.name.trim() : "",
                    plant_code: input?.plant_code ?? null,
                    status,
                    is_trainer: input?.is_trainer === true || String(input?.is_trainer).toLowerCase() === "true",
                    assigned_trainer: isActive ? null : input?.assigned_trainer ?? null,
                    position: input?.position ?? null,
                    created_at: input?.created_at ?? undefined,
                    updated_at: now,
                    pending_start_date: input?.pending_start_date ?? null,
                    phone: input?.phone ?? null,
                    automatic_restriction: input?.automatic_restriction === true || String(input?.automatic_restriction).toLowerCase() === "true"
                };
                Object.keys(updateObj).forEach((k) => updateObj[k] === undefined && delete updateObj[k]);
                const {data, error} = await supabase
                    .from("operators")
                    .update(updateObj)
                    .eq("employee_id", employeeId)
                    .select("*")
                    .maybeSingle();
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (!data) return new Response(JSON.stringify({error: "Operator not found"}), {
                    status: 404,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data}), {headers: corsHeaders});
            }
            case "delete": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    body = {};
                }
                const employeeId = typeof body?.employeeId === "string" ? body.employeeId : null;
                if (!employeeId) return new Response(JSON.stringify({error: "Invalid Employee ID"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {
                    data,
                    error
                } = await supabase.from("operators").delete().eq("employee_id", employeeId).select("*");
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (!data || data.length === 0) return new Response(JSON.stringify({error: "Operator was not deleted"}), {
                    status: 404,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({success: true}), {headers: corsHeaders});
            }
            case "fetch-history": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    body = {};
                }
                const operatorId = typeof body?.operatorId === "string" && body.operatorId !== "undefined" ? body.operatorId : null;
                const limit = Number.isInteger(body?.limit) ? body.limit : null;
                if (!operatorId) return new Response(JSON.stringify({error: "Operator ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                let query = supabase.from("operators_history").select("*").eq("operator_id", operatorId).order("changed_at", {ascending: false});
                if (limit && limit > 0) query = query.limit(limit);
                const {data, error} = await query;
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data: data ?? []}), {headers: corsHeaders});
            }
            case "add-history": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const operatorId = typeof body?.operatorId === "string" && body.operatorId !== "undefined" ? body.operatorId : null;
                const fieldName = typeof body?.fieldName === "string" ? body.fieldName : null;
                const oldValue = body?.oldValue == null ? null : String(body.oldValue);
                const newValue = body?.newValue == null ? null : String(body.newValue);
                const changedBy = typeof body?.changedBy === "string" && body.changedBy ? body.changedBy : null;
                if (!operatorId) return new Response(JSON.stringify({error: "Operator ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (!fieldName) return new Response(JSON.stringify({error: "Field name required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                // For operators, no special normalization needed, but can add if required
                const b = oldValue;
                const a = newValue;
                if (b === a) return new Response(JSON.stringify({data: null, skipped: true}), {headers: corsHeaders});
                let userId = changedBy;
                if (!userId) userId = (req.headers.get("X-User-Id") || "00000000-0000-0000-0000-000000000000");
                const record = {
                    operator_id: operatorId,
                    field_name: fieldName,
                    old_value: b,
                    new_value: a,
                    changed_at: new Date().toISOString(),
                    changed_by: userId
                };
                const {data, error} = await supabase.from("operators_history").insert(record).select().maybeSingle();
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data}), {headers: corsHeaders});
            }
            case "fetch-comments": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    body = {};
                }
                const operatorId = typeof body?.operatorId === "string" && body.operatorId !== "undefined" ? body.operatorId : null;
                if (!operatorId) return new Response(JSON.stringify({error: "Operator ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {data, error} = await supabase
                    .from("operators_comments")
                    .select("*")
                    .eq("operator_id", operatorId)
                    .order("created_at", {ascending: false});
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data: data ?? []}), {headers: corsHeaders});
            }
            case "add-comment": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const operatorId = typeof body?.operatorId === "string" && body.operatorId !== "undefined" ? body.operatorId : null;
                const text = typeof body?.text === "string" && body.text.trim() ? body.text.trim() : null;
                const userId = typeof body?.userId === "string" && body.userId !== "undefined" ? body.userId : null;
                if (!operatorId) return new Response(JSON.stringify({error: "Operator ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (!text) return new Response(JSON.stringify({error: "Comment text is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (!userId) return new Response(JSON.stringify({error: "User ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const record = {
                    id: crypto.randomUUID(),
                    operator_id: operatorId,
                    text: text,
                    author: userId,
                    created_at: new Date().toISOString()
                };
                const {data, error} = await supabase.from("operators_comments").insert(record).select().single();
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data}), {headers: corsHeaders});
            }
            case "delete-comment": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    body = {};
                }
                const commentId = typeof body?.commentId === "string" && body.commentId !== "undefined" ? body.commentId : null;
                if (!commentId) return new Response(JSON.stringify({error: "Comment ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {data, error} = await supabase
                    .from("operators_comments")
                    .delete()
                    .eq("id", commentId)
                    .select("*");
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (!data || data.length === 0) return new Response(JSON.stringify({error: "Comment not found"}), {
                    status: 404,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({success: true}), {headers: corsHeaders});
            }
            default:
                return new Response(JSON.stringify({error: "Invalid endpoint", path: url.pathname}), {
                    status: 404,
                    headers: corsHeaders
                });
        }
    } catch (error) {
        return new Response(JSON.stringify({
            error: "Internal server error",
            message: (error as Error).message
        }), {status: 500, headers: corsHeaders});
    }
});
