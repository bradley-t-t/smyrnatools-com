import React from 'react';
import {useAuth} from '../../app/context/AuthContext';
import SmyrnaLogo from '../../assets/images/SmyrnaLogo.png';

function TerminatedOverlay() {
    const {signOut} = useAuth();

    const handleSignOut = async () => {
        try {
            await signOut();
            window.location.href = '/';
        } catch (error) {
        }
    };

    const containerStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
    };

    const contentStyle = {
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '48px',
        maxWidth: '440px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)'
    };

    const logoStyle = {
        width: '120px',
        height: 'auto',
        marginBottom: '24px'
    };

    const titleStyle = {
        fontSize: '28px',
        fontWeight: 700,
        color: '#991b1b',
        margin: '0 0 16px 0'
    };

    const messageStyle = {
        fontSize: '16px',
        color: '#64748b',
        lineHeight: 1.7,
        margin: '0 0 32px 0'
    };

    const buttonStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '14px 32px',
        backgroundColor: '#1e3a5f',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
        width: '100%'
    };

    return (
        <div style={containerStyle}>
            <div style={contentStyle}>
                <img src={SmyrnaLogo} alt="Smyrna Logo" style={logoStyle}/>
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
    );
}

export default TerminatedOverlay;