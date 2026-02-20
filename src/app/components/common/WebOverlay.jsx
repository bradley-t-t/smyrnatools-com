import React from 'react'

import { useAccentColor } from '../../hooks/useAccentColor'

function WebOverlay({ url, onClose }) {
    const accentColor = useAccentColor()

    return (
        <div className="fixed inset-0 z-[10000] flex flex-col bg-white">
            <div
                className="flex items-center gap-4 border-b px-4 py-3"
                style={{ backgroundColor: accentColor, borderBottomColor: `${accentColor}cc` }}
            >
                <button
                    className="flex h-9 w-9 items-center justify-center rounded-lg border-none bg-white/20 text-base text-white hover:bg-white/30"
                    onClick={onClose}
                >
                    <i className="fas fa-times" />
                </button>
                <div className="flex-1 truncate text-sm text-white/80">{url}</div>
            </div>
            <iframe
                src={url}
                title="External Content"
                className="flex-1 border-none"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
        </div>
    )
}

export default WebOverlay
