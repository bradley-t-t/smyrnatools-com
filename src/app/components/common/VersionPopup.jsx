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
            className="fixed bottom-5 left-1/2 z-[1000] -translate-x-1/2 rounded-[10px] px-5 py-2.5 text-[13px] font-medium text-white shadow-lg"
            style={{ backgroundColor: accentColor, cursor: onClick ? 'pointer' : 'default' }}
            onClick={onClick}
        >
            Version: {version}
        </div>
    )
}

export default VersionPopup
