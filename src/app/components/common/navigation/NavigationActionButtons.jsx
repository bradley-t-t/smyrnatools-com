import React from 'react'

import Badge from '../Badge'
import UserAvatar from '../UserAvatar'

/** Shared classes for chrome-on-accent action buttons in the two-level header. */
const TWO_LEVEL_BUTTON_BASE =
    'relative inline-flex items-center justify-center cursor-pointer rounded-lg bg-white/[0.08] border border-white/10 text-white/80 hover:text-white hover:bg-white/[0.18] active:scale-[0.94] transition-[background-color,color,transform] duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'

/* Map the historical hex colours threaded through legacy nav callers to the
 * semantic Badge tones so the green online-users bubble, red messages
 * bubble, etc., all hit the right dot colour. Any value not in this map (or
 * not a known tone string) falls through to variant="custom" and becomes
 * the dot colour directly — which still produces a coloured bubble rather
 * than the monotone neutral fallback. */
const COLOR_TO_TONE = {
    '#16a34a': 'success',
    '#22c55e': 'success',
    '#2563eb': 'info',
    '#3b82f6': 'info',
    '#ca8a04': 'warning',
    '#dc2626': 'danger',
    '#ef4444': 'danger',
    '#f59e0b': 'warning'
}
const VALID_TONES = new Set(['accent', 'danger', 'info', 'neutral', 'success', 'warning'])

/** Small badge bubble overlaid on icon buttons. `color` accepts either a
 *  Badge tone name (e.g. `'success'`) or a hex string — the historical
 *  `#ef4444` / `#22c55e` defaults are mapped to `'danger'` / `'success'`
 *  so the legacy red and green bubbles render correctly. Unknown hex
 *  values fall through to `variant="custom"` so the bubble still picks
 *  up the supplied hue instead of the monotone neutral fallback.
 *  `accentColor` is no longer used (Badge owns its own theming) but is
 *  kept in the signature for backward compatibility. */
function ActionBadge({ count, accentColor: _accentColor, color, small = false }) {
    if (!count || count <= 0) return null
    const mapped = color ? COLOR_TO_TONE[color.toLowerCase?.()] : null
    const badgeProps = mapped
        ? { tone: mapped }
        : VALID_TONES.has(color)
          ? { tone: color }
          : color
            ? { bg: color, variant: 'custom' }
            : { tone: 'danger' }
    return (
        <Badge
            {...badgeProps}
            size={small ? 'xs' : 'sm'}
            shape="pill"
            weight="bold"
            uppercase={false}
            className="absolute -right-1 -top-1 tabular-nums shadow-sm"
        >
            {count}
        </Badge>
    )
}

/** Compact icon button used in the two-level header for messages/users. */
export function TwoLevelIconButton({
    title,
    iconClasses,
    onClick,
    accentColor,
    badge = 0,
    badgeColor = '#ef4444',
    width = 34
}) {
    return (
        <button type="button"
            className={`${TWO_LEVEL_BUTTON_BASE} h-[34px] gap-1`}
            title={title}
            aria-label={title}
            style={{ width }}
            onClick={onClick}
        >
            {iconClasses.map((cls) => (
                <i key={cls.name} className={`fas ${cls.name}`} style={{ fontSize: cls.size }} aria-hidden="true" />
            ))}
            <ActionBadge count={badge} accentColor={accentColor} color={badgeColor} small />
        </button>
    )
}

/** Avatar pill in the two-level header that opens the user's account view.
 *  Renders the viewer's own initials on their accent colour. */
export function TwoLevelUserAvatar({ accentColor, initials, title, onClick }) {
    return (
        <button type="button"
            onClick={onClick}
            title={title}
            aria-label={title}
            className="rounded-lg border border-white/10 bg-transparent p-0 cursor-pointer active:scale-[0.94] transition-transform duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
            <UserAvatar accentColor={accentColor} initials={initials} size={34} rounded="lg" />
        </button>
    )
}

/** Messages icon button in the top-bar header — wider to fit bell + envelope. */
export function TopBarMessagesButton({ onClick, combinedCount, accentColor, isTablet }) {
    const size = isTablet ? 'h-8 w-10 rounded-lg gap-[3px] text-xs' : 'h-[42px] w-[52px] rounded-[12px] gap-1 text-sm'
    return (
        <button type="button"
            className={`relative inline-flex items-center justify-center text-white bg-white/[0.05] border border-white/10 cursor-pointer flex-shrink-0 hover:bg-white/[0.18] hover:-translate-y-[1px] active:scale-[0.96] active:translate-y-0 transition-[background-color,transform] duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${size}`}
            onClick={onClick}
            title="Messages"
            aria-label={combinedCount > 0 ? `Messages, ${combinedCount} unread` : 'Messages'}
        >
            <i className={`fas fa-bell ${isTablet ? 'text-xs' : 'text-sm'}`} aria-hidden="true" />
            <i className={`fas fa-envelope ${isTablet ? 'text-[11px]' : 'text-[13px]'}`} aria-hidden="true" />
            <ActionBadge count={combinedCount} accentColor={accentColor} small={isTablet} />
        </button>
    )
}

/** Square icon button in the top-bar header (online users / account). */
export function TopBarIconButton({
    icon,
    title,
    onClick,
    isActive = false,
    badge = null,
    badgeColor = '#ef4444',
    tutorialTarget = null,
    isTablet,
    accentColor
}) {
    const size = isTablet ? 'h-8 w-8 rounded-lg text-[13px]' : 'h-[42px] w-[42px] rounded-[12px] text-base'
    const tone = isActive
        ? 'bg-white/[0.18] border border-white/15'
        : 'bg-white/[0.05] border border-white/10 hover:bg-white/[0.18]'
    return (
        <button type="button"
            className={`relative inline-flex items-center justify-center text-white cursor-pointer flex-shrink-0 hover:-translate-y-[1px] active:scale-[0.96] active:translate-y-0 transition-[background-color,transform] duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${size} ${tone}`}
            onClick={onClick}
            title={title}
            aria-label={title}
            aria-pressed={isActive}
            data-tutorial-target={tutorialTarget}
        >
            <i className={`fas ${icon}`} aria-hidden="true" />
            <ActionBadge count={badge} accentColor={accentColor} color={badgeColor} small={isTablet} />
        </button>
    )
}
