import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { usePreferences } from '../../app/context/PreferencesContext'
import LoadingScreen from '../../components/common/LoadingScreen'
import TopSection from '../../components/sections/TopSection'
import { ListService } from '../../services/ListService'
import { RegionService } from '../../services/RegionService'
import { UserService } from '../../services/UserService'
import ListAddView from './ListAddView'

function ListView({ title = 'Tasks List', onSelectItem, onStatusFilterChange }) {
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const headerRef = useRef(null)
    const searchInputRef = useRef(null)
    const toolbarRef = useRef(null)
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
    const [sortKey, setSortKey] = useState('')
    const [sortDirection, setSortDirection] = useState('asc')
    const [viewMode, setViewMode] = useState('date')
    const [roleFilter, setRoleFilter] = useState('')
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
    const [showMobileSidebar, setShowMobileSidebar] = useState(false)
    const [sidebarExpanded, setSidebarExpanded] = useState(false)

    const baseFilteredItems = ListService.getFilteredItems({
        filterType: '',
        plantCode: selectedPlant,
        searchTerm: searchText,
        showCompleted: statusFilter === 'completed',
        statusFilter
    })

    const filteredItems =
        regionPlantCodes && regionPlantCodes.size > 0
            ? baseFilteredItems.filter((item) =>
                  regionPlantCodes.has(
                      String(item.plant_code || '')
                          .trim()
                          .toUpperCase()
                  )
              )
            : baseFilteredItems

    const roleFilteredItems = roleFilter
        ? filteredItems.filter((item) => item.responsible_role === roleFilter)
        : filteredItems

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

            if (deadline < today || item.status === 'overdue') {
                groups.overdue.items.push(item)
            } else if (deadline.getTime() === today.getTime()) {
                groups.today.items.push(item)
            } else if (deadline.getTime() === tomorrow.getTime()) {
                groups.tomorrow.items.push(item)
            } else if (deadline <= endOfWeek) {
                groups.thisWeek.items.push(item)
            } else {
                groups.later.items.push(item)
            }
        })

        Object.values(groups).forEach((group) => {
            group.items.sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        })

        return groups
    }, [roleFilteredItems])

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

        roleFilteredItems.forEach((item) => {
            if (item.completed || item.status === 'completed') {
                groups.completed.items.push(item)
                return
            }

            const deadline = new Date(item.deadline)
            deadline.setHours(0, 0, 0, 0)
            const isOverdue = deadline < today

            if (
                isOverdue &&
                item.status !== 'in_progress' &&
                item.status !== 'blocked' &&
                item.status !== 'waiting' &&
                item.status !== 'ordered_materials'
            ) {
                groups.overdue.items.push(item)
            } else if (item.status === 'in_progress') {
                groups.in_progress.items.push(item)
            } else if (item.status === 'blocked') {
                groups.blocked.items.push(item)
            } else if (item.status === 'waiting') {
                groups.waiting.items.push(item)
            } else if (item.status === 'ordered_materials') {
                groups.ordered_materials.items.push(item)
            } else {
                groups.pending.items.push(item)
            }
        })

        Object.values(groups).forEach((group) => {
            group.items.sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        })

        return groups
    }, [roleFilteredItems])

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
                if (groups[role]) {
                    groups[role].items.push(item)
                } else {
                    groups.unassigned.items.push(item)
                }
            })

        Object.values(groups).forEach((group) => {
            group.items.sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        })

        return groups
    }, [roleFilteredItems])

    const groupedItems = viewMode === 'date' ? groupedByDate : viewMode === 'status' ? groupedByStatus : groupedByRole

    const summaryStats = useMemo(() => {
        const total = roleFilteredItems.length
        const completed = roleFilteredItems.filter((i) => i.completed || i.status === 'completed').length
        const overdue = groupedByDate.overdue?.items?.length || 0
        const dueToday = groupedByDate.today?.items?.length || 0
        const inProgress = roleFilteredItems.filter((i) => i.status === 'in_progress').length
        const blocked = roleFilteredItems.filter((i) => i.status === 'blocked').length
        const pending = total - completed
        return { blocked, completed, dueToday, inProgress, overdue, pending, total }
    }, [roleFilteredItems, groupedByDate])

    const urgentItems = useMemo(() => {
        return [...(groupedByDate.overdue?.items || []), ...(groupedByDate.today?.items || [])].slice(0, 5)
    }, [groupedByDate])

    const recentlyCompleted = useMemo(() => {
        return roleFilteredItems
            .filter((i) => i.completed || i.status === 'completed')
            .sort((a, b) => new Date(b.completed_at || b.deadline) - new Date(a.completed_at || a.deadline))
            .slice(0, 3)
    }, [roleFilteredItems])

    const handleScroll = useCallback(() => {
        if (!headerRef.current || !plannerGroupsRef.current) return
        const headerRect = headerRef.current.getBoundingClientRect()
        const clipTop = headerRect.bottom
        const items = plannerGroupsRef.current.querySelectorAll('.planner-group, .planner-item')
        items.forEach((item) => {
            const itemRect = item.getBoundingClientRect()
            if (itemRect.top < clipTop) {
                const overlap = clipTop - itemRect.top
                if (overlap >= itemRect.height) {
                    item.style.opacity = '0'
                    item.style.pointerEvents = 'none'
                } else {
                    item.style.clipPath = `inset(${overlap}px 0 0 0)`
                    item.style.opacity = '1'
                    item.style.pointerEvents = 'auto'
                }
            } else {
                item.style.clipPath = 'none'
                item.style.opacity = '1'
                item.style.pointerEvents = 'auto'
            }
        })
    }, [])

    useEffect(() => {
        const contentArea = document.querySelector('.content-area')
        if (contentArea) {
            contentArea.addEventListener('scroll', handleScroll)
            handleScroll()
        }
        return () => {
            if (contentArea) {
                contentArea.removeEventListener('scroll', handleScroll)
            }
        }
    }, [handleScroll])

    useEffect(() => {
        fetchAllData()
    }, [])

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        let cancelled = false

        async function loadRegionPlants() {
            try {
                const codes = await RegionService.getAllowedPlantCodes(preferences?.selectedRegion?.code || '')
                if (cancelled) return
                setRegionPlantCodes(codes)
                const sel = String(selectedPlant || '')
                    .trim()
                    .toUpperCase()
                if (sel && codes && !codes.has(sel)) {
                    setSelectedPlant('')
                }
            } catch {
                if (!cancelled) setRegionPlantCodes(null)
            }
        }

        loadRegionPlants()
        return () => {
            cancelled = true
        }
    }, [preferences?.selectedRegion?.code])

    useEffect(() => {
        if (!selectedPlant) return
        if (!regionPlantCodes || regionPlantCodes.size === 0) return
        const sel = String(selectedPlant || '')
            .trim()
            .toUpperCase()
        if (sel && !regionPlantCodes.has(sel)) {
            setSelectedPlant('')
        }
    }, [regionPlantCodes, selectedPlant])

    async function fetchAllData() {
        setIsLoading(true)
        try {
            await Promise.all([ListService.fetchListItems(), ListService.fetchPlants()])
            setPlants(ListService.plants)
        } finally {
            setIsLoading(false)
        }
    }

    const getPlantName = (plantCode) => ListService.getPlantName(plantCode)
    const truncateText = (text, maxLength, byWords = false) => ListService.truncateText(text, maxLength, byWords)

    const handleSelectItem = (item) => {
        onSelectItem(item.id)
    }

    function toggleSelect(id) {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    function handleHeaderClick(label) {
        if (!label || label === '') return
        if (sortKey === label) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortKey(label)
            setSortDirection('asc')
        }
    }

    async function bulkToggleCompletion(markComplete) {
        if (selectedIds.size === 0) return
        const user = await UserService.getCurrentUser()
        const userId = user?.id
        if (!userId) return
        const itemsById = new Map(ListService.listItems.map((i) => [i.id, i]))
        for (const id of selectedIds) {
            const it = itemsById.get(id)
            if (!it) continue
            const needs = markComplete ? !it.completed : it.completed
            if (!needs) continue
            try {
                await ListService.toggleCompletion(it, userId)
            } catch {}
        }
        setSelectedIds(new Set())
    }

    async function bulkDelete() {
        if (selectedIds.size === 0) return
        const ok = window.confirm('Delete selected items?')
        if (!ok) return
        for (const id of selectedIds) {
            try {
                await ListService.deleteListItem(id)
            } catch {}
        }
        setSelectedIds(new Set())
    }

    useEffect(() => {
        function onKeyDown(e) {
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
        function updateStickyCoverHeight() {
            const el = headerRef.current
            const h = el ? Math.ceil(el.getBoundingClientRect().height) : 0
            const root = document.querySelector('.global-dashboard-container.list-view')
            if (root && h) root.style.setProperty('--sticky-cover-height', h + 'px')
        }

        updateStickyCoverHeight()
        window.addEventListener('resize', updateStickyCoverHeight)
        return () => window.removeEventListener('resize', updateStickyCoverHeight)
    }, [searchInput, selectedPlant, statusFilter])

    const derivedVisiblePlants = (() => {
        if (!Array.isArray(plants)) return []
        if (regionPlantCodes && regionPlantCodes.size > 0)
            return plants.filter((p) =>
                regionPlantCodes.has(
                    String(p.plant_code || '')
                        .trim()
                        .toUpperCase()
                )
            )
        return plants
    })()

    const derivedStatusOptions = [
        'All Statuses',
        'Pending',
        'In Progress',
        'Ordered Materials',
        'Blocked',
        'Waiting',
        'Overdue',
        'Completed'
    ]

    const derivedRoleOptions = ['All Roles', 'Maintenance', 'Plant Manager', 'District Manager', 'Unassigned']

    const derivedStatusValueForTop = (() => {
        if (!statusFilter) return 'All Statuses'
        const v = String(statusFilter).toLowerCase()
        if (v === 'completed') return 'Completed'
        if (v === 'overdue') return 'Overdue'
        if (v === 'pending') return 'Pending'
        if (v === 'in_progress') return 'In Progress'
        if (v === 'ordered_materials') return 'Ordered Materials'
        if (v === 'blocked') return 'Blocked'
        if (v === 'waiting') return 'Waiting'
        return 'All Statuses'
    })()

    const derivedRoleValueForTop = (() => {
        if (!roleFilter) return 'All Roles'
        if (roleFilter === 'maintenance') return 'Maintenance'
        if (roleFilter === 'plant_manager') return 'Plant Manager'
        if (roleFilter === 'district_manager') return 'District Manager'
        if (roleFilter === 'unassigned') return 'Unassigned'
        return 'All Roles'
    })()

    const derivedListHeaderLabels =
        statusFilter === 'completed'
            ? ['', 'Description', 'Plant', 'Deadline', 'Completed', 'Creator', 'Status']
            : ['', 'Description', 'Plant', 'Deadline', 'Creator', 'Status']

    const derivedColWidths =
        statusFilter === 'completed'
            ? ['2%', '37%', '14%', '12%', '16%', '11%', '8%']
            : ['2%', '42%', '16%', '14%', '16%', '10%']

    const derivedShowReset = !!(searchText || selectedPlant || statusFilter || roleFilter)

    const hasBulkPopup = selectedIds.size > 0

    const styles = {
        addButton: {
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
        },
        bulkActionButton: (type) => {
            const colors = {
                cancel: { bg: '#f1f5f9', hover: '#e2e8f0', text: '#64748b' },
                complete: { bg: '#dcfce7', hover: '#bbf7d0', text: '#16a34a' },
                delete: { bg: '#fee2e2', hover: '#fecaca', text: '#ef4444' }
            }
            const color = colors[type] || colors.cancel
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
        },
        bulkActionsContent: {
            display: 'flex',
            gap: '0.5rem'
        },
        bulkActionsPopup: {
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
        },
        bulkCount: {
            color: accentColor,
            fontSize: '0.9375rem',
            fontWeight: 700
        },
        container: {
            background: '#f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'hidden',
            position: 'relative',
            width: '100%'
        },
        contentArea: {
            flex: 1,
            height: '100%',
            overflowX: 'hidden',
            overflowY: 'auto',
            padding: isMobile ? '1rem' : '1.5rem 2rem'
        },
        emptyIcon: {
            color: '#cbd5e1',
            fontSize: '4rem',
            marginBottom: '1.5rem'
        },
        emptyState: {
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            margin: '0 auto',
            maxWidth: '600px',
            padding: '4rem 2rem',
            textAlign: 'center'
        },
        emptyText: {
            color: '#64748b',
            fontSize: '0.9375rem',
            marginBottom: '1.5rem'
        },
        emptyTitle: {
            color: '#1e293b',
            fontSize: '1.25rem',
            fontWeight: 700,
            marginBottom: '0.5rem'
        },
        filterSelect: {
            MozAppearance: 'none',
            WebkitAppearance: 'none',
            appearance: 'none',
            backgroundColor: 'white',
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.75rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.25em 1.25em',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            color: '#1e293b',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            outline: 'none',
            padding: '0.75rem 2.5rem 0.75rem 1rem',
            transition: 'all 0.15s ease',
            width: '100%'
        },
        filtersGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        },
        groupCount: {
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
        },
        groupHeader: {
            background: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
            padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem'
        },
        groupItems: {
            display: 'flex',
            flexDirection: 'column'
        },
        groupTitle: {
            alignItems: 'center',
            color: '#1e293b',
            display: 'flex',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 700,
            gap: isMobile ? '0.5rem' : '0.75rem'
        },
        itemAction: {
            alignItems: 'center',
            color: '#cbd5e1',
            display: 'flex',
            fontSize: '0.875rem',
            justifyContent: 'center'
        },
        itemCheckbox: {
            alignItems: 'center',
            display: 'flex',
            flexShrink: 0,
            justifyContent: 'center'
        },
        itemComments: {
            color: '#64748b',
            fontSize: isMobile ? '0.75rem' : '0.8125rem',
            margin: 0
        },
        itemContent: {
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            gap: isMobile ? '0.375rem' : '0.5rem',
            minWidth: 0
        },
        itemHeader: {
            alignItems: isMobile ? 'flex-start' : 'flex-start',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '0.5rem' : '1rem',
            justifyContent: 'space-between'
        },
        itemMainContent: {
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            gap: '0.25rem',
            minWidth: 0
        },
        itemMeta: {
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: isMobile ? '0.5rem' : '0.75rem'
        },
        itemStatus: (statusType) => {
            const colors = {
                blocked: { bg: '#fee2e2', border: '#ef4444', text: '#ef4444' },
                completed: { bg: '#dcfce7', border: '#16a34a', text: '#16a34a' },
                in_progress: { bg: '#dbeafe', border: '#3b82f6', text: '#3b82f6' },
                ordered_materials: { bg: '#dbeafe', border: '#3b82f6', text: '#3b82f6' },
                overdue: { bg: '#fee2e2', border: '#ef4444', text: '#ef4444' },
                pending: { bg: '#fef3c7', border: '#f59e0b', text: '#f59e0b' },
                waiting: { bg: '#fef3c7', border: '#f59e0b', text: '#f59e0b' }
            }
            const color = colors[statusType] || colors.pending
            return {
                alignItems: 'center',
                background: color.bg,
                border: `1px solid ${color.border}`,
                borderRadius: '6px',
                color: color.text,
                display: 'flex',
                flexShrink: 0,
                fontSize: isMobile ? '0.625rem' : '0.75rem',
                fontWeight: 700,
                gap: '0.375rem',
                letterSpacing: '0.5px',
                padding: isMobile ? '0.25rem 0.5rem' : '0.375rem 0.75rem',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap'
            }
        },
        itemTitle: {
            color: '#1e293b',
            fontSize: isMobile ? '0.8125rem' : '0.9375rem',
            fontWeight: 600,
            margin: 0,
            wordBreak: 'break-word'
        },
        mainContent: {
            display: 'flex',
            flex: 1,
            flexDirection: isMobile ? 'column' : 'row',
            height: 'calc(100vh - 120px)',
            maxHeight: 'calc(100vh - 120px)',
            overflow: 'hidden',
            position: 'relative'
        },
        metaTag: (type) => {
            const baseStyle = {
                alignItems: 'center',
                color: '#64748b',
                display: 'flex',
                fontSize: isMobile ? '0.6875rem' : '0.8125rem',
                fontWeight: 500,
                gap: '0.375rem'
            }
            if (type === 'overdue') {
                return { ...baseStyle, color: '#ef4444', fontWeight: 700 }
            }
            return baseStyle
        },
        mobileStatBadge: (type) => {
            const colors = {
                overdue: { bg: '#fee2e2', text: '#ef4444' },
                today: { bg: '#fef3c7', text: '#f59e0b' },
                total: { bg: '#eff6ff', text: accentColor }
            }
            const color = colors[type] || colors.total
            return {
                alignItems: 'center',
                background: color.bg,
                borderRadius: '6px',
                color: color.text,
                display: 'flex',
                fontSize: '12px',
                fontWeight: 600,
                gap: '4px',
                padding: '6px 10px'
            }
        },
        mobileStatsRow: {
            alignItems: 'center',
            display: 'flex',
            flex: 1,
            gap: '12px',
            justifyContent: 'flex-end'
        },
        mobileToggleBar: {
            alignItems: 'center',
            background: 'white',
            borderBottom: '1px solid #e2e8f0',
            display: isMobile ? 'flex' : 'none',
            gap: '12px',
            justifyContent: 'space-between',
            padding: '12px 16px'
        },
        mobileToggleBtn: {
            alignItems: 'center',
            background: showMobileSidebar ? accentColor : '#f1f5f9',
            border: 'none',
            borderRadius: '8px',
            color: showMobileSidebar ? 'white' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '13px',
            fontWeight: 600,
            gap: '8px',
            padding: '10px 16px'
        },
        plannerGroup: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: isMobile ? '8px' : '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            overflow: 'hidden'
        },
        plannerGroups: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            width: '100%'
        },
        plannerItem: (completed, selected) => ({
            alignItems: isMobile ? 'flex-start' : 'center',
            background: selected ? '#f0f7ff' : completed ? '#f8fafc' : 'white',
            borderBottom: '1px solid #f1f5f9',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'row',
            gap: isMobile ? '0.75rem' : '1rem',
            opacity: completed ? 0.7 : 1,
            padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
            transition: 'all 0.2s'
        }),
        sidebar: {
            background: 'white',
            borderRight: isMobile ? 'none' : '1px solid #e2e8f0',
            display: isMobile ? (showMobileSidebar ? 'flex' : 'none') : 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            height: isMobile ? 'auto' : 'calc(100vh - 120px)',
            maxHeight: isMobile ? 'auto' : 'calc(100vh - 120px)',
            minWidth: isMobile ? '100%' : sidebarExpanded ? '300px' : '60px',
            overflow: 'hidden',
            position: isMobile ? 'relative' : 'sticky',
            top: 0,
            transition: 'width 0.2s ease, min-width 0.2s ease',
            width: isMobile ? '100%' : sidebarExpanded ? '300px' : '60px'
        },
        sidebarBody: {
            flex: 1,
            minHeight: 0,
            overflowX: 'hidden',
            overflowY: 'auto',
            padding: '1rem'
        },
        sidebarHeader: {
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '1.5rem'
        },
        sidebarHeaderSubtitle: {
            color: '#64748b',
            fontSize: '0.8125rem',
            marginTop: '0.25rem'
        },
        sidebarHeaderTitle: {
            alignItems: 'center',
            color: accentColor,
            display: 'flex',
            fontSize: '1.125rem',
            fontWeight: 700,
            gap: '0.75rem',
            margin: 0
        },
        sidebarSection: {
            marginBottom: '1.25rem'
        },
        sidebarTitle: {
            alignItems: 'center',
            color: '#94a3b8',
            display: 'flex',
            fontSize: '0.6875rem',
            fontWeight: 700,
            gap: '0.5rem',
            letterSpacing: '1px',
            marginBottom: '0.75rem',
            textTransform: 'uppercase'
        },
        statCard: (color) => {
            const colors = {
                overdue: { bg: '#fef2f2', border: '#fecaca' },
                progress: { bg: '#eff6ff', border: '#bfdbfe' },
                today: { bg: '#fffbeb', border: '#fde68a' },
                total: { bg: '#f0f7ff', border: '#bfdbfe' }
            }
            const colorSet = colors[color] || colors.total
            return {
                alignItems: 'center',
                background: colorSet.bg,
                border: `1px solid ${colorSet.border}`,
                borderRadius: '10px',
                cursor: 'default',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                padding: '0.875rem 0.5rem'
            }
        },
        statLabel: {
            color: '#64748b',
            fontSize: '0.625rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textAlign: 'center',
            textTransform: 'uppercase'
        },
        statValue: (color) => {
            const colors = {
                overdue: '#dc2626',
                progress: '#2563eb',
                today: '#d97706',
                total: accentColor
            }
            return {
                color: colors[color] || accentColor,
                fontSize: '1.75rem',
                fontWeight: 700,
                lineHeight: 1
            }
        },
        statsGrid: {
            display: 'grid',
            gap: '0.5rem',
            gridTemplateColumns: '1fr 1fr'
        },
        viewModeBtn: (active) => ({
            alignItems: 'center',
            background: active ? '#eff6ff' : 'white',
            border: active ? `2px solid ${accentColor}` : '1px solid #e2e8f0',
            borderRadius: '8px',
            color: active ? accentColor : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.875rem',
            fontWeight: 600,
            gap: '0.75rem',
            outline: 'none',
            padding: '0.75rem 1rem',
            textAlign: 'left',
            transition: 'all 0.15s ease'
        }),
        viewModeToggle: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem'
        }
    }

    const listViewFilterBar = (
        <div ref={toolbarRef} style={styles.filterBar}>
            <div style={styles.viewModeToggle}>
                <button
                    style={styles.viewModeBtn(viewMode === 'date')}
                    onClick={() => setViewMode('date')}
                    onMouseEnter={(e) => {
                        if (viewMode !== 'date') {
                            e.currentTarget.style.background = '#f1f5f9'
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (viewMode !== 'date') {
                            e.currentTarget.style.background = 'transparent'
                        }
                    }}
                >
                    <i className="fas fa-calendar-alt"></i>
                    <span>By Date</span>
                </button>
                <button
                    style={styles.viewModeBtn(viewMode === 'status')}
                    onClick={() => setViewMode('status')}
                    onMouseEnter={(e) => {
                        if (viewMode !== 'status') {
                            e.currentTarget.style.background = '#f1f5f9'
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (viewMode !== 'status') {
                            e.currentTarget.style.background = 'transparent'
                        }
                    }}
                >
                    <i className="fas fa-tasks"></i>
                    <span>By Status</span>
                </button>
                <button
                    style={styles.viewModeBtn(viewMode === 'role')}
                    onClick={() => setViewMode('role')}
                    onMouseEnter={(e) => {
                        if (viewMode !== 'role') {
                            e.currentTarget.style.background = '#f1f5f9'
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (viewMode !== 'role') {
                            e.currentTarget.style.background = 'transparent'
                        }
                    }}
                >
                    <i className="fas fa-user-tag"></i>
                    <span>By Assigned</span>
                </button>
            </div>
            <div style={styles.filters}>
                <select
                    style={styles.roleFilterSelect}
                    value={derivedRoleValueForTop}
                    onChange={(e) => {
                        const v = e.target.value
                        let mapped = ''
                        if (v === 'Maintenance') mapped = 'maintenance'
                        else if (v === 'Plant Manager') mapped = 'plant_manager'
                        else if (v === 'District Manager') mapped = 'district_manager'
                        else if (v === 'Unassigned') mapped = 'unassigned'
                        setRoleFilter(mapped)
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = accentColor
                        e.target.style.boxShadow = `0 0 0 3px ${accentColor}20`
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb'
                        e.target.style.boxShadow = 'none'
                    }}
                >
                    {derivedRoleOptions.map((opt) => (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    )

    return (
        <div style={styles.container}>
            <TopSection
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
                plants={derivedVisiblePlants.map((p) => ({ plantCode: p.plant_code, plantName: p.plant_name }))}
                regionPlantCodes={regionPlantCodes}
                selectedPlant={selectedPlant}
                onSelectedPlantChange={(v) => {
                    setSelectedPlant(v)
                }}
                showReset={derivedShowReset}
                onReset={() => {
                    setSearchText('')
                    setSearchInput('')
                    setSelectedPlant('')
                    setStatusFilter('')
                    setRoleFilter('')
                }}
                forwardedRef={headerRef}
                sticky={true}
                hideViewModeToggle={true}
            />

            <div style={styles.mainContent}>
                {isMobile && (
                    <div style={styles.mobileToggleBar}>
                        <button style={styles.mobileToggleBtn} onClick={() => setShowMobileSidebar(!showMobileSidebar)}>
                            <i className={`fas ${showMobileSidebar ? 'fa-times' : 'fa-sliders-h'}`}></i>
                            <span>{showMobileSidebar ? 'Close' : 'Filters'}</span>
                        </button>
                        <div style={styles.mobileStatsRow}>
                            <div style={styles.mobileStatBadge('total')}>
                                <span>{summaryStats.total}</span>
                                <span>Total</span>
                            </div>
                            <div style={styles.mobileStatBadge('overdue')}>
                                <span>{summaryStats.overdue}</span>
                                <span>Overdue</span>
                            </div>
                            <div style={styles.mobileStatBadge('today')}>
                                <span>{summaryStats.dueToday}</span>
                                <span>Today</span>
                            </div>
                        </div>
                    </div>
                )}
                <div style={styles.sidebar}>
                    {!isMobile && (
                        <button
                            onClick={() => setSidebarExpanded(!sidebarExpanded)}
                            style={{
                                alignItems: 'center',
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                height: '32px',
                                justifyContent: 'center',
                                position: 'absolute',
                                right: sidebarExpanded ? '1rem' : '50%',
                                top: '1rem',
                                transform: sidebarExpanded ? 'none' : 'translateX(50%)',
                                transition: 'all 0.2s ease',
                                width: '32px',
                                zIndex: 10
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                        >
                            <i
                                className={`fas fa-chevron-${sidebarExpanded ? 'left' : 'right'}`}
                                style={{ color: '#64748b', fontSize: '12px' }}
                            ></i>
                        </button>
                    )}
                    {(isMobile || sidebarExpanded) && (
                        <>
                            <div style={styles.sidebarHeader}>
                                <h2 style={styles.sidebarHeaderTitle}>
                                    <i className="fas fa-clipboard-list"></i>
                                    Task Manager
                                </h2>
                                <p style={styles.sidebarHeaderSubtitle}>{summaryStats.total} total tasks</p>
                            </div>

                            <div style={styles.sidebarBody}>
                                <div style={styles.sidebarSection}>
                                    <div style={styles.sidebarTitle}>Overview</div>
                                    <div style={styles.statsGrid}>
                                        <div style={styles.statCard('total')}>
                                            <span style={styles.statValue('total')}>{summaryStats.total}</span>
                                            <span style={styles.statLabel}>Total</span>
                                        </div>
                                        <div style={styles.statCard('overdue')}>
                                            <span style={styles.statValue('overdue')}>{summaryStats.overdue}</span>
                                            <span style={styles.statLabel}>Overdue</span>
                                        </div>
                                        <div style={styles.statCard('today')}>
                                            <span style={styles.statValue('today')}>{summaryStats.dueToday}</span>
                                            <span style={styles.statLabel}>Due Today</span>
                                        </div>
                                        <div style={styles.statCard('progress')}>
                                            <span style={styles.statValue('progress')}>{summaryStats.inProgress}</span>
                                            <span style={styles.statLabel}>In Progress</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={styles.sidebarSection}>
                                    <div style={styles.sidebarTitle}>View Mode</div>
                                    <div style={styles.viewModeToggle}>
                                        <button
                                            style={styles.viewModeBtn(viewMode === 'date')}
                                            onClick={() => setViewMode('date')}
                                            onMouseEnter={(e) => {
                                                if (viewMode !== 'date') e.currentTarget.style.background = '#f8fafc'
                                            }}
                                            onMouseLeave={(e) => {
                                                if (viewMode !== 'date') e.currentTarget.style.background = 'white'
                                            }}
                                        >
                                            <i className="fas fa-calendar-alt"></i>
                                            <span>By Date</span>
                                        </button>
                                        <button
                                            style={styles.viewModeBtn(viewMode === 'status')}
                                            onClick={() => setViewMode('status')}
                                            onMouseEnter={(e) => {
                                                if (viewMode !== 'status') e.currentTarget.style.background = '#f8fafc'
                                            }}
                                            onMouseLeave={(e) => {
                                                if (viewMode !== 'status') e.currentTarget.style.background = 'white'
                                            }}
                                        >
                                            <i className="fas fa-tasks"></i>
                                            <span>By Status</span>
                                        </button>
                                        <button
                                            style={styles.viewModeBtn(viewMode === 'role')}
                                            onClick={() => setViewMode('role')}
                                            onMouseEnter={(e) => {
                                                if (viewMode !== 'role') e.currentTarget.style.background = '#f8fafc'
                                            }}
                                            onMouseLeave={(e) => {
                                                if (viewMode !== 'role') e.currentTarget.style.background = 'white'
                                            }}
                                        >
                                            <i className="fas fa-user-tag"></i>
                                            <span>By Assigned</span>
                                        </button>
                                    </div>
                                </div>

                                <div style={styles.sidebarSection}>
                                    <div style={styles.sidebarTitle}>Filters</div>
                                    <div style={styles.filtersGroup}>
                                        <select
                                            style={styles.filterSelect}
                                            value={derivedStatusValueForTop}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                let mapped = ''
                                                if (v === 'Pending') mapped = 'pending'
                                                else if (v === 'Completed') mapped = 'completed'
                                                else if (v === 'Overdue') mapped = 'overdue'
                                                else if (v === 'Ordered Materials') mapped = 'ordered_materials'
                                                else if (v === 'In Progress') mapped = 'in_progress'
                                                else if (v === 'Blocked') mapped = 'blocked'
                                                else if (v === 'Waiting') mapped = 'waiting'
                                                setStatusFilter(mapped)
                                                if (onStatusFilterChange) onStatusFilterChange(mapped)
                                            }}
                                        >
                                            {derivedStatusOptions.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            style={styles.filterSelect}
                                            value={derivedRoleValueForTop}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                let mapped = ''
                                                if (v === 'Maintenance') mapped = 'maintenance'
                                                else if (v === 'Plant Manager') mapped = 'plant_manager'
                                                else if (v === 'District Manager') mapped = 'district_manager'
                                                else if (v === 'Unassigned') mapped = 'unassigned'
                                                setRoleFilter(mapped)
                                            }}
                                        >
                                            {derivedRoleOptions.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div style={styles.contentArea}>
                    {isLoading ? (
                        <LoadingScreen message="Loading list items..." inline={true} />
                    ) : filteredItems.length === 0 ? (
                        <div style={styles.emptyState}>
                            <div style={styles.emptyIcon}>
                                <i className="fas fa-clipboard-list"></i>
                            </div>
                            <h3 style={styles.emptyTitle}>
                                {statusFilter === 'completed' ? 'No Completed Items Found' : 'No List Items Found'}
                            </h3>
                            <p style={styles.emptyText}>
                                {searchText || selectedPlant
                                    ? 'No items match your search criteria.'
                                    : statusFilter === 'completed'
                                      ? 'There are no completed items to show.'
                                      : 'There are no items in the list yet.'}
                            </p>
                            <button
                                style={styles.addButton}
                                onClick={() => setShowAddSheet(true)}
                                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                            >
                                <i className="fas fa-plus"></i>
                                <span>Add Item</span>
                            </button>
                        </div>
                    ) : (
                        <div style={styles.plannerGroups}>
                            {Object.entries(groupedItems).map(([key, group]) => {
                                if (group.items.length === 0) return null
                                if (statusFilter === 'completed' && key !== 'completed') return null
                                if (statusFilter === 'pending' && key === 'completed') return null
                                if (statusFilter === 'overdue' && key !== 'overdue') return null

                                return (
                                    <div key={key} style={styles.plannerGroup}>
                                        <div style={styles.groupHeader}>
                                            <div style={styles.groupTitle}>
                                                <i className={`fas ${group.icon}`} style={{ color: accentColor }}></i>
                                                <span>{group.label}</span>
                                                <span style={styles.groupCount}>{group.items.length}</span>
                                            </div>
                                        </div>
                                        <div style={styles.groupItems}>
                                            {group.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    style={styles.plannerItem(item.completed, selectedIds.has(item.id))}
                                                    onClick={() => handleSelectItem(item)}
                                                    onMouseEnter={(e) => {
                                                        if (!selectedIds.has(item.id) && !item.completed) {
                                                            e.currentTarget.style.background = '#f8fafc'
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!selectedIds.has(item.id) && !item.completed) {
                                                            e.currentTarget.style.background = 'white'
                                                        }
                                                    }}
                                                >
                                                    <div
                                                        style={styles.itemCheckbox}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            toggleSelect(item.id)
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(item.id)}
                                                            onChange={() => {}}
                                                        />
                                                    </div>
                                                    <div style={styles.itemContent}>
                                                        <div style={styles.itemHeader}>
                                                            <div style={styles.itemMainContent}>
                                                                <h4 style={styles.itemTitle}>
                                                                    {truncateText(item.description, 80)}
                                                                </h4>
                                                                {item.comments && (
                                                                    <p style={styles.itemComments}>
                                                                        {truncateText(item.comments, 60)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span
                                                                style={styles.itemStatus(
                                                                    item.completed
                                                                        ? 'completed'
                                                                        : item.status || 'pending'
                                                                )}
                                                            >
                                                                <i
                                                                    className={`fas ${ListService.getStatusIcon(item.completed ? 'completed' : item.status || 'pending')}`}
                                                                ></i>
                                                                {ListService.getStatusLabel(
                                                                    item.completed
                                                                        ? 'completed'
                                                                        : item.status || 'pending'
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div style={styles.itemMeta}>
                                                            <span style={styles.metaTag('plant')}>
                                                                <i className="fas fa-building"></i>
                                                                {getPlantName(item.plant_code)}
                                                            </span>
                                                            <span
                                                                style={styles.metaTag(
                                                                    (ListService.isOverdue(item) ||
                                                                        item.status === 'overdue') &&
                                                                        !item.completed
                                                                        ? 'overdue'
                                                                        : ''
                                                                )}
                                                            >
                                                                <i className="fas fa-calendar"></i>
                                                                {new Date(item.deadline).toLocaleDateString('en-US', {
                                                                    day: 'numeric',
                                                                    month: 'short'
                                                                })}
                                                            </span>
                                                            {item.responsible_role && (
                                                                <span style={styles.metaTag(item.responsible_role)}>
                                                                    <i
                                                                        className={`fas ${ListService.getResponsibleRoleIcon(item.responsible_role)}`}
                                                                    ></i>
                                                                    {ListService.getResponsibleRoleLabel(
                                                                        item.responsible_role
                                                                    )}
                                                                </span>
                                                            )}
                                                            <span style={styles.metaTag('creator')}>
                                                                <i className="fas fa-user"></i>
                                                                {truncateText(
                                                                    ListService.getCreatorName(item.user_id),
                                                                    15
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div style={styles.itemAction}>
                                                        <i className="fas fa-chevron-right"></i>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {hasBulkPopup && (
                <div style={styles.bulkActionsPopup}>
                    <div style={styles.bulkCount}>{selectedIds.size} selected</div>
                    <div style={styles.bulkActionsContent}>
                        <button
                            style={styles.bulkActionButton('complete')}
                            onClick={() => bulkToggleCompletion(true)}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#bbf7d0')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#dcfce7')}
                        >
                            <i className="fas fa-check"></i>
                            <span>Complete</span>
                        </button>
                        <button
                            style={styles.bulkActionButton('delete')}
                            onClick={bulkDelete}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#fecaca')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#fee2e2')}
                        >
                            <i className="fas fa-trash"></i>
                            <span>Delete</span>
                        </button>
                        <button
                            style={styles.bulkActionButton('cancel')}
                            onClick={() => setSelectedIds(new Set())}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                        >
                            <i className="fas fa-times"></i>
                            <span>Cancel</span>
                        </button>
                    </div>
                </div>
            )}

            {showAddSheet && <ListAddView onClose={() => setShowAddSheet(false)} onItemAdded={fetchAllData} />}
        </div>
    )
}

export default ListView
