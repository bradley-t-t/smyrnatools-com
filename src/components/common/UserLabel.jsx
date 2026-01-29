import React, { useEffect, useState } from 'react'
import { UserService } from '../../services/UserService'

function UserLabel({ userId, showInitials = false, showIcon = false, size = 'medium' }) {
    const [userName, setUserName] = useState('')
    const [initials, setInitials] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let isMounted = true

        async function fetchUserData() {
            if (!userId) {
                if (isMounted) {
                    setUserName('Unknown User')
                    setInitials('?')
                    setIsLoading(false)
                }
                return
            }

            try {
                const displayName = await UserService.getUserDisplayName(userId)

                if (!isMounted) return

                setUserName(displayName)

                const nameParts = displayName
                    .trim()
                    .split(' ')
                    .filter((part) => part)
                if (nameParts.length > 1) {
                    setInitials(`${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase())
                } else if (displayName.includes('@')) {
                    setInitials(displayName.substring(0, 2).toUpperCase())
                } else if (displayName.startsWith('User ')) {
                    setInitials(displayName.substring(0, 2).toUpperCase())
                } else {
                    setInitials(displayName.substring(0, 2).toUpperCase())
                }
            } catch (err) {
                if (isMounted) {
                    setError(err.message)
                    setUserName('Unknown User')
                    setInitials('?')
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        fetchUserData()

        return () => {
            isMounted = false
        }
    }, [userId])

    const getSizeStyles = () => {
        switch (size) {
            case 'small':
                return { fontSize: '12px', initialsSize: '20px', initialsFontSize: '10px' }
            case 'large':
                return { fontSize: '16px', initialsSize: '32px', initialsFontSize: '13px' }
            default:
                return { fontSize: '14px', initialsSize: '26px', initialsFontSize: '11px' }
        }
    }

    const sizeStyles = getSizeStyles()

    const labelStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: sizeStyles.fontSize,
        color: '#374151'
    }

    const initialsStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: sizeStyles.initialsSize,
        height: sizeStyles.initialsSize,
        borderRadius: '50%',
        backgroundColor: '#1e3a5f',
        color: 'white',
        fontSize: sizeStyles.initialsFontSize,
        fontWeight: 600,
        flexShrink: 0
    }

    const initialsErrorStyle = {
        ...initialsStyle,
        backgroundColor: '#fef2f2',
        color: '#991b1b'
    }

    const initialsLoadingStyle = {
        ...initialsStyle,
        backgroundColor: '#f1f5f9',
        color: '#94a3b8'
    }

    const nameStyle = {
        color: '#374151',
        fontWeight: 500
    }

    const nameLoadingStyle = {
        ...nameStyle,
        width: '80px',
        height: '14px',
        backgroundColor: '#e5e7eb',
        borderRadius: '4px'
    }

    const iconStyle = {
        color: '#64748b',
        fontSize: sizeStyles.fontSize
    }

    const errorIconStyle = {
        ...iconStyle,
        color: '#f59e0b'
    }

    if (isLoading) {
        return (
            <span style={labelStyle}>
                {showIcon && <i className="fas fa-user" style={iconStyle}></i>}
                {showInitials && <span style={initialsLoadingStyle}>?</span>}
                <span style={nameLoadingStyle}></span>
            </span>
        )
    }

    if (error) {
        return (
            <span style={labelStyle} title={`Error: ${error}`}>
                {showIcon ? (
                    <i className="fas fa-exclamation-triangle" style={errorIconStyle}></i>
                ) : showInitials ? (
                    <span style={initialsErrorStyle}>!</span>
                ) : null}
                <span style={nameStyle}>Unknown User</span>
            </span>
        )
    }

    return (
        <span style={labelStyle} data-testid={`user-label-${userId}`}>
            {showIcon ? (
                <i className="fas fa-user" style={iconStyle}></i>
            ) : showInitials ? (
                <span style={initialsStyle}>{initials}</span>
            ) : null}
            <span style={nameStyle}>{userName}</span>
        </span>
    )
}

export default UserLabel
