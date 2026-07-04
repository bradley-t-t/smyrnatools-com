import React from 'react'

/**
 * Inline error chip used across forms and async actions. Icon + message + optional dismiss.
 * Token-driven, theme-aware, gently fades + slides in on mount.
 *
 * @param {Object} props
 * @param {string} props.message - Error message to display. Renders nothing if falsy.
 * @param {Function} [props.onDismiss] - Optional callback to dismiss the error; shows close button when provided.
 * @param {string} [props.className] - Additional Tailwind classes for the container.
 */
function ErrorMessage({ message, onDismiss, className = '' }) {
    if (!message) return null
    return (
        <div
            role="alert"
            aria-live="polite"
            className={`flex items-start gap-3 rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm leading-normal text-status-danger animate-fade-slide-in motion-reduce:animate-none ${className}`}
        >
            <i className="fas fa-exclamation-triangle mt-0.5 text-status-danger shrink-0" aria-hidden="true" />
            <span className="flex-1 text-text-primary">{message}</span>
            {onDismiss && (
                <button type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss error"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors duration-150 hover:bg-status-danger/15 hover:text-status-danger active:scale-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary motion-reduce:transition-none"
                >
                    <i className="fas fa-times text-xs" aria-hidden="true" />
                </button>
            )}
        </div>
    )
}

export default ErrorMessage
