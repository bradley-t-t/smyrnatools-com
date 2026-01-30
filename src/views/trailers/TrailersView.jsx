import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { usePreferences } from '../../app/context/PreferencesContext'
import LoadingScreen from '../../components/common/LoadingScreen'
import GridViewModeSection from '../../components/sections/GridViewModeSection'
import HistoryViewSection from '../../components/sections/HistoryViewSection'
import ListViewModeSection from '../../components/sections/ListViewModeSection'
import TopSection from '../../components/sections/TopSection'
import { supabase } from '../../services/DatabaseService'
import { PlantService } from '../../services/PlantService'
import { RegionService } from '../../services/RegionService'
import { TractorService } from '../../services/TractorService'
import { TrailerService } from '../../services/TrailerService'
import AsyncUtility from '../../utils/AsyncUtility'
import FleetUtility from '../../utils/FleetUtility'
import FormatUtility from '../../utils/FormatUtility'
import LookupUtility from '../../utils/LookupUtility'
import { TrailerUtility } from '../../utils/TrailerUtility'
import TrailerAddView from './TrailerAddView'
import TrailerCard from './TrailerCard'
import TrailerCommentModal from './TrailerCommentModal'
import TrailerDetailView from './TrailerDetailView'
import TrailerIssueModal from './TrailerIssueModal'

