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
        <div className="space-y-4">
            <div
                className={`flex items-center justify-between p-3 rounded-lg ${isVerified ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                <div className="flex items-center gap-2">
                    <i className={`fas fa-clipboard-check ${isVerified ? 'text-green-600' : 'text-amber-600'}`}></i>
                    <span className={`font-semibold text-sm ${isVerified ? 'text-green-700' : 'text-amber-700'}`}>
                        {isVerified ? 'Verified' : (verificationLabel || 'Needs Verification')}
                    </span>
                </div>
                {isVerified && <i className="fas fa-check-circle text-green-500"></i>}
                {!isVerified && <i className="fas fa-exclamation-circle text-amber-500"></i>}
            </div>

            <div className="space-y-2">
                {verificationItems.map((item, index) => (
                    <div
                        key={index}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                        title={item.title || ''}
                    >
                        <div
                            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0"
                            style={item.iconStyle || {}}
                        >
                            <i className={`${item.icon} text-sm`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div
                                className="text-xs font-medium text-slate-500 uppercase tracking-wide">{item.label}</div>
                            <div
                                className="text-sm font-semibold text-slate-800 truncate"
                                style={item.valueStyle || {}}
                            >
                                {item.value}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                className="w-full py-2.5 px-4 bg-[#1e3a5f] hover:bg-[#15304f] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={onVerify}
                disabled={!canEdit || verificationDisabled}
                data-verify-trigger="true"
            >
                <i className="fas fa-check-circle"></i>
                <span>Verify Now</span>
            </button>

            {noticeText && (
                <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <i className="fas fa-info-circle text-blue-500 mt-0.5 flex-shrink-0"></i>
                    <p className="text-xs text-blue-700 leading-relaxed"
                       dangerouslySetInnerHTML={{__html: noticeText}}></p>
                </div>
            )}
        </div>
    )
}

export default VerificationCardSection
