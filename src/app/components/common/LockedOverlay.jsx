/* eslint-disable react/forbid-dom-props */
import React from 'react'
import ReactDOM from 'react-dom'

import { useAuth } from '../../context/AuthContext'
import { useAccentColor } from '../../hooks/useAccentColor'
import VideoBackground from './VideoBackground'

/** Maps lock reasons to user-facing title/message pairs. */
const REASON_CONFIG = {
    'invalid-session': {
        message:
            'Your session has expired or is invalid. Please refresh the page or sign out and log in again to continue.',
        title: 'Session Invalid'
    },
    'no-plant': {
        message:
            'Your account is not assigned to a plant. Please contact your district manager to complete your setup.',
        title: 'Setup Incomplete'
    }
}

const DEFAULT_REASON = {
    message: 'You do not have access.',
    title: 'Access Pending'
}

/**
 * Full-screen portal overlay shown when user access is locked.
 * Displays contextual messaging based on the lock reason and provides
 * options to refresh or sign out.
 */
function LockedOverlay({ reason }) {
    const { signOut } = useAuth()
    const accentColor = useAccentColor()
    const { title, message } = REASON_CONFIG[reason] || DEFAULT_REASON
    if (typeof document === 'undefined' || !document.body) return null
    const handleSignOut = async () => {
        try {
            await signOut()
            window.location.href = '/'
        } catch {}
    }
    return ReactDOM.createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="locked-overlay-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in motion-reduce:animate-none"
        >
            <VideoBackground />
            <div className="relative z-[10] w-[90%] max-w-[440px] rounded-modal bg-bg-primary p-12 text-center shadow-modal animate-pop-in motion-reduce:animate-none">
                <h1
                    id="locked-overlay-title"
                    className="mb-4 font-heading text-[28px] font-bold tracking-tight"
                    style={{ color: accentColor }}
                >
                    {title}
                </h1>
                <p className="mb-8 text-base leading-relaxed text-text-secondary">{message}</p>
                <div className="flex flex-col gap-3">
                    <button type="button"
                        className="flex w-full items-center justify-center gap-2.5 rounded-xl border-none px-6 py-3.5 text-[15px] font-semibold text-white cursor-pointer active:scale-[0.98] transition-[transform,filter] duration-150 ease-out motion-reduce:transition-none hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                        style={{ backgroundColor: accentColor }}
                        onClick={() => window.location.reload()}
                    >
                        <i className="fas fa-sync-alt" aria-hidden="true" />
                        Refresh Page
                    </button>
                    <button type="button"
                        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border-light bg-bg-secondary px-6 py-3.5 text-[15px] font-semibold text-text-primary cursor-pointer active:scale-[0.98] transition-[transform,background-color] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                        onClick={handleSignOut}
                    >
                        <i className="fas fa-sign-out-alt" aria-hidden="true" />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
export default LockedOverlay
