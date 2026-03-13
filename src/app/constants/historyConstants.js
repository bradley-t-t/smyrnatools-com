/** Maps asset types to their corresponding CRUD service class names. */
export const ASSET_SERVICE_MAP = {
    equipment: 'EquipmentService',
    mixer: 'MixerService',
    'pickup-truck': 'PickupTruckService',
    tractor: 'TractorService',
    trailer: 'TrailerService'
}
/** Maps asset types to their history-fetching service and method names. */
export const HISTORY_SERVICE_MAP = {
    equipment: { method: 'getEquipmentHistory', service: 'EquipmentService' },
    mixer: { method: 'getMixerHistory', service: 'MixerService' },
    operator: { method: 'getOperatorHistory', service: 'OperatorService' },
    'pickup-truck': { method: 'fetchHistory', service: 'PickupTruckService' },
    tractor: { method: 'getTractorHistory', service: 'TractorService' },
    trailer: { method: 'getTrailerHistory', service: 'TrailerService' }
}
/** Maps asset types to their database history table names. */
export const HISTORY_TABLE_MAP = {
    equipment: 'heavy_equipment_history',
    mixer: 'mixers_history',
    operator: 'operators_history',
    'pickup-truck': 'pickup_trucks_history',
    tractor: 'tractors_history',
    trailer: 'trailers_history'
}
/** Maps asset types to their issue-management service class names. */
export const ISSUE_SERVICE_MAP = {
    equipment: 'EquipmentService',
    mixer: 'MixerService',
    tractor: 'TractorService',
    trailer: 'TrailerService'
}
/** Color mapping for asset status indicators in history views. */
export const STATUS_COLORS = {
    Active: '#16a34a',
    'In Shop': '#3b82f6',
    Retired: '#dc2626',
    Spare: '#9333ea'
}
export const DEFAULT_STATUS_COLOR = '#1e3a5f'
/** Color mapping for issue severity levels. */
export const SEVERITY_COLORS = {
    High: '#dc2626',
    Low: '#3b82f6',
    Medium: '#f59e0b'
}
export const RESOLVED_ISSUE_COLOR = '#16a34a'
/** Human-readable labels for 1-5 star ratings. */
export const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']
/** Mileage milestone thresholds for vehicle condition assessment. */
export const MILEAGE_MILESTONES = [
    { label: 'High Mileage', level: 'critical', threshold: 300000 },
    { label: 'Elevated', level: 'warning', threshold: 200000 },
    { label: 'Moderate', level: 'info', threshold: 100000 },
    { label: 'Low', level: 'good', threshold: 0 }
]
/** LocalStorage key for caching AI-generated history summaries. */
export const AI_HISTORY_CACHE_KEY = 'srm_history_ai_summaries'
/** AI summary cache duration: 24 hours. */
export const AI_CACHE_DURATION_MS = 24 * 60 * 60 * 1000
/** SVG chart rendering dimensions. */
export const CHART_HEIGHT = 300
export const CHART_PADDING = 40
export const CHART_WIDTH = 1000
export const MAX_STAR_RATING = 5
export const DAYS_IN_MS = 1000 * 60 * 60 * 24
/** Feature-flag lists controlling which history tabs/sections are shown per asset type. */
export const ASSET_TYPES_WITH_OVERVIEW = ['mixer', 'tractor', 'trailer', 'equipment', 'pickup-truck']
export const ASSET_TYPES_WITH_OPERATORS = ['mixer', 'tractor']
export const ASSET_TYPES_WITH_SERVICE = ['mixer', 'tractor', 'equipment', 'pickup-truck']
export const ASSET_TYPES_WITH_PLANT = ['mixer', 'tractor', 'trailer', 'equipment', 'pickup-truck']
export const ASSET_TYPES_WITH_CLEANLINESS = ['mixer', 'tractor', 'trailer', 'equipment']
