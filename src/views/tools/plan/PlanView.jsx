import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { usePreferences } from '../../../app/context/PreferencesContext'
import { useIsMobile } from '../../../app/hooks/useIsMobile'
import { useRealtimeSubscription } from '../../../app/hooks/useRealtimeSubscription'
import { PlanService } from '../../../services/PlanService'
import { ReportService } from '../../../services/ReportService'
import { UserService } from '../../../services/UserService'

const PRE_TRIP_MINUTES = 15
const BUFFER_MINUTES = 5
const AUTOSAVE_DELAY_MS = 1000
const DEFAULT_STAGGER_MINUTES = 5
const OVERTIME_THRESHOLD_HOURS = 12
const GAP_THRESHOLD_MINUTES = 30
const DROPDOWN_ARROW_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`

const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
}

const getOffsetDate = (dateStr, offset) => {
    const d = new Date(dateStr + 'T00:00:00')
    d.setDate(d.getDate() + offset)
    return d.toISOString().split('T')[0]
}

const formatTime = (hours, minutes) => `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
const parseTime = (timeString) => timeString?.split(':').map(Number) ?? [0, 0]

const addMinutesToTime = (time, mins) => {
    if (!time) return null
    const [hours, minutes] = parseTime(time)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    date.setMinutes(date.getMinutes() + mins)
    return formatTime(date.getHours(), date.getMinutes())
}

