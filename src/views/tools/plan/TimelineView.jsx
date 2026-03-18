import React, { useMemo, useState } from 'react'

import {
    BUFFER_MINUTES,
    DAY_WIDTH,
    DEFAULT_STAGGER_MINUTES,
    getOffsetDate,
    LABEL_WIDTH,
    LANE_COLORS,
    MAX_YPH,
    minutesToTime,
    percentToTime,
    PRE_TRIP_MINUTES,
    TARGET_YPH,
    TIMELINE_HOURS,
    TIMELINE_START_HOUR,
    timeToMinutes,
    timeToPercent
} from '../../../utils/PlanUtility'

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
                // Return travel: after leave time, travel back to home plant
                const returnEnd = showTravel && leaveTime ? addMinutesToTime(leaveTime, travelMin) : null

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
                    returnEnd,
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

                // Get end-of-shift times from day A (returnEnd if available, else leaveTime) and start times from day B
                const leaveMinsA = lanesA
                    .map((l, li) => ({ li, mins: timeToMinutes(l.returnEnd ?? l.leaveTime) }))
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

    // Lane colors — high contrast, distinct hues for instant recognition
    const SENT_COLOR = '#c2703a' // warm copper — operators leaving this plant
    const RECV_COLOR = '#3b7dd8' // clear blue — operators arriving at this plant
    const HOME_COLOR = '#2d8659' // rich green — operators staying at home plant

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
                        {plantRows.map((pr, prIdx) => (
                            <React.Fragment key={pr.plant}>
                                <div
                                    className="flex flex-col justify-center px-3 border-b border-r"
                                    style={{
                                        height: ROW_HEIGHT * pr.laneCount,
                                        borderColor: 'var(--border-light)',
                                        background: prIdx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                                        borderBottomWidth: 2
                                    }}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <i className="fas fa-industry text-[9px]" style={{ color: accentColor }} />
                                        <span
                                            className="text-[12px] font-extrabold uppercase tracking-wide"
                                            style={{ color: accentColor }}
                                        >
                                            {pr.plant}
                                        </span>
                                        {mixerCountsByPlant[pr.plant] > 0 && (
                                            <span
                                                className="text-[9px] font-semibold rounded-full px-1.5 py-px"
                                                style={{
                                                    color: 'var(--text-secondary)',
                                                    background: 'var(--bg-tertiary)'
                                                }}
                                            >
                                                {mixerCountsByPlant[pr.plant]}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        {pr.sentCount > 0 && (
                                            <span
                                                className="flex items-center gap-0.5 text-[9px] font-bold rounded px-1 py-px"
                                                style={{
                                                    color: SENT_COLOR,
                                                    background: `${SENT_COLOR}15`
                                                }}
                                            >
                                                <i className="fas fa-arrow-right-from-bracket text-[7px]" />
                                                {pr.sentCount}
                                            </span>
                                        )}
                                        {pr.recvCount > 0 && (
                                            <span
                                                className="flex items-center gap-0.5 text-[9px] font-bold rounded px-1 py-px"
                                                style={{
                                                    color: RECV_COLOR,
                                                    background: `${RECV_COLOR}15`
                                                }}
                                            >
                                                <i className="fas fa-arrow-right-to-bracket text-[7px]" />
                                                {pr.recvCount}
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
                                        {hourLabels.map((label, i) => {
                                            const hour = TIMELINE_START_HOUR + i
                                            const isWorkHour = hour >= 4 && hour <= 18
                                            return (
                                                <div
                                                    key={i}
                                                    className="absolute top-0 bottom-0 flex items-end pb-0.5"
                                                    style={{ left: `${(i / TIMELINE_HOURS) * 100}%` }}
                                                >
                                                    <div
                                                        className="absolute top-0 bottom-0 w-px"
                                                        style={{
                                                            background: 'var(--border-light)',
                                                            opacity: isWorkHour ? 1 : 0.4
                                                        }}
                                                    />
                                                    <span
                                                        className="text-[9px] pl-0.5"
                                                        style={{
                                                            color: 'var(--text-secondary)',
                                                            opacity: isWorkHour ? 0.9 : 0.4,
                                                            fontWeight: isWorkHour ? 600 : 400
                                                        }}
                                                    >
                                                        {label}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Lanes for each plant row */}
                                {plantRows.map((pr, prIdx) => {
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
                                    // Home/production bar sits at row 0; help lanes shift down by 1
                                    const homeOffset = homeCount > 0 ? 1 : 0

                                    const renderBlock = (lane, laneIdx, isSent) => {
                                        const blockColor = isSent ? SENT_COLOR : RECV_COLOR
                                        const clockInPct = timeToPercent(lane.clockIn)
                                        const preTripEndPct = timeToPercent(lane.preTripEnd)
                                        const arrivePct = timeToPercent(lane.arriveTime)
                                        const leavePct = timeToPercent(lane.leaveTime)
                                        const returnEndPct = timeToPercent(lane.returnEnd)
                                        const top = (laneIdx + homeOffset) * ROW_HEIGHT + 3
                                        const blockH = ROW_HEIGHT - 6
                                        const routeLabel = isSent
                                            ? `\u2192 ${lane.toPlant}`
                                            : `\u2190 ${lane.fromPlant}`
                                        const dirIcon = isSent
                                            ? 'fa-arrow-right-from-bracket'
                                            : 'fa-arrow-right-to-bracket'

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
                                        // Return travel: leave -> returnEnd
                                        const returnW =
                                            leavePct != null && returnEndPct != null
                                                ? Math.max(returnEndPct - leavePct, 0)
                                                : 0

                                        return (
                                            <React.Fragment key={`${isSent ? 's' : 'r'}-${laneIdx}`}>
                                                {/* Connector line spanning pre-trip through return travel */}
                                                {clockInPct != null &&
                                                    siteStart != null &&
                                                    (preW > 0 || travelW > 0) && (
                                                        <div
                                                            className="absolute pointer-events-none"
                                                            style={{
                                                                left: `${clockInPct}%`,
                                                                width: `${(returnEndPct ?? siteStart + siteW) - clockInPct}%`,
                                                                top: top + blockH / 2 - 1,
                                                                height: 2,
                                                                background: `${blockColor}30`
                                                            }}
                                                        />
                                                    )}
                                                {/* Pre-trip block */}
                                                {preW > 0 && (
                                                    <div
                                                        className="absolute rounded-sm flex items-center justify-center overflow-visible"
                                                        style={{
                                                            left: `${clockInPct}%`,
                                                            width: `${preW}%`,
                                                            minWidth: 8,
                                                            top,
                                                            height: blockH,
                                                            background: `${blockColor}18`,
                                                            borderLeft: `3px solid ${blockColor}80`
                                                        }}
                                                    >
                                                        <span
                                                            className="text-[8px] font-bold whitespace-nowrap px-0.5 uppercase"
                                                            style={{ color: `${blockColor}90` }}
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
                                                            minWidth: 8,
                                                            top: top + 2,
                                                            height: blockH - 4,
                                                            background: `${blockColor}20`,
                                                            borderRadius: 3,
                                                            border: `1px dashed ${blockColor}50`
                                                        }}
                                                    >
                                                        <span
                                                            className="text-[8px] font-semibold whitespace-nowrap px-1"
                                                            style={{ color: `${blockColor}BB` }}
                                                        >
                                                            <i className="fas fa-route text-[7px] mr-0.5" />
                                                            {lane.travel}m
                                                        </span>
                                                    </div>
                                                )}
                                                {/* On-site / arrival block — solid pill */}
                                                {siteW > 0 && siteStart != null && (
                                                    <div
                                                        className="absolute flex items-center overflow-visible"
                                                        style={{
                                                            left: `${siteStart}%`,
                                                            width: `${siteW}%`,
                                                            top,
                                                            height: blockH,
                                                            background: blockColor,
                                                            borderRadius: returnW > 0 ? '4px 0 0 4px' : 4,
                                                            boxShadow: `0 1px 3px ${blockColor}40`
                                                        }}
                                                    >
                                                        <span className="text-[9px] font-bold text-white px-1.5 whitespace-nowrap flex items-center gap-1">
                                                            <i className={`fas ${dirIcon} text-[7px] opacity-70`} />
                                                            {routeLabel} {lane.arriveTime}
                                                            {lane.leaveTime ? `\u2013${lane.leaveTime}` : ''}
                                                            {lane.loadFromPlant ? ' LD' : ''}
                                                        </span>
                                                    </div>
                                                )}
                                                {/* Return travel block — after leave time */}
                                                {returnW > 0 && (
                                                    <div
                                                        className="absolute flex items-center justify-center overflow-visible"
                                                        style={{
                                                            left: `${leavePct}%`,
                                                            width: `${returnW}%`,
                                                            minWidth: 8,
                                                            top: top + 2,
                                                            height: blockH - 4,
                                                            background: `${blockColor}20`,
                                                            borderRadius: '0 3px 3px 0',
                                                            border: `1px dashed ${blockColor}50`,
                                                            borderLeft: 'none'
                                                        }}
                                                    >
                                                        <span
                                                            className="text-[8px] font-semibold whitespace-nowrap px-1"
                                                            style={{ color: `${blockColor}BB` }}
                                                        >
                                                            <i className="fas fa-rotate-left text-[7px] mr-0.5" />
                                                            {lane.travel}m
                                                        </span>
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        )
                                    }

                                    return (
                                        <div
                                            key={pr.plant}
                                            className="relative cursor-crosshair select-none"
                                            style={{
                                                height: ROW_HEIGHT * pr.laneCount,
                                                borderBottom: '2px solid var(--border-light)',
                                                background:
                                                    prIdx % 2 === 0
                                                        ? isCurrent
                                                            ? `${accentColor}06`
                                                            : 'transparent'
                                                        : isCurrent
                                                          ? `${accentColor}08`
                                                          : 'var(--bg-secondary)'
                                            }}
                                            onMouseDown={(e) => handleMouseDown(e, dayIdx)}
                                        >
                                            {/* Sent/Recv separator — dashed line with color indicator */}
                                            {sentLanes.length > 0 && recvLanes.length > 0 && (
                                                <div
                                                    className="absolute left-0 right-0"
                                                    style={{
                                                        top: (sentLanes.length + homeOffset) * ROW_HEIGHT - 1,
                                                        height: 2,
                                                        background: `repeating-linear-gradient(90deg, ${RECV_COLOR}30 0, ${RECV_COLOR}30 4px, transparent 4px, transparent 8px)`
                                                    }}
                                                />
                                            )}
                                            {/* Hour grid lines — emphasize work hours (4a-6p) */}
                                            {hourLabels.map((_, j) => {
                                                const hour = TIMELINE_START_HOUR + j
                                                const isWorkHour = hour >= 4 && hour <= 18
                                                return (
                                                    <div
                                                        key={j}
                                                        className="absolute top-0 bottom-0 w-px"
                                                        style={{
                                                            left: `${(j / TIMELINE_HOURS) * 100}%`,
                                                            background: 'var(--border-light)',
                                                            opacity: isWorkHour ? 0.5 : 0.15
                                                        }}
                                                    />
                                                )
                                            })}
                                            {/* Home operators + production bar */}
                                            {(() => {
                                                if (homeCount <= 0) return null
                                                const prod = day.production?.[pr.plant]
                                                const startPct = timeToPercent(prod?.firstJobTime)
                                                const endPct = timeToPercent(prod?.lastJobTime)
                                                const hasProd = startPct != null && endPct != null && endPct > startPct
                                                const homeTop = 2 // First row — above help lanes
                                                const blockH = ROW_HEIGHT - 4

                                                // Production metrics — effective ops = home + received help
                                                const effectiveOps = homeCount + recvLanes.length
                                                const firstMins = hasProd ? timeToMinutes(prod.firstJobTime) : null
                                                const lastMins = hasProd ? timeToMinutes(prod.lastJobTime) : null
                                                const hrs =
                                                    firstMins !== null && lastMins !== null && lastMins > firstMins
                                                        ? (lastMins - firstMins) / 60
                                                        : null
                                                const yds = hasProd ? parseFloat(prod.totalYardage) || 0 : 0
                                                const ydsPerHrOp =
                                                    hrs && yds && effectiveOps > 0
                                                        ? Math.round((yds / (hrs * effectiveOps)) * 10) / 10
                                                        : null
                                                const minNeeded =
                                                    hrs && yds ? Math.ceil(yds / (hrs * TARGET_YPH)) : null
                                                const availableToSend =
                                                    minNeeded !== null ? Math.max(0, effectiveOps - minNeeded) : null
                                                const overMax = ydsPerHrOp !== null && ydsPerHrOp > MAX_YPH
                                                const underTarget =
                                                    ydsPerHrOp !== null &&
                                                    ydsPerHrOp < TARGET_YPH &&
                                                    availableToSend > 0
                                                const leaveOffCount = underTarget ? availableToSend : 0

                                                return (
                                                    <>
                                                        {/* Production time range background stripe */}
                                                        {hasProd && (
                                                            <div
                                                                className="absolute pointer-events-none"
                                                                style={{
                                                                    left: `${startPct}%`,
                                                                    width: `${endPct - startPct}%`,
                                                                    top: 0,
                                                                    bottom: 0,
                                                                    background: `${HOME_COLOR}08`,
                                                                    borderLeft: `2px solid ${HOME_COLOR}25`,
                                                                    borderRight: `2px solid ${HOME_COLOR}25`
                                                                }}
                                                            />
                                                        )}
                                                        {/* Consolidated home bar — pill style */}
                                                        <div
                                                            className="absolute flex items-center overflow-visible pointer-events-none"
                                                            style={{
                                                                left: hasProd ? `${startPct}%` : '1%',
                                                                width: hasProd ? `${endPct - startPct}%` : '98%',
                                                                top: homeTop,
                                                                height: blockH,
                                                                background: `${HOME_COLOR}20`,
                                                                borderRadius: 5,
                                                                borderLeft: `3px solid ${HOME_COLOR}`,
                                                                boxShadow: `inset 0 0 0 1px ${HOME_COLOR}25`
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-2 px-2 whitespace-nowrap">
                                                                {/* Operator count badge — effective = home + received */}
                                                                <span
                                                                    className="text-[9px] font-extrabold flex items-center gap-1"
                                                                    style={{ color: HOME_COLOR }}
                                                                >
                                                                    <i className="fas fa-hard-hat text-[8px]" />
                                                                    {effectiveOps}
                                                                    {recvLanes.length > 0 && (
                                                                        <span
                                                                            style={{
                                                                                color: RECV_COLOR,
                                                                                fontWeight: 600
                                                                            }}
                                                                        >
                                                                            (+{recvLanes.length})
                                                                        </span>
                                                                    )}
                                                                </span>
                                                                {/* Time range */}
                                                                {hasProd && (
                                                                    <span
                                                                        className="text-[9px] font-semibold"
                                                                        style={{ color: `${HOME_COLOR}CC` }}
                                                                    >
                                                                        {prod.firstJobTime}–{prod.lastJobTime}
                                                                    </span>
                                                                )}
                                                                {/* Yardage badge */}
                                                                {yds > 0 && (
                                                                    <span
                                                                        className="text-[9px] font-bold rounded-full px-1.5 py-px"
                                                                        style={{
                                                                            color: HOME_COLOR,
                                                                            background: `${HOME_COLOR}15`
                                                                        }}
                                                                    >
                                                                        {prod.totalYardage} yds
                                                                    </span>
                                                                )}
                                                                {/* YPH metric */}
                                                                {ydsPerHrOp !== null && (
                                                                    <span
                                                                        className="text-[9px] font-bold rounded-full px-1.5 py-px"
                                                                        style={{
                                                                            color: overMax
                                                                                ? '#fff'
                                                                                : underTarget
                                                                                  ? '#d97706'
                                                                                  : HOME_COLOR,
                                                                            background: overMax
                                                                                ? '#ef444490'
                                                                                : underTarget
                                                                                  ? '#d9770620'
                                                                                  : `${HOME_COLOR}15`
                                                                        }}
                                                                    >
                                                                        {ydsPerHrOp} yph
                                                                    </span>
                                                                )}
                                                                {/* Available to send */}
                                                                {availableToSend !== null && availableToSend > 0 && (
                                                                    <span
                                                                        className="text-[9px] font-bold rounded-full px-1.5 py-px"
                                                                        style={{
                                                                            color: '#16a34a',
                                                                            background: '#16a34a18'
                                                                        }}
                                                                    >
                                                                        <i className="fas fa-paper-plane text-[7px] mr-0.5" />
                                                                        {availableToSend} avail
                                                                    </span>
                                                                )}
                                                                {/* Behind schedule warning */}
                                                                {overMax && (
                                                                    <span
                                                                        className="text-[9px] font-extrabold flex items-center gap-0.5"
                                                                        style={{ color: '#ef4444' }}
                                                                    >
                                                                        <i className="fas fa-triangle-exclamation text-[8px]" />
                                                                        Likely behind
                                                                    </span>
                                                                )}
                                                                {underTarget && (
                                                                    <span
                                                                        className="text-[9px] font-bold rounded-full px-1.5 py-px flex items-center gap-0.5"
                                                                        style={{
                                                                            color: '#d97706',
                                                                            background: '#d9770618'
                                                                        }}
                                                                    >
                                                                        <i className="fas fa-user-minus text-[7px]" />
                                                                        Leave {leaveOffCount} off
                                                                    </span>
                                                                )}
                                                            </div>
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
                                                                    top: (li + homeOffset) * ROW_HEIGHT + 4,
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
                                                                    top: (li + homeOffset) * ROW_HEIGHT + 4,
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

export default TimelineView
