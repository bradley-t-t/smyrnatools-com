export const DASHBOARD_CACHE_KEY = 'dashboard_assets_cache_v1'
export const DASHBOARD_CACHE_TTL_MS = 120000
export const DASHBOARD_REFRESH_INTERVAL_MS = 600000

export const STATUS_COLORS = {
    Active: '#22c55e',
    'In Shop': '#3b82f6',
    Sold: '#6b7280',
    Spare: '#a855f7',
    Stationary: '#eab308'
}

export const ALLOCATION_THRESHOLDS = {
    HIGH: 80,
    MEDIUM: 50
}

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

export const INITIAL_EXPANDED_SECTIONS = {
    assetsWithIssues: false,
    longTermShop: false,
    overdueService: false,
    pendingOperators: false,
    trainingOperators: false,
    unassignedOperators: false,
    unverifiedMixers: false
}

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

export const TRACTOR_FREIGHT_TYPES = ['Cement', 'Aggregate', 'Dump Truck', 'Other']
export const TRAILER_TYPES = ['Cement', 'End Dump']

export const FREIGHT_ICONS = {
    Aggregate: 'fa-mountain',
    Cement: 'fa-industry',
    'Dump Truck': 'fa-truck-loading',
    Other: 'fa-truck'
}

export const ASSET_ICONS = {
    Equipment: 'fa-snowplow',
    Mixer: 'fa-truck',
    Operator: 'fa-users',
    Pickup: 'fa-truck-pickup',
    Tractor: 'fa-tractor',
    Trailer: 'fa-trailer'
}
