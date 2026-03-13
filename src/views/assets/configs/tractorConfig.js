import { TractorService } from '../../../services/TractorService'
import CleanupUtility from '../../../utils/CleanupUtility'
import FormatUtility from '../../../utils/FormatUtility'
import { TractorUtility } from '../../../utils/TractorUtility'
import { ValidationUtility } from '../../../utils/ValidationUtility'
import TractorAddView from '../tractors/TractorAddView'
import TractorCard from '../tractors/TractorCard'
import TractorDetailView from '../tractors/TractorDetailView'

const tractorConfig = {
    AddView: TractorAddView,
    CardComponent: TractorCard,
    DetailView: TractorDetailView,
    addButtonLabel: 'Add Tractor',
    addViewCallbackProp: 'onTractorAdded',
    addViewPassesOperators: true,
    addViewPassesPlants: true,
    attachIsVerified: (obj) => {
        if (!obj) return obj
        obj.isVerified = function (latestHistoryDate) {
            return TractorUtility.isVerified(
                this.updatedLast,
                this.updatedAt,
                this.updatedBy,
                latestHistoryDate ?? this.latestHistoryDate
            )
        }
        return obj
    },
    cardItemPropName: 'tractor',
    channelName: 'tractors-realtime-changes',
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
        'Truck #': (a, b) => (parseFloat(a.truckNumber) || 0) - (parseFloat(b.truckNumber) || 0),
        VIN: (a, b) => FormatUtility.compareVINs(a.vinNumber, b.vinNumber),
        Verified: (a, b) => {
            const aVal = a.status === 'Retired' ? 0 : a.isVerified?.() ? 2 : 1
            const bVal = b.status === 'Retired' ? 0 : b.isVerified?.() ? 2 : 1
            return aVal - bVal
        }
    },
    defaultSortFields: { numberField: 'truckNumber', statusField: 'status' },

    detailIdProp: 'tractorId',

    duplicateChecks: [],

    emptyState: { addLabel: 'Add Tractor', icon: 'fa-tractor', title: 'No Tractors Found' },
    exportConfig: { assetType: 'Tractor', identifierField: 'truckNumber' },
    fetchItems: (codes) => TractorService.fetchTractorsWithDetails(codes),

    filterPersistence: {
        filterKey: 'tractorFilters',
        resetFnKey: 'resetTractorFilters',
        updateFnKey: 'updateTractorFilter'
    },

    // Freight filter options (Tractor-specific, passed to TopSection)
    freightOptions: ['All Freight', 'Cement', 'Aggregate', 'Dump Truck'],

    getModalIdentifier: (item) => item.truckNumber || 'Unknown',

    gridCardFields: [
        { getValue: (_item, ctx) => ctx.plantName || '---', label: 'Plant' },
        {
            getValue: (item) =>
                item.lastServiceDate ? new Date(item.lastServiceDate).toLocaleDateString() : 'Unknown',
            isOverdue: (item) => TractorUtility.isServiceOverdue(item.lastServiceDate),
            label: 'Last Service'
        },
        { getValue: (item) => (item.hasBlower ? 'Yes' : 'No'), label: 'Has Blower' },
        {
            getValue: (item) => item.cleanlinessRating || 0,
            label: 'Cleanliness',
            type: 'stars'
        }
    ],

    hasEmbeddedMode: true,

    hasFilterPersistence: true,

    hasOperatorAssignment: true,

    hasPotentialMatches: true,

    hasRecap: false,

    hasShopSubStatuses: false,

    hasTractorAssignment: false,

    // Feature flags
    hasVerification: true,

    hasVinSearch: true,

    historyType: 'tractor',

    icon: 'fa-tractor',

    iconGradient: 'linear-gradient(135deg, #065f46, #10b981)',

    itemTypeLabel: 'Tractor',

    key: 'tractor',

    listConfig: {
        colWidths: ['10%', '12%', '12%', '18%', '12%', '16%', '10%', '10%'],
        columns: [
            { key: 'assignedPlant', label: 'Plant', type: 'plant', width: '10%' },
            { copyTitle: 'Copy truck number', key: 'truckNumber', label: 'Truck #', type: 'truckNumber', width: '12%' },
            { key: 'status', label: 'Status', type: 'status', width: '12%' },
            {
                key: 'assignedOperator',
                label: 'Operator',
                lookupField: 'assignedOperator',
                type: 'operator',
                width: '18%'
            },
            {
                key: 'cleanlinessRating',
                label: 'Cleanliness',
                ratingField: 'cleanlinessRating',
                type: 'stars',
                width: '12%'
            },
            { getValue: (item) => item.vinNumber || item.vin, key: 'vin', label: 'VIN', type: 'vin', width: '16%' },
            { key: 'verified', label: 'Verified', type: 'verified', width: '10%' },
            { key: '_actions', label: 'More', type: 'actions', width: '10%' }
        ],
        headerLabels: ['Plant', 'Truck #', 'Status', 'Operator', 'Cleanliness', 'VIN', 'Verified', 'More']
    },

    operatorConfig: {
        assignedField: 'assignedOperator',
        position: 'Tractor Operator',
        positionLabel: 'Tractor'
    },

    pluralLabel: 'Tractors',

    postFetchCleanup: (items) => TractorService.cleanupNullOperators(items),

    primaryField: 'truckNumber',

    primaryLabel: 'Truck #',

    realtimeFieldMap: {
        assigned_operator: 'assignedOperator',
        assigned_plant: 'assignedPlant',
        cleanliness_rating: 'cleanlinessRating',
        freight: 'freight',
        has_blower: 'hasBlower',
        last_service_date: 'lastServiceDate',
        make: 'make',
        model: 'model',
        status: 'status',
        truck_number: 'truckNumber',
        updated_at: 'updatedAt',
        updated_by: 'updatedBy',
        updated_last: 'updatedLast',
        vin: 'vin',
        year: 'year'
    },

    // When detail view closes, refetch data
    refetchOnDetailClose: true,

    searchFields: (item, query, { operators, exactMatch }) => {
        const normalizedSearch = query.replace(/\s+/g, '')
        if (exactMatch) return (item.truckNumber || '').toLowerCase() === normalizedSearch
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

    searchPlaceholder: 'Search by truck or operator...',

    selectsFullObject: false,

    service: TractorService,

    singularLabel: 'Tractor',

    sortMappings: {
        Cleanliness: 'cleanlinessRating',
        More: null,
        Operator: 'assignedOperator',
        Plant: 'assignedPlant',
        Status: 'status',
        'Truck #': 'truckNumber',
        VIN: 'vinNumber',
        Verified: null
    },

    specialStatusFilters: {
        'Not Verified': (item) => !item.isVerified?.() && item.status !== 'Retired',
        'Open Issues': (item) => Number(item.openIssuesCount || 0) > 0,
        'Past Due Service': (item) => TractorUtility.isServiceOverdue(item.lastServiceDate),
        Verified: (item) => item.isVerified?.()
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

    statusOptions: [
        'All Statuses',
        'Active',
        'Spare',
        'In Shop',
        'Retired',
        'Past Due Service',
        'Verified',
        'Not Verified',
        'Open Issues'
    ],

    tableName: 'tractors',

    verification: {
        cleanupCheck: (items, operators) =>
            CleanupUtility.verificationCheck(items, TractorService.updateTractor, 'tractor', operators),
        getFieldValues: (item) => ({
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
        hasLastChipDate: false,
        isServiceOverdueFn: TractorUtility.isServiceOverdue,
        itemType: 'tractor',
        updateFn: (id, updates) => TractorService.updateTractor(id, updates),
        verifyFn: (id) => TractorService.verifyTractor(id)
    },

    viewClassName: 'tractors-view',

    viewModeStorageKey: 'tractors_last_view_mode',

    vinSearchFn: (query) => TractorService.searchTractorsByVinProcessed(query)
}

export default tractorConfig
