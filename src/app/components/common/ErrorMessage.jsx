import React from 'react'

/**
 * Dismissible error banner with icon support.
 * @param {Object} props
 * @param {string} props.message - Error message to display. Renders nothing if falsy.
 * @param {Function} [props.onDismiss] - Optional callback to dismiss the error; shows close button when provided.
 * @param {string} [props.className] - Additional Tailwind classes for the container.
 */
function ErrorMessage({ message, onDismiss, className = '' }) {
    if (!message) return null

    return (
        <div
            className={`flex items-center justify-between gap-3 rounded-[10px] border border-red-200 bg-red-50 px-[18px] py-3.5 text-sm leading-normal text-red-800 ${className}`}
        >
            <span className="flex-1 text-red-800">{message}</span>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-none bg-transparent text-red-800 hover:bg-red-100"
                    aria-label="Dismiss error"
                >
                    <i className="fas fa-times" />
                </button>
            )}
        </div>
    )
}

export default ErrorMessage
