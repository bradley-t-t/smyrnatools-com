import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'

/**
 * Reusable modal dialog with header, backdrop-close, ESC handling, body scroll lock, and scrollable content area.
 * Backdrop fades in; container pops in via spring easing. Reduced-motion users get a static reveal.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Modal body content (use ModalBody, ModalSummary, etc.).
 * @param {Function} props.onClose - Callback invoked when the backdrop, close button, or ESC closes the modal.
 * @param {string} props.title - Header title text.
 * @param {string} [props.titleIcon] - Optional FontAwesome class for the header icon.
 * @param {React.ReactNode} [props.footer] - Optional footer slot rendered with a top divider.
 * @param {string} [props.maxWidth='max-w-3xl'] - Tailwind max-width class for the container.
 */
export default function Modal({ children, onClose, title, titleIcon, footer, maxWidth = 'max-w-3xl' }) {
    useEffect(() => {
        const handleKey = (event) => {
            if (event.key === 'Escape') onClose?.()
        }
        document.addEventListener('keydown', handleKey)
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', handleKey)
            document.body.style.overflow = previousOverflow
        }
    }, [onClose])

    if (typeof document === 'undefined' || !document.body) return null

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-8 bg-black/40 backdrop-blur-sm animate-fade-in-fast motion-reduce:animate-none"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div
                className={`flex max-h-[90vh] w-full ${maxWidth} flex-col rounded-modal bg-bg-secondary border border-border-light shadow-modal animate-pop-in motion-reduce:animate-none`}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-border-light px-6 sm:px-8 py-5">
                    <h3 className="m-0 flex items-center gap-3 font-heading text-lg sm:text-xl font-semibold tracking-tight text-text-primary">
                        {titleIcon && <i className={`${titleIcon} text-accent`} aria-hidden="true" />}
                        {title}
                    </h3>
                    <button type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-md p-2 text-base text-text-tertiary transition-colors duration-150 hover:bg-bg-hover hover:text-text-primary active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary motion-reduce:transition-none"
                    >
                        <i className="fas fa-times" aria-hidden="true" />
                    </button>
                </div>
                {children}
                {footer && (
                    <div className="flex items-center justify-end gap-3 border-t border-border-light bg-bg-tertiary/40 px-6 sm:px-8 py-4 rounded-b-modal">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}

/**
 * Summary strip rendered below the modal header, displaying key metrics in a grid.
 * @param {Object} props
 * @param {React.ReactNode} props.children - ModalSummaryItem elements.
 */
export function ModalSummary({ children }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 border-b border-border-light bg-bg-tertiary/40 px-6 sm:px-8 py-5">
            {children}
        </div>
    )
}

/**
 * Individual metric card used inside ModalSummary.
 * @param {Object} props
 * @param {string} props.label - Uppercase label text.
 * @param {string|number} props.value - Primary display value.
 * @param {string} [props.valueClassName] - Additional Tailwind classes for the value text.
 */
export function ModalSummaryItem({ label, value, valueClassName = '' }) {
    return (
        <div className="flex flex-col gap-1.5 rounded-card border border-border-light bg-bg-primary p-4">
            <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">{label}</span>
            <span className={`font-heading text-2xl font-bold tabular-nums text-accent ${valueClassName}`}>
                {value}
            </span>
        </div>
    )
}

/**
 * Scrollable content wrapper for modal body sections.
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function ModalBody({ children }) {
    return <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">{children}</div>
}
