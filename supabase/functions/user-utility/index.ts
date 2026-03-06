// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(uuid: string): boolean {
    return UUID_V4_REGEX.test(uuid);
}

function safeUUID(uuid: string | null | undefined): string | null {
    return !uuid || uuid === '' || uuid === '0' ? null : uuid;
}

async function extractUuid(req: Request): Promise<string | undefined> {
    if (req.method === 'GET') return new URL(req.url).searchParams.get('uuid') ?? undefined;
    if (req.method === 'POST') {
        try { return (await req.json()).uuid; } catch { return undefined; }
    }
    return undefined;
}

const AVAILABLE_ENDPOINTS = ['/user-utility/generate-uuid', '/user-utility/validate-uuid', '/user-utility/safe-uuid'];

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const headers = getCorsHeaders(origin);
    const path = new URL(req.url).pathname.replace(/^\/user-utility\/?/, '');

    try {
        switch (path) {
            case 'generate-uuid':
                return jsonResponse({uuid: crypto.randomUUID()}, headers);
            case 'validate-uuid': {
                const uuid = await extractUuid(req);
                if (!uuid) return errorResponse("UUID parameter is required", headers, 400);
                return jsonResponse({uuid, isValid: isValidUUID(uuid)}, headers);
            }
            case 'safe-uuid': {
                const uuid = await extractUuid(req);
                if (uuid === undefined) return errorResponse("UUID parameter is required", headers, 400);
                return jsonResponse({original: uuid, safeUuid: safeUUID(uuid)}, headers);
            }
            default:
                return jsonResponse({available_endpoints: AVAILABLE_ENDPOINTS}, headers);
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
