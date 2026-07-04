/* eslint-disable react/forbid-dom-props */
import React from 'react'
import ReactDOM from 'react-dom'

import { useAccentColor } from '../../hooks/useAccentColor'

/**
 * Fixed bottom-right toast notifying the user that a newer version is available.
 */
function VersionUpdateBanner({ onDismiss }) {
    const accentColor = useAccentColor()
    if (typeof document === 'undefined' || !document.body) return null
    return ReactDOM.createPortal(
        <div
            role="status"
            aria-live="polite"
            className="fixed bottom-5 right-5 z-[9999] w-80 overflow-hidden rounded-modal border border-border-light bg-bg-primary shadow-modal animate-fade-slide-in motion-reduce:animate-none"
        >
            <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: accentColor }}>
                <i className="fas fa-rotate text-sm text-white" aria-hidden="true" />
                <span className="text-sm font-semibold text-white">Update Available</span>
            </div>
            <div className="px-4 py-3">
                <p className="mb-3 text-sm text-text-secondary">
                    A newer version of this page is available. Refresh to get the latest updates.
                </p>
                <div className="flex items-center justify-end gap-2">
                    <button type="button"
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary cursor-pointer transition-[background-color,color,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-hover hover:text-text-primary active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                        onClick={onDismiss}
                    >
                        Ignore
                    </button>
                    <button type="button"
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-white cursor-pointer transition-[filter,transform] duration-150 ease-out motion-reduce:transition-none hover:brightness-110 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                        style={{ backgroundColor: accentColor }}
                        onClick={() => window.location.reload()}
                    >
                        Refresh
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
export default VersionUpdateBanner
