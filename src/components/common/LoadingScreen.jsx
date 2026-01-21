import React from 'react';
import SrmLogo from '../../assets/images/srm-logo.svg';

function LoadingScreen({message = 'Loading...', fullPage = false, inline = false}) {
    const getContainerStyle = () => {
        const baseStyle = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        };

        if (fullPage) {
            return {
                ...baseStyle,
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(4px)'
            };
        }

        if (inline) {
            return {
                ...baseStyle,
                padding: '40px 20px',
                backgroundColor: 'transparent'
            };
        }

        return {
            ...baseStyle,
            padding: '60px 40px',
            backgroundColor: 'transparent'
        };
    };

    const contentStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        padding: '48px 56px',
        backgroundColor: '#1e3a5f',
        borderRadius: '20px'
    };

    const animationStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    };

    const logoStyle = {
        width: '100px',
        height: '100px',
        animation: 'bounce 1s ease-in-out infinite'
    };

    const messageStyle = {
        fontSize: '15px',
        fontWeight: 500,
        color: 'white',
        margin: 0
    };

    return (
        <>
            <style>{`
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-12px); }
                }
            `}</style>
            <div style={getContainerStyle()}>
                <div style={contentStyle}>
                    <div style={animationStyle}>
                        <img src={SrmLogo} alt="Loading" style={logoStyle}/>
                    </div>
                    <p style={messageStyle}>{message}</p>
                </div>
            </div>
        </>
    );
}

export default LoadingScreen;