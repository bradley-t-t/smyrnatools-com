import APIUtility from './APIUtility'
/**
 * Input validation primitives: VIN format checking with detailed error explanations,
 * natural VIN sorting, UUID validation, string/ID requirement guards, positive-integer
 * parsing, allowlist-based object property sanitization, edge-function-backed authentication
 * helpers (password strength, name normalization), and server-side
 * UUID operations (generation, format validation, sanitization).
 */
const USER_UTILITY_FUNCTION = '/user-utility'

interface VINPart {
    isNumeric: boolean
    value: string
}

interface VINExplanation {
    reasons: string[]
    valid: boolean
}

function compareVINs(vinA: string | null | undefined, vinB: string | null | undefined): number {
    const a = String(vinA || '').toUpperCase()
    const b = String(vinB || '').toUpperCase()
    if (!a && !b) return 0
    if (!a) return 1
    if (!b) return -1
    const parseVIN = (vin: string): VINPart[] => {
        const parts: VINPart[] = []
        let currentPart = ''
        let isNumeric: boolean | null = null
        for (let i = 0; i < vin.length; i++) {
            const char = vin[i]
            const charIsNumeric = /\d/.test(char)
            if (isNumeric === null) {
                isNumeric = charIsNumeric
                currentPart = char
            } else if (isNumeric === charIsNumeric) {
                currentPart += char
            } else {
                parts.push({ isNumeric, value: currentPart })
                currentPart = char
                isNumeric = charIsNumeric
            }
        }
        if (currentPart) {
            parts.push({ isNumeric: isNumeric!, value: currentPart })
        }
        return parts
    }
    const partsA = parseVIN(a)
    const partsB = parseVIN(b)
    const maxLength = Math.max(partsA.length, partsB.length)
    for (let i = 0; i < maxLength; i++) {
        const partA = partsA[i]
        const partB = partsB[i]
        if (!partA) return -1
        if (!partB) return 1
        if (partA.isNumeric && partB.isNumeric) {
            const numA = parseInt(partA.value, 10)
            const numB = parseInt(partB.value, 10)
            if (numA !== numB) return numA - numB
        } else {
            const comparison = partA.value.localeCompare(partB.value)
            if (comparison !== 0) return comparison
        }
    }
    return 0
}

function isVIN(v: unknown): boolean {
    if (typeof v !== 'string') return false
    const vin = v.trim().toUpperCase()
    if (vin.length !== 17) return false
    if (/[^A-Z0-9]/.test(vin)) return false
    if (/[IOQ]/.test(vin)) return false
    if (/(NEED|UNKNOWN|PENDING|PLACEHOLDER)/.test(vin)) return false
    if (/^[A-Z0-9]$/.test(vin)) return false
    if (/^(.)\1{16}$/.test(vin)) return false
    return true
}

function isUUID(v: unknown): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v))
}

function explainVIN(v: unknown): VINExplanation {
    const reasons: string[] = []
    if (typeof v !== 'string') {
        reasons.push('VIN must be a string')
        return { reasons, valid: false }
    }
    const vin = v.trim().toUpperCase()
    if (!vin) reasons.push('VIN is required')
    if (vin.length && vin.length !== 17) reasons.push('VIN must be exactly 17 characters')
    if (/[^A-Z0-9]/.test(vin)) reasons.push('VIN can only contain letters A-Z and numbers 0-9')
    if (/[IOQ]/.test(vin)) reasons.push('VIN cannot contain the letters I, O, or Q')
    if (/(NEED|UNKNOWN|PENDING|PLACEHOLDER)/.test(vin)) reasons.push('Placeholder values are not allowed')
    if (/^(.)\1{16}$/.test(vin)) reasons.push('VIN cannot be the same character repeated')
    if (!reasons.length && !isVIN(vin)) reasons.push('VIN does not meet required format')
    return { reasons, valid: reasons.length === 0 }
}

async function generateUUID(): Promise<string> {
    const { res, json } = await APIUtility.post(`${USER_UTILITY_FUNCTION}/generate-uuid`)
    return res.ok && json.uuid ? (json.uuid as string) : ''
}

