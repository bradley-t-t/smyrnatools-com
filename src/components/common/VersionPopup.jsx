import React from 'react'

function VersionPopup({ version }) {
    if (!version) return null

    const popupStyle = {
        backgroundColor: '#1e3a5f',
        borderRadius: '10px',
        bottom: '20px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        color: 'white',
        fontSize: '13px',
        fontWeight: 500,
        left: '50%',
        padding: '10px 20px',
        position: 'fixed',
        transform: 'translateX(-50%)',
        zIndex: 1000
    }

    return <div style={popupStyle}>Version: {version}</div>
}

export default VersionPopup
