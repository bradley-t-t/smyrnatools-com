import React from 'react'

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
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85">
            <div className="w-[90%] max-w-[440px] rounded-[20px] bg-white p-12 text-center shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                <img src={SmyrnaLogo} alt="Smyrna Logo" className="mb-6 h-auto w-[120px]" />
                <h1 className="mb-4 text-[28px] font-bold text-red-800">Access Revoked</h1>
                <p className="mb-8 text-base leading-relaxed text-slate-500">
                    Your access to this application has been revoked. Please contact your district manager for more
                    information.
                </p>
                <button
                    className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border-none px-8 py-3.5 text-[15px] font-semibold text-white"
                    style={{ backgroundColor: accentColor }}
                    onClick={handleSignOut}
                >
                    Sign Out
                </button>
            </div>
        </div>
    )
}
export default TerminatedOverlay
