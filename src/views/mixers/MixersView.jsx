import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { usePreferences } from '../../app/context/PreferencesContext'
import LoadingScreen from '../../components/common/LoadingScreen'
import VerificationRequirementsModal from '../../components/common/VerificationRequirementsModal'
import GridViewModeSection from '../../components/sections/GridViewModeSection'
import HistoryViewSection from '../../components/sections/HistoryViewSection'
import ListViewModeSection from '../../components/sections/ListViewModeSection'
import RecapModalSection from '../../components/sections/RecapModalSection'
import TopSection from '../../components/sections/TopSection'
import { supabase } from '../../services/DatabaseService'
import { MixerService } from '../../services/MixerService'
import { OperatorService } from '../../services/OperatorService'
import { PlantService } from '../../services/PlantService'
import { RegionService } from '../../services/RegionService'
import AsyncUtility from '../../utils/AsyncUtility'
import CleanupUtility from '../../utils/CleanupUtility'
import FleetUtility from '../../utils/FleetUtility'
import FormatUtility from '../../utils/FormatUtility'
import MixerUtility from '../../utils/MixerUtility'
import { ValidationUtility } from '../../utils/ValidationUtility'
import MixerAddView from './MixerAddView'
import MixerCard from './MixerCard'
import MixerCommentModal from './MixerCommentModal'
import MixerDetailView from './MixerDetailView'
import MixerIssueModal from './MixerIssueModal'

