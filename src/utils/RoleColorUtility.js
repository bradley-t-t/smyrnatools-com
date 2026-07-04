/**
 * Maps a role's weight to a theme-aware color token so role badges and
 * status indicators carry semantic hierarchy at a glance: IT/executive
 * roles get high-emphasis hues, line roles get the brand accent, entry
 * and inactive roles fade toward neutral. Returns a CSS color string
 * (a `var(--token)`) that resolves correctly in dark / light / gray.
 */
const COLOR_BY_TIER = {
    admin: 'var(--status-danger)',
    entry: 'var(--status-spare)',
    executive: 'var(--status-warning)',
    field: 'var(--status-active)',
    inactive: 'var(--text-tertiary)',
    manager: 'var(--accent)',
    specialist: 'var(--status-shop)'
}

function tierForWeight(weight) {
    const numericWeight = Number(weight) || 0
    if (numericWeight >= 1000) return 'admin'
    if (numericWeight >= 70) return 'executive'
    if (numericWeight >= 40) return 'manager'
    if (numericWeight >= 25) return 'specialist'
    if (numericWeight >= 5) return 'field'
    if (numericWeight >= 1) return 'entry'
    return 'inactive'
}

/**
 * Resolves the role color for any object exposing either `weight` (raw
 * role records) or `roleWeight` (manager / user records that flatten the
 * role onto the parent).
 */
export function getRoleColor(roleOrEntity) {
    const weight = roleOrEntity?.weight ?? roleOrEntity?.roleWeight
    return COLOR_BY_TIER[tierForWeight(weight)]
}
