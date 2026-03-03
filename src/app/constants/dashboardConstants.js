/** Dashboard cache key for localStorage persistence. */
export const DASHBOARD_CACHE_KEY = 'dashboard_assets_cache_v1'
/** Cache time-to-live: 2 minutes. */
export const DASHBOARD_CACHE_TTL_MS = 120000
/** Auto-refresh interval: 10 minutes. */
export const DASHBOARD_REFRESH_INTERVAL_MS = 600000

/** Color mapping for asset status badges and charts. */
export const STATUS_COLORS = {
    Active: '#22c55e',
    'In Shop': '#3b82f6',
    Sold: '#6b7280',
    Spare: '#a855f7',
    Stationary: '#eab308'
}

/** Percentage thresholds for fleet allocation health indicators. */
export const ALLOCATION_THRESHOLDS = {
    HIGH: 80,
    MEDIUM: 50
}

/** Zero-state structure for all dashboard statistics categories. */
export const INITIAL_STATS = {
    equipment: { active: 0, allocationPercent: 0, comments: 0, issues: 0, overdue: 0, shop: 0, spare: 0, total: 0 },
    fleetTotal: 0,
    mixers: {
        active: 0,
        allocationPercent: 0,
        comments: 0,
        issues: 0,
        overdue: 0,
        shop: 0,
        spare: 0,
        total: 0,
        verified: 0,
        verifiedPercent: 0
    },
    openIssuesTotal: 0,
    operators: {
        active: 0,
        assigned: 0,
        lightDuty: 0,
        mixerAssigned: 0,
        pending: 0,
        total: 0,
        tractorAssigned: 0,
        unassigned: 0
    },
    overallAllocationPercent: 0,
    overdueTotal: 0,
    pickups: { active: 0, allocationPercent: 0, retired: 0, shop: 0, sold: 0, spare: 0, stationary: 0, total: 0 },
    tractors: {
        active: 0,
        allocationPercent: 0,
        comments: 0,
        freight: {
            Aggregate: { active: 0, shop: 0, spare: 0, total: 0 },
            Cement: { active: 0, shop: 0, spare: 0, total: 0 },
            'Dump Truck': { active: 0, shop: 0, spare: 0, total: 0 },
            Other: { active: 0, shop: 0, spare: 0, total: 0 }
        },
        issues: 0,
        overdue: 0,
        shop: 0,
        spare: 0,
        total: 0,
        verified: 0,
        verifiedPercent: 0
    },
    trailers: {
        active: 0,
        allocationPercent: 0,
        comments: 0,
        issues: 0,
        overdue: 0,
        shop: 0,
        spare: 0,
        total: 0,
        trailerType: {
            Cement: { active: 0, shop: 0, spare: 0, total: 0 },
            'End Dump': { active: 0, shop: 0, spare: 0, total: 0 }
        }
    },
    verificationAverage: 0
}

/** Zero-state structure for per-plant notification/alert data. */
export const INITIAL_PLANT_NOTIFICATIONS = {
    aiSummary: null,
    aiSummaryFailed: false,
    aiSummaryLoading: false,
    assetsWithMostIssues: [],
    leaderboardMetrics: null,
    longTermShopAssets: [],
    overdueService: [],
    pendingOperators: [],
    shopIssue: null,
    totalOpenIssues: 0,
    totalResolvedIssues: 0,
    trainingOperators: [],
    unassignedOperators: [],
    unverifiedMixers: []
}

/** Default collapsed state for plant notification accordion sections. */
export const INITIAL_EXPANDED_SECTIONS = {
    assetsWithIssues: false,
    longTermShop: false,
    overdueService: false,
    pendingOperators: false,
    trainingOperators: false,
    unassignedOperators: false,
    unverifiedMixers: false
}

/** Available date range filter options for status history charts. */
export const DATE_FILTER_OPTIONS = [
    'last-week',
    'this-week',
    'last-month',
    'this-month',
    'this-quarter',
    'last-quarter',
    'this-year',
    'last-year',
    'all'
]

/** Known tractor freight type categories. */
export const TRACTOR_FREIGHT_TYPES = ['Cement', 'Aggregate', 'Dump Truck', 'Other']
/** Known trailer type categories. */
export const TRAILER_TYPES = ['Cement', 'End Dump']

/** FontAwesome icon class mapping for tractor freight types. */
export const FREIGHT_ICONS = {
    Aggregate: 'fa-mountain',
    Cement: 'fa-industry',
    'Dump Truck': 'fa-truck-loading',
    Other: 'fa-truck'
}

/** FontAwesome icon class mapping for asset type categories. */
export const ASSET_ICONS = {
    Equipment: 'fa-snowplow',
    Mixer: 'fa-truck',
    Operator: 'fa-users',
    Pickup: 'fa-truck-pickup',
    Tractor: 'fa-tractor',
    Trailer: 'fa-trailer'
}
