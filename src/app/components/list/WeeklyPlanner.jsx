import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import { ListService } from '../../../services/ListService'
import { PlantService } from '../../../services/PlantService'
import { UserService } from '../../../services/UserService'
import GrammarUtility from '../../../utils/GrammarUtility'
import { usePreferences } from '../../context/PreferencesContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import ConfirmDialog from '../common/ConfirmDialog'
/** Monday-through-Saturday day configuration for the planner grid. */
const DAYS = [
    { fullLabel: 'Monday', key: 'monday', label: 'Mon' },
    { fullLabel: 'Tuesday', key: 'tuesday', label: 'Tue' },
    { fullLabel: 'Wednesday', key: 'wednesday', label: 'Wed' },
    { fullLabel: 'Thursday', key: 'thursday', label: 'Thu' },
    { fullLabel: 'Friday', key: 'friday', label: 'Fri' },
    { fullLabel: 'Saturday', key: 'saturday', label: 'Sat' }
]
/** Color, icon, and border styling per task status. */
const STATUS_COLORS = {
    blocked: {
        bar: '#dc2626',
        bg: 'rgba(220,38,38,0.1)',
        border: 'rgba(220,38,38,0.3)',
        icon: 'fa-ban',
        text: '#dc2626'
    },
    completed: {
        bar: '#16a34a',
        bg: 'rgba(22,163,74,0.1)',
        border: 'rgba(22,163,74,0.3)',
        icon: 'fa-check',
        text: '#16a34a'
    },
    in_progress: {
        bar: '#2563eb',
        bg: 'rgba(37,99,235,0.1)',
        border: 'rgba(37,99,235,0.3)',
        icon: 'fa-spinner',
        text: '#2563eb'
    },
    ordered_materials: {
        bar: '#2563eb',
        bg: 'rgba(37,99,235,0.1)',
        border: 'rgba(37,99,235,0.3)',
        icon: 'fa-truck',
        text: '#2563eb'
    },
    overdue: {
        bar: '#dc2626',
        bg: 'rgba(220,38,38,0.1)',
        border: 'rgba(220,38,38,0.3)',
        icon: 'fa-exclamation',
        text: '#dc2626'
    },
    pending: {
        bar: '#d97706',
        bg: 'rgba(217,119,6,0.1)',
        border: 'rgba(217,119,6,0.3)',
        icon: 'fa-clock',
        text: '#d97706'
    },
    waiting: {
        bar: '#ca8a04',
        bg: 'rgba(202,138,4,0.1)',
        border: 'rgba(202,138,4,0.3)',
        icon: 'fa-hourglass-half',
        text: '#ca8a04'
    }
}
/**
 * Computes an array of day objects for the Mon-Sat week at the given offset.
 * @param {number} [weekOffset=0] - Number of weeks relative to the current week.
 */
