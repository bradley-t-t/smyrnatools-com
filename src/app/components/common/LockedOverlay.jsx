import React from 'react'
import ReactDOM from 'react-dom'

import { useAuth } from '../../context/AuthContext'
import { useAccentColor } from '../../hooks/useAccentColor'
import VideoBackground from './VideoBackground'

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
    message: 'You must contact your district manager for them to approve your sign-up.',
    title: 'Access Pending'
}

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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85">
            <VideoBackground />
            <div className="relative z-[1] w-[90%] max-w-[440px] rounded-[20px] bg-white p-12 text-center shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                <h1 className="mb-4 text-[28px] font-bold" style={{ color: accentColor }}>
                    {title}
                </h1>
                <p className="mb-8 text-base leading-relaxed text-slate-500">{message}</p>
                <div className="flex flex-col gap-3">
                    <button
                        className="flex w-full items-center justify-center gap-2.5 rounded-xl border-none px-6 py-3.5 text-[15px] font-semibold text-white"
                        style={{ backgroundColor: accentColor }}
                        onClick={() => window.location.reload()}
                    >
                        <i className="fas fa-sync-alt" />
                        Refresh Page
                    </button>
                    <button
                        className="flex w-full items-center justify-center gap-2.5 rounded-xl border-none bg-slate-100 px-6 py-3.5 text-[15px] font-semibold text-gray-700"
                        onClick={handleSignOut}
                    >
                        <i className="fas fa-sign-out-alt" />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default LockedOverlay
