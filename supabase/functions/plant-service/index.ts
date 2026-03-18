// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const PLANTS_TABLE = "plants";
const PROFILES_TABLE = "users_profiles";
const REGION_PLANTS_TABLES = ["region_plants", "regions_plants"] as const;

async function parseBody(req: Request): Promise<any> {
    try { return await req.json(); } catch { return {}; }
}

function trimString(val: unknown): string {
    return typeof val === "string" ? val.trim() : "";
}

function nowISO(): string {
    return new Date().toISOString();
}

const PERMISSIONS_TABLE = "users_permissions";
const ROLES_SELECT = "role_id, users_roles(id, name, permissions, weight)";
const ELEVATED_WEIGHT_THRESHOLD = 75;

async function requireElevatedCaller(supabase: any, headers: any): Promise<string | Response> {
    const {data, error} = await supabase.auth.getUser();
    const user = data?.user;
    if (error || !user?.id) return errorResponse("Unauthorized", headers, 401);
    const {data: perms} = await supabase.from(PERMISSIONS_TABLE).select(ROLES_SELECT).eq("user_id", user.id);
    const roles = perms?.map((item: any) => item.users_roles) ?? [];
    if (!roles.some((role: any) => (role?.weight ?? 0) > ELEVATED_WEIGHT_THRESHOLD)) {
        return errorResponse("Forbidden: insufficient privileges", headers, 403);
    }
    return user.id;
}

async function requireAuthenticated(supabase: any, headers: any): Promise<string | Response> {
    const {data, error} = await supabase.auth.getUser();
    if (error || !data?.user?.id) return errorResponse("Unauthorized", headers, 401);
    return data.user.id;
}

async function fetchRegionIds(supabase: any, plantCode: string): Promise<number[]> {
    for (const table of REGION_PLANTS_TABLES) {
        const {data, error} = await supabase.from(table).select("region_id").eq("plant_code", plantCode);
        if (error) continue;
        const ids = (data ?? []).map((rp: { region_id: number }) => rp.region_id);
        if (ids.length) return ids;
    }
    return [];
}

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const headers = getCorsHeaders(origin);
    try {
        const url = new URL(req.url);
        const endpoint = url.pathname.split("/").pop();
        const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
            global: {headers: {Authorization: req.headers.get("Authorization") || ""}}
        });

        switch (endpoint) {
            case "fetch-all": {
                const auth = await requireAuthenticated(supabase, headers); if (auth instanceof Response) return auth;
                const {data, error} = await supabase.from(PLANTS_TABLE).select("*").order("plant_code");
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? []}, headers);
            }
            case "fetch-by-code": {
                const auth = await requireAuthenticated(supabase, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const plantCode = body?.plantCode;
                if (!plantCode) return errorResponse("Plant code is required", headers, 400);
                const {data, error} = await supabase.from(PLANTS_TABLE).select("*").eq("plant_code", plantCode).maybeSingle();
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({data: data ?? null}, headers);
            }
            case "create": {
                const auth = await requireElevatedCaller(supabase, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const plantCode = trimString(body?.plantCode);
                const plantName = trimString(body?.plantName);
                if (!plantCode || !plantName) return errorResponse("Plant code and name are required", headers, 400);
                const now = nowISO();
                const {error} = await supabase.from(PLANTS_TABLE).insert({plant_code: plantCode, plant_name: plantName, created_at: now, updated_at: now});
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "update": {
                const auth = await requireElevatedCaller(supabase, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const plantCode = trimString(body?.plantCode);
                const plantName = trimString(body?.plantName);
                if (!plantCode || !plantName) return errorResponse("Plant code and name are required", headers, 400);
                const {error} = await supabase.from(PLANTS_TABLE).update({plant_name: plantName, updated_at: nowISO()}).eq("plant_code", plantCode);
                if (error) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({success: true}, headers);
            }
            case "delete": {
                const auth = await requireElevatedCaller(supabase, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const plantCode = body?.plantCode;
                if (!plantCode) return errorResponse("Plant code is required", headers, 400);
                const now = nowISO();
                const [{error: profilesError}, {error}] = await Promise.all([
                    supabase.from(PROFILES_TABLE).update({plant_code: "", updated_at: now}).eq("plant_code", plantCode),
                    supabase.from(PLANTS_TABLE).delete().eq("plant_code", plantCode)
                ]);
                if (profilesError || error) return errorResponse("Operation failed", headers, 400);
                // Remove the deleted plant code from any additional_assigned_plants arrays
                const {data: profilesWithAdditional} = await supabase
                    .from(PROFILES_TABLE)
                    .select("id, additional_assigned_plants")
                    .contains("additional_assigned_plants", [plantCode]);
                if (profilesWithAdditional?.length) {
                    await Promise.all(profilesWithAdditional.map((profile: any) => {
                        const filtered = (profile.additional_assigned_plants ?? []).filter((code: string) => code !== plantCode);
                        return supabase.from(PROFILES_TABLE).update({
                            additional_assigned_plants: filtered.length ? filtered : null,
                            updated_at: now
                        }).eq("id", profile.id);
                    }));
                }
                return jsonResponse({success: true}, headers);
            }
            case "get-with-regions": {
                const auth = await requireAuthenticated(supabase, headers); if (auth instanceof Response) return auth;
                const body = await parseBody(req);
                const plantCode = body?.plantCode;
                if (!plantCode) return errorResponse("Plant code is required", headers, 400);
                const {data: plant, error: plantError} = await supabase.from(PLANTS_TABLE).select("*").eq("plant_code", plantCode).maybeSingle();
                if (plantError) return errorResponse("Operation failed", headers, 400);
                if (!plant) return jsonResponse({plant: null, regions: []}, headers);
                const regionIds = await fetchRegionIds(supabase, plantCode);
                if (!regionIds.length) return jsonResponse({plant, regions: []}, headers);
                const {data: regions, error: regionsError} = await supabase.from("regions").select("*").in("id", regionIds);
                if (regionsError) return errorResponse("Operation failed", headers, 400);
                return jsonResponse({plant, regions: regions ?? []}, headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
