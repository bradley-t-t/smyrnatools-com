// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const USERS_TABLE = "users";
const PROFILES_TABLE = "users_profiles";
const PREFERENCES_TABLE = "users_preferences";
const SESSION_RESTORE_TIMEOUT = 5000;
const MIN_PASSWORD_LENGTH = 8;
const WEAK_THRESHOLD = 3;
const MEDIUM_THRESHOLD = 5;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>]/;

function isValidEmail(email: string): boolean {
    return EMAIL_REGEX.test(email);
}

function passwordStrength(password: string): { value: string } {
    if (!password || password.length < MIN_PASSWORD_LENGTH) return {value: "weak"};
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (SPECIAL_CHAR_REGEX.test(password)) score++;
    return {value: score < WEAK_THRESHOLD ? "weak" : score < MEDIUM_THRESHOLD ? "medium" : "strong"};
}

function generateSalt(): string {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    return bytesToHex(randomBytes);
}

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt: string): Promise<string> {
    const dataBuffer = new TextEncoder().encode(password + salt);
    const hash = await crypto.subtle.digest("SHA-256", dataBuffer);
    return bytesToHex(new Uint8Array(hash));
}

function sanitizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function nowISO(): string {
    return new Date().toISOString();
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
            case "sign-in": {
                const {email, password} = await req.json();
                if (!email?.trim() || !password) return errorResponse("Email and password are required", headers, 400);
                const trimmedEmail = sanitizeEmail(email);
                const {data, error} = await supabase.from(USERS_TABLE).select("id, email, password_hash, salt").eq("email", trimmedEmail).single();
                if (error || !data) return errorResponse("Invalid credentials", headers, 401);
                const hash = await hashPassword(password, data.salt);
                if (hash !== data.password_hash) return errorResponse("Invalid credentials", headers, 401);
                await supabase.auth.signInWithPassword({email: trimmedEmail, password}).catch(() => {});
                return jsonResponse({userId: data.id, email: data.email}, headers);
            }
            case "sign-up": {
                const {email, password, firstName, lastName} = await req.json();
                if (!isValidEmail(email)) return errorResponse("Invalid email", headers, 400);
                if (passwordStrength(password).value === "weak") return errorResponse("Weak password", headers, 400);
                if (!firstName?.trim() || !lastName?.trim()) return errorResponse("First and last name are required", headers, 400);
                const trimmedEmail = sanitizeEmail(email);
                const {data: existingUser} = await supabase.from(USERS_TABLE).select("id").eq("email", trimmedEmail).single();
                if (existingUser) return errorResponse("Email already registered", headers, 409);
                const userId = crypto.randomUUID();
                const now = nowISO();
                const salt = generateSalt();
                const passwordHash = await hashPassword(password, salt);
                const {error: userError} = await supabase.from(USERS_TABLE).insert({
                    id: userId, email: trimmedEmail, password_hash: passwordHash, salt, created_at: now, updated_at: now
                });
                if (userError) return errorResponse(userError.message, headers, 500);
                const {data: createdUser, error: verifyError} = await supabase.from(USERS_TABLE).select("id").eq("id", userId).single();
                if (verifyError || !createdUser) return errorResponse("User creation failed", headers, 500);
                const profile = {id: userId, first_name: firstName.trim(), last_name: lastName.trim(), plant_code: "", created_at: now, updated_at: now};
                const {error: profileError} = await supabase.from(PROFILES_TABLE).insert(profile);
                if (profileError) {
                    await supabase.from(USERS_TABLE).delete().eq("id", userId);
                    return errorResponse(profileError.message, headers, 500);
                }
                await supabase.from(PREFERENCES_TABLE).insert({
                    user_id: userId, default_view_mode: null, mixer_filters: null, operator_filters: null,
                    manager_filters: null, tractor_filters: null, trailer_filters: null, equipment_filters: null,
                    last_viewed_filters: null, selected_region: null, region_overlay_minimized: true,
                    created_at: now, updated_at: now
                });
                return jsonResponse({userId, email: trimmedEmail}, headers);
            }
            case "sign-out": {
                await supabase.auth.signOut();
                return jsonResponse({success: true}, headers);
            }
            case "update-email": {
                const {email, userId} = await req.json();
                if (!userId) return errorResponse("No authenticated user", headers, 401);
                if (!isValidEmail(email)) return errorResponse("Invalid email", headers, 400);
                const trimmedEmail = sanitizeEmail(email);
                const {data: existingUser} = await supabase.from(USERS_TABLE).select("id").eq("email", trimmedEmail).neq("id", userId).single();
                if (existingUser) return errorResponse("Email already registered", headers, 409);
                const {error} = await supabase.from(USERS_TABLE).update({email: trimmedEmail, updated_at: nowISO()}).eq("id", userId);
                if (error) return errorResponse(error.message, headers, 500);
                return jsonResponse({success: true}, headers);
            }
            case "update-password": {
                const {password, userId} = await req.json();
                if (!userId) return errorResponse("No authenticated user", headers, 401);
                if (passwordStrength(password).value === "weak") return errorResponse("Weak password", headers, 400);
                const salt = generateSalt();
                const passwordHash = await hashPassword(password, salt);
                const {error} = await supabase.from(USERS_TABLE).update({password_hash: passwordHash, salt, updated_at: nowISO()}).eq("id", userId);
                if (error) return errorResponse(error.message, headers, 500);
                return jsonResponse({success: true}, headers);
            }
            case "restore-session": {
                const {userId} = await req.json();
                if (!userId) return jsonResponse({success: false}, headers);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Session restore timed out")), SESSION_RESTORE_TIMEOUT));
                try {
                    const {data, error} = await Promise.race([
                        supabase.from(USERS_TABLE).select("id, email").eq("id", userId).single(),
                        timeoutPromise
                    ] as const);
                    if ((error as unknown as Error) || !data) return jsonResponse({success: false}, headers);
                    return jsonResponse({success: true, user: {userId: data.id, email: data.email}}, headers);
                } catch (error) {
                    return jsonResponse({success: false, error: (error as Error).message}, headers);
                }
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500, {message: (error as Error).message});
    }
});
