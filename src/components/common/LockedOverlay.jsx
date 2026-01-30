import React from 'react'
import ReactDOM from 'react-dom'

import { useAuth } from '../../app/context/AuthContext'
import VideoBackground from './VideoBackground'

function LockedOverlay({ reason }) {
    const { signOut } = useAuth()

    const handleSignOut = async () => {
        try {
            await signOut()
            window.location.href = '/'
        } catch (error) {
            console.error('Sign out failed:', error)
        }
    }

    const handleRefresh = () => {
        window.location.reload()
    }

    const getMessage = () => {
        if (reason === 'invalid-session') {
            return 'Your session has expired or is invalid. Please refresh the page or sign out and log in again to continue.'
        }
        if (reason === 'no-plant') {
            return 'Your account is not assigned to a plant. Please contact your district manager to complete your setup.'
        }
        return 'You must contact your district manager for them to approve your sign-up.'
    }

    const getTitle = () => {
        if (reason === 'invalid-session') {
            return 'Session Invalid'
        }
        if (reason === 'no-plant') {
            return 'Setup Incomplete'
        }
        return 'Access Pending'
    }

    if (typeof document === 'undefined' || !document.body) {
        return null
    }

    const backdropStyle = {
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        maxWidth: '440px',
        padding: '48px',
        position: 'relative',
        textAlign: 'center',
        width: '90%',
        zIndex: 1
    }

    const titleStyle = {
        color: '#1e3a5f',
        fontSize: '28px',
        fontWeight: 700,
        margin: '0 0 16px 0'
    }

    const messageStyle = {
        color: '#64748b',
        fontSize: '16px',
        lineHeight: 1.7,
        margin: '0 0 32px 0'
    }

    const actionsStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    }

    const buttonBaseStyle = {
        alignItems: 'center',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        display: 'flex',
        fontSize: '15px',
        fontWeight: 600,
        gap: '10px',
        justifyContent: 'center',
        padding: '14px 24px',
        width: '100%'
    }

    const refreshButtonStyle = {
        ...buttonBaseStyle,
        backgroundColor: '#1e3a5f',
        color: 'white'
    }

    const signOutButtonStyle = {
        ...buttonBaseStyle,
        backgroundColor: '#f1f5f9',
        color: '#374151'
    }

    return ReactDOM.createPortal(
        <div style={backdropStyle}>
            <VideoBackground />
            <div style={modalStyle}>
                <div>
                    <h1 style={titleStyle}>{getTitle()}</h1>
                    <p style={messageStyle}>{getMessage()}</p>
                    <div style={actionsStyle}>
                        <button style={refreshButtonStyle} onClick={handleRefresh}>
                            <i className="fas fa-sync-alt"></i>
                            Refresh Page
                        </button>
                        <button style={signOutButtonStyle} onClick={handleSignOut}>
                            <i className="fas fa-sign-out-alt"></i>
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default LockedOverlay
