import { DAYS_IN_MS, DEFAULT_STATUS_COLOR, MILEAGE_MILESTONES, STATUS_COLORS } from '../app/constants/historyConstants'
import { DateUtility } from './DateUtility'
const HistoryUtility = {
    areEquivalent(fieldName, oldValue, newValue) {
        const toIsoDay = (date) => date.toISOString().split('T')[0]
        const parseMonth = (name) => {
            const m = name.toLowerCase()
            if (m.startsWith('jan')) return 0
            if (m.startsWith('feb')) return 1
            if (m.startsWith('mar')) return 2
            if (m.startsWith('apr')) return 3
            if (m.startsWith('may')) return 4
            if (m.startsWith('jun')) return 5
            if (m.startsWith('jul')) return 6
            if (m.startsWith('aug')) return 7
            if (m.startsWith('sep')) return 8
            if (m.startsWith('oct')) return 9
            if (m.startsWith('nov')) return 10
            if (m.startsWith('dec')) return 11
            return null
        }
        const normalizeDate = (raw) => {
            if (raw === undefined || raw === null) return null
            let s = typeof raw === 'string' ? raw.trim() : raw
            if (typeof s !== 'string') {
                const d = new Date(s)
                return isNaN(d.getTime()) ? null : toIsoDay(d)
            }
            if (s === '') return null
            s = s.replace(/,/g, ' ')
            s = s.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1')
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10)
            if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(s)) {
                const parts = s.split(/[/-]/)
                let m = parseInt(parts[0], 10) - 1
                let d = parseInt(parts[1], 10)
                let y = parseInt(parts[2], 10)
                if (y < 100) y += 2000
                const date = new Date(Date.UTC(y, m, d))
                return isNaN(date.getTime()) ? null : toIsoDay(date)
            }
            const mdy = s.match(/([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})/)
            if (mdy) {
                const mIdx = parseMonth(mdy[1])
                const d = parseInt(mdy[2], 10)
                const y = parseInt(mdy[3], 10)
                if (mIdx !== null) {
                    const date = new Date(Date.UTC(y, mIdx, d))
                    return isNaN(date.getTime()) ? null : toIsoDay(date)
                }
            }
            const dflt = new Date(s)
            return isNaN(dflt.getTime()) ? s : toIsoDay(dflt)
        }
        const norm = (field, val) => {
            if (val === undefined || val === null) return null
            let v = typeof val === 'string' ? val.trim() : val
            if (v === '') return null
            const f = String(field || '').toLowerCase()
            if (f.includes('date')) return normalizeDate(v)
            if (f.includes('rating') || f.includes('hours') || f.includes('mileage') || f.includes('year')) {
                const n = Number(v)
                return Number.isFinite(n) ? n : v
            }
            if (f.startsWith('has_') || f.startsWith('is_') || f.includes('verification')) {
                if (v === true || v === 'true' || v === 1 || v === '1') return true
                if (v === false || v === 'false' || v === 0 || v === '0') return false
            }
            if (f.startsWith('assigned_') || f.endsWith('_id') || f.includes('operator') || f.includes('tractor')) {
                if (v === '0' || v === 0) return null
            }
            return v
        }
        const a = norm(fieldName, oldValue)
        const b = norm(fieldName, newValue)
        return a === b
    },
    buildChanges(entityId, fields, currentObj, newObj, userId, timestamps = true) {
        if (!entityId || !fields || !currentObj || !newObj) return []
        const now = new Date().toISOString()
        return fields.reduce((acc, f) => {
            const oldVal = currentObj[f.field]
            const newVal = newObj[f.field]
            let o = oldVal,
                n = newVal
            if (f.type === 'date') {
                o = o ? new Date(o).toISOString().split('T')[0] : null
                n = n ? new Date(n).toISOString().split('T')[0] : null
            } else if (f.type === 'number') {
                o = o != null ? Number(o) : null
                n = n != null ? Number(n) : null
            } else {
                if (o != null) o = o.toString().trim()
                if (n != null) n = n.toString().trim()
            }
            if (o !== n) {
                acc.push({
                    [f.entityIdColumn || 'equipment_id']: entityId,
                    changed_at: timestamps ? now : DateUtility.toISO(now),
                    changed_by: userId || '00000000-0000-0000-0000-000000000000',
                    field_name: f.dbField,
                    new_value: n != null ? n.toString() : null,
                    old_value: o != null ? o.toString() : null
                })
            }
            return acc
        }, [])
    },
    buildConsolidatedTimeline(data, valueKey, getValue) {
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
            const days = this.daysBetween(startDate, endDate)
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
    },
    buildFieldNameMap(type) {
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
    },
    countByKey(data, keyExtractor) {
        return data.reduce((acc, entry) => {
            const key = keyExtractor(entry)
            acc[key] = (acc[key] || 0) + 1
            return acc
        }, {})
    },
    daysBetween(startDate, endDate) {
        return Math.round((endDate - startDate) / DAYS_IN_MS)
    },
    filterAndSortByFieldKey(history, matchFn) {
        return history
            .filter((entry) => matchFn(this.normalizeFieldToSnakeCase(this.getEntryFieldName(entry))))
            .sort((a, b) => new Date(this.getEntryTimestamp(a)) - new Date(this.getEntryTimestamp(b)))
    },
    findMostFrequent(counts) {
        const entries = Object.entries(counts)
        if (entries.length === 0) return null
        return entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0]
    },
    formatDuration(days) {
        if (days === 0) return 'Less than a day'
        if (days === 1) return '1 day'
        if (days < 30) return `${days} days`
        if (days < 365) return `${Math.round(days / 30.44)} months`
        return `${(days / 365.25).toFixed(1)} years`
    },
    formatFieldName(fieldName, type) {
        const snakeCaseField = this.normalizeFieldToSnakeCase(fieldName)
        const fieldMap = this.buildFieldNameMap(type)
        return fieldMap[snakeCaseField] ?? snakeCaseField.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    },
    formatHistoryDate(dateString) {
        return dateString ? DateUtility.formatDateTime(dateString) : 'Not completed'
    },
    formatHistoryTimestamp(dateString) {
        return dateString ? DateUtility.formatDateTime(dateString) : 'Not Assigned'
    },
    getEntryChangedBy(entry) {
        return this.getEntryField(entry, 'changedBy', 'changed_by')
    },
    getEntryField(entry, camelKey, snakeKey) {
        return entry[camelKey] ?? entry[snakeKey]
    },
    getEntryFieldName(entry) {
        return this.getEntryField(entry, 'fieldName', 'field_name')
    },
    getEntryNewValue(entry) {
        return this.getEntryField(entry, 'newValue', 'new_value')
    },
    getEntryOldValue(entry) {
        return this.getEntryField(entry, 'oldValue', 'old_value')
    },
    getEntryTimestamp(entry) {
        return this.getEntryField(entry, 'changedAt', 'changed_at')
    },
    getMaintenanceMilestone(miles) {
        return MILEAGE_MILESTONES.find((m) => miles >= m.threshold) ?? MILEAGE_MILESTONES[MILEAGE_MILESTONES.length - 1]
    },
    getStatusColor(status) {
        return STATUS_COLORS[status] ?? DEFAULT_STATUS_COLOR
    },
    async loadServiceModule(serviceName) {
        const { [serviceName]: Service } = await import(`../services/${serviceName}`)
        return Service
    },
    normalizeFieldToSnakeCase(fieldName) {
        if (!fieldName) return ''
        return fieldName.includes('_')
            ? fieldName
            : String(fieldName)
                  .replace(/([A-Z])/g, '_$1')
                  .toLowerCase()
    },
    pluralizeDays(days) {
        return `${days} ${days === 1 ? 'day' : 'days'}`
    },
    resolveAssetId(type, item) {
        return type === 'operator' ? item.employeeId : item.id
    },
    resolveAssetIdentifier(type, item) {
        if (type === 'mixer' || type === 'tractor') return item.truckNumber
        if (type === 'operator') return item.name
        if (type === 'pickup-truck') return `${item.make} ${item.model}`
        return item.identifyingNumber ?? item.name ?? 'Unknown'
    },
    resolveItemName(type, item) {
        if (type === 'mixer' || type === 'tractor') return `Truck #${item.truckNumber}`
        if (type === 'pickup-truck') return `${item.make ?? ''} ${item.model ?? ''} (${item.vin ?? 'Unknown'})`.trim()
        return item.name ?? 'Item'
    }
}
export default HistoryUtility
export { HistoryUtility }