function TrailersView({
    title = 'Trailer Fleet',
    onSelectTrailer,
    embedded = false,
    initialSearch = '',
    exactMatch = false
}) {
    const { preferences, saveLastViewedFilters, updateTrailerFilter, updatePreferences } = usePreferences()
    const [trailers, setTrailers] = useState([])
    const [tractors, setTractors] = useState([])
    const [plants, setPlants] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchText, setSearchText] = useState(
        initialSearch ? initialSearch : embedded ? '' : preferences.trailerFilters?.searchText || ''
    )
    const [searchInput, setSearchInput] = useState(
        initialSearch ? initialSearch : embedded ? '' : preferences.trailerFilters?.searchText || ''
    )
    const [selectedPlant, setSelectedPlant] = useState(embedded ? '' : preferences.trailerFilters?.selectedPlant || '')
    const [typeFilter, setTypeFilter] = useState(embedded ? '' : preferences.trailerFilters?.typeFilter || '')
    const [viewMode, setViewMode] = useState(() => {
        if (embedded) return 'list'
        if (preferences.trailerFilters?.viewMode !== undefined && preferences.trailerFilters?.viewMode !== null)
            return preferences.trailerFilters.viewMode
        if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null)
            return preferences.defaultViewMode
        const lastUsed = localStorage.getItem('trailers_last_view_mode')
        return lastUsed || 'grid'
    })
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [selectedTrailer, setSelectedTrailer] = useState(null)
    const [reloadTrailers, setReloadTrailers] = useState(false)
    const [showIssueModal, setShowIssueModal] = useState(false)
    const [showCommentModal, setShowCommentModal] = useState(false)
    const [modalTrailerId, setModalTrailerId] = useState(null)
    const [modalTrailerNumber, setModalTrailerNumber] = useState('')
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [sortKey, setSortKey] = useState('')
    const [sortDirection, setSortDirection] = useState('asc')
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [selectedTrailerForHistory, setSelectedTrailerForHistory] = useState(null)
    const filterOptions = ['All Types', 'Cement', 'End Dump', 'Past Due Service', 'Open Issues']
    const sortMappings = {
        Cleanliness: 'cleanlinessRating',
        More: null,
        Plant: 'assignedPlant',
        Status: 'status',
        Tractor: null,
        'Trailer #': 'trailerNumber',
        Type: 'trailerType',
        VIN: 'vinNumber'
    }
    const headerRef = useRef(null)

    useEffect(() => {
        if (initialSearch) {
            const timer = setTimeout(() => {
                setSearchText(initialSearch)
                setSearchInput(initialSearch)
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [initialSearch])

    const attachIsVerified = useCallback((obj) => {
        if (!obj) return obj
        obj.isVerified = function (latestHistoryDate = null) {
            if (!this.updatedLast || !this.updatedBy) return false
            const lastVerification = new Date(this.updatedLast)
            const lastUpdate = new Date(this.updatedAt)
            const lastHistory = latestHistoryDate ? new Date(latestHistoryDate) : null
            const now = new Date()
            const lastSunday = new Date(now)
            lastSunday.setDate(now.getDate() - now.getDay())
            lastSunday.setHours(0, 0, 0, 0)
            if (lastHistory && lastHistory > lastVerification) return false
            return lastUpdate <= lastVerification && lastVerification >= lastSunday
        }
        return obj
    }, [])

    const handleRealtimeUpdate = useCallback(
        (eventType, data) => {
            if (eventType === 'UPDATE' && data.new) {
                const updatedData = data.new
                setTrailers((prev) =>
                    prev.map((trailer) => {
                        if (trailer.id === updatedData.id) {
                            const updated = {
                                ...trailer,
                                assignedPlant: updatedData.assigned_plant ?? trailer.assignedPlant,
                                assignedTractor: updatedData.assigned_tractor ?? trailer.assignedTractor,
                                cleanlinessRating: updatedData.cleanliness_rating ?? trailer.cleanlinessRating,
                                status: updatedData.status ?? trailer.status,
                                trailerNumber: updatedData.trailer_number ?? trailer.trailerNumber,
                                trailerType: updatedData.trailer_type ?? trailer.trailerType,
                                updatedAt: updatedData.updated_at ?? trailer.updatedAt,
                                updatedBy: updatedData.updated_by ?? trailer.updatedBy,
                                updatedLast: updatedData.updated_last ?? trailer.updatedLast
                            }
                            return attachIsVerified(updated)
                        }
                        return trailer
                    })
                )
            } else if (eventType === 'INSERT' && data.new) {
                const newData = data.new
                if (regionPlantCodes && !regionPlantCodes.has(newData.assigned_plant)) return
                const newTrailer = attachIsVerified({
                    assignedPlant: newData.assigned_plant ?? '',
                    assignedTractor: newData.assigned_tractor ?? null,
                    cleanlinessRating: newData.cleanliness_rating ?? 1,
                    createdAt: newData.created_at ?? new Date().toISOString(),
                    id: newData.id,
                    status: newData.status ?? 'Active',
                    trailerNumber: newData.trailer_number ?? '',
                    trailerType: newData.trailer_type ?? 'Cement',
                    updatedAt: newData.updated_at ?? new Date().toISOString(),
                    updatedBy: newData.updated_by ?? null,
                    updatedLast: newData.updated_last ?? null
                })
                setTrailers((prev) => {
                    if (prev.some((t) => t.id === newData.id)) return prev
                    return [...prev, newTrailer]
                })
            } else if (eventType === 'DELETE' && data.old) {
                setTrailers((prev) => prev.filter((trailer) => trailer.id !== data.old.id))
            }
        },
        [regionPlantCodes, attachIsVerified]
    )

    useEffect(() => {
        const channel = supabase
            .channel('trailers-realtime-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'trailers' }, (payload) => {
                const eventType = payload.eventType
                const data = { new: payload.new, old: payload.old }
                handleRealtimeUpdate(eventType, data)
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error('Trailers realtime subscription error')
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [handleRealtimeUpdate])

    useEffect(() => {
        async function fetchAllData() {
            setIsLoading(true)
            try {
                const codes = await RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code)
                setRegionPlantCodes(codes)
                await Promise.all([fetchTrailers(codes), fetchTractors(), fetchPlants(codes)])
            } finally {
                setIsLoading(false)
            }
        }

        fetchAllData()
        if (preferences?.trailerFilters) {
            setSearchText(preferences.trailerFilters.searchText || '')
            setSearchInput(preferences.trailerFilters.searchText || '')
            setSelectedPlant(preferences.trailerFilters.selectedPlant || '')
            setTypeFilter(preferences.trailerFilters.typeFilter || '')
        }
        if (preferences.trailerFilters?.viewMode !== undefined && preferences.trailerFilters?.viewMode !== null) {
            setViewMode(preferences.trailerFilters.viewMode)
        } else if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) {
            setViewMode(preferences.defaultViewMode)
        } else {
            const lastUsed = localStorage.getItem('trailers_last_view_mode')
            if (lastUsed) setViewMode(lastUsed)
        }
    }, [preferences, reloadTrailers])

    useEffect(() => {
        if (preferences.trailerFilters?.viewMode !== undefined && preferences.trailerFilters?.viewMode !== null) {
            setViewMode(preferences.trailerFilters.viewMode)
        } else if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) {
            setViewMode(preferences.defaultViewMode)
        } else {
            const lastUsed = localStorage.getItem('trailers_last_view_mode')
            if (lastUsed) setViewMode(lastUsed)
        }
    }, [preferences.trailerFilters?.viewMode, preferences.defaultViewMode])

    useEffect(() => {
        const code = preferences.selectedRegion?.code || ''
        let cancelled = false

        async function loadRegionPlants() {
            if (!code) {
                setRegionPlantCodes(null)
                return
            }
            try {
                const codes = await RegionService.getAllowedPlantCodes(code)
                if (cancelled) return
                setRegionPlantCodes(codes)
                if (selectedPlant && codes && !codes.has(selectedPlant)) {
                    setSelectedPlant('')
                    updatePreferences('trailerFilters', { ...preferences.trailerFilters, selectedPlant: '' })
                }
            } catch {
                setRegionPlantCodes(null)
            }
        }

        loadRegionPlants()
        return () => {
            cancelled = true
        }
    }, [preferences.selectedRegion?.code])

    useEffect(() => {
        function updateStickyCoverHeight() {
            const el = headerRef.current
            const h = el ? Math.ceil(el.getBoundingClientRect().height) : 0
            const root = document.querySelector('.global-dashboard-container.trailers-view')
            if (root && h) root.style.setProperty('--sticky-cover-height', h + 'px')
        }

        updateStickyCoverHeight()
        window.addEventListener('resize', updateStickyCoverHeight)
        return () => window.removeEventListener('resize', updateStickyCoverHeight)
    }, [viewMode, searchInput, selectedPlant, typeFilter])

    function handleViewModeChange(mode) {
        if (viewMode === mode) {
            setViewMode(null)
            updateTrailerFilter('viewMode', null)
            localStorage.removeItem('trailers_last_view_mode')
        } else {
            setViewMode(mode)
            updateTrailerFilter('viewMode', mode)
            localStorage.setItem('trailers_last_view_mode', mode)
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

    async function fetchTrailers(codes) {
        try {
            const processedBase = await TrailerService.fetchTrailersWithDetails(codes)
            setTrailers(processedBase)
            loadDetailsForTrailers(processedBase)
        } catch {}
    }

    async function fetchTractors() {
        try {
            const data = await TractorService.fetchTractors()
            setTractors(Array.isArray(data) ? data : [])
        } catch {
            setTractors([])
        }
    }

    async function fetchPlants(codes) {
        try {
            const data = await PlantService.fetchPlants(codes)
            setPlants(data)
        } catch {}
    }

    function handleSelectTrailer(trailerId) {
        saveLastViewedFilters()
        const trailerObj = trailers.find((t) => t.id === trailerId)
        setSelectedTrailer(trailerObj)
        if (onSelectTrailer) onSelectTrailer(trailerId)
    }

    function handleBackFromDetail() {
        setSelectedTrailer(null)
        setReloadTrailers((r) => !r)
    }

    const debouncedSetSearchText = useCallback(
        AsyncUtility.debounce((value) => {
            setSearchText(value)
            updatePreferences((prev) => ({ ...prev, trailerFilters: { ...prev.trailerFilters, searchText: value } }))
        }, 300),
        [updatePreferences]
    )

    useEffect(() => {
        if (initialSearch) {
            const timer = setTimeout(() => {
                setSearchText(initialSearch)
                setSearchInput(initialSearch)
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [initialSearch])

    const filteredTrailers = useMemo(() => {
        const filtered = trailers.filter((trailer) => {
            const normalizedSearch = searchText.trim().toLowerCase().replace(/\s+/g, '')
            let matchesSearch = true
            if (normalizedSearch) {
                if (exactMatch) {
                    const trailerMatch =
                        (trailer.trailerNumber || '').toLowerCase() === normalizedSearch ||
                        (trailer.identifyingNumber || '').toLowerCase() === normalizedSearch
                    matchesSearch = trailerMatch
                } else {
                    const trailerMatch =
                        (trailer.trailerNumber || '').toLowerCase().includes(normalizedSearch) ||
                        (trailer.identifyingNumber || '').toLowerCase().includes(normalizedSearch)
                    const tractorMatch =
                        trailer.assignedTractor &&
                        tractors
                            .find((t) => t.id === trailer.assignedTractor)
                            ?.truckNumber.toLowerCase()
                            .includes(normalizedSearch)
                    const vinRaw = (trailer.vinNumber || trailer.vin || '').toLowerCase()
                    const vinNoSpaces = vinRaw.replace(/\s+/g, '')
                    const vinMatch =
                        vinRaw.includes(searchText.trim().toLowerCase()) || vinNoSpaces.includes(normalizedSearch)
                    matchesSearch = trailerMatch || tractorMatch || vinMatch
                }
            }
            const matchesPlant = !selectedPlant || trailer.assignedPlant === selectedPlant
            const matchesRegion =
                !preferences.selectedRegion?.code ||
                !regionPlantCodes ||
                regionPlantCodes.size === 0 ||
                regionPlantCodes.has(trailer.assignedPlant)
            let matchesType = true
            if (typeFilter && typeFilter !== 'All Types') {
                matchesType = ['Cement', 'End Dump'].includes(typeFilter)
                    ? trailer.trailerType === typeFilter
                    : typeFilter === 'Past Due Service'
                      ? TrailerUtility.isServiceOverdue(trailer.lastServiceDate)
                      : typeFilter === 'Open Issues'
                        ? Number(trailer.openIssuesCount || 0) > 0
                        : false
            }
            return matchesSearch && matchesPlant && matchesRegion && matchesType
        })

        return FleetUtility.sortWithRetiredLast(
            filtered,
            (a, b) => {
                if (!sortKey) {
                    return FleetUtility.compareByStatusThenNumber(a, b, 'status', 'trailerNumber')
                }
                const prop = sortMappings[sortKey]
                let aVal, bVal
                if (sortKey === 'Trailer #') {
                    aVal = parseFloat(a.trailerNumber) || 0
                    bVal = parseFloat(b.trailerNumber) || 0
                } else if (sortKey === 'Tractor') {
                    const tractorA = tractors.find((t) => t.id === a.assignedTractor)
                    const tractorB = tractors.find((t) => t.id === b.assignedTractor)
                    aVal = tractorA?.truckNumber || ''
                    bVal = tractorB?.truckNumber || ''
                } else if (sortKey === 'VIN') {
                    const comparison = FormatUtility.compareVINs(a.vinNumber, b.vinNumber)
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
    }, [
        trailers,
        tractors,
        selectedPlant,
        searchText,
        typeFilter,
        preferences.selectedRegion?.code,
        regionPlantCodes,
        sortKey,
        sortDirection,
        exactMatch
    ])

    const content = useMemo(() => {
        if (isLoading)
            return (
                <div className="global-loading-container loading-container">
                    <LoadingScreen message="Loading trailers..." inline={true} />
                </div>
            )
        if (filteredTrailers.length === 0)
            return (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <i className="fas fa-trailer text-3xl text-slate-400"></i>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No Trailers Found</h3>
                    <p className="text-slate-500 mb-6 max-w-md">
                        {searchText || selectedPlant || (typeFilter && typeFilter !== 'All Types')
                            ? 'No trailers match your search criteria.'
                            : 'There are no trailers in the system yet.'}
                    </p>
                    <button
                        className="px-5 py-2.5 bg-[#1e3a5f] hover:bg-[#152d4a] text-white font-semibold rounded-lg transition-colors"
                        onClick={() => setShowAddSheet(true)}
                    >
                        Add Trailer
                    </button>
                </div>
            )
        if (viewMode === 'grid')
            return (
                <GridViewModeSection
                    filteredItems={filteredTrailers}
                    tractors={tractors}
                    plants={plants}
                    handleSelectItem={handleSelectTrailer}
                    cardComponent={TrailerCard}
                    itemPropName="trailer"
                    onShowCommentModal={(id, number) => {
                        setModalTrailerId(id)
                        setModalTrailerNumber(number)
                        setShowCommentModal(true)
                    }}
                    onShowIssueModal={(id, number) => {
                        setModalTrailerId(id)
                        setModalTrailerNumber(number)
                        setShowIssueModal(true)
                    }}
                    gridClassName="grid"
                />
            )
        return (
            <ListViewModeSection
                filteredItems={filteredTrailers}
                handleSelectItem={handleSelectTrailer}
                headerLabels={['Plant', 'Trailer #', 'Status', 'Type', 'Cleanliness', 'Tractor', 'VIN', 'More']}
                colWidths={['12%', '14%', '12%', '10%', '14%', '16%', '12%', '10%']}
                renderRow={(item, handleSelect, onComment, onIssue, onVerify, onHistory, index, alternatingBg) => {
                    const commentsCount = Number(item.commentsCount || 0)
                    const issuesCount = Number(item.openIssuesCount || 0)
                    const cellStyle = {
                        backgroundColor: alternatingBg,
                        borderBottom: '1px solid #e5e7eb',
                        color: '#374151',
                        fontSize: '14px',
                        padding: '20px 16px',
                        verticalAlign: 'middle'
                    }
                    const cellBoldStyle = {
                        ...cellStyle,
                        color: '#1e3a5f',
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
                            bg = '#dbeafe'
                            color = '#1e40af'
                        } else if (status === 'In Shop') {
                            bg = '#fef3c7'
                            color = '#92400e'
                        } else if (status === 'Retired') {
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
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        fontSize: '14px',
                        height: '36px',
                        justifyContent: 'center',
                        marginRight: '8px',
                        width: '36px'
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
                            <td style={{ ...cellBoldStyle, width: '14%' }}>{item.trailerNumber || '---'}</td>
                            <td style={{ ...cellStyle, width: '12%' }}>
                                <span style={statusBadge(item.status)}>{item.status || '---'}</span>
                            </td>
                            <td style={{ ...cellStyle, width: '10%' }}>{item.trailerType || '---'}</td>
                            <td style={{ ...cellStyle, width: '14%' }}>
                                <div style={{ alignItems: 'center', display: 'flex', gap: '4px' }}>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <i
                                            key={i}
                                            className="fas fa-star"
                                            style={{
                                                color:
                                                    i < Math.round(item.cleanlinessRating || 0) ? '#f59e0b' : '#e5e7eb',
                                                fontSize: '14px'
                                            }}
                                        ></i>
                                    ))}
                                </div>
                            </td>
                            <td style={{ ...cellStyle, width: '16%' }}>
                                {LookupUtility.getTractorTruckNumber(tractors, item.assignedTractor) || '---'}
                                {LookupUtility.isIdAssignedToMultiple(
                                    trailers,
                                    'assignedTractor',
                                    item.assignedTractor
                                ) && (
                                    <span
                                        style={{
                                            backgroundColor: '#fef3c7',
                                            borderRadius: '6px',
                                            color: '#92400e',
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            marginLeft: '8px',
                                            padding: '4px 8px'
                                        }}
                                    >
                                        <i className="fas fa-exclamation-triangle"></i>
                                    </span>
                                )}
                            </td>
                            <td
                                style={{
                                    ...cellStyle,
                                    color: '#64748b',
                                    fontFamily: 'ui-monospace, monospace',
                                    fontSize: '12px',
                                    width: '12%'
                                }}
                            >
                                {item.vinNumber || item.vin || '---'}
                            </td>
                            <td style={{ ...cellStyle, width: '10%' }}>
                                <div style={{ alignItems: 'center', display: 'flex' }}>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onComment(item.id, item.trailerNumber)
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
                                            onIssue(item.id, item.trailerNumber)
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
                                            setSelectedTrailerForHistory(item)
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
                    setModalTrailerId(id)
                    setModalTrailerNumber(number)
                    setShowCommentModal(true)
                }}
                onShowIssueModal={(id, number) => {
                    setModalTrailerId(id)
                    setModalTrailerNumber(number)
                    setShowIssueModal(true)
                }}
                containerClassName="list-table-container"
                tableClassName="list-table"
            />
        )
    }, [isLoading, filteredTrailers, viewMode, searchText, selectedPlant, typeFilter, tractors, plants, trailers])

    useEffect(() => {
        async function searchByVin() {
            const normalizedSearch = searchText.trim().toLowerCase().replace(/\s+/g, '')
            if (normalizedSearch.length >= 17 && /^[a-z0-9]+$/i.test(normalizedSearch)) {
                setIsLoading(true)
                try {
                    const vinTrailers = await TrailerService.searchTrailersByVinProcessed(normalizedSearch)
                    const filteredVinTrailers = regionPlantCodes
                        ? vinTrailers.filter((t) =>
                              regionPlantCodes.has(
                                  String(t.assignedPlant || '')
                                      .trim()
                                      .toUpperCase()
                              )
                          )
                        : vinTrailers
                    setTrailers(filteredVinTrailers)
                } catch {}
                setIsLoading(false)
            } else {
                setTrailers(trailers)
            }
        }

        if (searchText.trim().length >= 1) {
            searchByVin()
        } else {
            setTrailers(trailers)
        }
    }, [searchText, trailers, regionPlantCodes])

    const loadDetailsForTrailers = async (trailers) => {
        const items = trailers.slice()
        let index = 0
        const concurrency = 20

        async function worker() {
            while (index < items.length) {
                const current = index++
                const t = items[current]
                try {
                    const [comments, issues] = await Promise.all([
                        TrailerService.fetchComments(t.id).catch(() => []),
                        TrailerService.fetchIssues(t.id).catch(() => [])
                    ])
                    const openIssuesCount = Array.isArray(issues) ? issues.filter((i) => !i.time_completed).length : 0
                    const commentsCount = Array.isArray(comments) ? comments.length : 0
                    t.comments = comments
                    t.issues = issues
                    t.openIssuesCount = openIssuesCount
                    t.commentsCount = commentsCount
                } catch (e) {}
            }
        }

        await Promise.all(Array.from({ length: concurrency }, () => worker()))
        setTrailers([...trailers])
    }

    const showReset = searchText || selectedPlant || (typeFilter && typeFilter !== 'All Types')

    return (
        <>
            <div className="global-dashboard-container dashboard-container global-flush-top flush-top trailers-view">
                {selectedTrailer ? (
                    <TrailerDetailView trailer={selectedTrailer} onClose={handleBackFromDetail} />
                ) : (
                    <>
                        <TopSection
                            title={title}
                            addButtonLabel="Add Trailer"
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
                            searchPlaceholder="Search by trailer or tractor..."
                            viewMode={viewMode}
                            onViewModeChange={handleViewModeChange}
                            plants={plants}
                            regionPlantCodes={regionPlantCodes}
                            selectedPlant={selectedPlant}
                            onSelectedPlantChange={(v) => {
                                setSelectedPlant(v)
                                updatePreferences('trailerFilters', { ...preferences.trailerFilters, selectedPlant: v })
                            }}
                            statusFilter={typeFilter}
                            statusOptions={filterOptions}
                            onStatusFilterChange={(v) => {
                                setTypeFilter(v)
                                updatePreferences('trailerFilters', { ...preferences.trailerFilters, typeFilter: v })
                            }}
                            showReset={showReset}
                            onReset={() => {
                                setSearchText('')
                                setSearchInput('')
                                setSelectedPlant('')
                                setTypeFilter('')
                                updatePreferences('trailerFilters', {
                                    ...preferences.trailerFilters,
                                    searchText: '',
                                    selectedPlant: '',
                                    typeFilter: ''
                                })
                            }}
                            listLabels={[
                                'Plant',
                                'Trailer #',
                                'Status',
                                'Type',
                                'Cleanliness',
                                'Tractor',
                                'VIN',
                                'More'
                            ]}
                            colWidths={['12%', '14%', '12%', '10%', '14%', '16%', '12%', '10%']}
                            forwardedRef={headerRef}
                            onHeaderClick={handleHeaderClick}
                            sortKey={sortKey}
                            sortDirection={sortDirection}
                        />
                        <div className="global-content-container content-container">{content}</div>
                        {showAddSheet && (
                            <TrailerAddView
                                plants={plants}
                                onClose={() => setShowAddSheet(false)}
                                onTrailerAdded={(newTrailer) => setTrailers([...trailers, newTrailer])}
                            />
                        )}
                        {showCommentModal && (
                            <TrailerCommentModal
                                trailerId={modalTrailerId}
                                trailerNumber={modalTrailerNumber}
                                onClose={() => setShowCommentModal(false)}
                            />
                        )}
                        {showIssueModal && (
                            <TrailerIssueModal
                                trailerId={modalTrailerId}
                                trailerNumber={modalTrailerNumber}
                                onClose={() => setShowIssueModal(false)}
                            />
                        )}
                        {showHistoryModal && selectedTrailerForHistory && (
                            <HistoryViewSection
                                item={selectedTrailerForHistory}
                                type="trailer"
                                onClose={() => setShowHistoryModal(false)}
                            />
                        )}
                    </>
                )}
            </div>
        </>
    )
}

export default TrailersView
