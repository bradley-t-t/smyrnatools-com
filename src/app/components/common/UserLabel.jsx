import React, { useEffect, useState } from 'react'

import { UserService } from '../../../services/UserService'
import { useAccentColor } from '../../hooks/useAccentColor'

/** Size-variant Tailwind class mappings for the label and initials badge. */
const SIZE_CONFIG = {
    large: { fontSize: 'text-base', initialsFontSize: 'text-[13px]', initialsSize: 'h-8 w-8' },
    medium: { fontSize: 'text-sm', initialsFontSize: 'text-[11px]', initialsSize: 'h-[26px] w-[26px]' },
    small: { fontSize: 'text-xs', initialsFontSize: 'text-[10px]', initialsSize: 'h-5 w-5' }
}

/**
 * Extracts up to two-letter initials from a display name.
 * @param {string} displayName
 * @returns {string} Uppercase initials (e.g. "JD" for "John Doe").
 */
function getInitials(displayName) {
    const parts = displayName.trim().split(' ').filter(Boolean)
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    return displayName.substring(0, 2).toUpperCase()
}

/**
 * Inline label that asynchronously resolves and displays a user's name by ID.
 * Optionally shows a colored initials badge or user icon, with loading/error states.
 * @param {Object} props
 * @param {string} props.userId - Supabase user ID to resolve.
 * @param {boolean} [props.showInitials=false] - Show a circular initials badge.
 * @param {boolean} [props.showIcon=false] - Show a generic user icon instead of initials.
 * @param {'small'|'medium'|'large'} [props.size='medium'] - Controls font and badge sizing.
 */
function UserLabel({ userId, showInitials = false, showIcon = false, size = 'medium' }) {
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
                setInitials(getInitials(displayName))
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

    const baseClass = `inline-flex items-center gap-2 text-gray-700 ${sizeStyles.fontSize}`
    const initialsBaseClass = `inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizeStyles.initialsFontSize} ${sizeStyles.initialsSize}`

    if (isLoading) {
        return (
            <span className={baseClass}>
                {showIcon && <i className="fas fa-user text-slate-500" />}
                {showInitials && <span className={`${initialsBaseClass} bg-slate-100 text-slate-400`}>?</span>}
                <span className="h-3.5 w-20 rounded bg-gray-200" />
            </span>
        )
    }

    if (error) {
        return (
            <span className={baseClass} title={`Error: ${error}`}>
                {showIcon ? (
                    <i className="fas fa-exclamation-triangle text-amber-500" />
                ) : showInitials ? (
                    <span className={`${initialsBaseClass} bg-red-50 text-red-800`}>!</span>
                ) : null}
                <span className="font-medium text-gray-700">Unknown User</span>
            </span>
        )
    }

    return (
        <span className={baseClass} data-testid={`user-label-${userId}`}>
            {showIcon ? (
                <i className="fas fa-user text-slate-500" />
            ) : showInitials ? (
                <span className={initialsBaseClass} style={{ backgroundColor: accentColor }}>
                    {initials}
                </span>
            ) : null}
            <span className="font-medium text-gray-700">{userName}</span>
        </span>
    )
}

export default UserLabel
