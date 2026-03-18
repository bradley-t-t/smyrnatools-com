import { useMemo } from 'react'

import {
    addMinutesToTime,
    DEFAULT_STAGGER_MINUTES,
    GAP_THRESHOLD_MINUTES,
    OVERTIME_THRESHOLD_HOURS,
    parseTime
} from '../../utils/PlanUtility'

export function usePlanInsights({
    assignments,
    calcClockIn,
    mixerCountsByPlant,
    plants,
    getTravelTime,
    travelTimes,
    shiftSpanHours: shiftSpanOverride
}) {
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

    const stats = getStats()
    const totalOps = assignments.reduce((sum, a) => sum + (parseInt(a.driverCount) || 0), 0)
    const validAssignmentCount = assignments.filter((a) => a.fromPlant && a.toPlant).length

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

    const latestTime = useMemo(() => {
        let latest = null
        assignments.forEach((a) => {
            if (!a.fromPlant || !a.toPlant) return
            const count = parseInt(a.driverCount) || 1
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

    const shiftSpanHours = useMemo(() => {
        if (!earliestClockIn || !latestTime) return null
        const [h1, m1] = parseTime(earliestClockIn)
        const [h2, m2] = parseTime(latestTime)
        const minutes = h2 * 60 + m2 - (h1 * 60 + m1)
        return minutes > 0 ? Math.round((minutes / 60) * 10) / 10 : null
    }, [earliestClockIn, latestTime])

    const planInsights = useMemo(() => {
        const warnings = []
        const suggestions = []
        const validAssignments = assignments.filter((a) => a.fromPlant && a.toPlant)

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

        validAssignments.forEach((a) => {
            if (getTravelTime(a.fromPlant, a.toPlant) === null) {
                warnings.push({
                    icon: 'fa-route',
                    message: `No travel time set for ${a.fromPlant} \u2192 ${a.toPlant}`,
                    type: 'travel'
                })
            }
        })

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

        if (shiftSpanHours && shiftSpanHours > OVERTIME_THRESHOLD_HOURS) {
            warnings.push({
                icon: 'fa-clock',
                message: `Shift spans ~${shiftSpanHours}h \u2014 exceeds ${OVERTIME_THRESHOLD_HOURS}h threshold`,
                type: 'overtime'
            })
        }

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

    return {
        earliestClockIn,
        latestTime,
        planInsights,
        shiftSpanHours,
        stats,
        totalOps,
        validAssignmentCount
    }
}
