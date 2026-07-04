/**
 * Session-cookie helpers. The session lives in two httpOnly cookies served
 * from `.smyrnatools.com` so both `smyrnatools.com` and `db.smyrnatools.com`
 * share them. Cookies are HttpOnly so JS / XSS cannot read them, Secure so
 * they only travel over HTTPS, and SameSite=Lax so they ride along on
 * top-level navigations from the frontend domain.
 *
 * One companion non-HttpOnly flag cookie (`smyrna_auth=1`) lets the frontend
 * cheaply tell "am I probably signed in?" without a round-trip — it carries
 * no secret, only a flag. The real authoritative check is `whoami`.
 */

const COOKIE_UID = 'smyrna_uid'
const COOKIE_SID = 'smyrna_sid'
const COOKIE_FLAG = 'smyrna_auth'
const COOKIE_DOMAIN = '.smyrnatools.com'
/**
 * 30 days, matching SESSION_EXPIRY_DAYS in requireSession.ts. Cookies are
 * re-issued on every successful `/auth-service/whoami` probe (called by the
 * AuthContext visibility-change listener every time the tab regains focus),
 * so any user who opens the app at least once a month effectively never
 * hits the cookie expiry — the sliding window keeps the cookie fresh.
 */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

interface CookieOptions {
    httpOnly: boolean
    maxAgeSeconds: number
}

function serializeCookie(name: string, value: string, opts: CookieOptions): string {
    const parts = [
        `${name}=${value}`,
        `Domain=${COOKIE_DOMAIN}`,
        'Path=/',
        `Max-Age=${opts.maxAgeSeconds}`,
        'Secure',
        'SameSite=Lax'
    ]
    if (opts.httpOnly) parts.push('HttpOnly')
    return parts.join('; ')
}

/**
 * Returns a `Set-Cookie` header value array — append all entries to the
 * response. Caller must merge with existing headers using `append`, not `set`,
 * because multiple Set-Cookie lines are legal and needed.
 */
export function buildSessionCookieHeaders(userId: string, sessionId: string): string[] {
    return [
        serializeCookie(COOKIE_UID, encodeURIComponent(userId), {
            httpOnly: true,
            maxAgeSeconds: SESSION_MAX_AGE_SECONDS
        }),
        serializeCookie(COOKIE_SID, encodeURIComponent(sessionId), {
            httpOnly: true,
            maxAgeSeconds: SESSION_MAX_AGE_SECONDS
        }),
        serializeCookie(COOKIE_FLAG, '1', { httpOnly: false, maxAgeSeconds: SESSION_MAX_AGE_SECONDS })
    ]
}

/** Returns three Set-Cookie strings that zero out every session cookie. */
export function buildClearSessionCookieHeaders(): string[] {
    return [
        serializeCookie(COOKIE_UID, '', { httpOnly: true, maxAgeSeconds: 0 }),
        serializeCookie(COOKIE_SID, '', { httpOnly: true, maxAgeSeconds: 0 }),
        serializeCookie(COOKIE_FLAG, '', { httpOnly: false, maxAgeSeconds: 0 })
    ]
}

/**
 * Parses the request's Cookie header into a plain map. Returns null for
 * either credential when the cookie is missing. Values are URL-decoded.
 */
export function readSessionCookies(req: Request): { userId: string | null; sessionId: string | null } {
    const raw = req.headers.get('cookie') ?? ''
    if (!raw) return { userId: null, sessionId: null }
    const map = new Map<string, string>()
    for (const segment of raw.split(';')) {
        const eq = segment.indexOf('=')
        if (eq < 0) continue
        const name = segment.slice(0, eq).trim()
        const value = segment.slice(eq + 1).trim()
        if (name) map.set(name, value)
    }
    const decode = (v: string | undefined) => {
        if (!v) return null
        try {
            return decodeURIComponent(v)
        } catch {
            return v
        }
    }
    return {
        userId: decode(map.get(COOKIE_UID)),
        sessionId: decode(map.get(COOKIE_SID))
    }
}

/**
 * Merges `Set-Cookie` lines into an existing headers object. Headers in this
 * codebase are plain `Record<string, string>`, which can't represent the
 * multiple Set-Cookie lines a real `Headers` object can. We collapse them
 * into a single comma-joined header — the Fetch standard treats Set-Cookie
 * specially and most runtimes (Deno, browsers) handle the joined form
 * correctly for response headers. For full fidelity we instead construct a
 * proper Headers object — see `respondWithCookies`.
 */
export function respondWithCookies(
    body: unknown,
    baseHeaders: Record<string, string>,
    setCookieValues: string[],
    status = 200
): Response {
    const responseHeaders = new Headers()
    for (const [k, v] of Object.entries(baseHeaders)) responseHeaders.set(k, v)
    for (const cookie of setCookieValues) responseHeaders.append('Set-Cookie', cookie)
    return new Response(JSON.stringify(body), { status, headers: responseHeaders })
}

export const SESSION_COOKIE_NAMES = { uid: COOKIE_UID, sid: COOKIE_SID, flag: COOKIE_FLAG }
