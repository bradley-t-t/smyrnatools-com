/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { BADGE_PILL_TINTS } from '../../../constants/topSectionConstants'
import Badge from '../../common/Badge'

/**
 * Top-section badge row — parses a string like "5 Active · 2 Shop" into a
 * row of compact, color-tinted pills. Each pill uses the unified <Badge />
 * component with `variant="custom"` so it can carry the per-status tint
 * looked up from BADGE_PILL_TINTS. Single-segment input renders a single
 * pill using the supplied accent color.
 *
 * Renamed from the legacy `Badge` export to avoid collision with the new
 * unified common/Badge. Callers must import `TopSectionBadgeRow` instead.
 *
 * Dynamic per-status hex colors come from BADGE_PILL_TINTS and pass through
 * the Badge via inline `style` (background + borderColor + color) — Tailwind
 * arbitrary classes can't express data-driven hex at build time. This mirrors
 * the established pattern in PlanScheduleFilterDrawer / PlanDashboardClockInBoard.
 */
const TopSectionBadgeRow = ({ children, onClick, onPillClick, accentColor, isDark }) => {
    const text = typeof children === 'string' ? children : ''
    const parts = text.split('·').map((s) => s.trim())
    const parsed = parts
        .map((p) => {
            const match = p.match(/^(\d+)\s+(.+)$/)
            return match ? { count: match[1], label: match[2] } : null
        })
        .filter(Boolean)

    const textColor = isDark ? '#ffffff' : '#000000'

    if (parsed.length >= 2) {
        return (
            <div className="flex items-center gap-1 flex-wrap">
                {parsed.map(({ count, label }) => {
                    const tint = BADGE_PILL_TINTS[label]
                    if (!tint) return null
                    const num = parseInt(count, 10)
                    const isZeroVariant = label === 'Unassigned' && num === 0
                    const color = isZeroVariant ? '#64748b' : tint
                    const handleClick = onPillClick ? () => onPillClick(label) : onClick
                    return (
                        <Badge
                            key={label}
                            variant="custom"
                            size="md"
                            shape="rounded"
                            weight="semibold"
                            uppercase={false}
                            onClick={handleClick}
                            className="gap-1 border"
                            style={{
                                background: `${color}14`,
                                borderColor: `${color}30`,
                                color: textColor
                            }}
                        >
                            <span className="font-mono tabular-nums">{count}</span>
                            <span>{label}</span>
                        </Badge>
                    )
                })}
            </div>
        )
    }

    return (
        <Badge
            variant="custom"
            size="md"
            shape="rounded"
            weight="semibold"
            uppercase={false}
            onClick={onClick}
            className="border"
            style={{
                background: `${accentColor}14`,
                borderColor: `${accentColor}30`,
                color: textColor
            }}
        >
            {children}
        </Badge>
    )
}

export default TopSectionBadgeRow
