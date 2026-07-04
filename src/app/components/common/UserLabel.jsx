/* eslint-disable react/forbid-dom-props */
import React, { useEffect, useState } from 'react'

import { UserService } from '../../../services/UserService'
import UserUtility from '../../../utils/UserUtility'
import { useAccentColor } from '../../hooks/useAccentColor'

/** Size-variant Tailwind class mappings for the label and initials badge. */
const SIZE_CONFIG = {
    large: { fontSize: 'text-base', initialsFontSize: 'text-[13px]', initialsSize: 'h-8 w-8' },
    medium: { fontSize: 'text-sm', initialsFontSize: 'text-[11px]', initialsSize: 'h-[26px] w-[26px]' },
    small: { fontSize: 'text-xs', initialsFontSize: 'text-[10px]', initialsSize: 'h-5 w-5' }
}

/**
 * Inline label that asynchronously resolves and displays a user's name by ID.
 * Optionally shows a colored initials badge or user icon, with loading/error
 * states. Set `interactive` to add a subtle hover lift so the label reads as a
 * clickable pill when wrapped in a button / link.
 *
 * @param {Object} props
 * @param {string} props.userId - database user ID to resolve.
 * @param {boolean} [props.showInitials=false] - Show a circular initials badge.
 * @param {boolean} [props.showIcon=false] - Show a generic user icon instead of initials.
 * @param {'small'|'medium'|'large'} [props.size='medium'] - Controls font and badge sizing.
 * @param {string} [props.secondary] - Optional secondary text (role/title) rendered below the name.
 * @param {boolean} [props.interactive=false] - When true, applies hover styling for clickable contexts.
 * @param {string} [props.className] - Extra classes appended to the root span.
 */
function UserLabel({
    userId,
    showInitials = false,
    showIcon = false,
    size = 'medium',
    secondary,
    interactive = false,
    className = ''
}) {
    const [userName, setUserName] = useState('')
    const [initials, setInitials] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const accentColor = useAccentColor()
    const sizeStyles = SIZE_CONFIG[size] || SIZE_CONFIG.medium

    useEffect(() => {
        let mounted = true
        async function fetchUserData() {
            if (!userId) {
                if (mounted) {
                    setUserName('Unknown User')
                    setInitials('?')
                    setIsLoading(false)
                }
                return
            }
            try {
                const displayName = await UserService.getUserDisplayName(userId)
                if (!mounted) return
                setUserName(displayName)
                setInitials(UserUtility.getInitials(displayName))
            } catch (err) {
                if (mounted) {
                    setError(err.message)
                    setUserName('Unknown User')
                    setInitials('?')
                }
            } finally {
                if (mounted) setIsLoading(false)
            }
        }
        fetchUserData()
        return () => {
            mounted = false
        }
    }, [userId])

    const hoverClass = interactive
        ? 'transition-colors duration-150 hover:text-text-primary rounded-md px-1 -mx-1 hover:bg-bg-hover'
        : ''
    const baseClass = `inline-flex items-center gap-2 text-text-primary ${sizeStyles.fontSize} ${hoverClass} ${className}`
    const initialsBaseClass = `inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm ${sizeStyles.initialsFontSize} ${sizeStyles.initialsSize}`

    if (isLoading) {
        return (
            <span className={baseClass} aria-busy="true">
                {showIcon && <i className="fas fa-user text-text-tertiary" aria-hidden="true" />}
                {showInitials && (
                    <span className={`${initialsBaseClass} bg-bg-tertiary text-text-tertiary shadow-none`}>?</span>
                )}
                <span className="h-3.5 w-20 animate-pulse rounded bg-bg-tertiary" />
            </span>
        )
    }
    if (error) {
        return (
            <span className={baseClass} title={`Error: ${error}`}>
                {showIcon ? (
                    <i className="fas fa-exclamation-triangle text-status-danger" aria-hidden="true" />
                ) : showInitials ? (
                    <span className={`${initialsBaseClass} bg-status-danger`}>!</span>
                ) : null}
                <span className="font-medium text-text-secondary">Unknown User</span>
            </span>
        )
    }
    return (
        <span className={baseClass} data-testid={`user-label-${userId}`}>
            {showIcon ? (
                <i className="fas fa-user text-text-tertiary" aria-hidden="true" />
            ) : showInitials ? (
                <span className={initialsBaseClass} style={{ backgroundColor: accentColor }}>
                    {initials}
                </span>
            ) : null}
            <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-text-primary">{userName}</span>
                {secondary && <span className="truncate text-xs font-normal text-text-secondary">{secondary}</span>}
            </span>
        </span>
    )
}

export default UserLabel
