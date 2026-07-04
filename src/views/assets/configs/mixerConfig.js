import { MixerService } from '../../../services/MixerService'
import AssetStatsUtility from '../../../utils/AssetStatsUtility'
import CleanupUtility from '../../../utils/CleanupUtility'
import { ValidationUtility } from '../../../utils/ValidationUtility'
import VerifiedUtility from '../../../utils/VerifiedUtility'
import MixerAddView from '../mixers/MixerAddView'
import MixerCard from '../mixers/MixerCard'
import MixerDetailView from '../mixers/MixerDetailView'

const mixerConfig = {
    AddView: MixerAddView,

    // Card config - uses MixerCard directly
    CardComponent: MixerCard,

    // Detail/Add views
    DetailView: MixerDetailView,

    // Add button label in TopSection
    addButtonLabel: 'Add Mixer',

    // Add view props
    addViewCallbackProp: 'onMixerAdded',

    addViewPassesOperators: true,

    addViewPassesPlants: true,

    // Attach isVerified method to each item
    attachIsVerified: (obj) => {
        if (!obj) return obj
        obj.isVerified = function () {
            return VerifiedUtility.isVerified(this.updatedLast, this.updatedAt, this.updatedBy)
        }
        return obj
    },

    cardItemPropName: 'mixer',

    channelName: 'mixers-realtime-changes',

    customSortComparators: {
        Operator: (a, b, { operators }) => {
            const aVal = operators?.find((op) => op.employeeId === a.assignedOperator)?.name || ''
            const bVal = operators?.find((op) => op.employeeId === b.assignedOperator)?.name || ''
            return aVal.localeCompare(bVal)
        },
        Plant: (a, b, { plants }) => {
            const aVal = plants?.find((p) => p.code === a.assignedPlant)?.name || a.assignedPlant
            const bVal = plants?.find((p) => p.code === b.assignedPlant)?.name || b.assignedPlant
            return String(aVal).localeCompare(String(bVal))
        },
        Status: (a, b) => {
            // Custom status ordering with shop sub-statuses
            const getStatusOrder = (item) => {
                if (item.status === 'Active') return 1
                if (item.status === 'Spare') return 2
                if (item.status === 'In Shop') {
                    if (item.shopStatus === 'ready_for_pickup') return 3
                    if (item.shopStatus === 'in_shop' || !item.shopStatus) return 4
                    if (item.shopStatus === 'waiting_for_shop') return 5
                    if (item.shopStatus === 'down_in_yard') return 6
                    if (item.shopStatus === 'third_party') return 7
                }
                if (item.status === 'Retired') return 8
                return 8
            }
            const aOrder = getStatusOrder(a)
            const bOrder = getStatusOrder(b)
            if (aOrder !== bOrder) return aOrder - bOrder
            // Secondary sort by days in status
            if (
                ['Active', 'In Shop', 'Spare'].includes(a.status) &&
                ['Active', 'In Shop', 'Spare'].includes(b.status)
            ) {
                const aDate = a.statusChangedAt || a.createdAt
                const bDate = b.statusChangedAt || b.createdAt
                const aDays = aDate ? Math.floor((Date.now() - new Date(aDate).getTime()) / 86400000) : 0
                const bDays = bDate ? Math.floor((Date.now() - new Date(bDate).getTime()) / 86400000) : 0
                return aDays - bDays
            }
            return 0
        },
        'Truck #': (a, b) => (parseFloat(a.truckNumber) || 0) - (parseFloat(b.truckNumber) || 0),
        VIN: (a, b) => ValidationUtility.compareVINs(a.vinNumber, b.vinNumber),
        Verified: (a, b) => {
            const aVal = a.status === 'Retired' ? 0 : a.isVerified?.() ? 2 : 1
            const bVal = b.status === 'Retired' ? 0 : b.isVerified?.() ? 2 : 1
            return aVal - bVal
        }
    },

    defaultSortFields: { numberField: 'truckNumber', statusField: 'status' },

    // Prop name for passing the selected ID to DetailView
    detailIdProp: 'mixerId',

    // Duplicate detection - none for mixer
    duplicateChecks: [],

    // Empty state
    emptyState: {
        addLabel: 'Add Mixer',
        icon: 'fa-truck',
        title: 'No Mixers Found'
    },

    // Export issues configuration
    exportConfig: {
        assetType: 'Mixer',
        identifierField: 'truckNumber'
    },

    // Custom fetch method
    fetchItems: (codes) => MixerService.fetchMixersWithDetails(codes),

    // Filter persistence
    filterPersistence: {
        filterKey: 'mixerFilters',
        resetFnKey: 'resetMixerFilters',
        updateFnKey: 'updateMixerFilter'
    },

    // Modal identifier
    getModalIdentifier: (item) => item.truckNumber || 'Unknown',

    gridCardFields: [
        { getValue: (_item, ctx) => ctx.plantName || '---', label: 'Plant' },
        {
            getValue: (item) =>
                item.lastServiceDate ? new Date(item.lastServiceDate).toLocaleDateString() : 'Unknown',
            isOverdue: (item) => AssetStatsUtility.isServiceOverdue(item.lastServiceDate),
            label: 'Last Service'
        },
        {
            getValue: (item) => (item.lastChipDate ? new Date(item.lastChipDate).toLocaleDateString() : 'Unknown'),
            isOverdue: (item) => AssetStatsUtility.isServiceOverdue(item.lastChipDate, 90),
            label: 'Last Chip'
        },
        {
            getValue: (item) => item.cleanlinessRating || 0,
            getWarning: (item) =>
                item.cleanlinessRating && item.cleanlinessRating < 3 && item.status !== 'Retired' ? 'DIRTY' : null,
            label: 'Cleanliness',
            type: 'stars'
        },
        {
            getValue: (item) =>
                typeof item.hours === 'number' && Number.isFinite(item.hours)
                    ? item.hours.toLocaleString()
                    : 'Not Recorded',
            label: 'Hours'
        }
    ],

    hasEmbeddedMode: true,

    hasFilterPersistence: true,

    hasOperatorAssignment: true,

    hasPotentialMatches: true,

    hasRecap: true,

    hasShopSubStatuses: true,

    hasTractorAssignment: false,

    // Feature flags
    hasVerification: true,

    hasVinSearch: true,

    // History modal type string
    historyType: 'mixer',

    icon: 'fa-truck',

    iconGradient: 'linear-gradient(135deg, #1e3a5f, #3b82f6)',

    // Label used in CommentModalSection / IssueModalSection
    itemTypeLabel: 'Mixer',

    // Identity
    key: 'mixer',

    // List view columns
    listConfig: {
        colWidths: ['9%', '11%', '11%', '15%', '11%', '8%', '14%', '11%', '10%'],
        columns: [
            { key: 'assignedPlant', label: 'Plant', type: 'plant', width: '9%' },
            { copyTitle: 'Copy truck number', key: 'truckNumber', label: 'Truck #', type: 'truckNumber', width: '11%' },
            {
                getDisplayStatus: (item) => {
                    if (item.status !== 'In Shop') return item.status
                    switch (item.shopStatus) {
                        case 'down_in_yard':
                            return 'Down In Yard'
                        case 'waiting_for_shop':
                            return 'Waiting For Shop'
                        case 'third_party':
                            return 'Third Party Work'
                        case 'ready_for_pickup':
                            return 'Ready For Pickup'
                        case 'in_shop':
                        default:
                            return 'In Shop'
                    }
                },
                key: 'status',
                label: 'Status',
                type: 'status',
                width: '11%'
            },
            {
                key: 'assignedOperator',
                label: 'Operator',
                lookupField: 'assignedOperator',
                type: 'operator',
                width: '15%'
            },
            {
                dirtyWarning: true,
                key: 'cleanlinessRating',
                label: 'Cleanliness',
                naForRetired: true,
                ratingField: 'cleanlinessRating',
                type: 'stars',
                width: '11%'
            },
            {
                getValue: (item) =>
                    typeof item.hours === 'number' && Number.isFinite(item.hours) ? item.hours.toLocaleString() : null,
                key: 'hours',
                label: 'Hours',
                type: 'number',
                width: '8%'
            },
            {
                getValue: (item) => item.vinNumber || item.vin,
                key: 'vin',
                label: 'VIN',
                type: 'vin',
                width: '14%'
            },
            { key: 'verified', label: 'Verified', type: 'verified', width: '11%' },
            { key: '_actions', label: 'More', type: 'actions', width: '10%' }
        ],
        headerLabels: ['Plant', 'Truck #', 'Status', 'Operator', 'Cleanliness', 'Hours', 'VIN', 'Verified', 'More']
    },

    // Operator config
    operatorConfig: {
        assignedField: 'assignedOperator',
        position: 'Mixer Operator',
        positionLabel: 'Mixer'
    },

    pluralLabel: 'Mixers',

    // Post-fetch cleanup
    postFetchCleanup: (items) => MixerService.cleanupNullOperators(items),

    // Primary identifier
    primaryField: 'truckNumber',

    primaryLabel: 'Truck #',

    // Realtime INSERT/UPDATE field mapping
    realtimeFieldMap: {
        assigned_operator: 'assignedOperator',
        assigned_plant: 'assignedPlant',
        cleanliness_rating: 'cleanlinessRating',
        hours: 'hours',
        last_chip_date: 'lastChipDate',
        last_service_date: 'lastServiceDate',
        make: 'make',
        model: 'model',
        shop_status: 'shopStatus',
        status: 'status',
        truck_number: 'truckNumber',
        updated_at: 'updatedAt',
        updated_by: 'updatedBy',
        updated_last: 'updatedLast',
        vin: 'vin',
        year: 'year'
    },

    // Recap config
    recapConfig: {
        operatorPosition: 'Mixer Operator'
    },

    searchFields: (item, query, { operators, exactMatch }) => {
        const normalizedSearch = query.replace(/\s+/g, '')
        if (exactMatch) {
            return (item.truckNumber || '').toLowerCase() === normalizedSearch
        }
        const truckMatch = (item.truckNumber || '').toLowerCase().includes(normalizedSearch)
        const operatorMatch =
            item.assignedOperator &&
            operators
                ?.find((op) => op.employeeId === item.assignedOperator)
                ?.name.toLowerCase()
                .includes(normalizedSearch)
        const vinRaw = (item.vinNumber || item.vin || '').toLowerCase()
        const vinNoSpaces = vinRaw.replace(/\s+/g, '')
        const vinMatch = vinRaw.includes(query) || vinNoSpaces.includes(normalizedSearch)
        return truckMatch || operatorMatch || vinMatch
    },

    // Search bar
    searchPlaceholder: 'Search by truck or operator...',

    // Select stores full object (MixerDetailView needs .id extracted)
    selectsFullObject: false,

    // Service
    service: MixerService,

    singularLabel: 'Mixer',

    // Sorting
    sortMappings: {
        Cleanliness: 'cleanlinessRating',
        Hours: 'hours',
        More: null,
        Operator: 'assignedOperator',
        Plant: 'assignedPlant',
        Status: 'status',
        'Truck #': 'truckNumber',
        VIN: 'vinNumber',
        Verified: null
    },

    // Special status filters
    specialStatusFilters: {
        'Down In Yard': (item) => item.status === 'In Shop' && item.shopStatus === 'down_in_yard',
        'In Shop': (item) => item.status === 'In Shop' && (item.shopStatus === 'in_shop' || !item.shopStatus),
        'Not Verified': (item) => !item.isVerified?.() && item.status !== 'Retired',
        'Open Issues': (item) => Number(item.openIssuesCount || 0) > 0,
        'Past Due Service': (item) => AssetStatsUtility.isServiceOverdue(item.lastServiceDate),
        'Ready For Pickup': (item) => item.status === 'In Shop' && item.shopStatus === 'ready_for_pickup',
        'Third Party Work': (item) => item.status === 'In Shop' && item.shopStatus === 'third_party',
        Verified: (item) => item.isVerified?.(),
        'Waiting For Shop': (item) => item.status === 'In Shop' && item.shopStatus === 'waiting_for_shop'
    },

    // Status badge color classes — semantic tokens, theme-aware.
    statusBadgeClasses: {
        Active: 'bg-status-active/15 text-status-active',
        'Down In Yard': 'bg-status-danger/15 text-status-danger',
        'In Shop': 'bg-status-shop/15 text-status-shop',
        'Ready For Pickup': 'bg-status-active/15 text-status-active',
        Spare: 'bg-status-spare/15 text-status-spare',
        'Third Party Work': 'bg-status-warning/15 text-status-warning',
        'Waiting For Shop': 'bg-status-warning/15 text-status-warning'
    },

    // Map status → CSS variable for the card accent bar
    statusColors: {
        Active: 'var(--status-active)',
        'In Shop': 'var(--status-inshop)',
        Retired: 'var(--status-retired)',
        Spare: 'var(--status-spare)'
    },

    // Status dropdown options (filter bar)
    statusOptions: [
        'All Statuses',
        'Active',
        'Spare',
        'In Shop',
        'Waiting For Shop',
        'Down In Yard',
        'Third Party Work',
        'Ready For Pickup',
        'Retired',
        'Past Due Service',
        'Verified',
        'Not Verified',
        'Open Issues'
    ],

    // Database / realtime
    tableName: 'mixers',

    // Verification config
    verification: {
        cleanupCheck: (items, operators) =>
            CleanupUtility.verificationCheck(items, MixerService.updateMixer, 'mixer', operators),
        getFieldValues: (item) => ({
            hours: item.hours != null ? String(item.hours) : '',
            lastChipDate: item.lastChipDate || null,
            lastServiceDate: item.lastServiceDate || null,
            make: item.make || '',
            model: item.model || '',
            vin: item.vin || item.vinNumber || '',
            year: item.year || ''
        }),
        getMissingFields: (item) => [
            ...(!item.vin || !ValidationUtility.isVIN(item.vin) ? ['VIN'] : []),
            ...(!item.make ? ['Make'] : []),
            ...(!item.model ? ['Model'] : []),
            ...(!item.year ? ['Year'] : [])
        ],
        hasHours: true,
        hasLastChipDate: true,
        isServiceOverdueFn: AssetStatsUtility.isServiceOverdue,
        itemType: 'mixer',
        updateFn: (id, updates) => MixerService.updateMixer(id, updates),
        verifyFn: (id) => MixerService.verifyMixer(id)
    },

    viewClassName: 'mixers-view',

    // localStorage key for view-mode persistence
    viewModeStorageKey: 'mixers_last_view_mode',

    // VIN search
    vinSearchFn: (query) => MixerService.searchMixersByVinProcessed(query)
}

export default mixerConfig
