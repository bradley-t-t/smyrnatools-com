/* eslint-disable react/forbid-dom-props */
import React from 'react'
import ReactDOM from 'react-dom'

import { useAccentColor } from '../../hooks/useAccentColor'

/**
 * Fixed-position version badge at the bottom-right of the viewport.
 * Theme-aware, hairline-bordered, purely informational.
 */
function VersionPopup({ version }) {
    const accentColor = useAccentColor()
    if (!version) return null
    if (typeof document === 'undefined' || !document.body) return null
    return ReactDOM.createPortal(
        <div
            className="fixed bottom-3 right-3 z-[1000] flex items-center gap-2 rounded border border-border-light bg-bg-primary px-2.5 py-1.5 shadow-sm"
            title={`Version ${version}`}
            aria-label={`Version ${version}`}
        >
            <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                style={{ background: `${accentColor}1a`, color: accentColor }}
            >
                <i className="fas fa-code-branch text-[10px]" aria-hidden="true" />
            </span>
            <span className="flex flex-col items-start leading-tight">
                <span className="text-[9.5px] font-semibold uppercase tracking-wider text-text-tertiary">Version</span>
                <span className="text-[12px] font-bold tabular-nums text-text-primary">{version}</span>
            </span>
        </div>,
        document.body
    )
}

export default VersionPopup
