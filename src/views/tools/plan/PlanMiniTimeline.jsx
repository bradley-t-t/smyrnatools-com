import React, { useMemo } from 'react'

import {
    addMinutesToTime,
    BUFFER_MINUTES,
    DEFAULT_STAGGER_MINUTES,
    LANE_COLORS,
    MAX_YPH,
    PRE_TRIP_MINUTES,
    TIMELINE_HOURS,
    TIMELINE_START_HOUR,
    timeToMinutes,
    timeToPercent
} from '../../../utils/PlanUtility'

const SENT_COLOR = '#c2703a'
const RECV_COLOR = '#3b7dd8'
const HOME_COLOR = '#2d8659'
const MINI_ROW_H = 36

/**
 * Compact timeline preview shown below the assignment list in the planner view.
 * Extracted from PlanView to reduce file size.
 */
export default function PlanMiniTimeline({
    accentColor,
    assignments,
    getTravelTime,
    mixerCountsByPlant,
    plantProduction
}) {
    const { allLanes, hourLabels, miniPlantRows } = useMemo(() => {
        const lanes = []
        assignments.forEach((a, idx) => {
            if (!a.fromPlant || !a.toPlant || !a.time) return
            const count = parseInt(a.driverCount) || 1
            const travelMin = getTravelTime(a.fromPlant, a.toPlant)
            const showTravel = travelMin !== null && !a.loadFromPlant
            const totalPreDeparture = showTravel ? travelMin + BUFFER_MINUTES + PRE_TRIP_MINUTES : PRE_TRIP_MINUTES

            const buildLane = (arriveTime, leaveTime, opLabel) => {
                const clockIn = arriveTime ? addMinutesToTime(arriveTime, -totalPreDeparture) : null
                const preTripEnd = clockIn ? addMinutesToTime(clockIn, PRE_TRIP_MINUTES) : null
                const returnEnd = showTravel && leaveTime ? addMinutesToTime(leaveTime, travelMin) : null
                return {
                    arriveTime,
                    clockIn,
                    preTripEnd,
                    leaveTime: leaveTime || null,
                    returnEnd,
                    fromPlant: a.fromPlant,
                    toPlant: a.toPlant,
                    hasTravelTime: showTravel,
                    travel: showTravel ? travelMin : null,
                    loadFromPlant: a.loadFromPlant,
                    label: opLabel,
                    color: LANE_COLORS[idx % LANE_COLORS.length]
                }
            }

            if (count > 1 && a.timeMode === 'custom' && a.customTimes?.length) {
                a.customTimes.slice(0, count).forEach((ct, i) => {
                    if (ct.time)
                        lanes.push(buildLane(ct.time, ct.leaveTime, `${a.fromPlant}\u2192${a.toPlant} #${i + 1}`))
                })
            } else if (count > 1) {
                for (let j = 0; j < count; j++) {
                    const arr = addMinutesToTime(a.time, j * (a.staggerMinutes || DEFAULT_STAGGER_MINUTES))
                    if (arr) lanes.push(buildLane(arr, a.leaveTime, `${a.fromPlant}\u2192${a.toPlant} #${j + 1}`))
                }
            } else {
                lanes.push(buildLane(a.time, a.leaveTime, `${a.fromPlant}\u2192${a.toPlant}`))
            }
        })

        const involvedPlants = [...new Set([...lanes.map((l) => l.fromPlant), ...lanes.map((l) => l.toPlant)])].sort()

        const rows = involvedPlants.map((plant) => {
            const sent = lanes
                .filter((l) => l.fromPlant === plant)
                .sort((a, b) => (a.clockIn || a.arriveTime).localeCompare(b.clockIn || b.arriveTime))
            const recv = lanes
                .filter((l) => l.toPlant === plant)
                .sort((a, b) => (a.clockIn || a.arriveTime).localeCompare(b.clockIn || b.arriveTime))
            const base = mixerCountsByPlant[plant] || 0
            const homeCount = Math.max(0, base - sent.length)
            const homeOffset = homeCount > 0 ? 1 : 0
            const laneCount = Math.max(1, sent.length + recv.length + homeOffset)
            return { plant, sent, recv, base, homeCount, homeOffset, laneCount }
        })

        const labels = Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => {
            const h = TIMELINE_START_HOUR + i
            return h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`
        })

        return { allLanes: lanes, hourLabels: labels, miniPlantRows: rows }
    }, [assignments, getTravelTime, mixerCountsByPlant])

    if (!allLanes.length) {
        return (
            <div className="text-[11px] py-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                Add assignments with times to see the timeline
            </div>
        )
    }

    return (
        <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: 'var(--border-light)', background: 'var(--bg-secondary)' }}
        >
            {/* Hour header */}
            <div className="relative flex" style={{ height: 28 }}>
                <div
                    className="shrink-0 flex items-center px-3 text-[10px] font-bold uppercase tracking-wider border-b border-r"
                    style={{
                        width: 100,
                        color: 'var(--text-secondary)',
                        borderColor: 'var(--border-light)',
                        background: 'var(--bg-tertiary)'
                    }}
                >
                    Plant
                </div>
                <div
                    className="flex-1 relative border-b"
                    style={{ borderColor: 'var(--border-light)', background: 'var(--bg-tertiary)' }}
                >
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
                                    style={{ background: 'var(--border-light)', opacity: isWorkHour ? 1 : 0.4 }}
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
            {/* Plant rows */}
            {miniPlantRows.map((pr, prIdx) => (
                <PlantRow
                    key={pr.plant}
                    accentColor={accentColor}
                    hourLabels={hourLabels}
                    plantProduction={plantProduction}
                    plantRow={pr}
                    rowIndex={prIdx}
                />
            ))}
        </div>
    )
}

/** Single plant row in the mini-timeline. */
function PlantRow({ accentColor, hourLabels, plantProduction, plantRow: pr, rowIndex: prIdx }) {
    const prod = plantProduction[pr.plant] || {}
    const startPct = timeToPercent(prod.firstJobTime)
    const endPct = timeToPercent(prod.lastJobTime)
    const hasProd = startPct != null && endPct != null && endPct > startPct
    const effectiveOps = pr.homeCount + pr.recv.length
    const firstMins = hasProd ? timeToMinutes(prod.firstJobTime) : null
    const lastMins = hasProd ? timeToMinutes(prod.lastJobTime) : null
    const hrs = firstMins !== null && lastMins !== null && lastMins > firstMins ? (lastMins - firstMins) / 60 : null
    const yds = hasProd ? parseFloat(prod.totalYardage) || 0 : 0
    const ydsPerHrOp = hrs && yds && effectiveOps > 0 ? Math.round((yds / (hrs * effectiveOps)) * 10) / 10 : null
    const overMax = ydsPerHrOp !== null && ydsPerHrOp > MAX_YPH

    return (
        <div className="flex" style={{ borderBottom: '2px solid var(--border-light)' }}>
            {/* Plant label */}
            <div
                className="shrink-0 flex flex-col justify-center px-3 border-r"
                style={{
                    width: 100,
                    borderColor: 'var(--border-light)',
                    height: MINI_ROW_H * pr.laneCount,
                    background: prIdx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'
                }}
            >
                <div className="flex items-center gap-1.5">
                    <i className="fas fa-industry text-[9px]" style={{ color: accentColor }} />
                    <span className="text-[12px] font-extrabold uppercase tracking-wide" style={{ color: accentColor }}>
                        {pr.plant}
                    </span>
                    {pr.base > 0 && (
                        <span
                            className="text-[9px] font-semibold rounded-full px-1.5 py-px"
                            style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}
                        >
                            {pr.base}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                    {pr.sent.length > 0 && (
                        <span
                            className="flex items-center gap-0.5 text-[9px] font-bold rounded px-1 py-px"
                            style={{ color: SENT_COLOR, background: `${SENT_COLOR}15` }}
                        >
                            <i className="fas fa-arrow-right-from-bracket text-[7px]" />
                            {pr.sent.length}
                        </span>
                    )}
                    {pr.recv.length > 0 && (
                        <span
                            className="flex items-center gap-0.5 text-[9px] font-bold rounded px-1 py-px"
                            style={{ color: RECV_COLOR, background: `${RECV_COLOR}15` }}
                        >
                            <i className="fas fa-arrow-right-to-bracket text-[7px]" />
                            {pr.recv.length}
                        </span>
                    )}
                </div>
            </div>
            {/* Timeline area */}
            <div
                className="flex-1 relative"
                style={{
                    height: MINI_ROW_H * pr.laneCount,
                    background: prIdx % 2 === 0 ? `${accentColor}06` : `${accentColor}08`
                }}
            >
                {/* Sent/Recv separator */}
                {pr.sent.length > 0 && pr.recv.length > 0 && (
                    <div
                        className="absolute left-0 right-0"
                        style={{
                            top: (pr.sent.length + pr.homeOffset) * MINI_ROW_H - 1,
                            height: 2,
                            background: `repeating-linear-gradient(90deg, ${RECV_COLOR}30 0, ${RECV_COLOR}30 4px, transparent 4px, transparent 8px)`
                        }}
                    />
                )}
                {/* Hour grid lines */}
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
                {pr.homeCount > 0 &&
                    (() => {
                        const homeTop = 2
                        const blockH = MINI_ROW_H - 4
                        return (
                            <>
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
                                        <span
                                            className="text-[9px] font-extrabold flex items-center gap-1"
                                            style={{ color: HOME_COLOR }}
                                        >
                                            <i className="fas fa-hard-hat text-[8px]" />
                                            {effectiveOps}
                                            {pr.recv.length > 0 && (
                                                <span style={{ color: RECV_COLOR, fontWeight: 600 }}>
                                                    (+{pr.recv.length})
                                                </span>
                                            )}
                                        </span>
                                        {hasProd && (
                                            <span
                                                className="text-[9px] font-semibold"
                                                style={{ color: `${HOME_COLOR}CC` }}
                                            >
                                                {prod.firstJobTime}–{prod.lastJobTime}
                                            </span>
                                        )}
                                        {yds > 0 && (
                                            <span
                                                className="text-[9px] font-bold rounded-full px-1.5 py-px"
                                                style={{ color: HOME_COLOR, background: `${HOME_COLOR}15` }}
                                            >
                                                {prod.totalYardage} yds
                                            </span>
                                        )}
                                        {ydsPerHrOp !== null && (
                                            <span
                                                className="text-[9px] font-bold rounded-full px-1.5 py-px"
                                                style={{
                                                    color: overMax ? '#fff' : HOME_COLOR,
                                                    background: overMax ? '#ef444490' : `${HOME_COLOR}15`
                                                }}
                                            >
                                                {ydsPerHrOp} yph
                                            </span>
                                        )}
                                        {overMax && (
                                            <span
                                                className="text-[9px] font-extrabold flex items-center gap-0.5"
                                                style={{ color: '#ef4444' }}
                                            >
                                                <i className="fas fa-triangle-exclamation text-[8px]" />
                                                Likely behind
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </>
                        )
                    })()}
                {/* Sent lanes */}
                {pr.sent.map((lane, i) => (
                    <MiniBlock key={`s-${i}`} lane={lane} laneIdx={i} isSent homeOffset={pr.homeOffset} />
                ))}
                {/* Received lanes */}
                {pr.recv.map((lane, i) => (
                    <MiniBlock
                        key={`r-${i}`}
                        lane={lane}
                        laneIdx={pr.sent.length + i}
                        isSent={false}
                        homeOffset={pr.homeOffset}
                    />
                ))}
            </div>
        </div>
    )
}

/** Single timeline block (pre-trip, travel, on-site, return) for one operator lane. */
function MiniBlock({ lane, laneIdx, isSent, homeOffset }) {
    const blockColor = isSent ? SENT_COLOR : RECV_COLOR
    const clockInPct = timeToPercent(lane.clockIn)
    const preTripEndPct = timeToPercent(lane.preTripEnd)
    const arrivePct = timeToPercent(lane.arriveTime)
    const leavePct = timeToPercent(lane.leaveTime)
    const returnEndPct = timeToPercent(lane.returnEnd)
    const top = (laneIdx + homeOffset) * MINI_ROW_H + 3
    const blockH = MINI_ROW_H - 6
    const routeLabel = isSent ? `\u2192 ${lane.toPlant}` : `\u2190 ${lane.fromPlant}`
    const dirIcon = isSent ? 'fa-arrow-right-from-bracket' : 'fa-arrow-right-to-bracket'

    const preW = clockInPct != null && preTripEndPct != null ? Math.max(preTripEndPct - clockInPct, 0) : 0
    const travelW =
        lane.hasTravelTime && preTripEndPct != null && arrivePct != null ? Math.max(arrivePct - preTripEndPct, 0) : 0
    const siteStart = arrivePct ?? preTripEndPct ?? clockInPct
    const siteEnd = leavePct ?? (siteStart != null ? Math.min(siteStart + 2, 100) : null)
    const siteW = siteStart != null && siteEnd != null ? Math.max(siteEnd - siteStart, 0.8) : 0
    const returnW = leavePct != null && returnEndPct != null ? Math.max(returnEndPct - leavePct, 0) : 0

    return (
        <>
            {/* Connector line */}
            {clockInPct != null && siteStart != null && (preW > 0 || travelW > 0) && (
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
            {/* Pre-trip */}
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
            {/* Travel */}
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
            {/* On-site */}
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
            {/* Return travel */}
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
        </>
    )
}
