const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'https://smyrnatools.com',
    'https://www.smyrnatools.com',
    'https://db.smyrnatools.com'
]

/**
 * Returns CORS headers scoped to the request's origin. Credentialed requests
 * (cookies) require an exact-origin ACAO — wildcard or fallback origins are
 * rejected by the browser. When the origin is not in the allowlist we omit
 * the ACAO entirely so the browser blocks the response.
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers':
            'Content-Type, Authorization, x-client-info, apikey, X-User-Id, X-Session-Id, X-Internal-Token',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        Connection: 'keep-alive'
    }
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        headers['Access-Control-Allow-Origin'] = origin
        headers['Vary'] = 'Origin'
    }
    return headers
}

export function handleOptions(origin: string | null): Response {
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) })
}

export function jsonResponse(data: unknown, headers: Record<string, string>, status = 200): Response {
    return new Response(JSON.stringify(data), { status, headers })
}

export function errorResponse(
    message: string,
    headers: Record<string, string>,
    status = 400,
    details: Record<string, unknown> = {}
): Response {
    return jsonResponse({ error: message, ...details }, headers, status)
}
