import { PickupTruckService } from '../../../services/PickupTruckService'
import { ValidationUtility } from '../../../utils/ValidationUtility'
import PickupTrucksAddView from '../pickup-trucks/PickupTrucksAddView'
import PickupTrucksDetailView from '../pickup-trucks/PickupTrucksDetailView'

const SORT_MAPPINGS = {
    Assigned: 'assigned',
    'Make & Model': null,
    Mileage: 'mileage',
    More: null,
    Plant: 'assignedPlant',
    Status: 'status',
    VIN: 'vin',
    Year: 'year'
}

const pickupTruckConfig = {
    AddView: PickupTrucksAddView,

    // Detail/Add views (still type-specific, unchanged)
    DetailView: PickupTrucksDetailView,

    // Add button label in TopSection
    addButtonLabel: 'Add Pickup',

    // --- Card (grid view) ---
    cardConfig: {
        getStatusColor: (item, statusColors) => statusColors[item.status] || 'var(--accent)',
        itemNumber: (item) => item.assigned || 'Not Assigned',
        rows: [
            {
                getValue: (item) => item.vin || 'Unknown',
                getWarning: (item, duplicates) =>
                    duplicates.duplicateVINs?.has(
                        String(item.vin || '')
                            .trim()
                            .toUpperCase()
                            .replace(/\s+/g, '')
                    ),
                label: 'VIN',
                type: 'textWithWarning',
                warningTitle: 'Duplicate VIN'
            },
            { getValue: (item) => item.make || 'Unknown', label: 'Make' },
            { getValue: (item) => item.model || 'Unknown', label: 'Model' },
            { getValue: (item) => item.year || 'Unknown', label: 'Year' },
            {
                getValue: (item) => (typeof item.mileage === 'number' ? item.mileage.toLocaleString() : 'Unknown'),
                getWarning: (item) => typeof item.mileage === 'number' && item.mileage > 300000,
                label: 'Mileage',
                type: 'numberWithWarning',
                warningTitle: 'High mileage'
            }
        ]
    },

    channelName: 'pickup-trucks-realtime-changes',

    customSortComparators: {
        Assigned: (a, b) => (parseFloat(a.assigned) || 0) - (parseFloat(b.assigned) || 0),
        'Make & Model': (a, b) => {
            const aVal = `${a.make || ''} ${a.model || ''}`.trim().toLowerCase()
            const bVal = `${b.make || ''} ${b.model || ''}`.trim().toLowerCase()
            return aVal.localeCompare(bVal)
        },
        VIN: (a, b) => ValidationUtility.compareVINs(a.vin, b.vin)
    },

    defaultSortFields: { numberField: 'assigned', statusField: 'status' },

    // Prop name for passing the selected ID to DetailView
    detailIdProp: 'pickupId',

    // Duplicate detection sets (computed once from full item list)
    duplicateChecks: [
        {
            compute: (items) => PickupTruckService.getDuplicateVINs(items),
            key: 'duplicateVINs',
            normalize: (item) =>
                String(item.vin || '')
                    .trim()
                    .toUpperCase()
                    .replace(/\s+/g, '')
        },
        {
            compute: (items) => PickupTruckService.getDuplicateAssigned(items),
            key: 'duplicateAssigned',
            normalize: (item) =>
                String(item.assigned || '')
                    .trim()
                    .toLowerCase()
        }
    ],

    // Empty state
    emptyState: {
        addLabel: 'Add Pickup Truck',
        icon: 'fa-truck-pickup',
        title: 'No Pickup Trucks Found'
    },

    // Export issues configuration
    exportConfig: {
        assetType: 'Pickup Truck',
        identifierField: 'assigned'
    },

    // Modal identifier — what field to show in comment/issue modal headers
    getModalIdentifier: (item) => item.assigned || item.vin || 'Unknown',

    gridCardFields: [
        { getValue: (item) => item.vin || 'Unknown', label: 'VIN', type: 'monospace' },
        { getValue: (item) => `${item.make || ''} ${item.model || ''}`.trim() || 'Unknown', label: 'Make & Model' },
        { getValue: (item) => item.year || 'Unknown', label: 'Year' },
        {
            getValue: (item) => (typeof item.mileage === 'number' ? item.mileage.toLocaleString() : 'Unknown'),
            getWarning: (item) => (typeof item.mileage === 'number' && item.mileage > 300000 ? 'HIGH' : null),
            label: 'Mileage'
        }
    ],

    hasEmbeddedMode: false,

    hasFilterPersistence: false,

    hasOperatorAssignment: false,

    hasRecap: false,

    hasShopSubStatuses: false,

    hasTractorAssignment: false,

    // Feature flags
    hasVerification: false,

    // History modal type string
    historyType: 'pickup-truck',

    icon: 'fa-truck-pickup',

    iconGradient: 'linear-gradient(135deg, #374151, #6b7280)',

    // Label used in CommentModalSection / IssueModalSection
    itemTypeLabel: 'Pickup Truck',

    // Identity
    key: 'pickup-truck',

    // --- List view columns ---
    listConfig: {
        colWidths: ['12%', '12%', '12%', '8%', '18%', '15%', '10%', '13%'],
        columns: [
            { key: 'assignedPlant', label: 'Plant', width: '12%' },
            { key: 'status', label: 'Status', type: 'status', width: '12%' },
            {
                duplicateKey: 'duplicateAssigned',
                key: 'assigned',
                label: 'Assigned',
                normalize: (item) =>
                    String(item.assigned || '')
                        .trim()
                        .toLowerCase(),
                type: 'textWithWarning',
                warningTitle: 'Assigned to multiple pickups',
                width: '12%'
            },
            { key: 'year', label: 'Year', width: '8%' },
            {
                bold: true,
                getValue: (item) => `${item.make || ''} ${item.model || ''}`.trim(),
                key: 'makeModel',
                label: 'Make & Model',
                width: '18%'
            },
            {
                duplicateKey: 'duplicateVINs',
                key: 'vin',
                label: 'VIN',
                normalize: (item) =>
                    String(item.vin || '')
                        .trim()
                        .toUpperCase()
                        .replace(/\s+/g, ''),
                type: 'vin',
                width: '15%'
            },
            {
                getValue: (item) => (typeof item.mileage === 'number' ? item.mileage.toLocaleString() : null),
                getWarning: (item) => typeof item.mileage === 'number' && item.mileage > 300000,
                key: 'mileage',
                label: 'Mileage',
                type: 'number',
                warningClassName: 'bg-red-50 text-red-800 rounded text-[10px] font-bold ml-2 px-2 py-1',
                warningTitle: 'High mileage',
                width: '10%'
            },
            { key: '_actions', label: 'More', type: 'actions', width: '13%' }
        ],
        headerLabels: ['Plant', 'Status', 'Assigned', 'Year', 'Make & Model', 'VIN', 'Mileage', 'More']
    },

    pluralLabel: 'Pickup Trucks',

    // Primary identifier shown on cards and used for default sort
    primaryField: 'assigned',

    primaryLabel: 'Assigned',

    // Realtime INSERT/UPDATE field mapping: snake_case DB column → camelCase model prop
    realtimeFieldMap: {
        assigned: 'assigned',
        assigned_plant: 'assignedPlant',
        comments: 'comments',
        make: 'make',
        mileage: 'mileage',
        model: 'model',
        status: 'status',
        updated_at: 'updatedAt',
        updated_by: 'updatedBy',
        updated_last: 'updatedLast',
        vin: 'vin',
        year: 'year'
    },

    searchFields: (item, query) => {
        const q = query.toLowerCase()
        return (
            String(item.vin || '')
                .toLowerCase()
                .includes(q) ||
            String(item.make || '')
                .toLowerCase()
                .includes(q) ||
            String(item.model || '')
                .toLowerCase()
                .includes(q) ||
            String(item.year || '')
                .toLowerCase()
                .includes(q) ||
            String(item.assigned || '')
                .toLowerCase()
                .includes(q)
        )
    },

    // Search bar
    searchPlaceholder: 'Search by VIN, make, model, year, or name...',

    // Service (unchanged — still the concrete class)
    service: PickupTruckService,

    singularLabel: 'Pickup Truck',

    // Sorting
    sortMappings: SORT_MAPPINGS,

    // Pseudo-status filters that aren't simple status === value checks
    specialStatusFilters: {
        'Over 300k Miles': (item) => typeof item.mileage === 'number' && item.mileage > 300000
    },

    // Status badge color classes (Tailwind)
    statusBadgeClasses: {
        Active: 'bg-[#dcfce7] text-[#166534]',
        'In Shop': 'bg-[#dbeafe] text-[#1e40af]',
        Spare: 'bg-[#f3e8ff] text-[#7c3aed]',
        Stationary: 'bg-[#e0e7ff] text-[#3730a3]'
    },

    // Map status → CSS variable for the card accent bar
    statusColors: {
        Active: 'var(--status-active)',
        'In Shop': 'var(--status-inshop)',
        Retired: 'var(--status-retired)',
        Sold: 'var(--status-sold)',
        Spare: 'var(--status-spare)',
        Stationary: 'var(--status-stationary)'
    },

    // Status dropdown options (filter bar)
    statusOptions: ['All Statuses', 'Active', 'Stationary', 'Spare', 'In Shop', 'Retired', 'Sold', 'Over 300k Miles'],

    // Database / realtime
    tableName: 'pickup_trucks',

    viewClassName: 'pickup-trucks-view',

    // localStorage key for view-mode persistence
    viewModeStorageKey: 'pickup_trucks_last_view_mode'
}

export default pickupTruckConfig