function MixersView({
    title = 'Mixer Fleet',
    onSelectMixer,
    setSelectedView,
    embedded = false,
    initialSearch = '',
    exactMatch = false
}) {
    const { preferences, updateMixerFilter, resetMixerFilters, saveLastViewedFilters, updateOperatorFilter } =
        usePreferences()
    const headerRef = useRef(null)
    const [mixers, setMixers] = useState([])
    const [allMixers, setAllMixers] = useState([])
    const [operators, setOperators] = useState([])
    const [plants, setPlants] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRegionLoading, setIsRegionLoading] = useState(false)
    const [searchText, setSearchText] = useState(
        initialSearch ? initialSearch : embedded ? '' : preferences.mixerFilters?.searchText || ''
    )
    const [searchInput, setSearchInput] = useState(
        initialSearch ? initialSearch : embedded ? '' : preferences.mixerFilters?.searchText || ''
    )
    const [selectedPlant, setSelectedPlant] = useState(embedded ? '' : preferences.mixerFilters?.selectedPlant || '')
    const [statusFilter, setStatusFilter] = useState(embedded ? '' : preferences.mixerFilters?.statusFilter || '')
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [selectedMixer, setSelectedMixer] = useState(null)
    const [viewMode, setViewMode] = useState(() => {
        if (embedded) return 'list'
        if (preferences.mixerFilters?.viewMode !== undefined && preferences.mixerFilters?.viewMode !== null)
            return preferences.mixerFilters.viewMode
        if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null)
            return preferences.defaultViewMode
        const lastUsed = localStorage.getItem('mixers_last_view_mode')
        return lastUsed || 'grid'
    })
    const [showIssueModal, setShowIssueModal] = useState(false)
    const [showCommentModal, setShowCommentModal] = useState(false)
    const [modalMixerId, setModalMixerId] = useState(null)
    const [modalMixerNumber, setModalMixerNumber] = useState('')
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [mixersLoaded, setMixersLoaded] = useState(false)
    const [operatorsLoaded, setOperatorsLoaded] = useState(false)
    const [sortKey, setSortKey] = useState('')
    const [sortDirection, setSortDirection] = useState('asc')
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [selectedMixerForHistory, setSelectedMixerForHistory] = useState(null)
    const [showVerifyModal, setShowVerifyModal] = useState(false)
    const [verifyMixer, setVerifyMixer] = useState(null)
    const [verifyVin, setVerifyVin] = useState('')
    const [verifyMake, setVerifyMake] = useState('')
    const [verifyModel, setVerifyModel] = useState('')
    const [verifyYear, setVerifyYear] = useState('')
    const [verifyLastServiceDate, setVerifyLastServiceDate] = useState(null)
    const [verifyLastChipDate, setVerifyLastChipDate] = useState(null)
    const filterOptions = [
        'All Statuses',
        'Active',
        'Spare',
        'In Shop',
        'Waiting For Shop',
        'Down In Yard',
        'Third Party Work',
        'Retired',
        'Past Due Service',
        'Verified',
        'Not Verified',
        'Open Issues'
    ]
    const sortMappings = {
        Cleanliness: 'cleanlinessRating',
        More: null,
        Operator: 'assignedOperator',
        Plant: 'assignedPlant',
        Status: 'status',
        'Truck #': 'status',
        VIN: 'vinNumber',
        Verified: null
    }

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
            FleetUtility.countUnassignedActiveOperators(mixers, operators, searchText, {
                assignedOperatorField: 'assignedOperator',
                assignedPlantField: 'assignedPlant',
                operatorIdField: 'employeeId',
                position: 'Mixer Operator',
                regionPlantCodes,
                selectedPlant
            }),
        [operators, mixers, selectedPlant, searchText, regionPlantCodes]
    )

    const attachIsVerified = useCallback((obj) => {
        if (!obj) return obj
        obj.isVerified = function (latestHistoryDate) {
            return MixerUtility.isVerified(
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
                setMixers((prev) =>
                    prev.map((mixer) => {
                        if (mixer.id === updatedData.id) {
                            const updated = {
                                ...mixer,
                                assignedOperator: updatedData.assigned_operator ?? mixer.assignedOperator,
                                assignedPlant: updatedData.assigned_plant ?? mixer.assignedPlant,
                                cleanlinessRating: updatedData.cleanliness_rating ?? mixer.cleanlinessRating,
                                lastChipDate: updatedData.last_chip_date ?? mixer.lastChipDate,
                                lastServiceDate: updatedData.last_service_date ?? mixer.lastServiceDate,
                                make: updatedData.make ?? mixer.make,
                                model: updatedData.model ?? mixer.model,
                                shopStatus: updatedData.shop_status ?? mixer.shopStatus,
                                status: updatedData.status ?? mixer.status,
                                truckNumber: updatedData.truck_number ?? mixer.truckNumber,
                                updatedAt: updatedData.updated_at ?? mixer.updatedAt,
                                updatedBy: updatedData.updated_by ?? mixer.updatedBy,
                                updatedLast: updatedData.updated_last ?? mixer.updatedLast,
                                vin: updatedData.vin ?? mixer.vin,
                                year: updatedData.year ?? mixer.year
                            }
                            return attachIsVerified(updated)
                        }
                        return mixer
                    })
                )
                setAllMixers((prev) =>
                    prev.map((mixer) => {
                        if (mixer.id === updatedData.id) {
                            const updated = {
                                ...mixer,
                                assignedOperator: updatedData.assigned_operator ?? mixer.assignedOperator,
                                assignedPlant: updatedData.assigned_plant ?? mixer.assignedPlant,
                                cleanlinessRating: updatedData.cleanliness_rating ?? mixer.cleanlinessRating,
                                lastChipDate: updatedData.last_chip_date ?? mixer.lastChipDate,
                                lastServiceDate: updatedData.last_service_date ?? mixer.lastServiceDate,
                                make: updatedData.make ?? mixer.make,
                                model: updatedData.model ?? mixer.model,
                                shopStatus: updatedData.shop_status ?? mixer.shopStatus,
                                status: updatedData.status ?? mixer.status,
                                truckNumber: updatedData.truck_number ?? mixer.truckNumber,
                                updatedAt: updatedData.updated_at ?? mixer.updatedAt,
                                updatedBy: updatedData.updated_by ?? mixer.updatedBy,
                                updatedLast: updatedData.updated_last ?? mixer.updatedLast,
                                vin: updatedData.vin ?? mixer.vin,
                                year: updatedData.year ?? mixer.year
                            }
                            return attachIsVerified(updated)
                        }
                        return mixer
                    })
                )
            } else if (eventType === 'INSERT' && data.new) {
                const newData = data.new
                if (regionPlantCodes && !regionPlantCodes.has(newData.assigned_plant)) return
                const newMixer = attachIsVerified({
                    assignedOperator: newData.assigned_operator ?? '',
                    assignedPlant: newData.assigned_plant ?? '',
                    cleanlinessRating: newData.cleanliness_rating ?? 0,
                    createdAt: newData.created_at ?? new Date().toISOString(),
                    id: newData.id,
                    lastChipDate: newData.last_chip_date ?? null,
                    lastServiceDate: newData.last_service_date ?? null,
                    make: newData.make ?? '',
                    model: newData.model ?? '',
                    shopStatus: newData.shop_status ?? null,
                    status: newData.status ?? 'Active',
                    truckNumber: newData.truck_number ?? '',
                    updatedAt: newData.updated_at ?? new Date().toISOString(),
                    updatedBy: newData.updated_by ?? null,
                    updatedLast: newData.updated_last ?? new Date().toISOString(),
                    vin: newData.vin ?? '',
                    year: newData.year ?? ''
                })
                setMixers((prev) => {
                    if (prev.some((m) => m.id === newData.id)) return prev
                    return [...prev, newMixer]
                })
                setAllMixers((prev) => {
                    if (prev.some((m) => m.id === newData.id)) return prev
                    return [...prev, newMixer]
                })
            } else if (eventType === 'DELETE' && data.old) {
                setMixers((prev) => prev.filter((mixer) => mixer.id !== data.old.id))
                setAllMixers((prev) => prev.filter((mixer) => mixer.id !== data.old.id))
            }
        },
        [regionPlantCodes, attachIsVerified]
    )

    useEffect(() => {
        const channel = supabase
            .channel('mixers-realtime-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'mixers' }, (payload) => {
                const eventType = payload.eventType
                const data = { new: payload.new, old: payload.old }
                handleRealtimeUpdate(eventType, data)
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error('Realtime subscription error')
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
                await Promise.all([fetchMixersWithDetails(codes), fetchOperators(), fetchPlants(codes)])
            } finally {
                setIsLoading(false)
            }
        }

        fetchAllData()
        if (preferences?.mixerFilters) {
            setSearchText(preferences.mixerFilters.searchText || '')
            setSearchInput(preferences.mixerFilters.searchText || '')
            setSelectedPlant(preferences.mixerFilters.selectedPlant || '')
            setStatusFilter(preferences.mixerFilters.statusFilter || '')
        }
        if (preferences.mixerFilters?.viewMode !== undefined && preferences.mixerFilters?.viewMode !== null) {
            setViewMode(preferences.mixerFilters.viewMode)
        } else if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) {
            setViewMode(preferences.defaultViewMode)
        } else {
            const lastUsed = localStorage.getItem('mixers_last_view_mode')
            if (lastUsed) setViewMode(lastUsed)
        }
    }, [preferences])

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
                    updateMixerFilter('selectedPlant', '')
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
    }, [preferences.selectedRegion?.code])

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

    const loadDetailsForMixers = async (mixersList) => {
        if (!mixersList || mixersList.length === 0) return
        const mixerIds = mixersList.map((m) => m.id).filter(Boolean)
        if (mixerIds.length === 0) return

        try {
            const [commentsCounts, issuesCounts] = await Promise.all([
                MixerService.fetchAllCommentsCounts(mixerIds),
                MixerService.fetchAllIssuesCounts(mixerIds)
            ])

            setMixers((prev) =>
                prev.map((m) => ({
                    ...m,
                    commentsCount: commentsCounts[m.id] || 0,
                    openIssuesCount: issuesCounts[m.id] || 0
                }))
            )
            setAllMixers((prev) =>
                prev.map((m) => ({
                    ...m,
                    commentsCount: commentsCounts[m.id] || 0,
                    openIssuesCount: issuesCounts[m.id] || 0
                }))
            )
        } catch (e) {
            console.error('Error loading mixer details:', e)
        }
    }

    async function fetchMixersWithDetails(codes) {
        try {
            const processedBase = await MixerService.fetchMixersWithDetails(codes)

            const cleanupResult = await MixerService.cleanupNullOperators(processedBase)

            if (cleanupResult.fixed > 0) {
                const refreshedMixers = await MixerService.fetchMixersWithDetails(codes)
                setMixers(refreshedMixers)
                setAllMixers(refreshedMixers)
                setMixersLoaded(true)
                loadDetailsForMixers(refreshedMixers)

                setTimeout(() => {
                    runVerificationCheck(refreshedMixers)
                }, 1000)
            } else {
                setMixers(processedBase)
                setAllMixers(processedBase)
                setMixersLoaded(true)
                loadDetailsForMixers(processedBase)

                setTimeout(() => {
                    runVerificationCheck(processedBase)
                }, 1000)
            }
        } catch (error) {
            console.error('[MIXERS VIEW] Error fetching mixers:', error)
        }
    }

    async function runVerificationCheck(mixersToCheck) {
        if (!mixersToCheck || mixersToCheck.length === 0) return

        try {
            const verificationResult = await CleanupUtility.verificationCheck(
                mixersToCheck,
                MixerService.updateMixer,
                'mixer',
                operators
            )

            if (verificationResult.fixed > 0) {
                const codes = await RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code)
                const refreshedMixers = await MixerService.fetchMixersWithDetails(codes)
                setMixers(refreshedMixers)
                setAllMixers(refreshedMixers)
                loadDetailsForMixers(refreshedMixers)
            }
        } catch (error) {}
    }

    function handleSelectMixer(mixerId) {
        const mixer = mixers.find((m) => m.id === mixerId)
        if (mixer) {
            saveLastViewedFilters()
            setSelectedMixer(mixer)
            onSelectMixer?.(mixerId)
        }
    }

    function handleViewModeChange(mode) {
        if (viewMode === mode) {
            setViewMode(null)
            updateMixerFilter('viewMode', null)
            localStorage.removeItem('mixers_last_view_mode')
        } else {
            setViewMode(mode)
            updateMixerFilter('viewMode', mode)
            localStorage.setItem('mixers_last_view_mode', mode)
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

    const handleVerifyMixer = useCallback(
        async (mixerId) => {
            const mixer = mixers.find((m) => m.id === mixerId)
            if (mixer) {
                if (mixer.status === 'Retired') {
                    return
                }
                setVerifyMixer(mixer)
                setVerifyVin(mixer.vin || mixer.vinNumber || '')
                setVerifyMake(mixer.make || '')
                setVerifyModel(mixer.model || '')
                setVerifyYear(mixer.year || '')
                setVerifyLastServiceDate(mixer.lastServiceDate || null)
                setVerifyLastChipDate(mixer.lastChipDate || null)
                setShowVerifyModal(true)
            }
        },
        [mixers]
    )

    const handleSaveAndVerify = useCallback(async () => {
        if (!verifyMixer) return

        try {
            const updates = {}
            if (verifyVin && verifyVin.trim() !== '' && verifyVin !== (verifyMixer.vin || '')) {
                updates.vin = verifyVin
            }
            if (verifyMake && verifyMake.trim() !== '' && verifyMake !== (verifyMixer.make || '')) {
                updates.make = verifyMake
            }
            if (verifyModel && verifyModel.trim() !== '' && verifyModel !== (verifyMixer.model || '')) {
                updates.model = verifyModel
            }
            if (verifyYear && String(verifyYear).trim() !== '' && verifyYear !== (verifyMixer.year || '')) {
                updates.year = verifyYear
            }
            if (verifyLastServiceDate && verifyLastServiceDate !== verifyMixer.lastServiceDate) {
                updates.lastServiceDate = verifyLastServiceDate
            }
            if (verifyLastChipDate && verifyLastChipDate !== verifyMixer.lastChipDate) {
                updates.lastChipDate = verifyLastChipDate
            }

            if (Object.keys(updates).length > 0) {
                await MixerService.updateMixer(verifyMixer.id, updates)
            }

            const verified = await MixerService.verifyMixer(verifyMixer.id)

            setMixers((prevMixers) => prevMixers.map((m) => (m.id === verifyMixer.id ? verified : m)))
            setAllMixers((prevMixers) => prevMixers.map((m) => (m.id === verifyMixer.id ? verified : m)))

            setShowVerifyModal(false)
            setVerifyMixer(null)
        } catch (error) {
            console.error('Failed to verify mixer:', error)
            alert('Failed to verify mixer. Please try again.')
        }
    }, [verifyMixer, verifyVin, verifyMake, verifyModel, verifyYear, verifyLastServiceDate, verifyLastChipDate])

    useEffect(() => {
        async function searchByVin() {
            const normalizedSearch = searchText.trim().toLowerCase().replace(/\s+/g, '')
            if (normalizedSearch.length >= 17 && /^[a-z0-9]+$/i.test(normalizedSearch)) {
                setIsLoading(true)
                try {
                    const vinMixers = await MixerService.searchMixersByVinProcessed(normalizedSearch)
                    const filteredVinMixers = regionPlantCodes
                        ? vinMixers.filter((m) =>
                              regionPlantCodes.has(
                                  String(m.assignedPlant || '')
                                      .trim()
                                      .toUpperCase()
                              )
                          )
                        : vinMixers
                    setMixers(filteredVinMixers)
                    setMixersLoaded(true)
                } catch {}
                setIsLoading(false)
            } else {
                setMixers(allMixers)
            }
        }

        if (searchText.trim().length >= 1) {
            searchByVin()
        } else {
            setMixers(allMixers)
        }
    }, [searchText, allMixers, regionPlantCodes])

    const filteredOperatorsForRecap = useMemo(() => {
        return operators.filter((op) => {
            if (op.position !== 'Mixer Operator') return false
            const opPlant = op.plantCode || op.assignedPlant || ''
            if (!selectedPlant)
                return (
                    !regionPlantCodes ||
                    regionPlantCodes.size === 0 ||
                    regionPlantCodes.has(String(opPlant).trim().toUpperCase())
                )
            return String(opPlant) === String(selectedPlant)
        })
    }, [operators, selectedPlant, regionPlantCodes])

    const filteredMixers = useMemo(() => {
        const filtered = mixers.filter((mixer) => {
            const normalizedSearch = searchText.trim().toLowerCase().replace(/\s+/g, '')
            let matchesSearch = true
            if (normalizedSearch) {
                if (exactMatch) {
                    const truckMatch = (mixer.truckNumber || '').toLowerCase() === normalizedSearch
                    matchesSearch = truckMatch
                } else {
                    const truckMatch = (mixer.truckNumber || '').toLowerCase().includes(normalizedSearch)
                    const operatorMatch =
                        mixer.assignedOperator &&
                        operators
                            .find((op) => op.employeeId === mixer.assignedOperator)
                            ?.name.toLowerCase()
                            .includes(normalizedSearch)
                    const vinRaw = (mixer.vinNumber || mixer.vin || '').toLowerCase()
                    const vinNoSpaces = vinRaw.replace(/\s+/g, '')
                    const vinMatch =
                        vinRaw.includes(searchText.trim().toLowerCase()) || vinNoSpaces.includes(normalizedSearch)
                    matchesSearch = truckMatch || operatorMatch || vinMatch
                }
            }
            const matchesPlant = !selectedPlant || mixer.assignedPlant === selectedPlant
            const matchesRegion =
                !regionPlantCodes ||
                regionPlantCodes.size === 0 ||
                regionPlantCodes.has(
                    String(mixer.assignedPlant || '')
                        .trim()
                        .toUpperCase()
                )
            let matchesStatus = true
            if (statusFilter && statusFilter !== 'All Statuses') {
                matchesStatus =
                    statusFilter === 'Down In Yard'
                        ? mixer.status === 'In Shop' && mixer.shopStatus === 'down_in_yard'
                        : statusFilter === 'Waiting For Shop'
                          ? mixer.status === 'In Shop' && mixer.shopStatus === 'waiting_for_shop'
                          : statusFilter === 'Third Party Work'
                            ? mixer.status === 'In Shop' && mixer.shopStatus === 'third_party'
                            : statusFilter === 'In Shop'
                              ? mixer.status === 'In Shop' && (mixer.shopStatus === 'in_shop' || !mixer.shopStatus)
                              : ['Active', 'Spare', 'Retired'].includes(statusFilter)
                                ? mixer.status === statusFilter
                                : statusFilter === 'Past Due Service'
                                  ? MixerUtility.isServiceOverdue(mixer.lastServiceDate)
                                  : statusFilter === 'Verified'
                                    ? mixer.isVerified()
                                    : statusFilter === 'Not Verified'
                                      ? !mixer.isVerified() && mixer.status !== 'Retired'
                                      : statusFilter === 'Open Issues'
                                        ? Number(mixer.openIssuesCount || 0) > 0
                                        : false
            }
            return matchesSearch && matchesPlant && matchesRegion && matchesStatus
        })

        return FleetUtility.sortWithRetiredLast(
            filtered,
            (a, b) => {
                if (!sortKey) {
                    return FleetUtility.compareByStatusThenNumber(a, b, 'status', 'truckNumber')
                }
                const prop = sortMappings[sortKey]
                let aVal, bVal
                if (sortKey === 'Status') {
                    const getStatusOrder = (item) => {
                        if (item.status === 'Active') return 1
                        if (item.status === 'Spare') return 2
                        if (item.status === 'In Shop') {
                            if (item.shopStatus === 'in_shop' || !item.shopStatus) return 3
                            if (item.shopStatus === 'waiting_for_shop') return 4
                            if (item.shopStatus === 'down_in_yard') return 5
                            if (item.shopStatus === 'third_party') return 6
                        }
                        if (item.status === 'Retired') return 7
                        return 8
                    }
                    const aOrder = getStatusOrder(a)
                    const bOrder = getStatusOrder(b)
                    if (aOrder !== bOrder) {
                        return sortDirection === 'asc' ? aOrder - bOrder : bOrder - aOrder
                    }
                    if (
                        (a.status === 'In Shop' || a.status === 'Spare') &&
                        (b.status === 'In Shop' || b.status === 'Spare')
                    ) {
                        const aDays = a.statusChangedAt
                            ? Math.floor((Date.now() - new Date(a.statusChangedAt).getTime()) / 86400000)
                            : 0
                        const bDays = b.statusChangedAt
                            ? Math.floor((Date.now() - new Date(b.statusChangedAt).getTime()) / 86400000)
                            : 0
                        if (aDays !== bDays) {
                            return sortDirection === 'asc' ? aDays - bDays : bDays - aDays
                        }
                    }
                    return 0
                } else if (sortKey === 'Verified') {
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
        mixers,
        operators,
        selectedPlant,
        searchText,
        statusFilter,
        regionPlantCodes,
        sortKey,
        sortDirection,
        plants,
        exactMatch
    ])

    const debouncedSetSearchText = useCallback(
        AsyncUtility.debounce((value) => {
            setSearchText(value)
            updateMixerFilter('searchText', value)
        }, 300),
        []
    )

    const canShowUnassignedOverlay = mixersLoaded && operatorsLoaded && !isLoading && unassignedActiveOperatorsCount > 0

    const content = useMemo(() => {
        if (isLoading || isRegionLoading) {
            return (
                <div className="global-loading-container loading-container">
                    <LoadingScreen message="Loading mixers..." inline={true} />
                </div>
            )
        }
        if (filteredMixers.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <i className="fas fa-truck text-3xl text-slate-400"></i>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No Mixers Found</h3>
                    <p className="text-slate-500 mb-6 max-w-md">
                        {searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses')
                            ? 'No mixers match your search criteria.'
                            : 'There are no mixers in the system yet.'}
                    </p>
                    <button
                        className="px-5 py-2.5 bg-[#1e3a5f] hover:bg-[#152d4a] text-white font-semibold rounded-lg transition-colors"
                        onClick={() => setShowAddSheet(true)}
                    >
                        Add Mixer
                    </button>
                </div>
            )
        }
        if (viewMode === 'grid') {
            return (
                <GridViewModeSection
                    filteredItems={filteredMixers}
                    operators={operators}
                    plants={plants}
                    handleSelectItem={handleSelectMixer}
                    cardComponent={MixerCard}
                    itemPropName="mixer"
                    onShowCommentModal={(id, number) => {
                        setModalMixerId(id)
                        setModalMixerNumber(number)
                        setShowCommentModal(true)
                    }}
                    onShowIssueModal={(id, number) => {
                        setModalMixerId(id)
                        setModalMixerNumber(number)
                        setShowIssueModal(true)
                    }}
                    gridClassName="grid"
                />
            )
        }
        return (
            <ListViewModeSection
                filteredItems={filteredMixers}
                handleSelectItem={handleSelectMixer}
                headerLabels={['Plant', 'Truck #', 'Status', 'Operator', 'Cleanliness', 'VIN', 'Verified', 'More']}
                colWidths={['10%', '12%', '12%', '18%', '12%', '16%', '10%', '10%']}
                renderRow={(item, handleSelect, onComment, onIssue, onVerify, onHistory, index, alternatingBg) => {
                    const operator = operators.find((op) => op.employeeId === item.assignedOperator)
                    const plant = plants.find((p) => p.code === item.assignedPlant)
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
                        } else if (status === 'Waiting For Shop') {
                            bg = '#fff7ed'
                            color = '#c2410c'
                        } else if (status === 'Down In Yard') {
                            bg = '#fef2f2'
                            color = '#991b1b'
                        } else if (status === 'Third Party Work') {
                            bg = '#f3e8ff'
                            color = '#7c3aed'
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
                    const verifyBtnStyle = (verified) => ({
                        alignItems: 'center',
                        backgroundColor: verified ? '#dcfce7' : '#fef3c7',
                        border: 'none',
                        borderRadius: '8px',
                        color: verified ? '#166534' : '#92400e',
                        cursor: verified ? 'default' : 'pointer',
                        display: 'inline-flex',
                        fontSize: '12px',
                        fontWeight: 600,
                        gap: '6px',
                        padding: '8px 14px'
                    })
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
                                                icon.style.color = '#94a3b8'
                                            }, 1500)
                                        }}
                                        title="Copy truck number"
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
                                </div>
                            </td>
                            <td style={{ ...cellStyle, width: '12%' }}>
                                <span
                                    style={statusBadge(
                                        (() => {
                                            if (item.status !== 'In Shop') return item.status
                                            switch (item.shopStatus) {
                                                case 'down_in_yard':
                                                    return 'Down In Yard'
                                                case 'waiting_for_shop':
                                                    return 'Waiting For Shop'
                                                case 'third_party':
                                                    return 'Third Party Work'
                                                case 'in_shop':
                                                default:
                                                    return 'In Shop'
                                            }
                                        })()
                                    )}
                                >
                                    {(() => {
                                        if (item.status !== 'In Shop') return item.status
                                        switch (item.shopStatus) {
                                            case 'down_in_yard':
                                                return 'Down In Yard'
                                            case 'waiting_for_shop':
                                                return 'Waiting For Shop'
                                            case 'third_party':
                                                return 'Third Party Work'
                                            case 'in_shop':
                                            default:
                                                return 'In Shop'
                                        }
                                    })()}
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
                                                const btn = e.currentTarget
                                                const icon = btn.querySelector('i')
                                                if (icon) {
                                                    icon.className = 'fas fa-check'
                                                    icon.style.color = '#22c55e'
                                                    setTimeout(() => {
                                                        icon.className = 'fas fa-copy'
                                                        icon.style.color = '#94a3b8'
                                                    }, 1500)
                                                }
                                            }}
                                            title="Copy operator name"
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
                                    </div>
                                ) : (
                                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not Assigned</span>
                                )}
                            </td>
                            <td style={{ ...cellStyle, width: '12%' }}>
                                {item.status === 'Retired' ? (
                                    <span style={{ color: '#94a3b8' }}>N/A</span>
                                ) : (
                                    <div style={{ alignItems: 'center', display: 'flex', gap: '4px' }}>
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <i
                                                key={i}
                                                className="fas fa-star"
                                                style={{
                                                    color:
                                                        i < Math.round(item.cleanlinessRating || 0)
                                                            ? '#f59e0b'
                                                            : '#e5e7eb',
                                                    fontSize: '14px'
                                                }}
                                            ></i>
                                        ))}
                                        {item.cleanlinessRating && item.cleanlinessRating < 3 && (
                                            <span
                                                style={{
                                                    backgroundColor: '#dc2626',
                                                    borderRadius: '4px',
                                                    color: 'white',
                                                    fontSize: '10px',
                                                    fontWeight: 700,
                                                    marginLeft: '8px',
                                                    padding: '3px 8px'
                                                }}
                                            >
                                                DOWNED
                                            </span>
                                        )}
                                    </div>
                                )}
                            </td>
                            <td
                                style={{
                                    ...cellStyle,
                                    color: '#64748b',
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
                                    </div>
                                ) : (
                                    '-'
                                )}
                            </td>
                            <td style={{ ...cellStyle, width: '10%' }}>
                                {item.status === 'Retired' ? (
                                    <span
                                        style={{
                                            backgroundColor: '#f1f5f9',
                                            borderRadius: '8px',
                                            color: '#94a3b8',
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
                                        style={verifyBtnStyle(item.isVerified())}
                                    >
                                        <i
                                            className={`fas ${item.isVerified() ? 'fa-check-circle' : 'fa-exclamation-circle'}`}
                                            style={{ color: item.isVerified() ? '#166534' : '#92400e' }}
                                        ></i>
                                        <span style={{ color: item.isVerified() ? '#166534' : '#92400e' }}>
                                            {item.isVerified() ? 'Verified' : 'Verify'}
                                        </span>
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
                                            setSelectedMixerForHistory(item)
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
                    setModalMixerId(id)
                    setModalMixerNumber(number)
                    setShowCommentModal(true)
                }}
                onShowIssueModal={(id, number) => {
                    setModalMixerId(id)
                    setModalMixerNumber(number)
                    setShowIssueModal(true)
                }}
                onVerify={handleVerifyMixer}
                containerClassName="list-table-container"
                tableClassName="list-table"
            />
        )
    }, [
        isLoading,
        isRegionLoading,
        filteredMixers,
        viewMode,
        searchText,
        selectedPlant,
        statusFilter,
        operators,
        plants,
        mixers,
        handleVerifyMixer
    ])

    useEffect(() => {
        function updateStickyCoverHeight() {
            const el = headerRef.current
            const h = el ? Math.ceil(el.getBoundingClientRect().height) : 0
            const root = document.querySelector('.global-dashboard-container.mixers-view')
            if (root && h) root.style.setProperty('--sticky-cover-height', h + 'px')
        }

        updateStickyCoverHeight()
        window.addEventListener('resize', updateStickyCoverHeight)
        return () => window.removeEventListener('resize', updateStickyCoverHeight)
    }, [viewMode, searchInput, selectedPlant, statusFilter])

    const showReset = searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses')

    useEffect(() => {
        document.documentElement.style.setProperty('--star-color', '#f59e0b')
    }, [])

    return (
        <>
            <div
                className={`global-dashboard-container dashboard-container global-flush-top flush-top mixers-view${selectedMixer ? ' detail-open' : ''}`}
            >
                {selectedMixer ? (
                    <MixerDetailView mixerId={selectedMixer.id} onClose={() => setSelectedMixer(null)} />
                ) : (
                    <>
                        <TopSection
                            title={title}
                            badge={
                                canShowUnassignedOverlay
                                    ? `${unassignedActiveOperatorsCount} Unassigned Active Operator${unassignedActiveOperatorsCount !== 1 ? 's' : ''}`
                                    : null
                            }
                            onBadgeClick={
                                canShowUnassignedOverlay
                                    ? () => {
                                          setSelectedView('Operators', 'Unassigned Active', selectedPlant, 'Mixer')
                                          updateOperatorFilter('selectedPlant', selectedPlant)
                                          updateOperatorFilter('positionFilter', 'Mixer')
                                          updateOperatorFilter('statusFilter', 'Unassigned Active')
                                      }
                                    : null
                            }
                            addButtonLabel="Add Mixer"
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
                            searchPlaceholder="Search by truck or operator..."
                            viewMode={viewMode}
                            onViewModeChange={handleViewModeChange}
                            plants={plants}
                            regionPlantCodes={regionPlantCodes}
                            selectedPlant={selectedPlant}
                            onSelectedPlantChange={(v) => {
                                setSelectedPlant(v)
                                updateMixerFilter('selectedPlant', v)
                            }}
                            statusFilter={statusFilter}
                            statusOptions={filterOptions}
                            onStatusFilterChange={(v) => {
                                setStatusFilter(v)
                                updateMixerFilter('statusFilter', v)
                            }}
                            showReset={showReset}
                            onReset={() => {
                                setSearchText('')
                                setSearchInput('')
                                setSelectedPlant('')
                                setStatusFilter('')
                                resetMixerFilters({ currentViewMode: viewMode, keepViewMode: true })
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
                            <MixerAddView
                                plants={plants}
                                operators={operators}
                                onClose={() => setShowAddSheet(false)}
                                onMixerAdded={(newMixer) => setMixers([...mixers, newMixer])}
                            />
                        )}
                        {showCommentModal && (
                            <MixerCommentModal
                                mixerId={modalMixerId}
                                mixerNumber={modalMixerNumber}
                                onClose={() => setShowCommentModal(false)}
                            />
                        )}
                        {showIssueModal && (
                            <MixerIssueModal
                                mixerId={modalMixerId}
                                mixerNumber={modalMixerNumber}
                                onClose={() => setShowIssueModal(false)}
                            />
                        )}
                        {showHistoryModal && selectedMixerForHistory && (
                            <HistoryViewSection
                                item={selectedMixerForHistory}
                                type="mixer"
                                onClose={() => setShowHistoryModal(false)}
                            />
                        )}
                        {showVerifyModal && verifyMixer && (
                            <VerificationRequirementsModal
                                open={showVerifyModal}
                                onClose={() => {
                                    setShowVerifyModal(false)
                                    setVerifyMixer(null)
                                }}
                                onSaveAndVerify={handleSaveAndVerify}
                                missingFields={[
                                    ...(!verifyMixer.vin || !ValidationUtility.isVIN(verifyMixer.vin) ? ['VIN'] : []),
                                    ...(!verifyMixer.make ? ['Make'] : []),
                                    ...(!verifyMixer.model ? ['Model'] : []),
                                    ...(!verifyMixer.year ? ['Year'] : [])
                                ]}
                                vin={verifyVin}
                                make={verifyMake}
                                model={verifyModel}
                                year={verifyYear}
                                lastServiceDate={verifyLastServiceDate}
                                lastChipDate={verifyLastChipDate}
                                setVin={setVerifyVin}
                                setMake={setVerifyMake}
                                setModel={setVerifyModel}
                                setYear={setVerifyYear}
                                setLastServiceDate={setVerifyLastServiceDate}
                                setLastChipDate={setVerifyLastChipDate}
                                isServiceOverdue={MixerUtility.isServiceOverdue}
                                assignedOperator={verifyMixer.assignedOperator}
                                itemType="mixer"
                                itemId={verifyMixer.id}
                                service={MixerService}
                                status={verifyMixer.status}
                            />
                        )}
                        {selectedPlant && (
                            <RecapModalSection
                                plantCode={selectedPlant}
                                plantName={plants.find((p) => String(p.plantCode) === String(selectedPlant))?.plantName}
                                mixers={filteredMixers}
                                operators={filteredOperatorsForRecap}
                                mixersLoaded={mixersLoaded}
                                isLoading={isLoading}
                            />
                        )}
                        {!selectedPlant && (
                            <RecapModalSection
                                plantCode=""
                                plantName=""
                                mixers={filteredMixers}
                                operators={filteredOperatorsForRecap}
                                isAllPlants={true}
                                mixersLoaded={mixersLoaded}
                                isLoading={isLoading}
                            />
                        )}
                    </>
                )}
            </div>
        </>
    )
}

export default MixersView
