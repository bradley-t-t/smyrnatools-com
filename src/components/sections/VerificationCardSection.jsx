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
        <>
            <div className="card-header">
                <h2>Verification Status</h2>
            </div>
            <div className="verification-card">
                <div className="verification-card-header">
                    <i className="fas fa-clipboard-check"></i>
                    {isVerified ? (
                        <div className="verification-badge verified">
                            <i className="fas fa-check-circle"></i>
                            <span>Verified</span>
                        </div>
                    ) : (
                        <div className="verification-badge needs-verification">
                            <i className="fas fa-exclamation-circle"></i>
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
        </>
    )
}

export default VerificationCardSection

