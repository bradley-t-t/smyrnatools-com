import React, {useEffect, useRef, useState} from 'react'
import './styles/List.css'
import '../../../styles/FilterStyles.css'
import {ListService} from '../../../services/ListService'
import LoadingScreen from '../../common/LoadingScreen'
import {UserService} from '../../../services/UserService'
import {usePreferences} from '../../../app/context/PreferencesContext'
import ListAddView from './ListAddView'
import ListDetailView from './ListDetailView'
import {RegionService} from '../../../services/RegionService'
import TopSection from '../../sections/TopSection'
import ListViewModeSection from '../../sections/ListViewModeSection'

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
    const [showDetailView, setShowDetailView] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [sortKey, setSortKey] = useState('')
    const [sortDirection, setSortDirection] = useState('asc')
    const sortMappings = {
        'Plant': 'plant_code',
        'Truck #': 'truck_number',
        'Status': 'status',
        'Operator': 'operator_name',
        'Cleanliness': 'cleanliness_rating',
        'VIN': 'vin',
        'Verified': 'verified',
        'More': null
    }

    const labelToSortKey = {
        'Description': 'description',
        'Plant': 'plant',
        'Deadline': 'deadline',
        'Completed': 'completed_at',
        'Creator': 'creator',
        'Status': 'status'
    }


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

    const sortedItems = (() => {
        if (!sortKey) return filteredItems
        const items = [...filteredItems]
        const dir = sortDirection === 'desc' ? -1 : 1
        const key = labelToSortKey[sortKey]
        if (key === 'description') items.sort((a, b) => ((a.description || '').localeCompare(b.description || '')) * dir)
        else if (key === 'plant') items.sort((a, b) => ((String(a.plant_code || '')).localeCompare(String(b.plant_code || ''))) * dir)
        else if (key === 'deadline') items.sort((a, b) => ((new Date(a.deadline).getTime() || 0) - (new Date(b.deadline).getTime() || 0)) * dir)
        else if (key === 'completed_at') items.sort((a, b) => ((new Date(a.completed_at).getTime() || 0) - (new Date(b.completed_at).getTime() || 0)) * dir)
        else if (key === 'creator') items.sort((a, b) => (ListService.getCreatorName(a.user_id).localeCompare(ListService.getCreatorName(b.user_id))) * dir)
        else if (key === 'status') items.sort((a, b) => ((a.completed === b.completed) ? 0 : a.completed ? 1 : -1) * dir)
        return items
    })()

    const getPlantName = plantCode => ListService.getPlantName(plantCode)
    const truncateText = (text, maxLength, byWords = false) => ListService.truncateText(text, maxLength, byWords)

    const handleSelectItem = item => {
        setSelectedItem(item)
        onSelectItem ? onSelectItem(item.id) : setShowDetailView(true)
    }

    function toggleSelect(id) {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    function handleHeaderClick(label) {
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
        <div
            className={`global-dashboard-container dashboard-container global-flush-top flush-top list-view${showDetailView && selectedItem ? ' detail-open' : ''}${hasBulkPopup ? ' has-bulk-popup' : ''}`}>
            {showDetailView && selectedItem ? (
                <ListDetailView itemId={selectedItem?.id} onClose={() => setShowDetailView(false)}/>
            ) : (
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
                        ) : sortedItems.length === 0 ? (
                            <div className="global-no-results-container no-results-container">
                                <div className="no-results-icon"><i className="fas fa-clipboard-list"></i></div>
                                <h3>{statusFilter === 'completed' ? 'No Completed Items Found' : 'No List Items Found'}</h3>
                                <p>{searchText || selectedPlant ? 'No items match your search criteria.' : statusFilter === 'completed' ? 'There are no completed items to show.' : 'There are no items in the list yet.'}</p>
                                <button className="global-primary-button primary-button"
                                        onClick={() => setShowAddSheet(true)}>Add Item
                                </button>
                            </div>
                        ) : (
                            <ListViewModeSection
                                filteredItems={sortedItems}
                                handleSelectItem={handleSelectItem}
                                headerLabels={derivedListHeaderLabels}
                                colWidths={derivedColWidths}
                                renderRow={(item, handleSelect) => (
                                    <tr key={item.id}
                                        className={`${item.completed ? 'completed' : ''} ${selectedIds.has(item.id) ? 'is-selected' : ''}`}
                                        onClick={() => handleSelect(item)} style={{cursor: 'pointer'}}>
                                        <td style={{width: derivedColWidths[0]}} onClick={e => e.stopPropagation()}>
                                            <input type="checkbox" checked={selectedIds.has(item.id)}
                                                   onChange={() => toggleSelect(item.id)} aria-label="Select row"/></td>
                                        <td style={{width: derivedColWidths[1], textAlign: 'left'}}
                                            title={item.description}>{truncateText(item.description, 60)}</td>
                                        <td style={{width: derivedColWidths[2]}}
                                            title={getPlantName(item.plant_code)}>{truncateText(getPlantName(item.plant_code), 20)}</td>
                                        <td style={{width: derivedColWidths[3]}}><span
                                            className={ListService.isOverdue(item) && !item.completed ? 'deadline-overdue' : ''}>{new Date(item.deadline).toLocaleDateString()}</span>
                                        </td>
                                        {statusFilter === 'completed' &&
                                            <td style={{width: derivedColWidths[4]}}>{item.completed_at ? new Date(item.completed_at).toLocaleDateString() : 'N/A'}</td>}
                                        <td style={{width: derivedColWidths[statusFilter === 'completed' ? 5 : 4]}}
                                            title={ListService.getCreatorName(item.user_id)}>{truncateText(ListService.getCreatorName(item.user_id), 20)}</td>
                                        <td style={{width: derivedColWidths[statusFilter === 'completed' ? 6 : 5]}}>{item.completed ?
                                            <span
                                                className="list-status-badge completed">COMPLETED</span> : ListService.isOverdue(item) ?
                                                <span className="list-status-badge overdue">OVERDUE</span> :
                                                <span className="list-status-badge pending">PENDING</span>}</td>
                                    </tr>
                                )}
                                containerClassName="list-table-container"
                                tableClassName="list-table"
                            />
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
                                    Mark as Completed
                                </button>
                                <button
                                    className="bulk-action-button delete"
                                    onClick={bulkDelete}
                                >
                                    <i className="fas fa-trash"></i>
                                    Delete
                                </button>
                                <button
                                    className="bulk-action-button cancel"
                                    onClick={() => setSelectedIds(new Set())}
                                >
                                    <i className="fas fa-times"></i>
                                    Cancel
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
            )}
        </div>
    )
}

export default ListView
