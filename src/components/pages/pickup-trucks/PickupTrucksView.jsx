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
import {UserService} from '../../../services/UserService'
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
    const statusOptions = ['All Statuses', 'Active', 'Stationary', 'Spare', 'In Shop', 'Retired', 'Sold', 'Over 300k Miles']

    const fetchAllPickups = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await PickupTruckService.fetchAll()
            setPickups(Array.isArray(data) ? data : [])
        } catch {
            setPickups([])
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAllPickups()
    }, [fetchAllPickups])

    useEffect(() => {
        async function loadPlants() {
            try {
                const data = await PlantService.fetchPlants()
                setPlants(Array.isArray(data) ? data : [])
            } catch {
                setPlants([])
            }
        }

        loadPlants()
    }, [])

    useEffect(() => {
        let cancelled = false

        async function loadAllowedPlants() {
            let regionCode = preferences.selectedRegion?.code || ''
            try {
                if (!regionCode) {
                    const user = await UserService.getCurrentUser()
                    const uid = user?.id || ''
                    if (uid) {
                        const profilePlant = await UserService.getUserPlant(uid)
                        const plantCode = typeof profilePlant === 'string' ? profilePlant : (profilePlant?.plant_code || profilePlant?.plantCode || '')
                        if (plantCode) {
                            const regions = await RegionService.fetchRegionsByPlantCode(plantCode)
                            const r = Array.isArray(regions) && regions.length ? regions[0] : null
                            regionCode = r ? (r.regionCode || r.region_code || '') : ''
                        }
                    }
                }
                if (!regionCode) {
                    if (!cancelled) setRegionPlantCodes(new Set())
                    return
                }
                const regionPlants = await RegionService.fetchRegionPlants(regionCode)
                if (cancelled) return
                const codes = new Set(regionPlants.map(p => String(p.plantCode || p.plant_code || '').trim().toUpperCase()).filter(Boolean))
                setRegionPlantCodes(codes)
                const sel = String(selectedPlant || '').trim().toUpperCase()
                if (sel && !codes.has(sel)) setSelectedPlant('')
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
        return list.sort((a, b) => FleetUtility.compareByStatusThenNumber(a, b, 'status', 'assigned'))
    }, [pickups, searchText, selectedPlant, statusFilter, regionPlantCodes])

    const duplicateVINs = useMemo(() => {
        const counts = new Map()
        for (const p of pickups) {
            const key = String(p.vin || '').trim().toUpperCase().replace(/\s+/g, '')
            if (!key) continue
            counts.set(key, (counts.get(key) || 0) + 1)
        }
        const dups = new Set()
        counts.forEach((count, key) => {
            if (count > 1) dups.add(key)
        })
        return dups
    }, [pickups])

    const duplicateAssigned = useMemo(() => {
        const counts = new Map()
        for (const p of pickups) {
            const key = String(p.assigned || '').trim().toLowerCase()
            if (!key) continue
            counts.set(key, (counts.get(key) || 0) + 1)
        }
        const dups = new Set()
        counts.forEach((count, key) => {
            if (count > 1) dups.add(key)
        })
        return dups
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
                            <td>{item.assignedPlant || '---'}</td>
                            <td><span className={`item-status-dot ${statusClass}`}></span>{item.status || '---'}</td>
                            <td>{item.assigned ? <span className="cell-inline"><span>{item.assigned}</span>{duplicateAssigned.has(assignedKey) && <span className="warning-badge" title="Assigned to multiple pickups"><i className="fas fa-exclamation-triangle"></i></span>}</span> : '---'}</td>
                            <td>{item.year || '---'}</td>
                            <td>{`${item.make || ''} ${item.model || ''}`.trim() || '---'}</td>
                            <td>{item.vin ? <span className="cell-inline"><span>{item.vin}</span>{duplicateVINs.has(vinKey) && <span className="warning-badge" title="Duplicate VIN"><i className="fas fa-exclamation-triangle"></i></span>}</span> : '---'}</td>
                            <td>{typeof item.mileage === 'number' ? <span className="mileage-cell"><span>{item.mileage.toLocaleString()}</span>{item.mileage > 300000 && <span className="warning-badge" title="High mileage"><i className="fas fa-exclamation-triangle"></i></span>}</span> : '---'}</td>
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
