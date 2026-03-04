import React from 'react'
import ReactDOM from 'react-dom'

const BACKDROP_CLASSES = 'fixed inset-0 z-[9999] flex items-center justify-center p-4'
const OVERLAY_CLASSES = 'absolute inset-0 bg-black/50 backdrop-blur-sm'
const MODAL_BASE_CLASSES = 'relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden'
const HEADER_CLASSES = 'flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#1e3a5f]'
const CLOSE_BUTTON_CLASSES = 'size-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white'
const BODY_CLASSES = 'px-6 py-5'
const FOOTER_CLASSES = 'flex items-center gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50'
const PRIMARY_BUTTON_CLASSES =
    'flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#1e3a5f] hover:bg-[#152d4a] text-white font-semibold rounded-xl transition-colors text-sm disabled:opacity-50'
const SECONDARY_BUTTON_CLASSES =
    'px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors text-sm disabled:opacity-50'

/**
 * Portal-rendered modal shell for role/permission management dialogs.
 * Provides a branded header, close button, and renders children as the body.
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility.
 * @param {Function} props.onClose - Closes the modal.
 * @param {string} props.title - Header title text.
 * @param {string} [props.subtitle] - Optional subtitle below the title.
 * @param {string} [props.titleIcon] - FontAwesome icon class for the header.
 * @param {string} [props.maxWidth='max-w-md'] - Tailwind max-width class.
 */
function RoleModal({ children, isOpen, maxWidth = 'max-w-md', onClose, subtitle, title, titleIcon }) {
    if (!isOpen) return null

    return ReactDOM.createPortal(
        <div className={BACKDROP_CLASSES} onClick={onClose}>
            <div className={OVERLAY_CLASSES} />
            <div className={`${MODAL_BASE_CLASSES} ${maxWidth}`} onClick={(e) => e.stopPropagation()}>
                <div className={HEADER_CLASSES}>
                    <div className="flex items-center gap-3">
                        {titleIcon && <i className={`${titleIcon} text-white`} />}
                        <div>
                            <h2 className="font-bold text-white">{title}</h2>
                            {subtitle && <span className="text-xs text-white/70">{subtitle}</span>}
                        </div>
                    </div>
                    <button className={CLOSE_BUTTON_CLASSES} onClick={onClose} type="button">
                        <i className="fas fa-times" />
                    </button>
                </div>
                {children}
            </div>
        </div>,
        document.body
    )
}

/** Padded body section for RoleModal content. */
export function RoleModalBody({ children }) {
    return <div className={BODY_CLASSES}>{children}</div>
}

/** Scrollable body section for RoleModal with overflow handling. */
export function RoleModalScrollBody({ children }) {
    return <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
}

/** Footer bar with primary submit and secondary cancel buttons, supporting loading state. */
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
                        <i className="fas fa-spinner fa-spin" />
                        {loadingText}
                    </>
                ) : (
                    <>
                        <i className={submitIcon} />
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

/** Labeled form field wrapper with optional sublabel. */
export function RoleFormField({ children, label, sublabel }) {
    return (
        <div className="mb-4 last:mb-0">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
                {label}
                {sublabel && <span className="font-normal text-slate-400 ml-1">{sublabel}</span>}
            </label>
            {children}
        </div>
    )
}

/** Styled text input for role modal forms. */
export function RoleTextInput({ onChange, placeholder, type = 'text', value }) {
    return (
        <input
            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10"
            onChange={(e) => onChange(type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
            placeholder={placeholder}
            type={type}
            value={value}
        />
    )
}

/** Styled textarea for role modal forms with monospace font. */
export function RoleTextarea({ disabled, onChange, placeholder, value }) {
    return (
        <textarea
            className="w-full h-40 px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-700 focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 resize-none"
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            value={value}
        />
    )
}

export default RoleModal
