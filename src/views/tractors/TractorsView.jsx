import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import StatusHistoryBar from '../../app/components/common/StatusHistoryBar'
import VerificationRequirementsModal from '../../app/components/common/VerificationRequirementsModal'
import { exportAssetIssuesSheet } from '../../app/components/modules/export/issues/AssetIssuesExport'
import GridViewModeSection from '../../app/components/sections/GridViewModeSection'
import HistoryViewSection from '../../app/components/sections/HistoryViewSection'
import ListViewModeSection from '../../app/components/sections/ListViewModeSection'
import TopSection from '../../app/components/sections/TopSection'
import AssetListSkeleton from '../../app/components/ui/AssetListSkeleton'
import { usePreferences } from '../../app/context/PreferencesContext'
import { supabase } from '../../services/DatabaseService'
import { OperatorService } from '../../services/OperatorService'
import { PlantService } from '../../services/PlantService'
import { RegionService } from '../../services/RegionService'
import { TractorService } from '../../services/TractorService'
import AsyncUtility from '../../utils/AsyncUtility'
import CleanupUtility from '../../utils/CleanupUtility'
import FleetUtility from '../../utils/FleetUtility'
import FormatUtility from '../../utils/FormatUtility'
import { TractorUtility } from '../../utils/TractorUtility'
import { ValidationUtility } from '../../utils/ValidationUtility'
import TractorAddView from './TractorAddView'
import TractorCard from './TractorCard'
import TractorCommentModal from './TractorCommentModal'
import TractorDetailView from './TractorDetailView'
import TractorIssueModal from './TractorIssueModal'
const TRACTOR_SORT_MAPPINGS = {
    Cleanliness: 'cleanlinessRating',
    More: null,
    Operator: 'assignedOperator',
    Plant: 'assignedPlant',
    Status: 'status',
    'Truck #': 'truckNumber',
    VIN: 'vinNumber',
    Verified: null
}
/**
 * Main list/grid view for the tractor fleet. Handles data fetching,
 * Supabase realtime subscriptions for live updates, region-scoped plant
 * filtering, search, status and freight filtering, inline verification,
 * sortable columns, issue export, and drill-down into TractorDetailView.
 *
 * @param {string} [title] - Page heading (defaults to "Tractor Fleet").
 * @param {Function} [onSelectTractor] - Optional external callback when a tractor is selected.
 * @param {Function} [setSelectedView] - Optional parent view-switching callback.
 * @param {boolean} [embedded] - When true, disables filter persistence and forces list mode.
 * @param {string} [initialSearch] - Pre-populates the search field on mount.
 * @param {boolean} [exactMatch] - When true, search matches truck number exactly.
 */
