import React, { useEffect, useState } from 'react'

import { PlanService } from '../../services/PlanService'
import { ReportService } from '../../services/ReportService'
import { UserService } from '../../services/UserService'

const PRE_TRIP_MINUTES = 15
const BUFFER_MINUTES = 5

function PlanView() {
    const [plants, setPlants] = useState([])
    const [mixerCountsByPlant, setMixerCountsByPlant] = useState({})
    const [plantYardageTargets, setPlantYardageTargets] = useState({})
    const [assignments, setAssignments] = useState([])
    const [generatedMessage, setGeneratedMessage] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [copied, setCopied] = useState(false)
    const [notes, setNotes] = useState('')
    const [planDate, setPlanDate] = useState(() => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        return tomorrow.toISOString().split('T')[0]
    })
    const [canEditTravelTimes, setCanEditTravelTimes] = useState(false)
    const [showTravelConfig, setShowTravelConfig] = useState(false)
    const [travelTimes, setTravelTimes] = useState({})
    const [editingTravelTime, setEditingTravelTime] = useState(null)
    const [newTravelTime, setNewTravelTime] = useState({ from: '', minutes: '', to: '' })
    const [isSaving, setIsSaving] = useState(false)
    const [userId, setUserId] = useState(null)
    const [isLoadingPlan, setIsLoadingPlan] = useState(true)
    const [showYardage, setShowYardage] = useState(false)

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    useEffect(() => {
        async function loadData() {
            const user = await UserService.getCurrentUser()
            let plantList = []
            if (user?.id) {
                setUserId(user.id)
                plantList = await ReportService.fetchPlantsForUser(user.id)
                const hasEditPerm = await UserService.hasPermission(user.id, 'plan.edit').catch(() => false)
                setCanEditTravelTimes(hasEditPerm)
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
            await loadTravelTimes()
            setIsLoadingPlan(false)
        }
        loadData()
    }, [])

    useEffect(() => {
        if (!userId || !planDate || isLoadingPlan) return
        const loadUserPlan = async () => {
            try {
                const plan = await PlanService.fetchUserPlan(userId, planDate)
                if (plan) {
                    if (plan.assignments?.length > 0) setAssignments(plan.assignments)
                    if (plan.notes) setNotes(plan.notes)
                }
            } catch (e) {}
        }
        loadUserPlan()
    }, [userId, planDate, isLoadingPlan])

    useEffect(() => {
        if (!userId || !planDate || isLoadingPlan) return
        const saveTimeout = setTimeout(async () => {
            try {
                await PlanService.saveUserPlan(userId, planDate, assignments, notes)
            } catch (e) {}
        }, 1000)
        return () => clearTimeout(saveTimeout)
    }, [userId, planDate, assignments, notes, isLoadingPlan])

    const loadTravelTimes = async () => {
        try {
            await PlanService.fetchTravelTimes()
            setTravelTimes(PlanService.getTravelTimesMap())
        } catch (e) {
            setTravelTimes({})
        }
    }

    const getTravelTime = (from, to) => travelTimes[`${from}->${to}`] || null

    const addTravelTime = async () => {
        if (
            !newTravelTime.from ||
            !newTravelTime.to ||
            !newTravelTime.minutes ||
            newTravelTime.from === newTravelTime.to
        )
            return
        setIsSaving(true)
        try {
            await PlanService.upsertTravelTime(newTravelTime.from, newTravelTime.to, parseInt(newTravelTime.minutes))
            await PlanService.upsertTravelTime(newTravelTime.to, newTravelTime.from, parseInt(newTravelTime.minutes))
            await loadTravelTimes()
            setNewTravelTime({ from: '', minutes: '', to: '' })
        } catch (e) {}
        setIsSaving(false)
    }

    const removeTravelTime = async (key) => {
        const [from, to] = key.split('->')
        setIsSaving(true)
        try {
            await PlanService.deleteTravelTime(from, to)
            await PlanService.deleteTravelTime(to, from)
            await loadTravelTimes()
        } catch (e) {}
        setIsSaving(false)
    }

    const updateTravelTimeValue = async (key, minutes) => {
        const [from, to] = key.split('->')
        setIsSaving(true)
        try {
            await PlanService.upsertTravelTime(from, to, parseInt(minutes))
            await PlanService.upsertTravelTime(to, from, parseInt(minutes))
            await loadTravelTimes()
        } catch (e) {}
        setIsSaving(false)
        setEditingTravelTime(null)
    }

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

    const getStaggered = (a) => {
        if (!a.time || !a.fromPlant || !a.toPlant || a.driverCount <= 1) return null
        if (getTravelTime(a.fromPlant, a.toPlant) === null) return null
        return Array.from({ length: a.driverCount }, (_, i) => {
            const arr = addMins(a.time, i * (a.staggerMinutes || 10))
            return { arr, clockIn: calcClockIn(arr, a.fromPlant, a.toPlant), num: i + 1 }
        })
    }

    const addAssignment = () =>
        setAssignments([
            ...assignments,
            { driverCount: 1, fromPlant: '', id: Date.now(), returnTime: '', staggerMinutes: 10, time: '', toPlant: '' }
        ])
    const updateAssignment = (id, field, value) =>
        setAssignments(assignments.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
    const removeAssignment = (id) => setAssignments(assignments.filter((a) => a.id !== id))

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

    const getOpsForPlant = (code) => {
        const x = getStats().find((s) => s.code === code)
        return x ? x.eff : mixerCountsByPlant[code] || 0
    }

    const calcYards = (code) => {
        const t = plantYardageTargets[code]
        if (!t?.yards || t.yards <= 0) return null
        const ops = getOpsForPlant(code)
        if (ops <= 0) return { err: true }
        return { perOp: Math.ceil(t.yards / ops) }
    }

    const updateYardage = (code, field, val) =>
        setPlantYardageTargets((p) => ({
            ...p,
            [code]: { ...p[code], [field]: val === '' ? '' : parseFloat(val) || 0 }
        }))

    const generate = () => {
        if (assignments.length === 0) return
        setIsGenerating(true)
        const valid = assignments
            .filter((a) => a.fromPlant && a.toPlant && a.driverCount > 0)
            .sort((a, b) => {
                const fa = parseInt(String(a.fromPlant).replace(/\D/g, '')) || 0
                const fb = parseInt(String(b.fromPlant).replace(/\D/g, '')) || 0
                return fa !== fb
                    ? fa - fb
                    : (parseInt(String(a.toPlant).replace(/\D/g, '')) || 0) -
                          (parseInt(String(b.toPlant).replace(/\D/g, '')) || 0)
            })
        if (valid.length === 0) {
            setGeneratedMessage('Add at least one complete assignment.')
            setIsGenerating(false)
            return
        }
        const dateStr = new Date(planDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'long' })
        let msg = `Plan - ${dateStr}\n`
        valid.forEach((a, i) => {
            if (i > 0) msg += '\n─────────────\n'
            msg += '\n'
            const opWord = a.driverCount === 1 ? 'operator' : 'operators'
            const stag = getStaggered(a)
            const clockIn = calcClockIn(a.time, a.fromPlant, a.toPlant)
            if (a.driverCount > 1 && stag) {
                msg += `${a.fromPlant} → ${a.toPlant}  (${a.driverCount} ${opWord}, staggered ${a.staggerMinutes} min)\n`
                stag.forEach((s) => {
                    msg += `• Op ${s.num}: In ${s.clockIn || '--'} | Arrive ${s.arr}\n`
                })
            } else {
                msg += `${a.fromPlant} → ${a.toPlant}  (${a.driverCount} ${opWord})\n`
                if (clockIn) msg += `• Clock in: ${clockIn}\n`
                if (a.time) msg += `• Arrive by: ${a.time}\n`
            }
            if (a.returnTime) msg += `• Return by: ${a.returnTime}\n`
        })
        if (notes) msg += `\n─────────────\n\nNotes: ${notes}\n`
        setGeneratedMessage(msg.trim())
        setIsGenerating(false)
    }

    const copy = async () => {
        if (!generatedMessage) return
        await navigator.clipboard.writeText(generatedMessage)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const newPlan = () => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        setPlanDate(tomorrow.toISOString().split('T')[0])
        setAssignments([])
        setGeneratedMessage('')
        setNotes('')
    }

    const stats = getStats()
    const validCount = assignments.filter((a) => a.fromPlant && a.toPlant && a.driverCount > 0).length

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', padding: isMobile ? '16px' : '24px' }}>
            <div
                style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: '24px',
                    margin: '0 auto',
                    maxWidth: '1400px'
                }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            alignItems: 'center',
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '12px',
                            justifyContent: 'space-between',
                            marginBottom: '16px',
                            padding: '16px 20px'
                        }}
                    >
                        <div style={{ alignItems: 'center', display: 'flex', gap: '12px' }}>
                            <i className="fas fa-calendar-alt" style={{ color: '#1e3a5f', fontSize: '18px' }}></i>
                            <input
                                type="date"
                                value={planDate}
                                onChange={(e) => setPlanDate(e.target.value)}
                                style={{
                                    background: '#f1f5f9',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#1e3a5f',
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    outline: 'none',
                                    padding: '10px 14px'
                                }}
                            />
                        </div>
                        <div style={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
                            <button
                                onClick={newPlan}
                                style={{
                                    background: '#f1f5f9',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#475569',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    padding: '10px 14px'
                                }}
                            >
                                <i className="fas fa-plus" style={{ marginRight: '6px' }}></i>New
                            </button>
                            {canEditTravelTimes && (
                                <button
                                    onClick={() => setShowTravelConfig(!showTravelConfig)}
                                    style={{
                                        background: showTravelConfig ? '#1e3a5f' : '#f1f5f9',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: showTravelConfig ? 'white' : '#475569',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        padding: '10px 14px'
                                    }}
                                >
                                    <i className="fas fa-cog"></i>
                                </button>
                            )}
                        </div>
                    </div>

                    {stats.length > 0 && (
                        <div
                            style={{
                                alignItems: 'center',
                                background: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '8px',
                                marginBottom: '16px',
                                padding: '14px 16px'
                            }}
                        >
                            {stats.map((s) => (
                                <div
                                    key={s.code}
                                    style={{
                                        alignItems: 'center',
                                        background: '#f8fafc',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        gap: '8px',
                                        padding: '8px 12px'
                                    }}
                                >
                                    <span style={{ color: '#1e3a5f', fontSize: '13px', fontWeight: 700 }}>
                                        {s.code}
                                    </span>
                                    <span style={{ color: '#64748b', fontSize: '13px' }}>
                                        {s.eff}/{s.base}
                                    </span>
                                    {s.send > 0 && (
                                        <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600 }}>
                                            -{s.send}
                                        </span>
                                    )}
                                    {s.recv > 0 && (
                                        <span style={{ color: '#16a34a', fontSize: '12px', fontWeight: 600 }}>
                                            +{s.recv}
                                        </span>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={() => setShowYardage(!showYardage)}
                                style={{
                                    alignItems: 'center',
                                    background: showYardage ? '#dcfce7' : '#f1f5f9',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: showYardage ? '#16a34a' : '#64748b',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    gap: '6px',
                                    marginLeft: 'auto',
                                    padding: '8px 12px'
                                }}
                            >
                                <i className="fas fa-bullseye"></i>Yardage
                            </button>
                        </div>
                    )}

                    {showYardage && (
                        <div
                            style={{
                                background: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                marginBottom: '16px',
                                overflow: 'hidden',
                                padding: '16px'
                            }}
                        >
                            <div
                                style={{
                                    color: '#475569',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    marginBottom: '12px',
                                    textTransform: 'uppercase'
                                }}
                            >
                                Yardage Targets
                            </div>
                            <div
                                style={{
                                    display: 'grid',
                                    gap: '10px',
                                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))'
                                }}
                            >
                                {plants
                                    .filter((p) => p.plant_code)
                                    .map((p) => {
                                        const y = calcYards(p.plant_code)
                                        const t = plantYardageTargets[p.plant_code] || {}
                                        return (
                                            <div
                                                key={p.plant_code}
                                                style={{
                                                    alignItems: 'center',
                                                    background: '#f8fafc',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    gap: '8px',
                                                    padding: '10px 12px'
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        color: '#1e3a5f',
                                                        fontSize: '13px',
                                                        fontWeight: 700,
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    {p.plant_code}
                                                </span>
                                                <input
                                                    type="number"
                                                    placeholder="Yards"
                                                    value={t.yards || ''}
                                                    onChange={(e) =>
                                                        updateYardage(p.plant_code, 'yards', e.target.value)
                                                    }
                                                    style={{
                                                        background: 'white',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        minWidth: 0,
                                                        outline: 'none',
                                                        padding: '8px 6px',
                                                        textAlign: 'center',
                                                        width: '70px'
                                                    }}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Hrs"
                                                    value={t.timeframe || ''}
                                                    onChange={(e) =>
                                                        updateYardage(p.plant_code, 'timeframe', e.target.value)
                                                    }
                                                    style={{
                                                        background: 'white',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        minWidth: 0,
                                                        outline: 'none',
                                                        padding: '8px 6px',
                                                        textAlign: 'center',
                                                        width: '50px'
                                                    }}
                                                />
                                                {y && !y.err && (
                                                    <span
                                                        style={{
                                                            background: '#dcfce7',
                                                            borderRadius: '4px',
                                                            color: '#059669',
                                                            flexShrink: 0,
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            padding: '4px 8px',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {y.perOp}/op
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}
                            </div>
                        </div>
                    )}

                    {showTravelConfig && (
                        <div
                            style={{
                                background: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                marginBottom: '16px',
                                padding: '16px'
                            }}
                        >
                            <div
                                style={{
                                    color: '#475569',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    marginBottom: '12px',
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
                                    gap: '10px',
                                    marginBottom: '14px'
                                }}
                            >
                                <select
                                    value={newTravelTime.from}
                                    onChange={(e) => setNewTravelTime({ ...newTravelTime, from: e.target.value })}
                                    style={{
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        padding: '8px 12px'
                                    }}
                                >
                                    <option value="">From</option>
                                    {plants.map((p) => (
                                        <option key={p.plant_code} value={p.plant_code}>
                                            {p.plant_code}
                                        </option>
                                    ))}
                                </select>
                                <i className="fas fa-arrow-right" style={{ color: '#94a3b8', fontSize: '12px' }}></i>
                                <select
                                    value={newTravelTime.to}
                                    onChange={(e) => setNewTravelTime({ ...newTravelTime, to: e.target.value })}
                                    style={{
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        padding: '8px 12px'
                                    }}
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
                                    style={{
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        padding: '8px 12px',
                                        textAlign: 'center',
                                        width: '70px'
                                    }}
                                />
                                <button
                                    onClick={addTravelTime}
                                    disabled={isSaving}
                                    style={{
                                        background: '#1e3a5f',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        padding: '8px 14px'
                                    }}
                                >
                                    <i
                                        className={isSaving ? 'fas fa-spinner fa-spin' : 'fas fa-plus'}
                                        style={{ fontSize: '13px' }}
                                    ></i>
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {Object.entries(travelTimes)
                                    .filter(([k]) => {
                                        const [f, t] = k.split('->')
                                        return f < t
                                    })
                                    .map(([k, m]) => {
                                        const [f, t] = k.split('->')
                                        return (
                                            <div
                                                key={k}
                                                style={{
                                                    alignItems: 'center',
                                                    background: '#f8fafc',
                                                    borderRadius: '6px',
                                                    display: 'flex',
                                                    fontSize: '13px',
                                                    gap: '8px',
                                                    padding: '6px 10px'
                                                }}
                                            >
                                                <span style={{ color: '#475569' }}>
                                                    {f}↔{t}
                                                </span>
                                                {editingTravelTime === k ? (
                                                    <input
                                                        type="number"
                                                        defaultValue={m}
                                                        onBlur={(e) => updateTravelTimeValue(k, e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter')
                                                                updateTravelTimeValue(k, e.target.value)
                                                            if (e.key === 'Escape') setEditingTravelTime(null)
                                                        }}
                                                        autoFocus
                                                        style={{
                                                            border: '1px solid #1e3a5f',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            padding: '4px 6px',
                                                            textAlign: 'center',
                                                            width: '45px'
                                                        }}
                                                    />
                                                ) : (
                                                    <span
                                                        onClick={() => setEditingTravelTime(k)}
                                                        style={{ color: '#1e3a5f', cursor: 'pointer', fontWeight: 600 }}
                                                    >
                                                        {m}m
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => removeTravelTime(k)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#94a3b8',
                                                        cursor: 'pointer',
                                                        fontSize: '11px',
                                                        padding: '2px'
                                                    }}
                                                >
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </div>
                                        )
                                    })}
                            </div>
                        </div>
                    )}

                    <div
                        style={{
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            padding: '16px'
                        }}
                    >
                        <div
                            style={{
                                alignItems: 'center',
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '14px'
                            }}
                        >
                            <span style={{ color: '#1e293b', fontSize: '15px', fontWeight: 600 }}>Assignments</span>
                            <button
                                onClick={addAssignment}
                                style={{
                                    background: '#1e3a5f',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    padding: '8px 14px'
                                }}
                            >
                                <i className="fas fa-plus" style={{ marginRight: '6px' }}></i>Add
                            </button>
                        </div>

                        {assignments.length === 0 ? (
                            <div style={{ color: '#94a3b8', fontSize: '14px', padding: '32px', textAlign: 'center' }}>
                                <i
                                    className="fas fa-truck"
                                    style={{ display: 'block', fontSize: '28px', marginBottom: '10px' }}
                                ></i>
                                No assignments yet
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {assignments.map((a, i) => {
                                    const tt = a.fromPlant && a.toPlant ? getTravelTime(a.fromPlant, a.toPlant) : null
                                    const clockIn = a.time ? calcClockIn(a.time, a.fromPlant, a.toPlant) : null
                                    const stag = getStaggered(a)
                                    const warn = a.fromPlant && a.driverCount > (mixerCountsByPlant[a.fromPlant] || 0)

                                    return (
                                        <div
                                            key={a.id}
                                            style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px' }}
                                        >
                                            <div
                                                style={{
                                                    alignItems: 'center',
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '10px'
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        background: '#1e3a5f',
                                                        borderRadius: '6px',
                                                        color: 'white',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        padding: '4px 10px'
                                                    }}
                                                >
                                                    {i + 1}
                                                </span>
                                                <select
                                                    value={a.fromPlant}
                                                    onChange={(e) =>
                                                        updateAssignment(a.id, 'fromPlant', e.target.value)
                                                    }
                                                    style={{
                                                        background: 'white',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '8px',
                                                        fontSize: '14px',
                                                        padding: '8px 12px'
                                                    }}
                                                >
                                                    <option value="">From</option>
                                                    {plants
                                                        .filter((p) => p.plant_code !== a.toPlant)
                                                        .map((p) => (
                                                            <option key={p.plant_code} value={p.plant_code}>
                                                                {p.plant_code}
                                                            </option>
                                                        ))}
                                                </select>
                                                <i
                                                    className="fas fa-arrow-right"
                                                    style={{ color: '#94a3b8', fontSize: '12px' }}
                                                ></i>
                                                <select
                                                    value={a.toPlant}
                                                    onChange={(e) => updateAssignment(a.id, 'toPlant', e.target.value)}
                                                    style={{
                                                        background: 'white',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '8px',
                                                        fontSize: '14px',
                                                        padding: '8px 12px'
                                                    }}
                                                >
                                                    <option value="">To</option>
                                                    {plants
                                                        .filter((p) => p.plant_code !== a.fromPlant)
                                                        .map((p) => (
                                                            <option key={p.plant_code} value={p.plant_code}>
                                                                {p.plant_code}
                                                            </option>
                                                        ))}
                                                </select>
                                                <div style={{ alignItems: 'center', display: 'flex', gap: '6px' }}>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={a.driverCount}
                                                        onChange={(e) =>
                                                            updateAssignment(
                                                                a.id,
                                                                'driverCount',
                                                                parseInt(e.target.value) || 1
                                                            )
                                                        }
                                                        style={{
                                                            background: 'white',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '8px',
                                                            fontSize: '14px',
                                                            padding: '8px',
                                                            textAlign: 'center',
                                                            width: '50px'
                                                        }}
                                                    />
                                                    <span style={{ color: '#64748b', fontSize: '13px' }}>ops</span>
                                                </div>
                                                <input
                                                    type="time"
                                                    value={a.time}
                                                    onChange={(e) => updateAssignment(a.id, 'time', e.target.value)}
                                                    style={{
                                                        background: 'white',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '8px',
                                                        fontSize: '14px',
                                                        padding: '8px 10px'
                                                    }}
                                                    title="Arrive by"
                                                />
                                                <input
                                                    type="time"
                                                    value={a.returnTime}
                                                    onChange={(e) =>
                                                        updateAssignment(a.id, 'returnTime', e.target.value)
                                                    }
                                                    style={{
                                                        background: 'white',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '8px',
                                                        fontSize: '14px',
                                                        padding: '8px 10px'
                                                    }}
                                                    title="Return by"
                                                />
                                                <button
                                                    onClick={() => removeAssignment(a.id)}
                                                    style={{
                                                        background: '#fee2e2',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        color: '#dc2626',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        marginLeft: 'auto',
                                                        padding: '8px 10px'
                                                    }}
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>

                                            {(warn ||
                                                clockIn ||
                                                (tt === null && a.fromPlant && a.toPlant) ||
                                                a.driverCount > 1) && (
                                                <div
                                                    style={{
                                                        alignItems: 'center',
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: '10px',
                                                        marginTop: '12px'
                                                    }}
                                                >
                                                    {warn && (
                                                        <span
                                                            style={{
                                                                background: '#fef3c7',
                                                                borderRadius: '6px',
                                                                color: '#92400e',
                                                                fontSize: '12px',
                                                                padding: '6px 10px'
                                                            }}
                                                        >
                                                            <i
                                                                className="fas fa-exclamation-triangle"
                                                                style={{ marginRight: '5px' }}
                                                            ></i>
                                                            Only {mixerCountsByPlant[a.fromPlant] || 0} available
                                                        </span>
                                                    )}
                                                    {tt === null && a.fromPlant && a.toPlant && (
                                                        <span
                                                            style={{
                                                                background: '#fef3c7',
                                                                borderRadius: '6px',
                                                                color: '#92400e',
                                                                fontSize: '12px',
                                                                padding: '6px 10px'
                                                            }}
                                                        >
                                                            No travel time
                                                        </span>
                                                    )}
                                                    {clockIn && (
                                                        <span
                                                            style={{
                                                                background: '#dcfce7',
                                                                borderRadius: '6px',
                                                                color: '#16a34a',
                                                                fontSize: '12px',
                                                                fontWeight: 500,
                                                                padding: '6px 10px'
                                                            }}
                                                        >
                                                            Clock in: {clockIn}
                                                        </span>
                                                    )}
                                                    {tt !== null && (
                                                        <span
                                                            style={{
                                                                background: '#f1f5f9',
                                                                borderRadius: '6px',
                                                                color: '#64748b',
                                                                fontSize: '12px',
                                                                padding: '6px 10px'
                                                            }}
                                                        >
                                                            {tt + BUFFER_MINUTES} min travel
                                                        </span>
                                                    )}
                                                    {a.driverCount > 1 && (
                                                        <div
                                                            style={{
                                                                alignItems: 'center',
                                                                display: 'flex',
                                                                gap: '6px'
                                                            }}
                                                        >
                                                            <span style={{ color: '#64748b', fontSize: '12px' }}>
                                                                Stagger:
                                                            </span>
                                                            <input
                                                                type="number"
                                                                min="5"
                                                                step="5"
                                                                value={a.staggerMinutes}
                                                                onChange={(e) =>
                                                                    updateAssignment(
                                                                        a.id,
                                                                        'staggerMinutes',
                                                                        parseInt(e.target.value) || 10
                                                                    )
                                                                }
                                                                style={{
                                                                    background: 'white',
                                                                    border: '1px solid #e2e8f0',
                                                                    borderRadius: '6px',
                                                                    fontSize: '12px',
                                                                    padding: '4px 8px',
                                                                    textAlign: 'center',
                                                                    width: '50px'
                                                                }}
                                                            />
                                                            <span style={{ color: '#64748b', fontSize: '12px' }}>
                                                                min
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {stag && (
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: '8px',
                                                        marginTop: '10px'
                                                    }}
                                                >
                                                    {stag.map((s) => (
                                                        <span
                                                            key={s.num}
                                                            style={{
                                                                background: 'white',
                                                                border: '1px solid #e2e8f0',
                                                                borderRadius: '6px',
                                                                color: '#475569',
                                                                fontSize: '12px',
                                                                padding: '6px 10px'
                                                            }}
                                                        >
                                                            Op {s.num}: {s.clockIn || '--'} → {s.arr}
                                                        </span>
                                                    ))}
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
                                placeholder="Notes..."
                                style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    marginTop: '14px',
                                    minHeight: '60px',
                                    outline: 'none',
                                    padding: '12px',
                                    resize: 'vertical',
                                    width: '100%'
                                }}
                            />
                        )}
                    </div>
                </div>

                <div style={{ flex: isMobile ? 'none' : '0 0 340px', width: isMobile ? '100%' : '340px' }}>
                    <div
                        style={{
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            padding: '16px',
                            position: isMobile ? 'relative' : 'sticky',
                            top: '24px'
                        }}
                    >
                        <div
                            style={{
                                alignItems: 'center',
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '14px'
                            }}
                        >
                            <span style={{ color: '#1e293b', fontSize: '15px', fontWeight: 600 }}>Message</span>
                            <div style={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
                                {generatedMessage && (
                                    <button
                                        onClick={copy}
                                        style={{
                                            background: copied ? '#dcfce7' : '#f1f5f9',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: copied ? '#16a34a' : '#64748b',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            padding: '8px 12px'
                                        }}
                                    >
                                        <i
                                            className={copied ? 'fas fa-check' : 'fas fa-copy'}
                                            style={{ marginRight: '5px' }}
                                        ></i>
                                        {copied ? 'Copied' : 'Copy'}
                                    </button>
                                )}
                                <button
                                    onClick={generate}
                                    disabled={isGenerating || validCount === 0}
                                    style={{
                                        background: validCount === 0 ? '#e2e8f0' : '#1e3a5f',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: validCount === 0 ? '#94a3b8' : 'white',
                                        cursor: validCount === 0 ? 'not-allowed' : 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        padding: '8px 14px'
                                    }}
                                >
                                    {isGenerating ? (
                                        <i className="fas fa-spinner fa-spin"></i>
                                    ) : (
                                        <>
                                            <i className="fas fa-magic" style={{ marginRight: '5px' }}></i>Generate
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {generatedMessage ? (
                            <pre
                                style={{
                                    background: '#f8fafc',
                                    borderRadius: '8px',
                                    color: '#1e293b',
                                    fontSize: '13px',
                                    lineHeight: 1.6,
                                    margin: 0,
                                    maxHeight: '60vh',
                                    overflow: 'auto',
                                    padding: '14px',
                                    whiteSpace: 'pre-wrap'
                                }}
                            >
                                {generatedMessage}
                            </pre>
                        ) : (
                            <div
                                style={{
                                    background: '#f8fafc',
                                    borderRadius: '8px',
                                    color: '#94a3b8',
                                    fontSize: '13px',
                                    padding: '32px 16px',
                                    textAlign: 'center'
                                }}
                            >
                                {validCount === 0
                                    ? 'Add assignments to generate message'
                                    : 'Click Generate to create message'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PlanView
