/**
 * Canonical session-validation gate for every edge function.
 *
 * Validates the caller's session against the `users_sessions` table and
 * returns the authenticated userId on success, or a 401 Response on failure.
 * Every non-public edge function MUST call this before processing a request.
 */

// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
// @ts-ignore
import { errorResponse } from './cors.ts'
// @ts-ignore
import { readSessionCookies } from './cookies.ts'

const SESSIONS_TABLE = 'users_sessions'
/**
 * Rolling inactivity window. A session stays valid as long as it has been
 * touched (any authenticated edge function call updates `last_active`) within
 * this many days. Bumped 7 → 30 in 2026.22 so users who use the app once or
 * twice a month don't have to re-authenticate from scratch.
 */
export const SESSION_EXPIRY_DAYS = 30

/** Creates an admin client using the service role key to bypass RLS for session validation. */
function getAdminClient(): any {
    return createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
}

/**
 * Extracts session credentials. Precedence:
 *   1. HttpOnly session cookies (production path)
 *   2. X-User-Id / X-Session-Id headers (transition + non-cookie clients)
 *   3. __sessionUserId / __sessionId body fields (transition fallback)
 *
 * The header/body fallbacks exist so localhost dev (different registrable
 * domain from the API) and the rolling deploy window keep working. After
 * all clients are migrated and verified, the fallbacks can be removed.
 */
function extractSessionCredentials(req: Request, body?: any): { userId: string | null; sessionId: string | null } {
    const fromCookies = readSessionCookies(req)
    if (fromCookies.userId && fromCookies.sessionId) return fromCookies
    const userId = fromCookies.userId || req.headers.get('x-user-id') || body?.__sessionUserId || null
    const sessionId = fromCookies.sessionId || req.headers.get('x-session-id') || body?.__sessionId || null
    return { userId, sessionId }
}

/**
 * Validates the caller's session against the users_sessions table.
 *
 * @returns The authenticated userId (string) on success, or a 401 Response on failure.
 */
export async function requireAuthenticated(
    _supabase: any,
    req: Request,
    headers: any,
    body?: any
): Promise<string | Response> {
    let { userId, sessionId } = extractSessionCredentials(req, body)
    if (!userId || !sessionId) {
        try {
            const b = await req.clone().json()
            userId = userId || b?.__sessionUserId
            sessionId = sessionId || b?.__sessionId
        } catch {}
    }
    if (!userId || !sessionId) return errorResponse('Unauthorized', headers, 401)
    const admin = getAdminClient()
    const { data, error } = await admin
        .from(SESSIONS_TABLE)
        .select('id, last_active')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .maybeSingle()
    if (error || !data) return errorResponse('Unauthorized', headers, 401)
    if (data.last_active) {
        const lastActive = new Date(data.last_active)
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() - SESSION_EXPIRY_DAYS)
        if (lastActive < expiryDate) return errorResponse('Session expired', headers, 401)
    }
    admin
        .from(SESSIONS_TABLE)
        .update({ last_active: new Date().toISOString() })
        .eq('id', sessionId)
        .then(() => {})
        .catch(() => {})
    return userId
}
