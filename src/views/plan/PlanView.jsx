import React, { useEffect, useState } from 'react'

import { usePreferences } from '../../app/context/PreferencesContext'
import { PlanService } from '../../services/PlanService'
import { ReportService } from '../../services/ReportService'
import { UserService } from '../../services/UserService'

const PRE_TRIP_MINUTES = 15
const BUFFER_MINUTES = 5

function PlanView() {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const [plants, setPlants] = useState([])
    const [mixerCountsByPlant, setMixerCountsByPlant] = useState({})
    const [assignments, setAssignments] = useState([])
    const [generatedMessage, setGeneratedMessage] = useState('')
    const [copied, setCopied] = useState(false)
    const [notes, setNotes] = useState('')
    const [planDate, setPlanDate] = useState(() => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        return tomorrow.toISOString().split('T')[0]
    })
    const [travelTimes, setTravelTimes] = useState({})
    const [userId, setUserId] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showSettings, setShowSettings] = useState(false)
    const [newTravelTime, setNewTravelTime] = useState({ from: '', minutes: '', to: '' })

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    useEffect(() => {
        async function loadData() {
            const user = await UserService.getCurrentUser()
            let plantList = []
            if (user?.id) {
                setUserId(user.id)
                plantList = await ReportService.fetchPlantsForUser(user.id)
            }
            if (plantList.length === 0) plantList = await ReportService.fetchPlantsSorted()
            const sorted = plantList
                .filter((p) => p.plant_code)
                .sort((a, b) => String(a.plant_code).localeCompare(String(b.plant_code)))
            setPlants(sorted)
            if (sorted.length > 0) {
                const plantCodes = sorted.map((p) => p.plant_code).filter(Boolean)
                const counts = await ReportService.fetchActiveMixerCountsByPlant(plantCodes)
                setMixerCountsByPlant(counts)
            }
            await PlanService.fetchTravelTimes()
            setTravelTimes(PlanService.getTravelTimesMap())
            setIsLoading(false)
        }
        loadData()
    }, [])

    useEffect(() => {
        if (!userId || !planDate || isLoading) return
        const load = async () => {
            try {
                const plan = await PlanService.fetchUserPlan(userId, planDate)
                if (plan) {
                    if (plan.assignments?.length > 0) setAssignments(plan.assignments)
                    if (plan.notes) setNotes(plan.notes)
                }
            } catch {}
        }
        load()
    }, [userId, planDate, isLoading])

    useEffect(() => {
        if (!userId || !planDate || isLoading) return
        const t = setTimeout(async () => {
            try {
                await PlanService.saveUserPlan(userId, planDate, assignments, notes)
            } catch {}
        }, 1000)
        return () => clearTimeout(t)
    }, [userId, planDate, assignments, notes, isLoading])

    const getTravelTime = (from, to) => travelTimes[`${from}->${to}`] || null

    const calcClockIn = (arrivalTime, fromPlant, toPlant) => {
        if (!arrivalTime || !fromPlant || !toPlant) return null
        const tt = getTravelTime(fromPlant, toPlant)
        if (tt === null) return null
        const [h, m] = arrivalTime.split(':').map(Number)
        const d = new Date()
        d.setHours(h, m, 0, 0)
        d.setMinutes(d.getMinutes() - tt - BUFFER_MINUTES - PRE_TRIP_MINUTES)
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }

    const addMins = (time, mins) => {
        if (!time) return null
        const [h, m] = time.split(':').map(Number)
        const d = new Date()
        d.setHours(h, m, 0, 0)
        d.setMinutes(d.getMinutes() + mins)
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }

    const addAssignment = () => {
        setAssignments((prev) => [
            ...prev,
            {
                customTimes: [],
                driverCount: 1,
                fromPlant: '',
                id: Date.now(),
                leaveTime: '',
                staggerMinutes: 10,
                time: '',
                timeMode: 'stagger',
                toPlant: ''
            }
        ])
    }

    const updateAssignment = (id, field, value) => {
        setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
    }

    const removeAssignment = (id) => {
        setAssignments((prev) => prev.filter((a) => a.id !== id))
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
                const customTimes = Array.from({ length: a.driverCount }, (_, i) => ({
                    leaveTime: a.leaveTime || '',
                    time: a.time ? addMins(a.time, i * (a.staggerMinutes || 10)) || '' : ''
                }))
                return { ...a, customTimes, timeMode: 'custom' }
            })
        )
    }

    const getStats = () => {
        const s = {}
        plants.forEach((p) => {
            s[p.plant_code] = { base: mixerCountsByPlant[p.plant_code] || 0, code: p.plant_code, recv: 0, send: 0 }
        })
        assignments.forEach((a) => {
            if (a.fromPlant && a.toPlant && a.driverCount > 0) {
                const c = parseInt(a.driverCount) || 0
                if (s[a.fromPlant]) s[a.fromPlant].send += c
                if (s[a.toPlant]) s[a.toPlant].recv += c
            }
        })
        return Object.values(s)
            .filter((x) => x.base > 0 || x.send > 0 || x.recv > 0)
            .map((x) => ({ ...x, eff: x.base - x.send + x.recv }))
            .sort((a, b) => a.code.localeCompare(b.code))
    }

    const generate = () => {
        const valid = assignments.filter((a) => a.fromPlant && a.toPlant && a.driverCount > 0)
        if (valid.length === 0) {
            setGeneratedMessage('Add at least one assignment.')
            return
        }
        const dateStr = new Date(planDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'long' })
        let msg = `Plan - ${dateStr}\n`
        valid.forEach((a, i) => {
            if (i > 0) msg += '\n─────────────\n'
            msg += '\n'
            const opWord = a.driverCount === 1 ? 'operator' : 'operators'
            const loadNote = a.loadFromPlant ? ' [Load from Plant]' : ''
            if (a.driverCount > 1 && a.timeMode === 'custom' && a.customTimes?.length > 0) {
                msg += `${a.fromPlant} → ${a.toPlant} (${a.driverCount} ${opWord})${loadNote}\n`
                a.customTimes.slice(0, a.driverCount).forEach((ct, idx) => {
                    const clockIn = ct.time ? calcClockIn(ct.time, a.fromPlant, a.toPlant) : null
                    let line = `  Op ${idx + 1}:`
                    if (clockIn) line += ` In ${clockIn}`
                    if (ct.time) line += ` | Arrive ${ct.time}`
                    if (ct.leaveTime) line += ` | Leave ${ct.leaveTime}`
                    msg += line + '\n'
                })
            } else if (a.driverCount > 1) {
                msg += `${a.fromPlant} → ${a.toPlant} (${a.driverCount} ${opWord}, ${a.staggerMinutes}min stagger)${loadNote}\n`
                for (let j = 0; j < a.driverCount; j++) {
                    const arr = a.time ? addMins(a.time, j * (a.staggerMinutes || 10)) : null
                    const clockIn = arr ? calcClockIn(arr, a.fromPlant, a.toPlant) : null
                    msg += `  Op ${j + 1}: In ${clockIn || '--:--'} | Arrive ${arr || '--:--'}\n`
                }
                if (a.leaveTime) msg += `  Leave by: ${a.leaveTime}\n`
            } else {
                const clockIn = a.time ? calcClockIn(a.time, a.fromPlant, a.toPlant) : null
                msg += `${a.fromPlant} → ${a.toPlant} (${a.driverCount} ${opWord})${loadNote}\n`
                if (clockIn) msg += `  Clock in: ${clockIn}\n`
                if (a.time) msg += `  Arrive: ${a.time}\n`
                if (a.leaveTime) msg += `  Leave: ${a.leaveTime}\n`
            }
        })
        if (notes) msg += `\n─────────────\n\nNotes: ${notes}\n`
        setGeneratedMessage(msg.trim())
    }

    const copy = async () => {
        if (!generatedMessage) return
        await navigator.clipboard.writeText(generatedMessage)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const addTravelTime = async () => {
        if (
            !newTravelTime.from ||
            !newTravelTime.to ||
            !newTravelTime.minutes ||
            newTravelTime.from === newTravelTime.to
        )
            return
        await PlanService.upsertTravelTime(newTravelTime.from, newTravelTime.to, parseInt(newTravelTime.minutes))
        await PlanService.upsertTravelTime(newTravelTime.to, newTravelTime.from, parseInt(newTravelTime.minutes))
        await PlanService.fetchTravelTimes()
        setTravelTimes(PlanService.getTravelTimesMap())
        setNewTravelTime({ from: '', minutes: '', to: '' })
    }

    const removeTravelTime = async (key) => {
        const [from, to] = key.split('->')
        await PlanService.deleteTravelTime(from, to)
        await PlanService.deleteTravelTime(to, from)
        await PlanService.fetchTravelTimes()
        setTravelTimes(PlanService.getTravelTimesMap())
    }

    const stats = getStats()

    const formatTimeInput = (value) => {
        const clean = value.replace(/[^0-9]/g, '')
        if (clean.length <= 2) return clean
        if (clean.length <= 4) return `${clean.slice(0, 2)}:${clean.slice(2)}`
        return `${clean.slice(0, 2)}:${clean.slice(2, 4)}`
    }

    const inputStyle = {
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        fontSize: 14,
        outline: 'none',
        padding: '10px 12px'
    }

    const timeInputStyle = {
        ...inputStyle,
        fontFamily: 'monospace',
        textAlign: 'center',
        width: 80
    }

    const selectStyle = {
        ...inputStyle,
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundPosition: 'right 12px center',
        backgroundRepeat: 'no-repeat',
        cursor: 'pointer',
        paddingRight: 32
    }

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

    if (isLoading) {
        return (
            <div style={{ alignItems: 'center', display: 'flex', height: '100vh', justifyContent: 'center' }}>
                <i className="fas fa-spinner fa-spin" style={{ color: accentColor, fontSize: 24 }}></i>
            </div>
        )
    }

    return (
        <div style={{ background: '#f1f5f9', minHeight: '100vh', padding: isMobile ? 16 : 24 }}>
            <div style={{ margin: '0 auto', maxWidth: 900 }}>
                <div style={{ alignItems: 'center', display: 'flex', gap: 12, marginBottom: 20 }}>
                    <h1 style={{ color: '#1e293b', flex: 1, fontSize: 22, fontWeight: 700, margin: 0 }}>Daily Plan</h1>
                    <input
                        type="date"
                        value={planDate}
                        onChange={(e) => setPlanDate(e.target.value)}
                        style={{ ...inputStyle, fontWeight: 600 }}
                    />
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        style={{
                            ...btnStyle,
                            background: showSettings ? accentColor : '#e2e8f0',
                            color: showSettings ? '#fff' : '#64748b',
                            padding: '10px 12px'
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
                            <select
                                value={newTravelTime.from}
                                onChange={(e) => setNewTravelTime({ ...newTravelTime, from: e.target.value })}
                                style={{ ...selectStyle, flex: 1, minWidth: 80 }}
                            >
                                <option value="">From</option>
                                {plants.map((p) => (
                                    <option key={p.plant_code} value={p.plant_code}>
                                        {p.plant_code}
                                    </option>
                                ))}
                            </select>
                            <i className="fas fa-arrow-right" style={{ color: '#94a3b8' }}></i>
                            <select
                                value={newTravelTime.to}
                                onChange={(e) => setNewTravelTime({ ...newTravelTime, to: e.target.value })}
                                style={{ ...selectStyle, flex: 1, minWidth: 80 }}
                            >
                                <option value="">To</option>
                                {plants.map((p) => (
                                    <option key={p.plant_code} value={p.plant_code}>
                                        {p.plant_code}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                placeholder="min"
                                value={newTravelTime.minutes}
                                onChange={(e) => setNewTravelTime({ ...newTravelTime, minutes: e.target.value })}
                                style={{ ...inputStyle, textAlign: 'center', width: 70 }}
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
                                <span style={{ color: '#334155', fontWeight: 600 }}>{s.code}</span>
                                <span style={{ color: s.eff !== s.base ? accentColor : '#64748b', fontWeight: 600 }}>
                                    {s.eff}
                                </span>
                                {s.send > 0 && <span style={{ color: '#dc2626', fontSize: 12 }}>-{s.send}</span>}
                                {s.recv > 0 && <span style={{ color: '#16a34a', fontSize: 12 }}>+{s.recv}</span>}
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ background: '#fff', borderRadius: 12, marginBottom: 20, padding: 20 }}>
                    <div
                        style={{
                            alignItems: 'center',
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 16
                        }}
                    >
                        <span style={{ color: '#1e293b', fontSize: 16, fontWeight: 600 }}>Assignments</span>
                        <button onClick={addAssignment} style={btnStyle}>
                            <i className="fas fa-plus" style={{ marginRight: 6 }}></i>Add
                        </button>
                    </div>

                    {assignments.length === 0 ? (
                        <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>
                            <i
                                className="fas fa-truck"
                                style={{ display: 'block', fontSize: 32, marginBottom: 12, opacity: 0.5 }}
                            ></i>
                            No assignments yet
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {assignments.map((a, idx) => {
                                const tt = a.fromPlant && a.toPlant ? getTravelTime(a.fromPlant, a.toPlant) : null
                                const clockIn =
                                    a.time && tt !== null ? calcClockIn(a.time, a.fromPlant, a.toPlant) : null
                                const warn = a.fromPlant && a.driverCount > (mixerCountsByPlant[a.fromPlant] || 0)

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
                                            <select
                                                value={a.fromPlant}
                                                onChange={(e) => updateAssignment(a.id, 'fromPlant', e.target.value)}
                                                style={{ ...selectStyle, flex: 1 }}
                                            >
                                                <option value="">From Plant</option>
                                                {plants
                                                    .filter((p) => p.plant_code !== a.toPlant)
                                                    .map((p) => (
                                                        <option key={p.plant_code} value={p.plant_code}>
                                                            {p.plant_code}
                                                        </option>
                                                    ))}
                                            </select>
                                            <i className="fas fa-arrow-right" style={{ color: '#94a3b8' }}></i>
                                            <select
                                                value={a.toPlant}
                                                onChange={(e) => updateAssignment(a.id, 'toPlant', e.target.value)}
                                                style={{ ...selectStyle, flex: 1 }}
                                            >
                                                <option value="">To Plant</option>
                                                {plants
                                                    .filter((p) => p.plant_code !== a.fromPlant)
                                                    .map((p) => (
                                                        <option key={p.plant_code} value={p.plant_code}>
                                                            {p.plant_code}
                                                        </option>
                                                    ))}
                                            </select>
                                            <button
                                                onClick={() => removeAssignment(a.id)}
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
                                                    style={{ ...inputStyle, textAlign: 'center', width: 60 }}
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
                                                    style={timeInputStyle}
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
                                                    style={timeInputStyle}
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
                                                    style={{
                                                        accentColor: accentColor,
                                                        cursor: 'pointer',
                                                        height: 16,
                                                        width: 16
                                                    }}
                                                />
                                                <span style={{ color: '#64748b', fontSize: 12 }}>Load from Plant</span>
                                            </label>
                                            {clockIn && (
                                                <div
                                                    style={{
                                                        background: '#dcfce7',
                                                        borderRadius: 6,
                                                        color: '#16a34a',
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        padding: '6px 10px'
                                                    }}
                                                >
                                                    Clock in: {clockIn}
                                                </div>
                                            )}
                                            {tt !== null && (
                                                <div
                                                    style={{
                                                        background: '#f1f5f9',
                                                        borderRadius: 6,
                                                        color: '#64748b',
                                                        fontSize: 12,
                                                        padding: '6px 10px'
                                                    }}
                                                >
                                                    {tt + BUFFER_MINUTES}min travel
                                                </div>
                                            )}
                                            {warn && (
                                                <div
                                                    style={{
                                                        background: '#fef3c7',
                                                        borderRadius: 6,
                                                        color: '#92400e',
                                                        fontSize: 12,
                                                        padding: '6px 10px'
                                                    }}
                                                >
                                                    <i
                                                        className="fas fa-exclamation-triangle"
                                                        style={{ marginRight: 4 }}
                                                    ></i>
                                                    Only {mixerCountsByPlant[a.fromPlant] || 0} available
                                                </div>
                                            )}
                                            {tt === null && a.fromPlant && a.toPlant && (
                                                <div
                                                    style={{
                                                        background: '#fef3c7',
                                                        borderRadius: 6,
                                                        color: '#92400e',
                                                        fontSize: 12,
                                                        padding: '6px 10px'
                                                    }}
                                                >
                                                    No travel time set
                                                </div>
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
                                                        <button
                                                            onClick={() =>
                                                                updateAssignment(a.id, 'timeMode', 'stagger')
                                                            }
                                                            style={{
                                                                background:
                                                                    a.timeMode !== 'custom'
                                                                        ? accentColor
                                                                        : 'transparent',
                                                                border: 'none',
                                                                color: a.timeMode !== 'custom' ? '#fff' : '#64748b',
                                                                cursor: 'pointer',
                                                                fontSize: 12,
                                                                fontWeight: 500,
                                                                padding: '8px 14px'
                                                            }}
                                                        >
                                                            Stagger
                                                        </button>
                                                        <button
                                                            onClick={() => switchToCustom(a.id)}
                                                            style={{
                                                                background:
                                                                    a.timeMode === 'custom'
                                                                        ? accentColor
                                                                        : 'transparent',
                                                                border: 'none',
                                                                color: a.timeMode === 'custom' ? '#fff' : '#64748b',
                                                                cursor: 'pointer',
                                                                fontSize: 12,
                                                                fontWeight: 500,
                                                                padding: '8px 14px'
                                                            }}
                                                        >
                                                            Custom
                                                        </button>
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
                                                                value={a.staggerMinutes || 10}
                                                                onChange={(e) =>
                                                                    updateAssignment(
                                                                        a.id,
                                                                        'staggerMinutes',
                                                                        parseInt(e.target.value) || 10
                                                                    )
                                                                }
                                                                style={{
                                                                    ...inputStyle,
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
                                                                                ...timeInputStyle,
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
                                                                                ...timeInputStyle,
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
                                                                ? addMins(a.time, i * (a.staggerMinutes || 10))
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
                            style={{ ...inputStyle, marginTop: 16, minHeight: 80, resize: 'vertical', width: '100%' }}
                        />
                    )}
                </div>

                <div style={{ background: '#fff', borderRadius: 12, padding: 20 }}>
                    <div style={{ alignItems: 'center', display: 'flex', gap: 12, marginBottom: 16 }}>
                        <span style={{ color: '#1e293b', flex: 1, fontSize: 16, fontWeight: 600 }}>
                            Generated Message
                        </span>
                        <button onClick={generate} style={btnStyle}>
                            <i className="fas fa-sync-alt" style={{ marginRight: 6 }}></i>Generate
                        </button>
                        {generatedMessage && (
                            <button
                                onClick={copy}
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
