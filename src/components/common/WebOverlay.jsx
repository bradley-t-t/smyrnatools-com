import React from 'react';

function WebOverlay({url, onClose}) {
    const containerStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column'
    }

    const headerStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 16px',
        backgroundColor: '#1e3a5f',
        borderBottom: '1px solid #163352'
    }

    const closeButtonStyle = {
        width: '36px',
        height: '36px',
        border: 'none',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        color: 'white',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px'
    }

    const urlDisplayStyle = {
        flex: 1,
        fontSize: '14px',
        color: 'rgba(255, 255, 255, 0.8)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    }

    const frameStyle = {
        flex: 1,
        width: '100%',
        border: 'none'
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
    );
}

export default WebOverlay;