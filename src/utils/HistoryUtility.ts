import { DAYS_IN_MS, DEFAULT_STATUS_COLOR, MILEAGE_MILESTONES, STATUS_COLORS } from '../app/constants/historyConstants'
import { DateUtility } from './DateUtility'

interface HistoryEntry {
    changedAt?: string
    changed_at?: string
    changedBy?: string
    changed_by?: string
    fieldName?: string
    field_name?: string
    newValue?: string | null
    new_value?: string | null
    oldValue?: string | null
    old_value?: string | null
    [key: string]: unknown
}

interface FieldConfig {
    dbField: string
    entityIdColumn?: string
    field: string
    type?: 'date' | 'number' | 'string'
}

interface ChangeRecord {
    changed_at: string
    changed_by: string
    field_name: string
    new_value: string | null
    old_value: string | null

    [key: string]: string | null | undefined
}

interface TimelineEntry {
    date: Date
    timestamp: string
    [key: string]: unknown
}

interface ConsolidatedTimelineEntry extends TimelineEntry {
    days: number
    isCurrent: boolean
    startDate: string
    [key: string]: unknown
}

type AssetType = 'mixer' | 'tractor' | 'operator' | 'pickup-truck' | 'equipment' | 'trailer'

interface AssetItem {
    employeeId?: string
    id?: string
    identifyingNumber?: string
    make?: string
    model?: string
    name?: string
    truckNumber?: string
    vin?: string
    [key: string]: unknown
}

interface MileageMilestone {
    label: string
    level: string
    threshold: number
}

