import React from 'react'
import ReactDOM from 'react-dom'

import { useAccentColor } from '../../hooks/useAccentColor'
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
    const accentColor = useAccentColor()
    if (!isOpen) return null
    const variantStyles = {
        danger: {
            bg: '#ef4444',
            hover: '#dc2626',
            icon: 'fa-trash-alt',
            iconBg: 'rgba(239,68,68,0.1)',
            iconColor: '#ef4444'
        },
        default: {
            bg: accentColor,
            hover: accentColor,
            icon: 'fa-question-circle',
            iconBg: `${accentColor}15`,
            iconColor: accentColor
        },
        warning: {
            bg: '#f59e0b',
            hover: '#d97706',
            icon: 'fa-exclamation-triangle',
            iconBg: 'rgba(245,158,11,0.1)',
            iconColor: '#f59e0b'
        }
    }
    const v = variantStyles[variant] || variantStyles.danger
    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
            onClick={onCancel}
        >
            <div
                className="w-full max-w-[380px] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)] overflow-hidden animate-[confirmSlideIn_0.2s_ease-out]"
                style={{ background: 'var(--bg-primary, #fff)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <style>{`@keyframes confirmSlideIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
                <div className="flex flex-col items-center px-6 pt-7 pb-2">
                    <div
                        className="flex items-center justify-center w-14 h-14 rounded-full mb-4"
                        style={{ background: v.iconBg }}
                    >
                        <i className={`fas ${v.icon} text-xl`} style={{ color: v.iconColor }} />
                    </div>
                    <h3
                        className="text-lg font-bold m-0 mb-2 text-center"
                        style={{ color: 'var(--text-primary, #1e293b)' }}
                    >
                        {title}
                    </h3>
                    {message && (
                        <p
                            className="text-sm text-center m-0 leading-relaxed"
                            style={{ color: 'var(--text-secondary, #64748b)' }}
                        >
                            {message}
                        </p>
                    )}
                </div>
                <div className="flex gap-3 px-6 pt-4 pb-6">
                    <button
                        onClick={onCancel}
                        className="flex-1 rounded-xl border text-sm font-semibold py-3 cursor-pointer transition-colors duration-150"
                        style={{
                            background: 'var(--bg-secondary, #f8fafc)',
                            borderColor: 'var(--border-light, #e2e8f0)',
                            color: 'var(--text-primary, #1e293b)'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary, #f1f5f9)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-secondary, #f8fafc)')}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 rounded-xl border-none text-white text-sm font-semibold py-3 cursor-pointer transition-opacity duration-150"
                        style={{ background: v.bg }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
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
