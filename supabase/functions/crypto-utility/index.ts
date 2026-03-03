// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const HASH_TIMEOUT = 5000;
const DEFAULT_SALT_LENGTH = 16;

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fallbackHash(data: unknown): string {
    let hash = 5381;
    const str = String(data);
    for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    let hex = (hash >>> 0).toString(16);
    while (hex.length < 64) hex += "0";
    return hex.slice(0, 64);
}

async function sha256(data: unknown): Promise<string> {
    if (!crypto?.subtle) return fallbackHash(data);
    try {
        const buffer = new TextEncoder().encode(String(data));
        const hashPromise = crypto.subtle.digest("SHA-256", buffer);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("SHA-256 timed out")), HASH_TIMEOUT));
        return bytesToHex(new Uint8Array(await Promise.race([hashPromise, timeoutPromise]) as ArrayBuffer));
    } catch {
        return fallbackHash(data);
    }
}

function generateSalt(length = DEFAULT_SALT_LENGTH): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
}

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const headers = getCorsHeaders(origin);
    try {
        const url = new URL(req.url);
        const endpoint = url.pathname.split("/").pop();
        const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

        switch (endpoint) {
            case "hash": {
                const data = (body as { data?: string }).data;
                if (!data) return errorResponse("Data is required", headers, 400);
                return jsonResponse({hash: await sha256(data)}, headers);
            }
            case "uuid":
                return jsonResponse({uuid: crypto.randomUUID()}, headers);
            case "generate-salt":
                return jsonResponse({salt: generateSalt((body as { length?: number }).length || DEFAULT_SALT_LENGTH)}, headers);
            case "hash-password": {
                const {password, salt} = body as { password?: string; salt?: string };
                if (!password || !salt) return errorResponse("Password and salt are required", headers, 400);
                return jsonResponse({hash: await sha256(password + salt)}, headers);
            }
            case "batch-hash": {
                const items = (body as { items?: unknown[] }).items;
                if (!Array.isArray(items)) return errorResponse("Items must be an array", headers, 400);
                const results = await Promise.all(items.map(async (item) => ({original: item, hash: await sha256(item)})));
                return jsonResponse({results}, headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500, {message: (error as Error).message});
    }
});
