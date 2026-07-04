import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'

/**
 * Visual config per variant — keeps the dialog body, icon, and confirm button
 * in a consistent semantic family. Tokens drive all colors so the dialog reads
 * cleanly in dark / light / gray themes.
 */
const VARIANT_CONFIG = {
    danger: {
        confirmButton: 'bg-status-danger text-white hover:bg-status-danger/90 focus-visible:ring-status-danger',
        icon: 'fa-trash-alt',
        iconWrap: 'bg-status-danger/10 text-status-danger'
    },
    default: {
        confirmButton: 'bg-accent text-white hover:bg-accent-hover focus-visible:ring-accent',
        icon: 'fa-question-circle',
        iconWrap: 'bg-accent/10 text-accent'
    },
    warning: {
        confirmButton: 'bg-status-warning text-white hover:bg-status-warning/90 focus-visible:ring-status-warning',
        icon: 'fa-exclamation-triangle',
        iconWrap: 'bg-status-warning/10 text-status-warning'
    }
}

/**
 * Styled confirmation dialog rendered as a portal overlay.
 * Replaces native window.confirm() with a themed modal.
 *
 * @param {boolean} isOpen - Whether the dialog is visible.
 * @param {Function} onConfirm - Called when the user confirms.
 * @param {Function} onCancel - Called when the user cancels or clicks the backdrop.
 * @param {string} [title='Are you sure?'] - Dialog heading.
 * @param {string} [message] - Body text explaining what will happen.
 * @param {string} [confirmLabel='Confirm'] - Text for the confirm button.
 * @param {string} [cancelLabel='Cancel'] - Text for the cancel button.
 * @param {'danger'|'warning'|'default'} [variant='danger'] - Controls confirm button color.
 */
function ConfirmDialog({
    isOpen,
    onConfirm,
    onCancel,
    title = 'Are you sure?',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger'
}) {
    useEffect(() => {
        if (!isOpen) return undefined
        const handleKey = (event) => {
            if (event.key === 'Escape') onCancel?.()
            if (event.key === 'Enter') onConfirm?.()
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [isOpen, onCancel, onConfirm])

    if (!isOpen) return null
    const v = VARIANT_CONFIG[variant] || VARIANT_CONFIG.danger

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[10100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in-fast motion-reduce:animate-none"
            onClick={onCancel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div
                className="w-full max-w-sm overflow-hidden rounded-modal bg-bg-secondary border border-border-light shadow-modal animate-pop-in motion-reduce:animate-none"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex flex-col items-center px-6 pt-7 pb-2">
                    <div
                        className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${v.iconWrap}`}
                        aria-hidden="true"
                    >
                        <i className={`fas ${v.icon} text-xl`} />
                    </div>
                    <h3 className="m-0 mb-2 text-center font-heading text-lg font-semibold text-text-primary">
                        {title}
                    </h3>
                    {message && (
                        <p className="m-0 text-center text-sm leading-relaxed text-text-secondary">{message}</p>
                    )}
                </div>
                <div className="flex gap-3 px-6 pt-4 pb-6">
                    <button type="button"
                        onClick={onCancel}
                        className="flex-1 cursor-pointer rounded-md border border-border-light bg-bg-tertiary text-text-primary py-3 text-sm font-semibold transition-colors duration-150 hover:bg-bg-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary motion-reduce:transition-none"
                    >
                        {cancelLabel}
                    </button>
                    <button type="button"
                        onClick={onConfirm}
                        className={`flex-1 cursor-pointer rounded-md border-0 py-3 text-sm font-semibold transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary motion-reduce:transition-none ${v.confirmButton}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default ConfirmDialog
