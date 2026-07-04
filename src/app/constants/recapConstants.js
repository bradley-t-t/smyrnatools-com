export const INACTIVE_STATUSES = ['terminated', 'do not hire']

export const DATE_OPTIONS = [
    { id: 'day', label: '24h' },
    { id: 'week', label: '7d' },
    { id: 'month', label: '30d' },
    { id: 'all', label: 'All' }
]

export const TYPE_OPTIONS = [
    { id: 'all', label: 'All' },
    { id: 'mixers', label: 'Mixers' },
    { id: 'operators', label: 'Operators' },
    { id: 'terminated', label: 'Terminated' }
]

export const FIELD_NAME_LABELS = {
    assigned_operator: 'Assigned Operator',
    assigned_plant: 'Assigned Plant',
    assigned_trainer: 'Assigned Trainer',
    automatic_restriction: 'Automatic Restriction',
    cleanliness_rating: 'Cleanliness',
    condition_rating: 'Condition',
    down_in_yard: 'Down In Yard',
    is_trainer: 'Trainer',
    last_chip_date: 'Last Chip Date',
    last_service_date: 'Last Service Date',
    make: 'Make',
    model: 'Model',
    name: 'Name',
    pending_start_date: 'Pending Start Date',
    phone: 'Phone',
    plant_code: 'Plant',
    position: 'Position',
    rating: 'Rating',
    smyrna_id: 'Smyrna ID',
    status: 'Status',
    truck_number: 'Truck Number',
    verified: 'Verified',
    vin: 'VIN',
    year: 'Year'
}

export const FIELD_NAME_ICONS = {
    assigned_operator: 'fa-solid fa-user',
    assigned_plant: 'fa-solid fa-industry',
    assigned_trainer: 'fa-solid fa-user-graduate',
    automatic_restriction: 'fa-solid fa-car-side',
    cleanliness_rating: 'fa-solid fa-sparkles',
    down_in_yard: 'fa-solid fa-parking',
    is_trainer: 'fa-solid fa-chalkboard-teacher',
    last_chip_date: 'fa-solid fa-hammer',
    last_service_date: 'fa-solid fa-wrench',
    make: 'fa-solid fa-car',
    model: 'fa-solid fa-tag',
    name: 'fa-solid fa-id-card',
    pending_start_date: 'fa-solid fa-calendar-plus',
    phone: 'fa-solid fa-phone',
    plant_code: 'fa-solid fa-industry',
    position: 'fa-solid fa-briefcase',
    rating: 'fa-solid fa-star',
    smyrna_id: 'fa-solid fa-hashtag',
    status: 'fa-solid fa-circle-dot',
    truck_number: 'fa-solid fa-truck',
    vin: 'fa-solid fa-barcode',
    year: 'fa-solid fa-calendar'
}
