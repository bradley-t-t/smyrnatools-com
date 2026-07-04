/* eslint-disable react/forbid-dom-props */
import React from 'react'

import UserUtility from '../../../utils/UserUtility'
import { DEFAULT_ACCENT_COLOR } from '../../constants/themeConstants'
import { useUserAccent } from '../../hooks/useUserAccent'

/**
 * Size presets — diameter (and matching font size) for the most common
 * avatar slots across the app. `xs` for compact lists / activity feeds,
 * `sm` for inline lists, `md` for the default presence chip / online
 * users / conversation rows, `lg` for header pills, `xl` for the My
 * Account hero. Numeric `size` props override these.
 */
const SIZE_PRESETS = {
    lg: { diameter: 34, fontSize: 13 },
    md: { diameter: 28, fontSize: 11 },
    sm: { diameter: 24, fontSize: 10 },
    xl: { diameter: 56, fontSize: 18 },
    xs: { diameter: 20, fontSize: 9 }
}

/**
 * Circular (or rounded-square) badge that displays a user's initials on
 * their own accent colour, with white letters. The de-facto avatar for
 * the entire app — presence overlays, online list, conversation rows,
 * comment threads, the My Account hero, the header pill, etc.
 *
 * Pass `userId` to have the avatar fetch the owner's accent from
 * `users_preferences` automatically. Pass `accentColor` explicitly when
 * the caller already has it (saves a round-trip and avoids a flash of
 * the default colour). When both are absent the avatar falls back to
 * the project's default accent.
 *
 * `name` (or precomputed `initials`) drives the letters. `size` accepts
 * a preset key or a number of pixels. `rounded` selects between full
 * circle (`full`, default) and a rounded square (`md`/`lg`) for the
 * header / notification slots that traditionally used a soft square.
 * Pass `ring` for a 2 px halo of `--bg-primary` so an online overlay or
 * presence chip reads clearly when stacked on a coloured surface.
 */
function UserAvatar({
    accentColor,
    children,
    className = '',
    initials: initialsProp,
    name,
    ring = false,
    rounded = 'full',
    size = 'md',
    style: styleOverride,
    title,
    userId,
    ...rest
}) {
    const resolvedFromHook = useUserAccent(accentColor ? null : userId)
    const finalAccent = accentColor || resolvedFromHook || DEFAULT_ACCENT_COLOR
    const preset = typeof size === 'string' ? SIZE_PRESETS[size] || SIZE_PRESETS.md : null
    const diameter = preset ? preset.diameter : Number(size) || SIZE_PRESETS.md.diameter
    const fontSize = preset ? preset.fontSize : Math.max(9, Math.round(diameter * 0.4))
    const letters = (initialsProp ?? UserUtility.getInitials(name || '')) || ''
    const radiusClass = rounded === 'full' ? 'rounded-full' : rounded === 'lg' ? 'rounded-lg' : 'rounded-md'
    const ringClass = ring ? 'ring-2 ring-bg-primary' : ''
    return (
        <span
            className={`relative inline-flex shrink-0 select-none items-center justify-center font-semibold text-white shadow-sm animate-fade-in-fast motion-reduce:animate-none ${radiusClass} ${ringClass} ${className}`}
            style={{
                background: finalAccent,
                fontSize: `${fontSize}px`,
                height: `${diameter}px`,
                minWidth: `${diameter}px`,
                width: `${diameter}px`,
                ...styleOverride
            }}
            title={title}
            {...rest}
        >
            {letters || <i className="fas fa-user" aria-hidden="true" />}
            {children}
        </span>
    )
}

export default UserAvatar
