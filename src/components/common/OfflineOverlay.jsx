import React, { useState } from 'react'
import ReactDOM from 'react-dom'

function OfflineOverlay({ onRetry }) {
    const [isRetrying, setIsRetrying] = useState(false)

    if (typeof document === 'undefined' || !document.body) {
        return null
    }

    const handleRetry = async () => {
        setIsRetrying(true)
        try {
            await onRetry()
        } finally {
            setIsRetrying(false)
        }
    }

    const backdropStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)'
    }

    const modalStyle = {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
    }

    const titleStyle = {
        fontSize: '24px',
        fontWeight: 700,
        color: '#1e3a5f',
        margin: '0 0 16px 0'
    }

    const messageStyle = {
        fontSize: '15px',
        color: '#64748b',
        lineHeight: 1.6,
        margin: '0 0 24px 0'
    }

    const buttonStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '14px 28px',
        backgroundColor: '#1e3a5f',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: isRetrying ? 'not-allowed' : 'pointer',
        opacity: isRetrying ? 0.7 : 1,
        transition: 'all 0.2s'
    }

    const iconStyle = {
        animation: isRetrying ? 'spin 1s linear infinite' : 'none'
    }

    return ReactDOM.createPortal(
        <>
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
            <div style={backdropStyle}>
                <div style={modalStyle}>
                    <div>
                        <h1 style={titleStyle}>Connection Lost</h1>
                        <p style={messageStyle}>
                            Your connection appears to be offline or unstable. Please check your network and try again.
                        </p>
                        <div>
                            <button style={buttonStyle} onClick={handleRetry} disabled={isRetrying}>
                                <i className="fas fa-redo" style={iconStyle}></i>
                                {isRetrying ? 'Checking Connection...' : 'Retry Connection'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>,
        document.body
    )
}

export default OfflineOverlay
