import React from 'react'

const COLORS = {
    errorBg: '#fee2e2',
    errorBorder: '#fecaca',
    errorDark: '#991b1b',
    errorIcon: '#dc2626',
    grayMuted: '#64748b',
    primary: '#1e3a5f',
    successBg: '#f0fdf4',
    successText: '#166534',
    textDark: '#1e293b'
}

const ErrorIconBadge = () => (
    <div style={styles.iconBadge}>
        <i className="fas fa-exclamation-triangle" />
    </div>
)

const CommentIssuesBadges = ({ issuesString }) => {
    const issues =
        issuesString
            ?.split('|')
            .map((i) => i.trim())
            .filter(Boolean) ?? []
    if (!issues.length) return null
    return (
        <div style={styles.badgeContainer}>
            {issues.map((issue, i) => (
                <span key={i} style={styles.issueBadge}>
                    {issue}
                </span>
            ))}
        </div>
    )
}

const CommentExamplesGrid = () => (
    <div style={styles.examplesGrid}>
        <div>
            <div style={styles.validHeader}>
                <i className="fas fa-check" style={{ marginRight: '4px' }} />
                VALID
            </div>
            <div style={styles.validText}>
                {'"Sent to plant 402"'}
                <br />
                {'"Truck breakdown"'}
            </div>
        </div>
        <div>
            <div style={styles.invalidHeader}>
                <i className="fas fa-times" style={{ marginRight: '4px' }} />
                INVALID
            </div>
            <div style={styles.invalidText}>
                {'"N/A", "mixer"'}
                <br />
                {'"none", vague'}
            </div>
        </div>
    </div>
)

const parseCommentError = (error) => ({
    comment: error.split('Your comment:')[1]?.split('\n\n')[0]?.trim() ?? '',
    hasComment: error.includes('Your comment:'),
    hasIssues: error.includes('Issues:'),
    issuesString: error.split('Issues:')[1] ?? '',
    message: error.split('\n\n')[1] ?? 'Provide a specific reason for the timing issues.'
})

function ErrorModal({ error, onClose }) {
    const isCommentError = error.includes('Comment needs improvement')
    const errorTitle = isCommentError ? error.split(':')[0] : 'Validation Error'
    const parsed = isCommentError ? parseCommentError(error) : null

    return (
        <div className="rpts-sbmt-modal-backdrop" style={styles.backdrop}>
            <div className="rpts-sbmt-modal-content" style={styles.modal}>
                <div style={styles.header}>
                    <ErrorIconBadge />
                    <div>
                        <h2 style={styles.title}>{errorTitle}</h2>
                        {isCommentError && <p style={styles.subtitle}>Comment needs improvement</p>}
                    </div>
                </div>

                {isCommentError ? (
                    <>
                        <div style={styles.errorBox}>
                            <div style={styles.errorMessage}>{parsed.message}</div>
                            {parsed.hasComment && (
                                <div style={styles.commentBox}>
                                    <div style={styles.commentLabel}>Your Comment</div>
                                    <div style={styles.commentText}>{parsed.comment}</div>
                                </div>
                            )}
                            {parsed.hasIssues && <CommentIssuesBadges issuesString={parsed.issuesString} />}
                        </div>
                        <CommentExamplesGrid />
                    </>
                ) : (
                    <div style={styles.simpleErrorBox}>
                        <div style={styles.errorMessage}>{error}</div>
                    </div>
                )}

                <div style={styles.actions}>
                    <button type="button" onClick={onClose} style={styles.button}>
                        Go Back & Fix
                    </button>
                </div>
            </div>
        </div>
    )
}

const styles = {
    actions: { textAlign: 'right' },
    backdrop: { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
    badgeContainer: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
    button: {
        background: COLORS.primary,
        border: 'none',
        borderRadius: '8px',
        color: 'white',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 600,
        padding: '10px 20px'
    },
    commentBox: {
        background: '#fff',
        border: `1px solid ${COLORS.errorBorder}`,
        borderRadius: '6px',
        marginBottom: '8px',
        padding: '8px 10px'
    },
    commentLabel: {
        color: COLORS.grayMuted,
        fontSize: '10px',
        fontWeight: 600,
        marginBottom: '2px',
        textTransform: 'uppercase'
    },
    commentText: { color: COLORS.textDark, fontSize: '13px', fontStyle: 'italic' },
    errorBox: { background: '#fef2f2', borderRadius: '8px', marginBottom: '12px', padding: '12px' },
    errorMessage: { color: COLORS.errorDark, fontSize: '13px', fontWeight: 500, marginBottom: '8px' },
    examplesGrid: {
        background: COLORS.successBg,
        borderRadius: '8px',
        display: 'grid',
        gap: '8px',
        gridTemplateColumns: '1fr 1fr',
        marginBottom: '16px',
        padding: '12px'
    },
    header: { alignItems: 'center', display: 'flex', gap: '12px', marginBottom: '20px' },
    iconBadge: {
        alignItems: 'center',
        background: COLORS.errorBg,
        borderRadius: '50%',
        color: COLORS.errorIcon,
        display: 'flex',
        flexShrink: 0,
        fontSize: '18px',
        height: '40px',
        justifyContent: 'center',
        width: '40px'
    },
    invalidHeader: { color: COLORS.errorDark, fontSize: '11px', fontWeight: 700, marginBottom: '4px' },
    invalidText: { color: COLORS.errorDark, fontSize: '12px' },
    issueBadge: {
        background: COLORS.errorBorder,
        borderRadius: '4px',
        color: COLORS.errorDark,
        fontSize: '11px',
        fontWeight: 600,
        padding: '4px 8px'
    },
    modal: { maxWidth: '480px' },
    simpleErrorBox: { background: '#fef2f2', borderRadius: '8px', marginBottom: '16px', padding: '12px' },
    subtitle: { color: COLORS.errorIcon, fontSize: '13px', fontWeight: 500, margin: '2px 0 0 0' },
    title: { color: COLORS.textDark, fontSize: '16px', fontWeight: 700, margin: 0 },
    validHeader: { color: COLORS.successText, fontSize: '11px', fontWeight: 700, marginBottom: '4px' },
    validText: { color: COLORS.successText, fontSize: '12px' }
}

export default ErrorModal
