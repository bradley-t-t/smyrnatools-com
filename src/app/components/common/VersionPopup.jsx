import React from 'react'

import { useAccentColor } from '../../hooks/useAccentColor'

/**
 * Fixed-position toast at the bottom of the viewport displaying the current app version.
 * Renders nothing when no version string is provided.
 * @param {Object} props
 * @param {string} [props.version] - Semantic version string to display.
 */
function VersionPopup({ version, onClick }) {
    const accentColor = useAccentColor()

    if (!version) return null

    return (
        <div
            className="fixed bottom-5 left-1/2 z-[1000] -translate-x-1/2 flex flex-col items-center gap-1 rounded-2xl px-6 py-3 text-white shadow-xl"
            style={{ backgroundColor: accentColor, cursor: onClick ? 'pointer' : 'default' }}
            onClick={onClick}
        >
            <div className="flex items-center gap-2">
                <i className="fas fa-code-branch text-[11px] opacity-75" />
                <span className="text-[11px] font-semibold uppercase tracking-widest opacity-75">Version</span>
                <span className="text-[15px] font-bold">{version}</span>
            </div>
            {onClick && (
                <div className="flex items-center gap-1 text-[10px] opacity-60">
                    <i className="fas fa-history text-[9px]" />
                    <span>View Changelog</span>
                </div>
            )}
        </div>
    )
}

export default VersionPopup
