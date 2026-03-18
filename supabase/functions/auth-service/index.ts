// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.55.0";
import {buildForgotPasswordEmail} from "../../../emails/forgot-passwords-email.js";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";
// @ts-ignore
import {sanitizeString, sanitizeEmail, isValidEmail, normalizeName, nowISO, envOrDefault, validatePasswordStrength, generateRandomPassword, assignGuestRole, buildThemeConfig, scorePassword, strengthLabel} from "../_shared/auth-helpers.ts";
// @ts-ignore
import {generateSalt, hashPassword, verifyPassword, rehashAndUpdate} from "../_shared/crypto-helpers.ts";

const USERS_TABLE = "users";
const PROFILES_TABLE = "users_profiles";
const PREFERENCES_TABLE = "users_preferences";
const PROFILE_SELECT_FIELDS = "first_name, last_name, plant_code";
const SESSION_RESTORE_TIMEOUT = 5000;
const MAILERSEND_API_URL = "https://api.mailersend.com/v1/email";
const DEFAULT_FRONTEND_URL = "https://smyrnatools.com";
const DEFAULT_FROM_NAME = "Smyrna Tools";
const DEFAULT_LOGO_URL = "https://smyrnatools.com/static/media/SmyrnaLogo.d7f873f3da1747602db3.png";
const RESET_PASSWORD_MESSAGE = "If an account exists for this email, a new password has been sent.";

const DEFAULT_BASE_FILTERS = {searchText: "", selectedPlant: "", statusFilter: "", viewMode: "grid"};
const DEFAULT_ROLE_FILTERS = {roleFilter: "", searchText: "", selectedPlant: "", viewMode: "grid"};

// ── In-memory rate limiting ──────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const rateLimitMap = new Map<string, {count: number; resetAt: number}>();

function isRateLimited(key: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(key);
    if (!entry || now >= entry.resetAt) {
        rateLimitMap.set(key, {count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS});
        return false;
    }
    entry.count++;
    return entry.count > RATE_LIMIT_MAX_ATTEMPTS;
}

function getRateLimitKey(req: Request, identifier: string): string {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    return `${ip}:${identifier}`;
}

// ── Elevated caller check for admin operations ────────────────────────
const ELEVATED_WEIGHT_THRESHOLD = 75;

async function requireElevatedCaller(supabase: any, headers: Record<string, string>): Promise<Response | null> {
    const {data: authResult, error: authErr} = await supabase.auth.getUser();
    if (authErr || !authResult?.user?.id) return errorResponse("Unauthorized", headers, 401);
    const {data: permissions} = await supabase.from("users_permissions").select("role_id, users_roles(weight)").eq("user_id", authResult.user.id);
    const isElevated = permissions?.some((p: any) => (p.users_roles?.weight ?? 0) > ELEVATED_WEIGHT_THRESHOLD);
    if (!isElevated) return errorResponse("Forbidden: insufficient privileges", headers, 403);
    return null;
}

