/**
 * Maps an operator lifecycle status to a Badge tone so the unified `<Badge />`
 * component renders the correct themed palette across light/dark/gray modes.
 * Returns 'neutral' for unknown statuses so the badge still renders sensibly.
 */
const STATUS_TONE_MAP = {
    Active: 'success',
    'Light Duty': 'warning',
    'No Hire': 'danger',
    'Pending Start': 'info',
    Terminated: 'neutral',
    Training: 'warning'
}

export const getOperatorStatusTone = (status) => STATUS_TONE_MAP[status] || 'neutral'
