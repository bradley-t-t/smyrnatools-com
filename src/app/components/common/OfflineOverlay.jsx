/* eslint-disable react/forbid-dom-props */
import React, { useState } from 'react'
import ReactDOM from 'react-dom'

import { useAccentColor } from '../../hooks/useAccentColor'

/**
 * Full-screen portal overlay shown when the app loses network connectivity.
 * Provides a retry button with a spinning indicator during reconnection attempts.
 */
function OfflineOverlay({ onRetry }) {
    const [isRetrying, setIsRetrying] = useState(false)
    const accentColor = useAccentColor()
    if (typeof document === 'undefined' || !document.body) return null
    const handleRetry = async () => {
        setIsRetrying(true)
        try {
            await onRetry()
        } finally {
            setIsRetrying(false)
        }
    }
    return ReactDOM.createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="offline-overlay-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in motion-reduce:animate-none"
        >
            <div className="w-[90%] max-w-[400px] rounded-modal bg-bg-primary p-10 text-center shadow-modal animate-pop-in motion-reduce:animate-none">
                <h1
                    id="offline-overlay-title"
                    className="mb-4 font-heading text-2xl font-bold tracking-tight"
                    style={{ color: accentColor }}
                >
                    Connection Lost
                </h1>
                <p className="mb-6 text-[15px] leading-relaxed text-text-secondary">
                    Your connection appears to be offline or unstable. Please check your network and try again.
                </p>
                <button type="button"
                    className={`inline-flex items-center justify-center gap-2.5 rounded-[10px] border-none px-7 py-3.5 text-[15px] font-semibold text-white transition-[transform,filter,opacity] duration-150 ease-out motion-reduce:transition-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary ${isRetrying ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:brightness-110'}`}
                    style={{ backgroundColor: accentColor }}
                    onClick={handleRetry}
                    disabled={isRetrying}
                >
                    <i className={`fas fa-redo ${isRetrying ? 'animate-spin' : ''}`} aria-hidden="true" />
                    {isRetrying ? 'Checking Connection...' : 'Retry Connection'}
                </button>
            </div>
        </div>,
        document.body
    )
}
export default OfflineOverlay