function createSupabaseClient(req: Request) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseKey) throw new Error("Server configuration error");
    return createClient(supabaseUrl, supabaseKey, {
        global: {headers: {Authorization: req.headers.get("Authorization") || ""}}
    });
}

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const headers = getCorsHeaders(origin);
    try {
        const url = new URL(req.url);
        const endpoint = url.pathname.split("/").pop();
        const supabase = createSupabaseClient(req);

        switch (endpoint) {

            // ── Authentication ────────────────────────────────────────

            case "sign-in": {
                const {email, password} = await req.json();
                if (!email?.trim() || !password) return errorResponse("Email and password are required", headers, 400);
                const trimmedEmail = sanitizeEmail(email);
                if (!isValidEmail(trimmedEmail)) return errorResponse("Invalid email format", headers, 400);
                if (isRateLimited(getRateLimitKey(req, `sign-in:${trimmedEmail}`))) return errorResponse("Too many login attempts. Please try again later.", headers, 429);

                const {data, error} = await supabase.from(USERS_TABLE).select("id, email, password_hash, salt").eq("email", trimmedEmail).single();
                if (error || !data) return errorResponse("Invalid credentials", headers, 401);

                const {valid, needsRehash} = await verifyPassword(password, data.salt, data.password_hash);
                if (!valid) return errorResponse("Invalid credentials", headers, 401);

                // Transparently upgrade legacy SHA-256 hashes to PBKDF2
                if (needsRehash) {
                    rehashAndUpdate(supabase, data.id, password, USERS_TABLE).catch(() => {});
                }

                // Stamp last login date (fire-and-forget)
                supabase.from(USERS_TABLE).update({ last_login_at: new Date().toISOString().split("T")[0] }).eq("id", data.id).then(() => {}).catch(() => {});

                const {data: profile} = await supabase.from(PROFILES_TABLE).select(PROFILE_SELECT_FIELDS).eq("id", data.id).single();
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
                const salt = generateSalt();
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

                await Promise.all([
                    supabase.from(PREFERENCES_TABLE).upsert({
                        user_id: userId, default_view_mode: null,
                        equipment_filters: DEFAULT_BASE_FILTERS, mixer_filters: DEFAULT_BASE_FILTERS,
                        operator_filters: DEFAULT_BASE_FILTERS, tractor_filters: DEFAULT_BASE_FILTERS,
                        trailer_filters: DEFAULT_BASE_FILTERS, manager_filters: DEFAULT_ROLE_FILTERS,
                        last_viewed_filters: null, selected_region: null, region_overlay_minimized: true,
                        created_at: now, updated_at: now
                    }, {onConflict: "user_id"}),
                    assignGuestRole(supabase, userId, now)
                ]);

                return jsonResponse({id: userId, email: trimmedEmail, profile}, headers);
            }

            case "sign-out": {
                await supabase.auth.signOut().catch(() => {});
                return jsonResponse({success: true}, headers);
            }

            // ── Session Management ────────────────────────────────────

            case "restore-session": {
                const {userId, sessionId} = await req.json();
                if (!userId) return jsonResponse({success: false}, headers);

                // Verify the session ID matches the user in the database to prevent IDOR
                if (sessionId) {
                    const {data: sessionData} = await supabase.from("users_sessions").select("id").eq("id", sessionId).eq("user_id", userId).maybeSingle();
                    if (!sessionData) return jsonResponse({success: false}, headers);
                }

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Session restore timed out")), SESSION_RESTORE_TIMEOUT)
                );
                try {
                    const {data, error} = await Promise.race([
                        supabase.from(USERS_TABLE).select("id, email").eq("id", userId).single(),
                        timeoutPromise
                    ] as const);
                    if ((error as unknown as Error) || !data) return jsonResponse({success: false}, headers);

                    const {data: profile} = await supabase.from(PROFILES_TABLE).select(PROFILE_SELECT_FIELDS).eq("id", data.id).single();
                    return jsonResponse({success: true, user: {id: data.id, email: data.email, profile: profile ?? {}}}, headers);
                } catch {
                    return jsonResponse({success: false}, headers);
                }
            }

            // ── Profile ───────────────────────────────────────────────

            case "load-profile": {
                const {userId, sessionId} = await req.json();
                if (!userId) return errorResponse("User ID required", headers, 400);

                // Verify the session ID matches the user to prevent IDOR
                if (sessionId) {
                    const {data: sessionData} = await supabase.from("users_sessions").select("id").eq("id", sessionId).eq("user_id", userId).maybeSingle();
                    if (!sessionData) return errorResponse("Unauthorized", headers, 401);
                }

                const {data: profileData, error} = await supabase.from(PROFILES_TABLE).select(PROFILE_SELECT_FIELDS).eq("id", userId).single();
                if (error) return errorResponse("Failed to load profile", headers, 500);
                return jsonResponse({profile: profileData ?? {}}, headers);
            }

            case "update-profile": {
                const {userId, firstName, lastName, plantCode} = await req.json();
                if (!userId || !firstName || !lastName) return errorResponse("User ID, first name, and last name required", headers, 400);
                const {data: authData, error: authError} = await supabase.auth.getUser();
                if (authError || !authData?.user?.id) return errorResponse("Unauthorized", headers, 401);
                if (authData.user.id !== userId) return errorResponse("Forbidden", headers, 403);
                const normFirst = normalizeName(firstName);
                const normLast = normalizeName(lastName);
                if (!normFirst || !normLast) return errorResponse("Invalid name format", headers, 400);
                const {error} = await supabase.from(PROFILES_TABLE).update({
                    first_name: normFirst, last_name: normLast, plant_code: sanitizeString(plantCode) || "", updated_at: nowISO()
                }).eq("id", userId);
                if (error) return errorResponse("Failed to update profile", headers, 500);
                return jsonResponse({success: true, profile: {first_name: normFirst, last_name: normLast, plant_code: plantCode || ""}}, headers);
            }

            // ── Credential Updates ────────────────────────────────────

            case "update-email": {
                const {email, userId} = await req.json();
                if (!userId) return errorResponse("No authenticated user", headers, 401);
                const {data: authData, error: authError} = await supabase.auth.getUser();
                if (authError || !authData?.user?.id) return errorResponse("Unauthorized", headers, 401);
                if (authData.user.id !== userId) return errorResponse("Forbidden", headers, 403);
                if (!isValidEmail(email)) return errorResponse("Invalid email", headers, 400);
                const trimmedEmail = sanitizeEmail(email);
                const {data: existingUser} = await supabase.from(USERS_TABLE).select("id").eq("email", trimmedEmail).neq("id", userId).single();
                if (existingUser) return errorResponse("Email already registered", headers, 409);
                const {error} = await supabase.from(USERS_TABLE).update({email: trimmedEmail, updated_at: nowISO()}).eq("id", userId);
                if (error) return errorResponse("Failed to update email", headers, 500);
                return jsonResponse({success: true}, headers);
            }

            case "update-password": {
                const {password, userId} = await req.json();
                if (!userId) return errorResponse("No authenticated user", headers, 401);
                const {data: authData, error: authError} = await supabase.auth.getUser();
                if (authError || !authData?.user?.id) return errorResponse("Unauthorized", headers, 401);
                if (authData.user.id !== userId) return errorResponse("Forbidden", headers, 403);
                if (validatePasswordStrength(password).value === "weak") return errorResponse("Weak password", headers, 400);
                const salt = generateSalt();
                const passwordHash = await hashPassword(password, salt);
                const {error} = await supabase.from(USERS_TABLE).update({password_hash: passwordHash, salt, updated_at: nowISO()}).eq("id", userId);
                if (error) return errorResponse("Failed to update password", headers, 500);
                return jsonResponse({success: true}, headers);
            }

            case "verify-password": {
                const {userId, currentPassword} = await req.json();
                if (!userId || !currentPassword) return errorResponse("User ID and current password are required", headers, 400);
                const {data: authData, error: authError} = await supabase.auth.getUser();
                if (authError || !authData?.user?.id) return errorResponse("Unauthorized", headers, 401);
                if (authData.user.id !== userId) return errorResponse("Forbidden", headers, 403);
                const {data, error} = await supabase.from(USERS_TABLE).select("id, password_hash, salt").eq("id", userId).single();
                if (error || !data) return errorResponse("User not found", headers, 404);
                const {valid} = await verifyPassword(currentPassword, data.salt, data.password_hash);
                if (!valid) return errorResponse("Current password is incorrect", headers, 401);
                return jsonResponse({success: true}, headers);
            }

            // ── Password Reset ────────────────────────────────────────

            case "reset-password": {
                const {email} = await req.json();
                const genericResponse = jsonResponse({message: RESET_PASSWORD_MESSAGE}, headers);
                if (!isValidEmail(email)) return genericResponse;
                const trimmedEmail = sanitizeEmail(email);
                if (isRateLimited(getRateLimitKey(req, `reset:${trimmedEmail}`))) return genericResponse;
                const {data: user, error: userErr} = await supabase.from(USERS_TABLE).select("id").eq("email", trimmedEmail).single();
                if (userErr || !user) return genericResponse;

                const newPassword = generateRandomPassword();
                if (validatePasswordStrength(newPassword).value === "weak") return genericResponse;
                const salt = generateSalt();
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
                } catch {
                    return genericResponse;
                }
                return genericResponse;
            }

            // ── Auth Utilities ────────────────────────────────────────

            case "password-strength": {
                const {password} = await req.json();
                if (!password || password.length < 10) return jsonResponse({value: "weak"}, headers);
                return jsonResponse({value: strengthLabel(scorePassword(password))}, headers);
            }

            case "email-is-valid": {
                const {email} = await req.json();
                if (!email) return errorResponse("Email is required", headers, 400);
                return jsonResponse({isValid: isValidEmail(email)}, headers);
            }

            case "normalize-name": {
                const {name} = await req.json();
                if (!name) return errorResponse("Name is required", headers, 400);
                return jsonResponse({normalizedName: normalizeName(name)}, headers);
            }

            // ── Admin Operations ─────────────────────────────────────

            case "admin-update-password": {
                const authErr = await requireElevatedCaller(supabase, headers);
                if (authErr) return authErr;
                const {userId, password} = await req.json();
                if (!userId || !password) return errorResponse("User ID and password are required", headers, 400);
                if (validatePasswordStrength(password).value === "weak") return errorResponse("Password is too weak", headers, 400);
                const salt = generateSalt();
                const passwordHash = await hashPassword(password, salt);
                const {error} = await supabase.from(USERS_TABLE).update({password_hash: passwordHash, salt, updated_at: nowISO()}).eq("id", userId);
                if (error) return errorResponse("Failed to update password", headers, 500);
                return jsonResponse({success: true}, headers);
            }

            // ── Session Management ────────────────────────────────────

            case "create-session": {
                const {userId, sessionId, browser, os, device, userAgent} = await req.json();
                if (!userId || !sessionId) return errorResponse("userId and sessionId are required", headers, 400);
                const now = nowISO();
                const {error} = await supabase.from("users_sessions").upsert(
                    {id: sessionId, user_id: userId, browser: browser || null, os: os || null, device: device || null, user_agent: userAgent || null, created_at: now, last_active: now},
                    {onConflict: "id"}
                );
                if (error) return errorResponse("Failed to create session", headers, 500);
                return jsonResponse({success: true}, headers);
            }

            case "delete-session": {
                const {sessionId} = await req.json();
                if (!sessionId) return errorResponse("sessionId is required", headers, 400);
                await supabase.from("users_sessions").delete().eq("id", sessionId);
                return jsonResponse({success: true}, headers);
            }

            case "validate-session": {
                const {userId, sessionId} = await req.json();
                if (!userId || !sessionId) return jsonResponse({valid: false}, headers);
                const {data, error} = await supabase.from("users_sessions").select("id, last_active").eq("id", sessionId).eq("user_id", userId).maybeSingle();
                if (error || !data) return jsonResponse({valid: false}, headers);
                // Refresh last_active (fire-and-forget)
                supabase.from("users_sessions").update({last_active: nowISO()}).eq("id", sessionId).then(() => {}).catch(() => {});
                return jsonResponse({valid: true, lastActive: data.last_active}, headers);
            }

            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500);
    }
});
