/**
 * Shared cryptographic helpers for password hashing with PBKDF2.
 * Includes backward-compatible SHA-256 verification for legacy passwords
 * and transparent re-hashing on successful legacy login.
 */

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH_BITS = 256;
const PBKDF2_PREFIX = "pbkdf2:";
const SALT_BYTE_LENGTH = 16;

export function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function generateSalt(): string {
    const randomBytes = new Uint8Array(SALT_BYTE_LENGTH);
    crypto.getRandomValues(randomBytes);
    return bytesToHex(randomBytes);
}

/** Hashes a password with PBKDF2 (100k iterations, SHA-256). Returns a prefixed hash string. */
export async function hashPassword(password: string, salt: string): Promise<string> {
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );
    const derived = await crypto.subtle.deriveBits(
        {name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: PBKDF2_ITERATIONS, hash: "SHA-256"},
        keyMaterial,
        PBKDF2_HASH_BITS
    );
    return PBKDF2_PREFIX + bytesToHex(new Uint8Array(derived));
}

/** Legacy single-pass SHA-256 hash for backward-compatible verification. */
export async function legacySha256Hash(password: string, salt: string): Promise<string> {
    const dataBuffer = new TextEncoder().encode(password + salt);
    const hash = await crypto.subtle.digest("SHA-256", dataBuffer);
    return bytesToHex(new Uint8Array(hash));
}

/**
 * Verifies a password against a stored hash. Supports both PBKDF2-prefixed
 * and legacy SHA-256 hashes. Returns `{valid, needsRehash}` so callers
 * can transparently upgrade legacy hashes on successful login.
 */
export async function verifyPassword(
    password: string,
    salt: string,
    storedHash: string
): Promise<{valid: boolean; needsRehash: boolean}> {
    if (storedHash.startsWith(PBKDF2_PREFIX)) {
        const computed = await hashPassword(password, salt);
        return {valid: computed === storedHash, needsRehash: false};
    }

    // Legacy SHA-256 path — flag for re-hash if valid
    const legacyHash = await legacySha256Hash(password, salt);
    return {valid: legacyHash === storedHash, needsRehash: legacyHash === storedHash};
}

/** Re-hashes a password with PBKDF2 and updates the user's credentials in the database. */
export async function rehashAndUpdate(
    supabase: any,
    userId: string,
    password: string,
    usersTable: string
): Promise<void> {
    const newSalt = generateSalt();
    const newHash = await hashPassword(password, newSalt);
    await supabase.from(usersTable).update({
        password_hash: newHash,
        salt: newSalt,
        updated_at: new Date().toISOString()
    }).eq("id", userId);
}

