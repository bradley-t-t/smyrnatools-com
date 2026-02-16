import React from 'react'

import { usePreferences } from '../../app/context/PreferencesContext'
import SrmLogo from '../../assets/images/srm-logo.svg'

function LoadingScreen({ message = 'Loading...', fullPage = false, inline = false }) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'

    const getContainerStyle = () => {
        const baseStyle = {
            alignItems: 'center',
            display: 'flex',
            justifyContent: 'center'
        }

        if (fullPage) {
            return {
                ...baseStyle,
                backdropFilter: 'blur(8px)',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                bottom: 0,
                left: 0,
                position: 'fixed',
                right: 0,
                top: 0,
                zIndex: 9999
            }
        }

        if (inline) {
            return {
                ...baseStyle,
                backgroundColor: 'transparent',
                padding: '40px 20px'
            }
        }

        return {
            ...baseStyle,
            backgroundColor: 'transparent',
            padding: '60px 40px'
        }
    }

    const contentStyle = {
        alignItems: 'center',
        backgroundColor: accentColor,
        backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
        border: '2px solid rgba(255,255,255,0.15)',
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        justifyContent: 'center',
        padding: '50px 70px'
    }

    const logoStyle = {
        height: '100px',
        width: '100px'
    }

    const textContainerStyle = {
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    }

    const messageStyle = {
        color: 'white',
        fontSize: '16px',
        fontWeight: 600,
        letterSpacing: '1px',
        margin: 0
    }

    const progressBarContainerStyle = {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: '2px',
        height: '4px',
        overflow: 'hidden',
        width: '200px'
    }

    const progressBarStyle = {
        animation: 'progress 1.5s ease-in-out infinite',
        backgroundColor: 'white',
        borderRadius: '2px',
        height: '100%',
        width: '30%'
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