const formatTimeInput = (value) => {
    const digits = value.replace(/[^0-9]/g, '')
    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`
}

let assignmentIdCounter = Date.now()
const nextAssignmentId = () => ++assignmentIdCounter

const createEmptyAssignment = () => ({
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

/** Ensures every assignment in an array has a unique id. */
const ensureUniqueIds = (assignments) => {
    const seen = new Set()
    return assignments.map((a) => {
        if (!a.id || seen.has(a.id)) {
            return { ...a, id: nextAssignmentId() }
        }
        seen.add(a.id)
        return a
    })
}

const PlantSelect = ({ value, onChange, plants, excludeValue, placeholder, className }) => (
    <select
        value={value}
        onChange={onChange}
        className={`border rounded-md text-xs outline-none py-1 pl-1.5 pr-4 appearance-none bg-no-repeat cursor-pointer w-[56px] ${className || ''}`}
        style={{
            backgroundColor: 'var(--bg-primary)',
            backgroundImage: DROPDOWN_ARROW_SVG,
            backgroundPosition: 'right 3px center',
            borderColor: 'var(--border-medium)',
            color: 'var(--text-primary)'
        }}
    >
        <option value="">{placeholder}</option>
        {plants
            .filter((p) => p.plant_code !== excludeValue)
            .map((p) => (
                <option key={p.plant_code} value={p.plant_code}>
                    {p.plant_code}
                </option>
            ))}
    </select>
)

const TimeInput = ({ value, onChange, placeholder = 'HH:MM', className = '' }) => (
    <input
        type="text"
        placeholder={placeholder}
        maxLength={5}
        value={value || ''}
        onChange={(e) => onChange(formatTimeInput(e.target.value))}
        className={`border rounded-md text-xs outline-none font-mono text-center py-1 px-1 w-[56px] ${className}`}
        style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-medium)',
            color: 'var(--text-primary)'
        }}
    />
)

const TIMELINE_START_HOUR = 0
const TIMELINE_END_HOUR = 24
const TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR
const LABEL_WIDTH = 150

const LANE_COLORS = [
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

const timeToMinutes = (timeStr) => {
    if (!timeStr) return null
    const [h, m] = parseTime(timeStr)
    return h * 60 + m
}

const minutesToTime = (totalMin) => {
    const h = Math.floor(totalMin / 60) % 24
    const m = totalMin % 60
    return formatTime(h, m)
}

const timeToPercent = (timeStr) => {
    if (!timeStr) return null
    const [h, m] = parseTime(timeStr)
    const totalMin = (h - TIMELINE_START_HOUR) * 60 + m
    return Math.max(0, Math.min(100, (totalMin / (TIMELINE_HOURS * 60)) * 100))
}

const percentToTime = (pct) => {
    const totalMin = (pct / 100) * TIMELINE_HOURS * 60 + TIMELINE_START_HOUR * 60
    return minutesToTime(Math.round(totalMin))
}

const DAY_WIDTH = 900 // px per day column

function TimelineView({
    assignments,
    adjacentPlans,
    adjacentProduction,
    plantProduction,
    planDate,
    plants,
    accentColor,
    getTravelTime,
    calcClockIn,
    addMinutesToTime,
    mixerCountsByPlant
}) {
    const [cursorDayIdx, setCursorDayIdx] = useState(null)
    const [cursorPct, setCursorPct] = useState(null)
    const [isDragging, setIsDragging] = useState(false)
    const scrollRef = React.useRef(null)
    const dayRefs = React.useRef({})

    // Build the ordered list of days: 3 before, selected, 3 after
    const days = useMemo(() => {
        const result = []
        for (let i = -3; i <= 3; i++) {
            const date = getOffsetDate(planDate, i)
            const dayAssignments = i === 0 ? assignments : adjacentPlans[date] || []
            const dayProduction = i === 0 ? plantProduction : adjacentProduction[date] || {}
            result.push({ date, assignments: dayAssignments, production: dayProduction, isCurrent: i === 0, offset: i })
        }
        return result
    }, [planDate, assignments, adjacentPlans, plantProduction, adjacentProduction])

    const buildLanesForDay = (dayAssignments, dayIdx) => {
        const result = []
        dayAssignments.forEach((a, idx) => {
            if (!a.fromPlant || !a.toPlant || !a.time) return
            const count = parseInt(a.driverCount) || 1
            const travelMin = getTravelTime(a.fromPlant, a.toPlant)
            const hasTravelTime = travelMin !== null

            const buildLane = (arriveTime, leaveTime, opLabel) => {
                // Load-from-plant trucks don't travel — pre-trip only
                const showTravel = hasTravelTime && !a.loadFromPlant
                const totalPreDeparture = showTravel ? travelMin + BUFFER_MINUTES + PRE_TRIP_MINUTES : PRE_TRIP_MINUTES
                const clockIn = arriveTime ? addMinutesToTime(arriveTime, -totalPreDeparture) : null
                const preTripEnd = clockIn ? addMinutesToTime(clockIn, PRE_TRIP_MINUTES) : null

                return {
                    arriveTime,
                    clockIn,
                    color: LANE_COLORS[idx % LANE_COLORS.length],
                    dayIdx,
                    fromPlant: a.fromPlant,
                    hasTravelTime: showTravel,
                    label: opLabel,
                    leaveTime: leaveTime || null,
                    loadFromPlant: a.loadFromPlant,
                    preTripEnd,
                    toPlant: a.toPlant,
                    travel: showTravel ? travelMin : null
                }
            }

            if (count > 1 && a.timeMode === 'custom' && a.customTimes?.length) {
                a.customTimes.slice(0, count).forEach((ct, i) => {
                    if (!ct.time) return
                    result.push(buildLane(ct.time, ct.leaveTime, `${a.fromPlant}\u2192${a.toPlant} #${i + 1}`))
                })
            } else if (count > 1) {
                for (let j = 0; j < count; j++) {
                    const arr = addMinutesToTime(a.time, j * (a.staggerMinutes || DEFAULT_STAGGER_MINUTES))
                    if (!arr) continue
                    result.push(buildLane(arr, a.leaveTime, `${a.fromPlant}\u2192${a.toPlant} #${j + 1}`))
                }
            } else {
                result.push(buildLane(a.time, a.leaveTime, `${a.fromPlant}\u2192${a.toPlant}`))
            }
        })
        return result
    }

    // Build per-day lanes
    const dayLanes = useMemo(
        () => days.map((day, idx) => ({ ...day, lanes: buildLanesForDay(day.assignments, idx) })),
        [days, getTravelTime, calcClockIn, addMinutesToTime]
    )

    // Detect insufficient rest between consecutive days (< 10 hours) per individual lane
    // Only flags violations where both sides of the day boundary have actual shifts
    const MIN_REST_HOURS = 10
    const restViolations = useMemo(() => {
        const violations = {}
        const plantCodes = plants.map((p) => p.plant_code).filter(Boolean)

        // Only sent lanes (fromPlant === plant) — these are the plant's own drivers.
        // Received lanes are another plant's drivers and don't count for this plant's reset.
        const getPlantSentLanes = (day, plant) =>
            day.lanes
                .filter((l) => l.fromPlant === plant)
                .sort((a, b) => (a.clockIn || a.arriveTime).localeCompare(b.clockIn || b.arriveTime))

        // Only check pairs of consecutive days — both must have lanes for the plant
        for (let i = 0; i < dayLanes.length - 1; i++) {
            const dayA = dayLanes[i]
            const dayB = dayLanes[i + 1]
            if (!dayA.lanes.length || !dayB.lanes.length) continue

            for (const plant of plantCodes) {
                const lanesA = getPlantSentLanes(dayA, plant)
                const lanesB = getPlantSentLanes(dayB, plant)
                if (!lanesA.length || !lanesB.length) continue

                // Get valid leave times from day A and start times from day B
                const leaveMinsA = lanesA
                    .map((l, li) => ({ li, mins: timeToMinutes(l.leaveTime) }))
                    .filter((x) => x.mins !== null)
                const startMinsB = lanesB
                    .map((l, li) => ({ li, mins: timeToMinutes(l.clockIn || l.arriveTime) }))
                    .filter((x) => x.mins !== null)
                if (!leaveMinsA.length || !startMinsB.length) continue

                const earliestStartB = Math.min(...startMinsB.map((x) => x.mins))
                const latestLeaveA = Math.max(...leaveMinsA.map((x) => x.mins))

                // End-of-day blocks on day A: each lane with a leave time that's < 10h from earliest next-day start
                for (const { li, mins: leaveMins } of leaveMinsA) {
                    const gap = 24 * 60 - leaveMins + earliestStartB
                    if (gap < MIN_REST_HOURS * 60) {
                        const gapHours = Math.round((gap / 60) * 10) / 10
                        violations[`${i}:${plant}:${li}:end`] = {
                            gapHours,
                            prevLeaveTime: minutesToTime(leaveMins)
                        }
                    }
                }

                // Start-of-day blocks on day B: each lane with a start time that's < 10h from latest prev-day leave
                for (const { li, mins: startMins } of startMinsB) {
                    const gap = 24 * 60 - latestLeaveA + startMins
                    if (gap < MIN_REST_HOURS * 60) {
                        const gapHours = Math.round((gap / 60) * 10) / 10
                        violations[`${i + 1}:${plant}:${li}`] = {
                            gapHours,
                            nextStartTime: minutesToTime(startMins)
                        }
                    }
                }
            }
        }
        return violations
    }, [dayLanes, plants])

    // All plants sorted by code — always show every plant regardless of plan data
    const allPlants = useMemo(
        () =>
            plants
                .map((p) => p.plant_code)
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b)),
        [plants]
    )

    // Neutral colors for sent/received/home lanes
    const SENT_COLOR = '#8b8685' // warm gray — operators leaving this plant
    const RECV_COLOR = '#5b7a9c' // muted steel blue — operators arriving at this plant
    const HOME_COLOR = '#4d8c57' // muted green — operators staying at home plant

    const plantRows = useMemo(
        () =>
            allPlants.map((plant) => {
                let maxSent = 0
                let maxRecv = 0
                let maxTotal = 0
                const base = mixerCountsByPlant[plant] || 0
                dayLanes.forEach((d) => {
                    const sent = d.lanes.filter((l) => l.fromPlant === plant).length
                    const recv = d.lanes.filter((l) => l.toPlant === plant).length
                    const home = Math.max(0, base - sent)
                    maxSent = Math.max(maxSent, sent)
                    maxRecv = Math.max(maxRecv, recv)
                    // +1 row for consolidated home/production bar when home operators exist
                    maxTotal = Math.max(maxTotal, sent + recv + (home > 0 ? 1 : 0))
                })
                return {
                    plant,
                    base,
                    sentCount: maxSent,
                    recvCount: maxRecv,
                    laneCount: Math.max(1, maxTotal)
                }
            }),
        [allPlants, dayLanes, mixerCountsByPlant]
    )

    // Cursor logic
    const cursorTime = cursorPct !== null ? percentToTime(cursorPct) : null

    const plantSnapshot = useMemo(() => {
        if (cursorTime === null || cursorDayIdx === null) return []
        const cursorMin = timeToMinutes(cursorTime)
        const day = dayLanes[cursorDayIdx]
        if (!day) return []
        const plantCounts = {}

        day.lanes.forEach((lane) => {
            const clockInMin = timeToMinutes(lane.clockIn)
            const arriveMin = timeToMinutes(lane.arriveTime)
            const leaveMin = timeToMinutes(lane.leaveTime)

            if (clockInMin !== null && cursorMin >= clockInMin && arriveMin !== null && cursorMin < arriveMin) {
                if (!plantCounts[lane.fromPlant]) plantCounts[lane.fromPlant] = { idle: 0, onSite: 0, traveling: 0 }
                plantCounts[lane.fromPlant].traveling += 1
            } else if (arriveMin !== null && cursorMin >= arriveMin) {
                if (leaveMin !== null && cursorMin > leaveMin) {
                    if (!plantCounts[lane.toPlant]) plantCounts[lane.toPlant] = { idle: 0, onSite: 0, traveling: 0 }
                    plantCounts[lane.toPlant].idle += 1
                } else {
                    if (!plantCounts[lane.toPlant]) plantCounts[lane.toPlant] = { idle: 0, onSite: 0, traveling: 0 }
                    plantCounts[lane.toPlant].onSite += 1
                }
            } else if (clockInMin !== null && cursorMin < clockInMin) {
                if (!plantCounts[lane.fromPlant]) plantCounts[lane.fromPlant] = { idle: 0, onSite: 0, traveling: 0 }
                plantCounts[lane.fromPlant].idle += 1
            }
        })

        return Object.entries(plantCounts)
            .map(([code, counts]) => ({ code, ...counts, base: mixerCountsByPlant[code] || 0 }))
            .sort((a, b) => a.code.localeCompare(b.code))
    }, [cursorTime, cursorDayIdx, dayLanes, mixerCountsByPlant])

    // Scroll to current day on mount
    React.useEffect(() => {
        const el = dayRefs.current[3] // index 3 = offset 0 = current day
        if (el) el.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' })
    }, [])

    // Mouse handlers
    const handleMouseDown = (e, dayIdx) => {
        setIsDragging(true)
        setCursorDayIdx(dayIdx)
        updateCursorFromEvent(e, dayIdx)
    }

    const updateCursorFromEvent = (e, dayIdx) => {
        const ref = dayRefs.current[dayIdx]
        if (!ref) return
        const rect = ref.getBoundingClientRect()
        const x = e.clientX - rect.left
        const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
        setCursorPct(pct)
    }

    React.useEffect(() => {
        if (!isDragging) return
        const onMove = (e) => {
            if (cursorDayIdx !== null) updateCursorFromEvent(e, cursorDayIdx)
        }
        const onUp = () => setIsDragging(false)
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
    }, [isDragging, cursorDayIdx])

    const hourLabels = Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => {
        const h = TIMELINE_START_HOUR + i
        return h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`
    })

    const formatDayLabel = (dateStr) =>
        new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        })

    const ROW_HEIGHT = 36

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
            {/* Snapshot bar */}
            {cursorTime && plantSnapshot.length > 0 && (
                <div
                    className="shrink-0 flex items-center gap-3 border-b px-4 py-2 flex-wrap"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
                >
                    <div className="flex items-center gap-1.5">
                        <i className="fas fa-crosshairs text-[10px]" style={{ color: '#ef4444' }} />
                        <span className="text-xs font-bold font-mono" style={{ color: '#ef4444' }}>
                            {cursorTime} &middot; {cursorDayIdx !== null && formatDayLabel(days[cursorDayIdx]?.date)}
                        </span>
                    </div>
                    <div className="w-px h-5" style={{ background: 'var(--border-medium)' }} />
                    {plantSnapshot.map((p) => (
                        <div
                            key={p.code}
                            className="flex items-center gap-1.5 rounded-md px-2 py-1"
                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
                        >
                            <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
                                {p.code}
                            </span>
                            {p.onSite > 0 && (
                                <span className="text-[10px] font-semibold text-[#16a34a]">{p.onSite} on site</span>
                            )}
                            {p.traveling > 0 && (
                                <span className="text-[10px] font-semibold" style={{ color: accentColor }}>
                                    {p.traveling} transit
                                </span>
                            )}
                            {p.idle > 0 && (
                                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                                    {p.idle} idle
                                </span>
                            )}
                            {p.base > 0 && (
                                <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                                    / {p.base} mixers
                                </span>
                            )}
                        </div>
                    ))}
                    <button
                        onClick={() => {
                            setCursorPct(null)
                            setCursorDayIdx(null)
                        }}
                        className="ml-auto border-none bg-transparent cursor-pointer p-1 text-[10px]"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <i className="fas fa-times" />
                    </button>
                </div>
            )}

            {/* Main scrollable area */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto">
                <div className="flex" style={{ minWidth: LABEL_WIDTH + DAY_WIDTH * days.length }}>
                    {/* Sticky left labels column */}
                    <div
                        className="shrink-0 sticky left-0 z-20"
                        style={{ width: LABEL_WIDTH, background: 'var(--bg-primary)' }}
                    >
                        {/* Corner cell — sticky top + left */}
                        <div
                            className="sticky top-0 z-30 flex items-center px-3 text-[10px] font-bold uppercase tracking-wider border-b border-r"
                            style={{
                                height: 32,
                                color: 'var(--text-secondary)',
                                borderColor: 'var(--border-light)',
                                background: 'var(--bg-tertiary)'
                            }}
                        >
                            Plant
                        </div>

                        {/* Plant rows */}
                        {plantRows.map((pr) => (
                            <React.Fragment key={pr.plant}>
                                <div
                                    className="flex flex-col justify-center px-3 border-b border-r"
                                    style={{
                                        height: ROW_HEIGHT * pr.laneCount,
                                        borderColor: 'var(--border-light)',
                                        background: 'var(--bg-primary)'
                                    }}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <i className="fas fa-industry text-[9px]" style={{ color: accentColor }} />
                                        <span
                                            className="text-[11px] font-bold uppercase tracking-wide"
                                            style={{ color: accentColor }}
                                        >
                                            {pr.plant}
                                        </span>
                                        {mixerCountsByPlant[pr.plant] > 0 && (
                                            <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                                                {mixerCountsByPlant[pr.plant]}m
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {pr.sentCount > 0 && (
                                            <span
                                                className="flex items-center gap-0.5 text-[9px] font-medium"
                                                style={{ color: SENT_COLOR }}
                                            >
                                                <i className="fas fa-arrow-up text-[7px]" />
                                                {pr.sentCount} out
                                            </span>
                                        )}
                                        {pr.recvCount > 0 && (
                                            <span
                                                className="flex items-center gap-0.5 text-[9px] font-medium"
                                                style={{ color: RECV_COLOR }}
                                            >
                                                <i className="fas fa-arrow-down text-[7px]" />
                                                {pr.recvCount} in
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Day columns — horizontally scrollable */}
                    {dayLanes.map((day, dayIdx) => {
                        const isCurrent = day.isCurrent
                        return (
                            <div
                                key={day.date}
                                className="shrink-0 border-r relative"
                                ref={(el) => {
                                    dayRefs.current[dayIdx] = el
                                }}
                                style={{
                                    width: DAY_WIDTH,
                                    borderColor: isCurrent ? accentColor : 'var(--border-light)',
                                    borderRightWidth: isCurrent ? 2 : 1,
                                    borderLeftWidth: isCurrent ? 2 : 0,
                                    borderLeftStyle: isCurrent ? 'solid' : 'none',
                                    borderLeftColor: isCurrent ? accentColor : undefined
                                }}
                            >
                                {/* Day header with hours — sticky at top */}
                                <div
                                    className="sticky top-0 z-20 border-b"
                                    style={{
                                        height: 32,
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-light)'
                                    }}
                                >
                                    <div className="flex items-center h-full relative">
                                        <span
                                            className="absolute left-2 text-[10px] font-bold z-10 rounded px-1"
                                            style={{
                                                color: isCurrent ? accentColor : 'var(--text-secondary)',
                                                background: isCurrent ? `${accentColor}15` : 'var(--bg-tertiary)'
                                            }}
                                        >
                                            {formatDayLabel(day.date)}
                                            {day.lanes.length > 0 && (
                                                <span className="ml-1 font-normal opacity-70">
                                                    ({day.lanes.length})
                                                </span>
                                            )}
                                        </span>
                                        {hourLabels.map((label, i) => (
                                            <div
                                                key={i}
                                                className="absolute top-0 bottom-0 flex items-end pb-0.5"
                                                style={{ left: `${(i / TIMELINE_HOURS) * 100}%` }}
                                            >
                                                <div
                                                    className="absolute top-0 bottom-0 w-px"
                                                    style={{ background: 'var(--border-light)' }}
                                                />
                                                <span
                                                    className="text-[9px] pl-0.5"
                                                    style={{ color: 'var(--text-secondary)', opacity: 0.7 }}
                                                >
                                                    {label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Lanes for each plant row */}
                                {plantRows.map((pr) => {
                                    // Per-lane violation lookup helpers
                                    const getLaneViolationFromPrev = (li) =>
                                        restViolations[`${dayIdx}:${pr.plant}:${li}`] || null
                                    const getLaneViolationToNext = (li) =>
                                        restViolations[`${dayIdx}:${pr.plant}:${li}:end`] || null
                                    const sentLanes = day.lanes
                                        .filter((l) => l.fromPlant === pr.plant)
                                        .sort((a, b) =>
                                            (a.clockIn || a.arriveTime).localeCompare(b.clockIn || b.arriveTime)
                                        )
                                    const recvLanes = day.lanes
                                        .filter((l) => l.toPlant === pr.plant)
                                        .sort((a, b) =>
                                            (a.clockIn || a.arriveTime).localeCompare(b.clockIn || b.arriveTime)
                                        )
                                    const allLanes = [...sentLanes, ...recvLanes]
                                    const base = mixerCountsByPlant[pr.plant] || 0
                                    const homeCount = Math.max(0, base - sentLanes.length)

                                    const renderBlock = (lane, laneIdx, isSent) => {
                                        const blockColor = isSent ? SENT_COLOR : RECV_COLOR
                                        const clockInPct = timeToPercent(lane.clockIn)
                                        const preTripEndPct = timeToPercent(lane.preTripEnd)
                                        const arrivePct = timeToPercent(lane.arriveTime)
                                        const leavePct = timeToPercent(lane.leaveTime)
                                        const top = laneIdx * ROW_HEIGHT + 4
                                        const blockH = ROW_HEIGHT - 8
                                        const routeLabel = isSent
                                            ? `\u2192 ${lane.toPlant}`
                                            : `\u2190 ${lane.fromPlant}`

                                        // Pre-trip: clockIn -> preTripEnd (always 15 min)
                                        const preW =
                                            clockInPct != null && preTripEndPct != null
                                                ? Math.max(preTripEndPct - clockInPct, 0)
                                                : 0
                                        // Travel: preTripEnd -> arrive
                                        const travelW =
                                            lane.hasTravelTime && preTripEndPct != null && arrivePct != null
                                                ? Math.max(arrivePct - preTripEndPct, 0)
                                                : 0
                                        // On-site: arrive -> leave (or short cap)
                                        const siteStart = arrivePct ?? preTripEndPct ?? clockInPct
                                        const siteEnd =
                                            leavePct ?? (siteStart != null ? Math.min(siteStart + 2, 100) : null)
                                        const siteW =
                                            siteStart != null && siteEnd != null
                                                ? Math.max(siteEnd - siteStart, 0.8)
                                                : 0

                                        return (
                                            <React.Fragment key={`${isSent ? 's' : 'r'}-${laneIdx}`}>
                                                {/* Pre-trip block */}
                                                {preW > 0 && (
                                                    <div
                                                        className="absolute rounded-l flex items-center justify-center overflow-visible"
                                                        style={{
                                                            left: `${clockInPct}%`,
                                                            width: `${preW}%`,
                                                            minWidth: 6,
                                                            top,
                                                            height: blockH,
                                                            background: `${blockColor}30`,
                                                            borderLeft: `2px solid ${blockColor}`,
                                                            borderTop: `1px dotted ${blockColor}60`,
                                                            borderBottom: `1px dotted ${blockColor}60`
                                                        }}
                                                    >
                                                        <span
                                                            className="text-[8px] font-semibold whitespace-nowrap px-0.5"
                                                            style={{ color: blockColor }}
                                                        >
                                                            PT
                                                        </span>
                                                    </div>
                                                )}
                                                {/* Travel block */}
                                                {travelW > 0 && (
                                                    <div
                                                        className="absolute flex items-center justify-center overflow-visible"
                                                        style={{
                                                            left: `${preTripEndPct}%`,
                                                            width: `${travelW}%`,
                                                            minWidth: 6,
                                                            top,
                                                            height: blockH,
                                                            background: `${blockColor}45`,
                                                            borderTop: `1px dashed ${blockColor}70`,
                                                            borderBottom: `1px dashed ${blockColor}70`
                                                        }}
                                                    >
                                                        <span
                                                            className="text-[9px] font-semibold whitespace-nowrap px-1"
                                                            style={{ color: blockColor }}
                                                        >
                                                            <i className="fas fa-truck text-[7px] mr-0.5" />
                                                            {lane.travel}m
                                                        </span>
                                                    </div>
                                                )}
                                                {/* On-site / arrival block */}
                                                {siteW > 0 && siteStart != null && (
                                                    <div
                                                        className="absolute rounded-r flex items-center overflow-hidden"
                                                        style={{
                                                            left: `${siteStart}%`,
                                                            width: `${siteW}%`,
                                                            top,
                                                            height: blockH,
                                                            background: blockColor
                                                        }}
                                                    >
                                                        <span className="text-[9px] font-bold text-white truncate px-1.5 whitespace-nowrap">
                                                            {routeLabel} {lane.arriveTime}
                                                            {lane.leaveTime ? `\u2013${lane.leaveTime}` : ''}
                                                            {lane.loadFromPlant ? ' LD' : ''}
                                                        </span>
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        )
                                    }

                                    return (
                                        <div
                                            key={pr.plant}
                                            className="relative border-b cursor-crosshair select-none"
                                            style={{
                                                height: ROW_HEIGHT * pr.laneCount,
                                                borderColor: 'var(--border-light)',
                                                background: isCurrent ? `${accentColor}05` : 'transparent'
                                            }}
                                            onMouseDown={(e) => handleMouseDown(e, dayIdx)}
                                        >
                                            {/* Sent/Recv separator line */}
                                            {sentLanes.length > 0 && recvLanes.length > 0 && (
                                                <div
                                                    className="absolute left-0 right-0 h-px"
                                                    style={{
                                                        top: sentLanes.length * ROW_HEIGHT,
                                                        background: 'var(--border-light)'
                                                    }}
                                                />
                                            )}
                                            {/* Hour grid lines */}
                                            {hourLabels.map((_, j) => (
                                                <div
                                                    key={j}
                                                    className="absolute top-0 bottom-0 w-px"
                                                    style={{
                                                        left: `${(j / TIMELINE_HOURS) * 100}%`,
                                                        background: 'var(--border-light)',
                                                        opacity: 0.3
                                                    }}
                                                />
                                            ))}
                                            {/* Home operators + production bar */}
                                            {(() => {
                                                if (homeCount <= 0) return null
                                                const prod = day.production?.[pr.plant]
                                                const startPct = timeToPercent(prod?.firstJobTime)
                                                const endPct = timeToPercent(prod?.lastJobTime)
                                                const hasProd = startPct != null && endPct != null && endPct > startPct
                                                const homeTop = (sentLanes.length + recvLanes.length) * ROW_HEIGHT + 4
                                                const blockH = ROW_HEIGHT - 8
                                                return (
                                                    <>
                                                        {/* Production time range background */}
                                                        {hasProd && (
                                                            <div
                                                                className="absolute pointer-events-none"
                                                                style={{
                                                                    left: `${startPct}%`,
                                                                    width: `${endPct - startPct}%`,
                                                                    top: 0,
                                                                    bottom: 0,
                                                                    background: `${HOME_COLOR}06`,
                                                                    borderLeft: `1px dashed ${HOME_COLOR}30`,
                                                                    borderRight: `1px dashed ${HOME_COLOR}30`
                                                                }}
                                                            />
                                                        )}
                                                        {/* Consolidated home bar */}
                                                        <div
                                                            className="absolute rounded flex items-center overflow-hidden pointer-events-none"
                                                            style={{
                                                                left: hasProd ? `${startPct}%` : '2%',
                                                                width: hasProd ? `${endPct - startPct}%` : '96%',
                                                                top: homeTop,
                                                                height: blockH,
                                                                background: `${HOME_COLOR}18`,
                                                                border: `1px solid ${HOME_COLOR}40`
                                                            }}
                                                        >
                                                            <span
                                                                className="text-[9px] font-bold truncate px-2 whitespace-nowrap"
                                                                style={{ color: HOME_COLOR }}
                                                            >
                                                                <i className="fas fa-home text-[7px] mr-1" />
                                                                {homeCount} assigned to plant
                                                                {hasProd &&
                                                                    (() => {
                                                                        const firstMins = timeToMinutes(
                                                                            prod.firstJobTime
                                                                        )
                                                                        const lastMins = timeToMinutes(prod.lastJobTime)
                                                                        const hrs =
                                                                            firstMins !== null &&
                                                                            lastMins !== null &&
                                                                            lastMins > firstMins
                                                                                ? (lastMins - firstMins) / 60
                                                                                : null
                                                                        const yds = parseFloat(prod.totalYardage) || 0
                                                                        const ydsPerHrOp =
                                                                            hrs && yds && homeCount > 0
                                                                                ? Math.round(
                                                                                      (yds / (hrs * homeCount)) * 10
                                                                                  ) / 10
                                                                                : null
                                                                        return (
                                                                            <span className="font-medium ml-1.5">
                                                                                {prod.firstJobTime}–{prod.lastJobTime}
                                                                                {yds
                                                                                    ? ` · ${prod.totalYardage} yds`
                                                                                    : ''}
                                                                                {ydsPerHrOp !== null &&
                                                                                    ` · ${ydsPerHrOp} yds/hr/op`}
                                                                            </span>
                                                                        )
                                                                    })()}
                                                            </span>
                                                        </div>
                                                    </>
                                                )
                                            })()}
                                            {/* Rest violations: only on sent lanes (plant's own drivers) */}
                                            {Array.from({ length: sentLanes.length }, (_, li) => {
                                                const vFrom = getLaneViolationFromPrev(li)
                                                const vTo = getLaneViolationToNext(li)
                                                return (
                                                    <React.Fragment key={`v-${li}`}>
                                                        {vFrom && (
                                                            <div
                                                                className="absolute pointer-events-none rounded-r flex items-center overflow-hidden"
                                                                style={{
                                                                    left: 0,
                                                                    width: `calc(${timeToPercent(vFrom.nextStartTime)}% - 5px)`,
                                                                    top: li * ROW_HEIGHT + 4,
                                                                    height: ROW_HEIGHT - 8,
                                                                    background: 'rgba(239, 68, 68, 0.12)',
                                                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                                                    borderLeft: 'none'
                                                                }}
                                                                title={`Only a ${vFrom.gapHours}h reset, not a ${MIN_REST_HOURS}h reset`}
                                                            >
                                                                <span
                                                                    className="text-[8px] font-bold whitespace-nowrap pl-1"
                                                                    style={{ color: '#ef4444' }}
                                                                >
                                                                    Only a {vFrom.gapHours}h reset, not a{' '}
                                                                    {MIN_REST_HOURS}h reset
                                                                </span>
                                                            </div>
                                                        )}
                                                        {vTo && (
                                                            <div
                                                                className="absolute pointer-events-none rounded-l flex items-center overflow-hidden"
                                                                style={{
                                                                    left: `calc(${timeToPercent(vTo.prevLeaveTime)}% + 5px)`,
                                                                    right: 0,
                                                                    top: li * ROW_HEIGHT + 4,
                                                                    height: ROW_HEIGHT - 8,
                                                                    background: 'rgba(239, 68, 68, 0.12)',
                                                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                                                    borderRight: 'none'
                                                                }}
                                                                title={`Only a ${vTo.gapHours}h reset, not a ${MIN_REST_HOURS}h reset`}
                                                            >
                                                                <span
                                                                    className="text-[8px] font-bold whitespace-nowrap pr-1 ml-auto"
                                                                    style={{ color: '#ef4444' }}
                                                                >
                                                                    Only a {vTo.gapHours}h reset, not a {MIN_REST_HOURS}
                                                                    h reset
                                                                </span>
                                                            </div>
                                                        )}
                                                    </React.Fragment>
                                                )
                                            })}
                                            {/* Sent lanes — operators leaving */}
                                            {sentLanes.map((lane, i) => renderBlock(lane, i, true))}
                                            {/* Received lanes — operators arriving */}
                                            {recvLanes.map((lane, i) => renderBlock(lane, sentLanes.length + i, false))}
                                            {/* Empty state */}
                                            {allLanes.length === 0 && homeCount === 0 && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span
                                                        className="text-[10px] opacity-30"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        &mdash;
                                                    </span>
                                                </div>
                                            )}
                                            {/* Cursor line */}
                                            {cursorDayIdx === dayIdx && cursorPct !== null && (
                                                <div
                                                    className="absolute top-0 bottom-0 z-10 pointer-events-none"
                                                    style={{ left: `${cursorPct}%` }}
                                                >
                                                    <div
                                                        className="absolute inset-y-0 -left-px w-0.5"
                                                        style={{ background: '#dc2626' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function PlanSkeleton({ isMobile }) {
    return (
        <div
            className={`flex-1 min-h-0 overflow-hidden ${isMobile ? 'flex flex-col' : 'grid'}`}
            style={isMobile ? {} : { gridTemplateColumns: '1fr 340px' }}
        >
            {/* Left — mixer bar + table rows */}
            <div className="flex flex-col overflow-hidden">
                {/* Mixer bar */}
                <div
                    className="flex gap-1.5 items-center border-b px-4 py-2"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
                >
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="rounded-md px-2 py-1" style={{ background: 'var(--bg-tertiary)' }}>
                            <div
                                className="h-3.5 w-12 rounded animate-pulse"
                                style={{ background: 'var(--border-light)' }}
                            />
                        </div>
                    ))}
                </div>
                {/* Table skeleton */}
                <div className="flex-1 overflow-hidden">
                    <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-tertiary)' }}>
                                {[36, 62, 20, 62, 48, 68, 68, 56, 62, 68, 34, 60, 28].map((w, i) => (
                                    <th key={i} className="py-2.5 px-1" style={{ width: w }}>
                                        <div
                                            className="h-2.5 rounded animate-pulse mx-auto"
                                            style={{ background: 'var(--border-light)', width: '70%' }}
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3].map((row) => (
                                <tr key={row} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td className="text-center py-2.5 px-1">
                                        <div
                                            className="h-5 w-5 rounded-md animate-pulse mx-auto"
                                            style={{ background: 'var(--border-light)' }}
                                        />
                                    </td>
                                    <td className="py-2.5 px-1">
                                        <div
                                            className="h-6 rounded-md animate-pulse"
                                            style={{ background: 'var(--bg-tertiary)' }}
                                        />
                                    </td>
                                    <td className="text-center py-2.5 px-0">
                                        <div
                                            className="h-2 w-2 rounded-full animate-pulse mx-auto"
                                            style={{ background: 'var(--border-light)' }}
                                        />
                                    </td>
                                    <td className="py-2.5 px-1">
                                        <div
                                            className="h-6 rounded-md animate-pulse"
                                            style={{ background: 'var(--bg-tertiary)' }}
                                        />
                                    </td>
                                    <td className="py-2.5 px-1">
                                        <div
                                            className="h-6 w-8 rounded-md animate-pulse mx-auto"
                                            style={{ background: 'var(--bg-tertiary)' }}
                                        />
                                    </td>
                                    {[1, 2, 3, 4, 5].map((c) => (
                                        <td key={c} className="py-2.5 px-1">
                                            <div
                                                className="h-5 rounded-md animate-pulse mx-auto"
                                                style={{ background: 'var(--bg-tertiary)', width: '80%' }}
                                            />
                                        </td>
                                    ))}
                                    <td className="py-2.5 px-0" />
                                    <td className="py-2.5 px-0" />
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Right sidebar */}
            <div
                className={`${isMobile ? '' : 'border-l'} overflow-hidden`}
                style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
            >
                {/* Timeline skeleton */}
                <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border-light)' }}>
                    <div
                        className="h-3 w-28 rounded animate-pulse mb-3"
                        style={{ background: 'var(--border-light)' }}
                    />
                    <div className="flex flex-col gap-3 pl-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div
                                    className="w-2.5 h-2.5 rounded-full animate-pulse"
                                    style={{ background: 'var(--border-light)' }}
                                />
                                <div
                                    className="h-3 rounded animate-pulse"
                                    style={{ width: `${50 + i * 20}px`, background: 'var(--bg-tertiary)' }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                {/* Plant health skeleton */}
                <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border-light)' }}>
                    <div
                        className="h-3 w-36 rounded animate-pulse mb-3"
                        style={{ background: 'var(--border-light)' }}
                    />
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 mb-2">
                            <div
                                className="h-3 w-8 rounded animate-pulse"
                                style={{ background: 'var(--border-light)' }}
                            />
                            <div
                                className="flex-1 h-[5px] rounded-full animate-pulse"
                                style={{ background: 'var(--bg-tertiary)' }}
                            />
                            <div
                                className="h-3 w-5 rounded animate-pulse"
                                style={{ background: 'var(--border-light)' }}
                            />
                        </div>
                    ))}
                </div>
                {/* Stats skeleton */}
                <div
                    className="flex border-b"
                    style={{ borderColor: 'var(--border-light)', background: 'var(--bg-secondary)' }}
                >
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex-1 py-3 flex flex-col items-center gap-1.5">
                            <div
                                className="h-5 w-8 rounded animate-pulse"
                                style={{ background: 'var(--border-light)' }}
                            />
                            <div
                                className="h-2 w-12 rounded animate-pulse"
                                style={{ background: 'var(--bg-tertiary)' }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

/**
 * Interactive daily dispatch planning tool. Users build driver assignments
 * between plants with configurable stagger times, auto-calculated leave
 * times (accounting for pre-trip and travel), and per-driver custom time
 * overrides. Generates a copyable text summary for dispatch and auto-saves
 * drafts to the server.
 */
function PlanView() {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const isDark = preferences.themeMode === 'dark'
    const [plants, setPlants] = useState([])
    const [mixerCountsByPlant, setMixerCountsByPlant] = useState({})
    const [assignments, setAssignments] = useState([])
    const [copied, setCopied] = useState(false)
    const [notes, setNotes] = useState('')
    const [planDate, setPlanDate] = useState(getTomorrowDate)
    const [travelTimes, setTravelTimes] = useState({})
    const [userId, setUserId] = useState(null) // only used for personal templates
    const [canEdit, setCanEdit] = useState(true)
    const [isLoading, setIsLoading] = useState(true)
    const [showSettings, setShowSettings] = useState(false)
    const [newTravelTime, setNewTravelTime] = useState({ from: '', minutes: '', to: '' })
    const [activeRowId, setActiveRowId] = useState(null)
    const [templates, setTemplates] = useState([])
    const [showTemplateModal, setShowTemplateModal] = useState(false)
    const [templateName, setTemplateName] = useState('')
    const [viewMode, setViewMode] = useState('table') // 'table' | 'timeline'
    const [adjacentPlans, setAdjacentPlans] = useState({}) // { [dateStr]: assignments[] }
    const [adjacentProduction, setAdjacentProduction] = useState({}) // { [dateStr]: plantProduction }
    const [showImportModal, setShowImportModal] = useState(false)
    const [plantProduction, setPlantProduction] = useState({}) // { [plantCode]: { firstJobTime, lastJobTime, totalYardage } }
    const dirtyRef = useRef(false)
    const [importText, setImportText] = useState('')
    const isMobile = useIsMobile()

    const getTravelTime = (from, to) => travelTimes[`${from}->${to}`] ?? null

    const calcClockIn = (arrivalTime, fromPlant, toPlant) => {
        if (!arrivalTime || !fromPlant || !toPlant) return null
        const travelTime = getTravelTime(fromPlant, toPlant)
        if (travelTime === null) return null
        const [hours, minutes] = parseTime(arrivalTime)
        const date = new Date()
        date.setHours(hours, minutes, 0, 0)
        date.setMinutes(date.getMinutes() - travelTime - BUFFER_MINUTES - PRE_TRIP_MINUTES)
        return formatTime(date.getHours(), date.getMinutes())
    }

    const refreshTravelTimes = async () => {
        await PlanService.fetchTravelTimes()
        setTravelTimes(PlanService.getTravelTimesMap())
    }

    useEffect(() => {
        const loadInitialData = async () => {
            const user = await UserService.getCurrentUser()
            const uid = user?.id || user
            if (uid) {
                setUserId(uid)
                try {
                    const hasEdit = await UserService.hasPermission(uid, 'plan.edit')
                    setCanEdit(hasEdit)
                } catch {
                    // Permission not configured yet — allow editing by default
                    setCanEdit(true)
                }
            }
            let plantList = uid ? await ReportService.fetchPlantsForUser(uid) : []
            if (!plantList.length) plantList = await ReportService.fetchPlantsSorted()
            const sorted = plantList
                .filter((p) => p.plant_code)
                .sort((a, b) => String(a.plant_code).localeCompare(String(b.plant_code)))
            setPlants(sorted)
            if (sorted.length) {
                const counts = await ReportService.fetchActiveMixerCountsByPlant(
                    sorted.map((p) => p.plant_code).filter(Boolean)
                )
                setMixerCountsByPlant(counts)
            }
            await refreshTravelTimes()
            setIsLoading(false)
        }
        loadInitialData()
    }, [])

    const loadedForDateRef = useRef(null)
    const autosaveEnabledRef = useRef(false)
    useEffect(() => {
        if (!planDate || isLoading) return
        loadedForDateRef.current = null
        autosaveEnabledRef.current = false
        const loadPlan = async () => {
            try {
                const plan = await PlanService.fetchPlan(planDate)
                if (plan?.assignments?.length) {
                    setAssignments(ensureUniqueIds(plan.assignments))
                } else {
                    setAssignments([createEmptyAssignment()])
                }
                setNotes(plan?.notes || '')
                setPlantProduction(plan?.plant_production || {})
            } catch {
                setAssignments([createEmptyAssignment()])
                setNotes('')
                setPlantProduction({})
            }
            loadedForDateRef.current = planDate
            // Enable autosave on NEXT user-initiated change, not from this load
            requestAnimationFrame(() => {
                autosaveEnabledRef.current = true
            })
        }
        loadPlan()
    }, [planDate, isLoading])

    // Fetch adjacent days' plans for the timeline view (3 days before, 3 days after)
    const adjacentFetchRef = useRef(0)
    useEffect(() => {
        if (!planDate || isLoading) return
        const fetchId = ++adjacentFetchRef.current
        const loadAdjacentPlans = async () => {
            const offsets = [-3, -2, -1, 1, 2, 3]
            const dates = offsets.map((o) => getOffsetDate(planDate, o))
            const results = await Promise.allSettled(dates.map((d) => PlanService.fetchPlan(d)))
            // Only apply if this is still the latest fetch
            if (adjacentFetchRef.current !== fetchId) return
            const plans = {}
            const production = {}
            dates.forEach((d, i) => {
                const result = results[i]
                if (result.status === 'fulfilled' && result.value) {
                    if (result.value.assignments?.length) plans[d] = result.value.assignments
                    if (result.value.plant_production) production[d] = result.value.plant_production
                }
            })
            setAdjacentPlans(plans)
            setAdjacentProduction(production)
        }
        loadAdjacentPlans()
    }, [planDate, isLoading])

    useEffect(() => {
        if (!canEdit || !planDate || isLoading) return
        // Only autosave if assignments belong to this date and initial load is done
        if (loadedForDateRef.current !== planDate || !autosaveEnabledRef.current) return
        dirtyRef.current = true
        const timeout = setTimeout(async () => {
            try {
                await PlanService.savePlan(planDate, assignments, notes, plantProduction)
                dirtyRef.current = false
            } catch {}
        }, AUTOSAVE_DELAY_MS)
        return () => clearTimeout(timeout)
    }, [canEdit, planDate, assignments, notes, plantProduction, isLoading])

    // Realtime: sync plan changes from other users
    const planDateRef = useRef(planDate)
    planDateRef.current = planDate
    const assignmentsRef = useRef(assignments)
    assignmentsRef.current = assignments
    const notesRef = useRef(notes)
    notesRef.current = notes
    const plantProductionRef = useRef(plantProduction)
    plantProductionRef.current = plantProduction

    useRealtimeSubscription({
        table: 'plans',
        enabled: !isLoading,
        onChange: useCallback((payload) => {
            // Don't overwrite local unsaved edits
            if (dirtyRef.current) return
            const record = payload.new
            if (!record || record.plan_date !== planDateRef.current) return
            const incoming = JSON.stringify(record.assignments ?? [])
            const local = JSON.stringify(assignmentsRef.current)
            if (incoming !== local) {
                setAssignments(
                    record.assignments?.length ? ensureUniqueIds(record.assignments) : [createEmptyAssignment()]
                )
            }
            if ((record.notes || '') !== notesRef.current) {
                setNotes(record.notes || '')
            }
            if (record.plant_production && Object.keys(record.plant_production).length > 0) {
                const incomingProd = JSON.stringify(record.plant_production)
                const localProd = JSON.stringify(plantProductionRef.current)
                if (incomingProd !== localProd) {
                    setPlantProduction(record.plant_production)
                }
            }
        }, [])
    })

    // Realtime: refresh mixer counts when mixers change
    const plantCodesRef = useRef([])
    plantCodesRef.current = plants.map((p) => p.plant_code).filter(Boolean)

    useRealtimeSubscription({
        table: 'mixers',
        enabled: !isLoading && plants.length > 0,
        onChange: useCallback(async () => {
            if (!plantCodesRef.current.length) return
            const counts = await ReportService.fetchActiveMixerCountsByPlant(plantCodesRef.current)
            setMixerCountsByPlant(counts)
        }, [])
    })

    // Realtime: refresh travel times when they change
    useRealtimeSubscription({
        table: 'plant_travel_times',
        enabled: !isLoading,
        onChange: useCallback(async () => {
            await PlanService.fetchTravelTimes()
            setTravelTimes(PlanService.getTravelTimesMap())
        }, [])
    })

    const DEFAULT_SHIFT_HOURS = 14

    const buildCustomTimes = (baseTime, leaveTime, count, stagger) =>
        Array.from({ length: count }, (_, i) => ({
            leaveTime: leaveTime || '',
            time: baseTime ? addMinutesToTime(baseTime, i * (stagger || DEFAULT_STAGGER_MINUTES)) || '' : ''
        }))

    const updatePlantProduction = (plantCode, field, value) => {
        setPlantProduction((prev) => ({
            ...prev,
            [plantCode]: { ...prev[plantCode], [field]: value }
        }))
    }

    const importDailyOrderHtml = (file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const parser = new DOMParser()
            const doc = parser.parseFromString(e.target.result, 'text/html')
            const allDivs = [...doc.querySelectorAll('div')]

            // Find plant header divs (class s43 containing "NNN - NAME")
            const plantHeaders = allDivs.filter(
                (d) => d.classList.contains('s43') && /^\d{3}\s*-\s*.+/.test(d.textContent.trim())
            )

            const production = {}
            plantHeaders.forEach((header, idx) => {
                const text = header.textContent.trim()
                const code = text.match(/^(\d{3})/)?.[1]
                if (!code) return

                // Find the page container (frpage div) that holds this header
                // Collect all elements between this plant header and the next (or end)
                const headerIndex = allDivs.indexOf(header)
                const nextHeaderIndex =
                    idx < plantHeaders.length - 1 ? allDivs.indexOf(plantHeaders[idx + 1]) : allDivs.length

                // Extract start times (s48 at left:307.2px) between this header and next
                const startTimes = []
                for (let i = headerIndex + 1; i < nextHeaderIndex; i++) {
                    const d = allDivs[i]
                    const style = d.getAttribute('style') || ''
                    if (d.classList.contains('s48') && style.includes('left:307.2px')) {
                        const time = d.textContent.trim()
                        if (/^\d{2}:\d{2}$/.test(time)) startTimes.push(time)
                    }
                }

                // Extract plant total yardage (s63 div just before "Plant Total:" text)
                let totalYardage = ''
                for (let i = headerIndex + 1; i < nextHeaderIndex; i++) {
                    const d = allDivs[i]
                    if (d.classList.contains('s34') && d.textContent.trim() === 'Plant Total:') {
                        // Look backwards for the s63 yardage value
                        for (let j = i - 1; j > headerIndex; j--) {
                            if (allDivs[j].classList.contains('s63')) {
                                totalYardage = allDivs[j].textContent.trim().replace(/,/g, '')
                                break
                            }
                        }
                        break
                    }
                }

                const sorted = startTimes.sort()
                production[code] = {
                    firstJobTime: sorted[0] || '',
                    lastJobTime: sorted[sorted.length - 1] || '',
                    totalYardage
                }
            })

            setPlantProduction(production)
        }
        reader.readAsText(file)
    }

    const updateAssignment = (id, field, value) => {
        setAssignments((prev) =>
            prev.map((a) => {
                if (a.id !== id) return a
                const updated = { ...a, [field]: value }
                // Auto-fill leaveTime when arrive time is entered and leaveTime is empty
                if (field === 'time' && value?.length === 5 && !a.leaveTime) {
                    updated.leaveTime = addMinutesToTime(value, DEFAULT_SHIFT_HOURS * 60) || ''
                }
                // Pre-fill custom times when switching to custom mode
                if (field === 'timeMode' && value === 'custom') {
                    updated.customTimes = buildCustomTimes(
                        a.time,
                        a.leaveTime,
                        parseInt(a.driverCount) || 1,
                        a.staggerMinutes
                    )
                }
                // Rebuild custom times when driver count changes in custom mode
                if (field === 'driverCount' && a.timeMode === 'custom') {
                    updated.customTimes = buildCustomTimes(a.time, a.leaveTime, parseInt(value) || 1, a.staggerMinutes)
                }
                return updated
            })
        )
    }

    const updateCustomTime = (assignmentId, idx, field, value) => {
        setAssignments((prev) =>
            prev.map((a) => {
                if (a.id !== assignmentId) return a
                const customTimes = [...(a.customTimes || [])]
                while (customTimes.length <= idx) customTimes.push({ leaveTime: '', time: '' })
                customTimes[idx] = { ...customTimes[idx], [field]: value }
                return { ...a, customTimes }
            })
        )
    }

    const switchToCustom = (id) => {
        setAssignments((prev) =>
            prev.map((a) => {
                if (a.id !== id) return a
                const customTimes = buildCustomTimes(
                    a.time,
                    a.leaveTime,
                    parseInt(a.driverCount) || 1,
                    a.staggerMinutes
                )
                return { ...a, customTimes, timeMode: 'custom' }
            })
        )
    }

    const toggleRowExpanded = (id) => {
        setActiveRowId((prev) => (prev === id ? null : id))
    }

    const getStats = () => {
        const statsMap = Object.fromEntries(
            plants.map((p) => [
                p.plant_code,
                { base: mixerCountsByPlant[p.plant_code] || 0, code: p.plant_code, recv: 0, send: 0 }
            ])
        )
        assignments.forEach((a) => {
            if (!a.fromPlant || !a.toPlant || a.driverCount <= 0) return
            const count = parseInt(a.driverCount) || 0
            if (statsMap[a.fromPlant]) statsMap[a.fromPlant].send += count
            if (statsMap[a.toPlant]) statsMap[a.toPlant].recv += count
        })
        return Object.values(statsMap)
            .filter((x) => x.base > 0 || x.send > 0 || x.recv > 0)
            .map((x) => ({ ...x, eff: x.base - x.send + x.recv }))
            .sort((a, b) => a.code.localeCompare(b.code))
    }

    const buildPlanMessage = () => {
        const validAssignments = assignments.filter((a) => a.fromPlant && a.toPlant && a.driverCount > 0)
        if (!validAssignments.length) return null
        const dateStr = new Date(planDate + 'T00:00:00').toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long'
        })
        const operatorWord = (count) => (count === 1 ? 'operator' : 'operators')
        const loadNote = (a) => (a.loadFromPlant ? ' [Load from Plant]' : '')
        const header = (a) =>
            `${a.fromPlant} → ${a.toPlant} (${a.driverCount} ${operatorWord(a.driverCount)}${a.timeMode !== 'custom' && a.driverCount > 1 ? `, ${a.staggerMinutes}min stagger` : ''})${loadNote(a)}\n`
        let msg = `Plan - ${dateStr}\n`
        validAssignments.forEach((a, i) => {
            if (i > 0) msg += '\n─────────────\n'
            msg += '\n' + header(a)
            if (a.driverCount > 1 && a.timeMode === 'custom' && a.customTimes?.length) {
                a.customTimes.slice(0, a.driverCount).forEach((ct, idx) => {
                    const clockIn = ct.time ? calcClockIn(ct.time, a.fromPlant, a.toPlant) : null
                    msg += `  Op ${idx + 1}:${clockIn ? ` In ${clockIn}` : ''}${ct.time ? ` | Arrive ${ct.time}` : ''}${ct.leaveTime ? ` | Leave ${ct.leaveTime}` : ''}\n`
                })
            } else if (a.driverCount > 1) {
                for (let j = 0; j < a.driverCount; j++) {
                    const arr = a.time
                        ? addMinutesToTime(a.time, j * (a.staggerMinutes || DEFAULT_STAGGER_MINUTES))
                        : null
                    const clockIn = arr ? calcClockIn(arr, a.fromPlant, a.toPlant) : null
                    msg += `  Op ${j + 1}: In ${clockIn || '--:--'} | Arrive ${arr || '--:--'}\n`
                }
                if (a.leaveTime) msg += `  Leave by: ${a.leaveTime}\n`
            } else {
                const clockIn = a.time ? calcClockIn(a.time, a.fromPlant, a.toPlant) : null
                if (clockIn) msg += `  Clock in: ${clockIn}\n`
                if (a.time) msg += `  Arrive: ${a.time}\n`
                if (a.leaveTime) msg += `  Leave: ${a.leaveTime}\n`
            }
        })
        if (notes) msg += `\n─────────────\n\nNotes: ${notes}\n`
        return msg.trim()
    }

    const copyToClipboard = async () => {
        const msg = buildPlanMessage()
        if (!msg) return
        await navigator.clipboard.writeText(msg)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const parsePlanMessage = (text) => {
        const parsed = []
        // Normalize arrow characters: →, ->, =>, ➜, ➤, ⇒ all become →
        const normalized = text.replace(/->|=>|➜|➤|⇒/g, '→')
        // First try splitting by separator lines
        let blocks = normalized
            .split(/─+|={3,}|-{5,}/)
            .map((b) => b.trim())
            .filter(Boolean)
        // Fallback: if only 1 block but multiple routes, split by route headers
        const routePattern = /^[A-Z0-9]+\s*→\s*[A-Z0-9]+/
        const allLines = normalized.split('\n')
        const routeCount = allLines.filter((l) => routePattern.test(l.trim())).length
        if (routeCount > blocks.length) {
            blocks = []
            let current = []
            for (const line of allLines) {
                if (routePattern.test(line.trim()) && current.length > 0) {
                    blocks.push(current.join('\n'))
                    current = []
                }
                current.push(line)
            }
            if (current.length) blocks.push(current.join('\n'))
        }

        for (const block of blocks) {
            const lines = block
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean)
            // Skip header line like "Plan - March 17" or "Notes: ..."
            const routeLineIdx = lines.findIndex((l) => /^[A-Z0-9]+\s*→\s*[A-Z0-9]+/.test(l))
            if (routeLineIdx === -1) {
                // Check for notes block
                const notesLine = lines.find((l) => /^Notes:/i.test(l))
                if (notesLine) setNotes(notesLine.replace(/^Notes:\s*/i, ''))
                continue
            }

            const routeLine = lines[routeLineIdx]
            // Parse: "ATL → SAV (2 operators, 10min stagger) [Load from Plant]"
            const routeMatch = routeLine.match(/^([A-Z0-9]+)\s*→\s*([A-Z0-9]+)/)
            if (!routeMatch) continue
            const fromPlant = routeMatch[1]
            const toPlant = routeMatch[2]

            const countMatch = routeLine.match(/\((\d+)\s*operator/)
            const driverCount = countMatch ? parseInt(countMatch[1]) : 1

            const staggerMatch = routeLine.match(/(\d+)min stagger/)
            const staggerMinutes = staggerMatch ? parseInt(staggerMatch[1]) : DEFAULT_STAGGER_MINUTES

            const loadFromPlant = /\[Load from Plant\]/i.test(routeLine)

            const detailLines = lines.slice(routeLineIdx + 1)

            // Parse operator details
            const opLines = detailLines.filter((l) => /^Op\s+\d+/i.test(l))
            const arriveMatch = detailLines.find((l) => /^Arrive/i.test(l))?.match(/(\d{2}:\d{2})/)
            const clockInMatch = detailLines.find((l) => /^Clock in/i.test(l))?.match(/(\d{2}:\d{2})/)
            const leaveMatch = detailLines.find((l) => /^Leave/i.test(l))?.match(/(\d{2}:\d{2})/)

            const assignment = {
                ...createEmptyAssignment(),
                fromPlant,
                toPlant,
                driverCount,
                staggerMinutes,
                loadFromPlant
            }

            if (opLines.length > 0 && driverCount > 1) {
                // Multi-operator: check if custom times
                const customTimes = opLines.map((ol) => {
                    const arrMatch = ol.match(/Arrive\s+(\d{2}:\d{2})/)
                    const lvMatch = ol.match(/Leave\s+(\d{2}:\d{2})/)
                    return { time: arrMatch?.[1] || '', leaveTime: lvMatch?.[1] || '' }
                })
                // Check if times match a stagger pattern
                const firstTime = customTimes[0]?.time
                const isStagger =
                    firstTime &&
                    customTimes.every((ct, i) => {
                        if (!ct.time) return true
                        const expected = addMinutesToTime(firstTime, i * staggerMinutes)
                        return ct.time === expected
                    })
                if (isStagger) {
                    assignment.time = firstTime
                    assignment.timeMode = 'stagger'
                } else {
                    assignment.timeMode = 'custom'
                    assignment.customTimes = customTimes
                    assignment.time = customTimes[0]?.time || ''
                }
                // Leave time from "Leave by:" line
                const leaveByMatch = detailLines.find((l) => /^Leave by/i.test(l))?.match(/(\d{2}:\d{2})/)
                assignment.leaveTime = leaveByMatch?.[1] || leaveMatch?.[1] || ''
            } else {
                // Single operator
                assignment.time = arriveMatch?.[1] || ''
                assignment.leaveTime = leaveMatch?.[1] || ''
            }

            parsed.push(assignment)
        }

        return parsed
    }

    const handleImport = () => {
        if (!importText.trim()) return
        const parsed = parsePlanMessage(importText)
        if (parsed.length > 0) {
            setAssignments(ensureUniqueIds(parsed))
        }
        setImportText('')
        setShowImportModal(false)
    }

    const addTravelTime = async () => {
        const { from, to, minutes } = newTravelTime
        if (!from || !to || !minutes || from === to) return
        const mins = parseInt(minutes)
        await PlanService.upsertTravelTime(from, to, mins)
        await PlanService.upsertTravelTime(to, from, mins)
        await refreshTravelTimes()
        setNewTravelTime({ from: '', minutes: '', to: '' })
    }

    const removeTravelTime = async (key) => {
        const [from, to] = key.split('->')
        await PlanService.deleteTravelTime(from, to)
        await PlanService.deleteTravelTime(to, from)
        await refreshTravelTimes()
    }

    const stats = getStats()
    const totalOps = assignments.reduce((sum, a) => sum + (parseInt(a.driverCount) || 0), 0)
    const validAssignmentCount = assignments.filter((a) => a.fromPlant && a.toPlant).length

    // Compute earliest clock-in across all assignments
    const earliestClockIn = useMemo(() => {
        let earliest = null
        assignments.forEach((a) => {
            if (!a.fromPlant || !a.toPlant || !a.time) return
            const count = parseInt(a.driverCount) || 1
            if (count > 1 && a.timeMode === 'custom' && a.customTimes?.length) {
                a.customTimes.slice(0, count).forEach((ct) => {
                    const ci = ct.time ? calcClockIn(ct.time, a.fromPlant, a.toPlant) : null
                    if (ci && (!earliest || ci < earliest)) earliest = ci
                })
            } else {
                const ci = calcClockIn(a.time, a.fromPlant, a.toPlant)
                if (ci && (!earliest || ci < earliest)) earliest = ci
            }
        })
        return earliest
    }, [assignments, travelTimes])

    // Compute latest leave/arrive time to derive shift span
    const latestTime = useMemo(() => {
        let latest = null
        assignments.forEach((a) => {
            if (!a.fromPlant || !a.toPlant) return
            const count = parseInt(a.driverCount) || 1
            // Check leave times first, then arrival times
            if (a.leaveTime && (!latest || a.leaveTime > latest)) latest = a.leaveTime
            if (count > 1 && a.timeMode === 'custom' && a.customTimes?.length) {
                a.customTimes.slice(0, count).forEach((ct) => {
                    if (ct.leaveTime && (!latest || ct.leaveTime > latest)) latest = ct.leaveTime
                    if (ct.time && (!latest || ct.time > latest)) latest = ct.time
                })
            } else if (count > 1 && a.time) {
                const lastArr = addMinutesToTime(a.time, (count - 1) * (a.staggerMinutes || DEFAULT_STAGGER_MINUTES))
                if (lastArr && (!latest || lastArr > latest)) latest = lastArr
            } else if (a.time && (!latest || a.time > latest)) {
                latest = a.time
            }
        })
        return latest
    }, [assignments])

    // Shift span in hours between earliest clock-in and latest activity
    const shiftSpanHours = useMemo(() => {
        if (!earliestClockIn || !latestTime) return null
        const [h1, m1] = parseTime(earliestClockIn)
        const [h2, m2] = parseTime(latestTime)
        const minutes = h2 * 60 + m2 - (h1 * 60 + m1)
        return minutes > 0 ? Math.round((minutes / 60) * 10) / 10 : null
    }, [earliestClockIn, latestTime])

    // Plan intelligence: warnings, suggestions, and insights
    const planInsights = useMemo(() => {
        const warnings = []
        const suggestions = []
        const validAssignments = assignments.filter((a) => a.fromPlant && a.toPlant)

        // Capacity warnings — sending more operators than a plant has mixers
        validAssignments.forEach((a) => {
            const count = parseInt(a.driverCount) || 0
            const available = mixerCountsByPlant[a.fromPlant] || 0
            if (count > available && available > 0) {
                warnings.push({
                    icon: 'fa-exclamation-triangle',
                    message: `${a.fromPlant}: sending ${count} ops but only ${available} mixer${available !== 1 ? 's' : ''} available`,
                    type: 'capacity'
                })
            }
        })

        // Missing travel time warnings
        validAssignments.forEach((a) => {
            if (getTravelTime(a.fromPlant, a.toPlant) === null) {
                warnings.push({
                    icon: 'fa-route',
                    message: `No travel time set for ${a.fromPlant} \u2192 ${a.toPlant}`,
                    type: 'travel'
                })
            }
        })

        // Duplicate route detection
        const routeMap = {}
        validAssignments.forEach((a) => {
            const key = `${a.fromPlant}->${a.toPlant}`
            routeMap[key] = (routeMap[key] || 0) + 1
        })
        Object.entries(routeMap)
            .filter(([, count]) => count > 1)
            .forEach(([route, count]) => {
                const [from, to] = route.split('->')
                suggestions.push({
                    icon: 'fa-clone',
                    message: `${from} \u2192 ${to} appears ${count} times \u2014 consider consolidating`,
                    type: 'duplicate'
                })
            })

        // Overtime projection
        if (shiftSpanHours && shiftSpanHours > OVERTIME_THRESHOLD_HOURS) {
            warnings.push({
                icon: 'fa-clock',
                message: `Shift spans ~${shiftSpanHours}h \u2014 exceeds ${OVERTIME_THRESHOLD_HOURS}h threshold`,
                type: 'overtime'
            })
        }

        // Gap detection at destination plants
        const arrivalsByDest = {}
        validAssignments.forEach((a) => {
            if (!a.time) return
            const count = parseInt(a.driverCount) || 1
            if (!arrivalsByDest[a.toPlant]) arrivalsByDest[a.toPlant] = []
            if (count > 1 && a.timeMode === 'custom' && a.customTimes?.length) {
                a.customTimes.slice(0, count).forEach((ct) => {
                    if (ct.time) arrivalsByDest[a.toPlant].push(ct.time)
                })
            } else if (count > 1 && a.time) {
                for (let j = 0; j < count; j++) {
                    const arr = addMinutesToTime(a.time, j * (a.staggerMinutes || DEFAULT_STAGGER_MINUTES))
                    if (arr) arrivalsByDest[a.toPlant].push(arr)
                }
            } else {
                arrivalsByDest[a.toPlant].push(a.time)
            }
        })
        Object.entries(arrivalsByDest).forEach(([plant, times]) => {
            if (times.length < 2) return
            const sorted = [...times].sort()
            for (let i = 1; i < sorted.length; i++) {
                const [h1, m1] = parseTime(sorted[i - 1])
                const [h2, m2] = parseTime(sorted[i])
                const gap = h2 * 60 + m2 - (h1 * 60 + m1)
                if (gap >= GAP_THRESHOLD_MINUTES) {
                    suggestions.push({
                        icon: 'fa-hourglass-half',
                        message: `${gap}min gap at ${plant} between ${sorted[i - 1]} and ${sorted[i]}`,
                        type: 'gap'
                    })
                }
            }
        })

        // Incomplete assignments — have route but no times
        validAssignments.forEach((a) => {
            if (!a.time) {
                suggestions.push({
                    icon: 'fa-pen',
                    message: `${a.fromPlant} \u2192 ${a.toPlant} has no arrival time set`,
                    type: 'incomplete'
                })
            }
        })

        return { suggestions, warnings }
    }, [assignments, mixerCountsByPlant, travelTimes, shiftSpanHours])

    // Move assignment up/down for manual reordering
    const moveAssignment = useCallback((id, direction) => {
        setAssignments((prev) => {
            const idx = prev.findIndex((a) => a.id === id)
            if (idx < 0) return prev
            const targetIdx = idx + direction
            if (targetIdx < 0 || targetIdx >= prev.length) return prev
            const next = [...prev]
            ;[next[idx], next[targetIdx]] = [next[targetIdx], next[idx]]
            return next
        })
    }, [])

    // Template management
    const loadTemplates = useCallback(async () => {
        if (!userId) return
        const data = await PlanService.fetchTemplates(userId)
        setTemplates(data)
    }, [userId])

    const saveAsTemplate = useCallback(async () => {
        if (!userId || !templateName.trim()) return
        await PlanService.saveTemplate(userId, templateName.trim(), assignments, notes)
        setTemplateName('')
        await loadTemplates()
    }, [userId, templateName, assignments, notes, loadTemplates])

    const loadTemplate = useCallback((template) => {
        setAssignments(ensureUniqueIds(template.assignments || [createEmptyAssignment()]))
        setNotes(template.notes || '')
        setShowTemplateModal(false)
    }, [])

    const deleteTemplate = useCallback(
        async (templateId) => {
            await PlanService.deleteTemplate(templateId)
            await loadTemplates()
        },
        [loadTemplates]
    )

    return (
        <div
            className="global-dashboard-container dashboard-container global-flush-top flush-top plan-view"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
            {/* Plan header — matches TopSection visual language */}
            <div
                className="shrink-0 border-b shadow-sm px-7 py-5 pb-5"
                style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border-light)',
                    backgroundImage: `
                        linear-gradient(${accentColor}10 1px, transparent 1px),
                        linear-gradient(90deg, ${accentColor}10 1px, transparent 1px),
                        radial-gradient(circle at center, ${accentColor}08 0%, transparent 50%)
                    `,
                    backgroundSize: '20px 20px, 20px 20px, 40px 40px'
                }}
            >
                {/* Row 1: Title + badge-style date nav */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h1
                            className="text-[28px] font-bold tracking-tight m-0"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Plan
                        </h1>
                        {viewMode === 'table' && (
                            <>
                                {/* Date nav badge */}
                                <div
                                    className="inline-flex items-center gap-1 rounded-lg text-sm font-semibold px-2 py-1.5"
                                    style={{
                                        backgroundColor: `${accentColor}${isDark ? '30' : '15'}`,
                                        color: accentColor
                                    }}
                                >
                                    <button
                                        onClick={() => setPlanDate(getOffsetDate(planDate, -1))}
                                        className="border-none bg-transparent cursor-pointer p-1 rounded hover:opacity-80"
                                        style={{ color: accentColor }}
                                        title="Previous day"
                                    >
                                        <i className="fas fa-chevron-left text-xs" />
                                    </button>
                                    <button
                                        className="relative border-none bg-transparent cursor-pointer px-2 py-0.5 rounded font-semibold text-sm"
                                        style={{ color: accentColor }}
                                        title="Click to pick date"
                                    >
                                        {new Date(planDate + 'T00:00:00').toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                        <input
                                            type="date"
                                            value={planDate}
                                            onChange={(e) => e.target.value && setPlanDate(e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            style={{ width: '100%', height: '100%' }}
                                        />
                                    </button>
                                    <button
                                        onClick={() => setPlanDate(getOffsetDate(planDate, 1))}
                                        className="border-none bg-transparent cursor-pointer p-1 rounded hover:opacity-80"
                                        style={{ color: accentColor }}
                                        title="Next day"
                                    >
                                        <i className="fas fa-chevron-right text-xs" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => setPlanDate(getTomorrowDate())}
                                    className="border-none rounded-lg cursor-pointer text-sm font-semibold px-3 py-1.5"
                                    style={{
                                        background:
                                            planDate === getTomorrowDate()
                                                ? `${accentColor}${isDark ? '30' : '15'}`
                                                : 'var(--bg-tertiary)',
                                        color: planDate === getTomorrowDate() ? accentColor : 'var(--text-secondary)'
                                    }}
                                >
                                    Tomorrow
                                </button>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {/* View mode toggle */}
                        <div
                            className="flex items-center rounded-lg p-1"
                            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)' }}
                        >
                            {[
                                { mode: 'table', icon: 'fa-table', label: 'Table' },
                                { mode: 'timeline', icon: 'fa-calendar-day', label: 'Timeline' }
                            ].map(({ mode, icon, label }) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className="flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold border-none cursor-pointer px-3.5 py-2"
                                    style={{
                                        backgroundColor: viewMode === mode ? accentColor : 'transparent',
                                        color: viewMode === mode ? '#fff' : 'var(--text-secondary)'
                                    }}
                                >
                                    <i className={`fas ${icon}`} />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Row 2: Action buttons — table view only */}
                {viewMode === 'table' && (
                    <div className="flex items-center gap-3 mt-4">
                        <button
                            onClick={copyToClipboard}
                            className="flex items-center gap-2 border-none rounded-xl text-sm font-semibold px-5 py-3 cursor-pointer"
                            style={{
                                backgroundColor: copied ? '#16a34a' : 'var(--bg-tertiary)',
                                color: copied ? '#fff' : 'var(--text-secondary)'
                            }}
                            title="Copy plan to clipboard"
                        >
                            <i className={`fas fa-${copied ? 'check' : 'copy'}`} />
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                        {canEdit && (
                            <>
                                <button
                                    onClick={() => {
                                        setShowTemplateModal(true)
                                        loadTemplates()
                                    }}
                                    className="flex items-center gap-2 border-none rounded-xl text-sm font-semibold px-5 py-3 cursor-pointer"
                                    style={{
                                        backgroundColor: 'var(--bg-tertiary)',
                                        color: 'var(--text-secondary)'
                                    }}
                                    title="Plan templates"
                                >
                                    <i className="fas fa-bookmark" />
                                    <span>Templates</span>
                                </button>
                                <button
                                    onClick={() => setShowImportModal(true)}
                                    className="flex items-center gap-2 border-none rounded-xl text-sm font-semibold px-5 py-3 cursor-pointer"
                                    style={{
                                        backgroundColor: 'var(--bg-tertiary)',
                                        color: 'var(--text-secondary)'
                                    }}
                                    title="Import plan from message"
                                >
                                    <i className="fas fa-file-import" />
                                    <span>Import</span>
                                </button>
                                <button
                                    onClick={() => setShowSettings(!showSettings)}
                                    className="flex items-center gap-2 border-none rounded-xl text-sm font-semibold px-5 py-3 cursor-pointer"
                                    style={{
                                        backgroundColor: showSettings ? accentColor : 'var(--bg-tertiary)',
                                        color: showSettings ? '#fff' : 'var(--text-secondary)'
                                    }}
                                    title="Travel time settings"
                                >
                                    <i className="fas fa-cog" />
                                    <span>Settings</span>
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
            <div
                className="global-content-container content-container"
                style={{ overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
            >
                {isLoading ? (
                    <PlanSkeleton isMobile={isMobile} />
                ) : (
                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        {/* Read-only banner for users without plan.edit */}
                        {!canEdit && (
                            <div
                                className="flex items-center gap-2 px-4 py-2 text-xs font-medium border-b shrink-0"
                                style={{
                                    background: `${accentColor}10`,
                                    borderColor: 'var(--border-light)',
                                    color: 'var(--text-secondary)'
                                }}
                            >
                                <i className="fas fa-lock text-[10px]" />
                                <span>View only — you need permission to make changes</span>
                            </div>
                        )}
                        {/* Settings panel */}
                        {/* Travel Times Modal */}
                        {showSettings && (
                            <div
                                className="fixed inset-0 z-50 flex items-center justify-center"
                                onClick={() => setShowSettings(false)}
                            >
                                <div className="absolute inset-0 bg-black/40" />
                                <div
                                    className="relative rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
                                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Header */}
                                    <div
                                        className="flex items-center justify-between px-5 py-4 border-b"
                                        style={{ borderColor: 'var(--border-light)' }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-route text-sm" style={{ color: accentColor }} />
                                            <span
                                                className="text-sm font-bold"
                                                style={{ color: 'var(--text-primary)' }}
                                            >
                                                Travel Times
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setShowSettings(false)}
                                            className="border-none bg-transparent cursor-pointer p-1 rounded-md"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <i className="fas fa-times text-sm" />
                                        </button>
                                    </div>
                                    {/* Add new route */}
                                    <div className="px-5 py-4" style={{ background: 'var(--bg-secondary)' }}>
                                        <div
                                            className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Add Route
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <PlantSelect
                                                value={newTravelTime.from}
                                                onChange={(e) =>
                                                    setNewTravelTime({ ...newTravelTime, from: e.target.value })
                                                }
                                                plants={plants}
                                                placeholder="From"
                                                className="min-w-[80px]"
                                            />
                                            <i
                                                className="fas fa-arrow-right text-[10px]"
                                                style={{ color: 'var(--text-secondary)' }}
                                            />
                                            <PlantSelect
                                                value={newTravelTime.to}
                                                onChange={(e) =>
                                                    setNewTravelTime({ ...newTravelTime, to: e.target.value })
                                                }
                                                plants={plants}
                                                placeholder="To"
                                                className="min-w-[80px]"
                                            />
                                            <input
                                                type="number"
                                                placeholder="min"
                                                value={newTravelTime.minutes}
                                                onChange={(e) =>
                                                    setNewTravelTime({ ...newTravelTime, minutes: e.target.value })
                                                }
                                                className="border rounded-lg text-sm outline-none py-1.5 px-2 text-center w-[60px]"
                                                style={{
                                                    background: 'var(--bg-primary)',
                                                    borderColor: 'var(--border-medium)',
                                                    color: 'var(--text-primary)'
                                                }}
                                            />
                                            <button
                                                onClick={addTravelTime}
                                                className="border-none rounded-lg cursor-pointer text-sm font-semibold px-3 py-1.5 text-white"
                                                style={{ background: accentColor }}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                    {/* Saved routes */}
                                    <div className="px-5 py-4 max-h-[300px] overflow-y-auto">
                                        <div
                                            className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Saved Routes
                                        </div>
                                        {Object.entries(travelTimes).filter(([k]) => {
                                            const [f, t] = k.split('->')
                                            return f < t
                                        }).length === 0 ? (
                                            <div
                                                className="text-xs py-4 text-center"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                No travel times configured yet
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1.5">
                                                {Object.entries(travelTimes)
                                                    .filter(([k]) => {
                                                        const [f, t] = k.split('->')
                                                        return f < t
                                                    })
                                                    .map(([k, v]) => {
                                                        const [f, t] = k.split('->')
                                                        return (
                                                            <div
                                                                key={k}
                                                                className="flex items-center justify-between rounded-lg px-3 py-2"
                                                                style={{ background: 'var(--bg-tertiary)' }}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span
                                                                        className="text-xs font-semibold"
                                                                        style={{ color: 'var(--text-primary)' }}
                                                                    >
                                                                        {f}
                                                                    </span>
                                                                    <i
                                                                        className="fas fa-arrows-left-right text-[9px]"
                                                                        style={{ color: 'var(--text-secondary)' }}
                                                                    />
                                                                    <span
                                                                        className="text-xs font-semibold"
                                                                        style={{ color: 'var(--text-primary)' }}
                                                                    >
                                                                        {t}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span
                                                                        className="text-xs font-bold"
                                                                        style={{ color: accentColor }}
                                                                    >
                                                                        {v} min
                                                                    </span>
                                                                    <button
                                                                        onClick={() => removeTravelTime(k)}
                                                                        className="bg-transparent border-none cursor-pointer p-1 rounded"
                                                                        style={{ color: 'var(--text-secondary)' }}
                                                                    >
                                                                        <i className="fas fa-trash text-[10px]" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Templates Modal */}
                        {showTemplateModal && (
                            <div
                                className="fixed inset-0 z-50 flex items-center justify-center"
                                onClick={() => setShowTemplateModal(false)}
                            >
                                <div className="absolute inset-0 bg-black/40" />
                                <div
                                    className="relative rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
                                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Header */}
                                    <div
                                        className="flex items-center justify-between px-5 py-4 border-b"
                                        style={{ borderColor: 'var(--border-light)' }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-bookmark text-sm" style={{ color: accentColor }} />
                                            <span
                                                className="text-sm font-bold"
                                                style={{ color: 'var(--text-primary)' }}
                                            >
                                                Plan Templates
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setShowTemplateModal(false)}
                                            className="border-none bg-transparent cursor-pointer p-1 rounded-md"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <i className="fas fa-times text-sm" />
                                        </button>
                                    </div>
                                    {/* Save current plan as template */}
                                    <div className="px-5 py-4" style={{ background: 'var(--bg-secondary)' }}>
                                        <div
                                            className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Save Current Plan
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder="Template name..."
                                                value={templateName}
                                                onChange={(e) => setTemplateName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && saveAsTemplate()}
                                                className="flex-1 border rounded-lg text-sm outline-none py-1.5 px-3"
                                                style={{
                                                    background: 'var(--bg-primary)',
                                                    borderColor: 'var(--border-medium)',
                                                    color: 'var(--text-primary)'
                                                }}
                                            />
                                            <button
                                                onClick={saveAsTemplate}
                                                disabled={!templateName.trim()}
                                                className="border-none rounded-lg cursor-pointer text-sm font-semibold px-3 py-1.5 text-white disabled:opacity-40"
                                                style={{ background: accentColor }}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                    {/* Saved templates */}
                                    <div className="px-5 py-4 max-h-[300px] overflow-y-auto">
                                        <div
                                            className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Saved Templates
                                        </div>
                                        {templates.length === 0 ? (
                                            <div
                                                className="text-xs py-4 text-center"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                No templates saved yet
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1.5">
                                                {templates.map((t) => (
                                                    <div
                                                        key={t.id}
                                                        className="flex items-center justify-between rounded-lg px-3 py-2.5"
                                                        style={{ background: 'var(--bg-tertiary)' }}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span
                                                                className="text-xs font-semibold"
                                                                style={{ color: 'var(--text-primary)' }}
                                                            >
                                                                {t.name}
                                                            </span>
                                                            <span
                                                                className="text-[10px]"
                                                                style={{ color: 'var(--text-secondary)' }}
                                                            >
                                                                {t.assignments?.length || 0} assignment
                                                                {(t.assignments?.length || 0) !== 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={() => loadTemplate(t)}
                                                                className="border-none rounded cursor-pointer text-[11px] font-semibold px-2.5 py-1 text-white"
                                                                style={{ background: accentColor }}
                                                            >
                                                                Load
                                                            </button>
                                                            <button
                                                                onClick={() => deleteTemplate(t.id)}
                                                                className="border-none bg-transparent cursor-pointer p-1 rounded"
                                                                style={{ color: 'var(--text-secondary)' }}
                                                            >
                                                                <i className="fas fa-trash text-[10px]" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Import Modal */}
                        {showImportModal && (
                            <div
                                className="fixed inset-0 z-50 flex items-center justify-center"
                                onClick={() => setShowImportModal(false)}
                            >
                                <div className="absolute inset-0 bg-black/40" />
                                <div
                                    className="relative rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
                                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div
                                        className="flex items-center justify-between px-5 py-4 border-b"
                                        style={{ borderColor: 'var(--border-light)' }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-file-import text-sm" style={{ color: accentColor }} />
                                            <span
                                                className="text-sm font-bold"
                                                style={{ color: 'var(--text-primary)' }}
                                            >
                                                Import Plan
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setShowImportModal(false)}
                                            className="border-none bg-transparent cursor-pointer p-1 rounded-md"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <i className="fas fa-times text-sm" />
                                        </button>
                                    </div>
                                    <div className="px-5 py-4">
                                        <div
                                            className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Paste Generated Plan Message
                                        </div>
                                        <textarea
                                            value={importText}
                                            onChange={(e) => setImportText(e.target.value)}
                                            placeholder="Paste the generated plan message here..."
                                            rows={12}
                                            className="w-full border rounded-lg text-xs outline-none p-3 font-mono resize-none"
                                            style={{
                                                background: 'var(--bg-secondary)',
                                                borderColor: 'var(--border-medium)',
                                                color: 'var(--text-primary)'
                                            }}
                                        />
                                        <div className="flex items-center justify-end gap-2 mt-3">
                                            <button
                                                onClick={() => setShowImportModal(false)}
                                                className="rounded-lg cursor-pointer text-sm font-semibold px-4 py-2"
                                                style={{
                                                    background: 'transparent',
                                                    border: '1px solid var(--border-medium)',
                                                    color: 'var(--text-secondary)'
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleImport}
                                                disabled={!importText.trim()}
                                                className="border-none rounded-lg cursor-pointer text-sm font-semibold px-4 py-2 text-white disabled:opacity-40"
                                                style={{ background: accentColor }}
                                            >
                                                Import
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {viewMode === 'timeline' && (
                            <TimelineView
                                assignments={assignments}
                                adjacentPlans={adjacentPlans}
                                adjacentProduction={adjacentProduction}
                                plantProduction={plantProduction}
                                planDate={planDate}
                                plants={plants}
                                accentColor={accentColor}
                                getTravelTime={getTravelTime}
                                calcClockIn={calcClockIn}
                                addMinutesToTime={addMinutesToTime}
                                mixerCountsByPlant={mixerCountsByPlant}
                            />
                        )}

                        {/* Main grid: table left, sidebar right */}
                        {viewMode === 'table' && (
                            <div
                                className={`flex-1 min-h-0 overflow-hidden ${isMobile ? 'flex flex-col overflow-y-auto' : 'grid'} ${!canEdit ? 'pointer-events-none' : ''}`}
                                style={{
                                    ...(isMobile ? {} : { gridTemplateColumns: '1fr 340px' }),
                                    ...(canEdit ? {} : { opacity: 0.6 })
                                }}
                            >
                                {/* Left: table area */}
                                <div className="flex flex-col overflow-hidden">
                                    {/* Plant mixer counts bar */}
                                    <div
                                        className="flex gap-1.5 flex-wrap items-center border-b px-4 py-2"
                                        style={{
                                            background: 'var(--bg-primary)',
                                            borderColor: 'var(--border-light)'
                                        }}
                                    >
                                        <span
                                            className="text-[10px] font-semibold uppercase tracking-[0.5px] mr-1"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Mixers
                                        </span>
                                        {stats.map((s) => (
                                            <div
                                                key={s.code}
                                                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px]"
                                                style={{
                                                    background:
                                                        s.send > 0 || s.recv > 0
                                                            ? 'var(--bg-hover)'
                                                            : 'var(--bg-tertiary)',
                                                    border:
                                                        s.send > 0 || s.recv > 0
                                                            ? `1px solid ${accentColor}33`
                                                            : '1px solid transparent'
                                                }}
                                            >
                                                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                                    {s.code}
                                                </span>
                                                <span
                                                    className="font-bold"
                                                    style={{
                                                        color: s.eff !== s.base ? accentColor : 'var(--text-secondary)'
                                                    }}
                                                >
                                                    {s.eff}
                                                </span>
                                                {s.send > 0 && (
                                                    <span
                                                        className="text-[9px] text-[#dc2626]"
                                                        title={`${s.send} leaving`}
                                                    >
                                                        -{s.send}
                                                    </span>
                                                )}
                                                {s.recv > 0 && (
                                                    <span
                                                        className="text-[9px] text-[#16a34a]"
                                                        title={`${s.recv} incoming`}
                                                    >
                                                        +{s.recv}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                        <div className="flex-1" />
                                        <span
                                            className="text-[11px] font-medium"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            {validAssignmentCount} route{validAssignmentCount !== 1 ? 's' : ''},{' '}
                                            {totalOps} operator{totalOps !== 1 ? 's' : ''}
                                        </span>
                                        <button
                                            onClick={() => setAssignments((prev) => [...prev, createEmptyAssignment()])}
                                            className="border-none rounded-md cursor-pointer text-[11px] font-semibold px-2.5 py-1 text-white"
                                            style={{ background: accentColor }}
                                        >
                                            <i className="fas fa-plus mr-1" />
                                            Add
                                        </button>
                                    </div>

                                    {/* Scrollable table */}
                                    <div className="flex-1 overflow-auto">
                                        {!assignments.length ? (
                                            <div
                                                className="flex flex-col items-center justify-center py-20"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                <i className="fas fa-truck text-3xl mb-3 opacity-50" />
                                                <span className="text-sm">No assignments yet</span>
                                                <button
                                                    onClick={() =>
                                                        setAssignments((prev) => [...prev, createEmptyAssignment()])
                                                    }
                                                    className="border-none rounded-lg cursor-pointer text-sm font-semibold px-4 py-2.5 text-white mt-4"
                                                    style={{ background: accentColor }}
                                                >
                                                    <i className="fas fa-plus mr-1.5" />
                                                    Add Assignment
                                                </button>
                                            </div>
                                        ) : (
                                            <table
                                                className="w-full border-collapse text-xs"
                                                style={{ minWidth: 580, tableLayout: 'fixed' }}
                                            >
                                                <thead>
                                                    <tr style={{ background: 'var(--bg-tertiary)' }}>
                                                        <th
                                                            className="text-center text-[10px] font-bold uppercase tracking-[0.5px] py-2.5 px-1 sticky top-0 z-10"
                                                            style={{
                                                                color: 'var(--text-secondary)',
                                                                background: 'var(--bg-tertiary)',
                                                                width: 36
                                                            }}
                                                        >
                                                            #
                                                        </th>
                                                        <th
                                                            className="text-right text-[10px] font-bold uppercase tracking-[0.5px] py-2.5 pr-1 pl-1 sticky top-0 z-10"
                                                            style={{
                                                                color: 'var(--text-secondary)',
                                                                background: 'var(--bg-tertiary)',
                                                                width: 62
                                                            }}
                                                        >
                                                            From
                                                        </th>
                                                        <th
                                                            className="text-center py-2.5 px-0 sticky top-0 z-10"
                                                            style={{ background: 'var(--bg-tertiary)', width: 20 }}
                                                        />
                                                        <th
                                                            className="text-left text-[10px] font-bold uppercase tracking-[0.5px] py-2.5 pl-1 pr-1 sticky top-0 z-10"
                                                            style={{
                                                                color: 'var(--text-secondary)',
                                                                background: 'var(--bg-tertiary)',
                                                                width: 62
                                                            }}
                                                        >
                                                            To
                                                        </th>
                                                        <th
                                                            className="text-center text-[10px] font-bold uppercase tracking-[0.5px] py-2.5 px-1 sticky top-0 z-10"
                                                            style={{
                                                                color: 'var(--text-secondary)',
                                                                background: 'var(--bg-tertiary)',
                                                                width: 48
                                                            }}
                                                        >
                                                            Ops
                                                        </th>
                                                        <th
                                                            className="text-center text-[10px] font-bold uppercase tracking-[0.5px] py-2.5 px-1 sticky top-0 z-10"
                                                            style={{
                                                                color: 'var(--text-secondary)',
                                                                background: 'var(--bg-tertiary)',
                                                                width: 68
                                                            }}
                                                        >
                                                            Arrive
                                                        </th>
                                                        <th
                                                            className="text-center text-[10px] font-bold uppercase tracking-[0.5px] py-2.5 px-1 sticky top-0 z-10"
                                                            style={{
                                                                color: 'var(--text-secondary)',
                                                                background: 'var(--bg-tertiary)',
                                                                width: 68
                                                            }}
                                                        >
                                                            Leave
                                                        </th>
                                                        <th
                                                            className="text-center text-[10px] font-bold uppercase tracking-[0.5px] py-2.5 px-1 sticky top-0 z-10"
                                                            style={{
                                                                color: 'var(--text-secondary)',
                                                                background: 'var(--bg-tertiary)',
                                                                width: 56
                                                            }}
                                                        >
                                                            Stagger
                                                        </th>
                                                        <th
                                                            className="text-center text-[10px] font-bold uppercase tracking-[0.5px] py-2.5 px-1 sticky top-0 z-10"
                                                            style={{
                                                                color: 'var(--text-secondary)',
                                                                background: 'var(--bg-tertiary)',
                                                                width: 62
                                                            }}
                                                        >
                                                            Travel
                                                        </th>
                                                        <th
                                                            className="text-center text-[10px] font-bold uppercase tracking-[0.5px] py-2.5 px-1 sticky top-0 z-10"
                                                            style={{
                                                                color: 'var(--text-secondary)',
                                                                background: 'var(--bg-tertiary)',
                                                                width: 68
                                                            }}
                                                        >
                                                            Clock In
                                                        </th>
                                                        <th
                                                            className="text-center text-[10px] font-bold uppercase tracking-[0.5px] py-2.5 px-1 sticky top-0 z-10"
                                                            style={{
                                                                color: 'var(--text-secondary)',
                                                                background: 'var(--bg-tertiary)',
                                                                width: 34
                                                            }}
                                                        >
                                                            Load
                                                        </th>
                                                        <th
                                                            className="text-center py-2.5 px-0 sticky top-0 z-10"
                                                            style={{ background: 'var(--bg-tertiary)', width: 60 }}
                                                        />
                                                        <th
                                                            className="text-center py-2.5 px-0 sticky top-0 z-10"
                                                            style={{ background: 'var(--bg-tertiary)', width: 28 }}
                                                        />
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {assignments.map((a, idx) => {
                                                        const travelTime =
                                                            a.fromPlant && a.toPlant
                                                                ? getTravelTime(a.fromPlant, a.toPlant)
                                                                : null
                                                        const clockIn =
                                                            a.time && travelTime !== null
                                                                ? calcClockIn(a.time, a.fromPlant, a.toPlant)
                                                                : null
                                                        const missingTravelTime =
                                                            travelTime === null && a.fromPlant && a.toPlant
                                                        const hasCapacityWarning =
                                                            a.fromPlant &&
                                                            a.driverCount > (mixerCountsByPlant[a.fromPlant] || 0)
                                                        const isExpanded = activeRowId === a.id
                                                        const hasDetails = a.driverCount > 1

                                                        return (
                                                            <React.Fragment key={a.id}>
                                                                <tr
                                                                    className="group hover:bg-[var(--bg-secondary)] transition-colors"
                                                                    style={{
                                                                        borderBottom: isExpanded
                                                                            ? 'none'
                                                                            : '1px solid var(--border-light)'
                                                                    }}
                                                                >
                                                                    <td className="text-center py-2.5 px-1">
                                                                        <div className="flex flex-col items-center gap-0.5">
                                                                            {idx > 0 && (
                                                                                <button
                                                                                    onClick={() =>
                                                                                        moveAssignment(a.id, -1)
                                                                                    }
                                                                                    className="border-none bg-transparent cursor-pointer p-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity leading-none"
                                                                                    style={{
                                                                                        color: 'var(--text-secondary)'
                                                                                    }}
                                                                                    title="Move up"
                                                                                >
                                                                                    <i className="fas fa-caret-up text-[10px]" />
                                                                                </button>
                                                                            )}
                                                                            <span
                                                                                className="inline-flex items-center justify-center rounded-md text-white text-[10px] font-bold w-5 h-5"
                                                                                style={{ background: accentColor }}
                                                                            >
                                                                                {idx + 1}
                                                                            </span>
                                                                            {idx < assignments.length - 1 && (
                                                                                <button
                                                                                    onClick={() =>
                                                                                        moveAssignment(a.id, 1)
                                                                                    }
                                                                                    className="border-none bg-transparent cursor-pointer p-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity leading-none"
                                                                                    style={{
                                                                                        color: 'var(--text-secondary)'
                                                                                    }}
                                                                                    title="Move down"
                                                                                >
                                                                                    <i className="fas fa-caret-down text-[10px]" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="text-right py-2.5 pr-1 pl-1">
                                                                        <PlantSelect
                                                                            value={a.fromPlant}
                                                                            onChange={(e) =>
                                                                                updateAssignment(
                                                                                    a.id,
                                                                                    'fromPlant',
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            plants={plants}
                                                                            excludeValue={a.toPlant}
                                                                            placeholder="From"
                                                                        />
                                                                    </td>
                                                                    <td className="text-center py-2.5 px-0">
                                                                        <i
                                                                            className="fas fa-arrow-right text-[8px]"
                                                                            style={{
                                                                                color:
                                                                                    travelTime !== null
                                                                                        ? accentColor
                                                                                        : 'var(--text-secondary)'
                                                                            }}
                                                                        />
                                                                    </td>
                                                                    <td className="text-left py-2.5 pl-1 pr-1">
                                                                        <PlantSelect
                                                                            value={a.toPlant}
                                                                            onChange={(e) =>
                                                                                updateAssignment(
                                                                                    a.id,
                                                                                    'toPlant',
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            plants={plants}
                                                                            excludeValue={a.fromPlant}
                                                                            placeholder="To"
                                                                        />
                                                                    </td>
                                                                    <td className="text-center py-2.5 px-1">
                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            value={a.driverCount || ''}
                                                                            onChange={(e) =>
                                                                                updateAssignment(
                                                                                    a.id,
                                                                                    'driverCount',
                                                                                    e.target.value === ''
                                                                                        ? ''
                                                                                        : Math.max(
                                                                                              1,
                                                                                              parseInt(
                                                                                                  e.target.value
                                                                                              ) || 1
                                                                                          )
                                                                                )
                                                                            }
                                                                            className="border rounded-md text-xs outline-none font-mono text-center py-1 px-1 w-[34px]"
                                                                            style={{
                                                                                background: 'var(--bg-primary)',
                                                                                borderColor: 'var(--border-medium)',
                                                                                color: 'var(--text-primary)'
                                                                            }}
                                                                        />
                                                                    </td>
                                                                    <td className="text-center py-2.5 px-1">
                                                                        <TimeInput
                                                                            value={a.time}
                                                                            onChange={(val) =>
                                                                                updateAssignment(a.id, 'time', val)
                                                                            }
                                                                        />
                                                                    </td>
                                                                    <td className="text-center py-2.5 px-1">
                                                                        <TimeInput
                                                                            value={a.leaveTime}
                                                                            onChange={(val) =>
                                                                                updateAssignment(a.id, 'leaveTime', val)
                                                                            }
                                                                        />
                                                                    </td>
                                                                    <td className="text-center py-2.5 px-1">
                                                                        {a.driverCount > 1 &&
                                                                        a.timeMode !== 'custom' ? (
                                                                            <span className="text-[11px]">
                                                                                {a.staggerMinutes ||
                                                                                    DEFAULT_STAGGER_MINUTES}
                                                                                m
                                                                            </span>
                                                                        ) : (
                                                                            <span
                                                                                className="text-[11px]"
                                                                                style={{
                                                                                    color: 'var(--text-secondary)'
                                                                                }}
                                                                            >
                                                                                —
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td
                                                                        className="text-center py-2.5 px-1 text-xs"
                                                                        style={{ color: 'var(--text-secondary)' }}
                                                                    >
                                                                        {missingTravelTime ? (
                                                                            <span
                                                                                className="text-xs font-medium"
                                                                                style={{ color: '#d97706' }}
                                                                                title="No travel time set for this route"
                                                                            >
                                                                                N/A
                                                                            </span>
                                                                        ) : travelTime !== null ? (
                                                                            `${travelTime}m`
                                                                        ) : (
                                                                            '—'
                                                                        )}
                                                                    </td>
                                                                    <td className="text-center py-2.5 px-1">
                                                                        {clockIn ? (
                                                                            <span className="font-mono font-bold text-[12px] text-[#16a34a]">
                                                                                {clockIn}
                                                                            </span>
                                                                        ) : (
                                                                            <span
                                                                                style={{
                                                                                    color: 'var(--text-secondary)'
                                                                                }}
                                                                            >
                                                                                —
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="text-center py-2.5 px-1">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={a.loadFromPlant || false}
                                                                            onChange={(e) =>
                                                                                updateAssignment(
                                                                                    a.id,
                                                                                    'loadFromPlant',
                                                                                    e.target.checked
                                                                                )
                                                                            }
                                                                            className="cursor-pointer h-3.5 w-3.5 rounded"
                                                                            style={{ accentColor: accentColor }}
                                                                        />
                                                                    </td>
                                                                    <td className="text-center py-2.5 px-0">
                                                                        <div className="flex items-center justify-center gap-0.5">
                                                                            {hasDetails && (
                                                                                <button
                                                                                    onClick={() =>
                                                                                        toggleRowExpanded(a.id)
                                                                                    }
                                                                                    className="border-none bg-transparent cursor-pointer p-0.5"
                                                                                    style={{
                                                                                        color: isExpanded
                                                                                            ? accentColor
                                                                                            : 'var(--text-secondary)'
                                                                                    }}
                                                                                    title={
                                                                                        isExpanded
                                                                                            ? 'Collapse'
                                                                                            : 'Expand details'
                                                                                    }
                                                                                >
                                                                                    <i
                                                                                        className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} text-[9px]`}
                                                                                    />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="text-center py-2.5 px-0">
                                                                        <button
                                                                            onClick={() =>
                                                                                setAssignments((prev) =>
                                                                                    prev.filter((x) => x.id !== a.id)
                                                                                )
                                                                            }
                                                                            className="border-none rounded cursor-pointer p-1 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                                                        >
                                                                            <i className="fas fa-trash text-[8px]" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                                {/* Expanded row detail */}
                                                                {isExpanded && (
                                                                    <tr
                                                                        style={{
                                                                            borderBottom:
                                                                                '2px solid var(--border-medium)'
                                                                        }}
                                                                    >
                                                                        <td colSpan={13} className="p-0">
                                                                            <div
                                                                                className="px-4 py-3"
                                                                                style={{
                                                                                    background: 'var(--bg-secondary)'
                                                                                }}
                                                                            >
                                                                                <div className="flex gap-4">
                                                                                    {/* Left: operator schedule */}
                                                                                    <div className="flex-1 min-w-0">
                                                                                        {hasDetails && (
                                                                                            <>
                                                                                                {/* Mode toggle */}
                                                                                                <div className="flex items-center gap-3 mb-2.5">
                                                                                                    <div
                                                                                                        className="rounded-md flex overflow-hidden"
                                                                                                        style={{
                                                                                                            border: '1px solid var(--border-medium)'
                                                                                                        }}
                                                                                                    >
                                                                                                        {[
                                                                                                            'stagger',
                                                                                                            'custom'
                                                                                                        ].map(
                                                                                                            (mode) => {
                                                                                                                const isActive =
                                                                                                                    mode ===
                                                                                                                    'custom'
                                                                                                                        ? a.timeMode ===
                                                                                                                          'custom'
                                                                                                                        : a.timeMode !==
                                                                                                                          'custom'
                                                                                                                return (
                                                                                                                    <button
                                                                                                                        key={
                                                                                                                            mode
                                                                                                                        }
                                                                                                                        onClick={() =>
                                                                                                                            mode ===
                                                                                                                            'custom'
                                                                                                                                ? switchToCustom(
                                                                                                                                      a.id
                                                                                                                                  )
                                                                                                                                : updateAssignment(
                                                                                                                                      a.id,
                                                                                                                                      'timeMode',
                                                                                                                                      'stagger'
                                                                                                                                  )
                                                                                                                        }
                                                                                                                        className="border-none cursor-pointer text-[11px] font-semibold px-3 py-1"
                                                                                                                        style={{
                                                                                                                            background:
                                                                                                                                isActive
                                                                                                                                    ? accentColor
                                                                                                                                    : 'transparent',
                                                                                                                            color: isActive
                                                                                                                                ? '#fff'
                                                                                                                                : 'var(--text-secondary)'
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        {mode
                                                                                                                            .charAt(
                                                                                                                                0
                                                                                                                            )
                                                                                                                            .toUpperCase() +
                                                                                                                            mode.slice(
                                                                                                                                1
                                                                                                                            )}
                                                                                                                    </button>
                                                                                                                )
                                                                                                            }
                                                                                                        )}
                                                                                                    </div>
                                                                                                    {a.timeMode !==
                                                                                                        'custom' && (
                                                                                                        <div className="flex items-center gap-1.5">
                                                                                                            <span
                                                                                                                className="text-[11px]"
                                                                                                                style={{
                                                                                                                    color: 'var(--text-secondary)'
                                                                                                                }}
                                                                                                            >
                                                                                                                Every
                                                                                                            </span>
                                                                                                            <input
                                                                                                                type="number"
                                                                                                                min="5"
                                                                                                                step="5"
                                                                                                                value={
                                                                                                                    a.staggerMinutes ||
                                                                                                                    DEFAULT_STAGGER_MINUTES
                                                                                                                }
                                                                                                                onChange={(
                                                                                                                    e
                                                                                                                ) =>
                                                                                                                    updateAssignment(
                                                                                                                        a.id,
                                                                                                                        'staggerMinutes',
                                                                                                                        parseInt(
                                                                                                                            e
                                                                                                                                .target
                                                                                                                                .value
                                                                                                                        ) ||
                                                                                                                            DEFAULT_STAGGER_MINUTES
                                                                                                                    )
                                                                                                                }
                                                                                                                className="border rounded-md text-xs outline-none py-1 px-1.5 text-center w-[40px]"
                                                                                                                style={{
                                                                                                                    background:
                                                                                                                        'var(--bg-primary)',
                                                                                                                    borderColor:
                                                                                                                        'var(--border-medium)',
                                                                                                                    color: 'var(--text-primary)'
                                                                                                                }}
                                                                                                            />
                                                                                                            <span
                                                                                                                className="text-[11px]"
                                                                                                                style={{
                                                                                                                    color: 'var(--text-secondary)'
                                                                                                                }}
                                                                                                            >
                                                                                                                min
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                                {/* Operator grid */}
                                                                                                <div
                                                                                                    className="grid gap-1"
                                                                                                    style={{
                                                                                                        gridTemplateColumns:
                                                                                                            'repeat(auto-fill, minmax(220px, 1fr))'
                                                                                                    }}
                                                                                                >
                                                                                                    {Array.from(
                                                                                                        {
                                                                                                            length: a.driverCount
                                                                                                        },
                                                                                                        (_, i) => {
                                                                                                            const isCustom =
                                                                                                                a.timeMode ===
                                                                                                                'custom'
                                                                                                            const ct =
                                                                                                                a
                                                                                                                    .customTimes?.[
                                                                                                                    i
                                                                                                                ] || {}
                                                                                                            const arr =
                                                                                                                isCustom
                                                                                                                    ? ct.time
                                                                                                                    : a.time
                                                                                                                      ? addMinutesToTime(
                                                                                                                            a.time,
                                                                                                                            i *
                                                                                                                                (a.staggerMinutes ||
                                                                                                                                    DEFAULT_STAGGER_MINUTES)
                                                                                                                        )
                                                                                                                      : null
                                                                                                            const opClockIn =
                                                                                                                arr
                                                                                                                    ? calcClockIn(
                                                                                                                          arr,
                                                                                                                          a.fromPlant,
                                                                                                                          a.toPlant
                                                                                                                      )
                                                                                                                    : null
                                                                                                            return (
                                                                                                                <div
                                                                                                                    key={
                                                                                                                        i
                                                                                                                    }
                                                                                                                    className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                                                                                                                    style={{
                                                                                                                        background:
                                                                                                                            'var(--bg-primary)',
                                                                                                                        border: '1px solid var(--border-light)'
                                                                                                                    }}
                                                                                                                >
                                                                                                                    <span
                                                                                                                        className="inline-flex items-center justify-center rounded text-white text-[9px] font-bold w-5 h-5 shrink-0"
                                                                                                                        style={{
                                                                                                                            background:
                                                                                                                                accentColor
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        {i +
                                                                                                                            1}
                                                                                                                    </span>
                                                                                                                    {isCustom ? (
                                                                                                                        <>
                                                                                                                            <TimeInput
                                                                                                                                value={
                                                                                                                                    ct.time
                                                                                                                                }
                                                                                                                                onChange={(
                                                                                                                                    val
                                                                                                                                ) =>
                                                                                                                                    updateCustomTime(
                                                                                                                                        a.id,
                                                                                                                                        i,
                                                                                                                                        'time',
                                                                                                                                        val
                                                                                                                                    )
                                                                                                                                }
                                                                                                                                placeholder="Arrive"
                                                                                                                            />
                                                                                                                            <TimeInput
                                                                                                                                value={
                                                                                                                                    ct.leaveTime
                                                                                                                                }
                                                                                                                                onChange={(
                                                                                                                                    val
                                                                                                                                ) =>
                                                                                                                                    updateCustomTime(
                                                                                                                                        a.id,
                                                                                                                                        i,
                                                                                                                                        'leaveTime',
                                                                                                                                        val
                                                                                                                                    )
                                                                                                                                }
                                                                                                                                placeholder="Leave"
                                                                                                                            />
                                                                                                                        </>
                                                                                                                    ) : (
                                                                                                                        <span
                                                                                                                            className="text-[11px] font-mono"
                                                                                                                            style={{
                                                                                                                                color: 'var(--text-primary)'
                                                                                                                            }}
                                                                                                                        >
                                                                                                                            {arr ||
                                                                                                                                '--:--'}
                                                                                                                        </span>
                                                                                                                    )}
                                                                                                                    <span
                                                                                                                        className="ml-auto text-[11px] font-mono font-bold"
                                                                                                                        style={{
                                                                                                                            color: opClockIn
                                                                                                                                ? '#16a34a'
                                                                                                                                : 'var(--text-secondary)'
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        {opClockIn ||
                                                                                                                            '--:--'}
                                                                                                                    </span>
                                                                                                                    <span
                                                                                                                        className="text-[9px]"
                                                                                                                        style={{
                                                                                                                            color: 'var(--text-secondary)'
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        in
                                                                                                                    </span>
                                                                                                                </div>
                                                                                                            )
                                                                                                        }
                                                                                                    )}
                                                                                                </div>
                                                                                            </>
                                                                                        )}
                                                                                        {!hasDetails && (
                                                                                            <div
                                                                                                className="text-[11px]"
                                                                                                style={{
                                                                                                    color: 'var(--text-secondary)'
                                                                                                }}
                                                                                            >
                                                                                                Single operator &mdash;
                                                                                                no schedule breakdown
                                                                                                needed.
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    {/* Right: route summary card */}
                                                                                    <div
                                                                                        className="shrink-0 w-[140px] rounded-lg p-3 flex flex-col gap-2"
                                                                                        style={{
                                                                                            background:
                                                                                                'var(--bg-primary)',
                                                                                            border: '1px solid var(--border-light)'
                                                                                        }}
                                                                                    >
                                                                                        <div
                                                                                            className="text-[10px] font-semibold uppercase tracking-wider"
                                                                                            style={{
                                                                                                color: 'var(--text-secondary)'
                                                                                            }}
                                                                                        >
                                                                                            Route Summary
                                                                                        </div>
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <span
                                                                                                className="text-xs font-bold"
                                                                                                style={{
                                                                                                    color: 'var(--text-primary)'
                                                                                                }}
                                                                                            >
                                                                                                {a.fromPlant || '—'}
                                                                                            </span>
                                                                                            <i
                                                                                                className="fas fa-arrow-right text-[8px]"
                                                                                                style={{
                                                                                                    color: accentColor
                                                                                                }}
                                                                                            />
                                                                                            <span
                                                                                                className="text-xs font-bold"
                                                                                                style={{
                                                                                                    color: 'var(--text-primary)'
                                                                                                }}
                                                                                            >
                                                                                                {a.toPlant || '—'}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-1 text-[11px]">
                                                                                            <div className="flex justify-between">
                                                                                                <span
                                                                                                    style={{
                                                                                                        color: 'var(--text-secondary)'
                                                                                                    }}
                                                                                                >
                                                                                                    Operators
                                                                                                </span>
                                                                                                <span
                                                                                                    className="font-semibold"
                                                                                                    style={{
                                                                                                        color: 'var(--text-primary)'
                                                                                                    }}
                                                                                                >
                                                                                                    {a.driverCount}
                                                                                                </span>
                                                                                            </div>
                                                                                            <div className="flex justify-between">
                                                                                                <span
                                                                                                    style={{
                                                                                                        color: 'var(--text-secondary)'
                                                                                                    }}
                                                                                                >
                                                                                                    Travel
                                                                                                </span>
                                                                                                <span
                                                                                                    className="font-semibold"
                                                                                                    style={{
                                                                                                        color: 'var(--text-primary)'
                                                                                                    }}
                                                                                                >
                                                                                                    {travelTime !== null
                                                                                                        ? `${travelTime}m`
                                                                                                        : 'N/A'}
                                                                                                </span>
                                                                                            </div>
                                                                                            {clockIn && (
                                                                                                <div className="flex justify-between">
                                                                                                    <span
                                                                                                        style={{
                                                                                                            color: 'var(--text-secondary)'
                                                                                                        }}
                                                                                                    >
                                                                                                        Clock In
                                                                                                    </span>
                                                                                                    <span
                                                                                                        className="font-bold"
                                                                                                        style={{
                                                                                                            color: '#16a34a'
                                                                                                        }}
                                                                                                    >
                                                                                                        {clockIn}
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}
                                                                                            {a.loadFromPlant && (
                                                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                                                    <i
                                                                                                        className="fas fa-check text-[8px]"
                                                                                                        style={{
                                                                                                            color: '#16a34a'
                                                                                                        }}
                                                                                                    />
                                                                                                    <span
                                                                                                        style={{
                                                                                                            color: 'var(--text-secondary)'
                                                                                                        }}
                                                                                                    >
                                                                                                        Load from plant
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>

                                {/* Right sidebar */}
                                <div
                                    className={`${isMobile ? '' : 'border-l'} overflow-y-auto`}
                                    style={{
                                        background: 'var(--bg-primary)',
                                        borderColor: 'var(--border-light)'
                                    }}
                                >
                                    {/* Plan Insights — warnings and suggestions */}
                                    {(planInsights.warnings.length > 0 || planInsights.suggestions.length > 0) && (
                                        <div
                                            className="border-b px-4 py-3"
                                            style={{ borderColor: 'var(--border-light)' }}
                                        >
                                            <div className="flex items-center gap-2 mb-2.5">
                                                <i
                                                    className="fas fa-lightbulb text-[10px]"
                                                    style={{ color: '#f59e0b' }}
                                                />
                                                <span
                                                    className="text-[11px] font-semibold uppercase tracking-[0.5px]"
                                                    style={{ color: 'var(--text-secondary)' }}
                                                >
                                                    Plan Insights
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                {planInsights.warnings.map((w, i) => (
                                                    <div
                                                        key={`w-${i}`}
                                                        className="flex items-start gap-2 rounded-md px-2.5 py-1.5 text-[11px]"
                                                        style={{
                                                            background: '#fef3c720',
                                                            border: '1px solid #fbbf2440'
                                                        }}
                                                    >
                                                        <i
                                                            className={`fas ${w.icon} text-[9px] mt-0.5 shrink-0`}
                                                            style={{ color: '#f59e0b' }}
                                                        />
                                                        <span style={{ color: 'var(--text-primary)' }}>
                                                            {w.message}
                                                        </span>
                                                    </div>
                                                ))}
                                                {planInsights.suggestions.map((s, i) => (
                                                    <div
                                                        key={`s-${i}`}
                                                        className="flex items-start gap-2 rounded-md px-2.5 py-1.5 text-[11px]"
                                                        style={{ background: 'var(--bg-tertiary)' }}
                                                    >
                                                        <i
                                                            className={`fas ${s.icon} text-[9px] mt-0.5 shrink-0`}
                                                            style={{ color: 'var(--text-secondary)' }}
                                                        />
                                                        <span style={{ color: 'var(--text-secondary)' }}>
                                                            {s.message}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Plant Health */}
                                    {stats.length > 0 && (
                                        <div
                                            className="border-b px-4 py-3"
                                            style={{ borderColor: 'var(--border-light)' }}
                                        >
                                            <div className="flex items-center gap-2 mb-2.5">
                                                <i
                                                    className="fas fa-industry text-[10px]"
                                                    style={{ color: accentColor }}
                                                />
                                                <span
                                                    className="text-[11px] font-semibold uppercase tracking-[0.5px]"
                                                    style={{ color: 'var(--text-secondary)' }}
                                                >
                                                    Effective Mixer Count
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {stats.map((s) => {
                                                    const maxCount = Math.max(...stats.map((x) => x.base), 1)
                                                    const pct = Math.round((s.eff / maxCount) * 100)
                                                    const isLow = s.send > 0 && s.eff < s.base * 0.5
                                                    return (
                                                        <div key={s.code} className="flex items-center gap-3 text-xs">
                                                            <span
                                                                className="font-bold w-8"
                                                                style={{ color: 'var(--text-primary)' }}
                                                            >
                                                                {s.code}
                                                            </span>
                                                            <div
                                                                className="flex-1 h-[5px] rounded-full overflow-hidden"
                                                                style={{ background: 'var(--border-light)' }}
                                                            >
                                                                <div
                                                                    className="h-full rounded-full"
                                                                    style={{
                                                                        width: `${Math.max(pct, 5)}%`,
                                                                        background: isLow ? '#ef4444' : accentColor
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="font-bold min-w-[20px] text-right">
                                                                {s.eff}
                                                            </span>
                                                            <span className="text-[10px] min-w-[36px] text-right">
                                                                {s.send > 0 && (
                                                                    <span className="text-[#dc2626]">
                                                                        -{s.send} out
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="text-[10px] min-w-[28px]">
                                                                {s.recv > 0 && (
                                                                    <span className="text-[#16a34a]">+{s.recv} in</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Summary stats */}
                                    <div
                                        className="flex border-b"
                                        style={{
                                            borderColor: 'var(--border-light)',
                                            background: 'var(--bg-secondary)'
                                        }}
                                    >
                                        <div
                                            className="flex-1 py-3 text-center border-r"
                                            style={{ borderColor: 'var(--border-light)' }}
                                        >
                                            <div
                                                className="text-xl font-bold"
                                                style={{
                                                    fontFamily: 'var(--font-heading, Rajdhani, sans-serif)',
                                                    color: accentColor
                                                }}
                                            >
                                                {validAssignmentCount}
                                            </div>
                                            <div
                                                className="text-[9px] font-semibold uppercase tracking-[0.5px]"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                Routes
                                            </div>
                                        </div>
                                        <div
                                            className="flex-1 py-3 text-center border-r"
                                            style={{ borderColor: 'var(--border-light)' }}
                                        >
                                            <div
                                                className="text-xl font-bold"
                                                style={{
                                                    fontFamily: 'var(--font-heading, Rajdhani, sans-serif)',
                                                    color: accentColor
                                                }}
                                            >
                                                {totalOps}
                                            </div>
                                            <div
                                                className="text-[9px] font-semibold uppercase tracking-[0.5px]"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                Operators
                                            </div>
                                        </div>
                                        <div
                                            className="flex-1 py-3 text-center border-r"
                                            style={{ borderColor: 'var(--border-light)' }}
                                        >
                                            <div
                                                className="text-xl font-bold"
                                                style={{
                                                    fontFamily: 'var(--font-heading, Rajdhani, sans-serif)'
                                                }}
                                            >
                                                {earliestClockIn || '--:--'}
                                            </div>
                                            <div
                                                className="text-[9px] font-semibold uppercase tracking-[0.5px]"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                Earliest In
                                            </div>
                                        </div>
                                        <div className="flex-1 py-3 text-center">
                                            <div
                                                className="text-xl font-bold"
                                                style={{
                                                    fontFamily: 'var(--font-heading, Rajdhani, sans-serif)',
                                                    color:
                                                        shiftSpanHours > OVERTIME_THRESHOLD_HOURS
                                                            ? '#ef4444'
                                                            : 'var(--text-primary)'
                                                }}
                                            >
                                                {shiftSpanHours ? `${shiftSpanHours}h` : '--'}
                                            </div>
                                            <div
                                                className="text-[9px] font-semibold uppercase tracking-[0.5px]"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                Shift Span
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border-light)' }}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i
                                                className="fas fa-sticky-note text-[10px]"
                                                style={{ color: accentColor }}
                                            />
                                            <span
                                                className="text-[11px] font-semibold uppercase tracking-[0.5px]"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                Notes
                                            </span>
                                        </div>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Add notes..."
                                            rows={3}
                                            className="border rounded-md text-xs outline-none py-1.5 px-2.5 resize-none w-full"
                                            style={{
                                                background: 'var(--bg-secondary)',
                                                borderColor: 'var(--border-light)',
                                                color: 'var(--text-primary)'
                                            }}
                                        />
                                    </div>

                                    {/* Plant Production — yards per hour per operator */}
                                    {stats.length > 0 && (
                                        <div
                                            className="border-b px-4 py-3"
                                            style={{ borderColor: 'var(--border-light)' }}
                                        >
                                            <div className="flex items-center gap-2 mb-3">
                                                <i
                                                    className="fas fa-tachometer-alt text-[10px]"
                                                    style={{ color: accentColor }}
                                                />
                                                <span
                                                    className="text-[11px] font-semibold uppercase tracking-[0.5px]"
                                                    style={{ color: 'var(--text-secondary)' }}
                                                >
                                                    Production
                                                </span>
                                                <div className="flex-1" />
                                                <label
                                                    className="flex items-center gap-1.5 border-none rounded-md cursor-pointer text-[10px] font-semibold px-2 py-1"
                                                    style={{
                                                        background: 'var(--bg-tertiary)',
                                                        color: 'var(--text-secondary)'
                                                    }}
                                                    title="Import from DailyOrder.html"
                                                >
                                                    <i className="fas fa-file-import text-[9px]" />
                                                    Import
                                                    <input
                                                        type="file"
                                                        accept=".html,.htm"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            if (e.target.files?.[0])
                                                                importDailyOrderHtml(e.target.files[0])
                                                            e.target.value = ''
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                            <div className="flex flex-col gap-2.5">
                                                {stats.map((s) => {
                                                    const prod = plantProduction[s.code] || {}
                                                    const firstMins = timeToMinutes(prod.firstJobTime)
                                                    const lastMins = timeToMinutes(prod.lastJobTime)
                                                    const hours =
                                                        firstMins !== null && lastMins !== null && lastMins > firstMins
                                                            ? (lastMins - firstMins) / 60
                                                            : null
                                                    const yardage = parseFloat(prod.totalYardage) || 0
                                                    const yardsPerHrPerOp =
                                                        hours && yardage && s.eff > 0
                                                            ? Math.round((yardage / (hours * s.eff)) * 10) / 10
                                                            : null
                                                    return (
                                                        <div
                                                            key={s.code}
                                                            className="rounded-lg p-2.5"
                                                            style={{
                                                                background: 'var(--bg-secondary)',
                                                                border: '1px solid var(--border-light)'
                                                            }}
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span
                                                                    className="text-xs font-bold"
                                                                    style={{ color: 'var(--text-primary)' }}
                                                                >
                                                                    {s.code}
                                                                </span>
                                                                <span
                                                                    className="text-[10px] font-medium"
                                                                    style={{ color: 'var(--text-secondary)' }}
                                                                >
                                                                    {s.eff} operator{s.eff !== 1 ? 's' : ''}
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-1.5">
                                                                <div>
                                                                    <div
                                                                        className="text-[9px] font-semibold uppercase tracking-[0.3px] mb-0.5"
                                                                        style={{ color: 'var(--text-secondary)' }}
                                                                    >
                                                                        First Job
                                                                    </div>
                                                                    <TimeInput
                                                                        value={prod.firstJobTime || ''}
                                                                        onChange={(val) =>
                                                                            updatePlantProduction(
                                                                                s.code,
                                                                                'firstJobTime',
                                                                                val
                                                                            )
                                                                        }
                                                                        className="!w-full"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <div
                                                                        className="text-[9px] font-semibold uppercase tracking-[0.3px] mb-0.5"
                                                                        style={{ color: 'var(--text-secondary)' }}
                                                                    >
                                                                        Last Job
                                                                    </div>
                                                                    <TimeInput
                                                                        value={prod.lastJobTime || ''}
                                                                        onChange={(val) =>
                                                                            updatePlantProduction(
                                                                                s.code,
                                                                                'lastJobTime',
                                                                                val
                                                                            )
                                                                        }
                                                                        className="!w-full"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <div
                                                                        className="text-[9px] font-semibold uppercase tracking-[0.3px] mb-0.5"
                                                                        style={{ color: 'var(--text-secondary)' }}
                                                                    >
                                                                        Yards
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        value={prod.totalYardage || ''}
                                                                        onChange={(e) =>
                                                                            updatePlantProduction(
                                                                                s.code,
                                                                                'totalYardage',
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        placeholder="0"
                                                                        className="border rounded-md text-xs outline-none font-mono text-center py-1 px-1 w-full"
                                                                        style={{
                                                                            backgroundColor: 'var(--bg-primary)',
                                                                            borderColor: 'var(--border-medium)',
                                                                            color: 'var(--text-primary)'
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            {yardsPerHrPerOp !== null && (
                                                                <div
                                                                    className="flex items-center justify-between mt-2 pt-2 border-t"
                                                                    style={{ borderColor: 'var(--border-light)' }}
                                                                >
                                                                    <span
                                                                        className="text-[10px] font-medium"
                                                                        style={{ color: 'var(--text-secondary)' }}
                                                                    >
                                                                        Yards / Hr / Op
                                                                    </span>
                                                                    <span
                                                                        className="text-sm font-bold"
                                                                        style={{
                                                                            fontFamily:
                                                                                'var(--font-heading, Rajdhani, sans-serif)',
                                                                            color: accentColor
                                                                        }}
                                                                    >
                                                                        {yardsPerHrPerOp}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Auto-save indicator */}
                                    <div className="px-4 py-2">
                                        <span className="text-[10px] font-semibold" style={{ color: accentColor }}>
                                            <i className="fas fa-check-circle mr-1" />
                                            Auto-saved
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default PlanView
