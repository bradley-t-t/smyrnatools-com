// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const USERS_TABLE = 'users';
const PROFILES_TABLE = 'users_profiles';
const ROLES_TABLE = 'users_roles';
const PERMISSIONS_TABLE = 'users_permissions';
const ELEVATED_WEIGHT_THRESHOLD = 75;
const ROLES_SELECT = 'role_id, users_roles(id, name, permissions, weight)';
const UNIVERSAL_PERMISSION = 'my_account.view';


function resolveUserId(userId: unknown): string {
    return typeof userId === 'object' && (userId as any)?.id ? (userId as any).id : userId as string;
}

function nowISO(): string {
    return new Date().toISOString();
}

async function fetchUserRoles(supabase: any, userId: string): Promise<any[]> {
    const {data} = await supabase.from(PERMISSIONS_TABLE).select(ROLES_SELECT).eq('user_id', userId);
    return data?.map((item: any) => item.users_roles) ?? [];
}

function collectPermissions(roles: any[]): Set<string> {
    const permissions = new Set<string>();
    for (const role of roles) {
        role?.permissions?.forEach((perm: string) => permissions.add(perm));
    }
    return permissions;
}

function isElevatedUser(roles: any[]): boolean {
    return roles.some((role) => (role?.weight ?? 0) > ELEVATED_WEIGHT_THRESHOLD);
}

