import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import './styles/List.css'
import '../../styles/FilterStyles.css'
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
            ordered_materials: {label: 'Ordered Materials', icon: 'fa-truck-loading', items: [], color: 'info', priority: 5},
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
            district_manager: {label: 'District Manager', icon: 'fa-user-shield', items: [], color: 'accent', priority: 1},
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
        return { total, completed, overdue, dueToday, inProgress, blocked, pending }
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

    const listViewFilterBar = (
        <div ref={toolbarRef} className="list-view-filter-bar">
            <div className="view-mode-toggle">
                <button 
                    className={`view-mode-btn ${viewMode === 'date' ? 'active' : ''}`}
                    onClick={() => setViewMode('date')}
                >
                    <i className="fas fa-calendar-alt"></i>
                    <span>By Date</span>
                </button>
                <button 
                    className={`view-mode-btn ${viewMode === 'status' ? 'active' : ''}`}
                    onClick={() => setViewMode('status')}
                >
                    <i className="fas fa-tasks"></i>
                    <span>By Status</span>
                </button>
                <button 
                    className={`view-mode-btn ${viewMode === 'role' ? 'active' : ''}`}
                    onClick={() => setViewMode('role')}
                >
                    <i className="fas fa-user-tag"></i>
                    <span>By Assigned</span>
                </button>
            </div>
            <div className="planner-filters">
                <select 
                    className="role-filter-select"
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
                >
                    {derivedRoleOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
        </div>
    )

    return (
        <>
            <div
                className={`global-dashboard-container dashboard-container global-flush-top flush-top list-view${hasBulkPopup ? ' has-bulk-popup' : ''}`}>
                <>
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
                        statusFilter={derivedStatusValueForTop}
                        statusOptions={derivedStatusOptions}
                        onStatusFilterChange={v => {
                            let mapped = ''
                            if (v === 'Pending') mapped = 'pending'
                            else if (v === 'Completed') mapped = 'completed'
                            else if (v === 'Overdue') mapped = 'overdue'
                            else if (v === 'Ordered Materials') mapped = 'ordered_materials'
                            else if (v === 'In Progress') mapped = 'in_progress'
                            else if (v === 'Blocked') mapped = 'blocked'
                            else if (v === 'Waiting') mapped = 'waiting'
                            setStatusFilter(mapped);
                            if (onStatusFilterChange) onStatusFilterChange(mapped)
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
                        viewMode="list"
                        hideViewModeToggle={true}
                        listLabels={derivedListHeaderLabels}
                        colWidths={derivedColWidths}
                        onHeaderClick={handleHeaderClick}
                        sortKey={sortKey}
                        sortDirection={sortDirection}
                        customBottomContent={listViewFilterBar}
                    />
                    <div className="global-content-container content-container">
                        {isLoading ? (
                            <div className="global-loading-container loading-container"><LoadingScreen
                                message="Loading list items..." inline={true}/></div>
                        ) : filteredItems.length === 0 ? (
                            <div className="global-no-results-container no-results-container">
                                <div className="no-results-icon"><i className="fas fa-clipboard-list"></i></div>
                                <h3>{statusFilter === 'completed' ? 'No Completed Items Found' : 'No List Items Found'}</h3>
                                <p>{searchText || selectedPlant ? 'No items match your search criteria.' : statusFilter === 'completed' ? 'There are no completed items to show.' : 'There are no items in the list yet.'}</p>
                                <button className="global-primary-button primary-button"
                                        onClick={() => setShowAddSheet(true)}>Add Item
                                </button>
                            </div>
                        ) : (
                            <div className="list-planner-dashboard">
                                <div className="planner-sidebar planner-sidebar-sticky">
                                    <div className="summary-card">
                                        <h3 className="summary-title">Overview</h3>
                                        <div className="summary-stats">
                                            <div className="stat-item">
                                                <span className="stat-value">{summaryStats.total}</span>
                                                <span className="stat-label">Total</span>
                                            </div>
                                            <div className="stat-item danger">
                                                <span className="stat-value">{summaryStats.overdue}</span>
                                                <span className="stat-label">Overdue</span>
                                            </div>
                                            <div className="stat-item warning">
                                                <span className="stat-value">{summaryStats.dueToday}</span>
                                                <span className="stat-label">Due Today</span>
                                            </div>
                                            <div className="stat-item accent">
                                                <span className="stat-value">{summaryStats.inProgress}</span>
                                                <span className="stat-label">In Progress</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {urgentItems.length > 0 && (
                                        <div className="urgent-card">
                                            <h3 className="urgent-title">
                                                <i className="fas fa-fire"></i>
                                                Needs Attention
                                            </h3>
                                            <div className="urgent-items">
                                                {urgentItems.map(item => (
                                                    <div 
                                                        key={item.id} 
                                                        className={`urgent-item ${groupedByDate.overdue?.items?.includes(item) ? 'overdue' : 'today'}`}
                                                        onClick={() => handleSelectItem(item)}
                                                    >
                                                        <div className="urgent-item-content">
                                                            <span className="urgent-item-title">{truncateText(item.description, 40)}</span>
                                                            <span className="urgent-item-meta">
                                                                <i className="fas fa-building"></i>
                                                                {getPlantName(item.plant_code)}
                                                            </span>
                                                        </div>
                                                        <span className={`urgent-badge ${groupedByDate.overdue?.items?.includes(item) ? 'overdue' : 'today'}`}>
                                                            {groupedByDate.overdue?.items?.includes(item) ? 'Overdue' : 'Today'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {recentlyCompleted.length > 0 && (
                                        <div className="completed-card">
                                            <h3 className="completed-title">
                                                <i className="fas fa-check-circle"></i>
                                                Recently Completed
                                            </h3>
                                            <div className="completed-items">
                                                {recentlyCompleted.map(item => (
                                                    <div 
                                                        key={item.id} 
                                                        className="completed-item"
                                                        onClick={() => handleSelectItem(item)}
                                                    >
                                                        <span className="completed-item-title">{truncateText(item.description, 35)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="planner-main">
                                    <div className="planner-sticky-cover"></div>
                                    <div ref={plannerGroupsRef} className="planner-groups">
                                    {Object.entries(groupedItems).map(([key, group]) => {
                                        if (group.items.length === 0) return null
                                        if (statusFilter === 'completed' && key !== 'completed') return null
                                        if (statusFilter === 'pending' && key === 'completed') return null
                                        if (statusFilter === 'overdue' && key !== 'overdue') return null

                                        return (
                                            <div key={key} className={`planner-group ${key} ${group.color}`}>
                                                <div className="planner-group-header">
                                                    <div className="group-title">
                                                        <i className={`fas ${group.icon}`}></i>
                                                        <span>{group.label}</span>
                                                        <span className="group-count">{group.items.length}</span>
                                                    </div>
                                                </div>
                                                <div className="planner-group-items">
                                                    {group.items.map(item => (
                                                        <div
                                                            key={item.id}
                                                            className={`planner-item ${item.completed ? 'completed' : ''} ${selectedIds.has(item.id) ? 'selected' : ''}`}
                                                            onClick={() => handleSelectItem(item)}
                                                        >
                                                            <div className="item-checkbox" onClick={e => {
                                                                e.stopPropagation();
                                                                toggleSelect(item.id);
                                                            }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedIds.has(item.id)}
                                                                    onChange={() => {
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="item-content">
                                                                <div className="item-header">
                                                                    <div className="item-main-content">
                                                                        <h4 className="item-title">{truncateText(item.description, 80)}</h4>
                                                                        {item.comments && (
                                                                            <p className="item-comments">{truncateText(item.comments, 60)}</p>
                                                                        )}
                                                                    </div>
                                                                    <span
                                                                        className={`item-status ${ListService.getStatusColor(item.completed ? 'completed' : item.status || 'pending')}`}>
                                                                        <i className={`fas ${ListService.getStatusIcon(item.completed ? 'completed' : item.status || 'pending')}`}></i>
                                                                        {ListService.getStatusLabel(item.completed ? 'completed' : item.status || 'pending')}
                                                                    </span>
                                                                </div>
                                                                <div className="item-meta">
                                                                    <span className="meta-tag plant">
                                                                        <i className="fas fa-building"></i>
                                                                        {getPlantName(item.plant_code)}
                                                                    </span>
                                                                    <span
                                                                        className={`meta-tag deadline ${(ListService.isOverdue(item) || item.status === 'overdue') && !item.completed ? 'overdue' : ''}`}>
                                                                        <i className="fas fa-calendar"></i>
                                                                        {new Date(item.deadline).toLocaleDateString('en-US', {
                                                                            month: 'short',
                                                                            day: 'numeric'
                                                                        })}
                                                                    </span>
                                                                    {item.responsible_role && (
                                                                        <span className={`meta-tag responsible ${item.responsible_role}`}>
                                                                            <i className={`fas ${ListService.getResponsibleRoleIcon(item.responsible_role)}`}></i>
                                                                            {ListService.getResponsibleRoleLabel(item.responsible_role)}
                                                                        </span>
                                                                    )}
                                                                    <span className="meta-tag creator">
                                                                        <i className="fas fa-user"></i>
                                                                        {truncateText(ListService.getCreatorName(item.user_id), 15)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="item-action">
                                                                <i className="fas fa-chevron-right"></i>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {hasBulkPopup && (
                        <div className="bulk-actions-popup">
                            <div className="bulk-count">{selectedIds.size} selected</div>
                            <div className="bulk-actions-content">
                                <button
                                    className="bulk-action-button complete"
                                    onClick={() => bulkToggleCompletion(true)}
                                >
                                    <i className="fas fa-check"></i>
                                    <span>Complete</span>
                                </button>
                                <button
                                    className="bulk-action-button delete"
                                    onClick={bulkDelete}
                                >
                                    <i className="fas fa-trash"></i>
                                    <span>Delete</span>
                                </button>
                                <button
                                    className="bulk-action-button cancel"
                                    onClick={() => setSelectedIds(new Set())}
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
                </>
            </div>
        </>
    )
}

export default ListView
