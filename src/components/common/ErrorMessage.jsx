import React from 'react'

function ErrorMessage({ message, onDismiss, className = '' }) {
    if (!message) return null

    const containerStyle = {
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '10px',
        color: '#991b1b',
        display: 'flex',
        fontSize: '14px',
        gap: '12px',
        justifyContent: 'space-between',
        lineHeight: 1.5,
        padding: '14px 18px'
    }

    const textStyle = {
        color: '#991b1b',
        flex: 1
    }

    const buttonStyle = {
        alignItems: 'center',
        background: 'transparent',
        border: 'none',
        borderRadius: '6px',
        color: '#991b1b',
        cursor: 'pointer',
        display: 'flex',
        flexShrink: 0,
        height: '28px',
        justifyContent: 'center',
        width: '28px'
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
