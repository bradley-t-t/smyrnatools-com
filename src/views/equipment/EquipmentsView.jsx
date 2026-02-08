import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { usePreferences } from '../../app/context/PreferencesContext'
import LoadingScreen from '../../components/common/LoadingScreen'
import VerificationRequirementsModal from '../../components/common/VerificationRequirementsModal'
import GridViewModeSection from '../../components/sections/GridViewModeSection'
import HistoryViewSection from '../../components/sections/HistoryViewSection'
import ListViewModeSection from '../../components/sections/ListViewModeSection'
import TopSection from '../../components/sections/TopSection'
import { supabase } from '../../services/DatabaseService'
import { EquipmentService } from '../../services/EquipmentService'
import { PlantService } from '../../services/PlantService'
import { RegionService } from '../../services/RegionService'
import { debounce } from '../../utils/AsyncUtility'
import CleanupUtility from '../../utils/CleanupUtility'
import EquipmentUtility from '../../utils/EquipmentUtility'
import FleetUtility from '../../utils/FleetUtility'
import { getPlantName as lookupGetPlantName } from '../../utils/LookupUtility'
import EquipmentAddView from './EquipmentAddView'
import EquipmentCard from './EquipmentCard'
import EquipmentCommentModal from './EquipmentCommentModal'
import EquipmentDetailView from './EquipmentDetailView'
import EquipmentIssueModal from './EquipmentIssueModal'

