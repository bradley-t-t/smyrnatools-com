import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {ListService} from '../../services/ListService'
import LoadingScreen from '../../components/common/LoadingScreen'
import {UserService} from '../../services/UserService'
import {usePreferences} from '../../app/context/PreferencesContext'
import ListAddView from './ListAddView'
import {RegionService} from '../../services/RegionService'
import TopSection from '../../components/sections/TopSection'

function ListView({title = 'Tasks List', onSelectItem, onStatusFilterChange}) {
    const {preferences} = usePreferences()
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

    const baseFilteredItems = ListService.getFilteredItems({
        filterType: '',
        plantCode: selectedPlant,
        searchTerm: searchText,
        showCompleted: statusFilter === 'completed',
        statusFilter
    })

    const filteredItems = regionPlantCodes && regionPlantCodes.size > 0
        ? baseFilteredItems.filter(item => regionPlantCodes.has(String(item.plant_code || '').trim().toUpperCase()))
        : baseFilteredItems

    const roleFilteredItems = roleFilter
        ? filteredItems.filter(item => item.responsible_role === roleFilter)
        : filteredItems

    const groupedByDate = useMemo(() => {
        const groups = {
            today: {label: 'Today', icon: 'fa-calendar-day', items: [], color: 'warning', priority: 1},
            tomorrow: {label: 'Tomorrow', icon: 'fa-calendar-plus', items: [], color: 'info', priority: 2},
            overdue: {label: 'Overdue', icon: 'fa-exclamation-circle', items: [], color: 'danger', priority: 3},
            thisWeek: {label: 'This Week', icon: 'fa-calendar-week', items: [], color: 'accent', priority: 4},
            later: {label: 'Later', icon: 'fa-calendar-alt', items: [], color: 'secondary', priority: 5},
            completed: {label: 'Completed', icon: 'fa-check-circle', items: [], color: 'success', priority: 6}
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const endOfWeek = new Date(today)
        endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()))

        roleFilteredItems.forEach(item => {
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

        Object.values(groups).forEach(group => {
            group.items.sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        })

        return groups
    }, [roleFilteredItems])

    const groupedByStatus = useMemo(() => {
        const groups = {
            overdue: {label: 'Overdue', icon: 'fa-exclamation-circle', items: [], color: 'danger', priority: 1},
            in_progress: {label: 'In Progress', icon: 'fa-spinner', items: [], color: 'accent', priority: 2},
            blocked: {label: 'Blocked', icon: 'fa-ban', items: [], color: 'danger', priority: 3},
            waiting: {label: 'Waiting', icon: 'fa-hourglass-half', items: [], color: 'warning', priority: 4},
            ordered_materials: {
                label: 'Ordered Materials',
                icon: 'fa-truck-loading',
                items: [],
                color: 'info',
                priority: 5
            },
            pending: {label: 'Pending', icon: 'fa-clock', items: [], color: 'secondary', priority: 6},
            completed: {label: 'Completed', icon: 'fa-check-circle', items: [], color: 'success', priority: 7}
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        roleFilteredItems.forEach(item => {
            if (item.completed || item.status === 'completed') {
                groups.completed.items.push(item)
                return
            }

            const deadline = new Date(item.deadline)
            deadline.setHours(0, 0, 0, 0)
            const isOverdue = deadline < today

            if (isOverdue && item.status !== 'in_progress' && item.status !== 'blocked' && item.status !== 'waiting' && item.status !== 'ordered_materials') {
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

        Object.values(groups).forEach(group => {
            group.items.sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        })

        return groups
    }, [roleFilteredItems])

    const groupedByRole = useMemo(() => {
        const groups = {
            district_manager: {
                label: 'District Manager',
                icon: 'fa-user-shield',
                items: [],
                color: 'accent',
                priority: 1
            },
            plant_manager: {label: 'Plant Manager', icon: 'fa-user-tie', items: [], color: 'info', priority: 2},
            maintenance: {label: 'Maintenance', icon: 'fa-wrench', items: [], color: 'warning', priority: 3},
            unassigned: {label: 'Unassigned', icon: 'fa-users', items: [], color: 'secondary', priority: 4}
        }

        roleFilteredItems.filter(item => !item.completed && item.status !== 'completed').forEach(item => {
            const role = item.responsible_role || 'unassigned'
            if (groups[role]) {
                groups[role].items.push(item)
            } else {
                groups.unassigned.items.push(item)
            }
        })

        Object.values(groups).forEach(group => {
            group.items.sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        })

        return groups
    }, [roleFilteredItems])

    const groupedItems = viewMode === 'date' ? groupedByDate : viewMode === 'status' ? groupedByStatus : groupedByRole

    const summaryStats = useMemo(() => {
        const total = roleFilteredItems.length
        const completed = roleFilteredItems.filter(i => i.completed || i.status === 'completed').length
        const overdue = groupedByDate.overdue?.items?.length || 0
        const dueToday = groupedByDate.today?.items?.length || 0
        const inProgress = roleFilteredItems.filter(i => i.status === 'in_progress').length
        const blocked = roleFilteredItems.filter(i => i.status === 'blocked').length
        const pending = total - completed
        return {total, completed, overdue, dueToday, inProgress, blocked, pending}
    }, [roleFilteredItems, groupedByDate])

    const urgentItems = useMemo(() => {
        return [...(groupedByDate.overdue?.items || []), ...(groupedByDate.today?.items || [])].slice(0, 5)
    }, [groupedByDate])

    const recentlyCompleted = useMemo(() => {
        return roleFilteredItems
            .filter(i => i.completed || i.status === 'completed')
            .sort((a, b) => new Date(b.completed_at || b.deadline) - new Date(a.completed_at || a.deadline))
            .slice(0, 3)
    }, [roleFilteredItems])

    const handleScroll = useCallback(() => {
        if (!headerRef.current || !plannerGroupsRef.current) return
        const headerRect = headerRef.current.getBoundingClientRect()
        const clipTop = headerRect.bottom
        const items = plannerGroupsRef.current.querySelectorAll('.planner-group, .planner-item')
        items.forEach(item => {
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
        let cancelled = false

        async function loadRegionPlants() {
            try {
                const codes = await RegionService.getAllowedPlantCodes(preferences?.selectedRegion?.code || '')
                if (cancelled) return
                setRegionPlantCodes(codes)
                const sel = String(selectedPlant || '').trim().toUpperCase()
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
        const sel = String(selectedPlant || '').trim().toUpperCase()
        if (sel && !regionPlantCodes.has(sel)) {
            setSelectedPlant('')
        }
    }, [regionPlantCodes, selectedPlant])

    async function fetchAllData() {
        setIsLoading(true)
        try {
            await Promise.all([
                ListService.fetchListItems(),
                ListService.fetchPlants()
            ])
            setPlants(ListService.plants)
        } finally {
            setIsLoading(false)
        }
    }

    const getPlantName = plantCode => ListService.getPlantName(plantCode)
    const truncateText = (text, maxLength, byWords = false) => ListService.truncateText(text, maxLength, byWords)

    const handleSelectItem = item => {
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
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
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
        const itemsById = new Map(ListService.listItems.map(i => [i.id, i]))
        for (const id of selectedIds) {
            const it = itemsById.get(id)
            if (!it) continue
            const needs = markComplete ? !it.completed : it.completed
            if (!needs) continue
            try {
                await ListService.toggleCompletion(it, userId)
            } catch {
            }
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
            } catch {
            }
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
        if (regionPlantCodes && regionPlantCodes.size > 0) return plants.filter(p => regionPlantCodes.has(String(p.plant_code || '').trim().toUpperCase()))
        return plants
    })()

    const derivedStatusOptions = ['All Statuses', 'Pending', 'In Progress', 'Ordered Materials', 'Blocked', 'Waiting', 'Overdue', 'Completed']

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

    const derivedListHeaderLabels = statusFilter === 'completed'
        ? ['', 'Description', 'Plant', 'Deadline', 'Completed', 'Creator', 'Status']
        : ['', 'Description', 'Plant', 'Deadline', 'Creator', 'Status']

    const derivedColWidths = statusFilter === 'completed'
        ? ['2%', '37%', '14%', '12%', '16%', '11%', '8%']
        : ['2%', '42%', '16%', '14%', '16%', '10%']

    const derivedShowReset = !!(searchText || selectedPlant || statusFilter || roleFilter)

    const hasBulkPopup = selectedIds.size > 0

    const styles = {
        container: {
            width: '100%',
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: '#f8fafc',
            position: 'relative'
        },
        mainContent: {
            display: 'flex',
            minHeight: 'calc(100vh - var(--top-section-height, 120px))',
            position: 'relative'
        },
        sidebar: {
            width: '320px',
            background: 'white',
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            position: 'sticky',
            top: 'var(--top-section-height, 120px)',
            alignSelf: 'flex-start',
            maxHeight: 'calc(100vh - var(--top-section-height, 120px))',
            overflowY: 'auto',
            overflowX: 'hidden',
            flexShrink: 0
        },
        sidebarSection: {
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb'
        },
        sidebarTitle: {
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '1rem'
        },
        viewModeToggle: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        },
        viewModeBtn: (active) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            border: active ? '2px solid #1e3a5f' : '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: active ? '#1e3a5f' : '#64748b',
            background: active ? '#f0f7ff' : 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none',
            textAlign: 'left'
        }),
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem'
        },
        statCard: (color) => {
            const colors = {
                total: { bg: '#eff6ff', text: '#1e3a5f' },
                overdue: { bg: '#fee2e2', text: '#ef4444' },
                today: { bg: '#fef3c7', text: '#f59e0b' },
                progress: { bg: '#dbeafe', text: '#3b82f6' }
            }
            const colorSet = colors[color] || colors.total
            return {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '1rem',
                background: colorSet.bg,
                borderRadius: '8px'
            }
        },
        statValue: (color) => {
            const colors = {
                total: '#1e3a5f',
                overdue: '#ef4444',
                today: '#f59e0b',
                progress: '#3b82f6'
            }
            return {
                fontSize: '1.75rem',
                fontWeight: 700,
                color: colors[color] || colors.total
            }
        },
        statLabel: {
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            textAlign: 'center'
        },
        filtersGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
        },
        filterSelect: {
            width: '100%',
            padding: '0.625rem 1rem',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#1e293b',
            background: 'white',
            cursor: 'pointer',
            outline: 'none',
            transition: 'all 0.2s'
        },
        contentArea: {
            flex: 1,
            padding: '2rem',
            minHeight: '100%'
        },
        plannerGroups: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            maxWidth: '1200px',
            width: '100%'
        },
        plannerGroup: {
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
        },
        groupHeader: {
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #e5e7eb',
            background: '#f8fafc'
        },
        groupTitle: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '1rem',
            fontWeight: 700,
            color: '#1e293b'
        },
        groupCount: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '24px',
            height: '24px',
            padding: '0 0.5rem',
            background: '#1e3a5f',
            color: 'white',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 700
        },
        groupItems: {
            display: 'flex',
            flexDirection: 'column'
        },
        plannerItem: (completed, selected) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #f1f5f9',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: selected ? '#f0f7ff' : completed ? '#f8fafc' : 'white',
            opacity: completed ? 0.7 : 1
        }),
        itemCheckbox: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        itemContent: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        },
        itemHeader: {
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem'
        },
        itemMainContent: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
        },
        itemTitle: {
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: '#1e293b',
            margin: 0
        },
        itemComments: {
            fontSize: '0.8125rem',
            color: '#64748b',
            margin: 0
        },
        itemStatus: (statusType) => {
            const colors = {
                completed: { bg: '#dcfce7', border: '#16a34a', text: '#16a34a' },
                overdue: { bg: '#fee2e2', border: '#ef4444', text: '#ef4444' },
                in_progress: { bg: '#dbeafe', border: '#3b82f6', text: '#3b82f6' },
                pending: { bg: '#fef3c7', border: '#f59e0b', text: '#f59e0b' },
                blocked: { bg: '#fee2e2', border: '#ef4444', text: '#ef4444' },
                waiting: { bg: '#fef3c7', border: '#f59e0b', text: '#f59e0b' },
                ordered_materials: { bg: '#dbeafe', border: '#3b82f6', text: '#3b82f6' }
            }
            const color = colors[statusType] || colors.pending
            return {
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.75rem',
                background: color.bg,
                border: `1px solid ${color.border}`,
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: color.text,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap'
            }
        },
        itemMeta: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap'
        },
        metaTag: (type) => {
            const baseStyle = {
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: '#64748b'
            }
            if (type === 'overdue') {
                return { ...baseStyle, color: '#ef4444', fontWeight: 700 }
            }
            return baseStyle
        },
        itemAction: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            color: '#cbd5e1'
        },
        bulkActionsPopup: {
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.5rem',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb',
            zIndex: 1000
        },
        bulkCount: {
            fontSize: '0.9375rem',
            fontWeight: 700,
            color: '#1e3a5f'
        },
        bulkActionsContent: {
            display: 'flex',
            gap: '0.5rem'
        },
        bulkActionButton: (type) => {
            const colors = {
                complete: { bg: '#dcfce7', hover: '#bbf7d0', text: '#16a34a' },
                delete: { bg: '#fee2e2', hover: '#fecaca', text: '#ef4444' },
                cancel: { bg: '#f1f5f9', hover: '#e2e8f0', text: '#64748b' }
            }
            const color = colors[type] || colors.cancel
            return {
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: color.bg,
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: color.text,
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none'
            }
        },
        emptyState: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '0 auto'
        },
        emptyIcon: {
            fontSize: '4rem',
            color: '#cbd5e1',
            marginBottom: '1.5rem'
        },
        emptyTitle: {
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '0.5rem'
        },
        emptyText: {
            fontSize: '0.9375rem',
            color: '#64748b',
            marginBottom: '1.5rem'
        },
        addButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            background: '#1e3a5f',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
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
                            e.currentTarget.style.background = '#f1f5f9';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (viewMode !== 'date') {
                            e.currentTarget.style.background = 'transparent';
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
                            e.currentTarget.style.background = '#f1f5f9';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (viewMode !== 'status') {
                            e.currentTarget.style.background = 'transparent';
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
                            e.currentTarget.style.background = '#f1f5f9';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (viewMode !== 'role') {
                            e.currentTarget.style.background = 'transparent';
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
                    onChange={e => {
                        const v = e.target.value
                        let mapped = ''
                        if (v === 'Maintenance') mapped = 'maintenance'
                        else if (v === 'Plant Manager') mapped = 'plant_manager'
                        else if (v === 'District Manager') mapped = 'district_manager'
                        else if (v === 'Unassigned') mapped = 'unassigned'
                        setRoleFilter(mapped)
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = '#1e3a5f';
                        e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    {derivedRoleOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
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
                onSearchInputChange={v => {
                    setSearchInput(v);
                    setSearchText(v);
                }}
                onClearSearch={() => {
                    setSearchInput('');
                    setSearchText('');
                }}
                searchPlaceholder="Search by description or comments..."
                plants={derivedVisiblePlants.map(p => ({plantCode: p.plant_code, plantName: p.plant_name}))}
                regionPlantCodes={regionPlantCodes}
                selectedPlant={selectedPlant}
                onSelectedPlantChange={v => {
                    setSelectedPlant(v);
                }}
                showReset={derivedShowReset}
                onReset={() => {
                    setSearchText('');
                    setSearchInput('');
                    setSelectedPlant('');
                    setStatusFilter('');
                    setRoleFilter('');
                }}
                forwardedRef={headerRef}
                sticky={true}
                hideViewModeToggle={true}
            />

            <div style={styles.mainContent}>
                <div style={styles.sidebar}>
                    <div style={styles.sidebarSection}>
                        <div style={styles.sidebarTitle}>View Mode</div>
                        <div style={styles.viewModeToggle}>
                            <button
                                style={styles.viewModeBtn(viewMode === 'date')}
                                onClick={() => setViewMode('date')}
                                onMouseEnter={(e) => {
                                    if (viewMode !== 'date') e.currentTarget.style.background = '#f8fafc';
                                }}
                                onMouseLeave={(e) => {
                                    if (viewMode !== 'date') e.currentTarget.style.background = 'white';
                                }}
                            >
                                <i className="fas fa-calendar-alt"></i>
                                <span>By Date</span>
                            </button>
                            <button
                                style={styles.viewModeBtn(viewMode === 'status')}
                                onClick={() => setViewMode('status')}
                                onMouseEnter={(e) => {
                                    if (viewMode !== 'status') e.currentTarget.style.background = '#f8fafc';
                                }}
                                onMouseLeave={(e) => {
                                    if (viewMode !== 'status') e.currentTarget.style.background = 'white';
                                }}
                            >
                                <i className="fas fa-tasks"></i>
                                <span>By Status</span>
                            </button>
                            <button
                                style={styles.viewModeBtn(viewMode === 'role')}
                                onClick={() => setViewMode('role')}
                                onMouseEnter={(e) => {
                                    if (viewMode !== 'role') e.currentTarget.style.background = '#f8fafc';
                                }}
                                onMouseLeave={(e) => {
                                    if (viewMode !== 'role') e.currentTarget.style.background = 'white';
                                }}
                            >
                                <i className="fas fa-user-tag"></i>
                                <span>By Assigned</span>
                            </button>
                        </div>
                    </div>

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
                        <div style={styles.sidebarTitle}>Filters</div>
                        <div style={styles.filtersGroup}>
                            <select
                                style={styles.filterSelect}
                                value={derivedStatusValueForTop}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    let mapped = '';
                                    if (v === 'Pending') mapped = 'pending';
                                    else if (v === 'Completed') mapped = 'completed';
                                    else if (v === 'Overdue') mapped = 'overdue';
                                    else if (v === 'Ordered Materials') mapped = 'ordered_materials';
                                    else if (v === 'In Progress') mapped = 'in_progress';
                                    else if (v === 'Blocked') mapped = 'blocked';
                                    else if (v === 'Waiting') mapped = 'waiting';
                                    setStatusFilter(mapped);
                                    if (onStatusFilterChange) onStatusFilterChange(mapped);
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#1e3a5f';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.boxShadow = 'none';
                                }}
                            >
                                {derivedStatusOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                            <select
                                style={styles.filterSelect}
                                value={derivedRoleValueForTop}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    let mapped = '';
                                    if (v === 'Maintenance') mapped = 'maintenance';
                                    else if (v === 'Plant Manager') mapped = 'plant_manager';
                                    else if (v === 'District Manager') mapped = 'district_manager';
                                    else if (v === 'Unassigned') mapped = 'unassigned';
                                    setRoleFilter(mapped);
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#1e3a5f';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.boxShadow = 'none';
                                }}
                            >
                                {derivedRoleOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div style={styles.contentArea}>
                    {isLoading ? (
                        <LoadingScreen message="Loading list items..." inline={true}/>
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
                                onMouseEnter={(e) => e.currentTarget.style.background = '#162d4a'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#1e3a5f'}
                            >
                                <i className="fas fa-plus"></i>
                                <span>Add Item</span>
                            </button>
                        </div>
                    ) : (
                        <div style={styles.plannerGroups}>
                            {Object.entries(groupedItems).map(([key, group]) => {
                                if (group.items.length === 0) return null;
                                if (statusFilter === 'completed' && key !== 'completed') return null;
                                if (statusFilter === 'pending' && key === 'completed') return null;
                                if (statusFilter === 'overdue' && key !== 'overdue') return null;

                                return (
                                    <div key={key} style={styles.plannerGroup}>
                                        <div style={styles.groupHeader}>
                                            <div style={styles.groupTitle}>
                                                <i className={`fas ${group.icon}`} style={{color: '#1e3a5f'}}></i>
                                                <span>{group.label}</span>
                                                <span style={styles.groupCount}>{group.items.length}</span>
                                            </div>
                                        </div>
                                        <div style={styles.groupItems}>
                                            {group.items.map(item => (
                                                <div
                                                    key={item.id}
                                                    style={styles.plannerItem(item.completed, selectedIds.has(item.id))}
                                                    onClick={() => handleSelectItem(item)}
                                                    onMouseEnter={(e) => {
                                                        if (!selectedIds.has(item.id) && !item.completed) {
                                                            e.currentTarget.style.background = '#f8fafc';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!selectedIds.has(item.id) && !item.completed) {
                                                            e.currentTarget.style.background = 'white';
                                                        }
                                                    }}
                                                >
                                                    <div style={styles.itemCheckbox} onClick={e => {
                                                        e.stopPropagation();
                                                        toggleSelect(item.id);
                                                    }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(item.id)}
                                                            onChange={() => {}}
                                                        />
                                                    </div>
                                                    <div style={styles.itemContent}>
                                                        <div style={styles.itemHeader}>
                                                            <div style={styles.itemMainContent}>
                                                                <h4 style={styles.itemTitle}>{truncateText(item.description, 80)}</h4>
                                                                {item.comments && (
                                                                    <p style={styles.itemComments}>{truncateText(item.comments, 60)}</p>
                                                                )}
                                                            </div>
                                                            <span style={styles.itemStatus(item.completed ? 'completed' : item.status || 'pending')}>
                                                                <i className={`fas ${ListService.getStatusIcon(item.completed ? 'completed' : item.status || 'pending')}`}></i>
                                                                {ListService.getStatusLabel(item.completed ? 'completed' : item.status || 'pending')}
                                                            </span>
                                                        </div>
                                                        <div style={styles.itemMeta}>
                                                            <span style={styles.metaTag('plant')}>
                                                                <i className="fas fa-building"></i>
                                                                {getPlantName(item.plant_code)}
                                                            </span>
                                                            <span style={styles.metaTag((ListService.isOverdue(item) || item.status === 'overdue') && !item.completed ? 'overdue' : '')}>
                                                                <i className="fas fa-calendar"></i>
                                                                {new Date(item.deadline).toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </span>
                                                            {item.responsible_role && (
                                                                <span style={styles.metaTag(item.responsible_role)}>
                                                                    <i className={`fas ${ListService.getResponsibleRoleIcon(item.responsible_role)}`}></i>
                                                                    {ListService.getResponsibleRoleLabel(item.responsible_role)}
                                                                </span>
                                                            )}
                                                            <span style={styles.metaTag('creator')}>
                                                                <i className="fas fa-user"></i>
                                                                {truncateText(ListService.getCreatorName(item.user_id), 15)}
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
                                );
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
                            onMouseEnter={(e) => e.currentTarget.style.background = '#bbf7d0'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#dcfce7'}
                        >
                            <i className="fas fa-check"></i>
                            <span>Complete</span>
                        </button>
                        <button
                            style={styles.bulkActionButton('delete')}
                            onClick={bulkDelete}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'}
                        >
                            <i className="fas fa-trash"></i>
                            <span>Delete</span>
                        </button>
                        <button
                            style={styles.bulkActionButton('cancel')}
                            onClick={() => setSelectedIds(new Set())}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        >
                            <i className="fas fa-times"></i>
                            <span>Cancel</span>
                        </button>
                    </div>
                </div>
            )}

            {showAddSheet && (
                <ListAddView
                    onClose={() => setShowAddSheet(false)}
                    onItemAdded={fetchAllData}
                />
            )}
        </div>
    )
}

export default ListView