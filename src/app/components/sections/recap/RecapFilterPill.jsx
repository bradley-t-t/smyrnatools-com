import React from 'react'

import Badge from '../../common/Badge'

/**
 * Toggleable pill button used by the recap modal's date/type filter rows.
 * Active state uses the unified Badge's accent tone in solid variant; idle
 * uses the soft tint. Theme tokens flow through Badge so all three themes
 * stay consistent automatically. The `accentColor` prop is accepted but
 * ignored — Badge reads `var(--accent)` directly via the `accent` tone.
 */
function RecapFilterPill({ active, label, onClick }) {
    return (
        <Badge
            as="button"
            tone="accent"
            variant={active ? 'solid' : 'soft'}
            active={active}
            size="md"
            shape="rounded-md"
            weight="semibold"
            uppercase={false}
            onClick={onClick}
        >
            {label}
        </Badge>
    )
}

export default RecapFilterPill
