import React, { useCallback, useEffect, useMemo, useState } from 'react'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { useIsMobile } from '../../../app/hooks/useIsMobile'
import { MaintenanceLogService } from '../../../services/MaintenanceLogService'

// ── Constants ───────────────────────────────────────────────────
const STATUS_CONFIG = {
    due_soon: {
        badge: 'Due Soon',
        color: '#b45309',
        darkColor: '#fbbf24',
        bg: 'rgba(245,158,11,0.1)',
        darkBg: 'rgba(251,191,36,0.2)',
        icon: 'fa-clock',
        barColor: '#f59e0b'
    },
    never_serviced: {
        badge: 'Never',
        color: '#64748b',
        darkColor: '#94a3b8',
        bg: 'rgba(100,116,139,0.1)',
        darkBg: 'rgba(148,163,184,0.15)',
        icon: 'fa-minus-circle',
        barColor: '#94a3b8'
    },
    ok: {
        badge: 'OK',
        color: '#15803d',
        darkColor: '#4ade80',
        bg: 'rgba(22,163,74,0.1)',
        darkBg: 'rgba(34,197,94,0.2)',
        icon: 'fa-check-circle',
        barColor: '#22c55e'
    },
    overdue: {
        badge: 'Overdue',
        color: '#dc2626',
        darkColor: '#f87171',
        bg: 'rgba(239,68,68,0.1)',
        darkBg: 'rgba(239,68,68,0.2)',
        icon: 'fa-exclamation-triangle',
        barColor: '#ef4444'
    }
}

const STATUS_FILTER_MAP = { 'Due Soon': 'due_soon', 'Never Serviced': 'never_serviced', OK: 'ok', Overdue: 'overdue' }
const MS_PER_DAY = 86_400_000
const DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const CHEVRON_BG =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")"
const SELECT_CLS =
    'w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 bg-no-repeat px-3 py-2.5 pr-10 text-sm text-slate-900 outline-none cursor-pointer focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
const SELECT_STYLE = { backgroundImage: CHEVRON_BG, backgroundPosition: 'right 10px center', backgroundSize: '16px' }

// ── Content Skeleton ────────────────────────────────────────────

function SkeletonRow({ i }) {
    return (
        <tr style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}>
            <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse" />
                    <div className="min-w-0">
                        <div className="h-4 w-32 rounded bg-slate-200 animate-pulse mb-1.5" />
                        <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
                    </div>
                </div>
            </td>
            <td className="py-3 px-4">
                <div className="h-4 w-12 rounded bg-slate-200 animate-pulse" />
            </td>
            <td className="py-3 px-4">
                <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
            </td>
            <td className="py-3 px-4">
                <div className="h-3 w-28 rounded bg-slate-200 animate-pulse mb-1.5" />
                <div className="h-1.5 w-full rounded-full bg-slate-200 animate-pulse" />
            </td>
            <td className="py-3 px-4">
                <div className="h-6 w-16 rounded-lg bg-slate-200 animate-pulse" />
            </td>
            <td className="py-3 px-4">
                <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse" />
            </td>
        </tr>
    )
}