function formatEmailAsDisplayName(email: string): string {
    return email.split('@')[0].replace(/\./g, ' ').split(' ').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function fallbackUserName(userId: string): string {
    return `User ${userId.slice(0, 8)}`;
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
        const body = await req.json().catch(() => ({}));

        switch (endpoint) {
            case "current-user": {
                const {userId} = body;
                if (userId) {
                    try {
                        const {data} = await supabase.from(USERS_TABLE).select('id').eq('id', userId).single();
                        if (data?.id) return jsonResponse({id: userId}, headers);
                    } catch (_) {}
                }
                try {
                    const {data} = await supabase.auth.getUser();
                    return jsonResponse(data?.user ?? null, headers);
                } catch (_) {
                    return jsonResponse(null, headers);
                }
            }
            case "user-by-id": {
                const {userId} = body;
                if (!userId) return jsonResponse({id: 'unknown', name: 'Unknown User'}, headers);
                const {data} = await supabase.from(USERS_TABLE).select('id, name, email').eq('id', userId).single();
                if (!data) return jsonResponse({id: userId, name: fallbackUserName(userId)}, headers);
                return jsonResponse({
                    id: data.id,
                    name: data.name || data.email?.split('@')[0] || fallbackUserName(userId),
                    email: data.email
                }, headers);
            }
            case "display-name": {
                const {userId} = body;
                if (!userId) return jsonResponse('System', headers);
                if (userId === 'anonymous') return jsonResponse('Anonymous', headers);

                const {data: profileData} = await supabase.from(PROFILES_TABLE).select('first_name, last_name').eq('id', userId).single();
                const fullName = `${profileData?.first_name ?? ''} ${profileData?.last_name ?? ''}`.trim();
                if (fullName) return jsonResponse(fullName, headers);

                const {data: userData} = await supabase.from(USERS_TABLE).select('name, email').eq('id', userId).single();
                if (userData?.name) return jsonResponse(userData.name.replace(/^User\s+/i, ''), headers);
                if (userData?.email) return jsonResponse(formatEmailAsDisplayName(userData.email), headers);
                return jsonResponse(userId.slice(0, 8), headers);
            }
            case "all-roles": {
                const {data} = await supabase.from(ROLES_TABLE).select('*').order('weight', {ascending: false});
                return jsonResponse(data ?? [], headers);
            }
            case "role-by-id": {
                const {roleId} = body;
                if (!roleId) return errorResponse("Role ID is required", headers);
                const {data} = await supabase.from(ROLES_TABLE).select('*').eq('id', roleId).single();
                return jsonResponse(data ?? null, headers);
            }
            case "role-by-name": {
                const {roleName} = body;
                if (!roleName) return errorResponse("Role name is required", headers);
                const {data} = await supabase.from(ROLES_TABLE).select('*').eq('name', roleName).single();
                return jsonResponse(data ?? null, headers);
            }
            case "user-roles": {
                const {userId} = body;
                if (!userId) return errorResponse("User ID is required", headers);
                const roles = await fetchUserRoles(supabase, resolveUserId(userId));
                return jsonResponse(roles, headers);
            }
            case "user-permissions": {
                const {userId} = body;
                if (!userId) return errorResponse("User ID is required", headers);
                const roles = await fetchUserRoles(supabase, resolveUserId(userId));
                return jsonResponse([...collectPermissions(roles)], headers);
            }
            case "user-profile": {
                const {userId} = body;
                if (!userId) return errorResponse("User ID is required", headers);
                const {data} = await supabase.from(PROFILES_TABLE).select('*').eq('id', resolveUserId(userId)).single();
                return jsonResponse(data ?? null, headers);
            }
            case "has-permission": {
                const {userId, permission} = body;
                if (!userId || !permission) return jsonResponse(false, headers);
                if (permission === UNIVERSAL_PERMISSION) return jsonResponse(true, headers);
                const roles = await fetchUserRoles(supabase, resolveUserId(userId));
                if (isElevatedUser(roles)) return jsonResponse(true, headers);
                return jsonResponse(collectPermissions(roles).has(permission), headers);
            }
            case "has-any-permission": {
                const {userId, permissions} = body;
                if (!userId || !permissions?.length) return jsonResponse(false, headers);
                const roles = await fetchUserRoles(supabase, resolveUserId(userId));
                if (isElevatedUser(roles)) return jsonResponse(true, headers);
                const userPermissions = collectPermissions(roles);
                return jsonResponse(permissions.some((perm: string) => userPermissions.has(perm)), headers);
            }
            case "has-all-permissions": {
                const {userId, permissions} = body;
                if (!userId || !permissions?.length) return jsonResponse(false, headers);
                const roles = await fetchUserRoles(supabase, resolveUserId(userId));
                if (isElevatedUser(roles)) return jsonResponse(true, headers);
                const userPermissions = collectPermissions(roles);
                return jsonResponse(permissions.every((perm: string) => userPermissions.has(perm)), headers);
            }
            case "menu-visibility": {
                const {userId, requiredPermissions} = body;
                if (!userId) return jsonResponse({}, headers);
                const roles = await fetchUserRoles(supabase, resolveUserId(userId));
                const menuEntries = Object.entries(requiredPermissions || {});
                if (isElevatedUser(roles)) {
                    return jsonResponse(Object.fromEntries(menuEntries.map(([key]) => [key, true])), headers);
                }
                const userPermissions = collectPermissions(roles);
                return jsonResponse(Object.fromEntries(
                    menuEntries.map(([menuItem, permission]) => [menuItem, !permission || userPermissions.has(permission as string)])
                ), headers);
            }
            case "highest-role": {
                const {userId} = body;
                if (!userId) return jsonResponse(null, headers);
                const roles = await fetchUserRoles(supabase, resolveUserId(userId));
                if (!roles.length) return jsonResponse(null, headers);
                return jsonResponse(roles.sort((a: any, b: any) => b.weight - a.weight)[0], headers);
            }
            case "assign-role": {
                const {userId, roleId} = body;
                if (!userId || !roleId) return errorResponse("User ID and role ID are required", headers);
                const id = resolveUserId(userId);
                const {data: existing} = await supabase.from(PERMISSIONS_TABLE).select('id').eq('user_id', id).eq('role_id', roleId);
                if (existing?.length) return jsonResponse(true, headers);
                const now = nowISO();
                const {error} = await supabase.from(PERMISSIONS_TABLE).insert({user_id: id, role_id: roleId, created_at: now, updated_at: now});
                if (error) return errorResponse(error.message || "Failed to assign role", headers, 500);
                return jsonResponse(true, headers);
            }
            case "remove-role": {
                const {userId, roleId} = body;
                if (!userId || !roleId) return errorResponse("User ID and role ID are required", headers);
                const {error} = await supabase.from(PERMISSIONS_TABLE).delete().eq('user_id', resolveUserId(userId)).eq('role_id', roleId);
                if (error) return errorResponse(error.message || "Failed to remove role", headers, 500);
                return jsonResponse(true, headers);
            }
            case "create-role": {
                const {name, permissions = [], weight = 0} = body;
                if (!name) return errorResponse("Role name is required", headers);
                const now = nowISO();
                const {data, error} = await supabase.from(ROLES_TABLE).insert({name, permissions, weight, created_at: now, updated_at: now}).select().single();
                if (error) return errorResponse(error.message || "Failed to create role", headers, 500);
                return jsonResponse(data, headers);
            }
            case "update-role": {
                const {roleId, updates} = body;
                if (!roleId || !updates) return errorResponse("Role ID and updates are required", headers);
                const {error} = await supabase.from(ROLES_TABLE).update({...updates, updated_at: nowISO()}).eq('id', roleId);
                if (error) return errorResponse(error.message || "Failed to update role", headers, 500);
                return jsonResponse(true, headers);
            }
            case "delete-role": {
                const {roleId} = body;
                if (!roleId) return errorResponse("Role ID is required", headers);
                const {error} = await supabase.from(ROLES_TABLE).delete().eq('id', roleId);
                if (error) return errorResponse(error.message || "Failed to delete role", headers, 500);
                return jsonResponse(true, headers);
            }
            case "user-plant": {
                const {userId} = body;
                if (!userId) return jsonResponse(null, headers);
                const {data} = await supabase.from(PROFILES_TABLE).select('plant_code').eq('id', resolveUserId(userId)).single();
                return jsonResponse(data?.plant_code ?? null, headers);
            }
            default:
                return jsonResponse({error: "Invalid endpoint", path: url.pathname}, headers, 404);
        }
    } catch (error) {
        return jsonResponse({error: "Internal server error", message: (error as Error).message}, headers, 500);
    }
});
