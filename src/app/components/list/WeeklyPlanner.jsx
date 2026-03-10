import React, { useCallback, useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom'

import { ListService } from '../../../services/ListService'
import { useIsMobile } from '../../hooks/useIsMobile'
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
function PlannerItem({ item, onRemove, onSelect, accentColor, isPast }) {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.pending
    const isCompleted = item.status === 'completed' || item.completed
    const needsFollowUp = isPast && !isCompleted
    return (
        <div
            onClick={() => onSelect?.(item)}
            className="planner-task-card rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] cursor-pointer mb-2 overflow-hidden relative transition-all duration-200 ease-in-out"
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
/** Portal-rendered modal for selecting an available list item to add to a day's plan. */
function TaskSelectorModal({ isOpen, onClose, items, onSelect, accentColor }) {
    const [search, setSearch] = useState('')
    const filteredItems = useMemo(() => {
        const available = items.filter((item) => !item.completed && item.status !== 'completed')
        if (!search.trim()) return available
        const lower = search.toLowerCase()
        return available.filter(
            (item) => item.description?.toLowerCase().includes(lower) || item.plant_code?.toLowerCase().includes(lower)
        )
    }, [items, search])
    useEffect(() => {
        if (!isOpen) setSearch('')
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
                    <div className="relative">
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
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                    {filteredItems.length === 0 ? (
                        <div
                            className="flex flex-col items-center gap-2 px-5 py-10 text-center"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <i className="fas fa-search text-[32px] opacity-50" />
                            <span className="text-sm">
                                {search ? 'No tasks match your search' : 'No available tasks'}
                            </span>
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
/** Single day column in the planner grid with task list, add button, and task selector modal. */
function DayColumn({
    day,
    items,
    plannedItems,
    onAddItem,
    onRemoveItem,
    onSelectItem,
    accentColor,
    isMobile,
    loading
}) {
    const [showModal, setShowModal] = useState(false)
    const dayPlannedItems = plannedItems.filter((pi) => pi.planned_date === day.dateStr)
    const taskCount = dayPlannedItems.length
    return (
        <div
            className={`flex flex-1 flex-col rounded-xl relative transition-all duration-200 ease-in-out ${isMobile ? 'min-h-[180px] min-w-[150px]' : 'min-h-[240px] min-w-[170px]'}`}
            style={{
                background: day.isToday
                    ? `linear-gradient(180deg, ${accentColor}08 0%, ${accentColor}03 100%)`
                    : day.isPast
                      ? 'var(--bg-secondary)'
                      : 'var(--bg-primary)',
                border: day.isToday ? `2px solid ${accentColor}` : '1px solid var(--border-light)',
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
                    const item = items.find((i) => i.id === pi.list_item_id)
                    if (!item) return null
                    return (
                        <PlannerItem
                            key={pi.list_item_id}
                            item={item}
                            onRemove={() => onRemoveItem(day.dateStr, pi.list_item_id)}
                            onSelect={onSelectItem}
                            accentColor={accentColor}
                            isPast={day.isPast}
                        />
                    )
                })}
                {taskCount === 0 && (
                    <div
                        className="flex flex-col items-center gap-1.5 justify-center min-h-[80px] text-center"
                        style={{ color: 'var(--text-secondary)', opacity: 0.5 }}
                    >
                        <i className="fas fa-calendar-plus text-xl" />
                        <span className="text-[11px]">No tasks</span>
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
            />
        </div>
    )
}
/**
 * Shared team weekly planner grid (Mon-Sat) for scheduling list items.
 * Supports week navigation, task add/remove, and bulk clear.
 * @param {Object} props
 * @param {Array} props.items - All available list items.
 * @param {Function} props.onSelectItem - Callback when a task card is clicked.
 * @param {string} [props.accentColor='#1e3a5f'] - Theme accent color.
 */
export default function WeeklyPlanner({ items, onSelectItem, accentColor = '#1e3a5f' }) {
    const [weekOffset, setWeekOffset] = useState(0)
    const [plannedItems, setPlannedItems] = useState([])
    const [loading, setLoading] = useState(true)
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
    const handleClearAll = useCallback(async () => {
        if (!window.confirm('Clear all planned tasks for this week?')) return
        try {
            await ListService.clearPlannedItems(startDate, endDate)
            await loadPlannedItems()
        } catch (err) {
            console.error('Failed to clear planned items:', err)
        }
    }, [startDate, endDate, loadPlannedItems])
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
                        onSelectItem={onSelectItem}
                        accentColor={accentColor}
                        isMobile={isMobile}
                        loading={loading}
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
                            All team members can view and edit this weekly plan
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
