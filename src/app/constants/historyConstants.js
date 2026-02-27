export const ASSET_SERVICE_MAP = {
    equipment: 'EquipmentService',
    mixer: 'MixerService',
    'pickup-truck': 'PickupTruckService',
    tractor: 'TractorService',
    trailer: 'TrailerService'
}

export const HISTORY_SERVICE_MAP = {
    equipment: { method: 'getEquipmentHistory', service: 'EquipmentService' },
    mixer: { method: 'getMixerHistory', service: 'MixerService' },
    operator: { method: 'getOperatorHistory', service: 'OperatorService' },
    'pickup-truck': { method: 'fetchHistory', service: 'PickupTruckService' },
    tractor: { method: 'getTractorHistory', service: 'TractorService' },
    trailer: { method: 'getTrailerHistory', service: 'TrailerService' }
}

export const HISTORY_TABLE_MAP = {
    equipment: 'heavy_equipment_history',
    mixer: 'mixers_history',
    operator: 'operators_history',
    'pickup-truck': 'pickup_trucks_history',
    tractor: 'tractors_history',
    trailer: 'trailers_history'
}

export const ISSUE_SERVICE_MAP = {
    equipment: 'EquipmentService',
    mixer: 'MixerService',
    tractor: 'TractorService',
    trailer: 'TrailerService'
}

export const STATUS_COLORS = {
    Active: '#16a34a',
    'In Shop': '#3b82f6',
    Retired: '#dc2626',
    Spare: '#9333ea'
}

export const DEFAULT_STATUS_COLOR = '#1e3a5f'

export const SEVERITY_COLORS = {
    High: '#dc2626',
    Low: '#3b82f6',
    Medium: '#f59e0b'
}

export const RESOLVED_ISSUE_COLOR = '#16a34a'

export const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

export const MILEAGE_MILESTONES = [
    { label: 'High Mileage', level: 'critical', threshold: 300000 },
    { label: 'Elevated', level: 'warning', threshold: 200000 },
    { label: 'Moderate', level: 'info', threshold: 100000 },
    { label: 'Low', level: 'good', threshold: 0 }
]

export const AI_HISTORY_CACHE_KEY = 'srm_history_ai_summaries'
export const AI_CACHE_DURATION_MS = 24 * 60 * 60 * 1000

export const CHART_HEIGHT = 300
export const CHART_PADDING = 40
export const CHART_WIDTH = 1000
export const MAX_STAR_RATING = 5

export const DAYS_IN_MS = 1000 * 60 * 60 * 24

export const ASSET_TYPES_WITH_OVERVIEW = ['mixer', 'tractor', 'trailer', 'equipment', 'pickup-truck']
export const ASSET_TYPES_WITH_OPERATORS = ['mixer', 'tractor']
export const ASSET_TYPES_WITH_SERVICE = ['mixer', 'tractor', 'equipment', 'pickup-truck']
export const ASSET_TYPES_WITH_PLANT = ['mixer', 'tractor', 'trailer', 'equipment', 'pickup-truck']
export const ASSET_TYPES_WITH_CLEANLINESS = ['mixer', 'tractor', 'trailer', 'equipment']
