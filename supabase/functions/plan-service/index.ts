// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";

function getCorsHeaders(origin: string | null): Record<string, string> {
    const allowedOrigins = ["http://localhost:3000", "https://smyrnatools.com", "https://www.smyrnatools.com", "https://db.smyrnatools.com"];
    const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[1];

    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
        "Connection": "keep-alive"
    };
}

function handleOptions(origin: string | null) {
    return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin)
    });
}

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") {
        return handleOptions(origin);
    }
    const corsHeaders = getCorsHeaders(origin);
    try {
        const url = new URL(req.url);
        const endpoint = url.pathname.split("/").pop();
        const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
            global: {
                headers: {
                    Authorization: req.headers.get("Authorization") || ""
                }
            }
        });
        switch (endpoint) {
            case "fetch-travel-times": {
                const {data, error} = await supabase.from("plant_travel_times").select("*").order("from_plant_code");
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data: data ?? []}), {headers: corsHeaders});
            }
            case "upsert-travel-time": {
                let body;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const {fromPlantCode, toPlantCode, travelMinutes} = body || {};
                if (!fromPlantCode || !toPlantCode || typeof travelMinutes !== "number") {
                    return new Response(JSON.stringify({error: "fromPlantCode, toPlantCode, and travelMinutes are required"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const now = new Date().toISOString();
                const {error} = await supabase.from("plant_travel_times").upsert({
                    from_plant_code: fromPlantCode,
                    to_plant_code: toPlantCode,
                    travel_minutes: travelMinutes,
                    updated_at: now
                }, {
                    onConflict: "from_plant_code,to_plant_code"
                });
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({success: true}), {headers: corsHeaders});
            }
            case "delete-travel-time": {
                let body;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const {fromPlantCode, toPlantCode} = body || {};
                if (!fromPlantCode || !toPlantCode) {
                    return new Response(JSON.stringify({error: "fromPlantCode and toPlantCode are required"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const {error} = await supabase.from("plant_travel_times")
                    .delete()
                    .eq("from_plant_code", fromPlantCode)
                    .eq("to_plant_code", toPlantCode);
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({success: true}), {headers: corsHeaders});
            }
            case "fetch-user-plan": {
                let body;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const {userId, planDate} = body || {};
                if (!userId || !planDate) {
                    return new Response(JSON.stringify({error: "userId and planDate are required"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const {data, error} = await supabase
                    .from("users_plans")
                    .select("*")
                    .eq("user_id", userId)
                    .eq("plan_date", planDate)
                    .single();
                if (error && error.code !== "PGRST116") {
                    return new Response(JSON.stringify({error: error.message}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                return new Response(JSON.stringify({data: data ?? null}), {headers: corsHeaders});
            }
            case "save-user-plan": {
                let body;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const {userId, planDate, assignments, notes} = body || {};
                if (!userId || !planDate) {
                    return new Response(JSON.stringify({error: "userId and planDate are required"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const now = new Date().toISOString();
                const {error} = await supabase.from("users_plans").upsert({
                    user_id: userId,
                    plan_date: planDate,
                    assignments: assignments || [],
                    notes: notes || "",
                    updated_at: now
                }, {
                    onConflict: "user_id,plan_date"
                });
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({success: true}), {headers: corsHeaders});
            }
            default:
                return new Response(JSON.stringify({error: "Unknown endpoint"}), {
                    status: 404,
                    headers: corsHeaders
                });
        }
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Internal server error";
        return new Response(JSON.stringify({error: msg}), {
            status: 500,
            headers: corsHeaders
        });
    }
});
