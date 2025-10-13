import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import '../../../styles/FilterStyles.css'
import './styles/PickupTrucks.css'
import LoadingScreen from '../../common/LoadingScreen'
import PickupTrucksCard from './PickupTrucksCard'
import PickupTrucksDetailView from './PickupTrucksDetailView'
import PickupTrucksAddView from './PickupTrucksAddView'
import {PickupTruckService} from '../../../services/PickupTruckService'
import AsyncUtility from '../../../utils/AsyncUtility'
import {PlantService} from '../../../services/PlantService'
import FleetUtility from '../../../utils/FleetUtility'
import {usePreferences} from '../../../app/context/PreferencesContext'
import {RegionService} from '../../../services/RegionService'
import TopSection from '../../sections/TopSection'
import GridViewModeSection from '../../sections/GridViewModeSection'
import ListViewModeSection from '../../sections/ListViewModeSection'

function PickupTrucksView({title = 'Pickup Trucks'}) {
    const {preferences} = usePreferences()
    const headerRef = useRef(null)
    const [pickups, setPickups] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [viewMode, setViewMode] = useState(localStorage.getItem('pickup_trucks_last_view_mode') || 'grid')
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [selectedId, setSelectedId] = useState(null)
    const [plants, setPlants] = useState([])
    const [selectedPlant, setSelectedPlant] = useState('')
    const [statusFilter, setStatusFilter] = useState('All Statuses')
    const [regionPlantCodes, setRegionPlantCodes] = useState(new Set())
    const [sortKey, setSortKey] = useState('')
    const [sortDirection, setSortDirection] = useState('asc')
    const statusOptions = ['All Statuses', 'Active', 'Stationary', 'Spare', 'In Shop', 'Retired', 'Sold', 'Over 300k Miles']
    const sortMappings = {
        'Plant': 'assignedPlant',
        'Status': 'status',
        'Assigned': 'assigned',
        'Year': 'year',
        'Make & Model': null,
        'VIN': 'vin',
        'Mileage': 'mileage'
    }

    const fetchAllPickups = useCallback(async () => {
        setIsLoading(true)
        try {
            const codes = await RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code)
            setRegionPlantCodes(codes)
            const data = await PickupTruckService.fetchAll(codes)
            setPickups(Array.isArray(data) ? data : [])
        } catch {
            setPickups([])
        } finally {
            setIsLoading(false)
        }
    }, [preferences.selectedRegion?.code])

    useEffect(() => {
        fetchAllPickups()
    }, [fetchAllPickups])

    useEffect(() => {
        async function loadPlants() {
            try {
                const data = await PlantService.fetchPlants(regionPlantCodes)
                setPlants(Array.isArray(data) ? data : [])
            } catch {
                setPlants([])
            }
        }

        loadPlants()
    }, [regionPlantCodes])

    useEffect(() => {
        let cancelled = false

        async function loadAllowedPlants() {
            try {
                const codes = await RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code)
                if (cancelled) return
                setRegionPlantCodes(codes)
                const sel = String(selectedPlant || '').trim().toUpperCase()
                if (sel && codes && !codes.has(sel)) setSelectedPlant('')
            } catch {
                if (!cancelled) setRegionPlantCodes(new Set())
            }
        }

        loadAllowedPlants()
        return () => {
            cancelled = true
        }
    }, [preferences.selectedRegion?.code, selectedPlant])

    function handleViewModeChange(mode) {
        if (viewMode === mode) {
            setViewMode(null)
            localStorage.removeItem('pickup_trucks_last_view_mode')
        } else {
            setViewMode(mode)
            localStorage.setItem('pickup_trucks_last_view_mode', mode)
        }
    }

    function handleHeaderClick(label) {
        if (sortKey === label) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(label)
            setSortDirection('asc')
        }
    }

    useEffect(() => {
        function updateStickyCoverHeight() {
            const el = headerRef.current
            const h = el ? Math.ceil(el.getBoundingClientRect().height) : 0
            const root = document.querySelector('.global-dashboard-container.pickup-trucks-view')
            if (root && h) root.style.setProperty('--sticky-cover-height', h + 'px')
        }

        updateStickyCoverHeight()
        window.addEventListener('resize', updateStickyCoverHeight)
        return () => window.removeEventListener('resize', updateStickyCoverHeight)
    }, [viewMode, searchText, selectedPlant, statusFilter])

    const debouncedSetSearchText = useCallback(AsyncUtility.debounce((value) => {
        setSearchText(value)
    }, 300), [])

    const filtered = useMemo(() => {
        const q = searchText.trim().toLowerCase()
        const list = pickups.filter(p => {
            const vin = String(p.vin || '').toLowerCase()
            const make = String(p.make || '').toLowerCase()
            const model = String(p.model || '').toLowerCase()
            const yearVal = String(p.year || '').toLowerCase()
            const assignedVal = String(p.assigned || '').toLowerCase()
            const matchesSearch = !q || vin.includes(q) || make.includes(q) || model.includes(q) || yearVal.includes(q) || assignedVal.includes(q)
            const matchesPlant = !selectedPlant || String(p.assignedPlant || '').trim().toUpperCase() === selectedPlant.toUpperCase()
            const matchesStatus = !statusFilter || statusFilter === 'All Statuses' || (statusFilter === 'Over 300k Miles' ? (typeof p.mileage === 'number' && p.mileage > 300000) : String(p.status || '').trim() === statusFilter)
            const inRegion = regionPlantCodes.size === 0 || regionPlantCodes.has(String(p.assignedPlant || '').trim().toUpperCase())
            return matchesSearch && matchesPlant && matchesStatus && inRegion
        })
        return list.sort((a, b) => {
            if (!sortKey) {
                return FleetUtility.compareByStatusThenNumber(a, b, 'status', 'assigned')
            }
            const prop = sortMappings[sortKey]
            if (!prop) return 0;
            let aVal, bVal;
            if (sortKey === 'Assigned') {
                aVal = parseFloat(a.assigned) || 0
                bVal = parseFloat(b.assigned) || 0
            } else {
                aVal = a[prop]
                bVal = b[prop]
            }
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
            } else {
                aVal = String(aVal || '').toLowerCase()
                bVal = String(bVal || '').toLowerCase()
                if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
                if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
                return 0
            }
        })
    }, [pickups, searchText, selectedPlant, statusFilter, regionPlantCodes, sortKey, sortDirection])

    const duplicateVINs = useMemo(() => {
        return PickupTruckService.getDuplicateVINs(pickups)
    }, [pickups])

    const duplicateAssigned = useMemo(() => {
        return PickupTruckService.getDuplicateAssigned(pickups)
    }, [pickups])

    const content = useMemo(() => {
        if (isLoading) return <div className="global-loading-container loading-container"><LoadingScreen
            message="Loading pickup trucks..." inline={true}/></div>
        if (filtered.length === 0) return (
            <div className="global-no-results-container no-results-container">
                <div className="no-results-icon"><i className="fas fa-truck-pickup"></i></div>
                <h3>No Pickup Trucks Found</h3>
                <p>{searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses') ? 'No pickups match your search criteria.' : 'There are no pickup trucks in the system yet.'}</p>
                <button className="global-primary-button primary-button" onClick={() => setShowAddSheet(true)}>Add
                    Pickup Truck
                </button>
            </div>
        )
        if (viewMode === 'grid') return (
            <GridViewModeSection
                filteredItems={filtered}
                getCardProps={(pickup) => {
                    const vinKey = String(pickup.vin || '').trim().toUpperCase().replace(/\s+/g, '')
                    const assignedKey = String(pickup.assigned || '').trim().toLowerCase()
                    const isHighMileage = typeof pickup.mileage === 'number' && pickup.mileage > 300000
                    return {
                        isDuplicateVin: duplicateVINs.has(vinKey),
                        isDuplicateAssigned: duplicateAssigned.has(assignedKey),
                        isHighMileage
                    }
                }}
                handleSelectItem={(id) => setSelectedId(id)}
                cardComponent={PickupTrucksCard}
                itemPropName="pickup"
                gridClassName="grid"
            />
        )
        return (
            <ListViewModeSection
                filteredItems={filtered}
                handleSelectItem={(id) => setSelectedId(id)}
                headerLabels={['Plant', 'Status', 'Assigned', 'Year', 'Make & Model', 'VIN', 'Mileage']}
                colWidths={['15%', '15%', '15%', '10%', '20%', '15%', '10%']}
                renderRow={(item, handleSelect) => {
                    const statusClass = String(item.status || '').toLowerCase().replace(/\s+/g, '-')
                    const vinKey = String(item.vin || '').trim().toUpperCase().replace(/\s+/g, '')
                    const assignedKey = String(item.assigned || '').trim().toLowerCase()
                    return (
                        <tr key={item.id} onClick={() => handleSelect(item.id)} style={{cursor: 'pointer'}}>
                            <td style={{width: '15%'}}>{item.assignedPlant || '---'}</td>
                            <td style={{width: '15%'}}><span
                                className={`item-status-dot ${statusClass}`}></span>{item.status || '---'}</td>
                            <td style={{width: '15%'}}>{item.assigned ? <span
                                className="cell-inline"><span>{item.assigned}</span>{duplicateAssigned.has(assignedKey) &&
                                <span className="warning-badge" title="Assigned to multiple pickups"><i
                                    className="fas fa-exclamation-triangle"></i></span>}</span> : '---'}</td>
                            <td style={{width: '10%'}}>{item.year || '---'}</td>
                            <td style={{width: '20%'}}>{`${item.make || ''} ${item.model || ''}`.trim() || '---'}</td>
                            <td style={{width: '15%'}}>{item.vin ?
                                <span className="cell-inline"><span>{item.vin}</span>{duplicateVINs.has(vinKey) &&
                                    <span className="warning-badge" title="Duplicate VIN"><i
                                        className="fas fa-exclamation-triangle"></i></span>}</span> : '---'}</td>
                            <td style={{width: '10%'}}>{typeof item.mileage === 'number' ? <span
                                className="mileage-cell"><span>{item.mileage.toLocaleString()}</span>{item.mileage > 300000 &&
                                <span className="warning-badge" title="High mileage"><i
                                    className="fas fa-exclamation-triangle"></i></span>}</span> : '---'}</td>
                        </tr>
                    )
                }}
                containerClassName="list-table-container"
                tableClassName="list-table"
            />
        )
    }, [isLoading, filtered, viewMode, searchText, selectedPlant, statusFilter, duplicateVINs, duplicateAssigned])

    const showReset = (searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses'))

    function handleDetailSaved(updated) {
        if (updated && updated.id) {
            setPickups(prev => {
                const arr = prev.slice()
                const idx = arr.findIndex(p => p.id === updated.id)
                if (idx >= 0) arr[idx] = {...arr[idx], ...updated}
                else arr.unshift(updated)
                return arr
            })
        }
        setSelectedId(null)
        fetchAllPickups()
    }

    return (
        <div
            className={`global-dashboard-container dashboard-container global-flush-top flush-top pickup-trucks-view${selectedId ? ' detail-open' : ''}`}>
            {selectedId ? (
                <PickupTrucksDetailView pickupId={selectedId} onClose={() => setSelectedId(null)}
                                        onSaved={handleDetailSaved}/>
            ) : (
                <>
                    <TopSection
                        title={title}
                        addButtonLabel="Add Pickup"
                        onAddClick={() => setShowAddSheet(true)}
                        searchInput={searchInput}
                        onSearchInputChange={v => {
                            setSearchInput(v);
                            debouncedSetSearchText(v)
                        }}
                        onClearSearch={() => {
                            setSearchInput('');
                            debouncedSetSearchText('')
                        }}
                        searchPlaceholder="Search by VIN, make, model, year, or name..."
                        viewMode={viewMode}
                        onViewModeChange={handleViewModeChange}
                        plants={plants}
                        regionPlantCodes={regionPlantCodes}
                        selectedPlant={selectedPlant}
                        onSelectedPlantChange={v => setSelectedPlant(v)}
                        statusFilter={statusFilter}
                        statusOptions={statusOptions}
                        onStatusFilterChange={v => setStatusFilter(v)}
                        showReset={showReset}
                        onReset={() => {
                            setSearchText('');
                            setSearchInput('');
                            setSelectedPlant('');
                            setStatusFilter('All Statuses')
                        }}
                        listLabels={['Plant', 'Status', 'Assigned', 'Year', 'Make & Model', 'VIN', 'Mileage']}
                        colWidths={['15%', '15%', '15%', '10%', '20%', '15%', '10%']}
                        onHeaderClick={handleHeaderClick}
                        sortKey={sortKey}
                        sortDirection={sortDirection}
                    />
                    <div className="global-content-container content-container">{content}</div>
                    {showAddSheet && <PickupTrucksAddView onClose={() => setShowAddSheet(false)}
                                                          onAdded={newItem => setPickups([...pickups, newItem])}/>}
                </>
            )}
        </div>
    )
}

export default PickupTrucksView
