/**
 * Shared secret check for legitimate service-to-service / unattended-tool
 * calls into endpoints that otherwise require a user session. Separate from
 * SUPABASE_SERVICE_ROLE_KEY so a leak of the service role key alone does NOT
 * grant access to these endpoints — both secrets must leak.
 *
 * Caller patterns:
 *   - Edge-function to edge-function: send `X-Internal-Token: <token>` header.
 *   - Unattended userscript / cron: same header.
 *
 * Configure once: `supabase secrets set EDGE_INTERNAL_TOKEN=<long-random>`.
 */

const HEADER_NAME = 'x-internal-token'

/** Constant-time comparison to avoid timing oracles on the secret. */
function safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return diff === 0
}

export function isInternalServiceCall(req: Request): boolean {
    // @ts-ignore Deno env
    const expected = Deno.env.get('EDGE_INTERNAL_TOKEN') ?? ''
    if (!expected) return false
    const provided = req.headers.get(HEADER_NAME) ?? ''
    if (!provided) return false
    return safeEqual(provided, expected)
}

export const INTERNAL_TOKEN_HEADER = HEADER_NAME
