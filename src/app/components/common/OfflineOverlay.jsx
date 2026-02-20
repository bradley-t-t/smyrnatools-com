import React, { useState } from 'react'
import ReactDOM from 'react-dom'

import { usePreferences } from '../../context/PreferencesContext'

const DEFAULT_ACCENT = '#1e3a5f'

function OfflineOverlay({ onRetry }) {
    const [isRetrying, setIsRetrying] = useState(false)
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || DEFAULT_ACCENT

    if (typeof document === 'undefined' || !document.body) {
        return null
    }

    const handleRetry = async () => {
        setIsRetrying(true)
        try {
            await onRetry()
        } finally {
            setIsRetrying(false)
        }
    }

    return ReactDOM.createPortal(
        <>
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="w-[90%] max-w-[400px] rounded-2xl bg-white p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                    <h1 className="mb-4 text-2xl font-bold" style={{ color: accentColor }}>
                        Connection Lost
                    </h1>
                    <p className="mb-6 text-[15px] leading-relaxed text-slate-500">
                        Your connection appears to be offline or unstable. Please check your network and try again.
                    </p>
                    <button
                        className="inline-flex items-center justify-center gap-2.5 rounded-[10px] border-none px-7 py-3.5 text-[15px] font-semibold text-white transition-all"
                        style={{
                            backgroundColor: accentColor,
                            cursor: isRetrying ? 'not-allowed' : 'pointer',
                            opacity: isRetrying ? 0.7 : 1
                        }}
                        onClick={handleRetry}
                        disabled={isRetrying}
                    >
                        <i
                            className="fas fa-redo"
                            style={{ animation: isRetrying ? 'spin 1s linear infinite' : 'none' }}
                        />
                        {isRetrying ? 'Checking Connection...' : 'Retry Connection'}
                    </button>
                </div>
            </div>
        </>,
        document.body
    )
}

export default OfflineOverlay
