/**
 * Severity styling tokens for the issue modal. `fg` carries the saturated
 * accent used by non-pill accents (e.g. the left-border on the send-issue
 * modal card). `icon` is the FontAwesome glyph rendered inside the pill.
 * Pill backgrounds now flow through the unified `<Badge />` component via
 * `SEVERITY_TO_TONE` below.
 *
 * Severity follows the universal red → amber → green ramp:
 *   High   = danger (red)   — needs immediate attention
 *   Medium = warning (amber) — important but not urgent
 *   Low    = success (green) — informational / minor
 */
export const SEVERITY_PALETTE = {
    High: { fg: '#dc2626', icon: 'fa-triangle-exclamation' },
    Low: { fg: '#16a34a', icon: 'fa-circle-info' },
    Medium: { fg: '#d97706', icon: 'fa-circle-exclamation' }
}

/**
 * Severity → unified Badge tone. Used by IssueModalSection and SendIssueMessageModal
 * so severity pills route through the shared <Badge /> component with consistent
 * theme tokens across light/dark/gray.
 */
export const SEVERITY_TO_TONE = {
    High: 'danger',
    Low: 'success',
    Medium: 'warning'
}
