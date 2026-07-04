// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2.45.4' // @ts-ignore
import { errorResponse, getCorsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts'

const ELIGIBLE_ROLES_TABLE = 'district_manager_eligible_roles'
const PLANTS_TABLE = 'district_manager_plants'

async function parseBody(req: Request): Promise<any> {
    try {
        return await req.json()
    } catch {
        return {}
    }
}

function requireString(body: any, key: string): string | null {
    const val = body?.[key]
    return typeof val === 'string' && val.trim() ? val.trim() : null
}

function nowISO(): string {
    return new Date().toISOString()
}

// @ts-ignore
import { requireAuthenticated } from '../_shared/requireSession.ts'

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

Deno.serve(async (req) => {
    const origin = req.headers.get('origin')
    if (req.method === 'OPTIONS') return handleOptions(origin)
    const headers = getCorsHeaders(origin)
    try {
        const url = new URL(req.url)
        const endpoint = url.pathname.split('/').pop()
        const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { autoRefreshToken: false, persistSession: false } })

        switch (endpoint) {
            // --- Eligible Roles ---

            case 'fetch-eligible-roles': {
                const auth = await requireAuthenticated(supabase, req, headers)
                if (auth instanceof Response) return auth
                const { data, error } = await supabase
                    .from(ELIGIBLE_ROLES_TABLE)
                    .select('id, role_id, created_at, users_roles(id, name, weight)')
                    .order('created_at')
                if (error) return errorResponse('Failed to fetch eligible roles', headers, 400)
                return jsonResponse({ data: data ?? [] }, headers)
            }

            case 'add-eligible-role': {
                const auth = await requireElevatedCaller(supabase, req, headers)
                if (auth instanceof Response) return auth
                const body = await parseBody(req)
                const roleId = requireString(body, 'roleId')
                if (!roleId) return errorResponse('Role ID is required', headers, 400)
                const { error } = await supabase.from(ELIGIBLE_ROLES_TABLE).insert({
                    role_id: roleId,
                    created_at: nowISO()
                })
                if (error) {
                    if (error.code === '23505') return errorResponse('Role is already eligible', headers, 409)
                    return errorResponse('Failed to add eligible role', headers, 400)
                }
                return jsonResponse({ success: true }, headers)
            }

            case 'remove-eligible-role': {
                const auth = await requireElevatedCaller(supabase, req, headers)
                if (auth instanceof Response) return auth
                const body = await parseBody(req)
                const roleId = requireString(body, 'roleId')
                if (!roleId) return errorResponse('Role ID is required', headers, 400)
                const { error } = await supabase.from(ELIGIBLE_ROLES_TABLE).delete().eq('role_id', roleId)
                if (error) return errorResponse('Failed to remove eligible role', headers, 400)
                return jsonResponse({ success: true }, headers)
            }

            case 'is-role-eligible': {
                const auth = await requireAuthenticated(supabase, req, headers)
                if (auth instanceof Response) return auth
                const body = await parseBody(req)
                const roleId = requireString(body, 'roleId')
                if (!roleId) return jsonResponse({ eligible: false }, headers)
                const { data, error } = await supabase
                    .from(ELIGIBLE_ROLES_TABLE)
                    .select('id')
                    .eq('role_id', roleId)
                    .maybeSingle()
                if (error) return errorResponse('Failed to check eligibility', headers, 400)
                return jsonResponse({ eligible: !!data }, headers)
            }

            // --- User Plant Assignments ---

            case 'fetch-user-plants': {
                const auth = await requireAuthenticated(supabase, req, headers)
                if (auth instanceof Response) return auth
                const body = await parseBody(req)
                const userId = requireString(body, 'userId')
                if (!userId) return errorResponse('User ID is required', headers, 400)
                const { data, error } = await supabase
                    .from(PLANTS_TABLE)
                    .select('id, user_id, plant_code, created_at')
                    .eq('user_id', userId)
                    .order('plant_code')
                if (error) return errorResponse('Failed to fetch user plants', headers, 400)
                return jsonResponse({ data: data ?? [] }, headers)
            }

            case 'update-user-plants': {
                const auth = await requireElevatedCaller(supabase, req, headers)
                if (auth instanceof Response) return auth
                const body = await parseBody(req)
                const userId = requireString(body, 'userId')
                if (!userId) return errorResponse('User ID is required', headers, 400)
                const plantCodes = body?.plantCodes
                if (!Array.isArray(plantCodes)) return errorResponse('Plant codes array is required', headers, 400)

                // Delete existing assignments
                const { error: deleteError } = await supabase.from(PLANTS_TABLE).delete().eq('user_id', userId)
                if (deleteError) return errorResponse('Failed to clear existing assignments', headers, 400)

                // Insert new assignments
                const validCodes = plantCodes.filter((v: any) => typeof v === 'string' && v.trim())
                if (validCodes.length) {
                    const now = nowISO()
                    const rows = validCodes.map((code: string) => ({
                        user_id: userId,
                        plant_code: code.trim(),
                        created_at: now
                    }))
                    const { error: insertError } = await supabase.from(PLANTS_TABLE).insert(rows)
                    if (insertError) return errorResponse('Failed to assign plants', headers, 400)
                }

                return jsonResponse({ success: true }, headers)
            }

            case 'fetch-plants-by-plant-code': {
                const auth = await requireAuthenticated(supabase, req, headers)
                if (auth instanceof Response) return auth
                const body = await parseBody(req)
                const plantCode = requireString(body, 'plantCode')
                if (!plantCode) return errorResponse('Plant code is required', headers, 400)
                const { data, error } = await supabase
                    .from(PLANTS_TABLE)
                    .select('id, user_id, plant_code, created_at')
                    .eq('plant_code', plantCode)
                if (error) return errorResponse('Failed to fetch by plant code', headers, 400)
                return jsonResponse({ data: data ?? [] }, headers)
            }

            default:
                return errorResponse('Invalid endpoint', headers, 404, { path: url.pathname })
        }
    } catch {
        return errorResponse('Internal server error', headers, 500)
    }
})
