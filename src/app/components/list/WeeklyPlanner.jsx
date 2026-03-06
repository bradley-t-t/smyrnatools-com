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
    blocked: { bg: '#fef2f2', border: '#fecaca', icon: 'fa-ban', text: '#dc2626' },
    completed: { bg: '#f0fdf4', border: '#bbf7d0', icon: 'fa-check', text: '#16a34a' },
    in_progress: { bg: '#eff6ff', border: '#bfdbfe', icon: 'fa-spinner', text: '#2563eb' },
    ordered_materials: { bg: '#eff6ff', border: '#bfdbfe', icon: 'fa-truck', text: '#2563eb' },
    overdue: { bg: '#fef2f2', border: '#fecaca', icon: 'fa-exclamation', text: '#dc2626' },
    pending: { bg: '#fffbeb', border: '#fde68a', icon: 'fa-clock', text: '#d97706' },
    waiting: { bg: '#fefce8', border: '#fef08a', icon: 'fa-hourglass-half', text: '#ca8a04' }
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
            className="planner-task-card"
            style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
                cursor: 'pointer',
                marginBottom: '8px',
                overflow: 'hidden',
                position: 'relative',
                transition: 'all 0.2s ease'
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
                <div
                    className="flex flex-col items-center justify-center gap-1"
                    style={{
                        background: 'rgba(22, 163, 74, 0.85)',
                        borderRadius: '8px',
                        bottom: 0,
                        left: 0,
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        zIndex: 2
                    }}
                >
                    <i className="fas fa-check-circle text-white text-lg" />
                    <span className="text-white text-xs font-bold uppercase tracking-wide">Completed</span>
                </div>
            )}
            {needsFollowUp && (
                <div
                    className="flex flex-col items-center justify-center gap-1"
                    style={{
                        background: 'rgba(220, 38, 38, 0.85)',
                        borderRadius: '8px',
                        bottom: 0,
                        left: 0,
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        zIndex: 2
                    }}
                >
                    <i className="fas fa-exclamation-triangle text-white text-lg" />
                    <span className="text-white text-xs font-bold uppercase tracking-wide">Needs Follow Up</span>
                </div>
            )}
            <div style={{ background: statusColor.text, height: '3px', width: '100%' }} />
            <div style={{ padding: '10px 12px' }}>
                <div style={{ alignItems: 'flex-start', display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                    <div style={{ color: '#1e293b', flex: 1, fontSize: '13px', fontWeight: 500, lineHeight: 1.4 }}>
                        {item.description?.length > 45 ? `${item.description.slice(0, 45)}...` : item.description}
                    </div>
                    {onRemove && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onRemove(item.id)
                            }}
                            style={{
                                alignItems: 'center',
                                background: '#f1f5f9',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                display: 'flex',
                                fontSize: '10px',
                                height: '20px',
                                justifyContent: 'center',
                                transition: 'all 0.15s',
                                width: '20px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fee2e2'
                                e.currentTarget.style.color = '#ef4444'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#f1f5f9'
                                e.currentTarget.style.color = '#94a3b8'
                            }}
                        >
                            <i className="fas fa-times" />
                        </button>
                    )}
                </div>
                <div style={{ alignItems: 'center', display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <span
                        style={{
                            alignItems: 'center',
                            background: accentColor,
                            borderRadius: '4px',
                            color: '#fff',
                            display: 'flex',
                            fontSize: '10px',
                            fontWeight: 600,
                            gap: '4px',
                            padding: '3px 6px'
                        }}
                    >
                        <i className="fas fa-industry" style={{ fontSize: '8px' }} />
                        {item.plant_code}
                    </span>
                    <span
                        style={{
                            alignItems: 'center',
                            background: statusColor.bg,
                            border: `1px solid ${statusColor.border}`,
                            borderRadius: '4px',
                            color: statusColor.text,
                            display: 'flex',
                            fontSize: '9px',
                            fontWeight: 600,
                            gap: '3px',
                            padding: '2px 5px',
                            textTransform: 'uppercase'
                        }}
                    >
                        <i className={`fas ${statusColor.icon}`} style={{ fontSize: '8px' }} />
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
            <div
                onClick={onClose}
                style={{
                    backdropFilter: 'blur(4px)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    bottom: 0,
                    left: 0,
                    position: 'fixed',
                    right: 0,
                    top: 0,
                    zIndex: 9999
                }}
            />
            <div
                style={{
                    animation: 'modalSlideIn 0.2s ease-out',
                    background: '#fff',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    left: '50%',
                    maxHeight: '75vh',
                    maxWidth: '520px',
                    position: 'fixed',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '92vw',
                    zIndex: 10000
                }}
            >
                <style>{`@keyframes modalSlideIn { from { opacity: 0; transform: translate(-50%, -48%); } to { opacity: 1; transform: translate(-50%, -50%); } }`}</style>
                <div
                    style={{
                        background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
                        borderRadius: '16px 16px 0 0',
                        padding: '20px 24px'
                    }}
                >
                    <div
                        style={{
                            alignItems: 'center',
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '16px'
                        }}
                    >
                        <div>
                            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>
                                Add Task to Plan
                            </h3>
                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', margin: '4px 0 0 0' }}>
                                {filteredItems.length} task{filteredItems.length !== 1 ? 's' : ''} available
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                alignItems: 'center',
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                fontSize: '14px',
                                height: '36px',
                                justifyContent: 'center',
                                transition: 'background 0.15s',
                                width: '36px'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                        >
                            <i className="fas fa-times" />
                        </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <i
                            className="fas fa-search"
                            style={{
                                color: 'rgba(255,255,255,0.6)',
                                fontSize: '14px',
                                left: '14px',
                                position: 'absolute',
                                top: '50%',
                                transform: 'translateY(-50%)'
                            }}
                        />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by description or plant..."
                            autoFocus
                            style={{
                                background: 'rgba(255,255,255,0.15)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '10px',
                                boxSizing: 'border-box',
                                color: '#fff',
                                fontSize: '14px',
                                outline: 'none',
                                padding: '12px 14px 12px 42px',
                                width: '100%'
                            }}
                        />
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                    {filteredItems.length === 0 ? (
                        <div
                            style={{
                                alignItems: 'center',
                                color: '#94a3b8',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                padding: '40px 20px',
                                textAlign: 'center'
                            }}
                        >
                            <i className="fas fa-search" style={{ fontSize: '32px', opacity: 0.5 }} />
                            <span style={{ fontSize: '14px' }}>
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
                                    style={{
                                        background: '#fff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        marginBottom: '10px',
                                        overflow: 'hidden',
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = accentColor
                                        e.currentTarget.style.boxShadow = `0 0 0 1px ${accentColor}`
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#e5e7eb'
                                        e.currentTarget.style.boxShadow = 'none'
                                    }}
                                >
                                    <div style={{ background: statusColor.bg, height: '4px', width: '100%' }} />
                                    <div style={{ padding: '14px 16px' }}>
                                        <div
                                            style={{
                                                color: '#1e293b',
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                lineHeight: 1.5,
                                                marginBottom: '10px'
                                            }}
                                        >
                                            {item.description}
                                        </div>
                                        <div
                                            style={{
                                                alignItems: 'center',
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '8px'
                                            }}
                                        >
                                            <span
                                                style={{
                                                    alignItems: 'center',
                                                    background: accentColor,
                                                    borderRadius: '6px',
                                                    color: '#fff',
                                                    display: 'flex',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    gap: '5px',
                                                    padding: '4px 10px'
                                                }}
                                            >
                                                <i className="fas fa-industry" style={{ fontSize: '10px' }} />
                                                {item.plant_code}
                                            </span>
                                            <span
                                                style={{
                                                    alignItems: 'center',
                                                    background: statusColor.bg,
                                                    border: `1px solid ${statusColor.border}`,
                                                    borderRadius: '6px',
                                                    color: statusColor.text,
                                                    display: 'flex',
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    gap: '4px',
                                                    padding: '4px 8px',
                                                    textTransform: 'uppercase'
                                                }}
                                            >
                                                <i className={`fas ${statusColor.icon}`} style={{ fontSize: '9px' }} />
                                                {item.status?.replace('_', ' ')}
                                            </span>
                                            <span
                                                style={{
                                                    alignItems: 'center',
                                                    color: '#64748b',
                                                    display: 'flex',
                                                    fontSize: '12px',
                                                    gap: '5px'
                                                }}
                                            >
                                                <i
                                                    className="fas fa-calendar-alt"
                                                    style={{ fontSize: '10px', opacity: 0.7 }}
                                                />
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
            style={{
                background: day.isToday
                    ? `linear-gradient(180deg, ${accentColor}08 0%, ${accentColor}03 100%)`
                    : day.isPast
                      ? '#fafafa'
                      : '#fff',
                border: day.isToday ? `2px solid ${accentColor}` : '1px solid #e2e8f0',
                borderRadius: '12px',
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
                minHeight: isMobile ? '180px' : '240px',
                minWidth: isMobile ? '150px' : '170px',
                opacity: loading ? 0.6 : 1,
                position: 'relative',
                transition: 'all 0.2s ease'
            }}
        >
            <div
                style={{
                    alignItems: 'center',
                    background: day.isToday
                        ? `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`
                        : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderRadius: '10px 10px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    padding: isMobile ? '10px 8px' : '12px 14px',
                    position: 'relative'
                }}
            >
                {day.isToday && (
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: '4px',
                            color: accentColor,
                            fontSize: '9px',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            padding: '2px 6px',
                            position: 'absolute',
                            right: '8px',
                            textTransform: 'uppercase',
                            top: '8px'
                        }}
                    >
                        TODAY
                    </div>
                )}
                <span
                    style={{
                        color: day.isToday ? '#fff' : '#374151',
                        fontSize: isMobile ? '13px' : '14px',
                        fontWeight: 700
                    }}
                >
                    {day.fullLabel}
                </span>
                <span
                    style={{
                        color: day.isToday ? 'rgba(255,255,255,0.85)' : '#64748b',
                        fontSize: isMobile ? '11px' : '12px',
                        fontWeight: 500
                    }}
                >
                    {day.date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                </span>
                {taskCount > 0 && (
                    <div
                        style={{
                            background: day.isToday ? 'rgba(255,255,255,0.25)' : accentColor,
                            borderRadius: '10px',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 700,
                            marginTop: '4px',
                            padding: '2px 8px'
                        }}
                    >
                        {taskCount} task{taskCount !== 1 ? 's' : ''}
                    </div>
                )}
            </div>
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '10px'
                }}
            >
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
                        style={{
                            alignItems: 'center',
                            color: '#cbd5e1',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            justifyContent: 'center',
                            minHeight: '80px',
                            textAlign: 'center'
                        }}
                    >
                        <i className="fas fa-calendar-plus" style={{ fontSize: '20px' }} />
                        <span style={{ fontSize: '11px' }}>No tasks</span>
                    </div>
                )}
            </div>
            <div style={{ padding: '10px' }}>
                <button
                    onClick={() => setShowModal(true)}
                    disabled={loading}
                    style={{
                        alignItems: 'center',
                        background: day.isToday ? accentColor : 'transparent',
                        border: day.isToday ? 'none' : '1px dashed #cbd5e1',
                        borderRadius: '8px',
                        color: day.isToday ? '#fff' : '#64748b',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        fontSize: '12px',
                        fontWeight: 500,
                        gap: '6px',
                        justifyContent: 'center',
                        padding: '8px 12px',
                        transition: 'all 0.15s',
                        width: '100%'
                    }}
                    onMouseEnter={(e) => {
                        if (!day.isToday && !loading) {
                            e.currentTarget.style.background = '#f1f5f9'
                            e.currentTarget.style.borderColor = '#94a3b8'
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!day.isToday) {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.borderColor = '#cbd5e1'
                        }
                    }}
                >
                    <i className="fas fa-plus" style={{ fontSize: '10px' }} />
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
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '12px' : '20px',
                padding: isMobile ? '10px' : '20px'
            }}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: isMobile ? '10px' : '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '12px' : '16px',
                    justifyContent: 'space-between',
                    padding: isMobile ? '12px' : '16px 20px'
                }}
            >
                <div
                    style={{
                        alignItems: 'center',
                        display: 'flex',
                        gap: isMobile ? '8px' : '12px',
                        justifyContent: isMobile ? 'space-between' : 'flex-start',
                        width: isMobile ? '100%' : 'auto'
                    }}
                >
                    <div style={{ alignItems: 'center', display: 'flex', gap: '4px' }}>
                        <button
                            onClick={() => setWeekOffset((w) => w - 1)}
                            style={{
                                alignItems: 'center',
                                background: '#f1f5f9',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#475569',
                                cursor: 'pointer',
                                display: 'flex',
                                fontSize: isMobile ? '12px' : '14px',
                                height: isMobile ? '32px' : '36px',
                                justifyContent: 'center',
                                transition: 'all 0.15s',
                                width: isMobile ? '32px' : '36px'
                            }}
                        >
                            <i className="fas fa-chevron-left" />
                        </button>
                        <button
                            onClick={() => setWeekOffset((w) => w + 1)}
                            style={{
                                alignItems: 'center',
                                background: '#f1f5f9',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#475569',
                                cursor: 'pointer',
                                display: 'flex',
                                fontSize: isMobile ? '12px' : '14px',
                                height: isMobile ? '32px' : '36px',
                                justifyContent: 'center',
                                transition: 'all 0.15s',
                                width: isMobile ? '32px' : '36px'
                            }}
                        >
                            <i className="fas fa-chevron-right" />
                        </button>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flex: isMobile ? 1 : 'none',
                            flexDirection: 'column',
                            textAlign: isMobile ? 'center' : 'left'
                        }}
                    >
                        <span style={{ color: '#1e293b', fontSize: isMobile ? '14px' : '17px', fontWeight: 700 }}>
                            {weekLabel}
                        </span>
                        {!isMobile && (
                            <span style={{ color: '#64748b', fontSize: '12px' }}>
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
                            style={{
                                alignItems: 'center',
                                background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
                                border: 'none',
                                borderRadius: '8px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                fontSize: isMobile ? '11px' : '12px',
                                fontWeight: 600,
                                gap: '5px',
                                padding: isMobile ? '6px 10px' : '8px 14px',
                                transition: 'all 0.15s'
                            }}
                        >
                            <i className="fas fa-calendar-day" style={{ fontSize: '10px' }} />
                            Today
                        </button>
                    )}
                </div>
                <div
                    style={{
                        alignItems: 'center',
                        display: 'flex',
                        gap: isMobile ? '8px' : '10px',
                        justifyContent: isMobile ? 'center' : 'flex-end'
                    }}
                >
                    {loading && (
                        <div
                            style={{
                                alignItems: 'center',
                                color: accentColor,
                                display: 'flex',
                                fontSize: '13px',
                                gap: '6px'
                            }}
                        >
                            <i className="fas fa-circle-notch fa-spin" />
                            {!isMobile && <span>Loading...</span>}
                        </div>
                    )}
                    <div
                        style={{
                            alignItems: 'center',
                            background: totalPlanned > 0 ? `${accentColor}15` : '#f1f5f9',
                            border: totalPlanned > 0 ? `1px solid ${accentColor}30` : '1px solid #e2e8f0',
                            borderRadius: '10px',
                            display: 'flex',
                            gap: '6px',
                            padding: isMobile ? '6px 10px' : '8px 14px'
                        }}
                    >
                        <i
                            className="fas fa-clipboard-check"
                            style={{
                                color: totalPlanned > 0 ? accentColor : '#64748b',
                                fontSize: isMobile ? '11px' : '13px'
                            }}
                        />
                        <span
                            style={{
                                color: totalPlanned > 0 ? accentColor : '#475569',
                                fontSize: isMobile ? '12px' : '13px',
                                fontWeight: 600
                            }}
                        >
                            {totalPlanned} {isMobile ? '' : 'planned'}
                        </span>
                    </div>
                    {totalPlanned > 0 && (
                        <button
                            onClick={handleClearAll}
                            disabled={loading}
                            style={{
                                alignItems: 'center',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                                color: '#dc2626',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                fontSize: isMobile ? '11px' : '12px',
                                fontWeight: 500,
                                gap: '5px',
                                padding: isMobile ? '6px 10px' : '8px 12px',
                                transition: 'all 0.15s'
                            }}
                        >
                            <i className="fas fa-trash-alt" style={{ fontSize: '10px' }} />
                            {!isMobile && 'Clear'}
                        </button>
                    )}
                </div>
            </div>
            <div
                style={{
                    WebkitOverflowScrolling: 'touch',
                    display: 'flex',
                    gap: isMobile ? '8px' : '14px',
                    overflowX: 'auto',
                    paddingBottom: '8px',
                    scrollSnapType: isMobile ? 'x mandatory' : 'none'
                }}
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
                    style={{
                        alignItems: 'center',
                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                        border: '1px solid #bfdbfe',
                        borderRadius: '10px',
                        display: 'flex',
                        gap: '10px',
                        padding: '12px 16px'
                    }}
                >
                    <div
                        style={{
                            alignItems: 'center',
                            background: '#3b82f6',
                            borderRadius: '8px',
                            color: '#fff',
                            display: 'flex',
                            fontSize: '14px',
                            height: '32px',
                            justifyContent: 'center',
                            width: '32px'
                        }}
                    >
                        <i className="fas fa-users" />
                    </div>
                    <div>
                        <div style={{ color: '#1e40af', fontSize: '13px', fontWeight: 600 }}>Shared Team Schedule</div>
                        <div style={{ color: '#3b82f6', fontSize: '12px' }}>
                            All team members can view and edit this weekly plan
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
