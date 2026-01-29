import React from 'react'

function VersionPopup({ version }) {
    if (!version) return null

    const popupStyle = {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '10px 20px',
        backgroundColor: '#1e3a5f',
        color: 'white',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000
    }

    return <div style={popupStyle}>Version: {version}</div>
}

export default VersionPopup
