import React from 'react'

import { useAccentColor } from '../../hooks/useAccentColor'

function VersionPopup({ version }) {
    const accentColor = useAccentColor()

    if (!version) return null

    return (
        <div
            className="fixed bottom-5 left-1/2 z-[1000] -translate-x-1/2 rounded-[10px] px-5 py-2.5 text-[13px] font-medium text-white shadow-lg"
            style={{ backgroundColor: accentColor }}
        >
            Version: {version}
        </div>
    )
}

export default VersionPopup
