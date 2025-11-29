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
    return new Response(null, {status: 204, headers: getCorsHeaders(origin)});
}

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
            case "fetch-regions": {
                const {data, error} = await supabase
                    .from("regions")
                    .select("*")
                    .order("region_code");
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({data: data ?? []}), {headers: corsHeaders});
            }
            case "fetch-region-by-code": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const {regionCode} = body || {};
                if (typeof regionCode !== "string" || !regionCode) return new Response(JSON.stringify({error: "Region code is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {data, error} = await supabase
                    .from("regions")
                    .select("*")
                    .eq("region_code", regionCode)
                    .maybeSingle();
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
                const {regionCode, regionName, type} = body || {};
                if (typeof regionCode !== "string" || !regionCode.trim() || typeof regionName !== "string" || !regionName.trim()) return new Response(JSON.stringify({error: "Region code and name are required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const allowed = new Set(["Concrete", "Aggregate", "Office"]);
                if (typeof type !== "string" || !allowed.has(type)) return new Response(JSON.stringify({error: "Region type must be one of Concrete, Aggregate, Office"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const now = new Date().toISOString();
                const {error} = await supabase
                    .from("regions")
                    .insert({
                        region_code: regionCode.trim(),
                        region_name: regionName.trim(),
                        type,
                        created_at: now,
                        updated_at: now
                    });
                if (error) return new Response(JSON.stringify({error: error.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({success: true}), {headers: corsHeaders});
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
                const {regionCode, regionName, plantCodes, type} = body || {};
                if (typeof regionCode !== "string" || !regionCode.trim() || typeof regionName !== "string" || !regionName.trim()) return new Response(JSON.stringify({error: "Region code and name are required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {data: regionData, error: regionError} = await supabase
                    .from("regions")
                    .select("id")
                    .eq("region_code", regionCode)
                    .maybeSingle();
                if (regionError || !regionData) return new Response(JSON.stringify({error: regionError?.message || "Region not found"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const regionId = regionData.id as string;
                const updatePayload: Record<string, any> = {
                    region_name: regionName.trim(),
                    updated_at: new Date().toISOString()
                };
                const allowed = new Set(["Concrete", "Aggregate", "Office"]);
                if (typeof type === "string") {
                    if (!allowed.has(type)) return new Response(JSON.stringify({error: "Region type must be one of Concrete, Aggregate, Office"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                    updatePayload.type = type;
                }
                const {error: updateError} = await supabase
                    .from("regions")
                    .update(updatePayload)
                    .eq("region_code", regionCode);
                if (updateError) return new Response(JSON.stringify({error: updateError.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {error: deleteError} = await supabase
                    .from("regions_plants")
                    .delete()
                    .eq("region_id", regionId);
                if (deleteError) return new Response(JSON.stringify({error: deleteError.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                if (Array.isArray(plantCodes) && plantCodes.length > 0) {
                    const now = new Date().toISOString();
                    const rows = (plantCodes as any[]).filter(v => typeof v === "string" && v.trim()).map(v => ({
                        region_id: regionId,
                        plant_code: (v as string).trim(),
                        created_at: now
                    }));
                    if (rows.length > 0) {
                        const {error: insertError} = await supabase.from("regions_plants").insert(rows);
                        if (insertError) return new Response(JSON.stringify({error: insertError.message}), {
                            status: 400,
                            headers: corsHeaders
                        });
                    }
                }
                return new Response(JSON.stringify({success: true}), {headers: corsHeaders});
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
                const {regionCode} = body || {};
                if (typeof regionCode !== "string" || !regionCode) return new Response(JSON.stringify({error: "Region code is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {data: regionData, error: regionError} = await supabase
                    .from("regions")
                    .select("id")
                    .eq("region_code", regionCode)
                    .maybeSingle();
                if (regionError || !regionData) return new Response(JSON.stringify({error: regionError?.message || "Region not found"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const regionId = regionData.id as string;
                const {error: deletePlantsError} = await supabase
                    .from("regions_plants")
                    .delete()
                    .eq("region_id", regionId);
                if (deletePlantsError) return new Response(JSON.stringify({error: deletePlantsError.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {error: deleteRegionError} = await supabase
                    .from("regions")
                    .delete()
                    .eq("region_code", regionCode);
                if (deleteRegionError) return new Response(JSON.stringify({error: deleteRegionError.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                return new Response(JSON.stringify({success: true}), {headers: corsHeaders});
            }
            case "fetch-region-plants": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const {regionCode} = body || {};
                if (typeof regionCode !== "string" || !regionCode) return new Response(JSON.stringify({error: "Region code is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const {data: regionData, error: regionError} = await supabase
                    .from("regions")
                    .select("id")
                    .eq("region_code", regionCode)
                    .maybeSingle();
                if (regionError || !regionData) return new Response(JSON.stringify({error: regionError?.message || "Region not found"}), {
                    status: 400,
                    headers: corsHeaders
                });
                const regionId = regionData.id as string;
                const {data: regionPlantsData, error: regionPlantsError} = await supabase
                    .from("regions_plants")
                    .select("plant_code")
                    .eq("region_id", regionId);
                if (regionPlantsError) return new Response(JSON.stringify({error: regionPlantsError.message}), {
                    status: 400,
                    headers: corsHeaders
                });

                if (!regionPlantsData || regionPlantsData.length === 0) {
                    return new Response(JSON.stringify({data: []}), {headers: corsHeaders});
                }

                const plantCodes = regionPlantsData.map((rp: any) => rp.plant_code);
                const {data: plantsData, error: plantsError} = await supabase
                    .from("plants")
                    .select("plant_code, plant_name")
                    .in("plant_code", plantCodes);
                if (plantsError) return new Response(JSON.stringify({error: plantsError.message}), {
                    status: 400,
                    headers: corsHeaders
                });

                const out = (plantsData ?? []).map((plant: any) => ({
                    plant_code: plant.plant_code,
                    plant_name: plant.plant_name
                }));
                return new Response(JSON.stringify({data: out}), {headers: corsHeaders});
            }
            case "fetch-regions-by-plant-code": {
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({error: "Invalid JSON in request body"}), {
                        status: 400,
                        headers: corsHeaders
                    });
                }
                const {plantCode} = body || {};
                if (typeof plantCode !== "string" || !plantCode) return new Response(JSON.stringify({error: "Plant code is required"}), {
                    status: 400,
                    headers: corsHeaders
                });
                let rows: any[] = [];
                const {data: dataPlural, error: errorPlural} = await supabase
                    .from("regions_plants")
                    .select("plant_code, regions!inner(region_code, region_name, type)")
                    .eq("plant_code", plantCode);
                if (errorPlural) return new Response(JSON.stringify({error: errorPlural.message}), {
                    status: 400,
                    headers: corsHeaders
                });
                rows = dataPlural ?? [];
                if (!rows.length) {
                    const {data: dataSing, error: errorSing} = await supabase
                        .from("region_plants")
                        .select("plant_code, regions!inner(region_code, region_name, type)")
                        .eq("plant_code", plantCode);
                    if (errorSing) return new Response(JSON.stringify({error: errorSing.message}), {
                        status: 400,
                        headers: corsHeaders
                    });
                    rows = dataSing ?? [];
                }
                const out = (rows ?? []).map((row: any) => ({
                    region_code: row.regions?.region_code ?? null,
                    region_name: row.regions?.region_name ?? null,
                    type: row.regions?.type ?? null
                }));
                return new Response(JSON.stringify({data: out}), {headers: corsHeaders});
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
