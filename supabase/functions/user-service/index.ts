// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2.45.4' // @ts-ignore
import { errorResponse, getCorsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts'
// @ts-ignore
import { requireAuthenticated } from '../_shared/requireSession.ts'

const USERS_TABLE = 'users'
const PROFILES_TABLE = 'users_profiles'
const ROLES_TABLE = 'users_roles'
const PERMISSIONS_TABLE = 'users_permissions'
const ELEVATED_WEIGHT_THRESHOLD = 75
const ROLES_SELECT = 'role_id, users_roles(id, name, permissions, weight)'
const UNIVERSAL_PERMISSION = 'my_account.view'

function resolveUserId(userId: unknown): string {
    return typeof userId === 'object' && (userId as any)?.id ? (userId as any).id : (userId as string)
}

function nowISO(): string {
    return new Date().toISOString()
}

async function fetchUserRoles(_supabase: any, userId: string): Promise<any[]> {
    const admin = getAdminClient()
    const { data } = await admin.from(PERMISSIONS_TABLE).select(ROLES_SELECT).eq('user_id', userId)
    return data?.map((item: any) => item.users_roles) ?? []
}

function collectPermissions(roles: any[]): Set<string> {
    const permissions = new Set<string>()
    for (const role of roles) {
        role?.permissions?.forEach((perm: string) => permissions.add(perm))
    }
    return permissions
}

function isElevatedUser(roles: any[]): boolean {
    return roles.some((role) => (role?.weight ?? 0) > ELEVATED_WEIGHT_THRESHOLD)
}

function formatEmailAsDisplayName(email: string): string {
    return email
        .split('@')[0]
        .replace(/\./g, ' ')
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function fallbackUserName(userId: string): string {
    return `User ${userId.slice(0, 8)}`
}

const SESSIONS_TABLE = 'users_sessions'

function getAdminClient(): any {
    return createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
}

async function requireElevatedCaller(_supabase: any, req: Request, headers: any, body?: any): Promise<Response | null> {
    const auth = await requireAuthenticated(_supabase, req, headers, body)
    if (auth instanceof Response) return auth
    const admin = getAdminClient()
    const { data } = await admin.from('users_permissions').select('role_id, users_roles(weight)').eq('user_id', auth)
    const isElevated = data?.some((p: any) => (p.users_roles?.weight ?? 0) > ELEVATED_WEIGHT_THRESHOLD)
    if (!isElevated) return errorResponse('Forbidden: insufficient privileges', headers, 403)
    return null
}

async function getMaxRoleWeight(userId: string): Promise<number> {
    const admin = getAdminClient()
    const { data } = await admin.from('users_permissions').select('users_roles(weight)').eq('user_id', userId)
    if (!data?.length) return 0
    return Math.max(0, ...data.map((p: any) => p.users_roles?.weight ?? 0))
}

async function requireITAccess(_supabase: any, req: Request, headers: any, body?: any): Promise<Response | null> {
    const auth = await requireAuthenticated(_supabase, req, headers, body)
    if (auth instanceof Response) return auth
    const admin = getAdminClient()
    const { data } = await admin.from(PERMISSIONS_TABLE).select('users_roles(name)').eq('user_id', auth)
    const hasITAccess = data?.some((p: any) => p.users_roles?.name === 'IT Access')
    if (!hasITAccess) return errorResponse('Forbidden: IT Access required', headers, 403)
    return null
}

async function requireElevatedOrOutranking(
    _supabase: any,
    req: Request,
    headers: any,
    body: any,
    targetUserId: string,
    newRoleId?: string | null
): Promise<Response | null> {
    const auth = await requireAuthenticated(_supabase, req, headers, body)
    if (auth instanceof Response) return auth
    const admin = getAdminClient()
    const [callerWeight, targetWeight] = await Promise.all([getMaxRoleWeight(auth), getMaxRoleWeight(targetUserId)])
    const isElevated = callerWeight > ELEVATED_WEIGHT_THRESHOLD
    const outranksTarget = callerWeight > targetWeight
    if (!isElevated && !outranksTarget) return errorResponse('Forbidden: insufficient privileges', headers, 403)
    if (newRoleId) {
        const { data: roleData } = await admin.from(ROLES_TABLE).select('weight').eq('id', newRoleId).maybeSingle()
        const newRoleWeight = roleData?.weight ?? 0
        if (!isElevated && newRoleWeight >= callerWeight) {
            return errorResponse('Forbidden: cannot assign a role at or above your own', headers, 403)
        }
    }
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
        const body = await req.json().catch(() => ({}))

        switch (endpoint) {
            case 'current-user': {
                const headerUserId = req.headers.get('x-user-id')
                const headerSessionId = req.headers.get('x-session-id')
                const sessionUserId = headerUserId || body.__sessionUserId
                const sessionId = headerSessionId || body.__sessionId
                if (!sessionUserId || !sessionId) return jsonResponse(null, headers)
                const admin = getAdminClient()
                const { data: sessionData } = await admin
                    .from(SESSIONS_TABLE)
                    .select('id')
                    .eq('id', sessionId)
                    .eq('user_id', sessionUserId)
                    .maybeSingle()
                if (sessionData) return jsonResponse({ id: sessionUserId }, headers)
                return jsonResponse(null, headers)
            }
            case 'user-by-id': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { userId } = body
                if (!userId) return jsonResponse({ id: 'unknown', name: 'Unknown User' }, headers)
                const { data } = await supabase.from(USERS_TABLE).select('id, name, email').eq('id', userId).single()
                if (!data) return jsonResponse({ id: userId, name: fallbackUserName(userId) }, headers)
                return jsonResponse(
                    {
                        id: data.id,
                        name: data.name || data.email?.split('@')[0] || fallbackUserName(userId),
                        email: data.email
                    },
                    headers
                )
            }
            case 'display-name': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { userId } = body
                if (!userId) return jsonResponse('System', headers)
                if (userId === 'anonymous') return jsonResponse('Anonymous', headers)

                const { data: profileData } = await supabase
                    .from(PROFILES_TABLE)
                    .select('first_name, last_name')
                    .eq('id', userId)
                    .single()
                const fullName = `${profileData?.first_name ?? ''} ${profileData?.last_name ?? ''}`.trim()
                if (fullName) return jsonResponse(fullName, headers)

                const { data: userData } = await supabase
                    .from(USERS_TABLE)
                    .select('name, email')
                    .eq('id', userId)
                    .single()
                if (userData?.name) return jsonResponse(userData.name.replace(/^User\s+/i, ''), headers)
                if (userData?.email) return jsonResponse(formatEmailAsDisplayName(userData.email), headers)
                return jsonResponse(userId.slice(0, 8), headers)
            }
            case 'all-roles': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { data } = await supabase.from(ROLES_TABLE).select('*').order('weight', { ascending: false })
                return jsonResponse(data ?? [], headers)
            }
            case 'role-by-id': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { roleId } = body
                if (!roleId) return errorResponse('Role ID is required', headers)
                const { data } = await supabase.from(ROLES_TABLE).select('*').eq('id', roleId).single()
                return jsonResponse(data ?? null, headers)
            }
            case 'role-by-name': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { roleName } = body
                if (!roleName) return errorResponse('Role name is required', headers)
                const { data } = await supabase.from(ROLES_TABLE).select('*').eq('name', roleName).single()
                return jsonResponse(data ?? null, headers)
            }
            case 'user-roles': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { userId } = body
                if (!userId) return errorResponse('User ID is required', headers)
                const roles = await fetchUserRoles(supabase, resolveUserId(userId))
                return jsonResponse(roles, headers)
            }
            case 'user-permissions': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { userId } = body
                if (!userId) return errorResponse('User ID is required', headers)
                const roles = await fetchUserRoles(supabase, resolveUserId(userId))
                return jsonResponse([...collectPermissions(roles)], headers)
            }
            case 'user-profile': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { userId } = body
                if (!userId) return errorResponse('User ID is required', headers)
                const { data } = await supabase
                    .from(PROFILES_TABLE)
                    .select('*')
                    .eq('id', resolveUserId(userId))
                    .single()
                return jsonResponse(data ?? null, headers)
            }
            case 'has-permission': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { userId, permission } = body
                const targetId = resolveUserId(userId)
                if (!targetId || !permission) return jsonResponse(false, headers)
                if (targetId !== auth) return jsonResponse(false, headers)
                if (permission === UNIVERSAL_PERMISSION) return jsonResponse(true, headers)
                const roles = await fetchUserRoles(supabase, targetId)
                if (isElevatedUser(roles)) return jsonResponse(true, headers)
                return jsonResponse(collectPermissions(roles).has(permission), headers)
            }
            case 'has-any-permission': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { userId, permissions } = body
                const targetId = resolveUserId(userId)
                if (!targetId || !permissions?.length) return jsonResponse(false, headers)
                if (targetId !== auth) return jsonResponse(false, headers)
                const roles = await fetchUserRoles(supabase, targetId)
                if (isElevatedUser(roles)) return jsonResponse(true, headers)
                const userPermissions = collectPermissions(roles)
                return jsonResponse(
                    permissions.some((perm: string) => userPermissions.has(perm)),
                    headers
                )
            }
            case 'has-all-permissions': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { userId, permissions } = body
                const targetId = resolveUserId(userId)
                if (!targetId || !permissions?.length) return jsonResponse(false, headers)
                if (targetId !== auth) return jsonResponse(false, headers)
                const roles = await fetchUserRoles(supabase, targetId)
                if (isElevatedUser(roles)) return jsonResponse(true, headers)
                const userPermissions = collectPermissions(roles)
                return jsonResponse(
                    permissions.every((perm: string) => userPermissions.has(perm)),
                    headers
                )
            }
            case 'menu-visibility': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { userId, requiredPermissions } = body
                const targetId = resolveUserId(userId)
                if (!targetId || targetId !== auth) return jsonResponse({}, headers)
                const roles = await fetchUserRoles(supabase, targetId)
                const menuEntries = Object.entries(requiredPermissions || {})
                if (isElevatedUser(roles)) {
                    return jsonResponse(Object.fromEntries(menuEntries.map(([key]) => [key, true])), headers)
                }
                const userPermissions = collectPermissions(roles)
                return jsonResponse(
                    Object.fromEntries(
                        menuEntries.map(([menuItem, permission]) => [
                            menuItem,
                            !permission || userPermissions.has(permission as string)
                        ])
                    ),
                    headers
                )
            }
            case 'highest-role': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { userId } = body
                if (!userId) return jsonResponse(null, headers)
                const roles = await fetchUserRoles(supabase, resolveUserId(userId))
                if (!roles.length) return jsonResponse(null, headers)
                return jsonResponse(roles.sort((a: any, b: any) => b.weight - a.weight)[0], headers)
            }
            case 'assign-role': {
                const authErr = await requireElevatedCaller(supabase, req, headers, body)
                if (authErr) return authErr
                const { userId, roleId } = body
                if (!userId || !roleId) return errorResponse('User ID and role ID are required', headers)
                const id = resolveUserId(userId)
                const { data: existing } = await supabase
                    .from(PERMISSIONS_TABLE)
                    .select('id')
                    .eq('user_id', id)
                    .eq('role_id', roleId)
                if (existing?.length) return jsonResponse(true, headers)
                const now = nowISO()
                const { error } = await supabase
                    .from(PERMISSIONS_TABLE)
                    .insert({ user_id: id, role_id: roleId, created_at: now, updated_at: now })
                if (error) return errorResponse('Failed to assign role', headers, 500)
                return jsonResponse(true, headers)
            }
            case 'remove-role': {
                const authErr = await requireElevatedCaller(supabase, req, headers, body)
                if (authErr) return authErr
                const { userId, roleId } = body
                if (!userId || !roleId) return errorResponse('User ID and role ID are required', headers)
                const { error } = await supabase
                    .from(PERMISSIONS_TABLE)
                    .delete()
                    .eq('user_id', resolveUserId(userId))
                    .eq('role_id', roleId)
                if (error) return errorResponse('Failed to remove role', headers, 500)
                return jsonResponse(true, headers)
            }
            case 'create-role': {
                const authErr = await requireElevatedCaller(supabase, req, headers, body)
                if (authErr) return authErr
                const { name, permissions = [], weight = 0 } = body
                if (!name) return errorResponse('Role name is required', headers)
                const { data, error } = await supabase
                    .from(ROLES_TABLE)
                    .insert({ name, permissions, weight })
                    .select()
                    .single()
                if (error) return errorResponse('Failed to create role', headers, 500)
                return jsonResponse(data, headers)
            }
            case 'update-role': {
                const authErr = await requireElevatedCaller(supabase, req, headers, body)
                if (authErr) return authErr
                const { roleId, updates } = body
                if (!roleId || !updates) return errorResponse('Role ID and updates are required', headers)
                const { error } = await supabase.from(ROLES_TABLE).update(updates).eq('id', roleId)
                if (error) return errorResponse('Failed to update role', headers, 500)
                return jsonResponse(true, headers)
            }
            case 'delete-role': {
                const authErr = await requireElevatedCaller(supabase, req, headers, body)
                if (authErr) return authErr
                const { roleId } = body
                if (!roleId) return errorResponse('Role ID is required', headers)
                const { error } = await supabase.from(ROLES_TABLE).delete().eq('id', roleId)
                if (error) return errorResponse('Failed to delete role', headers, 500)
                return jsonResponse(true, headers)
            }
            case 'user-plant': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { userId } = body
                if (!userId) return jsonResponse(null, headers)
                const { data } = await supabase
                    .from(PROFILES_TABLE)
                    .select('plant_code')
                    .eq('id', resolveUserId(userId))
                    .single()
                return jsonResponse(data?.plant_code ?? null, headers)
            }
            case 'my-plant': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { data } = await supabase
                    .from(PROFILES_TABLE)
                    .select('plant_code')
                    .eq('id', auth)
                    .maybeSingle()
                return jsonResponse(data?.plant_code ?? null, headers)
            }
            case 'user-additional-plants': {
                const auth = await requireAuthenticated(supabase, req, headers, body)
                if (auth instanceof Response) return auth
                const { userId } = body
                if (!userId) return jsonResponse([], headers)
                const { data } = await supabase
                    .from(PROFILES_TABLE)
                    .select('additional_assigned_plants')
                    .eq('id', resolveUserId(userId))
                    .single()
                return jsonResponse(data?.additional_assigned_plants ?? [], headers)
            }
            case 'update-additional-plants': {
                const authErr = await requireElevatedCaller(supabase, req, headers, body)
                if (authErr) return authErr
                const { userId, additionalPlants } = body
                if (!userId) return errorResponse('User ID is required', headers)
                const plantCodes = Array.isArray(additionalPlants) ? additionalPlants : []
                const { error } = await supabase
                    .from(PROFILES_TABLE)
                    .update({
                        additional_assigned_plants: plantCodes.length ? plantCodes : null,
                        updated_at: nowISO()
                    })
                    .eq('id', resolveUserId(userId))
                if (error) return errorResponse('Failed to update additional plants', headers, 500)
                return jsonResponse(true, headers)
            }
            case 'update-manager': {
                const { userId: targetId, profile, email: managerEmail, roleId } = body
                if (!targetId) return errorResponse('User ID is required', headers)
                const id = resolveUserId(targetId)
                const authErr = await requireElevatedOrOutranking(supabase, req, headers, body, id, roleId)
                if (authErr) return authErr
                const now = nowISO()
                if (profile) {
                    // Whitelist allowed profile fields to prevent mass assignment
                    const allowedFields: Record<string, unknown> = { updated_at: now }
                    if (profile.first_name !== undefined) allowedFields.first_name = profile.first_name
                    if (profile.last_name !== undefined) allowedFields.last_name = profile.last_name
                    if (profile.plant_code !== undefined) allowedFields.plant_code = profile.plant_code
                    if (profile.additional_assigned_plants !== undefined)
                        allowedFields.additional_assigned_plants = profile.additional_assigned_plants
                    const { error: profErr } = await supabase.from(PROFILES_TABLE).update(allowedFields).eq('id', id)
                    if (profErr) return errorResponse('Failed to update profile', headers, 500)
                }
                if (managerEmail) {
                    const { error: userErr } = await supabase
                        .from(USERS_TABLE)
                        .update({ email: managerEmail, updated_at: now })
                        .eq('id', id)
                    if (userErr) return errorResponse('Failed to update email', headers, 500)
                }
                if (roleId) {
                    const { data: existing } = await supabase
                        .from(PERMISSIONS_TABLE)
                        .select('user_id')
                        .eq('user_id', id)
                    const roleUpdate = { role_id: roleId, updated_at: now }
                    const { error: permErr } = existing?.length
                        ? await supabase.from(PERMISSIONS_TABLE).update(roleUpdate).eq('user_id', id)
                        : await supabase.from(PERMISSIONS_TABLE).insert({ ...roleUpdate, user_id: id, created_at: now })
                    if (permErr) return errorResponse('Failed to update role assignment', headers, 500)
                }
                return jsonResponse(true, headers)
            }
            case 'delete-manager': {
                const { userId: delId } = body
                if (!delId) return errorResponse('User ID is required', headers)
                const authErr = await requireITAccess(supabase, req, headers, body)
                if (authErr) return authErr
                const resolvedDelId = resolveUserId(delId)
                const { error } = await supabase.from(USERS_TABLE).delete().eq('id', resolvedDelId)
                if (error) return errorResponse('Failed to delete manager', headers, 500)
                return jsonResponse(true, headers)
            }
            default:
                return jsonResponse({ error: 'Invalid endpoint', path: url.pathname }, headers, 404)
        }
    } catch (error) {
        return jsonResponse({ error: 'Internal server error' }, headers, 500)
    }
})