function TractorsView({
    title = 'Tractor Fleet',
    onSelectTractor,
    setSelectedView,
    embedded = false,
    initialSearch = '',
    exactMatch = false
}) {
    const { preferences, updateTractorFilter, resetTractorFilters, saveLastViewedFilters, updateOperatorFilter } =
        usePreferences()
    const headerRef = useRef(null)
    const updateTractorFilterRef = useRef(updateTractorFilter)
    updateTractorFilterRef.current = updateTractorFilter
    const [tractors, setTractors] = useState([])
    const [allTractors, setAllTractors] = useState([])
    const [operators, setOperators] = useState([])
    const [plants, setPlants] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRegionLoading, setIsRegionLoading] = useState(false)
    const [searchText, setSearchText] = useState(
        initialSearch ? initialSearch : embedded ? '' : preferences.tractorFilters?.searchText || ''
    )
    const [searchInput, setSearchInput] = useState(
        initialSearch ? initialSearch : embedded ? '' : preferences.tractorFilters?.searchText || ''
    )
    const [selectedPlant, setSelectedPlant] = useState(embedded ? '' : preferences.tractorFilters?.selectedPlant || '')
    const [statusFilter, setStatusFilter] = useState(embedded ? '' : preferences.tractorFilters?.statusFilter || '')
    const [freightFilter, setFreightFilter] = useState(embedded ? '' : preferences.tractorFilters?.freightFilter || '')
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [selectedTractor, setSelectedTractor] = useState(null)
    const [viewMode, setViewMode] = useState(() => {
        if (embedded) return 'list'
        if (preferences.tractorFilters?.viewMode !== undefined && preferences.tractorFilters?.viewMode !== null)
            return preferences.tractorFilters.viewMode
        if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null)
            return preferences.defaultViewMode
        const lastUsed = localStorage.getItem('tractors_last_view_mode')
        return lastUsed || 'grid'
    })
    const [showIssueModal, setShowIssueModal] = useState(false)
    const [showCommentModal, setShowCommentModal] = useState(false)
    const [modalTractorId, setModalTractorId] = useState(null)
    const [modalTractorNumber, setModalTractorNumber] = useState('')
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [tractorsLoaded, setTractorsLoaded] = useState(false)
    const [operatorsLoaded, setOperatorsLoaded] = useState(false)
    const [sortKey, setSortKey] = useState('')
    const [sortDirection, setSortDirection] = useState('asc')
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [selectedTractorForHistory, setSelectedTractorForHistory] = useState(null)
    const [isExportingIssues, setIsExportingIssues] = useState(false)
    const [showVerifyModal, setShowVerifyModal] = useState(false)
    const [verifyTractor, setVerifyTractor] = useState(null)
    const [verifyVin, setVerifyVin] = useState('')
    const [verifyMake, setVerifyMake] = useState('')
    const [verifyModel, setVerifyModel] = useState('')
    const [verifyYear, setVerifyYear] = useState('')
    const [verifyLastServiceDate, setVerifyLastServiceDate] = useState(null)
    const filterOptions = [
        'All Statuses',
        'Active',
        'Spare',
        'In Shop',
        'Retired',
        'Past Due Service',
        'Verified',
        'Not Verified',
        'Open Issues'
    ]
    useEffect(() => {
        if (initialSearch) {
            const timer = setTimeout(() => {
                setSearchText(initialSearch)
                setSearchInput(initialSearch)
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [initialSearch])
    const unassignedActiveOperatorsCount = useMemo(
        () =>
            FleetUtility.countUnassignedActiveOperators(tractors, operators, searchText, {
                assignedOperatorField: 'assignedOperator',
                assignedPlantField: 'assignedPlant',
                operatorIdField: 'employeeId',
                position: 'Tractor Operator',
                regionPlantCodes,
                selectedPlant
            }),
        [operators, tractors, selectedPlant, searchText, regionPlantCodes]
    )
    const attachIsVerified = useCallback((obj) => {
        if (!obj) return obj
        obj.isVerified = function (latestHistoryDate) {
            return TractorUtility.isVerified(
                this.updatedLast,
                this.updatedAt,
                this.updatedBy,
                latestHistoryDate ?? this.latestHistoryDate
            )
        }
        return obj
    }, [])
    const handleRealtimeUpdate = useCallback(
        (eventType, data) => {
            if (eventType === 'UPDATE' && data.new) {
                const updatedData = data.new
                setTractors((prev) =>
                    prev.map((tractor) => {
                        if (tractor.id === updatedData.id) {
                            const updated = {
                                ...tractor,
                                assignedOperator: updatedData.assigned_operator ?? tractor.assignedOperator,
                                assignedPlant: updatedData.assigned_plant ?? tractor.assignedPlant,
                                cleanlinessRating: updatedData.cleanliness_rating ?? tractor.cleanlinessRating,
                                freight: updatedData.freight ?? tractor.freight,
                                hasBlower: updatedData.has_blower ?? tractor.hasBlower,
                                lastServiceDate: updatedData.last_service_date ?? tractor.lastServiceDate,
                                make: updatedData.make ?? tractor.make,
                                model: updatedData.model ?? tractor.model,
                                status: updatedData.status ?? tractor.status,
                                truckNumber: updatedData.truck_number ?? tractor.truckNumber,
                                updatedAt: updatedData.updated_at ?? tractor.updatedAt,
                                updatedBy: updatedData.updated_by ?? tractor.updatedBy,
                                updatedLast: updatedData.updated_last ?? tractor.updatedLast,
                                vin: updatedData.vin ?? tractor.vin,
                                year: updatedData.year ?? tractor.year
                            }
                            return attachIsVerified(updated)
                        }
                        return tractor
                    })
                )
                setAllTractors((prev) =>
                    prev.map((tractor) => {
                        if (tractor.id === updatedData.id) {
                            const updated = {
                                ...tractor,
                                assignedOperator: updatedData.assigned_operator ?? tractor.assignedOperator,
                                assignedPlant: updatedData.assigned_plant ?? tractor.assignedPlant,
                                cleanlinessRating: updatedData.cleanliness_rating ?? tractor.cleanlinessRating,
                                freight: updatedData.freight ?? tractor.freight,
                                hasBlower: updatedData.has_blower ?? tractor.hasBlower,
                                lastServiceDate: updatedData.last_service_date ?? tractor.lastServiceDate,
                                make: updatedData.make ?? tractor.make,
                                model: updatedData.model ?? tractor.model,
                                status: updatedData.status ?? tractor.status,
                                truckNumber: updatedData.truck_number ?? tractor.truckNumber,
                                updatedAt: updatedData.updated_at ?? tractor.updatedAt,
                                updatedBy: updatedData.updated_by ?? tractor.updatedBy,
                                updatedLast: updatedData.updated_last ?? tractor.updatedLast,
                                vin: updatedData.vin ?? tractor.vin,
                                year: updatedData.year ?? tractor.year
                            }
                            return attachIsVerified(updated)
                        }
                        return tractor
                    })
                )
            } else if (eventType === 'INSERT' && data.new) {
                const newData = data.new
                if (regionPlantCodes && !regionPlantCodes.has(newData.assigned_plant)) return
                const newTractor = attachIsVerified({
                    assignedOperator: newData.assigned_operator ?? '',
                    assignedPlant: newData.assigned_plant ?? '',
                    cleanlinessRating: newData.cleanliness_rating ?? 0,
                    createdAt: newData.created_at ?? new Date().toISOString(),
                    freight: newData.freight ?? '',
                    hasBlower: newData.has_blower ?? false,
                    id: newData.id,
                    lastServiceDate: newData.last_service_date ?? null,
                    make: newData.make ?? '',
                    model: newData.model ?? '',
                    status: newData.status ?? 'Active',
                    truckNumber: newData.truck_number ?? '',
                    updatedAt: newData.updated_at ?? new Date().toISOString(),
                    updatedBy: newData.updated_by ?? null,
                    updatedLast: newData.updated_last ?? new Date().toISOString(),
                    vin: newData.vin ?? '',
                    year: newData.year ?? ''
                })
                setTractors((prev) => {
                    if (prev.some((t) => t.id === newData.id)) return prev
                    return [...prev, newTractor]
                })
                setAllTractors((prev) => {
                    if (prev.some((t) => t.id === newData.id)) return prev
                    return [...prev, newTractor]
                })
            } else if (eventType === 'DELETE' && data.old) {
                setTractors((prev) => prev.filter((tractor) => tractor.id !== data.old.id))
                setAllTractors((prev) => prev.filter((tractor) => tractor.id !== data.old.id))
            }
        },
        [regionPlantCodes, attachIsVerified]
    )
    useEffect(() => {
        const channel = supabase
            .channel('tractors-realtime-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tractors' }, (payload) => {
                const eventType = payload.eventType
                const data = { new: payload.new, old: payload.old }
                handleRealtimeUpdate(eventType, data)
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error('Tractors realtime subscription error')
                }
            })
        return () => {
            supabase.removeChannel(channel)
        }
    }, [handleRealtimeUpdate])
    const loadDetailsForTractors = useCallback(async (tractorsList) => {
        if (!tractorsList || tractorsList.length === 0) return
        const tractorIds = tractorsList.map((t) => t.id).filter(Boolean)
        if (tractorIds.length === 0) return
        try {
            const [commentsCounts, issuesCounts] = await Promise.all([
                TractorService.fetchAllCommentsCounts(tractorIds),
                TractorService.fetchAllIssuesCounts(tractorIds)
            ])
            setTractors((prev) =>
                prev.map((t) => ({
                    ...t,
                    commentsCount: commentsCounts[t.id] || 0,
                    openIssuesCount: issuesCounts[t.id] || 0
                }))
            )
            setAllTractors((prev) =>
                prev.map((t) => ({
                    ...t,
                    commentsCount: commentsCounts[t.id] || 0,
                    openIssuesCount: issuesCounts[t.id] || 0
                }))
            )
        } catch (e) {
            console.error('Error loading tractor details:', e)
        }
    }, [])
    const operatorsRef = useRef(operators)
    operatorsRef.current = operators
    const regionCodeRef = useRef(preferences.selectedRegion?.code)
    regionCodeRef.current = preferences.selectedRegion?.code
    const runVerificationCheck = useCallback(
        async (tractorsToCheck) => {
            if (!tractorsToCheck || tractorsToCheck.length === 0) return
            try {
                const verificationResult = await CleanupUtility.verificationCheck(
                    tractorsToCheck,
                    TractorService.updateTractor,
                    'tractor',
                    operatorsRef.current
                )
                if (verificationResult.fixed > 0) {
                    const codes = await RegionService.getAllowedPlantCodes(regionCodeRef.current)
                    const refreshedTractors = await TractorService.fetchTractorsWithDetails(codes)
                    setTractors(refreshedTractors)
                    setAllTractors(refreshedTractors)
                    loadDetailsForTractors(refreshedTractors)
                }
            } catch (error) {}
        },
        [loadDetailsForTractors]
    )
    const fetchTractors = useCallback(
        async (codes) => {
            try {
                const processedBase = await TractorService.fetchTractorsWithDetails(codes)
                const cleanupResult = await TractorService.cleanupNullOperators(processedBase)
                setTractors(processedBase)
                setAllTractors(processedBase)
                setTractorsLoaded(true)
                loadDetailsForTractors(processedBase)
                if (cleanupResult.fixed > 0) {
                    setTimeout(async () => {
                        const refreshed = await TractorService.fetchTractorsWithDetails(codes)
                        setTractors(refreshed)
                        setAllTractors(refreshed)
                        loadDetailsForTractors(refreshed)
                        setTimeout(() => {
                            runVerificationCheck(refreshed)
                        }, 1000)
                    }, 500)
                } else {
                    setTimeout(() => {
                        runVerificationCheck(processedBase)
                    }, 1000)
                }
            } catch (error) {}
        },
        [loadDetailsForTractors, runVerificationCheck]
    )
    useEffect(() => {
        async function fetchAllData() {
            setIsLoading(true)
            try {
                const codes = await RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code)
                setRegionPlantCodes(codes)
                await Promise.all([fetchTractors(codes), fetchOperators(), fetchPlants(codes)])
            } finally {
                setIsLoading(false)
            }
        }
        fetchAllData()
        if (preferences?.tractorFilters) {
            setSearchText(preferences.tractorFilters.searchText || '')
            setSearchInput(preferences.tractorFilters.searchText || '')
            setSelectedPlant(preferences.tractorFilters.selectedPlant || '')
            setStatusFilter(preferences.tractorFilters.statusFilter || '')
            setFreightFilter(preferences.tractorFilters.freightFilter || '')
        }
        if (preferences.tractorFilters?.viewMode !== undefined && preferences.tractorFilters?.viewMode !== null) {
            setViewMode(preferences.tractorFilters.viewMode)
        } else if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) {
            setViewMode(preferences.defaultViewMode)
        } else {
            const lastUsed = localStorage.getItem('tractors_last_view_mode')
            if (lastUsed) setViewMode(lastUsed)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preferences])
    useEffect(() => {
        if (preferences.tractorFilters?.viewMode !== undefined && preferences.tractorFilters?.viewMode !== null)
            setViewMode(preferences.tractorFilters.viewMode)
        else if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null)
            setViewMode(preferences.defaultViewMode)
        else {
            const lastUsed = localStorage.getItem('tractors_last_view_mode')
            if (lastUsed) setViewMode(lastUsed)
        }
    }, [preferences.tractorFilters?.viewMode, preferences.defaultViewMode])
    useEffect(() => {
        let cancelled = false
        async function loadAllowedPlants() {
            setIsRegionLoading(!!preferences.selectedRegion?.code)
            try {
                const codes = await RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code)
                if (cancelled) return
                setRegionPlantCodes(codes)
                const sel = String(selectedPlant || '')
                    .trim()
                    .toUpperCase()
                if (sel && codes && !codes.has(sel)) {
                    setSelectedPlant('')
                    updateTractorFilterRef.current('selectedPlant', '')
                }
            } catch {
                if (!cancelled) setRegionPlantCodes(null)
            } finally {
                if (!cancelled) setIsRegionLoading(false)
            }
        }
        loadAllowedPlants()
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preferences.selectedRegion?.code])
    function handleViewModeChange(mode) {
        if (viewMode === mode) {
            setViewMode(null)
            updateTractorFilter('viewMode', null)
            localStorage.removeItem('tractors_last_view_mode')
        } else {
            setViewMode(mode)
            updateTractorFilter('viewMode', mode)
            localStorage.setItem('tractors_last_view_mode', mode)
        }
    }
    async function handleExportIssues() {
        setIsExportingIssues(true)
        try {
            await exportAssetIssuesSheet({
                assetType: 'Tractor',
                assets: allTractors,
                identifierField: 'truckNumber',
                plants,
                service: TractorService
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
    async function fetchOperators() {
        try {
            const data = await OperatorService.fetchOperators()
            setOperators(Array.isArray(data) ? data : [])
            setOperatorsLoaded(true)
        } catch (error) {
            setOperators([])
        }
    }
    async function fetchPlants(codes) {
        try {
            const data = await PlantService.fetchPlants(codes)
            setPlants(data)
        } catch (error) {}
    }
    const handleSelectTractor = useCallback(
        (tractorId) => {
            const tractor = tractors.find((m) => m.id === tractorId)
            if (tractor) {
                saveLastViewedFilters()
                setSelectedTractor(tractorId)
                onSelectTractor?.(tractorId)
            }
        },
        [tractors, saveLastViewedFilters, onSelectTractor]
    )
    const handleVerifyTractor = useCallback(
        async (tractorId) => {
            const tractor = tractors.find((t) => t.id === tractorId)
            if (tractor) {
                if (tractor.status === 'Retired') {
                    return
                }
                setVerifyTractor(tractor)
                setVerifyVin(tractor.vin || tractor.vinNumber || '')
                setVerifyMake(tractor.make || '')
                setVerifyModel(tractor.model || '')
                setVerifyYear(tractor.year || '')
                setVerifyLastServiceDate(tractor.lastServiceDate || null)
                setShowVerifyModal(true)
            }
        },
        [tractors]
    )
    const handleSaveAndVerify = useCallback(async () => {
        if (!verifyTractor) return
        try {
            const updates = {}
            if (verifyVin && verifyVin.trim() !== '' && verifyVin !== (verifyTractor.vin || '')) {
                updates.vin = verifyVin
            }
            if (verifyMake && verifyMake.trim() !== '' && verifyMake !== (verifyTractor.make || '')) {
                updates.make = verifyMake
            }
            if (verifyModel && verifyModel.trim() !== '' && verifyModel !== (verifyTractor.model || '')) {
                updates.model = verifyModel
            }
            if (verifyYear && String(verifyYear).trim() !== '' && verifyYear !== (verifyTractor.year || '')) {
                updates.year = verifyYear
            }
            if (verifyLastServiceDate && verifyLastServiceDate !== verifyTractor.lastServiceDate) {
                updates.lastServiceDate = verifyLastServiceDate
            }
            if (Object.keys(updates).length > 0) {
                await TractorService.updateTractor(verifyTractor.id, updates)
            }
            const verified = await TractorService.verifyTractor(verifyTractor.id)
            setTractors((prevTractors) => prevTractors.map((t) => (t.id === verifyTractor.id ? verified : t)))
            setAllTractors((prevTractors) => prevTractors.map((t) => (t.id === verifyTractor.id ? verified : t)))
            setShowVerifyModal(false)
            setVerifyTractor(null)
        } catch (error) {
            console.error('Failed to verify tractor:', error)
            alert('Failed to verify tractor. Please try again.')
        }
    }, [verifyTractor, verifyVin, verifyMake, verifyModel, verifyYear, verifyLastServiceDate])
    const filteredTractors = useMemo(() => {
        const filtered = tractors.filter((tractor) => {
            const normalizedSearch = searchText.trim().toLowerCase().replace(/\s+/g, '')
            let matchesSearch = true
            if (normalizedSearch) {
                if (exactMatch) {
                    const truckMatch = (tractor.truckNumber || '').toLowerCase() === normalizedSearch
                    matchesSearch = truckMatch
                } else {
                    const truckMatch = (tractor.truckNumber || '').toLowerCase().includes(normalizedSearch)
                    const operatorMatch =
                        tractor.assignedOperator &&
                        operators
                            .find((op) => op.employeeId === tractor.assignedOperator)
                            ?.name.toLowerCase()
                            .includes(normalizedSearch)
                    const vinRaw = (tractor.vinNumber || tractor.vin || '').toLowerCase()
                    const vinNoSpaces = vinRaw.replace(/\s+/g, '')
                    const vinMatch =
                        vinRaw.includes(searchText.trim().toLowerCase()) || vinNoSpaces.includes(normalizedSearch)
                    matchesSearch = truckMatch || operatorMatch || vinMatch
                }
            }
            const matchesPlant = !selectedPlant || selectedPlant === 'All' || tractor.assignedPlant === selectedPlant
            const matchesRegion =
                !regionPlantCodes ||
                regionPlantCodes.size === 0 ||
                regionPlantCodes.has(
                    String(tractor.assignedPlant || '')
                        .trim()
                        .toUpperCase()
                )
            let matchesStatus = true
            if (statusFilter && statusFilter !== 'All Statuses') {
                matchesStatus = ['Active', 'Spare', 'In Shop', 'Retired'].includes(statusFilter)
                    ? tractor.status === statusFilter
                    : statusFilter === 'Past Due Service'
                      ? TractorUtility.isServiceOverdue(tractor.lastServiceDate)
                      : statusFilter === 'Verified'
                        ? tractor.isVerified()
                        : statusFilter === 'Not Verified'
                          ? !tractor.isVerified() && tractor.status !== 'Retired'
                          : statusFilter === 'Open Issues'
                            ? Number(tractor.openIssuesCount || 0) > 0
                            : false
            }
            const matchesFreight = !freightFilter || tractor.freight === freightFilter
            return matchesSearch && matchesPlant && matchesRegion && matchesStatus && matchesFreight
        })
        return FleetUtility.sortWithRetiredLast(
            filtered,
            (a, b) => {
                if (!sortKey) {
                    return FleetUtility.compareByStatusThenNumber(a, b, 'status', 'truckNumber')
                }
                const prop = TRACTOR_SORT_MAPPINGS[sortKey]
                let aVal, bVal
                if (sortKey === 'Verified') {
                    aVal = a.status === 'Retired' ? 0 : a.isVerified() ? 2 : 1
                    bVal = b.status === 'Retired' ? 0 : b.isVerified() ? 2 : 1
                } else if (sortKey === 'Operator') {
                    aVal = operators.find((op) => op.employeeId === a.assignedOperator)?.name || ''
                    bVal = operators.find((op) => op.employeeId === b.assignedOperator)?.name || ''
                } else if (sortKey === 'Plant') {
                    aVal = plants.find((p) => p.code === a.assignedPlant)?.name || a.assignedPlant
                    bVal = plants.find((p) => p.code === b.assignedPlant)?.name || b.assignedPlant
                } else if (sortKey === 'Truck #') {
                    aVal = parseFloat(a.truckNumber) || 0
                    bVal = parseFloat(b.truckNumber) || 0
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
        tractors,
        operators,
        selectedPlant,
        searchText,
        statusFilter,
        freightFilter,
        regionPlantCodes,
        sortKey,
        sortDirection,
        plants,
        exactMatch
    ])
    const debouncedSetSearchText = useMemo(
        () =>
            AsyncUtility.debounce((value) => {
                setSearchText(value)
                updateTractorFilterRef.current('searchText', value)
            }, 300),
        []
    )
    const canShowUnassignedOverlay =
        tractorsLoaded && operatorsLoaded && !isLoading && unassignedActiveOperatorsCount > 0
    const showReset = searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses') || freightFilter
    useEffect(() => {
        function updateStickyCoverHeight() {
            const el = headerRef.current
            const h = el ? Math.ceil(el.getBoundingClientRect().height) : 0
            const root = document.querySelector('.global-dashboard-container.tractors-view')
            if (root && h) root.style.setProperty('--sticky-cover-height', h + 'px')
        }
        updateStickyCoverHeight()
        window.addEventListener('resize', updateStickyCoverHeight)
        return () => window.removeEventListener('resize', updateStickyCoverHeight)
    }, [viewMode, searchInput, selectedPlant, statusFilter, freightFilter])
    useEffect(() => {
        async function searchByVin() {
            const normalizedSearch = searchText.trim().toLowerCase().replace(/\s+/g, '')
            if (normalizedSearch.length >= 17 && /^[a-z0-9]+$/i.test(normalizedSearch)) {
                setIsLoading(true)
                try {
                    const vinTractors = await TractorService.searchTractorsByVinProcessed(normalizedSearch)
                    const filteredVinTractors = regionPlantCodes
                        ? vinTractors.filter((t) =>
                              regionPlantCodes.has(
                                  String(t.assignedPlant || '')
                                      .trim()
                                      .toUpperCase()
                              )
                          )
                        : vinTractors
                    setTractors(filteredVinTractors)
                    setTractorsLoaded(true)
                } catch {}
                setIsLoading(false)
            } else {
                setTractors(allTractors)
            }
        }
        if (searchText.trim().length >= 1) {
            searchByVin()
        } else {
            setTractors(allTractors)
        }
    }, [searchText, allTractors, regionPlantCodes])
    const content = useMemo(() => {
        if (isLoading || isRegionLoading) {
            return <AssetListSkeleton viewMode={viewMode} />
        }
        if (filteredTractors.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <i className="fas fa-tractor text-3xl text-slate-400"></i>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No Tractors Found</h3>
                    <p className="text-slate-500 mb-6 max-w-md">
                        {searchText ||
                        selectedPlant ||
                        (statusFilter && statusFilter !== 'All Statuses') ||
                        freightFilter
                            ? 'No tractors match your search criteria.'
                            : 'There are no tractors in the system yet.'}
                    </p>
                    <button
                        className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors"
                        onClick={() => setShowAddSheet(true)}
                    >
                        Add Tractor
                    </button>
                </div>
            )
        }
        if (viewMode === 'grid') {
            return (
                <GridViewModeSection
                    filteredItems={filteredTractors}
                    operators={operators}
                    plants={plants}
                    handleSelectItem={handleSelectTractor}
                    cardComponent={TractorCard}
                    itemPropName="tractor"
                    onShowCommentModal={(id, number) => {
                        setModalTractorId(id)
                        setModalTractorNumber(number)
                        setShowCommentModal(true)
                    }}
                    onShowIssueModal={(id, number) => {
                        setModalTractorId(id)
                        setModalTractorNumber(number)
                        setShowIssueModal(true)
                    }}
                    gridClassName="grid"
                />
            )
        }
        return (
            <ListViewModeSection
                filteredItems={filteredTractors}
                operators={operators}
                plants={plants}
                handleSelectItem={handleSelectTractor}
                listLabels={['Plant', 'Truck #', 'Status', 'Operator', 'Cleanliness', 'VIN', 'Verified', 'More']}
                colWidths={['10%', '12%', '12%', '18%', '12%', '16%', '10%', '10%']}
                renderRow={(item, handleSelect, onComment, onIssue, onVerify, onHistory, index, alternatingBg) => {
                    const operator = operators.find((op) => op.employeeId === item.assignedOperator)
                    const plant = plants.find((p) => p.code === item.assignedPlant)
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
                        color: 'var(--text-secondary)',
                        fontSize: '15px',
                        fontWeight: 700
                    }
                    const statusBadge = (status) => {
                        const base = 'inline-block rounded-2xl text-xs font-semibold px-3.5 py-1.5'
                        if (status === 'Active') return `${base} bg-[#dcfce7] text-[#166534]`
                        if (status === 'Spare') return `${base} bg-[#f3e8ff] text-[#7c3aed]`
                        if (status === 'In Shop') return `${base} bg-[#dbeafe] text-[#1e40af]`
                        return `${base} bg-[#f1f5f9] text-[#64748b]`
                    }
                    const verifyBtnStyle = (verified) => {
                        const base =
                            'inline-flex items-center border-none rounded-lg font-semibold whitespace-nowrap text-xs gap-1.5 px-3.5 py-2'
                        const colors = verified ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fef3c7] text-[#92400e]'
                        const cursor = verified ? 'cursor-default' : 'cursor-pointer'
                        return `${base} ${colors} ${cursor}`
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
                            <td style={{ ...cellStyle, width: '10%' }}>{plant?.name || item.assignedPlant}</td>
                            <td style={{ ...cellBoldStyle, width: '12%' }}>
                                <div style={{ alignItems: 'center', display: 'flex', gap: '6px' }}>
                                    {item.truckNumber}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            navigator.clipboard.writeText(item.truckNumber)
                                            const icon = e.currentTarget.querySelector('i')
                                            icon.className = 'fas fa-check'
                                            icon.style.color = '#22c55e'
                                            setTimeout(() => {
                                                icon.className = 'fas fa-copy'
                                                icon.style.color = ''
                                            }, 1500)
                                        }}
                                        title="Copy truck number"
                                        style={{
                                            alignItems: 'center',
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            fontSize: '12px',
                                            padding: '2px'
                                        }}
                                    >
                                        <i className="fas fa-copy"></i>
                                    </button>
                                </div>
                            </td>
                            <td style={{ ...cellStyle, width: '12%' }}>
                                <div>
                                    <span className={statusBadge(item.status)}>
                                        {item.status}
                                        {item.status !== 'Retired' &&
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
                                        itemType="tractor"
                                        currentStatus={item.status}
                                        createdAt={item.createdAt}
                                    />
                                </div>
                            </td>
                            <td style={{ ...cellStyle, width: '18%' }}>
                                {operator?.name ? (
                                    <div style={{ alignItems: 'center', display: 'flex', gap: '6px' }}>
                                        {operator.name}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                navigator.clipboard.writeText(operator.name)
                                                const icon = e.currentTarget.querySelector('i')
                                                icon.className = 'fas fa-check'
                                                icon.style.color = '#22c55e'
                                                setTimeout(() => {
                                                    icon.className = 'fas fa-copy'
                                                    icon.style.color = ''
                                                }, 1500)
                                            }}
                                            title="Copy operator name"
                                            style={{
                                                alignItems: 'center',
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                fontSize: '12px',
                                                padding: '2px'
                                            }}
                                        >
                                            <i className="fas fa-copy"></i>
                                        </button>
                                    </div>
                                ) : (
                                    <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                        Not Assigned
                                    </span>
                                )}
                            </td>
                            <td style={{ ...cellStyle, width: '12%' }}>
                                <div style={{ alignItems: 'center', display: 'flex', gap: '4px' }}>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <i
                                            key={i}
                                            className="fas fa-star"
                                            style={{
                                                color:
                                                    i < Math.round(item.cleanlinessRating || 0)
                                                        ? '#f59e0b'
                                                        : 'var(--border-light)',
                                                fontSize: '14px'
                                            }}
                                        ></i>
                                    ))}
                                </div>
                            </td>
                            <td
                                style={{
                                    ...cellStyle,
                                    color: 'var(--text-secondary)',
                                    fontFamily: 'ui-monospace, monospace',
                                    fontSize: '12px',
                                    width: '16%'
                                }}
                            >
                                {item.vinNumber || item.vin ? (
                                    <div style={{ alignItems: 'center', display: 'flex', gap: '6px' }}>
                                        {item.vinNumber || item.vin}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                navigator.clipboard.writeText(item.vinNumber || item.vin)
                                                const icon = e.currentTarget.querySelector('i')
                                                icon.className = 'fas fa-check'
                                                icon.style.color = '#22c55e'
                                                setTimeout(() => {
                                                    icon.className = 'fas fa-copy'
                                                    icon.style.color = ''
                                                }, 1500)
                                            }}
                                            title="Copy VIN"
                                            style={{
                                                alignItems: 'center',
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                fontSize: '12px',
                                                padding: '2px'
                                            }}
                                        >
                                            <i className="fas fa-copy"></i>
                                        </button>
                                    </div>
                                ) : (
                                    '-'
                                )}
                            </td>
                            <td style={{ ...cellStyle, width: '10%' }}>
                                {item.status === 'Retired' ? (
                                    <span
                                        style={{
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: '8px',
                                            color: 'var(--text-secondary)',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            padding: '8px 14px'
                                        }}
                                    >
                                        N/A
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (onVerify) onVerify(item.id, item.truckNumber)
                                        }}
                                        title={item.isVerified() ? 'Verified' : 'Click to verify'}
                                        className={verifyBtnStyle(item.isVerified())}
                                    >
                                        <i
                                            className={`fas ${item.isVerified() ? 'fa-check-circle' : 'fa-exclamation-circle'}`}
                                        ></i>
                                        <span>{item.isVerified() ? 'Verified' : 'Verify'}</span>
                                    </button>
                                )}
                            </td>
                            <td style={{ ...cellStyle, width: '10%' }}>
                                <div style={{ alignItems: 'center', display: 'flex' }}>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onComment(item.id, item.truckNumber)
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
                                            onIssue(item.id, item.truckNumber)
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
                                            setSelectedTractorForHistory(item)
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
                    setModalTractorId(id)
                    setModalTractorNumber(number)
                    setShowCommentModal(true)
                }}
                onShowIssueModal={(id, number) => {
                    setModalTractorId(id)
                    setModalTractorNumber(number)
                    setShowIssueModal(true)
                }}
                onVerify={handleVerifyTractor}
                containerClassName="list-table-container"
                tableClassName="list-table"
            />
        )
    }, [
        isLoading,
        isRegionLoading,
        filteredTractors,
        viewMode,
        searchText,
        selectedPlant,
        statusFilter,
        freightFilter,
        operators,
        plants,
        handleSelectTractor,
        handleVerifyTractor
    ])
    return (
        <>
            <div
                className={`global-dashboard-container dashboard-container global-flush-top flush-top tractors-view${selectedTractor ? ' detail-open' : ''}`}
            >
                {selectedTractor ? (
                    <TractorDetailView
                        tractorId={selectedTractor}
                        onClose={() => {
                            setSelectedTractor(null)
                            setIsLoading(true)
                            RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code).then((codes) =>
                                fetchTractors(codes).finally(() => setIsLoading(false))
                            )
                        }}
                    />
                ) : (
                    <>
                        <TopSection
                            isLoading={isLoading || isRegionLoading}
                            title={title}
                            badge={
                                canShowUnassignedOverlay
                                    ? `${unassignedActiveOperatorsCount} Unassigned Active Operator${unassignedActiveOperatorsCount !== 1 ? 's' : ''}`
                                    : null
                            }
                            onBadgeClick={
                                canShowUnassignedOverlay
                                    ? () => {
                                          setSelectedView('Operators', 'Unassigned Active', selectedPlant, 'Tractor')
                                          updateOperatorFilter('selectedPlant', selectedPlant)
                                          updateOperatorFilter('positionFilter', 'Tractor')
                                          updateOperatorFilter('statusFilter', 'Unassigned Active')
                                      }
                                    : null
                            }
                            addButtonLabel="Add Tractor"
                            onAddClick={() => setShowAddSheet(true)}
                            customActions={
                                <button
                                    className="hidden md:flex items-center gap-2 rounded-xl border-none px-4 py-3 text-sm font-semibold text-white cursor-pointer transition-all duration-150 disabled:opacity-50"
                                    style={{ backgroundColor: '#6b7280' }}
                                    onClick={handleExportIssues}
                                    disabled={isExportingIssues || allTractors.length === 0}
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
                            searchPlaceholder="Search by truck or operator..."
                            viewMode={viewMode}
                            onViewModeChange={handleViewModeChange}
                            plants={plants}
                            regionPlantCodes={regionPlantCodes}
                            selectedPlant={selectedPlant}
                            onSelectedPlantChange={(v) => {
                                setSelectedPlant(v)
                                updateTractorFilter('selectedPlant', v)
                            }}
                            statusFilter={statusFilter}
                            statusOptions={filterOptions}
                            onStatusFilterChange={(v) => {
                                setStatusFilter(v)
                                updateTractorFilter('statusFilter', v)
                            }}
                            freightFilter={freightFilter}
                            freightOptions={['All Freight', 'Cement', 'Aggregate', 'Dump Truck']}
                            onFreightFilterChange={(v) => {
                                setFreightFilter(v)
                                updateTractorFilter('freightFilter', v)
                            }}
                            showReset={showReset}
                            onReset={() => {
                                setSearchText('')
                                setSearchInput('')
                                setSelectedPlant('')
                                setStatusFilter('')
                                setFreightFilter('')
                                resetTractorFilters({ currentViewMode: viewMode, keepViewMode: true })
                            }}
                            listLabels={[
                                'Plant',
                                'Truck #',
                                'Status',
                                'Operator',
                                'Cleanliness',
                                'VIN',
                                'Verified',
                                'More'
                            ]}
                            colWidths={['10%', '12%', '12%', '18%', '12%', '16%', '10%', '10%']}
                            forwardedRef={headerRef}
                            onHeaderClick={handleHeaderClick}
                            sortKey={sortKey}
                            sortDirection={sortDirection}
                        />
                        <div className="global-content-container content-container">{content}</div>
                        {showAddSheet && (
                            <TractorAddView
                                plants={plants}
                                operators={operators}
                                onClose={() => setShowAddSheet(false)}
                                onTractorAdded={(newTractor) => setTractors([...tractors, newTractor])}
                            />
                        )}
                        {showCommentModal && (
                            <TractorCommentModal
                                tractorId={modalTractorId}
                                tractorNumber={modalTractorNumber}
                                onClose={() => setShowCommentModal(false)}
                            />
                        )}
                        {showIssueModal && (
                            <TractorIssueModal
                                tractorId={modalTractorId}
                                tractorNumber={modalTractorNumber}
                                onClose={() => setShowIssueModal(false)}
                            />
                        )}
                        {showHistoryModal && selectedTractorForHistory && (
                            <HistoryViewSection
                                item={selectedTractorForHistory}
                                type="tractor"
                                onClose={() => setShowHistoryModal(false)}
                            />
                        )}
                        {showVerifyModal && verifyTractor && (
                            <VerificationRequirementsModal
                                open={showVerifyModal}
                                onClose={() => {
                                    setShowVerifyModal(false)
                                    setVerifyTractor(null)
                                }}
                                onSaveAndVerify={handleSaveAndVerify}
                                missingFields={[
                                    ...(!verifyTractor.vin || !ValidationUtility.isVIN(verifyTractor.vin)
                                        ? ['VIN']
                                        : []),
                                    ...(!verifyTractor.make ? ['Make'] : []),
                                    ...(!verifyTractor.model ? ['Model'] : []),
                                    ...(!verifyTractor.year ? ['Year'] : [])
                                ]}
                                vin={verifyVin}
                                make={verifyMake}
                                model={verifyModel}
                                year={verifyYear}
                                lastServiceDate={verifyLastServiceDate}
                                setVin={setVerifyVin}
                                setMake={setVerifyMake}
                                setModel={setVerifyModel}
                                setYear={setVerifyYear}
                                setLastServiceDate={setVerifyLastServiceDate}
                                isServiceOverdue={TractorUtility.isServiceOverdue}
                                assignedOperator={verifyTractor.assignedOperator}
                                itemType="tractor"
                                itemId={verifyTractor.id}
                                service={TractorService}
                                status={verifyTractor.status}
                            />
                        )}
                    </>
                )}
            </div>
        </>
    )
}
export default TractorsView
