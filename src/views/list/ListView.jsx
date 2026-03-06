import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import WeeklyPlanner from '../../app/components/list/WeeklyPlanner'
import TopSection from '../../app/components/sections/TopSection'
import { TaskListSkeleton } from '../../app/components/ui/AssetListSkeleton'
import { usePreferences } from '../../app/context/PreferencesContext'
import { useIsMobile } from '../../app/hooks/useIsMobile'
import { ListService } from '../../services/ListService'
import { RegionService } from '../../services/RegionService'
import { UserService } from '../../services/UserService'
import ListAddView from './ListAddView'
/** Maps internal status keys to their user-facing display labels. */
const STATUS_MAP = {
    blocked: 'Blocked',
    completed: 'Completed',
    in_progress: 'In Progress',
    ordered_materials: 'Ordered Materials',
    overdue: 'Overdue',
    pending: 'Pending',
    waiting: 'Waiting'
}
const STATUS_OPTIONS = ['Pending', 'In Progress', 'Ordered Materials', 'Blocked', 'Waiting', 'Overdue', 'Completed']
/** Maps internal role keys to their user-facing display labels. */
const ROLE_MAP = {
    district_manager: 'District Manager',
    maintenance: 'Maintenance',
    plant_manager: 'Plant Manager',
    unassigned: 'Unassigned'
}
const ROLE_OPTIONS = ['Maintenance', 'Plant Manager', 'District Manager', 'Unassigned']
/** Available grouping modes for the task list with icons for the toggle bar. */
const VIEW_MODES = [
    { icon: 'fa-layer-group', id: 'status', label: 'Status' },
    { icon: 'fa-calendar-alt', id: 'date', label: 'Date' },
    { icon: 'fa-user', id: 'role', label: 'Role' },
    { icon: 'fa-calendar-week', id: 'planner', label: 'Planner' }
]
const STATUS_COLORS = {
    blocked: { bg: '#fee2e2', border: '#ef4444', text: '#ef4444' },
    completed: { bg: '#dcfce7', border: '#16a34a', text: '#16a34a' },
    in_progress: { bg: '#dbeafe', border: '#3b82f6', text: '#3b82f6' },
    ordered_materials: { bg: '#dbeafe', border: '#3b82f6', text: '#3b82f6' },
    overdue: { bg: '#fee2e2', border: '#ef4444', text: '#ef4444' },
    pending: { bg: '#fef3c7', border: '#f59e0b', text: '#f59e0b' },
    waiting: { bg: '#fef3c7', border: '#f59e0b', text: '#f59e0b' }
}
const BULK_ACTION_COLORS = {
    cancel: { bg: '#f1f5f9', hover: '#e2e8f0', text: '#64748b' },
    complete: { bg: '#dcfce7', hover: '#bbf7d0', text: '#16a34a' },
    delete: { bg: '#fee2e2', hover: '#fecaca', text: '#ef4444' }
}
const mapStatusValue = (value) => {
    const lower = value?.toLowerCase()
    return Object.entries(STATUS_MAP).find(([_k, v]) => v.toLowerCase() === lower)?.[0] || ''
}
const mapRoleValue = (value) => Object.entries(ROLE_MAP).find(([_k, v]) => v === value)?.[0] || ''
const normalizeToUpperCase = (str) =>
    String(str || '')
        .trim()
        .toUpperCase()
/**
 * Task list view with multiple grouping modes (by status, date, role, or
 * weekly planner). Supports region-scoped plant filtering, bulk selection
 * with complete/delete actions, keyboard shortcuts (Cmd+K search, Cmd+N add),
 * and a sticky filter bar with status/role chip filters.
 *
 * @param {string} [title] - Page heading (defaults to "Tasks List").
 * @param {Function} onSelectItem - Callback when a task row is clicked.
 * @param {Function} [onStatusFilterChange] - Optional external callback for status filter sync.
 */