function ContentSkeleton({ isMobile }) {
    return (
        <div className={`flex gap-4 items-start ${isMobile ? 'flex-col' : ''}`}>
            <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            {['w-32', 'w-12', 'w-20', 'w-24', 'w-16', 'w-8'].map((w, i) => (
                                <th key={i} className="text-left py-3 px-4 border-b-2 border-slate-100">
                                    <div className={`h-3 ${w} rounded bg-slate-200 animate-pulse`} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 8 }, (_, i) => (
                            <SkeletonRow key={i} i={i} />
                        ))}
                    </tbody>
                </table>
            </div>
            {!isMobile && (
                <div className="w-[320px] flex-shrink-0 flex flex-col gap-4">
                    {[140, 120, 160, 120].map((h, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4"
                            style={{ animationDelay: `${i * 80}ms` }}
                        >
                            <div className="h-3 w-24 rounded bg-slate-200 animate-pulse mb-3" />
                            <div className="rounded bg-slate-100 animate-pulse" style={{ height: `${h}px` }} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Helpers ─────────────────────────────────────────────────────

function formatDate(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysBetween(dateA, dateB) {
    return Math.round((new Date(dateB) - new Date(dateA)) / MS_PER_DAY)
}

function getProgressInfo(item) {
    if (!item.last_service_date || !item.next_service_date) {
        return { label: 'Never serviced', overdueDays: 0, pct: 0, status: 'never' }
    }
    const interval = item.service_interval_days || daysBetween(item.last_service_date, item.next_service_date)
    const today = new Date().toISOString().slice(0, 10)
    const elapsed = daysBetween(item.last_service_date, today)
    const pct = Math.min(Math.max(elapsed / interval, 0), 1)

    if (item.service_status === 'overdue') {
        const overdueDays = daysBetween(item.next_service_date, today)
        return {
            label: `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`,
            overdueDays,
            pct: 1,
            status: 'overdue'
        }
    }
    if (item.service_status === 'due_soon') {
        return {
            label: `${elapsed} of ${interval} days — due ${formatDate(item.next_service_date)}`,
            overdueDays: 0,
            pct,
            status: 'due_soon'
        }
    }
    return { label: `${elapsed} of ${interval} days`, overdueDays: 0, pct, status: 'ok' }
}

function getCalendarDays(year, month) {
    const first = new Date(year, month, 1)
    const startDay = first.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevDays = new Date(year, month, 0).getDate()
    const days = []
    for (let i = startDay - 1; i >= 0; i--) days.push({ day: prevDays - i, outside: true })
    for (let d = 1; d <= daysInMonth; d++) days.push({ day: d, outside: false })
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) days.push({ day: d, outside: true })
    return days
}

function toDateKey(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// ── Sub-components ──────────────────────────────────────────────

function StatusBadge({ status, isDark }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ok
    return (
        <span
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold"
            style={{ backgroundColor: isDark ? cfg.darkBg : cfg.bg, color: isDark ? cfg.darkColor : cfg.color }}
        >
            <i className={`fas ${cfg.icon} text-[10px]`} />
            {cfg.badge}
        </span>
    )
}

function ProgressBar({ item, isDark }) {
    const info = getProgressInfo(item)
    const cfg = STATUS_CONFIG[info.status] || STATUS_CONFIG.ok
    return (
        <div>
            <div
                className="text-[11px] font-semibold mb-1"
                style={{ color: info.status === 'ok' ? 'var(--text-secondary)' : isDark ? cfg.darkColor : cfg.color }}
            >
                {info.label}
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${info.pct * 100}%`, backgroundColor: cfg.barColor }}
                />
            </div>
        </div>
    )
}

function MiniCalendar({ equipment, calendarDate, onCalendarDateChange, isDark, accentColor }) {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const days = useMemo(() => getCalendarDays(year, month), [year, month])
    const today = new Date()
    const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate())
    const monthLabel = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    // Build maps for both last service (past) and next service (upcoming) dates
    const { lastServiceMap, nextServiceMap } = useMemo(() => {
        const lastMap = {}
        const nextMap = {}
        for (const item of equipment) {
            if (item.last_service_date) {
                if (!lastMap[item.last_service_date]) lastMap[item.last_service_date] = []
                lastMap[item.last_service_date].push(item)
            }
            if (item.next_service_date) {
                if (!nextMap[item.next_service_date]) nextMap[item.next_service_date] = []
                nextMap[item.next_service_date].push(item)
            }
        }
        return { lastServiceMap: lastMap, nextServiceMap: nextMap }
    }, [equipment])

    const navigate = (delta) => {
        const d = new Date(year, month + delta, 1)
        onCalendarDateChange(d)
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <button
                    type="button"
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 border-none bg-transparent cursor-pointer"
                    onClick={() => navigate(-1)}
                >
                    <i className="fas fa-chevron-left text-xs" />
                </button>
                <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                    {monthLabel}
                </span>
                <button
                    type="button"
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 border-none bg-transparent cursor-pointer"
                    onClick={() => navigate(1)}
                >
                    <i className="fas fa-chevron-right text-xs" />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-px text-center">
                {DAYS_OF_WEEK.map((d) => (
                    <div key={d} className="text-[10px] font-bold text-slate-400 py-1">
                        {d}
                    </div>
                ))}
                {days.map((cell, i) => {
                    const dateKey = cell.outside ? null : toDateKey(year, month, cell.day)
                    const isToday = dateKey === todayKey
                    const hasLastService = dateKey && lastServiceMap[dateKey]
                    const nextEvents = dateKey ? nextServiceMap[dateKey] : null

                    // Upcoming dot color based on worst status
                    const worstStatus = nextEvents?.reduce((worst, e) => {
                        if (e.service_status === 'overdue') return 'overdue'
                        if (e.service_status === 'due_soon' && worst !== 'overdue') return 'due_soon'
                        return worst
                    }, 'ok')
                    const upcomingDotColor =
                        worstStatus === 'overdue'
                            ? STATUS_CONFIG.overdue.barColor
                            : worstStatus === 'due_soon'
                              ? STATUS_CONFIG.due_soon.barColor
                              : nextEvents
                                ? STATUS_CONFIG.ok.barColor
                                : null

                    // Past service dot is always green
                    const lastDotColor = hasLastService ? STATUS_CONFIG.ok.barColor : null

                    return (
                        <div
                            key={i}
                            className="relative flex flex-col items-center justify-center py-1.5 text-xs rounded-md"
                            style={{
                                color: cell.outside ? 'var(--text-secondary)' : 'var(--text-primary)',
                                opacity: cell.outside ? 0.35 : 1,
                                backgroundColor: isToday ? accentColor : 'transparent',
                                ...(isToday ? { color: '#fff', fontWeight: 700, borderRadius: '6px' } : {})
                            }}
                        >
                            {cell.day}
                            {!cell.outside && (lastDotColor || upcomingDotColor) && (
                                <div className="absolute bottom-0.5 flex gap-px">
                                    {lastDotColor && (
                                        <div
                                            className="w-1 h-1 rounded-full"
                                            style={{ backgroundColor: lastDotColor }}
                                        />
                                    )}
                                    {upcomingDotColor && (
                                        <div
                                            className="w-1 h-1 rounded-full"
                                            style={{ backgroundColor: upcomingDotColor }}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_CONFIG.ok.barColor }} />{' '}
                    Serviced
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: STATUS_CONFIG.due_soon.barColor }}
                    />{' '}
                    Due Soon
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: STATUS_CONFIG.overdue.barColor }}
                    />{' '}
                    Overdue
                </span>
            </div>
        </div>
    )
}

function RecentActivity({ entries, isDark }) {
    if (!entries.length) {
        return <p className="text-xs text-slate-400 italic">No recent activity</p>
    }
    return (
        <div className="relative pl-6">
            <div className="absolute left-[7px] top-0 bottom-0 w-0.5" style={{ background: 'var(--border-light)' }} />
            {entries.slice(0, 5).map((entry, i) => (
                <div key={entry.id || i} className="relative pb-5 last:pb-0">
                    <div
                        className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full border-2"
                        style={{ borderColor: 'var(--accent, #2A3163)', background: 'var(--bg-primary)' }}
                    />
                    <div className="text-xs font-semibold">{entry.maintenance_log_equipment?.name || 'Equipment'}</div>
                    <div className="text-[11px] text-slate-500">
                        {formatDate(entry.service_date)} · {entry.performed_by_name}
                        {entry.maintenance_log_service_types?.name
                            ? ` · ${entry.maintenance_log_service_types.name}`
                            : ''}
                    </div>
                </div>
            ))}
        </div>
    )
}

function UpcomingServices({ equipment, isDark }) {
    const upcoming = useMemo(() => {
        return equipment
            .filter((e) => e.next_service_date && (e.service_status === 'overdue' || e.service_status === 'due_soon'))
            .sort((a, b) => (a.next_service_date > b.next_service_date ? 1 : -1))
            .slice(0, 4)
    }, [equipment])

    if (!upcoming.length) return null

    return (
        <div className="flex flex-col gap-2">
            {upcoming.map((item) => {
                const cfg = STATUS_CONFIG[item.service_status] || STATUS_CONFIG.ok
                return (
                    <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 border-l-[3px]"
                        style={{ borderColor: cfg.barColor, background: isDark ? cfg.darkBg : cfg.bg }}
                    >
                        <div
                            className="text-xs font-bold min-w-[52px]"
                            style={{ color: isDark ? cfg.darkColor : cfg.color }}
                        >
                            {new Date(item.next_service_date + 'T00:00:00').toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'short'
                            })}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate">{item.name}</div>
                            <div className="text-[11px] text-slate-500 truncate">
                                {item.category_name} · Plant {item.plant_code}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ── Add Equipment Modal ─────────────────────────────────────────

const EMPTY_FORM = {
    category_id: '',
    install_date: '',
    location_note: '',
    manufacturer: '',
    model: '',
    name: '',
    plant_code: '',
    serial_number: '',
    service_interval_days: 90
}

function AddEquipmentModal({ isOpen, onClose, onSaved, categories, plants, accentColor, isDark }) {
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [showPlantPicker, setShowPlantPicker] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setForm(EMPTY_FORM)
            setError('')
        }
    }, [isOpen])

    if (!isOpen) return null

    const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

    const plantLabel = form.plant_code
        ? (() => {
              const match = plants.find((p) => (p.plantCode || p.plant_code) === form.plant_code)
              return match
                  ? `${match.plantCode || match.plant_code} — ${match.plantName || match.plant_name}`
                  : form.plant_code
          })()
        : 'Select Plant'

    const handleSave = async () => {
        if (!form.name.trim()) return setError('Equipment name is required')
        if (!form.category_id) return setError('Category is required')
        if (!form.plant_code) return setError('Plant is required')
        setSaving(true)
        setError('')
        try {
            await MaintenanceLogService.createEquipment({
                category_id: form.category_id,
                install_date: form.install_date || null,
                location_note: form.location_note || null,
                manufacturer: form.manufacturer || null,
                model: form.model || null,
                name: form.name.trim(),
                plant_code: form.plant_code,
                serial_number: form.serial_number || null,
                service_interval_days: parseInt(form.service_interval_days) || 90
            })
            onSaved()
        } catch (err) {
            setError(err?.message || 'Failed to save equipment')
        } finally {
            setSaving(false)
        }
    }

    const inputCls =
        'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
    const labelCls = 'block text-xs font-semibold text-slate-500 mb-1.5'

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 110 }} onClick={onClose}>
            <div className="absolute inset-0 bg-black/40" />
            <div
                className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
                style={{ background: 'var(--bg-primary)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-200 px-6 py-4"
                    style={{ background: 'var(--bg-primary)' }}
                >
                    <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                        <i className="fas fa-plus mr-2" style={{ color: accentColor }} />
                        Add Part / Unit / Component
                    </h3>
                    <button
                        type="button"
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-500 border-none cursor-pointer hover:bg-slate-200"
                        onClick={onClose}
                    >
                        <i className="fas fa-times" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 flex flex-col gap-4">
                    {error && (
                        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
                            <i className="fas fa-exclamation-circle mr-2" />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className={labelCls}>Equipment Name *</label>
                        <input
                            className={inputCls}
                            placeholder="e.g. Compressor #1"
                            value={form.name}
                            onChange={(e) => update('name', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className={labelCls}>Category *</label>
                        <select
                            className={SELECT_CLS}
                            style={SELECT_STYLE}
                            value={form.category_id}
                            onChange={(e) => update('category_id', e.target.value)}
                        >
                            <option value="">Select Category</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={labelCls}>Plant *</label>
                        <button
                            type="button"
                            className={`${inputCls} text-left cursor-pointer`}
                            onClick={() => setShowPlantPicker(true)}
                        >
                            {plantLabel}
                        </button>
                        <PlantDropdownModal
                            isOpen={showPlantPicker}
                            onClose={() => setShowPlantPicker(false)}
                            plants={plants}
                            onSelect={(code) => {
                                update('plant_code', code)
                                setShowPlantPicker(false)
                            }}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Manufacturer</label>
                            <input
                                className={inputCls}
                                placeholder="e.g. Ingersoll Rand"
                                value={form.manufacturer}
                                onChange={(e) => update('manufacturer', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Model</label>
                            <input
                                className={inputCls}
                                placeholder="e.g. SSR-2000"
                                value={form.model}
                                onChange={(e) => update('model', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Serial Number</label>
                            <input
                                className={inputCls}
                                placeholder="e.g. SN-12345"
                                value={form.serial_number}
                                onChange={(e) => update('serial_number', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Service Interval (days)</label>
                            <input
                                className={inputCls}
                                type="number"
                                min="1"
                                value={form.service_interval_days}
                                onChange={(e) => update('service_interval_days', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Install Date</label>
                            <input
                                className={inputCls}
                                type="date"
                                value={form.install_date}
                                onChange={(e) => update('install_date', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Location Note</label>
                            <input
                                className={inputCls}
                                placeholder="e.g. Back of batch plant"
                                value={form.location_note}
                                onChange={(e) => update('location_note', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 rounded-b-2xl"
                    style={{ background: 'var(--bg-primary)' }}
                >
                    <button
                        type="button"
                        className="rounded-xl px-5 py-2.5 text-sm font-semibold border border-slate-200 bg-white text-slate-700 cursor-pointer hover:bg-slate-50"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="rounded-xl px-5 py-2.5 text-sm font-semibold border-none text-white cursor-pointer disabled:opacity-50"
                        style={{ background: accentColor }}
                        disabled={saving}
                        onClick={handleSave}
                    >
                        {saving ? (
                            <>
                                <i className="fas fa-spinner fa-spin mr-2" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-plus mr-2" />
                                Add Part / Unit / Component
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Log Service Modal ────────────────────────────────────────────

const EMPTY_SERVICE = {
    hours_spent: '',
    notes: '',
    service_date: new Date().toISOString().slice(0, 10),
    service_type_id: ''
}

function LogServiceModal({ isOpen, onClose, onSaved, equipment, serviceTypes, accentColor }) {
    const [form, setForm] = useState(EMPTY_SERVICE)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (isOpen && equipment) {
            setForm(EMPTY_SERVICE)
            setError('')
        }
    }, [isOpen, equipment])

    if (!isOpen || !equipment) return null

    const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

    const handleSave = async () => {
        if (!form.service_date) return setError('Service date is required')
        setSaving(true)
        setError('')
        try {
            // Auto-calculate next service date from service date + equipment interval
            const nextServiceDate = equipment.service_interval_days
                ? new Date(new Date(form.service_date).getTime() + equipment.service_interval_days * MS_PER_DAY)
                      .toISOString()
                      .slice(0, 10)
                : null
            await MaintenanceLogService.createEntry({
                equipment_id: equipment.id,
                hours_spent: form.hours_spent ? parseFloat(form.hours_spent) : null,
                next_service_date: nextServiceDate,
                notes: form.notes || null,
                plant_code: equipment.plant_code,
                service_date: form.service_date,
                service_type_id: form.service_type_id || null
            })
            onSaved()
        } catch (err) {
            setError(err?.message || 'Failed to log service')
        } finally {
            setSaving(false)
        }
    }

    const inputCls =
        'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
    const labelCls = 'block text-xs font-semibold text-slate-500 mb-1.5'

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 110 }} onClick={onClose}>
            <div className="absolute inset-0 bg-black/40" />
            <div
                className="relative w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
                style={{ background: 'var(--bg-primary)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-200 px-6 py-4"
                    style={{ background: 'var(--bg-primary)' }}
                >
                    <div>
                        <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                            <i className="fas fa-wrench mr-2" style={{ color: accentColor }} />
                            Log Service
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {equipment.name} · {equipment.plant_code}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-500 border-none cursor-pointer hover:bg-slate-200"
                        onClick={onClose}
                    >
                        <i className="fas fa-times" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 flex flex-col gap-4">
                    {error && (
                        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
                            <i className="fas fa-exclamation-circle mr-2" />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className={labelCls}>Service Date *</label>
                        <input
                            className={inputCls}
                            type="date"
                            value={form.service_date}
                            onChange={(e) => update('service_date', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className={labelCls}>Service Type</label>
                        <select
                            className={SELECT_CLS}
                            style={SELECT_STYLE}
                            value={form.service_type_id}
                            onChange={(e) => update('service_type_id', e.target.value)}
                        >
                            <option value="">Select Type</option>
                            {serviceTypes.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={labelCls}>Hours Spent</label>
                        <input
                            className={inputCls}
                            type="number"
                            step="0.25"
                            min="0"
                            placeholder="e.g. 2.5"
                            value={form.hours_spent}
                            onChange={(e) => update('hours_spent', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className={labelCls}>Notes</label>
                        <textarea
                            className={`${inputCls} resize-none`}
                            rows={3}
                            placeholder="Describe work performed, parts replaced, issues found..."
                            value={form.notes}
                            onChange={(e) => update('notes', e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 rounded-b-2xl"
                    style={{ background: 'var(--bg-primary)' }}
                >
                    <button
                        type="button"
                        className="rounded-xl px-5 py-2.5 text-sm font-semibold border border-slate-200 bg-white text-slate-700 cursor-pointer hover:bg-slate-50"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="rounded-xl px-5 py-2.5 text-sm font-semibold border-none text-white cursor-pointer disabled:opacity-50"
                        style={{ background: accentColor }}
                        disabled={saving}
                        onClick={handleSave}
                    >
                        {saving ? (
                            <>
                                <i className="fas fa-spinner fa-spin mr-2" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-check mr-2" />
                                Log Service
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Equipment Detail Panel ──────────────────────────────────────

function EquipmentDetailPanel({ equipment, onClose, onLogService, onDelete, isDark, accentColor }) {
    const [history, setHistory] = useState([])
    const [loadingHistory, setLoadingHistory] = useState(true)
    const [deleting, setDeleting] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    useEffect(() => {
        if (!equipment) return
        setLoadingHistory(true)
        setConfirmDelete(false)
        MaintenanceLogService.fetchServiceHistory(equipment.id)
            .then(setHistory)
            .catch(() => setHistory([]))
            .finally(() => setLoadingHistory(false))
    }, [equipment])

    if (!equipment) return null

    const info = getProgressInfo(equipment)
    const cfg = STATUS_CONFIG[equipment.service_status] || STATUS_CONFIG.ok

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await MaintenanceLogService.deleteEquipment(equipment.id)
            onDelete()
        } catch {
            setDeleting(false)
            setConfirmDelete(false)
        }
    }

    return (
        <div className="fixed inset-0 flex justify-end h-screen" style={{ zIndex: 110 }} onClick={onClose}>
            <div className="absolute inset-0 bg-black/40" />
            <div
                className="relative w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col"
                style={{ background: 'var(--bg-primary)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="sticky top-0 z-10 border-b border-slate-200 px-6 py-5 shrink-0"
                    style={{ background: 'var(--bg-primary)' }}
                >
                    <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <i
                                    className={`fas ${equipment.category_icon || 'fa-cog'}`}
                                    style={{ color: accentColor }}
                                />
                                <h3
                                    className="text-lg font-bold truncate"
                                    style={{ fontFamily: 'var(--font-heading)' }}
                                >
                                    {equipment.name}
                                </h3>
                            </div>
                            <p className="text-xs text-slate-500">
                                {equipment.category_name} · Plant {equipment.plant_code}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-500 text-base border-none cursor-pointer hover:bg-slate-200 shrink-0 ml-3"
                            onClick={onClose}
                        >
                            <i className="fas fa-times" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <StatusBadge status={equipment.service_status} isDark={isDark} />
                        <button
                            type="button"
                            className="flex items-center gap-2 rounded-xl text-xs font-semibold px-3 py-2 border-none cursor-pointer text-white"
                            style={{ background: accentColor }}
                            onClick={(e) => {
                                e.stopPropagation()
                                onLogService(equipment)
                            }}
                        >
                            <i className="fas fa-wrench" /> Log Service
                        </button>
                        <div className="ml-auto">
                            {confirmDelete ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        className="flex items-center gap-1.5 rounded-xl text-xs font-semibold px-3 py-2 bg-red-500 text-white border-none cursor-pointer disabled:opacity-50"
                                        disabled={deleting}
                                        onClick={handleDelete}
                                    >
                                        <i className={`fas ${deleting ? 'fa-spinner fa-spin' : 'fa-check'}`} />
                                        {deleting ? 'Deleting...' : 'Confirm'}
                                    </button>
                                    <button
                                        type="button"
                                        className="flex items-center gap-1.5 rounded-xl text-xs font-semibold px-3 py-2 bg-slate-100 text-slate-600 border-none cursor-pointer"
                                        onClick={() => setConfirmDelete(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="flex items-center gap-1.5 rounded-xl text-xs font-semibold px-3 py-2 bg-red-50 text-red-600 border border-red-200 cursor-pointer hover:bg-red-100"
                                    onClick={() => setConfirmDelete(true)}
                                >
                                    <i className="fas fa-trash-alt" /> Delete
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Details */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Equipment Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-6">
                        {[
                            { label: 'Manufacturer', value: equipment.manufacturer },
                            { label: 'Model', value: equipment.model },
                            { label: 'Serial Number', value: equipment.serial_number },
                            {
                                label: 'Service Interval',
                                value: equipment.service_interval_days
                                    ? `${equipment.service_interval_days} days`
                                    : null
                            },
                            {
                                label: 'Install Date',
                                value: equipment.install_date ? formatDate(equipment.install_date) : null
                            },
                            { label: 'Location', value: equipment.location_note }
                        ]
                            .filter((row) => row.value)
                            .map(({ label, value }) => (
                                <div key={label}>
                                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
                                        {label}
                                    </div>
                                    <div className="text-sm font-medium">{value}</div>
                                </div>
                            ))}
                    </div>

                    {/* Service Progress */}
                    <div className="rounded-xl border border-slate-200 p-4 mb-6">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                            Service Progress
                        </div>
                        <div
                            className="text-sm font-semibold mb-2"
                            style={{
                                color:
                                    info.status === 'ok' ? 'var(--text-secondary)' : isDark ? cfg.darkColor : cfg.color
                            }}
                        >
                            {info.label}
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${info.pct * 100}%`, backgroundColor: cfg.barColor }}
                            />
                        </div>
                        <div className="flex justify-between mt-2 text-[11px] text-slate-400">
                            <span>Last: {formatDate(equipment.last_service_date)}</span>
                            <span>Next: {formatDate(equipment.next_service_date)}</span>
                        </div>
                    </div>

                    {/* Service History */}
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                            Service History
                        </div>
                        {loadingHistory ? (
                            <div className="flex flex-col gap-3">
                                {Array.from({ length: 3 }, (_, i) => (
                                    <div key={i} className="rounded-xl border border-slate-200 p-4">
                                        <div className="h-4 w-32 rounded bg-slate-200 animate-pulse mb-2" />
                                        <div className="h-3 w-48 rounded bg-slate-200 animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        ) : history.length === 0 ? (
                            <p className="text-sm text-slate-400 italic py-4 text-center">
                                No service history recorded
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {history.map((entry) => (
                                    <div key={entry.id} className="rounded-xl border border-slate-200 p-4">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-sm font-semibold">
                                                {formatDate(entry.service_date)}
                                            </span>
                                            {entry.maintenance_log_service_types?.name && (
                                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                                    {entry.maintenance_log_service_types.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {entry.performed_by_name}
                                            {entry.hours_spent ? ` · ${entry.hours_spent}h` : ''}
                                        </div>
                                        {entry.notes && (
                                            <p className="text-xs text-slate-600 mt-2 leading-relaxed">{entry.notes}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Main View (content-only, props from MaintenanceView) ────────

export default function MaintenanceLogView({
    searchText,
    selectedPlant,
    categoryFilter,
    statusFilter,
    plants,
    loading,
    equipment,
    categories,
    recentEntries,
    serviceTypes,
    showAddModal,
    onCloseAddModal,
    onReload
}) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#2A3163'
    const isDark = preferences.themeMode === 'dark'
    const isMobile = useIsMobile()

    // Local UI state
    const [sortKey, setSortKey] = useState('')
    const [sortDir, setSortDir] = useState('asc')
    const [calendarDate, setCalendarDate] = useState(new Date())
    const [serviceTarget, setServiceTarget] = useState(null)
    const [detailTarget, setDetailTarget] = useState(null)

    // ── Filtering (uses props) ──────────────────────────────────
    const filtered = useMemo(() => {
        const query = searchText.trim().toLowerCase()
        return equipment.filter((item) => {
            if (query) {
                const searchable = [
                    item.name,
                    item.serial_number,
                    item.manufacturer,
                    item.model,
                    item.category_name,
                    item.plant_code
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                if (!searchable.includes(query)) return false
            }
            if (selectedPlant && selectedPlant !== 'All') {
                if (selectedPlant.startsWith('DISTRICT:')) {
                    const districtName = selectedPlant.slice(9)
                    const districtPlantCodes = new Set()
                    plants.forEach((p) => {
                        const code = p.plantCode || p.plant_code || ''
                        const districts = p.districts || []
                        districts.forEach((d) => {
                            const name = typeof d === 'string' ? d : d?.name
                            if (name === districtName) districtPlantCodes.add(code.trim().toUpperCase())
                        })
                    })
                    if (!districtPlantCodes.has((item.plant_code || '').trim().toUpperCase())) return false
                } else if ((item.plant_code || '').toUpperCase() !== selectedPlant.toUpperCase()) {
                    return false
                }
            }
            if (categoryFilter && item.category_name !== categoryFilter) return false
            if (statusFilter && statusFilter !== 'All Statuses') {
                const mapped = STATUS_FILTER_MAP[statusFilter]
                if (mapped && item.service_status !== mapped) return false
            }
            return true
        })
    }, [equipment, searchText, selectedPlant, categoryFilter, statusFilter, plants])

    // ── Sorting ─────────────────────────────────────────────────
    const sorted = useMemo(() => {
        if (!sortKey) {
            const priority = { overdue: 0, due_soon: 1, never_serviced: 2, ok: 3 }
            return [...filtered].sort((a, b) => (priority[a.service_status] ?? 3) - (priority[b.service_status] ?? 3))
        }
        const dir = sortDir === 'asc' ? 1 : -1
        return [...filtered].sort((a, b) => {
            let va, vb
            switch (sortKey) {
                case 'Equipment':
                    va = a.name
                    vb = b.name
                    break
                case 'Plant':
                    va = a.plant_code
                    vb = b.plant_code
                    break
                case 'Last Service':
                    va = a.last_service_date || ''
                    vb = b.last_service_date || ''
                    break
                case 'Next Due':
                    va = a.next_service_date || ''
                    vb = b.next_service_date || ''
                    break
                case 'Status': {
                    const p = { overdue: 0, due_soon: 1, never_serviced: 2, ok: 3 }
                    return ((p[a.service_status] ?? 3) - (p[b.service_status] ?? 3)) * dir
                }
                default:
                    return 0
            }
            if (va < vb) return -1 * dir
            if (va > vb) return 1 * dir
            return 0
        })
    }, [filtered, sortKey, sortDir])

    // Counts scoped to plant/search/category but NOT status (for sidebar stats)
    const handleHeaderClick = useCallback(
        (key) => {
            if (sortKey === key) {
                setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
            } else {
                setSortKey(key)
                setSortDir('asc')
            }
        },
        [sortKey]
    )

    // ── Render ──────────────────────────────────────────────────

    const headers = ['Equipment', 'Plant', 'Last Service', 'Service Progress', 'Status', '']
    const colWidths = ['', '80px', '120px', '25%', '110px', '50px']

    const renderEmptyState = () => (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <i className="fas fa-clipboard-list text-4xl mb-3" />
            <p className="text-sm font-semibold">No equipment found</p>
            <p className="text-xs mt-1">
                {equipment.length
                    ? 'Try adjusting your filters'
                    : 'Add a part, unit, or component to start tracking maintenance'}
            </p>
        </div>
    )

    return (
        <div className="p-3 md:p-5">
            <div className="max-w-[1600px] mx-auto">
                {loading ? (
                    <ContentSkeleton isMobile={isMobile} />
                ) : (
                    <div className={`flex gap-4 items-start ${isMobile ? 'flex-col' : ''}`}>
                        {/* Content */}
                        <div className="flex-1 min-w-0 w-full overflow-hidden">
                            {sorted.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    {renderEmptyState()}
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                                    <table className="w-full border-collapse" style={{ minWidth: '700px' }}>
                                        <thead>
                                            <tr>
                                                {headers.map((h, i) => (
                                                    <th
                                                        key={h || i}
                                                        className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 py-3 px-4 border-b-2 border-slate-100 cursor-pointer select-none hover:text-slate-700"
                                                        style={{ width: colWidths[i] || 'auto' }}
                                                        onClick={() => h && handleHeaderClick(h)}
                                                    >
                                                        <span className="inline-flex items-center gap-1.5">
                                                            {h}
                                                            {sortKey === h && (
                                                                <i
                                                                    className={`fas fa-sort-${sortDir === 'asc' ? 'up' : 'down'} text-[10px]`}
                                                                    style={{ color: accentColor }}
                                                                />
                                                            )}
                                                        </span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sorted.map((item) => (
                                                <tr
                                                    key={item.id}
                                                    className="cursor-pointer border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50"
                                                    style={{
                                                        background:
                                                            item.service_status === 'overdue'
                                                                ? isDark
                                                                    ? 'rgba(239,68,68,0.04)'
                                                                    : 'rgba(220,53,69,0.03)'
                                                                : 'transparent'
                                                    }}
                                                    onClick={() => setDetailTarget(item)}
                                                >
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2.5">
                                                            <i
                                                                className={`fas ${item.category_icon || 'fa-cog'} text-sm`}
                                                                style={{ color: accentColor }}
                                                            />
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-semibold truncate">
                                                                    {item.name}
                                                                </div>
                                                                <div className="text-[11px] text-slate-500 truncate">
                                                                    {item.category_name}
                                                                    {item.manufacturer ? ` · ${item.manufacturer}` : ''}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm">{item.plant_code}</td>
                                                    <td className="py-3 px-4 text-sm">
                                                        {formatDate(item.last_service_date)}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <ProgressBar item={item} isDark={isDark} />
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <StatusBadge status={item.service_status} isDark={isDark} />
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <button
                                                            type="button"
                                                            className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer text-sm"
                                                            style={{
                                                                background:
                                                                    item.service_status === 'overdue'
                                                                        ? isDark
                                                                            ? STATUS_CONFIG.overdue.darkBg
                                                                            : STATUS_CONFIG.overdue.bg
                                                                        : 'var(--bg-tertiary)',
                                                                color:
                                                                    item.service_status === 'overdue'
                                                                        ? isDark
                                                                            ? STATUS_CONFIG.overdue.darkColor
                                                                            : STATUS_CONFIG.overdue.color
                                                                        : 'var(--text-secondary)'
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setServiceTarget(item)
                                                            }}
                                                            title="Log service"
                                                        >
                                                            <i className="fas fa-wrench" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Calendar Sidebar */}
                        {!isMobile && (
                            <div className="w-[320px] flex-shrink-0 flex flex-col gap-4">
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                                    <MiniCalendar
                                        equipment={equipment}
                                        calendarDate={calendarDate}
                                        onCalendarDateChange={setCalendarDate}
                                        isDark={isDark}
                                        accentColor={accentColor}
                                    />
                                </div>
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
                                        Upcoming & Overdue
                                    </h4>
                                    <UpcomingServices equipment={filtered} isDark={isDark} />
                                    {!filtered.some(
                                        (e) => e.service_status === 'overdue' || e.service_status === 'due_soon'
                                    ) && <p className="text-xs text-slate-400 italic">All equipment up to date</p>}
                                </div>
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
                                        Recent Activity
                                    </h4>
                                    <RecentActivity entries={recentEntries} isDark={isDark} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Equipment Modal */}
            <AddEquipmentModal
                isOpen={showAddModal}
                onClose={onCloseAddModal}
                onSaved={() => {
                    onCloseAddModal()
                    onReload()
                }}
                categories={categories}
                plants={plants}
                accentColor={accentColor}
                isDark={isDark}
            />

            <LogServiceModal
                isOpen={!!serviceTarget}
                onClose={() => setServiceTarget(null)}
                onSaved={() => {
                    setServiceTarget(null)
                    onReload()
                }}
                equipment={serviceTarget}
                serviceTypes={serviceTypes}
                accentColor={accentColor}
            />

            <EquipmentDetailPanel
                equipment={detailTarget}
                onClose={() => setDetailTarget(null)}
                onLogService={(eq) => {
                    setDetailTarget(null)
                    setServiceTarget(eq)
                }}
                onDelete={() => {
                    setDetailTarget(null)
                    onReload()
                }}
                isDark={isDark}
                accentColor={accentColor}
            />
        </div>
    )
}
