/* eslint-disable react/forbid-dom-props */
import React from 'react'
import ReactDOM from 'react-dom'

import SmyrnaLogo from '../../../assets/images/SmyrnaLogo.png'
import { useAuth } from '../../context/AuthContext'
import { useAccentColor } from '../../hooks/useAccentColor'

/**
 * Full-screen overlay displayed when a user's access has been revoked.
 * Provides only a sign-out option with no way to dismiss.
 */
function TerminatedOverlay() {
    const { signOut } = useAuth()
    const accentColor = useAccentColor()
    const handleSignOut = async () => {
        try {
            await signOut()
            window.location.href = '/'
        } catch {}
    }
    if (typeof document === 'undefined' || !document.body) return null
    return ReactDOM.createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="terminated-overlay-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in motion-reduce:animate-none"
        >
            <div className="w-[90%] max-w-[440px] rounded-modal bg-bg-primary p-12 text-center shadow-modal animate-pop-in motion-reduce:animate-none">
                <img src={SmyrnaLogo} alt="Smyrna Logo" className="mb-6 h-auto w-[120px]" />
                <h1
                    id="terminated-overlay-title"
                    className="mb-4 font-heading text-[28px] font-bold tracking-tight text-text-primary"
                >
                    Access Revoked
                </h1>
                <p className="mb-8 text-base leading-relaxed text-text-secondary">
                    Your access to this application has been revoked. Please contact your district manager for more
                    information.
                </p>
                <button type="button"
                    className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border-none px-8 py-3.5 text-[15px] font-semibold text-white cursor-pointer active:scale-[0.98] transition-[transform,filter] duration-150 ease-out motion-reduce:transition-none hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                    style={{ backgroundColor: accentColor }}
                    onClick={handleSignOut}
                >
                    Sign Out
                </button>
            </div>
        </div>,
        document.body
    )
}
export default TerminatedOverlay
