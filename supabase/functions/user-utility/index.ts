// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";

const userUtility = {
    generateUUID() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
            const arr = new Uint8Array(16);
            crypto.getRandomValues(arr);
            arr[6] = arr[6] & 0x0f | 0x40;
            arr[8] = arr[8] & 0x3f | 0x80;
            return [
                userUtility._byteToHex(arr[0]),
                userUtility._byteToHex(arr[1]),
                userUtility._byteToHex(arr[2]),
                userUtility._byteToHex(arr[3]),
                '-',
                userUtility._byteToHex(arr[4]),
                userUtility._byteToHex(arr[5]),
                '-',
                userUtility._byteToHex(arr[6]),
                userUtility._byteToHex(arr[7]),
                '-',
                userUtility._byteToHex(arr[8]),
                userUtility._byteToHex(arr[9]),
                '-',
                userUtility._byteToHex(arr[10]),
                userUtility._byteToHex(arr[11]),
                userUtility._byteToHex(arr[12]),
                userUtility._byteToHex(arr[13]),
                userUtility._byteToHex(arr[14]),
                userUtility._byteToHex(arr[15])
            ].join('');
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : r & 0x3 | 0x8).toString(16);
        });
    },
    _byteToHex(byte) {
        return byte.toString(16).padStart(2, '0');
    },
    isValidUUID(uuid) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
    },
    safeUUID(uuid) {
        return !uuid || uuid === '' || uuid === '0' ? null : uuid;
    }
};

function getCorsHeaders(origin: string | null): Record<string, string> {
    const allowedOrigins = ['http://localhost:3000', 'https://smyrnatools.com', 'https://www.smyrnatools.com', 'https://db.smyrnatools.com'];
    const isAllowed = origin && allowedOrigins.includes(origin);
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
        'Access-Control-Allow-Credentials': 'true'
    };
}

function handleOptions(origin: string | null): Response {
    return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin)
    });
}

console.info('User Utility Edge Function initialized');
Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const corsHeaders = getCorsHeaders(origin);
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/user-utility\/?/, '');
    switch (path) {
        case 'generate-uuid':
            return handleGenerateUUID(corsHeaders);
        case 'validate-uuid':
            return handleValidateUUID(req, corsHeaders);
        case 'safe-uuid':
            return handleSafeUUID(req, corsHeaders);
        default:
            return new Response(JSON.stringify({
                available_endpoints: [
                    '/user-utility/generate-uuid',
                    '/user-utility/validate-uuid',
                    '/user-utility/safe-uuid'
                ]
            }), {
                status: 200,
                headers: corsHeaders
            });
    }
});

function handleGenerateUUID(corsHeaders: Record<string, string>) {
    const uuid = userUtility.generateUUID();
    return new Response(JSON.stringify({
        uuid
    }), {
        headers: corsHeaders
    });
}

async function handleValidateUUID(req: Request, corsHeaders: Record<string, string>) {
    try {
        let uuid;
        if (req.method === 'GET') {
            const url = new URL(req.url);
            uuid = url.searchParams.get('uuid');
        } else if (req.method === 'POST') {
            const body = await req.json();
            uuid = body.uuid;
        }
        if (!uuid) {
            return new Response(JSON.stringify({
                error: 'UUID parameter is required'
            }), {
                status: 400,
                headers: corsHeaders
            });
        }
        const isValid = userUtility.isValidUUID(uuid);
        return new Response(JSON.stringify({
            uuid,
            isValid
        }), {
            headers: corsHeaders
        });
    } catch (error) {
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}

async function handleSafeUUID(req: Request, corsHeaders: Record<string, string>) {
    try {
        let uuid;
        if (req.method === 'GET') {
            const url = new URL(req.url);
            uuid = url.searchParams.get('uuid');
        } else if (req.method === 'POST') {
            const body = await req.json();
            uuid = body.uuid;
        }
        if (uuid === undefined) {
            return new Response(JSON.stringify({
                error: 'UUID parameter is required'
            }), {
                status: 400,
                headers: corsHeaders
            });
        }
        const safeUuid = userUtility.safeUUID(uuid);
        return new Response(JSON.stringify({
            original: uuid,
            safeUuid
        }), {
            headers: corsHeaders
        });
    } catch (error) {
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}
