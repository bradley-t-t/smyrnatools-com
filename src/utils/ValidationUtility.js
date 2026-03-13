import APIUtility from './APIUtility'
/**
 * Input validation primitives: VIN format checking with detailed error explanations,
 * natural VIN sorting, UUID validation, string/ID requirement guards, positive-integer
 * parsing, allowlist-based object property sanitization, edge-function-backed authentication
 * helpers (email validation, password strength, name normalization), and server-side
 * UUID operations (generation, format validation, sanitization).
 */
const AUTH_FUNCTION = '/auth-service'
const USER_UTILITY_FUNCTION = '/user-utility'
const ValidationUtility = {
    compareVINs(vinA, vinB) {
        const a = String(vinA || '').toUpperCase()
        const b = String(vinB || '').toUpperCase()
        if (!a && !b) return 0
        if (!a) return 1
        if (!b) return -1
        const parseVIN = (vin) => {
            const parts = []
            let currentPart = ''
            let isNumeric = null
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
                parts.push({ isNumeric, value: currentPart })
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
    },
    async emailIsValid(email) {
        const { res, json } = await APIUtility.post(`${AUTH_FUNCTION}/email-is-valid`, { email })
        return res.ok ? json.isValid === true : false
    },
    explainVIN(v) {
        const reasons = []
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
        if (!reasons.length && !this.isVIN(vin)) reasons.push('VIN does not meet required format')
        return { reasons, valid: reasons.length === 0 }
    },
    async generateUUID() {
        const { res, json } = await APIUtility.post(`${USER_UTILITY_FUNCTION}/generate-uuid`)
        return res.ok && json.uuid ? json.uuid : ''
    },
    isUUID(v) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
    },
    isVIN(v) {
        if (typeof v !== 'string') return false
        const vin = v.trim().toUpperCase()
        if (vin.length !== 17) return false
        if (/[^A-Z0-9]/.test(vin)) return false
        if (/[IOQ]/.test(vin)) return false
        if (/(NEED|UNKNOWN|PENDING|PLACEHOLDER)/.test(vin)) return false
        if (/^[A-Z0-9]$/.test(vin)) return false
        if (/^(.)\1{16}$/.test(vin)) return false
        return true
    },
    async isValidUUID(uuid) {
        const { res, json } = await APIUtility.post(`${USER_UTILITY_FUNCTION}/validate-uuid`, { uuid })
        return res.ok && typeof json.isValid === 'boolean' ? json.isValid : false
    },
    async normalizeName(name) {
        const { res, json } = await APIUtility.post(`${AUTH_FUNCTION}/normalize-name`, { name })
        return res.ok ? json.normalizedName || '' : ''
    },
    optionalString(v) {
        return typeof v === 'string' ? v.trim() : v
    },
    async passwordStrength(password) {
        const { res, json } = await APIUtility.post(`${AUTH_FUNCTION}/password-strength`, { password })
        return res.ok ? json.value || 'weak' : 'weak'
    },
    positiveInt(v, msg = 'Positive integer required') {
        const n = Number(v)
        if (!Number.isInteger(n) || n <= 0) throw new Error(msg)
        return n
    },
    requireId(v, msg = 'Id required') {
        if (v === undefined || v === null || v === '') throw new Error(msg)
        return v
    },
    requireString(v, msg = 'Value required') {
        if (typeof v !== 'string' || !v.trim()) throw new Error(msg)
        return v.trim()
    },
    requireUUID(v, msg = 'Invalid id') {
        if (!this.isUUID(v)) throw new Error(msg)
        return v
    },
    requireVIN(v, msg = 'Invalid VIN') {
        if (!this.isVIN(v)) throw new Error(msg)
        return v.trim().toUpperCase()
    },
    async safeUUID(uuid) {
        const { res, json } = await APIUtility.post(`${USER_UTILITY_FUNCTION}/safe-uuid`, { uuid })
        return res.ok ? json.safeUuid : null
    },
    sanitizeObject(o, allowed) {
        if (!o || typeof o !== 'object') return {}
        const out = {}
        allowed.forEach((k) => {
            if (o[k] !== undefined) out[k] = o[k]
        })
        return out
    }
}
export default ValidationUtility
export { ValidationUtility }
