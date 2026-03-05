import APIUtility from './APIUtility'

/**
 * Edge-function-backed authentication helpers for email validation,
 * password strength checking, and name normalization.
 * Password hashing and salt generation are now server-side only.
 */
const AUTH_FUNCTION = '/auth-service'

const AuthUtility = {
    async emailIsValid(email) {
        const { res, json } = await APIUtility.post(`${AUTH_FUNCTION}/email-is-valid`, { email })
        return res.ok ? json.isValid === true : false
    },
    async normalizeName(name) {
        const { res, json } = await APIUtility.post(`${AUTH_FUNCTION}/normalize-name`, { name })
        return res.ok ? json.normalizedName || '' : ''
    },
    async passwordStrength(password) {
        const { res, json } = await APIUtility.post(`${AUTH_FUNCTION}/password-strength`, { password })
        return res.ok ? json.value || 'weak' : 'weak'
    }
}

export default AuthUtility
export { AuthUtility }
