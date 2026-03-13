/**
 * User display helpers — initials extraction and name formatting.
 */
const UserUtility = {
    /**
     * Extracts up to two-letter initials from a display name.
     * Returns '?' for missing, 'Unknown', or 'Loading...' names.
     * @param {string} name
     * @returns {string} Uppercase initials (e.g. "JD" for "John Doe").
     */
    getInitials(name) {
        if (!name || name === 'Unknown' || name === 'Loading...') return '?'
        const parts = name.trim().split(' ').filter(Boolean)
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        return name.slice(0, 2).toUpperCase()
    }
}
export default UserUtility
export { UserUtility }
