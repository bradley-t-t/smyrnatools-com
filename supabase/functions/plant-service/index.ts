// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2.45.4' // @ts-ignore
import { errorResponse, getCorsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts'
// @ts-ignore
import { requireAuthenticated } from '../_shared/requireSession.ts'

const PLANTS_TABLE = 'plants'
const PROFILES_TABLE = 'users_profiles'
const REGION_PLANTS_TABLES = ['region_plants', 'regions_plants'] as const

async function parseBody(req: Request): Promise<any> {
    try {
        return await req.json()
    } catch {
        return {}
    }
}

function trimString(val: unknown): string {
    return typeof val === 'string' ? val.trim() : ''
}

/** Sentinel returned by `parseCoordinate` when the caller's payload can't
 *  be reduced to a finite number in the requested range. Callers compare
 *  identity (`=== COORDINATE_INVALID`) so they can tell the rejection
 *  case apart from a legitimate clear-to-null. */
const COORDINATE_INVALID = Symbol('invalid coordinate')

/** Parses a latitude / longitude value off the request body:
 *   - `null`, `''`, or absent → `null` (clears the column)
 *   - finite number in `[min, max]` → that number
 *   - anything else → `COORDINATE_INVALID` (caller responds 400) */
function parseCoordinate(value: unknown, min: number, max: number): number | null | typeof COORDINATE_INVALID {
    if (value === null) return null
    if (typeof value === 'string' && value.trim() === '') return null
    const num = typeof value === 'number' ? value : parseFloat(String(value))
    if (!Number.isFinite(num)) return COORDINATE_INVALID
    if (num < min || num > max) return COORDINATE_INVALID
    return num
}

function nowISO(): string {
    return new Date().toISOString()
}

function getAdminClient(): any {
    return createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
}

const ELEVATED_WEIGHT_THRESHOLD = 75

async function requireElevatedCaller(supabase: any, req: Request, headers: any): Promise<Response | null> {
    const auth = await requireAuthenticated(supabase, req, headers)
    if (auth instanceof Response) return auth
    const admin = getAdminClient()
    const { data } = await admin.from('users_permissions').select('role_id, users_roles(weight)').eq('user_id', auth)
    const isElevated = data?.some((p: any) => (p.users_roles?.weight ?? 0) > ELEVATED_WEIGHT_THRESHOLD)
    if (!isElevated) return errorResponse('Forbidden: insufficient privileges', headers, 403)
    return null
}

async function fetchRegionIds(supabase: any, plantCode: string): Promise<number[]> {
    for (const table of REGION_PLANTS_TABLES) {
        const { data, error } = await supabase.from(table).select('region_id').eq('plant_code', plantCode)
        if (error) continue
        const ids = (data ?? []).map((rp: { region_id: number }) => rp.region_id)
        if (ids.length) return ids
    }
    return []
}

Deno.serve(async (req) => {
    const origin = req.headers.get('origin')
    if (req.method === 'OPTIONS') return handleOptions(origin)
    const headers = getCorsHeaders(origin)
    try {
        const url = new URL(req.url)
        const endpoint = url.pathname.split('/').pop()
        const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { autoRefreshToken: false, persistSession: false } })

        switch (endpoint) {
            case 'fetch-all': {
                const auth = await requireAuthenticated(supabase, req, headers)
                if (auth instanceof Response) return auth
                const { data, error } = await supabase.from(PLANTS_TABLE).select('*').order('plant_code')
                if (error) return errorResponse('Operation failed', headers, 400)
                return jsonResponse({ data: data ?? [] }, headers)
            }
            case 'fetch-by-code': {
                const auth = await requireAuthenticated(supabase, req, headers)
                if (auth instanceof Response) return auth
                const body = await parseBody(req)
                const plantCode = body?.plantCode
                if (!plantCode) return errorResponse('Plant code is required', headers, 400)
                const { data, error } = await supabase
                    .from(PLANTS_TABLE)
                    .select('*')
                    .eq('plant_code', plantCode)
                    .maybeSingle()
                if (error) return errorResponse('Operation failed', headers, 400)
                return jsonResponse({ data: data ?? null }, headers)
            }
            case 'create': {
                const auth = await requireElevatedCaller(supabase, req, headers)
                if (auth instanceof Response) return auth
                const body = await parseBody(req)
                const plantCode = trimString(body?.plantCode)
                const plantName = trimString(body?.plantName)
                const plantAddress = body?.plantAddress != null ? trimString(body.plantAddress) || null : null
                if (!plantCode || !plantName) return errorResponse('Plant code and name are required', headers, 400)
                const now = nowISO()
                const { error } = await supabase.from(PLANTS_TABLE).insert({
                    plant_code: plantCode,
                    plant_name: plantName,
                    plant_address: plantAddress,
                    created_at: now,
                    updated_at: now
                })
                if (error) return errorResponse('Operation failed', headers, 400)
                return jsonResponse({ success: true }, headers)
            }
            case 'update': {
                const auth = await requireElevatedCaller(supabase, req, headers)
                if (auth instanceof Response) return auth
                const body = await parseBody(req)
                const plantCode = trimString(body?.plantCode)
                const plantName = trimString(body?.plantName)
                if (!plantCode || !plantName) return errorResponse('Plant code and name are required', headers, 400)
                const updateFields: Record<string, unknown> = { plant_name: plantName, updated_at: nowISO() }
                if (body?.plantAddress !== undefined) {
                    const address = trimString(body.plantAddress)
                    updateFields.plant_address = address.length > 0 ? address : null
                }
                // Lat / lng are independent of address — accept them whenever
                // the caller passes them. Empty string / null clears the
                // column; any other value must parse to a finite number in
                // the legal range (or we reject the whole request rather
                // than silently dropping the value).
                if (body?.latitude !== undefined) {
                    const lat = parseCoordinate(body.latitude, -90, 90)
                    if (lat === COORDINATE_INVALID) return errorResponse('Latitude must be between -90 and 90', headers, 400)
                    updateFields.latitude = lat
                }
                if (body?.longitude !== undefined) {
                    const lng = parseCoordinate(body.longitude, -180, 180)
                    if (lng === COORDINATE_INVALID) return errorResponse('Longitude must be between -180 and 180', headers, 400)
                    updateFields.longitude = lng
                }
                const { error } = await supabase.from(PLANTS_TABLE).update(updateFields).eq('plant_code', plantCode)
                if (error) return errorResponse('Operation failed', headers, 400)
                return jsonResponse({ success: true }, headers)
            }
            case 'update-address': {
                const auth = await requireElevatedCaller(supabase, req, headers)
                if (auth instanceof Response) return auth
                const body = await parseBody(req)
                const plantCode = trimString(body?.plantCode)
                if (!plantCode) return errorResponse('Plant code is required', headers, 400)
                const address = body?.plantAddress != null ? trimString(body.plantAddress) : ''
                const { error } = await supabase
                    .from(PLANTS_TABLE)
                    .update({ plant_address: address.length > 0 ? address : null, updated_at: nowISO() })
                    .eq('plant_code', plantCode)
                if (error) return errorResponse('Operation failed', headers, 400)
                return jsonResponse({ success: true }, headers)
            }
            case 'update-managers': {
                // Replaces the plant's `manager_user_ids` array wholesale.
                // Caller supplies the full desired list. We trim + dedupe
                // but leave authoritative uuid-shape validation to Postgres
                // (the column is `uuid[]`, so invalid ids surface as a
                // real database error instead of being silently dropped —
                // the previous regex filter was eating valid ids in edge
                // cases). Elevated permission required.
                const auth = await requireElevatedCaller(supabase, req, headers)
                if (auth instanceof Response) return auth
                const body = await parseBody(req)
                const plantCode = trimString(body?.plantCode)
                if (!plantCode) return errorResponse('Plant code is required', headers, 400)
                const raw = Array.isArray(body?.managerUserIds) ? body.managerUserIds : []
                const cleaned = Array.from(
                    new Set(raw.map((id: unknown) => trimString(id)).filter((id: string) => id.length > 0))
                )
                const { error } = await supabase
                    .from(PLANTS_TABLE)
                    .update({ manager_user_ids: cleaned, updated_at: nowISO() })
                    .eq('plant_code', plantCode)
                // Surface the Postgres / PostgREST error verbatim so callers
                // can tell apart "column doesn't exist" (migration unrun)
                // from "permission denied" (RLS) from "invalid uuid" (bad
                // payload). Without this, the modal just shows "Operation
                // failed" and we can't debug it from the frontend.
                if (error) {
                    return errorResponse(error.message || 'Operation failed', headers, 400, {
                        code: (error as { code?: string }).code ?? null,
                        details: (error as { details?: string }).details ?? null,
                        hint: (error as { hint?: string }).hint ?? null
                    })
                }
                return jsonResponse({ managerUserIds: cleaned, success: true }, headers)
            }
            case 'update-colocation': {
                /* Replaces the co-location group for `plantCode`. The
                 * caller passes a SINGLE `siblingPlantCodes` list — the
                 * full set of codes this plant should be co-located
                 * with. This endpoint splits the list into:
                 *
                 *   • REAL siblings — codes that exist as plant rows.
                 *     These get a shared `location_group_id` so the
                 *     grouping is symmetric.
                 *   • PHANTOM aliases — codes that DON'T exist in
                 *     `plants` (e.g. dispatch's "404"/"409" that the
                 *     dispatcher tracks via tickets but never created
                 *     standalone rows for). These get stored on THIS
                 *     plant's `colocated_alias_codes` column.
                 *
                 * Both write paths happen atomically per side; an empty
                 * `siblingPlantCodes` clears both. */
                const auth = await requireElevatedCaller(supabase, req, headers)
                if (auth instanceof Response) return auth
                const body = await parseBody(req)
                const plantCode = trimString(body?.plantCode)
                if (!plantCode) return errorResponse('Plant code is required', headers, 400)
                const rawSiblings = Array.isArray(body?.siblingPlantCodes) ? body.siblingPlantCodes : []
                const siblings = Array.from(
                    new Set(
                        rawSiblings
                            .map((c: unknown) => trimString(c))
                            .filter((c: string) => c.length > 0 && c !== plantCode)
                    )
                )

                /* Look up which siblings actually exist as plant rows.
                 * Anything that doesn't gets treated as a phantom alias
                 * code instead of a hard error. The target plant itself
                 * must exist (it's the row we're editing). */
                const targetLookup = await supabase
                    .from(PLANTS_TABLE)
                    .select('plant_code, location_group_id')
                    .eq('plant_code', plantCode)
                    .maybeSingle()
                if (targetLookup.error) {
                    return errorResponse(targetLookup.error.message || 'Lookup failed', headers, 400)
                }
                if (!targetLookup.data) {
                    return errorResponse(`Unknown plant code: ${plantCode}`, headers, 400)
                }
                const oldGroupId: string | null = targetLookup.data.location_group_id ?? null

                let realSiblings: string[] = []
                let aliasCodes: string[] = siblings
                if (siblings.length > 0) {
                    const { data: existingRows, error: existingErr } = await supabase
                        .from(PLANTS_TABLE)
                        .select('plant_code, location_group_id')
                        .in('plant_code', siblings)
                    if (existingErr) {
                        return errorResponse(existingErr.message || 'Lookup failed', headers, 400)
                    }
                    const existingSet = new Set((existingRows ?? []).map((r: any) => r.plant_code))
                    realSiblings = siblings.filter((c: string) => existingSet.has(c))
                    aliasCodes = siblings.filter((c: string) => !existingSet.has(c))

                    /* Real-sibling side: pick a group id and apply it. */
                    if (realSiblings.length > 0) {
                        let newGroupId: string | null = oldGroupId
                        if (!newGroupId) {
                            const siblingWithGroup = (existingRows ?? []).find(
                                (r: any) => realSiblings.includes(r.plant_code) && r.location_group_id
                            )
                            newGroupId = siblingWithGroup?.location_group_id ?? crypto.randomUUID()
                        }
                        const targetSet = new Set([plantCode, ...realSiblings])
                        const { error: setErr } = await supabase
                            .from(PLANTS_TABLE)
                            .update({ location_group_id: newGroupId, updated_at: nowISO() })
                            .in('plant_code', Array.from(targetSet))
                        if (setErr) return errorResponse(setErr.message || 'Update failed', headers, 400)
                    } else {
                        /* No real siblings — clear the target's
                         * location_group_id so it's not pointing at a
                         * stale group. Aliases still attach below. */
                        const { error: clearErr } = await supabase
                            .from(PLANTS_TABLE)
                            .update({ location_group_id: null, updated_at: nowISO() })
                            .eq('plant_code', plantCode)
                        if (clearErr) return errorResponse(clearErr.message || 'Update failed', headers, 400)
                    }
                } else {
                    /* Empty selection — clear both halves for this plant. */
                    const { error: clearErr } = await supabase
                        .from(PLANTS_TABLE)
                        .update({ location_group_id: null, updated_at: nowISO() })
                        .eq('plant_code', plantCode)
                    if (clearErr) return errorResponse(clearErr.message || 'Update failed', headers, 400)
                }

                /* Phantom-alias side — always written for the target
                 * plant. Empty array clears any previously-saved
                 * aliases. */
                const { error: aliasErr } = await supabase
                    .from(PLANTS_TABLE)
                    .update({ colocated_alias_codes: aliasCodes, updated_at: nowISO() })
                    .eq('plant_code', plantCode)
                if (aliasErr) return errorResponse(aliasErr.message || 'Update failed', headers, 400)

                /* Orphan-cleanup pass for the OLD real-plant group:
                 * if it's now down to <2 members it's no longer a real
                 * group — clear it. */
                if (oldGroupId) {
                    const { data: oldGroupMembers } = await supabase
                        .from(PLANTS_TABLE)
                        .select('plant_code')
                        .eq('location_group_id', oldGroupId)
                    if ((oldGroupMembers?.length ?? 0) < 2) {
                        await supabase
                            .from(PLANTS_TABLE)
                            .update({ location_group_id: null, updated_at: nowISO() })
                            .eq('location_group_id', oldGroupId)
                    }
                }
                return jsonResponse({ realSiblings, aliasCodes, success: true }, headers)
            }
            case 'delete': {
                const auth = await requireElevatedCaller(supabase, req, headers)
                if (auth instanceof Response) return auth
                const body = await parseBody(req)
                const plantCode = body?.plantCode
                if (!plantCode) return errorResponse('Plant code is required', headers, 400)
                const now = nowISO()
                const [{ error: profilesError }, { error }] = await Promise.all([
                    supabase
                        .from(PROFILES_TABLE)
                        .update({ plant_code: '', updated_at: now })
                        .eq('plant_code', plantCode),
                    supabase.from(PLANTS_TABLE).delete().eq('plant_code', plantCode)
                ])
                if (profilesError || error) return errorResponse('Operation failed', headers, 400)
                // Remove the deleted plant code from any additional_assigned_plants arrays
                const { data: profilesWithAdditional } = await supabase
                    .from(PROFILES_TABLE)
                    .select('id, additional_assigned_plants')
                    .contains('additional_assigned_plants', [plantCode])
                if (profilesWithAdditional?.length) {
                    await Promise.all(
                        profilesWithAdditional.map((profile: any) => {
                            const filtered = (profile.additional_assigned_plants ?? []).filter(
                                (code: string) => code !== plantCode
                            )
                            return supabase
                                .from(PROFILES_TABLE)
                                .update({
                                    additional_assigned_plants: filtered.length ? filtered : null,
                                    updated_at: now
                                })
                                .eq('id', profile.id)
                        })
                    )
                }
                return jsonResponse({ success: true }, headers)
            }
            case 'get-with-regions': {
                const auth = await requireAuthenticated(supabase, req, headers)
                if (auth instanceof Response) return auth
                const body = await parseBody(req)
                const plantCode = body?.plantCode
                if (!plantCode) return errorResponse('Plant code is required', headers, 400)
                const { data: plant, error: plantError } = await supabase
                    .from(PLANTS_TABLE)
                    .select('*')
                    .eq('plant_code', plantCode)
                    .maybeSingle()
                if (plantError) return errorResponse('Operation failed', headers, 400)
                if (!plant) return jsonResponse({ plant: null, regions: [] }, headers)
                const regionIds = await fetchRegionIds(supabase, plantCode)
                if (!regionIds.length) return jsonResponse({ plant, regions: [] }, headers)
                const { data: regions, error: regionsError } = await supabase
                    .from('regions')
                    .select('*')
                    .in('id', regionIds)
                if (regionsError) return errorResponse('Operation failed', headers, 400)
                return jsonResponse({ plant, regions: regions ?? [] }, headers)
            }
            default:
                return errorResponse('Invalid endpoint', headers, 404, { path: url.pathname })
        }
    } catch (error) {
        return errorResponse('Internal server error', headers, 500)
    }
})
