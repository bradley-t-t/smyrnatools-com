import React from 'react'
/** Red circular icon badge for validation error modals. */
const ErrorIconBadge = () => (
    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
        <i className="fas fa-exclamation-triangle text-red-600 text-base sm:text-lg" />
    </div>
)
/** Renders pipe-delimited issue strings as red badge chips. */
const CommentIssuesBadges = ({ issuesString }) => {
    const issues =
        issuesString
            ?.split('|')
            .map((i) => i.trim())
            .filter(Boolean) ?? []
    if (!issues.length) return null
    return (
        <div className="flex flex-wrap gap-1.5">
            {issues.map((issue, i) => (
                <span key={i} className="px-2 py-1 bg-red-200 text-red-800 rounded text-[11px] font-semibold">
                    {issue}
                </span>
            ))}
        </div>
    )
}
/** Side-by-side grid showing valid vs invalid comment examples. */
const CommentExamplesGrid = () => (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 bg-green-50 rounded-lg p-3 sm:p-4 mb-4">
        <div>
            <div className="text-green-700 text-[10px] sm:text-[11px] font-bold mb-1 flex items-center">
                <i className="fas fa-check mr-1" />
                VALID
            </div>
            <div className="text-green-700 text-[11px] sm:text-xs">
                {'"Sent to plant 402"'}
                <br />
                {'"Truck breakdown"'}
            </div>
        </div>
        <div>
            <div className="text-red-800 text-[10px] sm:text-[11px] font-bold mb-1 flex items-center">
                <i className="fas fa-times mr-1" />
                INVALID
            </div>
            <div className="text-red-800 text-[11px] sm:text-xs">
                {'"N/A", "mixer"'}
                <br />
                {'"none", vague'}
            </div>
        </div>
    </div>
)
/** Extracts comment text, issues, and actionable message from a comment validation error string. */
const parseCommentError = (error) => ({
    comment: error.split('Your comment:')[1]?.split('\n\n')[0]?.trim() ?? '',
    hasComment: error.includes('Your comment:'),
    hasIssues: error.includes('Issues:'),
    issuesString: error.split('Issues:')[1] ?? '',
    message: error.split('\n\n')[1] ?? 'Provide a specific reason for the timing issues.'
})
/** Modal displaying validation errors, with special formatting for comment quality issues. */
function ErrorModal({ error, onClose }) {
    const isCommentError = error.includes('Comment needs improvement')
    const errorTitle = isCommentError ? error.split(':')[0] : 'Validation Error'
    const parsed = isCommentError ? parseCommentError(error) : null
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
            <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-2xl">
                <div className="flex items-center gap-3 mb-4 sm:mb-5">
                    <ErrorIconBadge />
                    <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-bold text-slate-800 m-0">{errorTitle}</h2>
                        {isCommentError && (
                            <p className="text-xs sm:text-sm text-red-600 font-medium m-0 mt-0.5">
                                Comment needs improvement
                            </p>
                        )}
                    </div>
                </div>
                {isCommentError ? (
                    <>
                        <div className="bg-red-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                            <div className="text-red-800 text-xs sm:text-sm font-medium mb-2">{parsed.message}</div>
                            {parsed.hasComment && (
                                <div className="bg-white border border-red-200 rounded-md p-2 sm:p-3 mb-2">
                                    <div className="text-slate-500 text-[10px] font-semibold uppercase mb-1">
                                        Your Comment
                                    </div>
                                    <div className="text-slate-800 text-xs sm:text-sm italic">{parsed.comment}</div>
                                </div>
                            )}
                            {parsed.hasIssues && <CommentIssuesBadges issuesString={parsed.issuesString} />}
                        </div>
                        <CommentExamplesGrid />
                    </>
                ) : (
                    <div className="bg-red-50 rounded-lg p-3 sm:p-4 mb-4">
                        <div className="text-red-800 text-xs sm:text-sm font-medium">{error}</div>
                    </div>
                )}
                <div className="text-right">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors"
                    >
                        Go Back & Fix
                    </button>
                </div>
            </div>
        </div>
    )
}
export default ErrorModal
