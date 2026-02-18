import React from 'react'

import SmyrnaLogo from '../../../assets/images/SmyrnaLogo.png'
import { useAuth } from '../../context/AuthContext'

function TerminatedOverlay() {
    const { signOut } = useAuth()

    const handleSignOut = async () => {
        try {
            await signOut()
            window.location.href = '/'
        } catch (error) {}
    }

    const containerStyle = {
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

    const contentStyle = {
        backgroundColor: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        maxWidth: '440px',
        padding: '48px',
        textAlign: 'center',
        width: '90%'
    }

    const logoStyle = {
        height: 'auto',
        marginBottom: '24px',
        width: '120px'
    }

    const titleStyle = {
        color: '#991b1b',
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

    const buttonStyle = {
        alignItems: 'center',
        backgroundColor: '#1e3a5f',
        border: 'none',
        borderRadius: '12px',
        color: 'white',
        cursor: 'pointer',
        display: 'inline-flex',
        fontSize: '15px',
        fontWeight: 600,
        gap: '10px',
        justifyContent: 'center',
        padding: '14px 32px',
        width: '100%'
    }

    return (
        <div style={containerStyle}>
            <div style={contentStyle}>
                <img src={SmyrnaLogo} alt="Smyrna Logo" style={logoStyle} />
                <h1 style={titleStyle}>Access Revoked</h1>
                <p style={messageStyle}>
                    Your access to this application has been revoked. Please contact your district manager for more
                    information.
                </p>
                <button style={buttonStyle} onClick={handleSignOut}>
                    Sign Out
                </button>
            </div>
        </div>
    )
}

export default TerminatedOverlay
