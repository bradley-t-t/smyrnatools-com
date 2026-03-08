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
const Pill = ({ background, color, children }) => (
    <div className="rounded-[6px] text-xs px-2.5 py-1.5" style={{ background, color }}>
        {children}
    </div>
)
const PlantSelect = ({ value, onChange, plants, excludeValue, placeholder, className }) => (
    <select
        value={value}
        onChange={onChange}
        className={`bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none py-2.5 pl-3 pr-8 appearance-none bg-no-repeat cursor-pointer ${className || ''}`}
        style={{ backgroundImage: DROPDOWN_ARROW_SVG, backgroundPosition: 'right 12px center' }}
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
            <div className="flex items-center justify-center h-screen">
                <i className="fas fa-spinner fa-spin text-2xl" style={{ color: accentColor }}></i>
            </div>
        )
    }
    return (
        <div className={`bg-[#f1f5f9] min-h-screen ${isMobile ? 'p-3' : 'p-6'}`}>
            <div className="mx-auto max-w-[900px]">
                <div className={`flex items-center flex-wrap mb-5 ${isMobile ? 'gap-2' : 'gap-3'}`}>
                    <h1
                        className={`text-[#1e293b] font-bold m-0 ${isMobile ? 'flex-[1_1_100%] text-lg' : 'flex-1 text-[22px]'}`}
                    >
                        Daily Plan
                    </h1>
                    <input
                        type="date"
                        value={planDate}
                        onChange={(e) => setPlanDate(e.target.value)}
                        className={`bg-white border border-[#e2e8f0] rounded-lg outline-none font-semibold ${isMobile ? 'flex-1 text-[13px] px-2.5 py-2' : 'flex-none text-sm px-3 py-2.5'}`}
                    />
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`border-none rounded-lg cursor-pointer text-sm font-medium ${isMobile ? 'px-2.5 py-2' : 'px-3 py-2.5'}`}
                        style={{
                            background: showSettings ? accentColor : 'var(--border-light)',
                            color: showSettings ? '#fff' : 'var(--text-secondary)'
                        }}
                    >
                        <i className="fas fa-cog"></i>
                    </button>
                </div>
                {showSettings && (
                    <div className="bg-white rounded-xl mb-5 p-5">
                        <div className="text-[#64748b] text-xs font-semibold tracking-[0.5px] mb-3 uppercase">
                            Travel Times
                        </div>
                        <div className="flex items-center flex-wrap gap-2 mb-4">
                            <PlantSelect
                                value={newTravelTime.from}
                                onChange={(e) => setNewTravelTime({ ...newTravelTime, from: e.target.value })}
                                plants={plants}
                                placeholder="From"
                                className="flex-1 min-w-[80px]"
                            />
                            <i className="fas fa-arrow-right text-[#94a3b8]"></i>
                            <PlantSelect
                                value={newTravelTime.to}
                                onChange={(e) => setNewTravelTime({ ...newTravelTime, to: e.target.value })}
                                plants={plants}
                                placeholder="To"
                                className="flex-1 min-w-[80px]"
                            />
                            <input
                                type="number"
                                placeholder="min"
                                value={newTravelTime.minutes}
                                onChange={(e) => setNewTravelTime({ ...newTravelTime, minutes: e.target.value })}
                                className="bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none py-2.5 px-3 text-center w-[70px]"
                            />
                            <button
                                onClick={addTravelTime}
                                className="border-none rounded-lg cursor-pointer text-sm font-medium px-4 py-2.5 text-white"
                                style={{ background: accentColor }}
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
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
                                            className="flex items-center bg-[#f8fafc] rounded-[6px] text-[13px] gap-2 px-2.5 py-1.5"
                                        >
                                            <span className="text-[#334155] font-medium">
                                                {f} ↔ {t}
                                            </span>
                                            <span className="font-semibold" style={{ color: accentColor }}>
                                                {v}m
                                            </span>
                                            <button
                                                onClick={() => removeTravelTime(k)}
                                                className="bg-transparent border-none text-[#94a3b8] cursor-pointer p-0.5"
                                            >
                                                <i className="fas fa-times text-[10px]"></i>
                                            </button>
                                        </div>
                                    )
                                })}
                        </div>
                    </div>
                )}
                {stats.length > 0 && (
                    <div className="bg-white rounded-xl flex flex-wrap gap-2 mb-5 p-4">
                        {stats.map((s) => (
                            <div
                                key={s.code}
                                className={`flex items-center rounded-lg gap-2 px-3 py-2 ${s.send > 0 || s.recv > 0 ? 'bg-[#f0f9ff]' : 'bg-[#f8fafc]'}`}
                            >
                                <span
                                    className={`text-[#334155] font-semibold ${isMobile ? 'text-[13px]' : 'text-sm'}`}
                                >
                                    {s.code}
                                </span>
                                <span
                                    className={`font-semibold ${isMobile ? 'text-[13px]' : 'text-sm'}`}
                                    style={{ color: s.eff !== s.base ? accentColor : 'var(--text-secondary)' }}
                                >
                                    {s.eff}
                                </span>
                                {s.send > 0 && (
                                    <span className={`text-[#dc2626] ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                                        -{s.send}
                                    </span>
                                )}
                                {s.recv > 0 && (
                                    <span className={`text-[#16a34a] ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                                        +{s.recv}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                <div className={`bg-white rounded-xl mb-5 ${isMobile ? 'p-3' : 'p-5'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <span className={`text-[#1e293b] font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>
                            Assignments
                        </span>
                        <button
                            onClick={() => setAssignments((prev) => [...prev, createEmptyAssignment()])}
                            className={`border-none rounded-lg cursor-pointer font-medium text-white ${isMobile ? 'text-[13px] px-3 py-2' : 'text-sm px-4 py-2.5'}`}
                            style={{ background: accentColor }}
                        >
                            <i className="fas fa-plus mr-1.5"></i>Add
                        </button>
                    </div>
                    {!assignments.length ? (
                        <div
                            className={`text-[#94a3b8] text-center ${isMobile ? 'text-[13px] py-[30px]' : 'text-sm py-10'}`}
                        >
                            <i
                                className={`fas fa-truck block mb-3 opacity-50 ${isMobile ? 'text-[28px]' : 'text-[32px]'}`}
                            ></i>
                            No assignments yet
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {assignments.map((a, idx) => {
                                const travelTime =
                                    a.fromPlant && a.toPlant ? getTravelTime(a.fromPlant, a.toPlant) : null
                                const clockIn =
                                    a.time && travelTime !== null ? calcClockIn(a.time, a.fromPlant, a.toPlant) : null
                                const hasCapacityWarning =
                                    a.fromPlant && a.driverCount > (mixerCountsByPlant[a.fromPlant] || 0)
                                const missingTravelTime = travelTime === null && a.fromPlant && a.toPlant
                                return (
                                    <div key={a.id} className="bg-[#f8fafc] rounded-xl p-4">
                                        <div className="flex items-center gap-2.5 mb-3">
                                            <span
                                                className="rounded-[6px] text-white text-xs font-bold px-2.5 py-1"
                                                style={{ background: accentColor }}
                                            >
                                                {idx + 1}
                                            </span>
                                            <PlantSelect
                                                value={a.fromPlant}
                                                onChange={(e) => updateAssignment(a.id, 'fromPlant', e.target.value)}
                                                plants={plants}
                                                excludeValue={a.toPlant}
                                                placeholder="From Plant"
                                                className="flex-1"
                                            />
                                            <i className="fas fa-arrow-right text-[#94a3b8]"></i>
                                            <PlantSelect
                                                value={a.toPlant}
                                                onChange={(e) => updateAssignment(a.id, 'toPlant', e.target.value)}
                                                plants={plants}
                                                excludeValue={a.fromPlant}
                                                placeholder="To Plant"
                                                className="flex-1"
                                            />
                                            <button
                                                onClick={() =>
                                                    setAssignments((prev) => prev.filter((x) => x.id !== a.id))
                                                }
                                                className="bg-[#fee2e2] border-none rounded-[6px] text-[#dc2626] cursor-pointer px-2.5 py-2"
                                            >
                                                <i className="fas fa-trash text-xs"></i>
                                            </button>
                                        </div>
                                        <div className="flex items-center flex-wrap gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[#64748b] text-xs">Operators</span>
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
                                                    className="bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none py-2.5 px-3 text-center w-[60px]"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[#64748b] text-xs">Arrive</span>
                                                <input
                                                    type="text"
                                                    placeholder="HH:MM"
                                                    maxLength={5}
                                                    value={a.time || ''}
                                                    onChange={(e) =>
                                                        updateAssignment(a.id, 'time', formatTimeInput(e.target.value))
                                                    }
                                                    className="bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none py-2.5 px-3 font-mono text-center w-[80px]"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[#64748b] text-xs">Leave</span>
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
                                                    className="bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none py-2.5 px-3 font-mono text-center w-[80px]"
                                                />
                                            </div>
                                            <label className="flex items-center cursor-pointer gap-1.5">
                                                <input
                                                    type="checkbox"
                                                    checked={a.loadFromPlant || false}
                                                    onChange={(e) =>
                                                        updateAssignment(a.id, 'loadFromPlant', e.target.checked)
                                                    }
                                                    className="cursor-pointer h-4 w-4"
                                                    style={{ accentColor }}
                                                />
                                                <span className="text-[#64748b] text-xs">Load from Plant</span>
                                            </label>
                                            {clockIn && (
                                                <Pill background="#dcfce7" color="#16a34a">
                                                    <span className="font-semibold">Clock in: {clockIn}</span>
                                                </Pill>
                                            )}
                                            {travelTime !== null && (
                                                <Pill background="#f1f5f9" color="#64748b">
                                                    {travelTime + BUFFER_MINUTES}min travel
                                                </Pill>
                                            )}
                                            {hasCapacityWarning && (
                                                <Pill background="#fef3c7" color="#92400e">
                                                    <i className="fas fa-exclamation-triangle mr-1"></i>
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
                                            <div className="border-t border-[#e2e8f0] mt-4 pt-4">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="bg-[#e2e8f0] rounded-[6px] flex overflow-hidden">
                                                        {['stagger', 'custom'].map((mode) => (
                                                            <button
                                                                key={mode}
                                                                onClick={() =>
                                                                    mode === 'custom'
                                                                        ? switchToCustom(a.id)
                                                                        : updateAssignment(a.id, 'timeMode', 'stagger')
                                                                }
                                                                className="border-none cursor-pointer text-xs font-medium px-3.5 py-2"
                                                                style={{
                                                                    background: (
                                                                        mode === 'custom'
                                                                            ? a.timeMode === 'custom'
                                                                            : a.timeMode !== 'custom'
                                                                    )
                                                                        ? accentColor
                                                                        : 'transparent',
                                                                    color: (
                                                                        mode === 'custom'
                                                                            ? a.timeMode === 'custom'
                                                                            : a.timeMode !== 'custom'
                                                                    )
                                                                        ? '#fff'
                                                                        : 'var(--text-secondary)'
                                                                }}
                                                            >
                                                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {a.timeMode !== 'custom' && (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[#64748b] text-xs">Every</span>
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
                                                                className="bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none py-2.5 px-3 text-center w-[60px]"
                                                            />
                                                            <span className="text-[#64748b] text-xs">min</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {a.timeMode === 'custom' ? (
                                                    <div className="flex flex-col gap-2">
                                                        {Array.from({ length: a.driverCount }, (_, i) => {
                                                            const ct = a.customTimes?.[i] || {}
                                                            const opClockIn = ct.time
                                                                ? calcClockIn(ct.time, a.fromPlant, a.toPlant)
                                                                : null
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className="flex items-center bg-white rounded-lg gap-2.5 p-2.5"
                                                                >
                                                                    <span
                                                                        className="rounded text-white text-[11px] font-semibold min-w-[28px] py-1 text-center"
                                                                        style={{ background: accentColor }}
                                                                    >
                                                                        {i + 1}
                                                                    </span>
                                                                    <div className="flex items-center flex-1 gap-2">
                                                                        <span className="text-[#94a3b8] text-[11px]">
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
                                                                            className="bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none font-mono text-center flex-1 px-2 py-1.5"
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center flex-1 gap-2">
                                                                        <span className="text-[#94a3b8] text-[11px]">
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
                                                                            className="bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none font-mono text-center flex-1 px-2 py-1.5"
                                                                        />
                                                                    </div>
                                                                    <div
                                                                        className={`rounded-[6px] text-[11px] font-semibold min-w-[60px] px-2 py-1.5 text-center ${opClockIn ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#f1f5f9] text-[#94a3b8]'}`}
                                                                    >
                                                                        {opClockIn || '--:--'}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
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
                                                                    className="bg-white rounded-[6px] text-xs px-3 py-2"
                                                                >
                                                                    <span className="text-[#64748b]">Op {i + 1}:</span>{' '}
                                                                    <span className="text-[#16a34a] font-medium">
                                                                        {opClockIn || '--'}
                                                                    </span>
                                                                    <span className="text-[#94a3b8]"> → </span>
                                                                    <span className="text-[#334155] font-medium">
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
                            className="bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none py-2.5 px-3 mt-4 min-h-[80px] resize-y w-full"
                        />
                    )}
                </div>
                <div className="bg-white rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-[#1e293b] flex-1 text-base font-semibold">Generated Message</span>
                        <button
                            onClick={generatePlanMessage}
                            className="border-none rounded-lg cursor-pointer text-sm font-medium px-4 py-2.5 text-white"
                            style={{ background: accentColor }}
                        >
                            <i className="fas fa-sync-alt mr-1.5"></i>Generate
                        </button>
                        {generatedMessage && (
                            <button
                                onClick={copyToClipboard}
                                className={`border-none rounded-lg cursor-pointer text-sm font-medium px-4 py-2.5 ${copied ? 'bg-[#16a34a] text-white' : 'bg-[#e2e8f0] text-[#334155]'}`}
                            >
                                <i className={`fas fa-${copied ? 'check' : 'copy'} mr-1.5`}></i>
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        )}
                    </div>
                    {generatedMessage ? (
                        <pre className="bg-[#f8fafc] rounded-lg text-[#334155] font-mono text-[13px] leading-[1.6] m-0 overflow-auto p-4 whitespace-pre-wrap">
                            {generatedMessage}
                        </pre>
                    ) : (
                        <div className="text-[#94a3b8] p-8 text-center">Click Generate to create the plan message</div>
                    )}
                </div>
            </div>
        </div>
    )
}
export default PlanView
