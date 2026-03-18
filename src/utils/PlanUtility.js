// Plan utility functions and constants

export const PRE_TRIP_MINUTES = 15
export const BUFFER_MINUTES = 5
export const AUTOSAVE_DELAY_MS = 1000
export const DEFAULT_STAGGER_MINUTES = 5
export const OVERTIME_THRESHOLD_HOURS = 12
export const GAP_THRESHOLD_MINUTES = 30
export const TARGET_YPH = 3 // minimum yards/hr/op target
export const MAX_YPH = 5 // above this, operators can't keep up
export const DROPDOWN_ARROW_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`

export const TIMELINE_START_HOUR = 0
export const TIMELINE_END_HOUR = 24
export const TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR
export const LABEL_WIDTH = 150
export const DAY_WIDTH = 900 // px per day column

export const LANE_COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
    '#f97316',
    '#6366f1'
]

export const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
}

export const getOffsetDate = (dateStr, offset) => {
    const d = new Date(dateStr + 'T00:00:00')
    d.setDate(d.getDate() + offset)
    return d.toISOString().split('T')[0]
}

export const formatTime = (hours, minutes) => `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
export const parseTime = (timeString) => timeString?.split(':').map(Number) ?? [0, 0]

export const addMinutesToTime = (time, mins) => {
    if (!time) return null
    const [hours, minutes] = parseTime(time)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    date.setMinutes(date.getMinutes() + mins)
    return formatTime(date.getHours(), date.getMinutes())
}

export const formatTimeInput = (value) => {
    const digits = value.replace(/[^0-9]/g, '')
    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`
}

let assignmentIdCounter = Date.now()
export const nextAssignmentId = () => ++assignmentIdCounter

export const createEmptyAssignment = () => ({
    customTimes: [],
    driverCount: 1,
    fromPlant: '',
    id: nextAssignmentId(),
    leaveTime: '',
    staggerMinutes: DEFAULT_STAGGER_MINUTES,
    time: '',
    timeMode: 'stagger',
    toPlant: ''
})

export const ensureUniqueIds = (assignments) => {
    const seen = new Set()
    return assignments.map((a) => {
        if (!a.id || seen.has(a.id)) {
            return { ...a, id: nextAssignmentId() }
        }
        seen.add(a.id)
        return a
    })
}

export const timeToMinutes = (timeStr) => {
    if (!timeStr) return null
    const [h, m] = parseTime(timeStr)
    return h * 60 + m
}

export const minutesToTime = (totalMin) => {
    const h = Math.floor(totalMin / 60) % 24
    const m = totalMin % 60
    return formatTime(h, m)
}

export const timeToPercent = (timeStr) => {
    if (!timeStr) return null
    const [h, m] = parseTime(timeStr)
    const totalMin = (h - TIMELINE_START_HOUR) * 60 + m
    return Math.max(0, Math.min(100, (totalMin / (TIMELINE_HOURS * 60)) * 100))
}

export const percentToTime = (pct) => {
    const totalMin = (pct / 100) * TIMELINE_HOURS * 60 + TIMELINE_START_HOUR * 60
    return minutesToTime(Math.round(totalMin))
}