function areEquivalent(fieldName: string, oldValue: unknown, newValue: unknown): boolean {
    const toIsoDay = (date: Date): string => date.toISOString().split('T')[0]
    const parseMonth = (name: string): number | null => {
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
    const normalizeDate = (raw: unknown): string | null => {
        if (raw === undefined || raw === null) return null
        let s: unknown = typeof raw === 'string' ? (raw as string).trim() : raw
        if (typeof s !== 'string') {
            const d = new Date(s as number)
            return isNaN(d.getTime()) ? null : toIsoDay(d)
        }
        if (s === '') return null
        s = s.replace(/,/g, ' ')
        s = (s as string).replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1')
        if (/^\d{4}-\d{2}-\d{2}/.test(s as string)) return (s as string).substring(0, 10)
        if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(s as string)) {
            const parts = (s as string).split(/[/-]/)
            const m = parseInt(parts[0], 10) - 1
            const d = parseInt(parts[1], 10)
            let y = parseInt(parts[2], 10)
            if (y < 100) y += 2000
            const date = new Date(Date.UTC(y, m, d))
            return isNaN(date.getTime()) ? null : toIsoDay(date)
        }
        const mdy = (s as string).match(/([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})/)
        if (mdy) {
            const mIdx = parseMonth(mdy[1])
            const d = parseInt(mdy[2], 10)
            const y = parseInt(mdy[3], 10)
            if (mIdx !== null) {
                const date = new Date(Date.UTC(y, mIdx, d))
                return isNaN(date.getTime()) ? null : toIsoDay(date)
            }
        }
        const dflt = new Date(s as string)
        return isNaN(dflt.getTime()) ? (s as string) : toIsoDay(dflt)
    }
    const norm = (field: string, val: unknown): unknown => {
        if (val === undefined || val === null) return null
        let v: unknown = typeof val === 'string' ? (val as string).trim() : val
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
}

function buildChanges(
    entityId: string,
    fields: FieldConfig[],
    currentObj: Record<string, unknown>,
    newObj: Record<string, unknown>,
    userId: string,
    timestamps = true
): ChangeRecord[] {
    if (!entityId || !fields || !currentObj || !newObj) return []
    const now = new Date().toISOString()
    return fields.reduce<ChangeRecord[]>((acc, f) => {
        const oldVal = currentObj[f.field]
        const newVal = newObj[f.field]
        let o: unknown = oldVal,
            n: unknown = newVal
        if (f.type === 'date') {
            o = o ? new Date(o as string | number).toISOString().split('T')[0] : null
            n = n ? new Date(n as string | number).toISOString().split('T')[0] : null
        } else if (f.type === 'number') {
            o = o != null ? Number(o) : null
            n = n != null ? Number(n) : null
        } else {
            if (o != null) o = (o as { toString(): string }).toString().trim()
            if (n != null) n = (n as { toString(): string }).toString().trim()
        }
        if (o !== n) {
            acc.push({
                [f.entityIdColumn || 'equipment_id']: entityId,
                changed_at: timestamps ? now : DateUtility.toISO(now)!,
                changed_by: userId || '00000000-0000-0000-0000-000000000000',
                field_name: f.dbField,
                new_value: n != null ? String(n) : null,
                old_value: o != null ? String(o) : null
            })
        }
        return acc
    }, [])
}

function buildConsolidatedTimeline(
    data: TimelineEntry[],
    valueKey: string,
    getValue: (entry: TimelineEntry) => unknown
): ConsolidatedTimelineEntry[] {
    const timeline: ConsolidatedTimelineEntry[] = []
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

function buildFieldNameMap(type: string): Record<string, string> {
    const base: Record<string, string> = {
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

function countByKey<T>(data: T[], keyExtractor: (entry: T) => string): Record<string, number> {
    return data.reduce<Record<string, number>>((acc, entry) => {
        const key = keyExtractor(entry)
        acc[key] = (acc[key] || 0) + 1
        return acc
    }, {})
}

function daysBetween(startDate: Date, endDate: Date): number {
    return Math.round((endDate.getTime() - startDate.getTime()) / DAYS_IN_MS)
}

function getEntryField(entry: HistoryEntry, camelKey: string, snakeKey: string): unknown {
    return entry[camelKey] ?? entry[snakeKey]
}

function getEntryChangedBy(entry: HistoryEntry): unknown {
    return getEntryField(entry, 'changedBy', 'changed_by')
}

function getEntryFieldName(entry: HistoryEntry): unknown {
    return getEntryField(entry, 'fieldName', 'field_name')
}

function getEntryNewValue(entry: HistoryEntry): unknown {
    return getEntryField(entry, 'newValue', 'new_value')
}

function getEntryOldValue(entry: HistoryEntry): unknown {
    return getEntryField(entry, 'oldValue', 'old_value')
}

function getEntryTimestamp(entry: HistoryEntry): unknown {
    return getEntryField(entry, 'changedAt', 'changed_at')
}

function normalizeFieldToSnakeCase(fieldName: string | null | undefined): string {
    if (!fieldName) return ''
    return fieldName.includes('_')
        ? fieldName
        : String(fieldName)
              .replace(/([A-Z])/g, '_$1')
              .toLowerCase()
}

function filterAndSortByFieldKey(history: HistoryEntry[], matchFn: (key: string) => boolean): HistoryEntry[] {
    return history
        .filter((entry) => matchFn(normalizeFieldToSnakeCase(getEntryFieldName(entry) as string)))
        .sort(
            (a, b) =>
                new Date(getEntryTimestamp(a) as string).getTime() - new Date(getEntryTimestamp(b) as string).getTime()
        )
}

function findMostFrequent(counts: Record<string, number>): string | null {
    const entries = Object.entries(counts)
    if (entries.length === 0) return null
    return entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0]
}

function formatDuration(days: number): string {
    if (days === 0) return 'Less than a day'
    if (days === 1) return '1 day'
    if (days < 30) return `${days} days`
    if (days < 365) return `${Math.round(days / 30.44)} months`
    return `${(days / 365.25).toFixed(1)} years`
}

function formatFieldName(fieldName: string, type: string): string {
    const snakeCaseField = normalizeFieldToSnakeCase(fieldName)
    const fieldMap = buildFieldNameMap(type)
    return fieldMap[snakeCaseField] ?? snakeCaseField.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

function formatHistoryDate(dateString: string | null | undefined): string {
    return dateString ? DateUtility.formatDateTime(dateString) : 'Not completed'
}

function formatHistoryTimestamp(dateString: string | null | undefined): string {
    return dateString ? DateUtility.formatDateTime(dateString) : 'Not Assigned'
}

function getMaintenanceMilestone(miles: number): MileageMilestone {
    return MILEAGE_MILESTONES.find((m) => miles >= m.threshold) ?? MILEAGE_MILESTONES[MILEAGE_MILESTONES.length - 1]
}

function getStatusColor(status: string): string {
    return (STATUS_COLORS as Record<string, string>)[status] ?? DEFAULT_STATUS_COLOR
}

async function loadServiceModule(serviceName: string): Promise<unknown> {
    const { [serviceName]: Service } = await import(`../services/${serviceName}`)
    return Service
}

function pluralizeDays(days: number): string {
    return `${days} ${days === 1 ? 'day' : 'days'}`
}

function resolveAssetId(type: AssetType, item: AssetItem): string | undefined {
    return type === 'operator' ? item.employeeId : item.id
}

function resolveAssetIdentifier(type: AssetType, item: AssetItem): string {
    if (type === 'mixer' || type === 'tractor') return item.truckNumber ?? ''
    if (type === 'operator') return item.name ?? ''
    if (type === 'pickup-truck') return `${item.make} ${item.model}`
    return item.identifyingNumber ?? item.name ?? 'Unknown'
}

function resolveItemName(type: AssetType, item: AssetItem): string {
    if (type === 'mixer' || type === 'tractor') return `Truck #${item.truckNumber}`
    if (type === 'pickup-truck') return `${item.make ?? ''} ${item.model ?? ''} (${item.vin ?? 'Unknown'})`.trim()
    return item.name ?? 'Item'
}

const HistoryUtility = {
    areEquivalent,
    buildChanges,
    buildConsolidatedTimeline,
    buildFieldNameMap,
    countByKey,
    daysBetween,
    filterAndSortByFieldKey,
    findMostFrequent,
    formatDuration,
    formatFieldName,
    formatHistoryDate,
    formatHistoryTimestamp,
    getEntryChangedBy,
    getEntryField,
    getEntryFieldName,
    getEntryNewValue,
    getEntryOldValue,
    getEntryTimestamp,
    getMaintenanceMilestone,
    getStatusColor,
    loadServiceModule,
    normalizeFieldToSnakeCase,
    pluralizeDays,
    resolveAssetId,
    resolveAssetIdentifier,
    resolveItemName
}
export default HistoryUtility
export { HistoryUtility }
