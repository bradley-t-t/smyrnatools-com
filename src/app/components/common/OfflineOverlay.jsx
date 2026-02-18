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
        alignItems: 'center',
        backdropFilter: 'blur(4px)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        left: 0,
        position: 'fixed',
        right: 0,
        top: 0,
        zIndex: 9999
    }

    const modalStyle = {
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        maxWidth: '400px',
        padding: '40px',
        textAlign: 'center',
        width: '90%'
    }

    const titleStyle = {
        color: '#1e3a5f',
        fontSize: '24px',
        fontWeight: 700,
        margin: '0 0 16px 0'
    }

    const messageStyle = {
        color: '#64748b',
        fontSize: '15px',
        lineHeight: 1.6,
        margin: '0 0 24px 0'
    }

    const buttonStyle = {
        alignItems: 'center',
        backgroundColor: '#1e3a5f',
        border: 'none',
        borderRadius: '10px',
        color: 'white',
        cursor: isRetrying ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        fontSize: '15px',
        fontWeight: 600,
        gap: '10px',
        justifyContent: 'center',
        opacity: isRetrying ? 0.7 : 1,
        padding: '14px 28px',
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
