const ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://smyrnatools.com",
    "https://www.smyrnatools.com",
    "https://db.smyrnatools.com"
];

const DEFAULT_ORIGIN_INDEX = 1;

export function getCorsHeaders(origin: string | null): Record<string, string> {
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[DEFAULT_ORIGIN_INDEX],
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
        "Connection": "keep-alive"
    };
}

export function handleOptions(origin: string | null): Response {
    return new Response(null, {status: 204, headers: getCorsHeaders(origin)});
}

export function jsonResponse(data: unknown, headers: Record<string, string>, status = 200): Response {
    return new Response(JSON.stringify(data), {status, headers});
}

export function errorResponse(message: string, headers: Record<string, string>, status = 400, details: Record<string, unknown> = {}): Response {
    return jsonResponse({error: message, ...details}, headers, status);
}

