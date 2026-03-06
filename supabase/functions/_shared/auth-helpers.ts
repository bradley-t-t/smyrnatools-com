/**
 * Shared authentication helpers used by auth-service and other edge functions.
 * Centralizes validation, sanitization, normalization, and role assignment
 * to eliminate duplication across auth-related endpoints.
 */

const USERS_ROLES_TABLE = "users_roles";
const USERS_PERMISSIONS_TABLE = "users_permissions";
const GUEST_ROLE_NAME = "Guest";
const GUEST_ROLE_WEIGHT = 10;
const GUEST_ROLE_PERMISSIONS = ["my_account.view"];
const MIN_PASSWORD_LENGTH = 10;
const WEAK_THRESHOLD = 4;
const MEDIUM_THRESHOLD = 5;
const RANDOM_PASSWORD_LENGTH = 16;
const RANDOM_PASSWORD_CHARSET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>]/;
const XSS_CHARS_REGEX = /[<>"'&]/g;

export function sanitizeString(str: unknown): string {
    return typeof str === "string" ? str.trim().replace(XSS_CHARS_REGEX, "") : "";
}

export function sanitizeEmail(email: string): string {
    return sanitizeString(email).toLowerCase();
}

export function isValidEmail(email: string): boolean {
    return EMAIL_REGEX.test(email);
}

export function normalizeName(val: unknown): string {
    const str = sanitizeString(val);
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";
}

export function nowISO(): string {
    return new Date().toISOString();
}

export function envOrDefault(key: string, fallback: string): string {
    return Deno.env.get(key) || fallback;
}

/** Scores password complexity on a 0–7 scale. */
export function scorePassword(password: string): number {
    if (!password || password.length < MIN_PASSWORD_LENGTH) return 0;
    let score = 0;
    if (password.length >= 10) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (SPECIAL_CHAR_REGEX.test(password)) score++;
    return score;
}

export function strengthLabel(score: number): string {
    return score < WEAK_THRESHOLD ? "weak" : score < MEDIUM_THRESHOLD ? "medium" : "strong";
}

export function validatePasswordStrength(password: string): { value: string; score: number } {
    const score = scorePassword(password);
    return {value: strengthLabel(score), score};
}

export function generateRandomPassword(): string {
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

async function createGuestRole(supabase: any, now: string): Promise<string | null> {
    const {data, error} = await supabase
        .from(USERS_ROLES_TABLE)
        .insert({name: GUEST_ROLE_NAME, permissions: GUEST_ROLE_PERMISSIONS, weight: GUEST_ROLE_WEIGHT, created_at: now, updated_at: now})
        .select()
        .single();
    return error ? null : data?.id ?? null;
}

/** Assigns the Guest role to a newly registered user, creating the role if it doesn't exist. */
export async function assignGuestRole(supabase: any, userId: string, now: string): Promise<void> {
    const {data: existingRole} = await supabase.from(USERS_ROLES_TABLE).select("id, name").eq("name", GUEST_ROLE_NAME).single();
    const roleId = existingRole?.id ?? (await createGuestRole(supabase, now));
    if (!roleId) return;
    await supabase.from(USERS_PERMISSIONS_TABLE).insert({user_id: userId, role_id: roleId, created_at: now, updated_at: now});
}

/** Builds the themed color config for transactional emails. */
export function buildThemeConfig(): Record<string, string> {
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

