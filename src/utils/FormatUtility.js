/**
 * General text formatting helpers — truncation, casing, display transforms.
 */
const FormatUtility = {
    /**
     * Truncates text by character count or word count with ellipsis.
     * @param {string} text - Source text
     * @param {number} maxLength - Character limit (or word limit when byWords is true)
     * @param {boolean} [byWords=false] - Truncate by word count instead of characters
     */
    truncateText(text, maxLength, byWords = false) {
        if (!text) return ''
        if (byWords) {
            const words = text.split(' ')
            return words.length > maxLength ? `${words.slice(0, maxLength).join(' ')}...` : text
        }
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
    }
}
export default FormatUtility
export { FormatUtility }
