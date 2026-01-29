import React from 'react'

function ErrorMessage({ message, onDismiss, className = '' }) {
    if (!message) return null

    const containerStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '14px 18px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '10px',
        color: '#991b1b',
        fontSize: '14px',
        lineHeight: 1.5
    }

    const textStyle = {
        flex: 1,
        color: '#991b1b'
    }

    const buttonStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        border: 'none',
        background: 'transparent',
        color: '#991b1b',
        cursor: 'pointer',
        borderRadius: '6px',
        flexShrink: 0
    }

    return (
        <div style={containerStyle} className={className}>
            <span style={textStyle}>{message}</span>
            {onDismiss && (
                <button onClick={onDismiss} style={buttonStyle} aria-label="Dismiss error">
                    <i className="fas fa-times"></i>
                </button>
            )}
        </div>
    )
}

export default ErrorMessage
