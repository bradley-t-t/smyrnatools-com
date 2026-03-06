import React, { useEffect, useState } from 'react'

import { usePreferences } from '../../app/context/PreferencesContext'
import { useIsMobile } from '../../app/hooks/useIsMobile'
import { PlanService } from '../../services/PlanService'
import { ReportService } from '../../services/ReportService'
import { UserService } from '../../services/UserService'
const PRE_TRIP_MINUTES = 15
const BUFFER_MINUTES = 5
const AUTOSAVE_DELAY_MS = 1000
const DEFAULT_STAGGER_MINUTES = 10
const DROPDOWN_ARROW_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`
const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
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
const createEmptyAssignment = () => ({
    customTimes: [],
    driverCount: 1,
    fromPlant: '',
    id: Date.now(),
    leaveTime: '',
    staggerMinutes: DEFAULT_STAGGER_MINUTES,
    time: '',
    timeMode: 'stagger',
    toPlant: ''
})
const baseInputStyle = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    padding: '10px 12px'
}
const timeInputBaseStyle = { ...baseInputStyle, fontFamily: 'monospace', textAlign: 'center', width: 80 }
const selectBaseStyle = {
    ...baseInputStyle,
    appearance: 'none',
    backgroundImage: DROPDOWN_ARROW_SVG,
    backgroundPosition: 'right 12px center',
    backgroundRepeat: 'no-repeat',
    cursor: 'pointer',
    paddingRight: 32
}
const Pill = ({ background, color, children }) => (
    <div style={{ background, borderRadius: 6, color, fontSize: 12, padding: '6px 10px' }}>{children}</div>
)
const PlantSelect = ({ value, onChange, plants, excludeValue, placeholder, style }) => (
    <select value={value} onChange={onChange} style={{ ...selectBaseStyle, ...style }}>
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
    const [plants, setPlants] = useState([])
    const [mixerCountsByPlant, setMixerCountsByPlant] = useState({})
    const [assignments, setAssignments] = useState([])
    const [generatedMessage, setGeneratedMessage] = useState('')
    const [copied, setCopied] = useState(false)
    const [notes, setNotes] = useState('')
    const [planDate, setPlanDate] = useState(getTomorrowDate)
    const [travelTimes, setTravelTimes] = useState({})
    const [userId, setUserId] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showSettings, setShowSettings] = useState(false)
    const [newTravelTime, setNewTravelTime] = useState({ from: '', minutes: '', to: '' })
    const isMobile = useIsMobile()
    const btnStyle = {
        background: accentColor,
        border: 'none',
        borderRadius: 8,
        color: '#fff',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 500,
        padding: '10px 16px'
    }
    const mobilePadding = isMobile ? '8px 10px' : '10px 12px'
    const mobileFontSize = isMobile ? 13 : 14
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
            let plantList = user?.id ? await ReportService.fetchPlantsForUser(user.id) : []
            if (user?.id) setUserId(user.id)
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
    useEffect(() => {
        if (!userId || !planDate || isLoading) return
        const loadPlan = async () => {
            try {
                const plan = await PlanService.fetchUserPlan(userId, planDate)
                if (plan?.assignments?.length) setAssignments(plan.assignments)
                if (plan?.notes) setNotes(plan.notes)
            } catch {}
        }
        loadPlan()
    }, [userId, planDate, isLoading])
    useEffect(() => {
        if (!userId || !planDate || isLoading) return
        const timeout = setTimeout(async () => {
            try {
                await PlanService.saveUserPlan(userId, planDate, assignments, notes)
            } catch {}
        }, AUTOSAVE_DELAY_MS)
        return () => clearTimeout(timeout)
    }, [userId, planDate, assignments, notes, isLoading])
    const updateAssignment = (id, field, value) =>
        setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
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
                const customTimes = Array.from({ length: a.driverCount }, (_, i) => ({
                    leaveTime: a.leaveTime || '',
                    time: a.time
                        ? addMinutesToTime(a.time, i * (a.staggerMinutes || DEFAULT_STAGGER_MINUTES)) || ''
                        : ''
                }))
                return { ...a, customTimes, timeMode: 'custom' }
            })
        )
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
    const generatePlanMessage = () => {
        const validAssignments = assignments.filter((a) => a.fromPlant && a.toPlant && a.driverCount > 0)
        if (!validAssignments.length) return setGeneratedMessage('Add at least one assignment.')
        const dateStr = new Date(planDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'long' })
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
        setGeneratedMessage(msg.trim())
    }
    const copyToClipboard = async () => {
        if (!generatedMessage) return
        await navigator.clipboard.writeText(generatedMessage)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
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
    if (isLoading) {
        return (
            <div style={{ alignItems: 'center', display: 'flex', height: '100vh', justifyContent: 'center' }}>
                <i className="fas fa-spinner fa-spin" style={{ color: accentColor, fontSize: 24 }}></i>
            </div>
        )
    }
    return (
        <div style={{ background: '#f1f5f9', minHeight: '100vh', padding: isMobile ? 12 : 24 }}>
            <div style={{ margin: '0 auto', maxWidth: 900 }}>
                <div
                    style={{
                        alignItems: 'center',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: isMobile ? 8 : 12,
                        marginBottom: 20
                    }}
                >
                    <h1
                        style={{
                            color: '#1e293b',
                            flex: isMobile ? '1 1 100%' : 1,
                            fontSize: isMobile ? 18 : 22,
                            fontWeight: 700,
                            margin: 0
                        }}
                    >
                        Daily Plan
                    </h1>
                    <input
                        type="date"
                        value={planDate}
                        onChange={(e) => setPlanDate(e.target.value)}
                        style={{
                            ...baseInputStyle,
                            flex: isMobile ? 1 : 'none',
                            fontSize: mobileFontSize,
                            fontWeight: 600,
                            padding: mobilePadding
                        }}
                    />
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        style={{
                            ...btnStyle,
                            background: showSettings ? accentColor : '#e2e8f0',
                            color: showSettings ? '#fff' : '#64748b',
                            padding: mobilePadding
                        }}
                    >
                        <i className="fas fa-cog"></i>
                    </button>
                </div>
                {showSettings && (
                    <div style={{ background: '#fff', borderRadius: 12, marginBottom: 20, padding: 20 }}>
                        <div
                            style={{
                                color: '#64748b',
                                fontSize: 12,
                                fontWeight: 600,
                                letterSpacing: 0.5,
                                marginBottom: 12,
                                textTransform: 'uppercase'
                            }}
                        >
                            Travel Times
                        </div>
                        <div
                            style={{
                                alignItems: 'center',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 8,
                                marginBottom: 16
                            }}
                        >
                            <PlantSelect
                                value={newTravelTime.from}
                                onChange={(e) => setNewTravelTime({ ...newTravelTime, from: e.target.value })}
                                plants={plants}
                                placeholder="From"
                                style={{ flex: 1, minWidth: 80 }}
                            />
                            <i className="fas fa-arrow-right" style={{ color: '#94a3b8' }}></i>
                            <PlantSelect
                                value={newTravelTime.to}
                                onChange={(e) => setNewTravelTime({ ...newTravelTime, to: e.target.value })}
                                plants={plants}
                                placeholder="To"
                                style={{ flex: 1, minWidth: 80 }}
                            />
                            <input
                                type="number"
                                placeholder="min"
                                value={newTravelTime.minutes}
                                onChange={(e) => setNewTravelTime({ ...newTravelTime, minutes: e.target.value })}
                                style={{ ...baseInputStyle, textAlign: 'center', width: 70 }}
                            />
                            <button onClick={addTravelTime} style={btnStyle}>
                                Add
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                                            style={{
                                                alignItems: 'center',
                                                background: '#f8fafc',
                                                borderRadius: 6,
                                                display: 'flex',
                                                fontSize: 13,
                                                gap: 8,
                                                padding: '6px 10px'
                                            }}
                                        >
                                            <span style={{ color: '#334155', fontWeight: 500 }}>
                                                {f} ↔ {t}
                                            </span>
                                            <span style={{ color: accentColor, fontWeight: 600 }}>{v}m</span>
                                            <button
                                                onClick={() => removeTravelTime(k)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#94a3b8',
                                                    cursor: 'pointer',
                                                    padding: 2
                                                }}
                                            >
                                                <i className="fas fa-times" style={{ fontSize: 10 }}></i>
                                            </button>
                                        </div>
                                    )
                                })}
                        </div>
                    </div>
                )}
                {stats.length > 0 && (
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: 12,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                            marginBottom: 20,
                            padding: 16
                        }}
                    >
                        {stats.map((s) => (
                            <div
                                key={s.code}
                                style={{
                                    alignItems: 'center',
                                    background: s.send > 0 || s.recv > 0 ? '#f0f9ff' : '#f8fafc',
                                    borderRadius: 8,
                                    display: 'flex',
                                    gap: 8,
                                    padding: '8px 12px'
                                }}
                            >
                                <span style={{ color: '#334155', fontSize: mobileFontSize, fontWeight: 600 }}>
                                    {s.code}
                                </span>
                                <span
                                    style={{
                                        color: s.eff !== s.base ? accentColor : '#64748b',
                                        fontSize: mobileFontSize,
                                        fontWeight: 600
                                    }}
                                >
                                    {s.eff}
                                </span>
                                {s.send > 0 && (
                                    <span style={{ color: '#dc2626', fontSize: isMobile ? 10 : 12 }}>-{s.send}</span>
                                )}
                                {s.recv > 0 && (
                                    <span style={{ color: '#16a34a', fontSize: isMobile ? 10 : 12 }}>+{s.recv}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                <div style={{ background: '#fff', borderRadius: 12, marginBottom: 20, padding: isMobile ? 12 : 20 }}>
                    <div
                        style={{
                            alignItems: 'center',
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 16
                        }}
                    >
                        <span style={{ color: '#1e293b', fontSize: isMobile ? 14 : 16, fontWeight: 600 }}>
                            Assignments
                        </span>
                        <button
                            onClick={() => setAssignments((prev) => [...prev, createEmptyAssignment()])}
                            style={{
                                ...btnStyle,
                                fontSize: mobileFontSize,
                                padding: isMobile ? '8px 12px' : '10px 16px'
                            }}
                        >
                            <i className="fas fa-plus" style={{ marginRight: 6 }}></i>Add
                        </button>
                    </div>
                    {!assignments.length ? (
                        <div
                            style={{
                                color: '#94a3b8',
                                fontSize: mobileFontSize,
                                padding: isMobile ? 30 : 40,
                                textAlign: 'center'
                            }}
                        >
                            <i
                                className="fas fa-truck"
                                style={{
                                    display: 'block',
                                    fontSize: isMobile ? 28 : 32,
                                    marginBottom: 12,
                                    opacity: 0.5
                                }}
                            ></i>
                            No assignments yet
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {assignments.map((a, idx) => {
                                const travelTime =
                                    a.fromPlant && a.toPlant ? getTravelTime(a.fromPlant, a.toPlant) : null
                                const clockIn =
                                    a.time && travelTime !== null ? calcClockIn(a.time, a.fromPlant, a.toPlant) : null
                                const hasCapacityWarning =
                                    a.fromPlant && a.driverCount > (mixerCountsByPlant[a.fromPlant] || 0)
                                const missingTravelTime = travelTime === null && a.fromPlant && a.toPlant
                                return (
                                    <div key={a.id} style={{ background: '#f8fafc', borderRadius: 12, padding: 16 }}>
                                        <div
                                            style={{ alignItems: 'center', display: 'flex', gap: 10, marginBottom: 12 }}
                                        >
                                            <span
                                                style={{
                                                    background: accentColor,
                                                    borderRadius: 6,
                                                    color: '#fff',
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    padding: '4px 10px'
                                                }}
                                            >
                                                {idx + 1}
                                            </span>
                                            <PlantSelect
                                                value={a.fromPlant}
                                                onChange={(e) => updateAssignment(a.id, 'fromPlant', e.target.value)}
                                                plants={plants}
                                                excludeValue={a.toPlant}
                                                placeholder="From Plant"
                                                style={{ flex: 1 }}
                                            />
                                            <i className="fas fa-arrow-right" style={{ color: '#94a3b8' }}></i>
                                            <PlantSelect
                                                value={a.toPlant}
                                                onChange={(e) => updateAssignment(a.id, 'toPlant', e.target.value)}
                                                plants={plants}
                                                excludeValue={a.fromPlant}
                                                placeholder="To Plant"
                                                style={{ flex: 1 }}
                                            />
                                            <button
                                                onClick={() =>
                                                    setAssignments((prev) => prev.filter((x) => x.id !== a.id))
                                                }
                                                style={{
                                                    background: '#fee2e2',
                                                    border: 'none',
                                                    borderRadius: 6,
                                                    color: '#dc2626',
                                                    cursor: 'pointer',
                                                    padding: '8px 10px'
                                                }}
                                            >
                                                <i className="fas fa-trash" style={{ fontSize: 12 }}></i>
                                            </button>
                                        </div>
                                        <div
                                            style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 12 }}
                                        >
                                            <div style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
                                                <span style={{ color: '#64748b', fontSize: 12 }}>Operators</span>
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
                                                                : Math.max(1, parseInt(e.target.value) || 1)
                                                        )
                                                    }
                                                    style={{ ...baseInputStyle, textAlign: 'center', width: 60 }}
                                                />
                                            </div>
                                            <div style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
                                                <span style={{ color: '#64748b', fontSize: 12 }}>Arrive</span>
                                                <input
                                                    type="text"
                                                    placeholder="HH:MM"
                                                    maxLength={5}
                                                    value={a.time || ''}
                                                    onChange={(e) =>
                                                        updateAssignment(a.id, 'time', formatTimeInput(e.target.value))
                                                    }
                                                    style={timeInputBaseStyle}
                                                />
                                            </div>
                                            <div style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
                                                <span style={{ color: '#64748b', fontSize: 12 }}>Leave</span>
                                                <input
                                                    type="text"
                                                    placeholder="HH:MM"
                                                    maxLength={5}
                                                    value={a.leaveTime || ''}
                                                    onChange={(e) =>
                                                        updateAssignment(
                                                            a.id,
                                                            'leaveTime',
                                                            formatTimeInput(e.target.value)
                                                        )
                                                    }
                                                    style={timeInputBaseStyle}
                                                />
                                            </div>
                                            <label
                                                style={{
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    gap: 6
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={a.loadFromPlant || false}
                                                    onChange={(e) =>
                                                        updateAssignment(a.id, 'loadFromPlant', e.target.checked)
                                                    }
                                                    style={{ accentColor, cursor: 'pointer', height: 16, width: 16 }}
                                                />
                                                <span style={{ color: '#64748b', fontSize: 12 }}>Load from Plant</span>
                                            </label>
                                            {clockIn && (
                                                <Pill background="#dcfce7" color="#16a34a">
                                                    <span style={{ fontWeight: 600 }}>Clock in: {clockIn}</span>
                                                </Pill>
                                            )}
                                            {travelTime !== null && (
                                                <Pill background="#f1f5f9" color="#64748b">
                                                    {travelTime + BUFFER_MINUTES}min travel
                                                </Pill>
                                            )}
                                            {hasCapacityWarning && (
                                                <Pill background="#fef3c7" color="#92400e">
                                                    <i
                                                        className="fas fa-exclamation-triangle"
                                                        style={{ marginRight: 4 }}
                                                    ></i>
                                                    Only {mixerCountsByPlant[a.fromPlant] || 0} available
                                                </Pill>
                                            )}
                                            {missingTravelTime && (
                                                <Pill background="#fef3c7" color="#92400e">
                                                    No travel time set
                                                </Pill>
                                            )}
                                        </div>
                                        {a.driverCount > 1 && (
                                            <div
                                                style={{
                                                    borderTop: '1px solid #e2e8f0',
                                                    marginTop: 16,
                                                    paddingTop: 16
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        alignItems: 'center',
                                                        display: 'flex',
                                                        gap: 12,
                                                        marginBottom: 12
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            background: '#e2e8f0',
                                                            borderRadius: 6,
                                                            display: 'flex',
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        {['stagger', 'custom'].map((mode) => (
                                                            <button
                                                                key={mode}
                                                                onClick={() =>
                                                                    mode === 'custom'
                                                                        ? switchToCustom(a.id)
                                                                        : updateAssignment(a.id, 'timeMode', 'stagger')
                                                                }
                                                                style={{
                                                                    background: (
                                                                        mode === 'custom'
                                                                            ? a.timeMode === 'custom'
                                                                            : a.timeMode !== 'custom'
                                                                    )
                                                                        ? accentColor
                                                                        : 'transparent',
                                                                    border: 'none',
                                                                    color: (
                                                                        mode === 'custom'
                                                                            ? a.timeMode === 'custom'
                                                                            : a.timeMode !== 'custom'
                                                                    )
                                                                        ? '#fff'
                                                                        : '#64748b',
                                                                    cursor: 'pointer',
                                                                    fontSize: 12,
                                                                    fontWeight: 500,
                                                                    padding: '8px 14px'
                                                                }}
                                                            >
                                                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {a.timeMode !== 'custom' && (
                                                        <div style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
                                                            <span style={{ color: '#64748b', fontSize: 12 }}>
                                                                Every
                                                            </span>
                                                            <input
                                                                type="number"
                                                                min="5"
                                                                step="5"
                                                                value={a.staggerMinutes || DEFAULT_STAGGER_MINUTES}
                                                                onChange={(e) =>
                                                                    updateAssignment(
                                                                        a.id,
                                                                        'staggerMinutes',
                                                                        parseInt(e.target.value) ||
                                                                            DEFAULT_STAGGER_MINUTES
                                                                    )
                                                                }
                                                                style={{
                                                                    ...baseInputStyle,
                                                                    textAlign: 'center',
                                                                    width: 60
                                                                }}
                                                            />
                                                            <span style={{ color: '#64748b', fontSize: 12 }}>min</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {a.timeMode === 'custom' ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                        {Array.from({ length: a.driverCount }, (_, i) => {
                                                            const ct = a.customTimes?.[i] || {}
                                                            const opClockIn = ct.time
                                                                ? calcClockIn(ct.time, a.fromPlant, a.toPlant)
                                                                : null
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    style={{
                                                                        alignItems: 'center',
                                                                        background: '#fff',
                                                                        borderRadius: 8,
                                                                        display: 'flex',
                                                                        gap: 10,
                                                                        padding: 10
                                                                    }}
                                                                >
                                                                    <span
                                                                        style={{
                                                                            background: accentColor,
                                                                            borderRadius: 4,
                                                                            color: '#fff',
                                                                            fontSize: 11,
                                                                            fontWeight: 600,
                                                                            minWidth: 28,
                                                                            padding: '4px 0',
                                                                            textAlign: 'center'
                                                                        }}
                                                                    >
                                                                        {i + 1}
                                                                    </span>
                                                                    <div
                                                                        style={{
                                                                            alignItems: 'center',
                                                                            display: 'flex',
                                                                            flex: 1,
                                                                            gap: 8
                                                                        }}
                                                                    >
                                                                        <span
                                                                            style={{ color: '#94a3b8', fontSize: 11 }}
                                                                        >
                                                                            Arrive
                                                                        </span>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="HH:MM"
                                                                            maxLength={5}
                                                                            value={ct.time || ''}
                                                                            onChange={(e) =>
                                                                                updateCustomTime(
                                                                                    a.id,
                                                                                    i,
                                                                                    'time',
                                                                                    formatTimeInput(e.target.value)
                                                                                )
                                                                            }
                                                                            style={{
                                                                                ...timeInputBaseStyle,
                                                                                flex: 1,
                                                                                padding: '6px 8px'
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div
                                                                        style={{
                                                                            alignItems: 'center',
                                                                            display: 'flex',
                                                                            flex: 1,
                                                                            gap: 8
                                                                        }}
                                                                    >
                                                                        <span
                                                                            style={{ color: '#94a3b8', fontSize: 11 }}
                                                                        >
                                                                            Leave
                                                                        </span>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="HH:MM"
                                                                            maxLength={5}
                                                                            value={ct.leaveTime || ''}
                                                                            onChange={(e) =>
                                                                                updateCustomTime(
                                                                                    a.id,
                                                                                    i,
                                                                                    'leaveTime',
                                                                                    formatTimeInput(e.target.value)
                                                                                )
                                                                            }
                                                                            style={{
                                                                                ...timeInputBaseStyle,
                                                                                flex: 1,
                                                                                padding: '6px 8px'
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div
                                                                        style={{
                                                                            background: opClockIn
                                                                                ? '#dcfce7'
                                                                                : '#f1f5f9',
                                                                            borderRadius: 6,
                                                                            color: opClockIn ? '#16a34a' : '#94a3b8',
                                                                            fontSize: 11,
                                                                            fontWeight: 600,
                                                                            minWidth: 60,
                                                                            padding: '6px 8px',
                                                                            textAlign: 'center'
                                                                        }}
                                                                    >
                                                                        {opClockIn || '--:--'}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                        {Array.from({ length: a.driverCount }, (_, i) => {
                                                            const arr = a.time
                                                                ? addMinutesToTime(
                                                                      a.time,
                                                                      i * (a.staggerMinutes || DEFAULT_STAGGER_MINUTES)
                                                                  )
                                                                : null
                                                            const opClockIn = arr
                                                                ? calcClockIn(arr, a.fromPlant, a.toPlant)
                                                                : null
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    style={{
                                                                        background: '#fff',
                                                                        borderRadius: 6,
                                                                        fontSize: 12,
                                                                        padding: '8px 12px'
                                                                    }}
                                                                >
                                                                    <span style={{ color: '#64748b' }}>
                                                                        Op {i + 1}:
                                                                    </span>{' '}
                                                                    <span style={{ color: '#16a34a', fontWeight: 500 }}>
                                                                        {opClockIn || '--'}
                                                                    </span>
                                                                    <span style={{ color: '#94a3b8' }}> → </span>
                                                                    <span style={{ color: '#334155', fontWeight: 500 }}>
                                                                        {arr || '--'}
                                                                    </span>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    {assignments.length > 0 && (
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Notes (optional)..."
                            style={{
                                ...baseInputStyle,
                                marginTop: 16,
                                minHeight: 80,
                                resize: 'vertical',
                                width: '100%'
                            }}
                        />
                    )}
                </div>
                <div style={{ background: '#fff', borderRadius: 12, padding: 20 }}>
                    <div style={{ alignItems: 'center', display: 'flex', gap: 12, marginBottom: 16 }}>
                        <span style={{ color: '#1e293b', flex: 1, fontSize: 16, fontWeight: 600 }}>
                            Generated Message
                        </span>
                        <button onClick={generatePlanMessage} style={btnStyle}>
                            <i className="fas fa-sync-alt" style={{ marginRight: 6 }}></i>Generate
                        </button>
                        {generatedMessage && (
                            <button
                                onClick={copyToClipboard}
                                style={{
                                    ...btnStyle,
                                    background: copied ? '#16a34a' : '#e2e8f0',
                                    color: copied ? '#fff' : '#334155'
                                }}
                            >
                                <i className={`fas fa-${copied ? 'check' : 'copy'}`} style={{ marginRight: 6 }}></i>
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        )}
                    </div>
                    {generatedMessage ? (
                        <pre
                            style={{
                                background: '#f8fafc',
                                borderRadius: 8,
                                color: '#334155',
                                fontFamily: 'monospace',
                                fontSize: 13,
                                lineHeight: 1.6,
                                margin: 0,
                                overflow: 'auto',
                                padding: 16,
                                whiteSpace: 'pre-wrap'
                            }}
                        >
                            {generatedMessage}
                        </pre>
                    ) : (
                        <div style={{ color: '#94a3b8', padding: 32, textAlign: 'center' }}>
                            Click Generate to create the plan message
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
export default PlanView
