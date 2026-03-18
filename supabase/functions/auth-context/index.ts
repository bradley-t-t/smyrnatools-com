// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.55.0";
import {buildForgotPasswordEmail} from "../../../emails/forgot-passwords-email.js";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const USERS_TABLE = "users";
const PROFILES_TABLE = "users_profiles";
const PERMISSIONS_TABLE = "users_permissions";
const ROLES_TABLE = "users_roles";
const PROFILE_SELECT = "first_name, last_name, plant_code";
const GUEST_ROLE_NAME = "Guest";
const GUEST_ROLE_WEIGHT = 10;
const GUEST_ROLE_PERMISSIONS = ["my_account.view"];
const RANDOM_PASSWORD_LENGTH = 16;
const RANDOM_PASSWORD_CHARSET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
const MIN_PASSWORD_LENGTH = 10;
const WEAK_THRESHOLD = 4;
const MEDIUM_THRESHOLD = 5;
const MAILERSEND_API_URL = "https://api.mailersend.com/v1/email";
const DEFAULT_FRONTEND_URL = "https://smyrnatools.com";
const DEFAULT_FROM_NAME = "Smyrna Tools";
const DEFAULT_LOGO_URL = "https://smyrnatools.com/static/media/SmyrnaLogo.d7f873f3da1747602db3.png";
const RESET_PASSWORD_MESSAGE = "If an account exists for this email, a new password has been sent.";

