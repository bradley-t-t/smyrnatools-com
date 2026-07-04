import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'

const BACKDROP_CLASSES =
    'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in-fast motion-reduce:animate-none'
const MODAL_BASE_CLASSES =
    'relative w-full bg-bg-secondary border border-border-light rounded-modal shadow-modal overflow-hidden animate-pop-in motion-reduce:animate-none'
const HEADER_CLASSES = 'flex items-center justify-between px-6 py-4 border-b border-border-light bg-accent'
const CLOSE_BUTTON_CLASSES =
    'size-8 flex items-center justify-center rounded-md text-white transition-colors duration-150 hover:bg-white/15 active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transition-none'
const BODY_CLASSES = 'px-6 py-5'
const FOOTER_CLASSES = 'flex items-center gap-3 px-6 py-4 border-t border-border-light bg-bg-tertiary/40'
const PRIMARY_BUTTON_CLASSES =
    'flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-md transition-colors duration-150 text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary motion-reduce:transition-none'
const SECONDARY_BUTTON_CLASSES =
    'px-4 py-3 bg-bg-tertiary hover:bg-bg-hover text-text-primary border border-border-light font-semibold rounded-md transition-colors duration-150 text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary motion-reduce:transition-none'

/**
 * Portal-rendered modal shell for role/permission management dialogs.
 * Provides a branded header, close button, ESC handling, and renders children as the body.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility.
 * @param {Function} props.onClose - Closes the modal.
 * @param {string} props.title - Header title text.
 * @param {string} [props.subtitle] - Optional subtitle below the title.
 * @param {string} [props.titleIcon] - FontAwesome icon class for the header.
 * @param {string} [props.maxWidth='max-w-md'] - Tailwind max-width class.
 */
function RoleModal({ children, isOpen, maxWidth = 'max-w-md', onClose, subtitle, title, titleIcon }) {
    useEffect(() => {
        if (!isOpen) return undefined
        const handleKey = (event) => {
            if (event.key === 'Escape') onClose?.()
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [isOpen, onClose])

    if (!isOpen) return null
    return ReactDOM.createPortal(
        <div className={BACKDROP_CLASSES} onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
            <div className={`${MODAL_BASE_CLASSES} ${maxWidth}`} onClick={(event) => event.stopPropagation()}>
                <div className={HEADER_CLASSES}>
                    <div className="flex items-center gap-3">
                        {titleIcon && <i className={`${titleIcon} text-white`} aria-hidden="true" />}
                        <div>
                            <h2 className="font-heading font-semibold text-white tracking-tight">{title}</h2>
                            {subtitle && <span className="text-xs text-white/70">{subtitle}</span>}
                        </div>
                    </div>
                    <button className={CLOSE_BUTTON_CLASSES} onClick={onClose} type="button" aria-label="Close">
                        <i className="fas fa-times" aria-hidden="true" />
                    </button>
                </div>
                {children}
            </div>
        </div>,
        document.body
    )
}

export function RoleModalBody({ children }) {
    return <div className={BODY_CLASSES}>{children}</div>
}

export function RoleModalFooter({
    disabled,
    isLoading,
    loadingText,
    onCancel,
    onSubmit,
    submitIcon = 'fas fa-plus',
    submitText
}) {
    return (
        <div className={FOOTER_CLASSES}>
            <button
                className={PRIMARY_BUTTON_CLASSES}
                disabled={disabled || isLoading}
                onClick={onSubmit}
                type="button"
            >
                {isLoading ? (
                    <>
                        <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                        {loadingText}
                    </>
                ) : (
                    <>
                        <i className={submitIcon} aria-hidden="true" />
                        {submitText}
                    </>
                )}
            </button>
            <button className={SECONDARY_BUTTON_CLASSES} disabled={isLoading} onClick={onCancel} type="button">
                Cancel
            </button>
        </div>
    )
}

export function RoleFormField({ children, label, sublabel }) {
    return (
        <div className="mb-4 last:mb-0">
            <label className="block text-sm font-semibold text-text-primary mb-2">
                {label}
                {sublabel && <span className="font-normal text-text-tertiary ml-1">{sublabel}</span>}
            </label>
            {children}
        </div>
    )
}

export function RoleTextInput({ disabled, onChange, placeholder, type = 'text', value }) {
    return (
        <input
            className="w-full px-4 py-3 border border-border-light rounded-md text-sm bg-bg-primary text-text-primary placeholder:text-text-tertiary transition-colors duration-150 hover:border-border-medium focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:cursor-not-allowed"
            disabled={disabled}
            onChange={(event) =>
                !disabled && onChange(type === 'number' ? parseInt(event.target.value, 10) || 0 : event.target.value)
            }
            placeholder={placeholder}
            type={type}
            value={value}
        />
    )
}

export default RoleModal
