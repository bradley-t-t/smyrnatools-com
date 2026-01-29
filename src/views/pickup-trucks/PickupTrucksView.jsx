import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LoadingScreen from '../../components/common/LoadingScreen'
import PickupTrucksCard from './PickupTrucksCard'
import PickupTrucksDetailView from './PickupTrucksDetailView'
import PickupTrucksAddView from './PickupTrucksAddView'
import PickupTruckCommentModal from './PickupTruckCommentModal'
import PickupTruckIssueModal from './PickupTruckIssueModal'
import { PickupTruckService } from '../../services/PickupTruckService'
import AsyncUtility from '../../utils/AsyncUtility'
import { PlantService } from '../../services/PlantService'
import FleetUtility from '../../utils/FleetUtility'
import FormatUtility from '../../utils/FormatUtility'
import { usePreferences } from '../../app/context/PreferencesContext'
import { RegionService } from '../../services/RegionService'
import TopSection from '../../components/sections/TopSection'
import GridViewModeSection from '../../components/sections/GridViewModeSection'
import ListViewModeSection from '../../components/sections/ListViewModeSection'
import HistoryViewSection from '../../components/sections/HistoryViewSection'
import { supabase } from '../../services/DatabaseService'

function PickupTrucksView({ title = 'Pickup Trucks' }) {
    const { preferences } = usePreferences()
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
    const [showCommentModal, setShowCommentModal] = useState(false)
    const [showIssueModal, setShowIssueModal] = useState(false)
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [modalPickupId, setModalPickupId] = useState(null)
    const [modalPickupNumber, setModalPickupNumber] = useState('')
    const [selectedPickupForHistory, setSelectedPickupForHistory] = useState(null)
    const statusOptions = [
        'All Statuses',
        'Active',
        'Stationary',
        'Spare',
        'In Shop',
        'Retired',
        'Sold',
        'Over 300k Miles'
    ]
    const sortMappings = {
        Plant: 'assignedPlant',
        Status: 'status',
        Assigned: 'assigned',
        Year: 'year',
        'Make & Model': null,
        VIN: 'vin',
        Mileage: 'mileage',
        More: null
    }

    const handleRealtimeUpdate = useCallback(
        (eventType, data) => {
            if (eventType === 'UPDATE' && data.new) {
                const updatedData = data.new
                setPickups((prev) =>
                    prev.map((pickup) => {
                        if (pickup.id === updatedData.id) {
                            return {
                                ...pickup,
                                vin: updatedData.vin ?? pickup.vin,
                                make: updatedData.make ?? pickup.make,
                                model: updatedData.model ?? pickup.model,
                                year: updatedData.year ?? pickup.year,
                                assigned: updatedData.assigned ?? pickup.assigned,
                                assignedPlant: updatedData.assigned_plant ?? pickup.assignedPlant,
                                status: updatedData.status ?? pickup.status,
                                mileage: updatedData.mileage ?? pickup.mileage,
                                comments: updatedData.comments ?? pickup.comments,
                                updatedAt: updatedData.updated_at ?? pickup.updatedAt,
                                updatedLast: updatedData.updated_last ?? pickup.updatedLast,
                                updatedBy: updatedData.updated_by ?? pickup.updatedBy
                            }
                        }
                        return pickup
                    })
                )
            } else if (eventType === 'INSERT' && data.new) {
                const newData = data.new
                if (regionPlantCodes && regionPlantCodes.size > 0 && !regionPlantCodes.has(newData.assigned_plant))
                    return
                const newPickup = {
                    id: newData.id,
                    vin: newData.vin ?? '',
                    make: newData.make ?? '',
                    model: newData.model ?? '',
                    year: newData.year ?? '',
                    assigned: newData.assigned ?? '',
                    assignedPlant: newData.assigned_plant ?? '',
                    status: newData.status ?? 'Active',
                    mileage: newData.mileage ?? 0,
                    comments: newData.comments ?? '',
                    createdAt: newData.created_at ?? new Date().toISOString(),
                    updatedAt: newData.updated_at ?? new Date().toISOString(),
                    updatedLast: newData.updated_last ?? null,
                    updatedBy: newData.updated_by ?? null
                }
                setPickups((prev) => {
                    if (prev.some((p) => p.id === newData.id)) return prev
                    return [...prev, newPickup]
                })
            } else if (eventType === 'DELETE' && data.old) {
                setPickups((prev) => prev.filter((pickup) => pickup.id !== data.old.id))
            }
        },
        [regionPlantCodes]
    )

    useEffect(() => {
        const channel = supabase
            .channel('pickup-trucks-realtime-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pickup_trucks' }, (payload) => {
                const eventType = payload.eventType
                const data = { new: payload.new, old: payload.old }
                handleRealtimeUpdate(eventType, data)
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error('Pickup trucks realtime subscription error')
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [handleRealtimeUpdate])

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
                const sel = String(selectedPlant || '')
                    .trim()
                    .toUpperCase()
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
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
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

    const debouncedSetSearchText = useCallback(
        AsyncUtility.debounce((value) => {
            setSearchText(value)
        }, 300),
        []
    )

    const filtered = useMemo(() => {
        const q = searchText.trim().toLowerCase()
        const list = pickups.filter((p) => {
            const vin = String(p.vin || '').toLowerCase()
            const make = String(p.make || '').toLowerCase()
            const model = String(p.model || '').toLowerCase()
            const yearVal = String(p.year || '').toLowerCase()
            const assignedVal = String(p.assigned || '').toLowerCase()
            const matchesSearch =
                !q ||
                vin.includes(q) ||
                make.includes(q) ||
                model.includes(q) ||
                yearVal.includes(q) ||
                assignedVal.includes(q)
            const matchesPlant =
                !selectedPlant ||
                String(p.assignedPlant || '')
                    .trim()
                    .toUpperCase() === selectedPlant.toUpperCase()
            const matchesStatus =
                !statusFilter ||
                statusFilter === 'All Statuses' ||
                (statusFilter === 'Over 300k Miles'
                    ? typeof p.mileage === 'number' && p.mileage > 300000
                    : String(p.status || '').trim() === statusFilter)
            const inRegion =
                regionPlantCodes.size === 0 ||
                regionPlantCodes.has(
                    String(p.assignedPlant || '')
                        .trim()
                        .toUpperCase()
                )
            return matchesSearch && matchesPlant && matchesStatus && inRegion
        })
        return FleetUtility.sortWithRetiredLast(
            list,
            (a, b) => {
                if (!sortKey) {
                    return FleetUtility.compareByStatusThenNumber(a, b, 'status', 'assigned')
                }
                const prop = sortMappings[sortKey]
                let aVal, bVal
                if (sortKey === 'Assigned') {
                    aVal = parseFloat(a.assigned) || 0
                    bVal = parseFloat(b.assigned) || 0
                } else if (sortKey === 'Make & Model') {
                    aVal = `${a.make || ''} ${a.model || ''}`.trim().toLowerCase()
                    bVal = `${b.make || ''} ${b.model || ''}`.trim().toLowerCase()
                } else if (sortKey === 'VIN') {
                    const comparison = FormatUtility.compareVINs(a.vin, b.vin)
                    return sortDirection === 'asc' ? comparison : -comparison
                } else if (prop) {
                    aVal = a[prop]
                    bVal = b[prop]
                } else {
                    return 0
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
            },
            'status'
        )
    }, [pickups, searchText, selectedPlant, statusFilter, regionPlantCodes, sortKey, sortDirection])

    const duplicateVINs = useMemo(() => {
        return PickupTruckService.getDuplicateVINs(pickups)
    }, [pickups])

    const duplicateAssigned = useMemo(() => {
        return PickupTruckService.getDuplicateAssigned(pickups)
    }, [pickups])

    const content = useMemo(() => {
        if (isLoading)
            return (
                <div className="global-loading-container loading-container">
                    <LoadingScreen message="Loading pickup trucks..." inline={true} />
                </div>
            )
        if (filtered.length === 0)
            return (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <i className="fas fa-truck-pickup text-3xl text-slate-400"></i>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No Pickup Trucks Found</h3>
                    <p className="text-slate-500 mb-6 max-w-md">
                        {searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses')
                            ? 'No pickups match your search criteria.'
                            : 'There are no pickup trucks in the system yet.'}
                    </p>
                    <button
                        className="px-5 py-2.5 bg-[#1e3a5f] hover:bg-[#152d4a] text-white font-semibold rounded-lg transition-colors"
                        onClick={() => setShowAddSheet(true)}
                    >
                        Add Pickup Truck
                    </button>
                </div>
            )
        if (viewMode === 'grid')
            return (
                <GridViewModeSection
                    filteredItems={filtered}
                    getCardProps={(pickup) => {
                        const vinKey = String(pickup.vin || '')
                            .trim()
                            .toUpperCase()
                            .replace(/\s+/g, '')
                        const assignedKey = String(pickup.assigned || '')
                            .trim()
                            .toLowerCase()
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
                headerLabels={['Plant', 'Status', 'Assigned', 'Year', 'Make & Model', 'VIN', 'Mileage', 'More']}
                colWidths={['12%', '12%', '12%', '8%', '18%', '15%', '10%', '13%']}
                renderRow={(item, handleSelect, onComment, onIssue, onVerify, onHistory, index, alternatingBg) => {
                    const vinKey = String(item.vin || '')
                        .trim()
                        .toUpperCase()
                        .replace(/\s+/g, '')
                    const assignedKey = String(item.assigned || '')
                        .trim()
                        .toLowerCase()
                    const cellStyle = {
                        padding: '20px 16px',
                        fontSize: '14px',
                        color: '#374151',
                        backgroundColor: alternatingBg,
                        borderBottom: '1px solid #e5e7eb',
                        verticalAlign: 'middle'
                    }
                    const cellBoldStyle = {
                        ...cellStyle,
                        fontWeight: 700,
                        color: '#1e3a5f',
                        fontSize: '15px'
                    }
                    const statusBadge = (status) => {
                        let bg = '#f1f5f9',
                            color = '#64748b'
                        if (status === 'Active') {
                            bg = '#dcfce7'
                            color = '#166534'
                        } else if (status === 'Spare') {
                            bg = '#dbeafe'
                            color = '#1e40af'
                        } else if (status === 'In Shop') {
                            bg = '#fef3c7'
                            color = '#92400e'
                        } else if (status === 'Stationary') {
                            bg = '#e0e7ff'
                            color = '#3730a3'
                        } else if (status === 'Sold' || status === 'Retired') {
                            bg = '#f1f5f9'
                            color = '#64748b'
                        }
                        return {
                            display: 'inline-block',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: bg,
                            color: color
                        }
                    }
                    const actionBtnStyle = {
                        width: '36px',
                        height: '36px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        marginRight: '8px'
                    }
                    const warningBadge = {
                        marginLeft: '8px',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 700
                    }
                    return (
                        <tr
                            key={item.id}
                            onClick={() => handleSelect(item.id)}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={(e) => {
                                e.currentTarget
                                    .querySelectorAll('td')
                                    .forEach((td) => (td.style.backgroundColor = '#e0f2fe'))
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget
                                    .querySelectorAll('td')
                                    .forEach((td) => (td.style.backgroundColor = alternatingBg))
                            }}
                        >
                            <td style={{ ...cellStyle, width: '12%' }}>{item.assignedPlant || '---'}</td>
                            <td style={{ ...cellStyle, width: '12%' }}>
                                <span style={statusBadge(item.status)}>{item.status || '---'}</span>
                            </td>
                            <td style={{ ...cellStyle, width: '12%' }}>
                                {item.assigned || '---'}
                                {duplicateAssigned.has(assignedKey) && (
                                    <span style={warningBadge} title="Assigned to multiple pickups">
                                        <i className="fas fa-exclamation-triangle"></i>
                                    </span>
                                )}
                            </td>
                            <td style={{ ...cellStyle, width: '8%' }}>{item.year || '---'}</td>
                            <td
                                style={{
                                    ...cellBoldStyle,
                                    width: '18%'
                                }}
                            >
                                {`${item.make || ''} ${item.model || ''}`.trim() || '---'}
                            </td>
                            <td
                                style={{
                                    ...cellStyle,
                                    width: '15%',
                                    fontFamily: 'ui-monospace, monospace',
                                    fontSize: '12px',
                                    color: '#64748b'
                                }}
                            >
                                {item.vin || '---'}
                                {duplicateVINs.has(vinKey) && (
                                    <span style={warningBadge} title="Duplicate VIN">
                                        <i className="fas fa-exclamation-triangle"></i>
                                    </span>
                                )}
                            </td>
                            <td style={{ ...cellStyle, width: '10%' }}>
                                {typeof item.mileage === 'number' ? (
                                    <>
                                        {item.mileage.toLocaleString()}
                                        {item.mileage > 300000 && (
                                            <span
                                                style={{
                                                    ...warningBadge,
                                                    backgroundColor: '#fef2f2',
                                                    color: '#991b1b'
                                                }}
                                                title="High mileage"
                                            >
                                                <i className="fas fa-exclamation-triangle"></i>
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    '---'
                                )}
                            </td>
                            <td style={{ ...cellStyle, width: '13%' }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onComment(item.id, item.assigned || item.vin || 'Unknown')
                                        }}
                                        style={actionBtnStyle}
                                        title="View comments"
                                    >
                                        <i className="fas fa-comments"></i>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onIssue(item.id, item.assigned || item.vin || 'Unknown')
                                        }}
                                        style={actionBtnStyle}
                                        title="View issues"
                                    >
                                        <i className="fas fa-tools"></i>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedPickupForHistory(item)
                                            setShowHistoryModal(true)
                                        }}
                                        style={actionBtnStyle}
                                        title="View history"
                                    >
                                        <i className="fas fa-history"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )
                }}
                onShowCommentModal={(id, number) => {
                    setModalPickupId(id)
                    setModalPickupNumber(number)
                    setShowCommentModal(true)
                }}
                onShowIssueModal={(id, number) => {
                    setModalPickupId(id)
                    setModalPickupNumber(number)
                    setShowIssueModal(true)
                }}
                containerClassName="list-table-container"
                tableClassName="list-table"
            />
        )
    }, [isLoading, filtered, viewMode, searchText, selectedPlant, statusFilter, duplicateVINs, duplicateAssigned])

    const showReset = searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses')

    function handleDetailSaved(updated) {
        if (updated && updated.id) {
            setPickups((prev) => {
                const arr = prev.slice()
                const idx = arr.findIndex((p) => p.id === updated.id)
                if (idx >= 0) arr[idx] = { ...arr[idx], ...updated }
                else arr.unshift(updated)
                return arr
            })
        }
        setSelectedId(null)
        fetchAllPickups()
    }

    function handleCommentSaved(pickupId, pickupNumber, comment) {
        setPickups((prev) => {
            const arr = prev.slice()
            const idx = arr.findIndex((p) => p.id === pickupId)
            if (idx >= 0) {
                const updatedPickup = { ...arr[idx], comment }
                arr[idx] = updatedPickup
                return arr
            } else {
                return arr
            }
        })
        setModalPickupId(null)
        setModalPickupNumber('')
        setShowCommentModal(false)
    }

    return (
        <>
            <div
                className={`global-dashboard-container dashboard-container global-flush-top flush-top pickup-trucks-view${selectedId ? ' detail-open' : ''}`}
            >
                {selectedId ? (
                    <PickupTrucksDetailView
                        pickupId={selectedId}
                        onClose={() => setSelectedId(null)}
                        onSaved={handleDetailSaved}
                    />
                ) : (
                    <>
                        <TopSection
                            title={title}
                            addButtonLabel="Add Pickup"
                            onAddClick={() => setShowAddSheet(true)}
                            searchInput={searchInput}
                            onSearchInputChange={(v) => {
                                setSearchInput(v)
                                debouncedSetSearchText(v)
                            }}
                            onClearSearch={() => {
                                setSearchInput('')
                                debouncedSetSearchText('')
                            }}
                            searchPlaceholder="Search by VIN, make, model, year, or name..."
                            viewMode={viewMode}
                            onViewModeChange={handleViewModeChange}
                            plants={plants}
                            regionPlantCodes={regionPlantCodes}
                            selectedPlant={selectedPlant}
                            onSelectedPlantChange={(v) => setSelectedPlant(v)}
                            statusFilter={statusFilter}
                            statusOptions={statusOptions}
                            onStatusFilterChange={(v) => setStatusFilter(v)}
                            showReset={showReset}
                            onReset={() => {
                                setSearchText('')
                                setSearchInput('')
                                setSelectedPlant('')
                                setStatusFilter('All Statuses')
                            }}
                            listLabels={[
                                'Plant',
                                'Status',
                                'Assigned',
                                'Year',
                                'Make & Model',
                                'VIN',
                                'Mileage',
                                'More'
                            ]}
                            colWidths={['12%', '12%', '12%', '8%', '18%', '15%', '10%', '13%']}
                            forwardedRef={headerRef}
                            onHeaderClick={handleHeaderClick}
                            sortKey={sortKey}
                            sortDirection={sortDirection}
                        />
                        <div className="global-content-container content-container">{content}</div>
                        {showAddSheet && (
                            <PickupTrucksAddView
                                onClose={() => setShowAddSheet(false)}
                                onAdded={(newItem) => setPickups([...pickups, newItem])}
                            />
                        )}
                        {showCommentModal && (
                            <PickupTruckCommentModal
                                pickupId={modalPickupId}
                                pickupNumber={modalPickupNumber}
                                onClose={() => setShowCommentModal(false)}
                                onSaved={handleCommentSaved}
                            />
                        )}
                        {showIssueModal && (
                            <PickupTruckIssueModal
                                pickupId={modalPickupId}
                                pickupNumber={modalPickupNumber}
                                onClose={() => setShowIssueModal(false)}
                            />
                        )}
                        {showHistoryModal && selectedPickupForHistory && (
                            <HistoryViewSection
                                item={selectedPickupForHistory}
                                type="pickup-truck"
                                onClose={() => setShowHistoryModal(false)}
                            />
                        )}
                    </>
                )}
            </div>
        </>
    )
}

export default PickupTrucksView
