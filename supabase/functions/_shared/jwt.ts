/**
 * Minimal HS256 JWT minting for the custom session model.
 *
 * Why this exists: PostgREST honors any JWT signed with the project's JWT
 * secret and uses claims (`role`, plus anything custom) to drive RLS. By
 * minting our own JWTs at login (with `role: "authenticated"` and the
 * custom session id), we replace the bundle-leaked anon key as the
 * frontend's database credential — anon role is locked out at the table
 * level, and only callers carrying a valid signed JWT get past RLS.
 */

const ENCODER = new TextEncoder()
const DECODER = new TextDecoder()

/** RFC 7515 base64url — `+/` → `-_`, padding stripped. */
function base64UrlEncode(bytes: Uint8Array): string {
    let bin = ''
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str: string): Uint8Array {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4)
    const bin = atob(padded)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
    return crypto.subtle.importKey('raw', ENCODER.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
        'verify'
    ])
}

export interface JwtPayload {
    sub: string
    role: string
    session_id: string
    iat: number
    exp: number
    [key: string]: unknown
}

/** Signs `payload` with HS256 against the project's JWT secret. */
export async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' }
    const encodedHeader = base64UrlEncode(ENCODER.encode(JSON.stringify(header)))
    const encodedPayload = base64UrlEncode(ENCODER.encode(JSON.stringify(payload)))
    const signingInput = `${encodedHeader}.${encodedPayload}`
    const key = await importHmacKey(secret)
    const signature = await crypto.subtle.sign('HMAC', key, ENCODER.encode(signingInput))
    return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`
}

/** Verifies signature + expiration. Returns null on any failure. */
export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return null
        const [encodedHeader, encodedPayload, encodedSignature] = parts
        const key = await importHmacKey(secret)
        const valid = await crypto.subtle.verify(
            'HMAC',
            key,
            base64UrlDecode(encodedSignature),
            ENCODER.encode(`${encodedHeader}.${encodedPayload}`)
        )
        if (!valid) return null
        const payload = JSON.parse(DECODER.decode(base64UrlDecode(encodedPayload))) as JwtPayload
        if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) return null
        return payload
    } catch {
        return null
    }
}

/**
 * Mints a session JWT with the standard claim shape PostgREST + our RLS
 * policy expect. Lifetime defaults to 1 hour — the frontend silently
 * re-mints via `refresh-token` every ~30 minutes so users never see an
 * expiration mid-session.
 */
export async function mintSessionJwt(
    userId: string,
    sessionId: string,
    secret: string,
    ttlSeconds = 3600
): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    return signJwt(
        {
            sub: userId,
            role: 'authenticated',
            session_id: sessionId,
            iat: now,
            exp: now + ttlSeconds
        },
        secret
    )
}