function sanitizeString(str: unknown): string {
    return typeof str === "string" ? str.trim().replace(/[<>"'&]/g, "") : "";
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePasswordStrength(password: string): { value: string; score: number } {
    if (!password || password.length < MIN_PASSWORD_LENGTH) return {value: "weak", score: 0};
    let score = 0;
    if (password.length >= 10) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    return {value: score < WEAK_THRESHOLD ? "weak" : score < MEDIUM_THRESHOLD ? "medium" : "strong", score};
}

function generateRandomPassword(): string {
    const charsetLen = RANDOM_PASSWORD_CHARSET.length;
    const limit = 256 - (256 % charsetLen);
    const result: string[] = [];
    while (result.length < RANDOM_PASSWORD_LENGTH) {
        const randomBytes = new Uint8Array(RANDOM_PASSWORD_LENGTH * 2);
        crypto.getRandomValues(randomBytes);
        for (const byte of randomBytes) {
            if (byte < limit && result.length < RANDOM_PASSWORD_LENGTH) {
                result.push(RANDOM_PASSWORD_CHARSET[byte % charsetLen]);
            }
        }
    }
    return result.join("");
}

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function generateSalt(): Promise<string> {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    return bytesToHex(randomBytes);
}

async function hashPassword(password: string, salt: string): Promise<string> {
    const dataBuffer = new TextEncoder().encode(password + salt);
    const hash = await crypto.subtle.digest("SHA-256", dataBuffer);
    return bytesToHex(new Uint8Array(hash));
}

function normalizeName(val: unknown): string {
    const str = sanitizeString(val);
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";
}

function nowISO(): string {
    return new Date().toISOString();
}

function sanitizeEmail(email: string): string {
    return sanitizeString(email).toLowerCase();
}

function envOrDefault(key: string, fallback: string): string {
    return Deno.env.get(key) || fallback;
}

async function assignGuestRole(supabase: any, userId: string, now: string): Promise<void> {
    const {data: existingRole} = await supabase.from(ROLES_TABLE).select("id, name").eq("name", GUEST_ROLE_NAME).single();
    const roleId = existingRole?.id ?? (await createGuestRole(supabase, now));
    if (!roleId) return;
    await supabase.from(PERMISSIONS_TABLE).insert({user_id: userId, role_id: roleId, created_at: now, updated_at: now});
}

async function createGuestRole(supabase: any, now: string): Promise<string | null> {
    const {data, error} = await supabase
        .from(ROLES_TABLE)
        .insert({name: GUEST_ROLE_NAME, permissions: GUEST_ROLE_PERMISSIONS, weight: GUEST_ROLE_WEIGHT, created_at: now, updated_at: now})
        .select()
        .single();
    return error ? null : data?.id ?? null;
}

function buildThemeConfig(): Record<string, string> {
    return {
        white: envOrDefault("THEME_COLOR_WHITE", ""),
        bgDark: envOrDefault("THEME_COLOR_BG_DARK", ""),
        bgLight: envOrDefault("THEME_COLOR_BG_LIGHT", ""),
        text: envOrDefault("THEME_COLOR_TEXT", ""),
        textMuted: envOrDefault("THEME_COLOR_TEXT_MUTED", ""),
        brand: envOrDefault("THEME_COLOR_PRIMARY", ""),
        border: envOrDefault("THEME_COLOR_BORDER", ""),
        onBrand: envOrDefault("THEME_COLOR_ON_PRIMARY", "")
    };
}

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const headers = getCorsHeaders(origin);
    try {
        const url = new URL(req.url);
        const endpoint = url.pathname.split("/").pop();
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
        if (!supabaseUrl || !supabaseKey) return errorResponse("Server configuration error", headers, 500);
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: {headers: {Authorization: req.headers.get("Authorization") || ""}}
        });

        switch (endpoint) {
            case "sign-in": {
                const {email, password} = await req.json();
                if (!email || !password) return errorResponse("Email and password are required", headers, 400);
                const trimmedEmail = sanitizeEmail(email);
                if (!isValidEmail(trimmedEmail)) return errorResponse("Invalid email format", headers, 400);
                const {data, error} = await supabase.from(USERS_TABLE).select("id, email, password_hash, salt").eq("email", trimmedEmail).single();
                if (error || !data) return errorResponse("Invalid credentials", headers, 401);
                const hash = await hashPassword(password, data.salt);
                if (hash !== data.password_hash) return errorResponse("Invalid credentials", headers, 401);
                const {data: profile} = await supabase.from(PROFILES_TABLE).select(PROFILE_SELECT).eq("id", data.id).single();
                return jsonResponse({id: data.id, email: data.email, profile: profile ?? {}}, headers);
            }
            case "sign-up": {
                const {email, password, firstName, lastName} = await req.json();
                if (!email || !password || !firstName || !lastName) return errorResponse("All fields are required", headers, 400);
                const trimmedEmail = sanitizeEmail(email);
                if (!isValidEmail(trimmedEmail)) return errorResponse("Invalid email format", headers, 400);
                if (validatePasswordStrength(password).value === "weak") return errorResponse("Password is too weak", headers, 400);
                const normFirst = normalizeName(firstName);
                const normLast = normalizeName(lastName);
                if (!normFirst || !normLast) return errorResponse("Invalid name format", headers, 400);
                const {data: existingUsers} = await supabase.from(USERS_TABLE).select("id").eq("email", trimmedEmail);
                if (existingUsers?.length) return errorResponse("Email already registered", headers, 409);
                const userId = crypto.randomUUID();
                const now = nowISO();
                const salt = await generateSalt();
                const passwordHash = await hashPassword(password, salt);
                const {error: userError} = await supabase.from(USERS_TABLE).insert({
                    id: userId, email: trimmedEmail, password_hash: passwordHash, salt, created_at: now, updated_at: now
                });
                if (userError) return errorResponse("User creation failed", headers, 500);
                const profile = {id: userId, first_name: normFirst, last_name: normLast, plant_code: "", created_at: now, updated_at: now};
                const {error: profileError} = await supabase.from(PROFILES_TABLE).insert(profile);
                if (profileError) {
                    await supabase.from(USERS_TABLE).delete().eq("id", userId);
                    return errorResponse("Profile creation failed", headers, 500);
                }
                await assignGuestRole(supabase, userId, now);
                return jsonResponse({id: userId, email: trimmedEmail, profile}, headers);
            }
            case "sign-out": {
                await supabase.auth.signOut();
                return jsonResponse({success: true}, headers);
            }
            case "restore-session": {
                const {userId, sessionId} = await req.json();
                if (!userId) return errorResponse("User ID required", headers, 400);
                if (sessionId) {
                    const {data: sessionData} = await supabase.from("users_sessions").select("id").eq("id", sessionId).eq("user_id", userId).maybeSingle();
                    if (!sessionData) return errorResponse("Invalid session", headers, 401);
                }
                const {data: user, error} = await supabase.from(USERS_TABLE).select("id, email").eq("id", userId).single();
                if (error || !user) return errorResponse("User not found", headers, 404);
                const {data: profile} = await supabase.from(PROFILES_TABLE).select(PROFILE_SELECT).eq("id", userId).single();
                return jsonResponse({success: true, user: {id: user.id, email: user.email, profile: profile ?? {}}}, headers);
            }
            case "load-profile": {
                const {userId, sessionId} = await req.json();
                if (!userId) return errorResponse("User ID required", headers, 400);
                if (sessionId) {
                    const {data: sessionData} = await supabase.from("users_sessions").select("id").eq("id", sessionId).eq("user_id", userId).maybeSingle();
                    if (!sessionData) return errorResponse("Unauthorized", headers, 401);
                }
                const {data: profileData, error} = await supabase.from(PROFILES_TABLE).select(PROFILE_SELECT).eq("id", userId).single();
                if (error) return errorResponse("Failed to load profile", headers, 500);
                return jsonResponse({profile: profileData ?? {}}, headers);
            }
            case "update-profile": {
                const {userId, firstName, lastName, plantCode} = await req.json();
                if (!userId || !firstName || !lastName) return errorResponse("User ID, first name, and last name required", headers, 400);
                const authUserId = req.headers.get("x-user-id");
                const authSessionId = req.headers.get("x-session-id");
                if (!authUserId || !authSessionId) return errorResponse("Unauthorized", headers, 401);
                const {data: sessionData, error: sessionErr} = await supabase.from("users_sessions").select("id, last_active").eq("id", authSessionId).eq("user_id", authUserId).maybeSingle();
                if (sessionErr || !sessionData) return errorResponse("Unauthorized", headers, 401);
                if (sessionData.last_active) {
                    const lastActive = new Date(sessionData.last_active);
                    const expiryDate = new Date();
                    expiryDate.setDate(expiryDate.getDate() - 7);
                    if (lastActive < expiryDate) return errorResponse("Session expired", headers, 401);
                }
                supabase.from("users_sessions").update({last_active: new Date().toISOString()}).eq("id", authSessionId).then(() => {}).catch(() => {});
                if (authUserId !== userId) return errorResponse("Forbidden", headers, 403);
                const normFirst = normalizeName(firstName);
                const normLast = normalizeName(lastName);
                if (!normFirst || !normLast) return errorResponse("Invalid name format", headers, 400);
                const {error} = await supabase.from(PROFILES_TABLE).update({
                    first_name: normFirst, last_name: normLast, plant_code: sanitizeString(plantCode) || "", updated_at: nowISO()
                }).eq("id", userId);
                if (error) return errorResponse("Failed to update profile", headers, 500);
                return jsonResponse({success: true, profile: {first_name: normFirst, last_name: normLast, plant_code: plantCode || ""}}, headers);
            }
            case "reset-password": {
                const {email} = await req.json();
                const genericResponse = jsonResponse({message: RESET_PASSWORD_MESSAGE}, headers);
                if (!isValidEmail(email)) return genericResponse;
                const trimmedEmail = sanitizeEmail(email);
                const {data: user, error: userErr} = await supabase.from(USERS_TABLE).select("id").eq("email", trimmedEmail).single();
                if (userErr || !user) return genericResponse;
                const newPassword = generateRandomPassword();
                if (validatePasswordStrength(newPassword).value === "weak") return genericResponse;
                const salt = await generateSalt();
                const passwordHash = await hashPassword(newPassword, salt);
                const {error: updateError} = await supabase.from(USERS_TABLE).update({
                    password_hash: passwordHash, salt, updated_at: nowISO()
                }).eq("id", user.id);
                if (updateError) return genericResponse;
                const mailerSendToken = Deno.env.get("MAILERSEND_API_TOKEN");
                const fromEmail = Deno.env.get("MAILERSEND_FROM_EMAIL");
                if (!mailerSendToken || !fromEmail) return genericResponse;
                const loginUrl = `${envOrDefault("FRONTEND_URL", DEFAULT_FRONTEND_URL)}/login`;
                const {subject, text, html} = buildForgotPasswordEmail({
                    newPassword, loginUrl, theme: buildThemeConfig(), logoUrl: envOrDefault("LOGO_URL", DEFAULT_LOGO_URL)
                });
                try {
                    const response = await fetch(MAILERSEND_API_URL, {
                        method: "POST",
                        headers: {Authorization: `Bearer ${mailerSendToken}`, "Content-Type": "application/json"},
                        body: JSON.stringify({
                            from: {email: fromEmail, name: envOrDefault("MAILERSEND_FROM_NAME", DEFAULT_FROM_NAME)},
                            to: [{email: trimmedEmail}],
                            subject, text, html
                        })
                    });
                    if (!response.ok) return genericResponse;
                } catch (_) {
                    return genericResponse;
                }
                return genericResponse;
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
