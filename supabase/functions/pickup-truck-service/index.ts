// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Max-Age": "86400",
    "Connection": "keep-alive"
};

function handleOptions() {
    return new Response(null, {status: 204, headers: corsHeaders});
}

function nowIso() {
    return new Date().toISOString();
}

function normalize(field: string, value: any): any {
    if (value === undefined || value === null) return null;
    const f = String(field || "").toLowerCase();
    let v: any = value;
    if (typeof v === "string") v = v.trim();
    if (v === "") return null;
    if (f.includes("date")) {
        const d = new Date(v);
        return isNaN(d.getTime()) ? String(v) : d.toISOString().split("T")[0];
    }
    if (f.includes("rating") || f.includes("mileage") || f.includes("year")) {
        const n = Number(v);
        return Number.isFinite(n) ? n : v;
    }
    if (f.startsWith("has_") || f.startsWith("is_")) {
        if (v === true || v === "true" || v === 1 || v === "1") return true;
        if (v === false || v === "false" || v === 0 || v === "0") return false;
    }
    if (f.startsWith("assigned") || f.endsWith("_id")) {
        if (v === "0" || v === 0) return null;
    }
    return v;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return handleOptions();
    try {
        const url = new URL(req.url);
        const pathSegments = url.pathname.split("/").filter(s => s);
        const serviceIndex = pathSegments.findIndex(s => s === "pickup-truck-service");
        const endpoint = serviceIndex >= 0 && pathSegments[serviceIndex + 1]
            ? pathSegments[serviceIndex + 1]
            : pathSegments[pathSegments.length - 1];
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {global: {headers: {Authorization: req.headers.get("Authorization") || ""}}}
        );

        switch (endpoint) {
            case "fetch-all": {
                const {data, error} = await supabase
                    .from("pickup_trucks")
                    .select("*")
                    .order("assigned_plant", {ascending: true})
                    .order("assigned", {ascending: true})
                    .order("make", {ascending: true})
                    .order("model", {ascending: true});
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data: data ?? []}), {headers: corsHeaders});
            }
            case "fetch-by-id": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const id = typeof body?.id === "string" ? body.id : null;
                if (!id) return new Response(JSON.stringify({error: "Pickup Truck ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {data, error} = await supabase.from("pickup_trucks").select("*").eq("id", id).maybeSingle();
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data: data ?? null}), {headers: corsHeaders});
            }
            case "create": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const pickup = body?.pickup || body;
                const userId = typeof body?.userId === "string" && body.userId ? body.userId : null;
                if (!userId) return new Response(JSON.stringify({error: "User ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const now = nowIso();
                const mileageVal = typeof pickup?.mileage === "number" ? Math.max(0, Math.floor(pickup.mileage)) : (typeof pickup?.mileage === "string" && pickup.mileage.trim() !== "" ? Math.max(0, Math.floor(Number(pickup.mileage))) : null);
                const apiData: Record<string, any> = {
                    vin: typeof pickup?.vin === "string" ? pickup.vin : null,
                    make: typeof pickup?.make === "string" ? pickup.make : null,
                    model: typeof pickup?.model === "string" ? pickup.model : null,
                    year: typeof pickup?.year === "number" ? pickup.year : (typeof pickup?.year === "string" ? pickup.year : null),
                    assigned: typeof pickup?.assigned === "string" ? (pickup.assigned.trim() === "" ? null : pickup.assigned) : null,
                    assigned_plant: typeof pickup?.assignedPlant === "string" ? pickup.assignedPlant : null,
                    status: typeof pickup?.status === "string" ? pickup.status : "Active",
                    mileage: mileageVal,
                    comments: typeof pickup?.comments === "string" ? pickup.comments : null,
                    created_at: now,
                    updated_at: now,
                    updated_by: userId,
                    updated_last: null
                };
                const {data, error} = await supabase.from("pickup_trucks").insert([apiData]).select().maybeSingle();
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data}), {headers: corsHeaders});
            }
            case "update": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const id = typeof body?.pickupId === "string" ? body.pickupId : (typeof body?.id === "string" ? body.id : null);
                const pickup = body?.pickup || body?.data || body;
                const userId = typeof body?.userId === "string" && body.userId ? body.userId : null;
                if (!id) return new Response(JSON.stringify({error: "Pickup Truck ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (!userId) return new Response(JSON.stringify({error: "User ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {
                    data: current,
                    error: curErr
                } = await supabase.from("pickup_trucks").select("*").eq("id", id).maybeSingle();
                if (curErr) return new Response(JSON.stringify({error: curErr.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (!current) return new Response(JSON.stringify({error: "Pickup Truck not found"}), {
                    status: 404,
                    headers: corsHeaders
                });
                const mileageVal = typeof pickup?.mileage === "number" ? Math.max(0, Math.floor(pickup.mileage)) : (typeof pickup?.mileage === "string" && pickup.mileage.trim() !== "" ? Math.max(0, Math.floor(Number(pickup.mileage))) : current.mileage);
                const hasAssigned = Object.prototype.hasOwnProperty.call(pickup, 'assigned');
                const normalizedAssigned = hasAssigned ? (pickup.assigned == null ? null : (typeof pickup.assigned === 'string' && pickup.assigned.trim() === '' ? null : String(pickup.assigned))) : current.assigned;
                const hasAssignedPlant = Object.prototype.hasOwnProperty.call(pickup, 'assignedPlant');
                const normalizedAssignedPlant = hasAssignedPlant ? (pickup.assignedPlant == null ? null : String(pickup.assignedPlant)) : current.assigned_plant;
                const hasStatus = Object.prototype.hasOwnProperty.call(pickup, 'status');
                const normalizedStatus = hasStatus ? (pickup.status == null ? current.status : String(pickup.status)) : current.status;
                const apiData: Record<string, any> = {
                    vin: typeof pickup?.vin === "string" ? pickup.vin : current.vin,
                    make: typeof pickup?.make === "string" ? pickup.make : current.make,
                    model: typeof pickup?.model === "string" ? pickup.model : current.model,
                    year: typeof pickup?.year === "number" ? pickup.year : (typeof pickup?.year === "string" ? pickup.year : current.year),
                    assigned: normalizedAssigned,
                    assigned_plant: normalizedAssignedPlant,
                    status: normalizedStatus,
                    mileage: mileageVal,
                    comments: typeof pickup?.comments === "string" ? pickup.comments : current.comments,
                    updated_at: nowIso(),
                    updated_by: userId,
                    updated_last: current.updated_last
                };
                const {
                    data,
                    error
                } = await supabase.from("pickup_trucks").update(apiData).eq("id", id).select().maybeSingle();
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                const diffs: Array<{
                    truck_id: string;
                    field_name: string;
                    old_value: string | null;
                    new_value: string | null;
                    changed_at: string;
                    changed_by: string;
                }> = [];
                const fields = [
                    {field: "vin"},
                    {field: "make"},
                    {field: "model"},
                    {field: "year"},
                    {field: "assigned"},
                    {field: "assigned_plant"},
                    {field: "status"},
                    {field: "mileage"},
                    {field: "comments"}
                ];
                for (const f of fields) {
                    const beforeVal = (current as any)[f.field];
                    const afterVal = (apiData as any)[f.field];
                    const b = normalize(f.field, beforeVal);
                    const a = normalize(f.field, afterVal);
                    if (b !== a) diffs.push({
                        truck_id: id,
                        field_name: f.field,
                        old_value: b != null ? String(b) : null,
                        new_value: a != null ? String(a) : null,
                        changed_at: nowIso(),
                        changed_by: userId
                    });
                }
                if (diffs.length) {
                    const {error: histErr} = await supabase.from("pickup_trucks_history").insert(diffs);
                    if (histErr) return new Response(JSON.stringify({error: histErr.message}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                return new Response(JSON.stringify({data}), {headers: corsHeaders});
            }
            case "delete": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const id = typeof body?.id === "string" ? body.id : null;
                if (!id) return new Response(JSON.stringify({error: "Pickup Truck ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {error: hErr} = await supabase.from("pickup_trucks_history").delete().eq("truck_id", id);
                if (hErr) return new Response(JSON.stringify({error: hErr.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {error} = await supabase.from("pickup_trucks").delete().eq("id", id);
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({success: true}), {headers: corsHeaders});
            }
            case "search-by-vin": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const query = typeof body?.query === "string" ? body.query.trim() : "";
                if (!query) return new Response(JSON.stringify({error: "Search query is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {
                    data,
                    error
                } = await supabase.from("pickup_trucks").select("*").ilike("vin", `%${query}%`).order("vin", {ascending: true});
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data: data ?? []}), {headers: corsHeaders});
            }
            case "search-by-assigned": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const query = typeof body?.query === "string" ? body.query.trim() : "";
                if (!query) return new Response(JSON.stringify({error: "Search query is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {
                    data,
                    error
                } = await supabase.from("pickup_trucks").select("*").ilike("assigned", `%${query}%`).order("assigned", {ascending: true});
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data: data ?? []}), {headers: corsHeaders});
            }
            case "fetch-comments": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const pickupId = typeof body?.pickupId === "string" ? body.pickupId : null;
                if (!pickupId) return new Response(JSON.stringify({error: "Pickup Truck ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {
                    data,
                    error
                } = await supabase.from("pickup_trucks_comments").select("*").eq("truck_id", pickupId).order("created_at", {ascending: false});
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
                const pickupId = typeof body?.pickupId === "string" ? body.pickupId : null;
                const text = typeof body?.text === "string" ? body.text.trim() : "";
                const author = typeof body?.author === "string" ? body.author.trim() : "";
                if (!pickupId) return new Response(JSON.stringify({error: "Pickup Truck ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (!text) return new Response(JSON.stringify({error: "Comment text is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (!author) return new Response(JSON.stringify({error: "Author is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const comment = {truck_id: pickupId, text, author, created_at: nowIso()};
                const {
                    data,
                    error
                } = await supabase.from("pickup_trucks_comments").insert([comment]).select().maybeSingle();
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
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const commentId = typeof body?.commentId === "string" ? body.commentId : null;
                if (!commentId) return new Response(JSON.stringify({error: "Comment ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {error} = await supabase.from("pickup_trucks_comments").delete().eq("id", commentId);
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({success: true}), {headers: corsHeaders});
            }
            case "fetch-history": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const pickupId = typeof body?.pickupId === "string" ? body.pickupId : null;
                const limit = Number.isInteger(body?.limit) ? body.limit : null;
                if (!pickupId) return new Response(JSON.stringify({error: "Pickup Truck ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                let query = supabase.from("pickup_trucks_history").select("*").eq("truck_id", pickupId).order("changed_at", {ascending: false});
                if (limit && limit > 0) query = query.limit(limit);
                const {data, error} = await query;
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data: data ?? []}), {headers: corsHeaders});
            }
            case "fetch-issues": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const pickupId = typeof body?.pickupId === "string" ? body.pickupId : null;
                if (!pickupId) return new Response(JSON.stringify({error: "Pickup Truck ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {
                    data,
                    error
                } = await supabase.from("pickup_trucks_maintenance").select("*").eq("truck_id", pickupId).order("time_created", {ascending: false});
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data: data ?? []}), {headers: corsHeaders});
            }
            case "add-issue": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const pickupId = typeof body?.pickupId === "string" ? body.pickupId : null;
                const issue = typeof body?.issue === "string" ? body.issue.trim() : "";
                const severity = typeof body?.severity === "string" ? body.severity : "";
                const userId = typeof body?.userId === "string" && body.userId ? body.userId : null;
                if (!pickupId) return new Response(JSON.stringify({error: "Pickup Truck ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (!issue) return new Response(JSON.stringify({error: "Issue description is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (!["Low", "Medium", "High"].includes(severity)) return new Response(JSON.stringify({error: "Severity must be Low, Medium, or High"}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (!userId) return new Response(JSON.stringify({error: "User ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const id = crypto.randomUUID();
                const {data, error} = await supabase.from("pickup_trucks_maintenance").insert({
                    id,
                    truck_id: pickupId,
                    issue,
                    severity,
                    time_created: nowIso(),
                    created_by: userId
                }).select().maybeSingle();
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data}), {headers: corsHeaders});
            }
            case "complete-issue": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const issueId = typeof body?.issueId === "string" ? body.issueId : null;
                if (!issueId) return new Response(JSON.stringify({error: "Issue ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {error} = await supabase.from("pickup_trucks_maintenance").update({time_completed: nowIso()}).eq("id", issueId);
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({success: true}), {headers: corsHeaders});
            }
            case "delete-issue": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const issueId = typeof body?.issueId === "string" ? body.issueId : null;
                if (!issueId) return new Response(JSON.stringify({error: "Issue ID is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {
                    error,
                    count
                } = await supabase.from("pickup_trucks_maintenance").delete({count: "exact"}).eq("id", issueId);
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (!count) return new Response(JSON.stringify({error: "Issue not found or already deleted"}), {
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