const getWeekDates = (weekOffset = 0) => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7)
    monday.setHours(0, 0, 0, 0)
    return DAYS.map((day, index) => {
        const date = new Date(monday)
        date.setDate(monday.getDate() + index)
        return {
            ...day,
            date,
            dateStr: date.toISOString().split('T')[0],
            isPast: date < new Date(new Date().setHours(0, 0, 0, 0)),
            isToday: date.toDateString() === today.toDateString()
        }
    })
}
/** Draggable task card showing description, plant code, status, and completed/overdue overlays. */
function PlannerItem({ item, onRemove, onSelect, accentColor, isPast, dateStr }) {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.pending
    const isCompleted = item.status === 'completed' || item.completed
    const needsFollowUp = isPast && !isCompleted
    const handleDragStart = (e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ fromDate: dateStr, itemId: item.id }))
        e.dataTransfer.effectAllowed = 'move'
        e.currentTarget.style.opacity = '0.5'
    }
    const handleDragEnd = (e) => {
        e.currentTarget.style.opacity = '1'
    }
    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={() => onSelect?.(item.id)}
            className="planner-task-card rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] cursor-grab mb-2 overflow-hidden relative transition-all duration-200 ease-in-out active:cursor-grabbing"
            style={{
                background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)'
            }}
        >
            {isCompleted && (
                <div className="flex flex-col items-center justify-center gap-1 bg-[rgba(22,163,74,0.85)] rounded-lg absolute inset-0 z-[2]">
                    <i className="fas fa-check-circle text-white text-lg" />
                    <span className="text-white text-xs font-bold uppercase tracking-wide">Completed</span>
                </div>
            )}
            {needsFollowUp && (
                <div className="flex flex-col items-center justify-center gap-1 bg-[rgba(220,38,38,0.85)] rounded-lg absolute inset-0 z-[2]">
                    <i className="fas fa-exclamation-triangle text-white text-lg" />
                    <span className="text-white text-xs font-bold uppercase tracking-wide">Needs Follow Up</span>
                </div>
            )}
            <div className="h-[3px] w-full" style={{ background: statusColor.bar }} />
            <div className="px-3 py-[10px]">
                <div className="flex items-start gap-2 justify-between">
                    <div
                        className="flex-1 text-[13px] font-medium leading-[1.4]"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {item.description?.length > 45 ? `${item.description.slice(0, 45)}...` : item.description}
                    </div>
                    {onRemove && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onRemove(item.id)
                            }}
                            className="flex items-center justify-center border-none rounded cursor-pointer text-[10px] h-5 w-5 transition-all duration-150"
                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fee2e2'
                                e.currentTarget.style.color = '#ef4444'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--bg-tertiary)'
                                e.currentTarget.style.color = 'var(--text-secondary)'
                            }}
                        >
                            <i className="fas fa-times" />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                    <span
                        className="flex items-center rounded text-white text-[10px] font-semibold gap-1 px-1.5 py-[3px]"
                        style={{ background: accentColor }}
                    >
                        <i className="fas fa-industry text-[8px]" />
                        {item.plant_code}
                    </span>
                    <span
                        className="flex items-center rounded text-[9px] font-semibold gap-[3px] px-[5px] py-[2px] uppercase"
                        style={{
                            background: statusColor.bg,
                            border: `1px solid ${statusColor.border}`,
                            color: statusColor.text
                        }}
                    >
                        <i className={`fas ${statusColor.icon} text-[8px]`} />
                        {item.status?.replace('_', ' ')}
                    </span>
                </div>
            </div>
        </div>
    )
}
/** Inline form for quickly creating a new list item from the task selector modal. */
function QuickAddForm({ accentColor, onCreated }) {
    const { preferences } = usePreferences()
    const [description, setDescription] = useState('')
    const [plantCode, setPlantCode] = useState('')
    const [plants, setPlants] = useState([])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const inputRef = useRef(null)
    useEffect(() => {
        async function loadPlants() {
            const regionCode = preferences?.selectedRegion?.code || ''
            const allowedCodes = await PlantService.getAllowedPlantCodes(regionCode)
            if (!allowedCodes) return
            const allPlants = await PlantService.fetchAllPlants()
            setPlants(
                allPlants
                    .filter((p) => allowedCodes.has(p.plantCode.toUpperCase()))
                    .sort((a, b) => a.plantCode.localeCompare(b.plantCode))
            )
        }
        loadPlants()
    }, [preferences?.selectedRegion?.code])
    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!description.trim()) return setError('Description required')
        if (!plantCode) return setError('Select a plant')
        setSaving(true)
        setError('')
        try {
            const user = await UserService.getCurrentUser()
            if (!user) throw new Error('Not authenticated')
            const deadline = new Date()
            deadline.setDate(deadline.getDate() + 14)
            deadline.setHours(17, 0, 0, 0)
            const cleanDesc = GrammarUtility.cleanDescription(description)
            await ListService.createListItem(plantCode, cleanDesc, deadline, '', 'pending', null)
            setDescription('')
            setPlantCode('')
            onCreated?.()
        } catch (err) {
            setError(err.message || 'Failed to create item')
        } finally {
            setSaving(false)
        }
    }
    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-xl p-3 mb-3"
            style={{ background: `${accentColor}10`, border: `1px dashed ${accentColor}40` }}
        >
            <div className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: accentColor }}>
                <i className="fas fa-plus-circle" />
                Quick Add New Item
            </div>
            <input
                ref={inputRef}
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task description..."
                className="w-full rounded-lg border text-sm py-2 px-3 outline-none mb-2"
                style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border-light)',
                    color: 'var(--text-primary)'
                }}
            />
            <select
                value={plantCode}
                onChange={(e) => setPlantCode(e.target.value)}
                className="w-full rounded-lg border text-sm py-2 px-3 outline-none mb-2 appearance-none"
                style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border-light)',
                    color: plantCode ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
            >
                <option value="">Select plant...</option>
                {plants.map((p) => (
                    <option key={p.plantCode} value={p.plantCode}>
                        ({p.plantCode}) {p.plantName}
                    </option>
                ))}
            </select>
            {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
            <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg border-none text-white text-xs font-semibold py-2 cursor-pointer transition-opacity duration-150"
                style={{ background: accentColor, opacity: saving ? 0.6 : 1 }}
            >
                {saving ? (
                    <span className="flex items-center justify-center gap-1.5">
                        <i className="fas fa-circle-notch fa-spin" /> Creating...
                    </span>
                ) : (
                    'Create & Add to List'
                )}
            </button>
        </form>
    )
}
/** Portal-rendered modal for selecting an available list item to add to a day's plan. */
function TaskSelectorModal({ isOpen, onClose, items, onSelect, accentColor, onItemCreated }) {
    const [search, setSearch] = useState('')
    const [showQuickAdd, setShowQuickAdd] = useState(false)
    const filteredItems = useMemo(() => {
        const available = items.filter((item) => !item.completed && item.status !== 'completed')
        if (!search.trim()) return available
        const lower = search.toLowerCase()
        return available.filter(
            (item) => item.description?.toLowerCase().includes(lower) || item.plant_code?.toLowerCase().includes(lower)
        )
    }, [items, search])
    useEffect(() => {
        if (!isOpen) {
            setSearch('')
            setShowQuickAdd(false)
        }
    }, [isOpen])
    if (!isOpen) return null
    return ReactDOM.createPortal(
        <>
            <div onClick={onClose} className="fixed inset-0 z-[9999] backdrop-blur-[4px] bg-[rgba(15,23,42,0.6)]" />
            <div
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] flex flex-col max-h-[75vh] max-w-[520px] w-[92vw] animate-[modalSlideIn_0.2s_ease-out]"
                style={{ background: 'var(--bg-primary)' }}
            >
                <style>{`@keyframes modalSlideIn { from { opacity: 0; transform: translate(-50%, -48%); } to { opacity: 1; transform: translate(-50%, -50%); } }`}</style>
                <div
                    className="rounded-t-2xl px-6 py-5"
                    style={{
                        background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-white text-lg font-bold m-0">Add Task to Plan</h3>
                            <p className="text-[rgba(255,255,255,0.8)] text-[13px] mt-1 mb-0 mx-0">
                                {filteredItems.length} task{filteredItems.length !== 1 ? 's' : ''} available
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center bg-[rgba(255,255,255,0.2)] border-none rounded-lg text-white cursor-pointer text-sm h-9 w-9 transition-[background] duration-150"
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                        >
                            <i className="fas fa-times" />
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.6)] text-sm" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by description or plant..."
                                autoFocus
                                className="bg-[rgba(255,255,255,0.15)] border border-[rgba(255,255,255,0.2)] rounded-[10px] box-border text-white text-sm outline-none py-3 pr-3.5 pl-[42px] w-full placeholder:text-[rgba(255,255,255,0.5)]"
                            />
                        </div>
                        <button
                            onClick={() => setShowQuickAdd((v) => !v)}
                            className="flex items-center justify-center bg-[rgba(255,255,255,0.2)] border-none rounded-[10px] text-white cursor-pointer text-sm px-3.5 transition-[background] duration-150 gap-1.5 font-medium whitespace-nowrap"
                            style={{ background: showQuickAdd ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.background = showQuickAdd
                                    ? 'rgba(255,255,255,0.35)'
                                    : 'rgba(255,255,255,0.2)')
                            }
                        >
                            <i className={`fas ${showQuickAdd ? 'fa-list' : 'fa-plus'}`} />
                            {showQuickAdd ? 'Back' : 'New'}
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                    {showQuickAdd && <QuickAddForm accentColor={accentColor} onCreated={onItemCreated} />}
                    {filteredItems.length === 0 ? (
                        <div
                            className="flex flex-col items-center gap-2 px-5 py-10 text-center"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <i className="fas fa-search text-[32px] opacity-50" />
                            <span className="text-sm">
                                {search ? 'No tasks match your search' : 'No available tasks'}
                            </span>
                            {!showQuickAdd && (
                                <button
                                    onClick={() => setShowQuickAdd(true)}
                                    className="mt-2 flex items-center gap-1.5 border-none rounded-lg text-white text-xs font-semibold px-4 py-2 cursor-pointer"
                                    style={{ background: accentColor }}
                                >
                                    <i className="fas fa-plus" />
                                    Create New Item
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredItems.map((item) => {
                            const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.pending
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        onSelect(item.id)
                                        onClose()
                                    }}
                                    className="rounded-xl cursor-pointer mb-2.5 overflow-hidden transition-all duration-150"
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-light)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = accentColor
                                        e.currentTarget.style.boxShadow = `0 0 0 1px ${accentColor}`
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--border-light)'
                                        e.currentTarget.style.boxShadow = 'none'
                                    }}
                                >
                                    <div className="h-1 w-full" style={{ background: statusColor.bg }} />
                                    <div className="px-4 py-3.5">
                                        <div
                                            className="text-sm font-medium leading-normal mb-2.5"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            {item.description}
                                        </div>
                                        <div className="flex items-center flex-wrap gap-2">
                                            <span
                                                className="flex items-center rounded-md text-white text-[11px] font-semibold gap-[5px] px-2.5 py-1"
                                                style={{ background: accentColor }}
                                            >
                                                <i className="fas fa-industry text-[10px]" />
                                                {item.plant_code}
                                            </span>
                                            <span
                                                className="flex items-center rounded-md text-[10px] font-semibold gap-1 px-2 py-1 uppercase"
                                                style={{
                                                    background: statusColor.bg,
                                                    border: `1px solid ${statusColor.border}`,
                                                    color: statusColor.text
                                                }}
                                            >
                                                <i className={`fas ${statusColor.icon} text-[9px]`} />
                                                {item.status?.replace('_', ' ')}
                                            </span>
                                            <span
                                                className="flex items-center text-xs gap-[5px]"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                <i className="fas fa-calendar-alt text-[10px] opacity-70" />
                                                Due {new Date(item.deadline).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </>,
        document.body
    )
}
/** Single day column in the planner grid with drag/drop support, task list, and add button. */
function DayColumn({
    day,
    items,
    plannedItems,
    onAddItem,
    onRemoveItem,
    onMoveItem,
    onSelectItem,
    accentColor,
    isMobile,
    loading,
    onItemCreated
}) {
    const [showModal, setShowModal] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const dayPlannedItems = plannedItems.filter((pi) => pi.planned_date === day.dateStr)
    const taskCount = dayPlannedItems.length
    const handleDragOver = (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (!dragOver) setDragOver(true)
    }
    const handleDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setDragOver(false)
        }
    }
    const handleDrop = (e) => {
        e.preventDefault()
        setDragOver(false)
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'))
            if (data.fromDate === day.dateStr) return
            onMoveItem(data.fromDate, day.dateStr, data.itemId)
        } catch {}
    }
    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-1 flex-col rounded-xl relative transition-all duration-200 ease-in-out ${isMobile ? 'min-h-[180px] min-w-[150px]' : 'min-h-[240px] min-w-[170px]'}`}
            style={{
                background: dragOver
                    ? `${accentColor}12`
                    : day.isToday
                      ? `linear-gradient(180deg, ${accentColor}08 0%, ${accentColor}03 100%)`
                      : day.isPast
                        ? 'var(--bg-secondary)'
                        : 'var(--bg-primary)',
                border: dragOver
                    ? `2px dashed ${accentColor}`
                    : day.isToday
                      ? `2px solid ${accentColor}`
                      : '1px solid var(--border-light)',
                opacity: loading ? 0.6 : 1
            }}
        >
            <div
                className={`flex flex-col items-center gap-0.5 rounded-t-[10px] relative ${isMobile ? 'px-2 py-2.5' : 'px-3.5 py-3'}`}
                style={{
                    background: day.isToday
                        ? `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`
                        : 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)'
                }}
            >
                {day.isToday && (
                    <div
                        className="absolute top-2 right-2 bg-white rounded text-[9px] font-bold tracking-[0.5px] px-1.5 py-0.5 uppercase"
                        style={{ color: accentColor }}
                    >
                        TODAY
                    </div>
                )}
                <span
                    className={`font-bold ${isMobile ? 'text-[13px]' : 'text-sm'}`}
                    style={{ color: day.isToday ? '#fff' : 'var(--text-primary)' }}
                >
                    {day.fullLabel}
                </span>
                <span
                    className={`font-medium ${isMobile ? 'text-[11px]' : 'text-xs'}`}
                    style={{ color: day.isToday ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)' }}
                >
                    {day.date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                </span>
                {taskCount > 0 && (
                    <div
                        className="rounded-[10px] text-white text-[10px] font-bold mt-1 px-2 py-0.5"
                        style={{
                            background: day.isToday ? 'rgba(255,255,255,0.25)' : accentColor
                        }}
                    >
                        {taskCount} task{taskCount !== 1 ? 's' : ''}
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-2.5">
                {dayPlannedItems.map((pi) => {
                    const item =
                        ListService.listItems.find((i) => i.id === pi.list_item_id) ||
                        items.find((i) => i.id === pi.list_item_id)
                    if (!item) return null
                    return (
                        <PlannerItem
                            key={pi.list_item_id}
                            item={item}
                            onRemove={() => onRemoveItem(day.dateStr, pi.list_item_id)}
                            onSelect={onSelectItem}
                            accentColor={accentColor}
                            isPast={day.isPast}
                            dateStr={day.dateStr}
                        />
                    )
                })}
                {taskCount === 0 && !dragOver && (
                    <div
                        className="flex flex-col items-center gap-1.5 justify-center min-h-[80px] text-center"
                        style={{ color: 'var(--text-secondary)', opacity: 0.5 }}
                    >
                        <i className="fas fa-calendar-plus text-xl" />
                        <span className="text-[11px]">No tasks</span>
                    </div>
                )}
                {dragOver && taskCount === 0 && (
                    <div
                        className="flex flex-col items-center gap-1.5 justify-center min-h-[80px] text-center"
                        style={{ color: accentColor, opacity: 0.7 }}
                    >
                        <i className="fas fa-arrow-down text-xl" />
                        <span className="text-[11px] font-medium">Drop here</span>
                    </div>
                )}
            </div>
            <div className="p-2.5">
                <button
                    onClick={() => setShowModal(true)}
                    disabled={loading}
                    className={`flex items-center rounded-lg text-xs font-medium gap-1.5 justify-center px-3 py-2 transition-all duration-150 w-full ${loading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{
                        background: day.isToday ? accentColor : 'transparent',
                        border: day.isToday ? 'none' : '1px dashed var(--border-light)',
                        color: day.isToday ? '#fff' : 'var(--text-secondary)'
                    }}
                    onMouseEnter={(e) => {
                        if (!day.isToday && !loading) {
                            e.currentTarget.style.background = 'var(--bg-tertiary)'
                            e.currentTarget.style.borderColor = 'var(--border-medium)'
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!day.isToday) {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.borderColor = 'var(--border-light)'
                        }
                    }}
                >
                    <i className="fas fa-plus text-[10px]" />
                    Add Task
                </button>
            </div>
            <TaskSelectorModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                items={items}
                onSelect={(itemId) => onAddItem(day.dateStr, itemId)}
                accentColor={accentColor}
                onItemCreated={onItemCreated}
            />
        </div>
    )
}
/**
 * Shared team weekly planner grid (Mon-Sat) for scheduling list items.
 * Supports week navigation, drag-and-drop reordering, task add/remove, and bulk clear.
 * @param {Object} props
 * @param {Array} props.items - All available list items.
 * @param {Function} props.onSelectItem - Callback when a task card is clicked.
 * @param {string} [props.accentColor='#1e3a5f'] - Theme accent color.
 * @param {Function} [props.onItemsChanged] - Callback when items list needs refreshing (after quick-add).
 */
