import React from 'react'

function WebOverlay({ url, onClose }) {
    const containerStyle = {
        backgroundColor: 'white',
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        left: 0,
        position: 'fixed',
        right: 0,
        top: 0,
        zIndex: 10000
    }

    const headerStyle = {
        alignItems: 'center',
        backgroundColor: '#1e3a5f',
        borderBottom: '1px solid #163352',
        display: 'flex',
        gap: '16px',
        padding: '12px 16px'
    }

    const closeButtonStyle = {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        border: 'none',
        borderRadius: '8px',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        fontSize: '16px',
        height: '36px',
        justifyContent: 'center',
        width: '36px'
    }

    const urlDisplayStyle = {
        color: 'rgba(255, 255, 255, 0.8)',
        flex: 1,
        fontSize: '14px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    }

    const frameStyle = {
        border: 'none',
        flex: 1,
        width: '100%'
    }

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <button style={closeButtonStyle} onClick={onClose}>
                    <i className="fas fa-times"></i>
                </button>
                <div style={urlDisplayStyle}>{url}</div>
            </div>
            <iframe
                src={url}
                title="External Content"
                style={frameStyle}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
        </div>
    )
}

export default WebOverlay
