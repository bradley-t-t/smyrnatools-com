/* eslint-disable react/forbid-dom-props */
import React from 'react'
import ReactDOM from 'react-dom'

import { useAccentColor } from '../../hooks/useAccentColor'

/**
 * Full-screen overlay that embeds external content in a sandboxed iframe.
 * Includes a branded header bar with a close button and the current URL.
 */
function WebOverlay({ url, onClose }) {
    const accentColor = useAccentColor()
    if (typeof document === 'undefined' || !document.body) return null
    return ReactDOM.createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="External content"
            className="fixed inset-0 z-[10000] flex flex-col bg-bg-primary animate-fade-in motion-reduce:animate-none"
        >
            <div
                className="flex items-center gap-4 border-b border-white/15 px-4 py-3"
                style={{ backgroundColor: accentColor }}
            >
                <button type="button"
                    aria-label="Close external content"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-none bg-white/[0.18] text-base text-white cursor-pointer hover:bg-white/[0.28] active:scale-[0.94] transition-[background-color,transform] duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    onClick={onClose}
                >
                    <i className="fas fa-times" aria-hidden="true" />
                </button>
                <div className="flex-1 truncate text-sm text-white/85">{url}</div>
            </div>
            <iframe
                src={url}
                title="External Content"
                className="flex-1 border-none"
                sandbox="allow-scripts allow-popups allow-forms"
            />
        </div>,
        document.body
    )
}
export default WebOverlay
