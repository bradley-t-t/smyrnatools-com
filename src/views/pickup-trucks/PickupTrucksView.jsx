import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import StatusHistoryBar from '../../app/components/common/StatusHistoryBar'
import { exportAssetIssuesSheet } from '../../app/components/modules/export/issues/AssetIssuesExport'
import GridViewModeSection from '../../app/components/sections/GridViewModeSection'
import HistoryViewSection from '../../app/components/sections/HistoryViewSection'
import ListViewModeSection from '../../app/components/sections/ListViewModeSection'
import TopSection from '../../app/components/sections/TopSection'
import AssetListSkeleton from '../../app/components/ui/AssetListSkeleton'
import { usePreferences } from '../../app/context/PreferencesContext'
import { supabase } from '../../services/DatabaseService'
import { PickupTruckService } from '../../services/PickupTruckService'
import { PlantService } from '../../services/PlantService'
import { RegionService } from '../../services/RegionService'
import AsyncUtility from '../../utils/AsyncUtility'
import FleetUtility from '../../utils/FleetUtility'
import FormatUtility from '../../utils/FormatUtility'
import PickupTruckCommentModal from './PickupTruckCommentModal'
import PickupTruckIssueModal from './PickupTruckIssueModal'
import PickupTrucksAddView from './PickupTrucksAddView'
import PickupTrucksCard from './PickupTrucksCard'
import PickupTrucksDetailView from './PickupTrucksDetailView'
/**
 * Main list/grid view for the pickup truck fleet. Handles data fetching
 * with comment/issue count aggregation, Supabase realtime subscriptions
 * for live INSERT/UPDATE/DELETE, region-scoped plant filtering, search
 * across VIN/make/model/year/assigned, status filtering (including "Over
 * 300k Miles"), sortable columns, issue export, and drill-down into
 * PickupTrucksDetailView.
 *
 * @param {string} [title] - Page heading (defaults to "Pickup Trucks").
 */
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
    const [isExportingIssues, setIsExportingIssues] = useState(false)
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
        Assigned: 'assigned',
        'Make & Model': null,
        Mileage: 'mileage',
        More: null,
        Plant: 'assignedPlant',
        Status: 'status',
        VIN: 'vin',
        Year: 'year'
    }
    /** Processes Supabase realtime INSERT/UPDATE/DELETE events to keep the pickup list in sync without refetching. */
    const handleRealtimeUpdate = useCallback(
        (eventType, data) => {
            if (eventType === 'UPDATE' && data.new) {
                const updatedData = data.new
                setPickups((prev) =>
                    prev.map((pickup) => {
                        if (pickup.id === updatedData.id) {
                            return {
                                ...pickup,
                                assigned: updatedData.assigned ?? pickup.assigned,
                                assignedPlant: updatedData.assigned_plant ?? pickup.assignedPlant,
                                comments: updatedData.comments ?? pickup.comments,
                                make: updatedData.make ?? pickup.make,
                                mileage: updatedData.mileage ?? pickup.mileage,
                                model: updatedData.model ?? pickup.model,
                                status: updatedData.status ?? pickup.status,
                                updatedAt: updatedData.updated_at ?? pickup.updatedAt,
                                updatedBy: updatedData.updated_by ?? pickup.updatedBy,
                                updatedLast: updatedData.updated_last ?? pickup.updatedLast,
                                vin: updatedData.vin ?? pickup.vin,
                                year: updatedData.year ?? pickup.year
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
                    assigned: newData.assigned ?? '',
                    assignedPlant: newData.assigned_plant ?? '',
                    comments: newData.comments ?? '',
                    createdAt: newData.created_at ?? new Date().toISOString(),
                    id: newData.id,
                    make: newData.make ?? '',
                    mileage: newData.mileage ?? 0,
                    model: newData.model ?? '',
                    status: newData.status ?? 'Active',
                    updatedAt: newData.updated_at ?? new Date().toISOString(),
                    updatedBy: newData.updated_by ?? null,
                    updatedLast: newData.updated_last ?? null,
                    vin: newData.vin ?? '',
                    year: newData.year ?? ''
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
    /** Fetches all pickups scoped to the user's region, then batch-loads comment and issue counts. */
    const fetchAllPickups = useCallback(async () => {
        setIsLoading(true)
        try {
            const codes = await RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code)
            setRegionPlantCodes(codes)
            const data = await PickupTruckService.fetchAll(codes)
            const pickupsList = Array.isArray(data) ? data : []
            setPickups(pickupsList)
            if (pickupsList.length > 0) {
                const pickupIds = pickupsList.map((p) => p.id).filter(Boolean)
                const [commentsCounts, issuesCounts] = await Promise.all([
                    PickupTruckService.fetchAllCommentsCounts(pickupIds),
                    PickupTruckService.fetchAllIssuesCounts(pickupIds)
                ])
                setPickups((prev) =>
                    prev.map((p) => ({
                        ...p,
                        commentsCount: commentsCounts[p.id] || 0,
                        openIssuesCount: issuesCounts[p.id] || 0
                    }))
                )
            }
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
    async function handleExportIssues() {
        setIsExportingIssues(true)
        try {
            await exportAssetIssuesSheet({
                assetType: 'Pickup Truck',
                assets: pickups,
                identifierField: 'assigned',
                plants,
                service: PickupTruckService
            })
        } catch (err) {
            console.error('Export issues failed:', err)
        } finally {
            setIsExportingIssues(false)
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
                selectedPlant === 'All' ||
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
        if (isLoading) return <AssetListSkeleton viewMode={viewMode} />
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
                        className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors"
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
                            isDuplicateAssigned: duplicateAssigned.has(assignedKey),
                            isDuplicateVin: duplicateVINs.has(vinKey),
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
                        backgroundColor: alternatingBg,
                        borderBottom: '1px solid var(--border-light)',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        padding: '20px 16px',
                        verticalAlign: 'middle'
                    }
                    const cellBoldStyle = {
                        ...cellStyle,
                        color: 'var(--accent)',
                        fontSize: '15px',
                        fontWeight: 700
                    }
                    const statusBadge = (status) => {
                        let bg = '#f1f5f9',
                            color = '#64748b'
                        if (status === 'Active') {
                            bg = '#dcfce7'
                            color = '#166534'
                        } else if (status === 'Spare') {
                            bg = '#f3e8ff'
                            color = '#7c3aed'
                        } else if (status === 'In Shop') {
                            bg = '#dbeafe'
                            color = '#1e40af'
                        } else if (status === 'Stationary') {
                            bg = '#e0e7ff'
                            color = '#3730a3'
                        } else if (status === 'Sold' || status === 'Retired') {
                            bg = '#f1f5f9'
                            color = '#64748b'
                        }
                        return {
                            backgroundColor: bg,
                            borderRadius: '20px',
                            color: color,
                            display: 'inline-block',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '6px 14px'
                        }
                    }
                    const actionBtnStyle = {
                        alignItems: 'center',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '8px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        fontSize: '14px',
                        height: '36px',
                        justifyContent: 'center',
                        marginRight: '8px',
                        width: '36px'
                    }
                    const warningBadge = {
                        backgroundColor: '#fef3c7',
                        borderRadius: '6px',
                        color: '#92400e',
                        fontSize: '10px',
                        fontWeight: 700,
                        marginLeft: '8px',
                        padding: '4px 8px'
                    }
                    return (
                        <tr
                            key={item.id}
                            onClick={() => handleSelect(item.id)}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={(e) => {
                                e.currentTarget
                                    .querySelectorAll('td')
                                    .forEach((td) => (td.style.backgroundColor = 'var(--bg-tertiary)'))
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget
                                    .querySelectorAll('td')
                                    .forEach((td) => (td.style.backgroundColor = alternatingBg))
                            }}
                        >
                            <td style={{ ...cellStyle, width: '12%' }}>{item.assignedPlant || '---'}</td>
                            <td style={{ ...cellStyle, width: '12%' }}>
                                <div>
                                    <span style={statusBadge(item.status)}>
                                        {item.status || '---'}
                                        {item.status &&
                                            item.status !== 'Retired' &&
                                            (() => {
                                                const dateToUse = item.statusChangedAt || item.createdAt
                                                const days = dateToUse
                                                    ? Math.max(
                                                          1,
                                                          Math.floor(
                                                              (Date.now() - new Date(dateToUse).getTime()) / 86400000
                                                          )
                                                      )
                                                    : 1
                                                return ` (${days} day${days !== 1 ? 's' : ''})`
                                            })()}
                                    </span>
                                    <StatusHistoryBar
                                        itemId={item.id}
                                        itemType="pickup-truck"
                                        currentStatus={item.status}
                                        createdAt={item.createdAt}
                                    />
                                </div>
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
                                    color: 'var(--text-secondary)',
                                    fontFamily: 'ui-monospace, monospace',
                                    fontSize: '12px',
                                    width: '15%'
                                }}
                            >
                                {item.vin ? (
                                    <div style={{ alignItems: 'center', display: 'flex', gap: '6px' }}>
                                        {item.vin}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                navigator.clipboard.writeText(item.vin)
                                                const icon = e.currentTarget.querySelector('i')
                                                icon.className = 'fas fa-check'
                                                icon.style.color = '#22c55e'
                                                setTimeout(() => {
                                                    icon.className = 'fas fa-copy'
                                                    icon.style.color = '#94a3b8'
                                                }, 1500)
                                            }}
                                            title="Copy VIN"
                                            style={{
                                                alignItems: 'center',
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#94a3b8',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                fontSize: '12px',
                                                padding: '2px'
                                            }}
                                        >
                                            <i className="fas fa-copy"></i>
                                        </button>
                                        {duplicateVINs.has(vinKey) && (
                                            <span style={warningBadge} title="Duplicate VIN">
                                                <i className="fas fa-exclamation-triangle"></i>
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    '---'
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
                                <div style={{ alignItems: 'center', display: 'flex' }}>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onComment(item.id, item.assigned || item.vin || 'Unknown')
                                        }}
                                        style={{ ...actionBtnStyle, position: 'relative' }}
                                        title="View comments"
                                    >
                                        <i className="fas fa-comments"></i>
                                        {item.commentsCount > 0 && (
                                            <span
                                                style={{
                                                    alignItems: 'center',
                                                    backgroundColor: '#3b82f6',
                                                    borderRadius: '10px',
                                                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
                                                    color: 'white',
                                                    display: 'flex',
                                                    fontSize: '10px',
                                                    fontWeight: 700,
                                                    height: '16px',
                                                    justifyContent: 'center',
                                                    minWidth: '16px',
                                                    padding: '0 4px',
                                                    position: 'absolute',
                                                    right: '-4px',
                                                    top: '-4px'
                                                }}
                                            >
                                                {item.commentsCount > 9 ? '9+' : item.commentsCount}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onIssue(item.id, item.assigned || item.vin || 'Unknown')
                                        }}
                                        style={{ ...actionBtnStyle, position: 'relative' }}
                                        title="View issues"
                                    >
                                        <i className="fas fa-tools"></i>
                                        {item.openIssuesCount > 0 && (
                                            <span
                                                style={{
                                                    alignItems: 'center',
                                                    backgroundColor: '#ef4444',
                                                    borderRadius: '10px',
                                                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                                                    color: 'white',
                                                    display: 'flex',
                                                    fontSize: '10px',
                                                    fontWeight: 700,
                                                    height: '16px',
                                                    justifyContent: 'center',
                                                    minWidth: '16px',
                                                    padding: '0 4px',
                                                    position: 'absolute',
                                                    right: '-4px',
                                                    top: '-4px'
                                                }}
                                            >
                                                {item.openIssuesCount > 9 ? '9+' : item.openIssuesCount}
                                            </span>
                                        )}
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
                            isLoading={isLoading}
                            title={title}
                            addButtonLabel="Add Pickup"
                            onAddClick={() => setShowAddSheet(true)}
                            customActions={
                                <button
                                    className="hidden md:flex items-center gap-2 rounded-xl border-none px-4 py-3 text-sm font-semibold text-white cursor-pointer transition-all duration-150 disabled:opacity-50"
                                    style={{ backgroundColor: '#6b7280' }}
                                    onClick={handleExportIssues}
                                    disabled={isExportingIssues || pickups.length === 0}
                                    type="button"
                                    aria-label="Export Issues"
                                >
                                    <i
                                        className={`fas ${isExportingIssues ? 'fa-spinner fa-spin' : 'fa-file-export'}`}
                                    />
                                    <span>{isExportingIssues ? 'Exporting...' : 'Export Issues'}</span>
                                </button>
                            }
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
