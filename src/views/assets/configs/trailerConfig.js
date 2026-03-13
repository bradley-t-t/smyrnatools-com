import { TractorService } from '../../../services/TractorService'
import { TrailerService } from '../../../services/TrailerService'
import AssetStatsUtility from '../../../utils/AssetStatsUtility'
import { ValidationUtility } from '../../../utils/ValidationUtility'
import TrailerAddView from '../trailers/TrailerAddView'
import TrailerCard from '../trailers/TrailerCard'
import TrailerDetailView from '../trailers/TrailerDetailView'

const trailerConfig = {
    AddView: TrailerAddView,
    CardComponent: TrailerCard,
    DetailView: TrailerDetailView,
    addButtonLabel: 'Add Trailer',
    addViewCallbackProp: 'onTrailerAdded',
    addViewPassesOperators: false,
    addViewPassesPlants: true,
    attachIsVerified: (obj) => {
        if (!obj) return obj
        obj.isVerified = function (latestHistoryDate = null) {
            if (!this.updatedLast || !this.updatedBy) return false
            const lastVerification = new Date(this.updatedLast)
            const lastUpdate = new Date(this.updatedAt)
            const lastHistory = latestHistoryDate ? new Date(latestHistoryDate) : null
            const now = new Date()
            const lastSunday = new Date(now)
            lastSunday.setDate(now.getDate() - now.getDay())
            lastSunday.setHours(0, 0, 0, 0)
            if (lastHistory && lastHistory > lastVerification) return false
            return lastUpdate <= lastVerification && lastVerification >= lastSunday
        }
        return obj
    },
    cardItemPropName: 'trailer',
    channelName: 'trailers-realtime-changes',
    customSortComparators: {
        Tractor: (a, b, { tractors }) => {
            const tractorA = tractors?.find((t) => t.id === a.assignedTractor)
            const tractorB = tractors?.find((t) => t.id === b.assignedTractor)
            return (tractorA?.truckNumber || '').localeCompare(tractorB?.truckNumber || '')
        },
        'Trailer #': (a, b) => (parseFloat(a.trailerNumber) || 0) - (parseFloat(b.trailerNumber) || 0),
        VIN: (a, b) => ValidationUtility.compareVINs(a.vinNumber, b.vinNumber)
    },
    defaultSortFields: { numberField: 'trailerNumber', statusField: 'status' },

    detailIdProp: 'trailerId',

    duplicateChecks: [],

    emptyState: { addLabel: 'Add Trailer', icon: 'fa-trailer', title: 'No Trailers Found' },

    exportConfig: { assetType: 'Trailer', identifierField: 'trailerNumber' },

    fetchItems: (codes) => TrailerService.fetchTrailersWithDetails(codes),

    fetchTractors: () => TractorService.fetchTractors(),

    filterPersistence: {
        filterKey: 'trailerFilters',
        resetFnKey: 'resetTrailerFilters',
        updateFnKey: 'updateTrailerFilter'
    },

    getModalIdentifier: (item) => item.trailerNumber || 'Unknown',

    gridCardFields: [
        { getValue: (_item, ctx) => ctx.plantName || '---', label: 'Plant' },
        { getValue: (item) => item.trailerType || 'Unknown', label: 'Type' },
        {
            getValue: (item) =>
                item.lastServiceDate ? new Date(item.lastServiceDate).toLocaleDateString() : 'Unknown',
            isOverdue: (item) => AssetStatsUtility.isServiceOverdue(item.lastServiceDate, 90),
            label: 'Last Service'
        },
        {
            getValue: (item) => item.cleanlinessRating || 0,
            label: 'Cleanliness',
            type: 'stars'
        }
    ],

    hasEmbeddedMode: true,

    hasFilterPersistence: true,

    hasOperatorAssignment: false,

    hasPotentialMatches: true,

    hasRecap: false,

    hasShopSubStatuses: false,

    hasTractorAssignment: true,

    // Feature flags
    hasVerification: false,

    hasVinSearch: false,

    historyType: 'trailer',

    icon: 'fa-trailer',

    iconGradient: 'linear-gradient(135deg, #7c2d12, #f97316)',

    itemTypeLabel: 'Trailer',

    key: 'trailer',

    listConfig: {
        colWidths: ['10%', '12%', '12%', '10%', '12%', '12%', '16%', '16%'],
        columns: [
            { key: 'assignedPlant', label: 'Plant', type: 'plant', width: '10%' },
            { key: 'status', label: 'Status', type: 'status', width: '12%' },
            {
                copyTitle: 'Copy trailer number',
                key: 'trailerNumber',
                label: 'Trailer #',
                type: 'truckNumber',
                width: '12%'
            },
            { key: 'trailerType', label: 'Type', width: '10%' },
            { key: 'assignedTractor', label: 'Tractor', type: 'tractor', width: '12%' },
            {
                key: 'cleanlinessRating',
                label: 'Cleanliness',
                ratingField: 'cleanlinessRating',
                type: 'stars',
                width: '12%'
            },
            { getValue: (item) => item.vinNumber || item.vin, key: 'vin', label: 'VIN', type: 'vin', width: '16%' },
            { key: '_actions', label: 'More', type: 'actions', width: '16%' }
        ],
        headerLabels: ['Plant', 'Status', 'Trailer #', 'Type', 'Tractor', 'Cleanliness', 'VIN', 'More']
    },

    pluralLabel: 'Trailers',

    primaryField: 'trailerNumber',

    primaryLabel: 'Trailer #',

    realtimeFieldMap: {
        assigned_plant: 'assignedPlant',
        assigned_tractor: 'assignedTractor',
        cleanliness_rating: 'cleanlinessRating',
        status: 'status',
        trailer_number: 'trailerNumber',
        trailer_type: 'trailerType',
        updated_at: 'updatedAt',
        updated_by: 'updatedBy',
        updated_last: 'updatedLast'
    },

    // Refetch on detail close
    refetchOnDetailClose: true,

    searchFields: (item, query, { tractors, exactMatch }) => {
        const normalizedSearch = query.replace(/\s+/g, '')
        if (exactMatch) {
            return (
                (item.trailerNumber || '').toLowerCase() === normalizedSearch ||
                (item.identifyingNumber || '').toLowerCase() === normalizedSearch
            )
        }
        const trailerMatch =
            (item.trailerNumber || '').toLowerCase().includes(normalizedSearch) ||
            (item.identifyingNumber || '').toLowerCase().includes(normalizedSearch)
        const tractorMatch =
            item.assignedTractor &&
            tractors
                ?.find((t) => t.id === item.assignedTractor)
                ?.truckNumber.toLowerCase()
                .includes(normalizedSearch)
        const vinRaw = (item.vinNumber || item.vin || '').toLowerCase()
        const vinNoSpaces = vinRaw.replace(/\s+/g, '')
        const vinMatch = vinRaw.includes(query) || vinNoSpaces.includes(normalizedSearch)
        return trailerMatch || tractorMatch || vinMatch
    },

    searchPlaceholder: 'Search by trailer #, tractor, or VIN...',

    // Trailer selects the full object (TrailerDetailView uses trailer.id)
    selectsFullObject: true,

    service: TrailerService,

    singularLabel: 'Trailer',

    sortMappings: {
        Cleanliness: 'cleanlinessRating',
        More: null,
        Plant: 'assignedPlant',
        Status: 'status',
        Tractor: null,
        'Trailer #': 'trailerNumber',
        Type: 'trailerType',
        VIN: 'vinNumber'
    },

    // The status dropdown for trailers actually filters on trailerType for Cement/End Dump
    specialStatusFilters: {
        Cement: (item) => item.trailerType === 'Cement',
        'End Dump': (item) => item.trailerType === 'End Dump',
        'Open Issues': (item) => Number(item.openIssuesCount || 0) > 0,
        'Past Due Service': (item) => AssetStatsUtility.isServiceOverdue(item.lastServiceDate, 90)
    },

    statusBadgeClasses: {
        Active: 'bg-[#dcfce7] text-[#166534]',
        'In Shop': 'bg-[#dbeafe] text-[#1e40af]',
        Spare: 'bg-[#f3e8ff] text-[#7c3aed]'
    },

    statusColors: {
        Active: 'var(--status-active)',
        'In Shop': 'var(--status-inshop)',
        Retired: 'var(--status-retired)',
        Spare: 'var(--status-spare)'
    },

    // Trailer uses type filter instead of status filter
    statusOptions: ['All Types', 'Cement', 'End Dump', 'Past Due Service', 'Open Issues'],

    tableName: 'trailers',

    viewClassName: 'trailers-view',

    viewModeStorageKey: 'trailers_last_view_mode'
}

export default trailerConfig