function ListView({ title = 'Tasks List', onSelectItem, onStatusFilterChange }) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const headerRef = useRef(null)
    const searchInputRef = useRef(null)
    const plannerGroupsRef = useRef(null)
    const [plants, setPlants] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [selectedPlant, setSelectedPlant] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [viewMode, setViewMode] = useState('status')
    const [roleFilter, setRoleFilter] = useState('')
    const isMobile = useIsMobile()
    const baseFilteredItems = ListService.getFilteredItems({
        filterType: '',
        plantCode: selectedPlant,
        searchTerm: searchText,
        showCompleted: statusFilter === 'completed',
        statusFilter
    })
    const filteredItems = useMemo(() => {
        if (!regionPlantCodes?.size) return baseFilteredItems
        return baseFilteredItems.filter((item) => regionPlantCodes.has(normalizeToUpperCase(item.plant_code)))
    }, [baseFilteredItems, regionPlantCodes])
    const roleFilteredItems = useMemo(
        () => (roleFilter ? filteredItems.filter((item) => item.responsible_role === roleFilter) : filteredItems),
        [filteredItems, roleFilter]
    )
    /** Buckets tasks into time-relative groups: Overdue, Today, Tomorrow, This Week, Later, Completed. */
    const groupedByDate = useMemo(() => {
        const groups = {
            completed: { color: 'success', icon: 'fa-check-circle', items: [], label: 'Completed', priority: 6 },
            later: { color: 'secondary', icon: 'fa-calendar-alt', items: [], label: 'Later', priority: 5 },
            overdue: { color: 'danger', icon: 'fa-exclamation-circle', items: [], label: 'Overdue', priority: 3 },
            thisWeek: { color: 'accent', icon: 'fa-calendar-week', items: [], label: 'This Week', priority: 4 },
            today: { color: 'warning', icon: 'fa-calendar-day', items: [], label: 'Today', priority: 1 },
            tomorrow: { color: 'info', icon: 'fa-calendar-plus', items: [], label: 'Tomorrow', priority: 2 }
        }
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const endOfWeek = new Date(today)
        endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()))
        roleFilteredItems.forEach((item) => {
            if (item.completed || item.status === 'completed') {
                groups.completed.items.push(item)
                return
            }
            const deadline = new Date(item.deadline)
            deadline.setHours(0, 0, 0, 0)
            if (deadline < today || item.status === 'overdue') groups.overdue.items.push(item)
            else if (deadline.getTime() === today.getTime()) groups.today.items.push(item)
            else if (deadline.getTime() === tomorrow.getTime()) groups.tomorrow.items.push(item)
            else if (deadline <= endOfWeek) groups.thisWeek.items.push(item)
            else groups.later.items.push(item)
        })
        Object.values(groups).forEach((g) => g.items.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)))
        return groups
    }, [roleFilteredItems])
    /**
     * Groups tasks by workflow status. Items past deadline that are not in an
     * active-work status (in_progress, blocked, waiting, ordered_materials)
     * are promoted to the Overdue group instead.
     */
    const groupedByStatus = useMemo(() => {
        const groups = {
            blocked: { color: 'danger', icon: 'fa-ban', items: [], label: 'Blocked', priority: 3 },
            completed: { color: 'success', icon: 'fa-check-circle', items: [], label: 'Completed', priority: 7 },
            in_progress: { color: 'accent', icon: 'fa-spinner', items: [], label: 'In Progress', priority: 2 },
            ordered_materials: {
                color: 'info',
                icon: 'fa-truck-loading',
                items: [],
                label: 'Ordered Materials',
                priority: 5
            },
            overdue: { color: 'danger', icon: 'fa-exclamation-circle', items: [], label: 'Overdue', priority: 1 },
            pending: { color: 'secondary', icon: 'fa-clock', items: [], label: 'Pending', priority: 6 },
            waiting: { color: 'warning', icon: 'fa-hourglass-half', items: [], label: 'Waiting', priority: 4 }
        }
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const activeStatuses = ['in_progress', 'blocked', 'waiting', 'ordered_materials']
        roleFilteredItems.forEach((item) => {
            if (item.completed || item.status === 'completed') {
                groups.completed.items.push(item)
                return
            }
            const deadline = new Date(item.deadline)
            deadline.setHours(0, 0, 0, 0)
            const isOverdue = deadline < today && !activeStatuses.includes(item.status)
            if (isOverdue) groups.overdue.items.push(item)
            else if (groups[item.status]) groups[item.status].items.push(item)
            else groups.pending.items.push(item)
        })
        Object.values(groups).forEach((g) => g.items.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)))
        return groups
    }, [roleFilteredItems])
    /** Groups open (non-completed) tasks by responsible role. */
    const groupedByRole = useMemo(() => {
        const groups = {
            district_manager: {
                color: 'accent',
                icon: 'fa-user-shield',
                items: [],
                label: 'District Manager',
                priority: 1
            },
            maintenance: { color: 'warning', icon: 'fa-wrench', items: [], label: 'Maintenance', priority: 3 },
            plant_manager: { color: 'info', icon: 'fa-user-tie', items: [], label: 'Plant Manager', priority: 2 },
            unassigned: { color: 'secondary', icon: 'fa-users', items: [], label: 'Unassigned', priority: 4 }
        }
        roleFilteredItems
            .filter((item) => !item.completed && item.status !== 'completed')
            .forEach((item) => {
                const role = item.responsible_role || 'unassigned'
                ;(groups[role] ?? groups.unassigned).items.push(item)
            })
        Object.values(groups).forEach((g) => g.items.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)))
        return groups
    }, [roleFilteredItems])
    const groupedItems = viewMode === 'date' ? groupedByDate : viewMode === 'status' ? groupedByStatus : groupedByRole
    const summaryStats = useMemo(
        () => ({
            overdue: groupedByDate.overdue?.items?.length || 0,
            total: roleFilteredItems.length
        }),
        [roleFilteredItems, groupedByDate]
    )
    /** Clips planner items that scroll behind the sticky header so they don't peek through. */
    const handleScroll = useCallback(() => {
        if (!headerRef.current || !plannerGroupsRef.current) return
        const clipTop = headerRef.current.getBoundingClientRect().bottom
        plannerGroupsRef.current.querySelectorAll('.planner-group, .planner-item').forEach((item) => {
            const { top, height } = item.getBoundingClientRect()
            if (top < clipTop) {
                const overlap = clipTop - top
                item.style.opacity = overlap >= height ? '0' : '1'
                item.style.pointerEvents = overlap >= height ? 'none' : 'auto'
                item.style.clipPath = overlap < height ? `inset(${overlap}px 0 0 0)` : 'none'
            } else {
                item.style.clipPath = 'none'
                item.style.opacity = '1'
                item.style.pointerEvents = 'auto'
            }
        })
    }, [])
    useEffect(() => {
        const contentArea = document.querySelector('.content-area')
        if (!contentArea) return
        contentArea.addEventListener('scroll', handleScroll)
        handleScroll()
        return () => contentArea.removeEventListener('scroll', handleScroll)
    }, [handleScroll])
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            try {
                await Promise.all([ListService.fetchListItems(), ListService.fetchPlants()])
                setPlants(ListService.plants)
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [])
    useEffect(() => {
        let cancelled = false
        const fetchRegionCodes = async () => {
            try {
                const codes = await RegionService.getAllowedPlantCodes(preferences?.selectedRegion?.code || '')
                if (cancelled) return
                setRegionPlantCodes(codes)
                if (selectedPlant && codes && !codes.has(normalizeToUpperCase(selectedPlant))) setSelectedPlant('')
            } catch {
                if (!cancelled) setRegionPlantCodes(null)
            }
        }
        fetchRegionCodes()
        return () => {
            cancelled = true
        }
    }, [preferences?.selectedRegion?.code, selectedPlant])
    useEffect(() => {
        if (!selectedPlant || !regionPlantCodes?.size) return
        if (!regionPlantCodes.has(normalizeToUpperCase(selectedPlant))) setSelectedPlant('')
    }, [regionPlantCodes, selectedPlant])
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.metaKey && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
            if (e.metaKey && e.key.toLowerCase() === 'n') {
                e.preventDefault()
                setShowAddSheet(true)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])
    useEffect(() => {
        const updateHeight = () => {
            const h = headerRef.current ? Math.ceil(headerRef.current.getBoundingClientRect().height) : 0
            if (h) document.documentElement.style.setProperty('--top-section-height', `${h}px`)
        }
        updateHeight()
        window.addEventListener('resize', updateHeight)
        return () => window.removeEventListener('resize', updateHeight)
    }, [searchInput, selectedPlant, statusFilter])
    const visiblePlants = useMemo(() => {
        if (!Array.isArray(plants)) return []
        return regionPlantCodes?.size
            ? plants.filter((p) => regionPlantCodes.has(normalizeToUpperCase(p.plant_code)))
            : plants
    }, [plants, regionPlantCodes])
    const toggleSelect = (id) =>
        setSelectedIds((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    /** Marks all selected items as complete (or incomplete) in sequence, then clears the selection. */
    const bulkToggleCompletion = async (markComplete) => {
        if (!selectedIds.size) return
        const user = await UserService.getCurrentUser()
        if (!user?.id) return
        const itemsById = new Map(ListService.listItems.map((i) => [i.id, i]))
        for (const id of selectedIds) {
            const item = itemsById.get(id)
            if (!item || (markComplete ? item.completed : !item.completed)) continue
            try {
                await ListService.toggleCompletion(item, user.id)
            } catch {}
        }
        setSelectedIds(new Set())
    }
    const bulkDelete = async () => {
        if (!selectedIds.size || !window.confirm('Delete selected items?')) return
        for (const id of selectedIds) {
            try {
                await ListService.deleteListItem(id)
            } catch {}
        }
        setSelectedIds(new Set())
    }
    const resetFilters = () => {
        setSearchText('')
        setSearchInput('')
        setSelectedPlant('')
        setStatusFilter('')
        setRoleFilter('')
    }
    const handleStatusFilterChange = (value) => {
        const mapped = mapStatusValue(value)
        if (mapped) {
            setStatusFilter(mapped)
            onStatusFilterChange?.(mapped)
        }
    }
    const clearStatusFilter = () => {
        setStatusFilter('')
        onStatusFilterChange?.('')
    }
    const handleRoleFilterChange = (value) => {
        const mapped = mapRoleValue(value)
        if (mapped) setRoleFilter(mapped)
    }
    const getItemStatusStyle = (statusType, mobile) => {
        const color = STATUS_COLORS[statusType] || STATUS_COLORS.pending
        return {
            alignItems: 'center',
            background: color.bg,
            border: `1px solid ${color.border}`,
            borderRadius: '6px',
            color: color.text,
            display: 'flex',
            flexShrink: 0,
            fontSize: mobile ? '0.625rem' : '0.75rem',
            fontWeight: 700,
            gap: '0.375rem',
            letterSpacing: '0.5px',
            padding: mobile ? '0.25rem 0.5rem' : '0.375rem 0.75rem',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap'
        }
    }
    const getBulkButtonStyle = (type) => {
        const color = BULK_ACTION_COLORS[type] || BULK_ACTION_COLORS.cancel
        return {
            alignItems: 'center',
            background: color.bg,
            border: 'none',
            borderRadius: '8px',
            color: color.text,
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.875rem',
            fontWeight: 600,
            gap: '0.5rem',
            outline: 'none',
            padding: '0.5rem 1rem',
            transition: 'all 0.2s'
        }
    }
    const showReset = !!(searchText || selectedPlant || statusFilter || roleFilter)
    const statusDisplayValue = STATUS_MAP[statusFilter] || 'All Statuses'
    const roleDisplayValue = ROLE_MAP[roleFilter] || 'All Roles'
    return (
        <div
            className="global-dashboard-container dashboard-container global-flush-top flush-top list-view"
            style={{ background: '#f1f5f9', minHeight: '100%', position: 'relative', width: '100%' }}
        >
            <TopSection
                isLoading={isLoading}
                title={title}
                addButtonLabel="Add Item"
                onAddClick={() => setShowAddSheet(true)}
                searchInput={searchInput}
                onSearchInputChange={(v) => {
                    setSearchInput(v)
                    setSearchText(v)
                }}
                onClearSearch={() => {
                    setSearchInput('')
                    setSearchText('')
                }}
                searchPlaceholder="Search by description or comments..."
                plants={visiblePlants.map((p) => ({ plantCode: p.plant_code, plantName: p.plant_name }))}
                regionPlantCodes={regionPlantCodes}
                selectedPlant={selectedPlant}
                onSelectedPlantChange={setSelectedPlant}
                showReset={showReset}
                onReset={resetFilters}
                forwardedRef={headerRef}
                sticky={true}
                hideViewModeToggle={true}
            />
            <div style={{ position: 'relative' }}>
                <div
                    style={{
                        alignItems: 'center',
                        background: '#ffffff',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        flexShrink: 0,
                        flexWrap: 'wrap',
                        gap: '8px',
                        padding: '12px 16px',
                        position: 'sticky',
                        top: 'var(--top-section-height, 120px)',
                        zIndex: 40
                    }}
                >
                    <div style={{ alignItems: 'center', display: 'flex', gap: '6px' }}>
                        {VIEW_MODES.map((mode) => (
                            <button
                                key={mode.id}
                                onClick={() => setViewMode(mode.id)}
                                style={{
                                    alignItems: 'center',
                                    background: viewMode === mode.id ? '#111827' : 'transparent',
                                    border: viewMode === mode.id ? 'none' : '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    color: viewMode === mode.id ? '#ffffff' : '#6b7280',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    gap: '6px',
                                    padding: '6px 12px'
                                }}
                            >
                                <i className={`fas ${mode.icon}`} style={{ fontSize: '11px' }} />
                                {mode.label}
                            </button>
                        ))}
                    </div>
                    <div style={{ background: '#e5e7eb', height: '20px', width: '1px' }} />
                    {statusFilter ? (
                        <button
                            onClick={clearStatusFilter}
                            style={{
                                alignItems: 'center',
                                background: `${accentColor}10`,
                                border: `1px solid ${accentColor}30`,
                                borderRadius: '6px',
                                color: accentColor,
                                cursor: 'pointer',
                                display: 'flex',
                                fontSize: '12px',
                                fontWeight: '500',
                                gap: '6px',
                                padding: '6px 10px'
                            }}
                        >
                            {statusDisplayValue}
                            <i className="fas fa-times" style={{ fontSize: '10px', opacity: 0.7 }} />
                        </button>
                    ) : (
                        <select
                            value=""
                            onChange={(e) => handleStatusFilterChange(e.target.value)}
                            style={{
                                appearance: 'none',
                                background: '#f9fafb',
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                backgroundPosition: 'right 6px center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: isMobile ? '12px' : '14px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                color: '#6b7280',
                                cursor: 'pointer',
                                fontSize: isMobile ? '11px' : '12px',
                                fontWeight: '500',
                                outline: 'none',
                                padding: isMobile ? '5px 22px 5px 8px' : '6px 28px 6px 10px'
                            }}
                        >
                            <option value="">{isMobile ? '+Status' : '+ Status'}</option>
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    )}
                    {roleFilter ? (
                        <button
                            onClick={() => setRoleFilter('')}
                            style={{
                                alignItems: 'center',
                                background: `${accentColor}10`,
                                border: `1px solid ${accentColor}30`,
                                borderRadius: '6px',
                                color: accentColor,
                                cursor: 'pointer',
                                display: 'flex',
                                fontSize: '12px',
                                fontWeight: '500',
                                gap: '6px',
                                padding: '6px 10px'
                            }}
                        >
                            {roleDisplayValue}
                            <i className="fas fa-times" style={{ fontSize: '10px', opacity: 0.7 }} />
                        </button>
                    ) : (
                        <select
                            value=""
                            onChange={(e) => handleRoleFilterChange(e.target.value)}
                            style={{
                                appearance: 'none',
                                background: '#f9fafb',
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                backgroundPosition: 'right 6px center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: isMobile ? '12px' : '14px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                color: '#6b7280',
                                cursor: 'pointer',
                                fontSize: isMobile ? '11px' : '12px',
                                fontWeight: '500',
                                outline: 'none',
                                padding: isMobile ? '5px 22px 5px 8px' : '6px 28px 6px 10px'
                            }}
                        >
                            <option value="">{isMobile ? '+Role' : '+ Assigned'}</option>
                            {ROLE_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    )}
                    {!isMobile && <div style={{ flex: 1 }} />}
                    <div
                        style={{
                            alignItems: 'center',
                            display: 'flex',
                            gap: isMobile ? '8px' : '12px',
                            marginLeft: isMobile ? 'auto' : 0
                        }}
                    >
                        {summaryStats.overdue > 0 && (
                            <div
                                style={{
                                    alignItems: 'center',
                                    animation: 'pulse 2s infinite',
                                    background: '#fef2f2',
                                    borderRadius: '6px',
                                    color: '#dc2626',
                                    display: 'flex',
                                    fontSize: isMobile ? '10px' : '12px',
                                    fontWeight: '600',
                                    gap: isMobile ? '4px' : '6px',
                                    padding: isMobile ? '4px 6px' : '6px 10px'
                                }}
                            >
                                <i
                                    className="fas fa-exclamation-circle"
                                    style={{ fontSize: isMobile ? '9px' : '11px' }}
                                />
                                {summaryStats.overdue}
                                {isMobile ? '' : ' overdue'}
                            </div>
                        )}
                        <span style={{ color: '#9ca3af', fontSize: isMobile ? '10px' : '12px' }}>
                            <span style={{ color: '#111827', fontWeight: '600' }}>{summaryStats.total}</span>{' '}
                            {isMobile ? '' : 'tasks'}
                        </span>
                    </div>
                </div>
                <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } } .list-content-area { overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }`}</style>
                <div
                    className="content-area list-content-area"
                    style={{ padding: isMobile ? '1rem' : '1.5rem 2rem', paddingBottom: isMobile ? '2rem' : '2rem' }}
                >
                    {isLoading ? (
                        <TaskListSkeleton />
                    ) : filteredItems.length === 0 ? (
                        <div
                            style={{
                                alignItems: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                margin: '0 auto',
                                maxWidth: '600px',
                                padding: '4rem 2rem',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ color: '#cbd5e1', fontSize: '4rem', marginBottom: '1.5rem' }}>
                                <i className="fas fa-clipboard-list" />
                            </div>
                            <h3
                                style={{
                                    color: '#1e293b',
                                    fontSize: '1.25rem',
                                    fontWeight: 700,
                                    marginBottom: '0.5rem'
                                }}
                            >
                                {statusFilter === 'completed' ? 'No Completed Items Found' : 'No List Items Found'}
                            </h3>
                            <p style={{ color: '#64748b', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
                                {searchText || selectedPlant
                                    ? 'No items match your search criteria.'
                                    : statusFilter === 'completed'
                                      ? 'There are no completed items to show.'
                                      : 'There are no items in the list yet.'}
                            </p>
                            <button
                                onClick={() => setShowAddSheet(true)}
                                style={{
                                    alignItems: 'center',
                                    background: accentColor,
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    gap: '0.5rem',
                                    outline: 'none',
                                    padding: '0.625rem 1.25rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <i className="fas fa-plus" />
                                <span>Add Item</span>
                            </button>
                        </div>
                    ) : viewMode === 'planner' ? (
                        <WeeklyPlanner
                            items={roleFilteredItems}
                            onSelectItem={onSelectItem}
                            accentColor={accentColor}
                        />
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1.25rem',
                                paddingBottom: isMobile ? '1.5rem' : '2rem',
                                width: '100%'
                            }}
                        >
                            {Object.entries(groupedItems).map(([key, group]) => {
                                if (!group.items.length) return null
                                if (statusFilter === 'completed' && key !== 'completed') return null
                                if (statusFilter === 'pending' && key === 'completed') return null
                                if (statusFilter === 'overdue' && key !== 'overdue') return null
                                return (
                                    <div
                                        key={key}
                                        style={{
                                            background: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: isMobile ? '8px' : '12px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div
                                            style={{
                                                background: '#f8fafc',
                                                borderBottom: '1px solid #e5e7eb',
                                                padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    alignItems: 'center',
                                                    color: '#1e293b',
                                                    display: 'flex',
                                                    fontSize: isMobile ? '0.875rem' : '1rem',
                                                    fontWeight: 700,
                                                    gap: isMobile ? '0.5rem' : '0.75rem'
                                                }}
                                            >
                                                <i className={`fas ${group.icon}`} style={{ color: accentColor }} />
                                                <span>{group.label}</span>
                                                <span
                                                    style={{
                                                        alignItems: 'center',
                                                        background: accentColor,
                                                        borderRadius: '12px',
                                                        color: 'white',
                                                        display: 'inline-flex',
                                                        fontSize: isMobile ? '0.6875rem' : '0.75rem',
                                                        fontWeight: 700,
                                                        height: isMobile ? '20px' : '24px',
                                                        justifyContent: 'center',
                                                        minWidth: isMobile ? '20px' : '24px',
                                                        padding: '0 0.5rem'
                                                    }}
                                                >
                                                    {group.items.length}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            {group.items.map((item) => {
                                                const isSelected = selectedIds.has(item.id)
                                                const itemStatus = item.completed
                                                    ? 'completed'
                                                    : item.status || 'pending'
                                                const isItemOverdue =
                                                    (ListService.isOverdue(item) || item.status === 'overdue') &&
                                                    !item.completed
                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => onSelectItem(item.id)}
                                                        onMouseEnter={(e) => {
                                                            if (!isSelected && !item.completed)
                                                                e.currentTarget.style.background = '#f8fafc'
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (!isSelected && !item.completed)
                                                                e.currentTarget.style.background = 'white'
                                                        }}
                                                        style={{
                                                            alignItems: isMobile ? 'flex-start' : 'center',
                                                            background: isSelected
                                                                ? '#f0f7ff'
                                                                : item.completed
                                                                  ? '#f8fafc'
                                                                  : 'white',
                                                            borderBottom: '1px solid #f1f5f9',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            gap: isMobile ? '0.75rem' : '1rem',
                                                            opacity: item.completed ? 0.7 : 1,
                                                            padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                alignItems: 'center',
                                                                display: 'flex',
                                                                flexShrink: 0,
                                                                justifyContent: 'center'
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                toggleSelect(item.id)
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => {}}
                                                            />
                                                        </div>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                flex: 1,
                                                                flexDirection: 'column',
                                                                gap: isMobile ? '0.375rem' : '0.5rem',
                                                                minWidth: 0
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    alignItems: isMobile ? 'flex-start' : 'flex-start',
                                                                    display: 'flex',
                                                                    flexDirection: isMobile ? 'column' : 'row',
                                                                    gap: isMobile ? '0.5rem' : '1rem',
                                                                    justifyContent: 'space-between'
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        flex: 1,
                                                                        flexDirection: 'column',
                                                                        gap: '0.25rem',
                                                                        minWidth: 0
                                                                    }}
                                                                >
                                                                    <h4
                                                                        style={{
                                                                            color: '#1e293b',
                                                                            fontSize: isMobile
                                                                                ? '0.8125rem'
                                                                                : '0.9375rem',
                                                                            fontWeight: 600,
                                                                            margin: 0,
                                                                            wordBreak: 'break-word'
                                                                        }}
                                                                    >
                                                                        {ListService.truncateText(item.description, 80)}
                                                                    </h4>
                                                                    {item.comments && (
                                                                        <p
                                                                            style={{
                                                                                color: '#64748b',
                                                                                fontSize: isMobile
                                                                                    ? '0.75rem'
                                                                                    : '0.8125rem',
                                                                                margin: 0
                                                                            }}
                                                                        >
                                                                            {ListService.truncateText(
                                                                                item.comments,
                                                                                60
                                                                            )}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <span style={getItemStatusStyle(itemStatus, isMobile)}>
                                                                    <i
                                                                        className={`fas ${ListService.getStatusIcon(itemStatus)}`}
                                                                    />
                                                                    {ListService.getStatusLabel(itemStatus)}
                                                                </span>
                                                            </div>
                                                            <div
                                                                style={{
                                                                    alignItems: 'center',
                                                                    display: 'flex',
                                                                    flexWrap: 'wrap',
                                                                    gap: isMobile ? '0.5rem' : '0.75rem'
                                                                }}
                                                            >
                                                                <span
                                                                    style={{
                                                                        alignItems: 'center',
                                                                        color: '#64748b',
                                                                        display: 'flex',
                                                                        fontSize: isMobile ? '0.6875rem' : '0.8125rem',
                                                                        fontWeight: 500,
                                                                        gap: '0.375rem'
                                                                    }}
                                                                >
                                                                    <i className="fas fa-building" />
                                                                    {ListService.getPlantName(item.plant_code)}
                                                                </span>
                                                                <span
                                                                    style={{
                                                                        alignItems: 'center',
                                                                        color: isItemOverdue ? '#ef4444' : '#64748b',
                                                                        display: 'flex',
                                                                        fontSize: isMobile ? '0.6875rem' : '0.8125rem',
                                                                        fontWeight: isItemOverdue ? 700 : 500,
                                                                        gap: '0.375rem'
                                                                    }}
                                                                >
                                                                    <i className="fas fa-calendar" />
                                                                    {new Date(item.deadline).toLocaleDateString(
                                                                        'en-US',
                                                                        { day: 'numeric', month: 'short' }
                                                                    )}
                                                                </span>
                                                                {item.responsible_role && (
                                                                    <span
                                                                        style={{
                                                                            alignItems: 'center',
                                                                            color: '#64748b',
                                                                            display: 'flex',
                                                                            fontSize: isMobile
                                                                                ? '0.6875rem'
                                                                                : '0.8125rem',
                                                                            fontWeight: 500,
                                                                            gap: '0.375rem'
                                                                        }}
                                                                    >
                                                                        <i
                                                                            className={`fas ${ListService.getResponsibleRoleIcon(item.responsible_role)}`}
                                                                        />
                                                                        {ListService.getResponsibleRoleLabel(
                                                                            item.responsible_role
                                                                        )}
                                                                    </span>
                                                                )}
                                                                <span
                                                                    style={{
                                                                        alignItems: 'center',
                                                                        color: '#64748b',
                                                                        display: 'flex',
                                                                        fontSize: isMobile ? '0.6875rem' : '0.8125rem',
                                                                        fontWeight: 500,
                                                                        gap: '0.375rem'
                                                                    }}
                                                                >
                                                                    <i className="fas fa-user" />
                                                                    {ListService.truncateText(
                                                                        ListService.getCreatorName(item.user_id),
                                                                        15
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div
                                                            style={{
                                                                alignItems: 'center',
                                                                color: '#cbd5e1',
                                                                display: 'flex',
                                                                fontSize: '0.875rem',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            <i className="fas fa-chevron-right" />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
            {selectedIds.size > 0 && (
                <div
                    style={{
                        alignItems: 'center',
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        bottom: isMobile ? '1rem' : '2rem',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        display: 'flex',
                        flexWrap: isMobile ? 'wrap' : 'nowrap',
                        gap: isMobile ? '0.5rem' : '1rem',
                        justifyContent: isMobile ? 'center' : 'flex-start',
                        left: '50%',
                        maxWidth: isMobile ? 'calc(100% - 2rem)' : 'auto',
                        padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
                        position: 'fixed',
                        transform: 'translateX(-50%)',
                        zIndex: 1000
                    }}
                >
                    <div style={{ color: accentColor, fontSize: '0.9375rem', fontWeight: 700 }}>
                        {selectedIds.size} selected
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => bulkToggleCompletion(true)}
                            style={getBulkButtonStyle('complete')}
                            onMouseEnter={(e) => (e.currentTarget.style.background = BULK_ACTION_COLORS.complete.hover)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = BULK_ACTION_COLORS.complete.bg)}
                        >
                            <i className="fas fa-check" />
                            <span>Complete</span>
                        </button>
                        <button
                            onClick={bulkDelete}
                            style={getBulkButtonStyle('delete')}
                            onMouseEnter={(e) => (e.currentTarget.style.background = BULK_ACTION_COLORS.delete.hover)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = BULK_ACTION_COLORS.delete.bg)}
                        >
                            <i className="fas fa-trash" />
                            <span>Delete</span>
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            style={getBulkButtonStyle('cancel')}
                            onMouseEnter={(e) => (e.currentTarget.style.background = BULK_ACTION_COLORS.cancel.hover)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = BULK_ACTION_COLORS.cancel.bg)}
                        >
                            <i className="fas fa-times" />
                            <span>Cancel</span>
                        </button>
                    </div>
                </div>
            )}
            {showAddSheet && (
                <ListAddView
                    onClose={() => setShowAddSheet(false)}
                    onItemAdded={() => {
                        setIsLoading(true)
                        Promise.all([ListService.fetchListItems(), ListService.fetchPlants()])
                            .then(() => setPlants(ListService.plants))
                            .finally(() => setIsLoading(false))
                    }}
                />
            )}
        </div>
    )
}
export default ListView
