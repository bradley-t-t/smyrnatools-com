import { DAYS_IN_MS, DEFAULT_STATUS_COLOR, MILEAGE_MILESTONES, STATUS_COLORS } from '../app/constants/historyConstants'
import { FormatUtility } from './FormatUtility'

/**
 * History view presentation helpers: field-name normalization, consolidated timeline building,
 * duration formatting, asset identifier resolution, and field-name display mapping.
 */
export const normalizeFieldToSnakeCase = (fieldName) => {
    if (!fieldName) return ''
    return fieldName.includes('_')
        ? fieldName
        : String(fieldName)
              .replace(/([A-Z])/g, '_$1')
              .toLowerCase()
}

export const getEntryField = (entry, camelKey, snakeKey) => entry[camelKey] ?? entry[snakeKey]

export const getEntryTimestamp = (entry) => getEntryField(entry, 'changedAt', 'changed_at')

export const getEntryFieldName = (entry) => getEntryField(entry, 'fieldName', 'field_name')

export const getEntryNewValue = (entry) => getEntryField(entry, 'newValue', 'new_value')

export const getEntryOldValue = (entry) => getEntryField(entry, 'oldValue', 'old_value')

export const getEntryChangedBy = (entry) => getEntryField(entry, 'changedBy', 'changed_by')

export const filterAndSortByFieldKey = (history, matchFn) =>
    history
        .filter((entry) => matchFn(normalizeFieldToSnakeCase(getEntryFieldName(entry))))
        .sort((a, b) => new Date(getEntryTimestamp(a)) - new Date(getEntryTimestamp(b)))

export const daysBetween = (startDate, endDate) => Math.round((endDate - startDate) / DAYS_IN_MS)

export const pluralizeDays = (days) => `${days} ${days === 1 ? 'day' : 'days'}`

export const getStatusColor = (status) => STATUS_COLORS[status] ?? DEFAULT_STATUS_COLOR

export const getMaintenanceMilestone = (miles) =>
    MILEAGE_MILESTONES.find((m) => miles >= m.threshold) ?? MILEAGE_MILESTONES[MILEAGE_MILESTONES.length - 1]

export const buildConsolidatedTimeline = (data, valueKey, getValue) => {
    const timeline = []
    let index = 0

    while (index < data.length) {
        const entry = data[index]
        const currentValue = getValue(entry)
        let endIndex = index + 1

        while (endIndex < data.length && getValue(data[endIndex]) === currentValue) {
            endIndex++
        }

        const startDate = entry.date
        const endDate = endIndex < data.length ? data[endIndex].date : new Date()
        const days = daysBetween(startDate, endDate)

        timeline.push({
            ...entry,
            days,
            isCurrent: endIndex >= data.length,
            startDate: entry.timestamp,
            [valueKey]: currentValue
        })

        index = endIndex
    }

    return timeline
}

export const formatDuration = (days) => {
    if (days === 0) return 'Less than a day'
    if (days === 1) return '1 day'
    if (days < 30) return `${days} days`
    if (days < 365) return `${Math.round(days / 30.44)} months`
    return `${(days / 365.25).toFixed(1)} years`
}

export const resolveAssetId = (type, item) => (type === 'operator' ? item.employeeId : item.id)

export const resolveItemName = (type, item) => {
    if (type === 'mixer' || type === 'tractor') return `Truck #${item.truckNumber}`
    if (type === 'pickup-truck') return `${item.make ?? ''} ${item.model ?? ''} (${item.vin ?? 'Unknown'})`.trim()
    return item.name ?? 'Item'
}

export const resolveAssetIdentifier = (type, item) => {
    if (type === 'mixer' || type === 'tractor') return item.truckNumber
    if (type === 'operator') return item.name
    if (type === 'pickup-truck') return `${item.make} ${item.model}`
    return item.identifyingNumber ?? item.name ?? 'Unknown'
}

export const formatHistoryTimestamp = (dateString) =>
    dateString ? FormatUtility.formatDateTime(dateString) : 'Not Assigned'

export const formatHistoryDate = (dateString) =>
    dateString ? FormatUtility.formatDateTime(dateString) : 'Not completed'

export const buildFieldNameMap = (type) => {
    const base = {
        assigned_operator: 'Operator',
        assigned_plant: 'Plant',
        cleanliness_rating: 'Cleanliness',
        created: 'Created',
        last_chip_date: 'Chip Date',
        last_service_date: 'Service Date',
        status: 'Status',
        truck_number: 'Truck Number',
        verification: 'Verification'
    }

    if (type === 'tractor') base['has_blower'] = 'Has Blower'
    if (type === 'operator') {
        base['assigned_mixer'] = 'Assigned Mixer'
        base['assigned_tractor'] = 'Assigned Tractor'
        base['assigned_trainer'] = 'Assigned Trainer'
    }

    return base
}

export const formatFieldName = (fieldName, type) => {
    const snakeCaseField = normalizeFieldToSnakeCase(fieldName)
    const fieldMap = buildFieldNameMap(type)
    return fieldMap[snakeCaseField] ?? snakeCaseField.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

export const countByKey = (data, keyExtractor) =>
    data.reduce((acc, entry) => {
        const key = keyExtractor(entry)
        acc[key] = (acc[key] || 0) + 1
        return acc
    }, {})

export const findMostFrequent = (counts) => {
    const entries = Object.entries(counts)
    if (entries.length === 0) return null
    return entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0]
}

export const loadServiceModule = async (serviceName) => {
    const { [serviceName]: Service } = await import(`../services/${serviceName}`)
    return Service
}
