import React from 'react'

import { FIELD_LABEL_CLASS, FieldStyle } from '../../constants/myAccountConstants'
import { SubtleButton } from './MyAccountAtoms'

/** Modal that captures the current password + new password + confirm and
 *  submits them to the orchestrator's `onSubmit`. Validation lives in the
 *  parent so the modal can stay presentational. */
export default function PasswordModal({
    accentColor,
    confirmPassword,
    currentPassword,
    loading,
    newPassword,
    onClose,
    onSubmit,
    passwordError,
    setConfirmPassword,
    setCurrentPassword,
    setNewPassword
}) {
    const canSubmit =
        !loading && currentPassword && newPassword && newPassword === confirmPassword && newPassword.length >= 8
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/60 p-4 backdrop-blur-sm animate-fade-in-fast motion-reduce:animate-none"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-modal-title"
        >
            <div
                className="w-full max-w-lg overflow-hidden rounded-modal border border-border-light bg-bg-primary shadow-modal animate-pop-in motion-reduce:animate-none"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-border-light px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/10"
                            style={{ color: accentColor }}
                        >
                            <i className="fas fa-key text-[16px]" aria-hidden="true" />
                        </div>
                        <span
                            id="password-modal-title"
                            className="font-heading text-[16px] font-semibold text-text-primary"
                        >
                            Change Password
                        </span>
                    </div>
                    <button type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-all duration-150 hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.92] motion-reduce:transition-none"
                        aria-label="Close"
                    >
                        <i className="fas fa-times text-[14px]" aria-hidden="true" />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="flex flex-col gap-4 px-5 py-5">
                    {passwordError && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="flex items-center gap-2.5 rounded-card border border-status-danger/35 bg-status-danger/10 px-3 py-2.5 text-[13px] font-medium text-text-primary animate-fade-slide-in motion-reduce:animate-none"
                        >
                            <i
                                className="fas fa-exclamation-circle text-[13px] text-status-danger"
                                aria-hidden="true"
                            />
                            <span>{passwordError}</span>
                        </div>
                    )}
                    <div>
                        <label className={FIELD_LABEL_CLASS} style={{ color: 'var(--text-secondary)' }}>
                            Current Password
                        </label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            required
                            className="w-full rounded-lg px-3 py-2.5 text-[14px] outline-none placeholder:text-text-tertiary transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent/30"
                            style={FieldStyle}
                        />
                    </div>
                    <div>
                        <label className={FIELD_LABEL_CLASS} style={{ color: 'var(--text-secondary)' }}>
                            New Password
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            required
                            className="w-full rounded-lg px-3 py-2.5 text-[14px] outline-none placeholder:text-text-tertiary transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent/30"
                            style={FieldStyle}
                        />
                        <p className="mt-1.5 text-[11.5px] text-text-tertiary">Must be at least 8 characters</p>
                    </div>
                    <div>
                        <label className={FIELD_LABEL_CLASS} style={{ color: 'var(--text-secondary)' }}>
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            required
                            className="w-full rounded-lg px-3 py-2.5 text-[14px] outline-none placeholder:text-text-tertiary transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent/30"
                            style={FieldStyle}
                        />
                    </div>
                    <div className="mt-1 flex gap-3">
                        <SubtleButton onClick={onClose}>Cancel</SubtleButton>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="flex-1 rounded-md py-2.5 text-[12px] font-semibold uppercase tracking-wider text-white shadow-sm transition-all duration-150 ease-out hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none"
                            style={{ background: accentColor }}
                        >
                            {loading ? (
                                <span className="inline-flex items-center justify-center gap-2">
                                    <i className="fas fa-spinner fa-spin text-[12px]" aria-hidden="true" />
                                    Updating…
                                </span>
                            ) : (
                                'Update Password'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
