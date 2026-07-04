export const SECTION_LABEL_CLASS = 'text-[9.5px] font-semibold uppercase tracking-wider'

/** Hours-and-minutes formatter shared by the chat thread and the row preview. */
export function formatMessageTime(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** "Today" / "Yesterday" / "23 May 2025" date dividers in the chat. */
export function getDateLabel(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    if (date.toDateString() === now.toDateString()) return 'Today'
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const ATTACHMENT_ICONS = {
    equipment: 'fas fa-snowplow',
    issue: 'fas fa-exclamation-triangle',
    mixer: 'fas fa-truck-moving',
    pickup_truck: 'fas fa-truck-pickup',
    tractor: 'fas fa-truck',
    trailer: 'fas fa-trailer'
}

/** Maps message attachment types to EmbeddedViewModal view keys. */
const ATTACHMENT_VIEW_MAP = {
    equipment: 'equipment',
    mixer: 'mixers',
    pickup_truck: 'tractors',
    tractor: 'tractors',
    trailer: 'trailers'
}

/** Maps issue meta.itemType (capitalized) to embedded view keys. */
const ITEM_TYPE_VIEW_MAP = {
    Equipment: 'equipment',
    Mixer: 'mixers',
    Tractor: 'tractors',
    Trailer: 'trailers'
}

/** Resolves the embedded view key and search term from an attachment. */
export function resolveAttachmentView(type, meta) {
    if (type === 'issue' || type === 'asset') {
        const viewKey = ITEM_TYPE_VIEW_MAP[meta?.itemType]
        return viewKey ? { search: meta?.itemNumber || '', viewKey } : null
    }
    const viewKey = ATTACHMENT_VIEW_MAP[type]
    return viewKey ? { search: meta?.itemNumber || '', viewKey } : null
}

/** Sidebar filter modes. Pinned / Unread / All — keeping the list short on
 *  purpose; @mentions don't exist yet so the noise floor is low. */
export const FILTER_PILLS = [
    { icon: 'fa-inbox', id: 'all', label: 'All' },
    { icon: 'fa-bell', id: 'unread', label: 'Unread' },
    { icon: 'fa-thumbtack', id: 'pinned', label: 'Pinned' }
]