export default function WeeklyPlanner({ items, onSelectItem, accentColor = '#1e3a5f', onItemsChanged }) {
    const [weekOffset, setWeekOffset] = useState(0)
    const [plannedItems, setPlannedItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [aiPlanning, setAiPlanning] = useState(false)
    const [aiPlanResult, setAiPlanResult] = useState(null)
    const autoPlanRanForWeek = useRef(null)
    const isMobile = useIsMobile()
    const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
    const weekLabel = useMemo(() => {
        const start = weekDates[0].date
        const end = weekDates[5].date
        const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
        const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
        const year = end.getFullYear()
        if (startMonth === endMonth) return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`
        return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`
    }, [weekDates])
    const startDate = weekDates[0].dateStr
    const endDate = weekDates[5].dateStr
    const loadPlannedItems = useCallback(async () => {
        setLoading(true)
        try {
            const data = await ListService.fetchPlannedItems(startDate, endDate)
            setPlannedItems(data)
        } catch (err) {
            console.error('Failed to load planned items:', err)
        } finally {
            setLoading(false)
        }
    }, [startDate, endDate])
    useEffect(() => {
        loadPlannedItems()
    }, [loadPlannedItems])
    const handleAddItem = useCallback(
        async (plannedDate, itemId) => {
            try {
                await ListService.addPlannedItem(itemId, plannedDate)
                await loadPlannedItems()
            } catch (err) {
                console.error('Failed to add planned item:', err)
            }
        },
        [loadPlannedItems]
    )
    const handleRemoveItem = useCallback(
        async (plannedDate, itemId) => {
            try {
                await ListService.removePlannedItem(itemId, plannedDate)
                await loadPlannedItems()
            } catch (err) {
                console.error('Failed to remove planned item:', err)
            }
        },
        [loadPlannedItems]
    )
    /** Moves a task from one day to another by removing from the source and adding to the target. */
    const handleMoveItem = useCallback(
        async (fromDate, toDate, itemId) => {
            // Optimistic update for snappy feel
            setPlannedItems((prev) => {
                const without = prev.filter((pi) => !(pi.list_item_id === itemId && pi.planned_date === fromDate))
                return [...without, { list_item_id: itemId, planned_date: toDate }]
            })
            try {
                await ListService.removePlannedItem(itemId, fromDate)
                await ListService.addPlannedItem(itemId, toDate)
                await loadPlannedItems()
            } catch (err) {
                console.error('Failed to move planned item:', err)
                await loadPlannedItems()
            }
        },
        [loadPlannedItems]
    )
    const [showClearConfirm, setShowClearConfirm] = useState(false)
    const handleClearAll = useCallback(() => {
        setShowClearConfirm(true)
    }, [])
    const confirmClearAll = useCallback(async () => {
        setShowClearConfirm(false)
        try {
            await ListService.clearPlannedItems(startDate, endDate)
            await loadPlannedItems()
        } catch (err) {
            console.error('Failed to clear planned items:', err)
        }
    }, [startDate, endDate, loadPlannedItems])
    const handleItemCreated = useCallback(() => {
        onItemsChanged?.()
    }, [onItemsChanged])
    const hasOpenItems = useMemo(() => items.some((item) => !item.completed && item.status !== 'completed'), [items])
    const handleAiPlan = useCallback(async () => {
        setAiPlanning(true)
        setAiPlanResult(null)
        let totalAdded = 0
        try {
            const freshPlanned = await ListService.fetchPlannedItems(startDate, endDate)
            const assignmentsByDay = await ListService.autoPlanWeek(weekDates, freshPlanned)
            if (assignmentsByDay.size === 0) {
                setAiPlanResult({ count: 0, error: false })
                return
            }
            const today = new Date().toISOString().split('T')[0]
            const futureDays = weekDates.filter((d) => d.dateStr >= today)
            const dayCounts = new Map()
            for (const pi of freshPlanned) {
                dayCounts.set(pi.planned_date, (dayCounts.get(pi.planned_date) || 0) + 1)
            }
            for (const day of futureDays) {
                const dayItemIds = assignmentsByDay.get(day.dateStr)
                if (!dayItemIds?.length) continue
                const currentCount = dayCounts.get(day.dateStr) || 0
                const slotsLeft = 3 - currentCount
                if (slotsLeft <= 0) continue
                const toAdd = dayItemIds.slice(0, slotsLeft)
                for (const itemId of toAdd) {
                    try {
                        await ListService.addPlannedItem(itemId, day.dateStr)
                        totalAdded++
                        dayCounts.set(day.dateStr, (dayCounts.get(day.dateStr) || 0) + 1)
                    } catch {}
                }
                await loadPlannedItems()
            }
            setAiPlanResult({ count: totalAdded, error: false })
        } catch {
            setAiPlanResult({ count: totalAdded, error: totalAdded === 0 })
        } finally {
            setAiPlanning(false)
            setTimeout(() => setAiPlanResult(null), 4000)
        }
    }, [weekDates, startDate, endDate, loadPlannedItems])
    useEffect(() => {
        if (loading || aiPlanning || !hasOpenItems) return
        const weekKey = `${startDate}_${endDate}`
        if (autoPlanRanForWeek.current === weekKey) return
        autoPlanRanForWeek.current = weekKey
        handleAiPlan()
    }, [loading, aiPlanning, hasOpenItems, startDate, endDate, handleAiPlan])
    const totalPlanned = plannedItems.length
    return (
        <div className={`flex flex-col ${isMobile ? 'gap-3 p-2.5' : 'gap-5 p-5'}`}>
            <div
                className={`shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex justify-between ${isMobile ? 'flex-col gap-3 rounded-[10px] p-3' : 'flex-row gap-4 rounded-[14px] px-5 py-4'}`}
                style={{
                    background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
                    border: '1px solid var(--border-light)'
                }}
            >
                <div
                    className={`flex items-center ${isMobile ? 'gap-2 justify-between w-full' : 'gap-3 justify-start w-auto'}`}
                >
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setWeekOffset((w) => w - 1)}
                            className={`flex items-center justify-center border-none rounded-lg cursor-pointer transition-all duration-150 ${isMobile ? 'text-xs h-8 w-8' : 'text-sm h-9 w-9'}`}
                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                        >
                            <i className="fas fa-chevron-left" />
                        </button>
                        <button
                            onClick={() => setWeekOffset((w) => w + 1)}
                            className={`flex items-center justify-center border-none rounded-lg cursor-pointer transition-all duration-150 ${isMobile ? 'text-xs h-8 w-8' : 'text-sm h-9 w-9'}`}
                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                        >
                            <i className="fas fa-chevron-right" />
                        </button>
                    </div>
                    <div className={`flex flex-col ${isMobile ? 'flex-1 text-center' : 'flex-none text-left'}`}>
                        <span
                            className={`font-bold ${isMobile ? 'text-sm' : 'text-[17px]'}`}
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {weekLabel}
                        </span>
                        {!isMobile && (
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                Week{' '}
                                {Math.ceil(
                                    (weekDates[0].date.getDate() +
                                        new Date(
                                            weekDates[0].date.getFullYear(),
                                            weekDates[0].date.getMonth(),
                                            1
                                        ).getDay()) /
                                        7
                                )}
                            </span>
                        )}
                    </div>
                    {weekOffset !== 0 && (
                        <button
                            onClick={() => setWeekOffset(0)}
                            className={`flex items-center border-none rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)] text-white cursor-pointer font-semibold gap-[5px] transition-all duration-150 ${isMobile ? 'text-[11px] px-2.5 py-1.5' : 'text-xs px-3.5 py-2'}`}
                            style={{
                                background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`
                            }}
                        >
                            <i className="fas fa-calendar-day text-[10px]" />
                            Today
                        </button>
                    )}
                </div>
                <div className={`flex items-center ${isMobile ? 'gap-2 justify-center' : 'gap-2.5 justify-end'}`}>
                    {loading && (
                        <div className="flex items-center text-[13px] gap-1.5" style={{ color: accentColor }}>
                            <i className="fas fa-circle-notch fa-spin" />
                            {!isMobile && <span>Loading...</span>}
                        </div>
                    )}
                    <div
                        className={`flex items-center rounded-[10px] gap-1.5 ${isMobile ? 'px-2.5 py-1.5' : 'px-3.5 py-2'}`}
                        style={{
                            background: totalPlanned > 0 ? `${accentColor}15` : 'var(--bg-tertiary)',
                            border: totalPlanned > 0 ? `1px solid ${accentColor}30` : '1px solid var(--border-light)'
                        }}
                    >
                        <i
                            className={`fas fa-clipboard-check ${isMobile ? 'text-[11px]' : 'text-[13px]'}`}
                            style={{
                                color: totalPlanned > 0 ? accentColor : 'var(--text-secondary)'
                            }}
                        />
                        <span
                            className={`font-semibold ${isMobile ? 'text-xs' : 'text-[13px]'}`}
                            style={{
                                color: totalPlanned > 0 ? accentColor : 'var(--text-secondary)'
                            }}
                        >
                            {totalPlanned} {isMobile ? '' : 'planned'}
                        </span>
                    </div>
                    <button
                        onClick={handleAiPlan}
                        disabled={loading || aiPlanning || !hasOpenItems}
                        className={`flex items-center rounded-lg font-semibold gap-[5px] transition-all duration-150 ${loading || aiPlanning || !hasOpenItems ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${isMobile ? 'text-[11px] px-2.5 py-1.5' : 'text-xs px-3 py-2'}`}
                        style={{
                            background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
                            border: 'none',
                            color: '#fff'
                        }}
                    >
                        <i
                            className={`fas ${aiPlanning ? 'fa-circle-notch fa-spin' : 'fa-wand-magic-sparkles'} text-[10px]`}
                        />
                        {!isMobile && (aiPlanning ? 'Planning...' : 'AI Plan')}
                    </button>
                    {aiPlanResult && (
                        <div
                            className={`flex items-center rounded-lg gap-1.5 ${isMobile ? 'text-[10px] px-2 py-1' : 'text-xs px-2.5 py-1.5'}`}
                            style={{
                                background: aiPlanResult.error
                                    ? 'rgba(220,38,38,0.1)'
                                    : aiPlanResult.count > 0
                                      ? 'rgba(22,163,74,0.1)'
                                      : 'rgba(202,138,4,0.1)',
                                border: `1px solid ${aiPlanResult.error ? 'rgba(220,38,38,0.3)' : aiPlanResult.count > 0 ? 'rgba(22,163,74,0.3)' : 'rgba(202,138,4,0.3)'}`,
                                color: aiPlanResult.error ? '#dc2626' : aiPlanResult.count > 0 ? '#16a34a' : '#ca8a04'
                            }}
                        >
                            <i
                                className={`fas ${aiPlanResult.error ? 'fa-exclamation-circle' : aiPlanResult.count > 0 ? 'fa-check-circle' : 'fa-info-circle'} text-[10px]`}
                            />
                            {aiPlanResult.error
                                ? 'Failed'
                                : aiPlanResult.count > 0
                                  ? `Added ${aiPlanResult.count} item${aiPlanResult.count !== 1 ? 's' : ''}`
                                  : 'All items planned'}
                        </div>
                    )}
                    {totalPlanned > 0 && (
                        <button
                            onClick={handleClearAll}
                            disabled={loading}
                            className={`flex items-center rounded-lg font-medium gap-[5px] transition-all duration-150 ${loading ? 'cursor-not-allowed' : 'cursor-pointer'} ${isMobile ? 'text-[11px] px-2.5 py-1.5' : 'text-xs px-3 py-2'}`}
                            style={{
                                background: 'rgba(220,38,38,0.1)',
                                border: '1px solid rgba(220,38,38,0.3)',
                                color: '#dc2626'
                            }}
                        >
                            <i className="fas fa-trash-alt text-[10px]" />
                            {!isMobile && 'Clear'}
                        </button>
                    )}
                </div>
            </div>
            <div
                className={`flex overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] ${isMobile ? 'gap-2 snap-x snap-mandatory' : 'gap-3.5 snap-none'}`}
            >
                {weekDates.map((day) => (
                    <DayColumn
                        key={day.key}
                        day={day}
                        items={items}
                        plannedItems={plannedItems}
                        onAddItem={handleAddItem}
                        onRemoveItem={handleRemoveItem}
                        onMoveItem={handleMoveItem}
                        onSelectItem={onSelectItem}
                        accentColor={accentColor}
                        isMobile={isMobile}
                        loading={loading}
                        onItemCreated={handleItemCreated}
                    />
                ))}
            </div>
            {!isMobile && (
                <div
                    className="flex items-center rounded-[10px] gap-2.5 px-4 py-3"
                    style={{
                        background: `linear-gradient(135deg, ${accentColor}25 0%, ${accentColor}40 100%)`,
                        border: `1px solid ${accentColor}50`
                    }}
                >
                    <div
                        className="flex items-center justify-center rounded-lg text-white text-sm h-8 w-8"
                        style={{ background: accentColor }}
                    >
                        <i className="fas fa-users" />
                    </div>
                    <div>
                        <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                            Shared Team Schedule
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            All team members can view and edit this weekly plan &bull; Drag tasks between days to
                            reschedule
                        </div>
                    </div>
                </div>
            )}
            <ConfirmDialog
                isOpen={showClearConfirm}
                onConfirm={confirmClearAll}
                onCancel={() => setShowClearConfirm(false)}
                title="Clear all planned tasks?"
                message={`This will remove all ${totalPlanned} planned task${totalPlanned !== 1 ? 's' : ''} for this week.`}
                confirmLabel="Clear All"
                variant="warning"
            />
        </div>
    )
}
