import React from 'react'
import SrmLogo from '../../assets/images/srm-logo.svg'

function LoadingScreen({ message = 'Loading...', fullPage = false, inline = false }) {
    const getContainerStyle = () => {
        const baseStyle = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }

        if (fullPage) {
            return {
                ...baseStyle,
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)'
            }
        }

        if (inline) {
            return {
                ...baseStyle,
                padding: '40px 20px',
                backgroundColor: 'transparent'
            }
        }

        return {
            ...baseStyle,
            padding: '60px 40px',
            backgroundColor: 'transparent'
        }
    }

    const contentStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '28px',
        padding: '50px 70px',
        backgroundColor: '#1e3a5f',
        backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
        borderRadius: '20px',
        border: '2px solid rgba(255,255,255,0.15)'
    }

    const logoStyle = {
        width: '100px',
        height: '100px'
    }

    const textContainerStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
    }

    const messageStyle = {
        fontSize: '16px',
        fontWeight: 600,
        color: 'white',
        margin: 0,
        letterSpacing: '1px'
    }

    const progressBarContainerStyle = {
        width: '200px',
        height: '4px',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: '2px',
        overflow: 'hidden'
    }

    const progressBarStyle = {
        height: '100%',
        width: '30%',
        backgroundColor: 'white',
        borderRadius: '2px',
        animation: 'progress 1.5s ease-in-out infinite'
    }

    return (
        <>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes progress {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(250%); }
                    100% { transform: translateX(450%); }
                }
            `}</style>
            <div style={getContainerStyle()}>
                <div style={contentStyle}>
                    <img src={SrmLogo} alt="Loading" style={logoStyle} />
                    <div style={textContainerStyle}>
                        <p style={messageStyle}>{message}</p>
                        <div style={progressBarContainerStyle}>
                            <div style={progressBarStyle}></div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default LoadingScreen