function EquipmentsView({
    title = 'Equipment Fleet',
    onSelectEquipment,
    embedded = false,
    initialSearch = '',
    exactMatch = false
}) {
    const { preferences, updateEquipmentFilter, resetEquipmentFilters, saveLastViewedFilters } = usePreferences()
    const safeUpdateEquipmentFilter = typeof updateEquipmentFilter === 'function' ? updateEquipmentFilter : () => {}
    const [equipments, setEquipments] = useState([])
    const [plants, setPlants] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchText, setSearchText] = useState(
        initialSearch ? initialSearch : embedded ? '' : preferences.equipmentFilters?.searchText || ''
    )
    const [searchInput, setSearchInput] = useState(
        initialSearch ? initialSearch : embedded ? '' : preferences.equipmentFilters?.searchText || ''
    )
    const [selectedPlant, setSelectedPlant] = useState(
        embedded ? '' : preferences.equipmentFilters?.selectedPlant || ''
    )
    const [statusFilter, setStatusFilter] = useState(embedded ? '' : preferences.equipmentFilters?.statusFilter || '')
    const [equipmentTypeFilter, setEquipmentTypeFilter] = useState(
        embedded ? '' : preferences.equipmentFilters?.equipmentTypeFilter || ''
    )
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [selectedEquipment, setSelectedEquipment] = useState(null)
    const [viewMode, setViewMode] = useState(() => {
        if (embedded) return 'list'
        if (preferences.equipmentFilters?.viewMode !== undefined && preferences.equipmentFilters?.viewMode !== null)
            return preferences.equipmentFilters.viewMode
        if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null)
            return preferences.defaultViewMode
        const lastUsed = localStorage.getItem('equipments_last_view_mode')
        return lastUsed || 'grid'
    })
    const [showIssueModal, setShowIssueModal] = useState(false)
    const [showCommentModal, setShowCommentModal] = useState(false)
    const [modalEquipmentId, setModalEquipmentId] = useState(null)
    const [modalEquipmentNumber, setModalEquipmentNumber] = useState('')
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [sortKey, setSortKey] = useState('')
    const [sortDirection, setSortDirection] = useState('asc')
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [selectedEquipmentForHistory, setSelectedEquipmentForHistory] = useState(null)
    const [showVerifyModal, setShowVerifyModal] = useState(false)
    const [verifyEquipment, setVerifyEquipment] = useState(null)
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
    const equipmentTypeOptions = [
        '',
        'Front-End Loader',
        'Excavator',
        'Mini-Excavator',
        'Backhoe',
        'Skid Steer',
        'Forklift',
        'Manlift',
        'Dozer',
        'Off-Road Dump Truck',
        'Water/Trash Pump',
        'Water Truck',
        'Trailer',
        'Portable Compressor',
        'Portable Conveyor',
        'Crusher',
        'Ice Conveyor',
        'Rotary Mixer',
        'Road Reclaimer',
        'Roller',
        'Maintainer',
        'Sweeper',
        'Other',
        'Unknown'
    ]
    const headerRef = useRef(null)
    const sortMappings = {
        Cleanliness: 'cleanlinessRating',
        Condition: 'conditionRating',
        'Equipment #': 'identifyingNumber',
        'Make & Model': 'equipmentMake',
        More: null,
        Plant: 'assignedPlant',
        Status: 'status',
        Type: 'equipmentType',
        Verified: 'verified'
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

    const attachIsVerified = useCallback((obj) => {
        if (!obj) return obj
        obj.isVerified = function (latestHistoryDate) {
            return EquipmentUtility.isVerified(
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
                setEquipments((prev) =>
                    prev.map((equipment) => {
                        if (equipment.id === updatedData.id) {
                            const updated = {
                                ...equipment,
                                assignedPlant: updatedData.assigned_plant ?? equipment.assignedPlant,
                                cleanlinessRating: updatedData.cleanliness_rating ?? equipment.cleanlinessRating,
                                conditionRating: updatedData.condition_rating ?? equipment.conditionRating,
                                equipmentMake: updatedData.equipment_make ?? equipment.equipmentMake,
                                equipmentModel: updatedData.equipment_model ?? equipment.equipmentModel,
                                equipmentType: updatedData.equipment_type ?? equipment.equipmentType,
                                hoursMileage: updatedData.hours_mileage ?? equipment.hoursMileage,
                                identifyingNumber: updatedData.identifying_number ?? equipment.identifyingNumber,
                                lastServiceDate: updatedData.last_service_date ?? equipment.lastServiceDate,
                                status: updatedData.status ?? equipment.status,
                                updatedAt: updatedData.updated_at ?? equipment.updatedAt,
                                updatedBy: updatedData.updated_by ?? equipment.updatedBy,
                                updatedLast: updatedData.updated_last ?? equipment.updatedLast,
                                yearMade: updatedData.year_made ?? equipment.yearMade
                            }
                            return attachIsVerified(updated)
                        }
                        return equipment
                    })
                )
            } else if (eventType === 'INSERT' && data.new) {
                const newData = data.new
                if (regionPlantCodes && !regionPlantCodes.has(newData.assigned_plant)) return
                const newEquipment = attachIsVerified({
                    assignedPlant: newData.assigned_plant ?? '',
                    cleanlinessRating: newData.cleanliness_rating ?? null,
                    conditionRating: newData.condition_rating ?? null,
                    createdAt: newData.created_at ?? new Date().toISOString(),
                    equipmentMake: newData.equipment_make ?? '',
                    equipmentModel: newData.equipment_model ?? '',
                    equipmentType: newData.equipment_type ?? '',
                    hoursMileage: newData.hours_mileage ?? null,
                    id: newData.id,
                    identifyingNumber: newData.identifying_number ?? '',
                    lastServiceDate: newData.last_service_date ?? null,
                    status: newData.status ?? 'Active',
                    updatedAt: newData.updated_at ?? new Date().toISOString(),
                    updatedBy: newData.updated_by ?? null,
                    updatedLast: newData.updated_last ?? new Date().toISOString(),
                    yearMade: newData.year_made ?? ''
                })
                setEquipments((prev) => {
                    if (prev.some((e) => e.id === newData.id)) return prev
                    return [...prev, newEquipment]
                })
            } else if (eventType === 'DELETE' && data.old) {
                setEquipments((prev) => prev.filter((equipment) => equipment.id !== data.old.id))
            }
        },
        [regionPlantCodes, attachIsVerified]
    )

    useEffect(() => {
        const channel = supabase
            .channel('equipment-realtime-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'heavy_equipment' }, (payload) => {
                const eventType = payload.eventType
                const data = { new: payload.new, old: payload.old }
                handleRealtimeUpdate(eventType, data)
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error('Equipment realtime subscription error')
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
                await Promise.all([fetchEquipments(codes), fetchPlants(codes)])
            } finally {
                setIsLoading(false)
            }
        }

        fetchAllData()
        if (preferences?.equipmentFilters) {
            setSearchText(preferences.equipmentFilters.searchText || '')
            setSearchInput(preferences.equipmentFilters.searchText || '')
            setSelectedPlant(preferences.equipmentFilters.selectedPlant || '')
            setStatusFilter(preferences.equipmentFilters.statusFilter || '')
            setEquipmentTypeFilter(preferences.equipmentFilters.equipmentTypeFilter || '')
            setViewMode(preferences.equipmentFilters.viewMode || preferences.defaultViewMode || 'grid')
        }
    }, [preferences])

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
                    safeUpdateEquipmentFilter('selectedPlant', '')
                }
            } catch {
                setRegionPlantCodes(new Set())
            }
        }

        loadRegionPlants()
        return () => {
            cancelled = true
        }
    }, [preferences.selectedRegion?.code])

    async function fetchEquipments() {
        try {
            const processedBase = await EquipmentService.fetchEquipmentsWithDetails()
            setEquipments(processedBase)
            loadDetailsForEquipments(processedBase)

            if (processedBase && processedBase.length > 0) {
                setTimeout(() => {
                    runVerificationCheck(processedBase)
                }, 1000)
            }
        } catch {
            setEquipments([])
        }
    }

    async function fetchPlants(codes) {
        try {
            const data = await PlantService.fetchPlants(codes)
            setPlants(data)
        } catch {}
    }

    async function runVerificationCheck(equipmentsToCheck) {
        if (!equipmentsToCheck || equipmentsToCheck.length === 0) return

        try {
            const verificationResult = await CleanupUtility.verificationCheck(
                equipmentsToCheck,
                EquipmentService.updateEquipment,
                'equipment'
            )

            if (verificationResult.fixed > 0) {
                const refreshedEquipments = await EquipmentService.fetchEquipmentsWithDetails()
                setEquipments(refreshedEquipments)
                loadDetailsForEquipments(refreshedEquipments)
            }
        } catch (error) {}
    }

    const loadDetailsForEquipments = async (equipmentsList) => {
        if (!equipmentsList || equipmentsList.length === 0) return
        const equipmentIds = equipmentsList.map((e) => e.id).filter(Boolean)
        if (equipmentIds.length === 0) return

        try {
            const [commentsCounts, issuesCounts] = await Promise.all([
                EquipmentService.fetchAllCommentsCounts(equipmentIds),
                EquipmentService.fetchAllIssuesCounts(equipmentIds)
            ])

            setEquipments((prev) =>
                prev.map((e) => ({
                    ...e,
                    commentsCount: commentsCounts[e.id] || 0,
                    openIssuesCount: issuesCounts[e.id] || 0
                }))
            )
        } catch (e) {
            console.error('Error loading equipment details:', e)
        }
    }

    function handleDetailViewSaved(updated) {
        if (updated && updated.id) {
            setEquipments((prev) => {
                const arr = prev.slice()
                const idx = arr.findIndex((e) => e.id === updated.id)
                if (idx >= 0) arr[idx] = { ...arr[idx], ...updated }
                else arr.unshift(updated)
                return arr
            })
        }
    }

    async function handleCloseDetailView() {
        await fetchEquipments()
        setSelectedEquipment(null)
    }

    function handleSelectEquipment(equipmentId) {
        const equipment = equipments.find((e) => e.id === equipmentId)
        if (!equipment || !equipment.id) return
        saveLastViewedFilters()
        setSelectedEquipment(equipment)
        if (onSelectEquipment) onSelectEquipment(equipmentId)
    }

    const handleVerifyEquipment = useCallback(
        async (equipmentId) => {
            const equipment = equipments.find((e) => e.id === equipmentId)
            if (equipment) {
                if (equipment.status === 'Retired') {
                    return
                }
                setVerifyEquipment(equipment)
                setVerifyVin(equipment.vin || '')
                setVerifyMake(equipment.make || equipment.equipmentMake || '')
                setVerifyModel(equipment.model || equipment.equipmentModel || '')
                setVerifyYear(equipment.year || equipment.yearMade || '')
                setVerifyLastServiceDate(equipment.lastServiceDate || null)
                setShowVerifyModal(true)
            }
        },
        [equipments]
    )

    const handleSaveAndVerify = useCallback(async () => {
        if (!verifyEquipment) return

        try {
            const updates = {}
            if (verifyVin && verifyVin.trim() !== '' && verifyVin !== (verifyEquipment.vin || '')) {
                updates.vin = verifyVin
            }
            if (
                verifyMake &&
                verifyMake.trim() !== '' &&
                verifyMake !== (verifyEquipment.make || verifyEquipment.equipmentMake || '')
            ) {
                updates.make = verifyMake
            }
            if (
                verifyModel &&
                verifyModel.trim() !== '' &&
                verifyModel !== (verifyEquipment.model || verifyEquipment.equipmentModel || '')
            ) {
                updates.model = verifyModel
            }
            if (
                verifyYear &&
                String(verifyYear).trim() !== '' &&
                verifyYear !== (verifyEquipment.year || verifyEquipment.yearMade || '')
            ) {
                updates.year = verifyYear
            }
            if (verifyLastServiceDate && verifyLastServiceDate !== verifyEquipment.lastServiceDate) {
                updates.lastServiceDate = verifyLastServiceDate
            }

            if (Object.keys(updates).length > 0) {
                await EquipmentService.updateEquipment(verifyEquipment.id, updates)
            }

            const verified = await EquipmentService.verifyEquipment(verifyEquipment.id)

            setEquipments((prevEquipments) => prevEquipments.map((e) => (e.id === verifyEquipment.id ? verified : e)))

            setShowVerifyModal(false)
            setVerifyEquipment(null)
        } catch (error) {
            console.error('Failed to verify equipment:', error)
            alert('Failed to verify equipment. Please try again.')
        }
    }, [verifyEquipment, verifyVin, verifyMake, verifyModel, verifyYear, verifyLastServiceDate])

    const debouncedSetSearchText = useCallback(
        debounce((value) => {
            setSearchText(value)
            safeUpdateEquipmentFilter('searchText', value)
        }, 300),
        [safeUpdateEquipmentFilter]
    )

    const filteredEquipments = useMemo(() => {
        const filtered = equipments.filter((equipment) => {
            let matchesSearch = true
            if (searchText.trim()) {
                if (exactMatch) {
                    matchesSearch = equipment.identifyingNumber?.toLowerCase() === searchText.trim().toLowerCase()
                } else {
                    matchesSearch =
                        equipment.identifyingNumber?.toLowerCase().includes(searchText.toLowerCase()) ||
                        equipment.equipmentType?.toLowerCase().includes(searchText.toLowerCase())
                }
            }
            const matchesPlant = !selectedPlant || equipment.assignedPlant === selectedPlant
            const matchesRegion =
                !preferences.selectedRegion?.code || !regionPlantCodes || regionPlantCodes.has(equipment.assignedPlant)
            let matchesStatus = true
            if (statusFilter && statusFilter !== 'All Statuses') {
                matchesStatus = ['Active', 'Spare', 'In Shop', 'Retired'].includes(statusFilter)
                    ? equipment.status === statusFilter
                    : statusFilter === 'Past Due Service'
                      ? EquipmentUtility.isServiceOverdue(equipment.lastServiceDate)
                      : statusFilter === 'Verified'
                        ? EquipmentUtility.isVerified(equipment.updatedLast, equipment.updatedAt, equipment.updatedBy)
                        : statusFilter === 'Not Verified'
                          ? !EquipmentUtility.isVerified(
                                equipment.updatedLast,
                                equipment.updatedAt,
                                equipment.updatedBy
                            ) && equipment.status !== 'Retired'
                          : statusFilter === 'Open Issues'
                            ? Number(equipment.openIssuesCount || 0) > 0
                            : false
            }
            const matchesType = !equipmentTypeFilter || equipment.equipmentType === equipmentTypeFilter
            return matchesSearch && matchesPlant && matchesRegion && matchesStatus && matchesType
        })

        return FleetUtility.sortWithRetiredLast(
            filtered,
            (a, b) => {
                if (!sortKey) {
                    return FleetUtility.compareByStatusThenNumber(a, b, 'status', 'identifyingNumber')
                }
                const prop = sortMappings[sortKey]
                let aVal, bVal
                if (sortKey === 'Verified') {
                    aVal =
                        a.status === 'Retired'
                            ? 0
                            : EquipmentUtility.isVerified(a.updatedLast, a.updatedAt, a.updatedBy)
                              ? 2
                              : 1
                    bVal =
                        b.status === 'Retired'
                            ? 0
                            : EquipmentUtility.isVerified(b.updatedLast, b.updatedAt, b.updatedBy)
                              ? 2
                              : 1
                } else if (sortKey === 'Equipment #') {
                    aVal = parseFloat(a.identifyingNumber) || 0
                    bVal = parseFloat(b.identifyingNumber) || 0
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
        equipments,
        selectedPlant,
        searchText,
        statusFilter,
        equipmentTypeFilter,
        preferences.selectedRegion?.code,
        regionPlantCodes,
        sortKey,
        sortDirection,
        exactMatch
    ])

    useEffect(() => {
        if (preferences.equipmentFilters?.viewMode !== undefined && preferences.equipmentFilters?.viewMode !== null)
            setViewMode(preferences.equipmentFilters.viewMode)
        else if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null)
            setViewMode(preferences.defaultViewMode)
        else {
            const lastUsed = localStorage.getItem('equipments_last_view_mode')
            if (lastUsed) setViewMode(lastUsed)
        }
    }, [preferences])

    function handleViewModeChange(mode) {
        if (viewMode === mode) {
            setViewMode(null)
            updateEquipmentFilter('viewMode', null)
            localStorage.removeItem('equipments_last_view_mode')
        } else {
            setViewMode(mode)
            updateEquipmentFilter('viewMode', mode)
            localStorage.setItem('equipments_last_view_mode', mode)
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
            const root = document.querySelector('.global-dashboard-container.equipments-view')
            if (root && h) root.style.setProperty('--sticky-cover-height', h + 'px')
        }

        updateStickyCoverHeight()
        window.addEventListener('resize', updateStickyCoverHeight)
        return () => window.removeEventListener('resize', updateStickyCoverHeight)
    }, [viewMode, searchInput, selectedPlant, statusFilter, equipmentTypeFilter])

    const content = useMemo(() => {
        if (isLoading)
            return (
                <div className="global-loading-container loading-container">
                    <LoadingScreen message="Loading equipment..." inline={true} />
                </div>
            )
        if (filteredEquipments.length === 0)
            return (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <i className="fas fa-snowplow text-3xl text-slate-400"></i>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No Equipment Found</h3>
                    <p className="text-slate-500 mb-6 max-w-md">
                        {searchText ||
                        selectedPlant ||
                        (statusFilter && statusFilter !== 'All Statuses') ||
                        equipmentTypeFilter
                            ? 'No equipment matches your search criteria.'
                            : 'There is no equipment in the system yet.'}
                    </p>
                    <button
                        className="px-5 py-2.5 bg-[#1e3a5f] hover:bg-[#152d4a] text-white font-semibold rounded-lg transition-colors"
                        onClick={() => setShowAddSheet(true)}
                    >
                        Add Equipment
                    </button>
                </div>
            )
        if (viewMode === 'grid')
            return (
                <GridViewModeSection
                    filteredItems={filteredEquipments}
                    getCardProps={(equipment) => ({
                        operatorName: undefined,
                        plantName: lookupGetPlantName(plants, equipment.assignedPlant)
                    })}
                    handleSelectItem={handleSelectEquipment}
                    cardComponent={EquipmentCard}
                    itemPropName="equipment"
                    onShowCommentModal={(id, number) => {
                        setModalEquipmentId(id)
                        setModalEquipmentNumber(number)
                        setShowCommentModal(true)
                    }}
                    onShowIssueModal={(id, number) => {
                        setModalEquipmentId(id)
                        setModalEquipmentNumber(number)
                        setShowIssueModal(true)
                    }}
                    gridClassName="grid"
                />
            )
        return (
            <ListViewModeSection
                filteredItems={filteredEquipments}
                operators={[]}
                plants={plants}
                handleSelectItem={handleSelectEquipment}
                headerLabels={[
                    'Plant',
                    'Type',
                    'Equipment #',
                    'Make & Model',
                    'Status',
                    'Cleanliness',
                    'Condition',
                    'Verified',
                    'More'
                ]}
                colWidths={['10%', '15%', '10%', '15%', '8%', '10%', '10%', '10%', '12%']}
                renderRow={(item, handleSelect, onComment, onIssue, onVerify, onHistory, index, alternatingBg) => {
                    const isVerified =
                        typeof item.isVerified === 'function'
                            ? item.isVerified(item.latestHistoryDate)
                            : EquipmentUtility.isVerified(
                                  item.updatedLast,
                                  item.updatedAt,
                                  item.updatedBy,
                                  item.latestHistoryDate
                              )
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
                            <td style={{ ...cellStyle, width: '10%' }}>{item.assignedPlant || '---'}</td>
                            <td style={{ ...cellStyle, width: '15%' }}>{item.equipmentType || '---'}</td>
                            <td style={{ ...cellBoldStyle, width: '10%' }}>
                                {item.identifyingNumber ? (
                                    <div style={{ alignItems: 'center', display: 'flex', gap: '6px' }}>
                                        {item.identifyingNumber}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                navigator.clipboard.writeText(item.identifyingNumber)
                                                const icon = e.currentTarget.querySelector('i')
                                                icon.className = 'fas fa-check'
                                                icon.style.color = '#22c55e'
                                                setTimeout(() => {
                                                    icon.className = 'fas fa-copy'
                                                    icon.style.color = '#94a3b8'
                                                }, 1500)
                                            }}
                                            title="Copy equipment number"
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
                                    '---'
                                )}
                            </td>
                            <td
                                style={{
                                    ...cellStyle,
                                    width: '15%'
                                }}
                            >
                                {item.yearMade || item.equipmentMake || item.equipmentModel
                                    ? `${item.yearMade ? item.yearMade + ' ' : ''}${item.equipmentMake || ''} ${item.equipmentModel || ''}`.trim()
                                    : '---'}
                            </td>
                            <td style={{ ...cellStyle, width: '8%' }}>
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
                            </td>
                            <td style={{ ...cellStyle, width: '10%' }}>
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
                            <td style={{ ...cellStyle, width: '10%' }}>
                                <div style={{ alignItems: 'center', display: 'flex', gap: '4px' }}>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <i
                                            key={i}
                                            className="fas fa-star"
                                            style={{
                                                color:
                                                    i < Math.round(item.conditionRating || 0) ? '#f59e0b' : '#e5e7eb',
                                                fontSize: '14px'
                                            }}
                                        ></i>
                                    ))}
                                </div>
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
                                            if (onVerify) onVerify(item.id, item.identifyingNumber)
                                        }}
                                        title={isVerified ? 'Verified' : 'Click to verify'}
                                        style={verifyBtnStyle(isVerified)}
                                    >
                                        <i
                                            className={`fas ${isVerified ? 'fa-check-circle' : 'fa-exclamation-circle'}`}
                                            style={{ color: isVerified ? '#166534' : '#92400e' }}
                                        ></i>
                                        <span style={{ color: isVerified ? '#166534' : '#92400e' }}>
                                            {isVerified ? 'Verified' : 'Verify'}
                                        </span>
                                    </button>
                                )}
                            </td>
                            <td style={{ ...cellStyle, width: '12%' }}>
                                <div style={{ alignItems: 'center', display: 'flex' }}>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onComment(item.id, item.identifyingNumber)
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
                                            onIssue(item.id, item.identifyingNumber)
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
                                            setSelectedEquipmentForHistory(item)
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
                    setModalEquipmentId(id)
                    setModalEquipmentNumber(number)
                    setShowCommentModal(true)
                }}
                onShowIssueModal={(id, number) => {
                    setModalEquipmentId(id)
                    setModalEquipmentNumber(number)
                    setShowIssueModal(true)
                }}
                onVerify={handleVerifyEquipment}
                containerClassName="list-table-container"
                tableClassName="list-table"
            />
        )
    }, [
        isLoading,
        filteredEquipments,
        viewMode,
        searchText,
        selectedPlant,
        statusFilter,
        equipmentTypeFilter,
        plants,
        equipments
    ])

    const showReset =
        searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses') || equipmentTypeFilter

    return (
        <>
            <div
                className={`global-dashboard-container dashboard-container global-flush-top flush-top equipments-view${selectedEquipment ? ' detail-open' : ''}`}
            >
                {selectedEquipment ? (
                    <EquipmentDetailView equipmentId={selectedEquipment.id} onClose={handleCloseDetailView} />
                ) : (
                    <>
                        <TopSection
                            title={title}
                            addButtonLabel="Add Equipment"
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
                            searchPlaceholder="Search by identifying number or equipment type..."
                            viewMode={viewMode}
                            onViewModeChange={handleViewModeChange}
                            plants={plants}
                            regionPlantCodes={regionPlantCodes}
                            selectedPlant={selectedPlant}
                            onSelectedPlantChange={(v) => {
                                setSelectedPlant(v)
                                safeUpdateEquipmentFilter('selectedPlant', v)
                            }}
                            statusFilter={statusFilter}
                            statusOptions={filterOptions}
                            onStatusFilterChange={(v) => {
                                setStatusFilter(v)
                                safeUpdateEquipmentFilter('statusFilter', v)
                            }}
                            customFilters={
                                <select
                                    style={{
                                        appearance: 'none',
                                        backgroundColor: '#f8fafc',
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                        backgroundPosition: 'right 12px center',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundSize: '18px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '12px',
                                        color: '#1e293b',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        minWidth: '140px',
                                        padding: '12px 40px 12px 16px'
                                    }}
                                    value={equipmentTypeFilter}
                                    onChange={(e) => {
                                        setEquipmentTypeFilter(e.target.value)
                                        safeUpdateEquipmentFilter('equipmentTypeFilter', e.target.value)
                                    }}
                                    aria-label="Equipment type filter"
                                >
                                    <option value="">All Types</option>
                                    {equipmentTypeOptions.slice(1).map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            }
                            showReset={showReset}
                            onReset={() => {
                                setSearchText('')
                                setSearchInput('')
                                setSelectedPlant('')
                                setStatusFilter('')
                                setEquipmentTypeFilter('')
                                resetEquipmentFilters({ currentViewMode: viewMode, keepViewMode: true })
                            }}
                            listLabels={[
                                'Plant',
                                'Type',
                                'Equipment #',
                                'Make & Model',
                                'Status',
                                'Cleanliness',
                                'Condition',
                                'Verified',
                                'More'
                            ]}
                            colWidths={['10%', '15%', '10%', '15%', '8%', '10%', '10%', '10%', '12%']}
                            forwardedRef={headerRef}
                            sticky={true}
                            onHeaderClick={handleHeaderClick}
                            sortKey={sortKey}
                            sortDirection={sortDirection}
                        />
                        <div className="global-content-container content-container">{content}</div>
                        {showAddSheet && (
                            <EquipmentAddView
                                plants={plants}
                                onClose={() => setShowAddSheet(false)}
                                onEquipmentAdded={(newEquipment) => setEquipments([...equipments, newEquipment])}
                            />
                        )}
                        {showCommentModal && (
                            <EquipmentCommentModal
                                equipmentId={modalEquipmentId}
                                equipmentNumber={modalEquipmentNumber}
                                onClose={() => setShowCommentModal(false)}
                            />
                        )}
                        {showIssueModal && (
                            <EquipmentIssueModal
                                equipmentId={modalEquipmentId}
                                equipmentNumber={modalEquipmentNumber}
                                onClose={() => setShowIssueModal(false)}
                            />
                        )}
                        {showHistoryModal && selectedEquipmentForHistory && (
                            <HistoryViewSection
                                item={selectedEquipmentForHistory}
                                type="equipment"
                                onClose={() => setShowHistoryModal(false)}
                            />
                        )}
                        {showVerifyModal && verifyEquipment && (
                            <VerificationRequirementsModal
                                open={showVerifyModal}
                                onClose={() => {
                                    setShowVerifyModal(false)
                                    setVerifyEquipment(null)
                                }}
                                onSaveAndVerify={handleSaveAndVerify}
                                missingFields={[
                                    ...(!verifyEquipment.make && !verifyEquipment.equipmentMake ? ['Make'] : []),
                                    ...(!verifyEquipment.model && !verifyEquipment.equipmentModel ? ['Model'] : []),
                                    ...(!verifyEquipment.year && !verifyEquipment.yearMade ? ['Year'] : [])
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
                                isServiceOverdue={EquipmentUtility.isServiceOverdue}
                                assignedOperator={verifyEquipment.assignedOperator}
                                itemType="equipment"
                                itemId={verifyEquipment.id}
                                service={EquipmentService}
                                status={verifyEquipment.status}
                            />
                        )}
                    </>
                )}
            </div>
        </>
    )
}

export default EquipmentsView
