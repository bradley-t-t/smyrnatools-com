import React from 'react'

import DetailViewSection from '../../../../app/components/sections/DetailViewSection'

/**
 * "Security" section — inline password reset for the manager. Hidden when the
 * caller is in read-only mode or lacks edit permission.
 */
export default function ManagerSecuritySection({
    showPasswordField,
    onShowPasswordField,
    password,
    onPasswordChange,
    onCancelPasswordChange
}) {
    return (
        <DetailViewSection.Section id="security" title="Security" icon="fas fa-shield-alt">
            <DetailViewSection.Card title="Password Management" icon="fas fa-key">
                {!showPasswordField ? (
                    <div className="flex flex-col gap-1.5">
                        <label>Password</label>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="text-text-secondary text-sm">••••••••</span>
                            <button type="button"
                                className="flex items-center gap-2 rounded-xl border border-border-light bg-bg-primary px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover"
                                onClick={onShowPasswordField}
                            >
                                <i className="fas fa-key"></i> Change Password
                            </button>
                        </div>
                        <p className="text-text-secondary text-[13px] mt-2 mb-0">
                            Click &quot;Change Password&quot; to set a new password for this manager.
                        </p>
                    </div>
                ) : (
                    <div className="form-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => onPasswordChange(e.target.value)}
                            placeholder="Enter new password"
                            className="form-control"
                            autoFocus
                        />
                        <p className="text-text-secondary text-[13px] mt-2 mb-3">
                            Enter a new password and click &quot;Save&quot; to apply it.
                        </p>
                        <button type="button"
                            className="flex items-center gap-2 rounded-xl border border-border-light bg-bg-primary px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover"
                            onClick={onCancelPasswordChange}
                        >
                            <i className="fas fa-times"></i> Cancel
                        </button>
                    </div>
                )}
            </DetailViewSection.Card>
        </DetailViewSection.Section>
    )
}