async function isValidUUID(uuid: string): Promise<boolean> {
    const { res, json } = await APIUtility.post(`${USER_UTILITY_FUNCTION}/validate-uuid`, { uuid })
    return res.ok && typeof json.isValid === 'boolean' ? json.isValid : false
}

/** Title-cases the first character, lowercases the rest, after a basic
 *  trim. Mirrors `normalizeName` on the server (`auth-helpers.ts`) so the
 *  values sent to `/auth-service/sign-up` match what the server validates.
 *
 *  Originally a network round-trip to `/auth-service/normalize-name`. That
 *  was fragile — any failure (preflight, transient 5xx, network blip)
 *  silently returned an empty string and the sign-up call below would
 *  reject with "All fields are required". Inlining the logic kills the
 *  failure mode and removes a pointless round-trip; the server still
 *  enforces the same shape on the actual sign-up request. */
function normalizeName(name: string): string {
    const trimmed = String(name || '').trim()
    if (!trimmed) return ''
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
}

function optionalString(v: unknown): string | typeof v {
    return typeof v === 'string' ? v.trim() : v
}

/** Returns 'weak' | 'medium' | 'strong' for the supplied password. Mirrors
 *  the server-side `validatePasswordStrength` (`auth-helpers.ts`) so the
 *  client-side strength meter reads the same scale the server uses to
 *  accept or reject the password on the actual sign-up request.
 *
 *  Originally a network round-trip to `/auth-service/password-strength`.
 *  When the call failed (preflight, anon-key, transient 5xx) the helper
 *  silently returned 'weak', making the meter show weak forever even on
 *  a genuinely strong password. Inlining the scoring removes the failure
 *  mode; the server still re-validates on submit.
 *
 *  Scoring keeps the server's exact thresholds:
 *    score < 4 → weak, score 4 → medium, score >= 5 → strong. */
function passwordStrength(password: string): string {
    const value = String(password || '')
    if (!value || value.length < 10) return 'weak'
    let score = 0
    if (value.length >= 10) score += 1
    if (value.length >= 12) score += 1
    if (value.length >= 16) score += 1
    if (/[A-Z]/.test(value)) score += 1
    if (/[a-z]/.test(value)) score += 1
    if (/[0-9]/.test(value)) score += 1
    if (/[^A-Za-z0-9]/.test(value)) score += 1
    if (score < 4) return 'weak'
    if (score < 5) return 'medium'
    return 'strong'
}

function positiveInt(v: unknown, msg = 'Positive integer required'): number {
    const n = Number(v)
    if (!Number.isInteger(n) || n <= 0) throw new Error(msg)
    return n
}

function requireId<T>(v: T | undefined | null | '', msg = 'Id required'): T {
    if (v === undefined || v === null || v === '') throw new Error(msg)
    return v as T
}

function requireString(v: unknown, msg = 'Value required'): string {
    if (typeof v !== 'string' || !v.trim()) throw new Error(msg)
    return v.trim()
}

function requireUUID(v: unknown, msg = 'Invalid id'): string {
    if (!isUUID(v)) throw new Error(msg)
    return v as string
}

function requireVIN(v: unknown, msg = 'Invalid VIN'): string {
    if (!isVIN(v)) throw new Error(msg)
    return (v as string).trim().toUpperCase()
}

async function safeUUID(uuid: string): Promise<string | null> {
    const { res, json } = await APIUtility.post(`${USER_UTILITY_FUNCTION}/safe-uuid`, { uuid })
    return res.ok ? (json.safeUuid as string) : null
}

function sanitizeObject<T extends Record<string, unknown>>(o: unknown, allowed: string[]): Partial<T> {
    if (!o || typeof o !== 'object') return {} as Partial<T>
    const out: Record<string, unknown> = {}
    allowed.forEach((k) => {
        if ((o as Record<string, unknown>)[k] !== undefined) out[k] = (o as Record<string, unknown>)[k]
    })
    return out as Partial<T>
}

const ValidationUtility = {
    compareVINs,
    explainVIN,
    generateUUID,
    isUUID,
    isVIN,
    isValidUUID,
    normalizeName,
    optionalString,
    passwordStrength,
    positiveInt,
    requireId,
    requireString,
    requireUUID,
    requireVIN,
    safeUUID,
    sanitizeObject
}
export default ValidationUtility
export { ValidationUtility }
