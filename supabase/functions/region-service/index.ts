// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const REGIONS_TABLE = "regions";
const REGIONS_PLANTS_TABLE = "regions_plants";
const ALLOWED_TYPES = new Set(["Concrete", "Aggregate", "Office"]);

async function parseBody(req: Request): Promise<any> {
    try { return await req.json(); } catch { return {}; }
}

function requireString(body: any, key: string): string | null {
    const val = body?.[key];
    return typeof val === "string" && val.trim() ? val.trim() : null;
}

function nowISO(): string {
    return new Date().toISOString();
}

async function fetchRegionId(supabase: any, regionCode: string, headers: Record<string, string>): Promise<{ id: string } | Response> {
    const {data, error} = await supabase.from(REGIONS_TABLE).select("id").eq("region_code", regionCode).maybeSingle();
    if (error || !data) return errorResponse("Region not found", headers, 400);
    return {id: data.id as string};
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
            case "fetch-regions": {
                const {data, error} = await supabase.from(REGIONS_TABLE).select("*").order("region_code");
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "fetch-region-by-code": {
                const body = await parseBody(req);
                const regionCode = requireString(body, "regionCode");
                if (!regionCode) return errorResponse("Region code is required", headers, 400);
                const {data, error} = await supabase.from(REGIONS_TABLE).select("*").eq("region_code", regionCode).maybeSingle();
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? null}, headers);
            }
            case "create": {
                const body = await parseBody(req);
                const regionCode = requireString(body, "regionCode");
                const regionName = requireString(body, "regionName");
                const type = body?.type;
                if (!regionCode || !regionName) return errorResponse("Region code and name are required", headers, 400);
                if (typeof type !== "string" || !ALLOWED_TYPES.has(type)) return errorResponse("Region type must be one of Concrete, Aggregate, Office", headers, 400);
                const now = nowISO();
                const {error} = await supabase.from(REGIONS_TABLE).insert({region_code: regionCode, region_name: regionName, type, created_at: now, updated_at: now});
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "update": {
                const body = await parseBody(req);
                const regionCode = requireString(body, "regionCode");
                const regionName = requireString(body, "regionName");
                if (!regionCode || !regionName) return errorResponse("Region code and name are required", headers, 400);
                const result = await fetchRegionId(supabase, regionCode, headers);
                if (result instanceof Response) return result;
                const regionId = result.id;
                const updatePayload: Record<string, any> = {region_name: regionName, updated_at: nowISO()};
                if (typeof body?.type === "string") {
                    if (!ALLOWED_TYPES.has(body.type)) return errorResponse("Region type must be one of Concrete, Aggregate, Office", headers, 400);
                    updatePayload.type = body.type;
                }
                const {error: updateError} = await supabase.from(REGIONS_TABLE).update(updatePayload).eq("region_code", regionCode);
                if (updateError) return errorResponse("Operation failed", headers, 400);
                const {error: deleteError} = await supabase.from(REGIONS_PLANTS_TABLE).delete().eq("region_id", regionId);
                if (deleteError) return errorResponse("Operation failed", headers, 400);
                const plantCodes = body?.plantCodes;
                if (Array.isArray(plantCodes) && plantCodes.length) {
                    const now = nowISO();
                    const rows = plantCodes.filter((v: any) => typeof v === "string" && v.trim()).map((v: string) => ({region_id: regionId, plant_code: v.trim(), created_at: now}));
                    if (rows.length) {
                        const {error: insertError} = await supabase.from(REGIONS_PLANTS_TABLE).insert(rows);
                        if (insertError) return errorResponse("Operation failed", headers, 400);
                    }
                }
                return jsonResponse({success: true}, headers);
            }
            case "delete": {
                const body = await parseBody(req);
                const regionCode = requireString(body, "regionCode");
                if (!regionCode) return errorResponse("Region code is required", headers, 400);
                const result = await fetchRegionId(supabase, regionCode, headers);
                if (result instanceof Response) return result;
                const {error: plantsErr} = await supabase.from(REGIONS_PLANTS_TABLE).delete().eq("region_id", result.id);
                if (plantsErr) return errorResponse("Operation failed", headers, 400);
                const {error} = await supabase.from(REGIONS_TABLE).delete().eq("region_code", regionCode);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "fetch-region-plants": {
                const body = await parseBody(req);
                const regionCode = requireString(body, "regionCode");
                if (!regionCode) return errorResponse("Region code is required", headers, 400);
                const result = await fetchRegionId(supabase, regionCode, headers);
                if (result instanceof Response) return result;
                const {data: rp, error: rpErr} = await supabase.from(REGIONS_PLANTS_TABLE).select("plant_code").eq("region_id", result.id);
                if (rpErr) return errorResponse("Operation failed", headers, 400);
                if (!rp?.length) return jsonResponse({data: []}, headers);
                const codes = rp.map((r: any) => r.plant_code);
                const {data: plants, error: plantsErr} = await supabase.from("plants").select("plant_code, plant_name").in("plant_code", codes);
                if (plantsErr) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: (plants ?? []).map((p: any) => ({plant_code: p.plant_code, plant_name: p.plant_name}))}, headers);
            }
            case "fetch-regions-by-plant-code": {
                const body = await parseBody(req);
                const plantCode = requireString(body, "plantCode");
                if (!plantCode) return errorResponse("Plant code is required", headers, 400);
                const tables = [REGIONS_PLANTS_TABLE, "region_plants"] as const;
                let rows: any[] = [];
                for (const table of tables) {
                    const {data, error} = await supabase.from(table).select("plant_code, regions!inner(region_code, region_name, type)").eq("plant_code", plantCode);
                    if (error) return errorResponse("Operation failed", headers, 400);
                    rows = data ?? [];
                    if (rows.length) break;
                }
                return jsonResponse({data: rows.map((r: any) => ({region_code: r.regions?.region_code ?? null, region_name: r.regions?.region_name ?? null, type: r.regions?.type ?? null}))}, headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
