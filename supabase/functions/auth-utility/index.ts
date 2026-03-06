// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const PWD_HASH_TIMEOUT = 5000;
const MIN_PASSWORD_LENGTH = 8;
const WEAK_THRESHOLD = 3;
const MEDIUM_THRESHOLD = 5;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>]/;

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function scorePassword(password: string): number {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (SPECIAL_CHAR_REGEX.test(password)) score++;
    return score;
}

function strengthLabel(score: number): string {
    return score < WEAK_THRESHOLD ? "weak" : score < MEDIUM_THRESHOLD ? "medium" : "strong";
}

async function sha256Hex(input: string): Promise<string> {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    return bytesToHex(new Uint8Array(hash));
}

function fallbackHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash = hash & hash;
    }
    return (hash >>> 0).toString(16);
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

        switch (endpoint) {
            case "password-strength": {
                const {password} = await req.json();
                if (!password || password.length < MIN_PASSWORD_LENGTH) return jsonResponse({value: "weak"}, headers);
                return jsonResponse({value: strengthLabel(scorePassword(password))}, headers);
            }
            case "email-is-valid": {
                const {email} = await req.json();
                if (!email) return errorResponse("Email is required", headers, 400);
                return jsonResponse({isValid: EMAIL_REGEX.test(email)}, headers);
            }
            case "normalize-name": {
                const {name} = await req.json();
                if (!name) return errorResponse("Name is required", headers, 400);
                const stripped = name.replace(/\s+/g, "");
                const normalizedName = stripped ? stripped.charAt(0).toUpperCase() + stripped.slice(1).toLowerCase() : "";
                return jsonResponse({normalizedName}, headers);
            }
            case "generate-salt": {
                const randomBytes = new Uint8Array(16);
                crypto.getRandomValues(randomBytes);
                return jsonResponse({salt: bytesToHex(randomBytes)}, headers);
            }
            case "hash-password": {
                const {data: authData, error: authError} = await supabase.auth.getUser();
                if (authError || !authData?.user?.id) return errorResponse("Unauthorized", headers, 401);
                let body;
                try {
                    body = await req.json();
                } catch {
                    return errorResponse("Invalid JSON in request body", headers, 400);
                }
                const {password, salt} = body;
                if (!password || !salt) return errorResponse("Password and salt are required", headers, 400);
                try {
                    const hashPromise = sha256Hex(password + salt);
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Password hash timed out")), PWD_HASH_TIMEOUT));
                    const hash = await Promise.race([hashPromise, timeoutPromise]);
                    return jsonResponse({hash}, headers);
                } catch {
                    return jsonResponse({hash: fallbackHash(password + salt), fallback: true}, headers);
                }
            }
            case "get-user-id": {
                try {
                    const {data} = await supabase.auth.getSession();
                    return jsonResponse({userId: data?.session?.user?.id ?? null}, headers);
                } catch (error) {
                    return jsonResponse({userId: null, error: "Failed to get user ID"}, headers);
                }
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
