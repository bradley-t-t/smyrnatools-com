import React, {useEffect, useMemo, useRef, useState} from 'react'
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

    const groupedItems = useMemo(() => {
        const groups = {
            today: {label: 'Today', icon: 'fa-calendar-day', items: [], color: 'warning'},
            overdue: {label: 'Overdue', icon: 'fa-exclamation-circle', items: [], color: 'danger'},
            tomorrow: {label: 'Tomorrow', icon: 'fa-calendar-plus', items: [], color: 'info'},
            thisWeek: {label: 'This Week', icon: 'fa-calendar-week', items: [], color: 'accent'},
            later: {label: 'Later', icon: 'fa-calendar-alt', items: [], color: 'secondary'},
            completed: {label: 'Completed', icon: 'fa-check-circle', items: [], color: 'success'}
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const endOfWeek = new Date(today)
        endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()))

        filteredItems.forEach(item => {
            if (item.completed) {
                groups.completed.items.push(item)
                return
            }

            const deadline = new Date(item.deadline)
            deadline.setHours(0, 0, 0, 0)

            if (deadline < today) {
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
    }, [filteredItems])

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

    const derivedStatusOptions = ['All Statuses', 'Pending', 'Completed', 'Overdue']

    const derivedStatusValueForTop = (() => {
        if (!statusFilter) return 'All Statuses'
        const v = String(statusFilter).toLowerCase()
        if (v === 'completed') return 'Completed'
        if (v === 'overdue') return 'Overdue'
        if (v === 'pending') return 'Pending'
        return 'All Statuses'
    })()

    const derivedListHeaderLabels = statusFilter === 'completed'
        ? ['', 'Description', 'Plant', 'Deadline', 'Completed', 'Creator', 'Status']
        : ['', 'Description', 'Plant', 'Deadline', 'Creator', 'Status']

    const derivedColWidths = statusFilter === 'completed'
        ? ['2%', '37%', '14%', '12%', '16%', '11%', '8%']
        : ['2%', '42%', '16%', '14%', '16%', '10%']

    const derivedShowReset = !!(searchText || selectedPlant || statusFilter)

    const hasBulkPopup = selectedIds.size > 0

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
                            const mapped = v === 'All Status' ? '' : v.toLowerCase();
                            setStatusFilter(mapped);
                            if (onStatusFilterChange) onStatusFilterChange(mapped)
                        }}
                        showReset={derivedShowReset}
                        onReset={() => {
                            setSearchText('');
                            setSearchInput('');
                            setSelectedPlant('');
                            setStatusFilter('');
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
                            <div className="list-planner-view">
                                <div className="planner-groups">
                                    {Object.entries(groupedItems).map(([key, group]) => {
                                        if (group.items.length === 0) return null
                                        if (statusFilter === 'completed' && key !== 'completed') return null
                                        if (statusFilter === 'pending' && key === 'completed') return null
                                        if (statusFilter === 'overdue' && key !== 'overdue') return null

                                        return (
                                            <div key={key} className={`planner-group ${key}`}>
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
                                                                    <h4 className="item-title">{truncateText(item.description, 80)}</h4>
                                                                    <span
                                                                        className={`item-status ${item.completed ? 'completed' : ListService.isOverdue(item) ? 'overdue' : 'pending'}`}>
                                                                        {item.completed ? 'Completed' : ListService.isOverdue(item) ? 'Overdue' : 'Pending'}
                                                                    </span>
                                                                </div>
                                                                <div className="item-meta">
                                                                    <span className="meta-tag plant">
                                                                        <i className="fas fa-building"></i>
                                                                        {getPlantName(item.plant_code)}
                                                                    </span>
                                                                    <span
                                                                        className={`meta-tag deadline ${ListService.isOverdue(item) && !item.completed ? 'overdue' : ''}`}>
                                                                        <i className="fas fa-calendar"></i>
                                                                        {new Date(item.deadline).toLocaleDateString('en-US', {
                                                                            month: 'short',
                                                                            day: 'numeric'
                                                                        })}
                                                                    </span>
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
