const ValidationUtility = {
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
    optionalString(v) {
        return typeof v === 'string' ? v.trim() : v
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
