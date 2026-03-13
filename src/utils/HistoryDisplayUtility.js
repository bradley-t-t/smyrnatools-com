/**
 * Shared display formatting for asset history values.
 * Centralizes date localization, rating labels, null-operator normalization,
 * and date comparison logic used across Mixer, Tractor, and Operator history models.
 */

const CLEANLINESS_LABELS = {
    1: 'Poor (1)',
    2: 'Fair (2)',
    3: 'Good (3)',
    4: 'Very Good (4)',
    5: 'Excellent (5)'
}

const HistoryDisplayUtility = {
    /**
     * Formats a date-type history value for display using locale formatting.
     * Handles both `YYYY-MM-DD` strings and full date strings.
     */
    formatDateValue(value) {
        if (!value) return null
        try {
            const parts = value.split('-')
            if (parts.length === 3 && parts[0].length === 4) {
                const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
                if (!isNaN(date.getTime())) return date.toLocaleDateString()
            }
            const date = new Date(value)
            if (!isNaN(date.getTime())) return date.toLocaleDateString()
        } catch {}
        return null
    },

    /** Maps a numeric cleanliness rating to its labeled form (e.g. "Good (3)"). */
    formatCleanlinessRating(value) {
        const rating = parseInt(value, 10)
        if (isNaN(rating)) return null
        return CLEANLINESS_LABELS[rating] || `${rating}`
    },

    /** Returns 'None' for sentinel values used when an assignment field is empty. */
    formatAssignmentValue(value) {
        if (['0', 'null', 'undefined'].includes(value)) return 'None'
        return null
    },

    /** Compares two dates by their date-only (YYYY-MM-DD) components. */
    areSameDates(date1, date2) {
        if (!date1 && !date2) return true
        if (!date1 || !date2) return false
        try {
            return new Date(date1).toISOString().split('T')[0] === new Date(date2).toISOString().split('T')[0]
        } catch {
            return false
        }
    }
}

export default HistoryDisplayUtility
export { HistoryDisplayUtility }
