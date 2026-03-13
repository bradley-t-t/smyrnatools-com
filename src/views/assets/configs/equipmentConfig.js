import { EquipmentService } from '../../../services/EquipmentService'
import CleanupUtility from '../../../utils/CleanupUtility'
import EquipmentUtility from '../../../utils/EquipmentUtility'
import EquipmentAddView from '../equipment/EquipmentAddView'
import EquipmentCard from '../equipment/EquipmentCard'
import EquipmentDetailView from '../equipment/EquipmentDetailView'

const EQUIPMENT_TYPE_OPTIONS = [
    'Front-End Loader',
    'Excavator',
    'Mini-Excavator',
    'Backhoe',
    'Skid Steer',
    'Forklift',
    'Manlift',
    'Dozer',
    'Off-Road Dump Truck',
    'Water/Trash Pump',
    'Water Truck',
    'Trailer',
    'Portable Compressor',
    'Portable Conveyor',
    'Crusher',
    'Ice Conveyor',
    'Rotary Mixer',
    'Road Reclaimer',
    'Roller',
    'Maintainer',
    'Sweeper',
    'Other',
    'Unknown'
]

const equipmentConfig = {
    AddView: EquipmentAddView,
    CardComponent: EquipmentCard,
    DetailView: EquipmentDetailView,
    addButtonLabel: 'Add Equipment',
    addViewCallbackProp: 'onEquipmentAdded',
    addViewPassesOperators: false,
    addViewPassesPlants: true,
    attachIsVerified: (obj) => {
        if (!obj) return obj
        obj.isVerified = function (latestHistoryDate) {
            return EquipmentUtility.isVerified(
                this.updatedLast,
                this.updatedAt,
                this.updatedBy,
                latestHistoryDate ?? this.latestHistoryDate
            )
        }
        return obj
    },
    cardItemPropName: 'equipment',
    channelName: 'equipment-realtime-changes',
    customSortComparators: {
        'Equipment #': (a, b) => (parseFloat(a.identifyingNumber) || 0) - (parseFloat(b.identifyingNumber) || 0),
        Verified: (a, b) => {
            const aVal =
                a.status === 'Retired'
                    ? 0
                    : EquipmentUtility.isVerified(a.updatedLast, a.updatedAt, a.updatedBy)
                      ? 2
                      : 1
            const bVal =
                b.status === 'Retired'
                    ? 0
                    : EquipmentUtility.isVerified(b.updatedLast, b.updatedAt, b.updatedBy)
                      ? 2
                      : 1
            return aVal - bVal
        }
    },
    defaultSortFields: { numberField: 'identifyingNumber', statusField: 'status' },

    detailIdProp: 'equipmentId',

    duplicateChecks: [],

    emptyState: { addLabel: 'Add Equipment', icon: 'fa-snowplow', title: 'No Equipment Found' },
    exportConfig: { assetType: 'Equipment', identifierField: 'identifyingNumber' },

    // Extra type filter (equipment type dropdown)
    extraTypeFilter: {
        allLabel: 'All Types',
        label: 'Equipment type filter',
        matchFn: (item, filterValue) => item.equipmentType === filterValue,
        options: EQUIPMENT_TYPE_OPTIONS,
        persistKey: 'equipmentTypeFilter'
    },

    // Equipment fetchEquipmentsWithDetails doesn't take codes param
    fetchItems: () => EquipmentService.fetchEquipmentsWithDetails(),

    filterPersistence: {
        filterKey: 'equipmentFilters',
        resetFnKey: 'resetEquipmentFilters',
        updateFnKey: 'updateEquipmentFilter'
    },

    getModalIdentifier: (item) => item.identifyingNumber || 'Unknown',

    gridCardFields: [
        { getValue: (_item, ctx) => ctx.plantName || '---', label: 'Plant' },
        { getValue: (item) => item.equipmentType || 'Unknown', label: 'Type' },
        {
            getValue: (item) =>
                item.lastServiceDate ? new Date(item.lastServiceDate).toLocaleDateString() : 'Unknown',
            isOverdue: (item) => EquipmentUtility.isServiceOverdue(item.lastServiceDate),
            label: 'Last Service'
        },
        {
            getValue: (item) => item.cleanlinessRating || 0,
            label: 'Cleanliness',
            type: 'stars'
        },
        {
            getValue: (item) => item.conditionRating || 0,
            label: 'Condition',
            type: 'stars'
        },
        { getValue: (item) => item.hoursMileage || 'Not Recorded', label: 'Hours/Mileage' }
    ],

    hasEmbeddedMode: true,

    hasFilterPersistence: true,

    hasOperatorAssignment: false,

    hasPotentialMatches: true,

    hasRecap: false,

    hasShopSubStatuses: false,

    hasTractorAssignment: false,

    // Feature flags
    hasVerification: true,

    hasVinSearch: false,

    historyType: 'equipment',

    icon: 'fa-snowplow',

    iconGradient: 'linear-gradient(135deg, #581c87, #a855f7)',

    itemTypeLabel: 'Equipment',

    key: 'equipment',

    listConfig: {
        colWidths: ['10%', '15%', '10%', '15%', '8%', '10%', '10%', '10%', '12%'],
        columns: [
            { key: 'assignedPlant', label: 'Plant', width: '10%' },
            { key: 'equipmentType', label: 'Type', width: '15%' },
            {
                bold: true,
                copyTitle: 'Copy equipment number',
                key: 'identifyingNumber',
                label: 'Equipment #',
                type: 'truckNumber',
                width: '10%'
            },
            {
                getValue: (item) => {
                    const parts = [item.yearMade, item.equipmentMake, item.equipmentModel].filter(Boolean)
                    return parts.join(' ').trim() || null
                },
                key: 'makeModel',
                label: 'Make & Model',
                width: '15%'
            },
            { key: 'status', label: 'Status', type: 'status', width: '8%' },
            {
                key: 'cleanlinessRating',
                label: 'Cleanliness',
                ratingField: 'cleanlinessRating',
                type: 'stars',
                width: '10%'
            },
            { key: 'conditionRating', label: 'Condition', ratingField: 'conditionRating', type: 'stars', width: '10%' },
            {
                getIsVerified: (item) =>
                    typeof item.isVerified === 'function'
                        ? item.isVerified(item.latestHistoryDate)
                        : EquipmentUtility.isVerified(
                              item.updatedLast,
                              item.updatedAt,
                              item.updatedBy,
                              item.latestHistoryDate
                          ),
                key: 'verified',
                label: 'Verified',
                type: 'verified',
                width: '10%'
            },
            { key: '_actions', label: 'More', type: 'actions', width: '12%' }
        ],
        headerLabels: [
            'Plant',
            'Type',
            'Equipment #',
            'Make & Model',
            'Status',
            'Cleanliness',
            'Condition',
            'Verified',
            'More'
        ]
    },

    pluralLabel: 'Equipment',

    primaryField: 'identifyingNumber',

    primaryLabel: 'Equipment #',

    realtimeFieldMap: {
        assigned_plant: 'assignedPlant',
        cleanliness_rating: 'cleanlinessRating',
        condition_rating: 'conditionRating',
        equipment_make: 'equipmentMake',
        equipment_model: 'equipmentModel',
        equipment_type: 'equipmentType',
        hours_mileage: 'hoursMileage',
        identifying_number: 'identifyingNumber',
        last_service_date: 'lastServiceDate',
        status: 'status',
        updated_at: 'updatedAt',
        updated_by: 'updatedBy',
        updated_last: 'updatedLast',
        year_made: 'yearMade'
    },

    // Refetch on detail close
    refetchOnDetailClose: true,

    searchFields: (item, query, { exactMatch }) => {
        if (exactMatch) return item.identifyingNumber?.toLowerCase() === query
        return (
            item.identifyingNumber?.toLowerCase().includes(query) || item.equipmentType?.toLowerCase().includes(query)
        )
    },

    searchPlaceholder: 'Search by identifying number or equipment type...',

    // Equipment selects full object
    selectsFullObject: true,

    service: EquipmentService,

    singularLabel: 'Equipment',

    sortMappings: {
        Cleanliness: 'cleanlinessRating',
        Condition: 'conditionRating',
        'Equipment #': 'identifyingNumber',
        'Make & Model': 'equipmentMake',
        More: null,
        Plant: 'assignedPlant',
        Status: 'status',
        Type: 'equipmentType',
        Verified: 'verified'
    },

    specialStatusFilters: {
        'Not Verified': (item) =>
            !EquipmentUtility.isVerified(item.updatedLast, item.updatedAt, item.updatedBy) && item.status !== 'Retired',
        'Open Issues': (item) => Number(item.openIssuesCount || 0) > 0,
        'Past Due Service': (item) => EquipmentUtility.isServiceOverdue(item.lastServiceDate),
        Verified: (item) => EquipmentUtility.isVerified(item.updatedLast, item.updatedAt, item.updatedBy)
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

    tableName: 'heavy_equipment',

    verification: {
        cleanupCheck: (items) => CleanupUtility.verificationCheck(items, EquipmentService.updateEquipment, 'equipment'),
        getFieldValues: (item) => ({
            lastServiceDate: item.lastServiceDate || null,
            make: item.make || item.equipmentMake || '',
            model: item.model || item.equipmentModel || '',
            vin: item.vin || '',
            year: item.year || item.yearMade || ''
        }),
        getMissingFields: (item) => [
            ...(!item.make && !item.equipmentMake ? ['Make'] : []),
            ...(!item.model && !item.equipmentModel ? ['Model'] : []),
            ...(!item.year && !item.yearMade ? ['Year'] : [])
        ],
        hasLastChipDate: false,
        isServiceOverdueFn: EquipmentUtility.isServiceOverdue,
        itemType: 'equipment',
        updateFn: (id, updates) => EquipmentService.updateEquipment(id, updates),
        verifyFn: (id) => EquipmentService.verifyEquipment(id)
    },

    viewClassName: 'equipments-view',

    viewModeStorageKey: 'equipments_last_view_mode'
}

export default equipmentConfig
