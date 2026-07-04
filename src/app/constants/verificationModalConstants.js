export const SECTION_TITLE_CLASS = 'text-[13.5px] font-semibold leading-tight text-text-primary'

export const SECTION_SUBTITLE_CLASS = 'text-[11.5px] leading-tight text-text-tertiary mt-0.5'

export const PILL_BASE =
    'inline-flex items-center rounded text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 shrink-0'

export const FIELD_LABEL_CLASS = 'inline-flex items-center gap-1 text-[12px] font-medium mb-1.5'

export const FIELD_STYLE = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-light)',
    color: 'var(--text-primary)'
}

export const RATING_LABELS = [null, 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

/** Returns the background and foreground palette for a maintenance issue severity. */
export function getSeverityPalette(severity) {
    switch (severity) {
        case 'High':
            return { bg: '#fee2e2', fg: '#b91c1c' }
        case 'Medium':
            return { bg: '#fef3c7', fg: '#92400e' }
        case 'Low':
            return { bg: '#dbeafe', fg: '#1e40af' }
        default:
            return { bg: 'var(--bg-tertiary)', fg: 'var(--text-secondary)' }
    }
}

/** Formats an ISO date string with the user's locale. Returns '' for falsy input. */
export function formatVerificationDate(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleString()
}
