import React from 'react'

function VerificationCardSection({
                                     isVerified,
                                     verificationLabel,
                                     verificationItems = [],
                                     onVerify,
                                     canEdit = true,
                                     verificationDisabled = false,
                                     noticeText = null
                                 }) {
    return (
        <div className="verification-card">
                <div className="verification-card-header">
                    <i className="fas fa-clipboard-check" style={{color: 'var(--accent)'}}></i>
                    {isVerified ? (
                        <div className="verification-badge verified">
                            <span>Verified</span>
                        </div>
                    ) : (
                        <div className="verification-badge needs-verification">
                            <span>{verificationLabel || 'Needs Verification'}</span>
                        </div>
                    )}
                </div>
                <div className="verification-details">
                    {verificationItems.map((item, index) => (
                        <div
                            key={index}
                            className="verification-item"
                            style={item.style || {}}
                            title={item.title || ''}
                        >
                            <div
                                className="verification-icon"
                                style={item.iconStyle || {}}
                            >
                                <i className={item.icon}></i>
                            </div>
                            <div className="verification-info">
                                <span className="verification-label">{item.label}</span>
                                <span
                                    className="verification-value"
                                    style={item.valueStyle || {}}
                                >
                                    {item.value}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    className="verify-now-button"
                    onClick={onVerify}
                    disabled={!canEdit || verificationDisabled}
                    data-verify-trigger="true"
                >
                    <i className="fas fa-check-circle"></i> Verify Now
                </button>
                {noticeText && (
                    <div className="verification-notice">
                        <i className="fas fa-info-circle"></i>
                        <p dangerouslySetInnerHTML={{__html: noticeText}}></p>
                    </div>
                )}
            </div>
    )
}

export default VerificationCardSection
