import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {usePreferences} from '../../app/context/PreferencesContext';
import LoadingScreen from '../../components/common/LoadingScreen';
import TractorCard from './TractorCard';
import {TractorService} from '../../services/TractorService';
import {TractorUtility} from "../../utils/TractorUtility";
import {OperatorService} from "../../services/OperatorService";
import {PlantService} from "../../services/PlantService";
import TractorAddView from "./TractorAddView";
import TractorDetailView from "./TractorDetailView";
import TractorIssueModal from './TractorIssueModal'
import TractorCommentModal from './TractorCommentModal'
import VerificationRequirementsModal from '../../components/common/VerificationRequirementsModal'
import {ValidationUtility} from '../../utils/ValidationUtility'
import {RegionService} from '../../services/RegionService'
import AsyncUtility from '../../utils/AsyncUtility'
import FleetUtility from '../../utils/FleetUtility'
import FormatUtility from '../../utils/FormatUtility'
import TopSection from '../../components/sections/TopSection'
import ListViewModeSection from '../../components/sections/ListViewModeSection'
import GridViewModeSection from '../../components/sections/GridViewModeSection'
import HistoryViewSection from '../../components/sections/HistoryViewSection'
import ThemeUtility from '../../utils/ThemeUtility'
import CleanupUtility from '../../utils/CleanupUtility'
import {supabase} from '../../services/DatabaseService'

function TractorsView({title = 'Tractor Fleet', onSelectTractor, setSelectedView}) {
    const {
        preferences,
        updateTractorFilter,
        resetTractorFilters,
        saveLastViewedFilters,
        updateOperatorFilter
    } = usePreferences();
    const headerRef = useRef(null)
    const [tractors, setTractors] = useState([]);
    const [allTractors, setAllTractors] = useState([]);
    const [operators, setOperators] = useState([]);
    const [plants, setPlants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegionLoading, setIsRegionLoading] = useState(false)
    const [searchText, setSearchText] = useState(preferences.tractorFilters?.searchText || '');
    const [searchInput, setSearchInput] = useState(preferences.tractorFilters?.searchText || '');
    const [selectedPlant, setSelectedPlant] = useState(preferences.tractorFilters?.selectedPlant || '');
    const [statusFilter, setStatusFilter] = useState(preferences.tractorFilters?.statusFilter || '');
    const [freightFilter, setFreightFilter] = useState(preferences.tractorFilters?.freightFilter || '');
    const [showAddSheet, setShowAddSheet] = useState(false);
    const [selectedTractor, setSelectedTractor] = useState(null);
    const [viewMode, setViewMode] = useState(() => {
        if (preferences.tractorFilters?.viewMode !== undefined && preferences.tractorFilters?.viewMode !== null) return preferences.tractorFilters.viewMode
        if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) return preferences.defaultViewMode
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
    const [showVerifyModal, setShowVerifyModal] = useState(false)
    const [verifyTractor, setVerifyTractor] = useState(null)
    const [verifyVin, setVerifyVin] = useState('')
    const [verifyMake, setVerifyMake] = useState('')
    const [verifyModel, setVerifyModel] = useState('')
    const [verifyYear, setVerifyYear] = useState('')
    const [verifyLastServiceDate, setVerifyLastServiceDate] = useState(null)
    const filterOptions = ['All Statuses', 'Active', 'Spare', 'In Shop', 'Retired', 'Past Due Service', 'Verified', 'Not Verified', 'Open Issues']
    const sortMappings = {
        'Plant': 'assignedPlant',
        'Truck #': 'truckNumber',
        'Status': 'status',
        'Operator': 'assignedOperator',
        'Cleanliness': 'cleanlinessRating',
        'VIN': 'vinNumber',
        'Verified': null,
        'More': null
    }

    const unassignedActiveOperatorsCount = useMemo(() => FleetUtility.countUnassignedActiveOperators(tractors, operators, searchText, {
        position: 'Tractor Operator',
        selectedPlant,
        regionPlantCodes,
        operatorIdField: 'employeeId',
        assignedOperatorField: 'assignedOperator',
        assignedPlantField: 'assignedPlant'
    }), [operators, tractors, selectedPlant, searchText, regionPlantCodes])

    const attachIsVerified = useCallback((obj) => {
        if (!obj) return obj
        obj.isVerified = function (latestHistoryDate) {
            return TractorUtility.isVerified(this.updatedLast, this.updatedAt, this.updatedBy, latestHistoryDate ?? this.latestHistoryDate)
        }
        return obj
    }, [])

    const handleRealtimeUpdate = useCallback((eventType, data) => {
        if (eventType === 'UPDATE' && data.new) {
            const updatedData = data.new
            setTractors(prev => prev.map(tractor => {
                if (tractor.id === updatedData.id) {
                    const updated = {
                        ...tractor,
                        truckNumber: updatedData.truck_number ?? tractor.truckNumber,
                        assignedPlant: updatedData.assigned_plant ?? tractor.assignedPlant,
                        assignedOperator: updatedData.assigned_operator ?? tractor.assignedOperator,
                        lastServiceDate: updatedData.last_service_date ?? tractor.lastServiceDate,
                        cleanlinessRating: updatedData.cleanliness_rating ?? tractor.cleanlinessRating,
                        status: updatedData.status ?? tractor.status,
                        hasBlower: updatedData.has_blower ?? tractor.hasBlower,
                        updatedAt: updatedData.updated_at ?? tractor.updatedAt,
                        updatedLast: updatedData.updated_last ?? tractor.updatedLast,
                        updatedBy: updatedData.updated_by ?? tractor.updatedBy,
                        vin: updatedData.vin ?? tractor.vin,
                        make: updatedData.make ?? tractor.make,
                        model: updatedData.model ?? tractor.model,
                        year: updatedData.year ?? tractor.year,
                        freight: updatedData.freight ?? tractor.freight
                    }
                    return attachIsVerified(updated)
                }
                return tractor
            }))
            setAllTractors(prev => prev.map(tractor => {
                if (tractor.id === updatedData.id) {
                    const updated = {
                        ...tractor,
                        truckNumber: updatedData.truck_number ?? tractor.truckNumber,
                        assignedPlant: updatedData.assigned_plant ?? tractor.assignedPlant,
                        assignedOperator: updatedData.assigned_operator ?? tractor.assignedOperator,
                        lastServiceDate: updatedData.last_service_date ?? tractor.lastServiceDate,
                        cleanlinessRating: updatedData.cleanliness_rating ?? tractor.cleanlinessRating,
                        status: updatedData.status ?? tractor.status,
                        hasBlower: updatedData.has_blower ?? tractor.hasBlower,
                        updatedAt: updatedData.updated_at ?? tractor.updatedAt,
                        updatedLast: updatedData.updated_last ?? tractor.updatedLast,
                        updatedBy: updatedData.updated_by ?? tractor.updatedBy,
                        vin: updatedData.vin ?? tractor.vin,
                        make: updatedData.make ?? tractor.make,
                        model: updatedData.model ?? tractor.model,
                        year: updatedData.year ?? tractor.year,
                        freight: updatedData.freight ?? tractor.freight
                    }
                    return attachIsVerified(updated)
                }
                return tractor
            }))
        } else if (eventType === 'INSERT' && data.new) {
            const newData = data.new
            if (regionPlantCodes && !regionPlantCodes.has(newData.assigned_plant)) return
            const newTractor = attachIsVerified({
                id: newData.id,
                truckNumber: newData.truck_number ?? '',
                assignedPlant: newData.assigned_plant ?? '',
                assignedOperator: newData.assigned_operator ?? '',
                lastServiceDate: newData.last_service_date ?? null,
                cleanlinessRating: newData.cleanliness_rating ?? 0,
                status: newData.status ?? 'Active',
                hasBlower: newData.has_blower ?? false,
                createdAt: newData.created_at ?? new Date().toISOString(),
                updatedAt: newData.updated_at ?? new Date().toISOString(),
                updatedLast: newData.updated_last ?? new Date().toISOString(),
                updatedBy: newData.updated_by ?? null,
                vin: newData.vin ?? '',
                make: newData.make ?? '',
                model: newData.model ?? '',
                year: newData.year ?? '',
                freight: newData.freight ?? ''
            })
            setTractors(prev => {
                if (prev.some(t => t.id === newData.id)) return prev
                return [...prev, newTractor]
            })
            setAllTractors(prev => {
                if (prev.some(t => t.id === newData.id)) return prev
                return [...prev, newTractor]
            })
        } else if (eventType === 'DELETE' && data.old) {
            setTractors(prev => prev.filter(tractor => tractor.id !== data.old.id))
            setAllTractors(prev => prev.filter(tractor => tractor.id !== data.old.id))
        }
    }, [regionPlantCodes, attachIsVerified])

    useEffect(() => {
        const channel = supabase
            .channel('tractors-realtime-changes')
            .on(
                'postgres_changes',
                {event: '*', schema: 'public', table: 'tractors'},
                (payload) => {
                    const eventType = payload.eventType
                    const data = {new: payload.new, old: payload.old}
                    handleRealtimeUpdate(eventType, data)
                }
            )
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error('Tractors realtime subscription error')
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [handleRealtimeUpdate])

    useEffect(() => {
        async function fetchAllData() {
            setIsLoading(true);
            try {
                const codes = await RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code)
                setRegionPlantCodes(codes)
                await Promise.all([fetchTractors(codes), fetchOperators(), fetchPlants(codes)]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchAllData();
        if (preferences?.tractorFilters) {
            setSearchText(preferences.tractorFilters.searchText || '');
            setSearchInput(preferences.tractorFilters.searchText || '');
            setSelectedPlant(preferences.tractorFilters.selectedPlant || '');
            setStatusFilter(preferences.tractorFilters.statusFilter || '');
            setFreightFilter(preferences.tractorFilters.freightFilter || '');
        }
        if (preferences.tractorFilters?.viewMode !== undefined && preferences.tractorFilters?.viewMode !== null) {
            setViewMode(preferences.tractorFilters.viewMode)
        } else if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) {
            setViewMode(preferences.defaultViewMode)
        } else {
            const lastUsed = localStorage.getItem('tractors_last_view_mode')
            if (lastUsed) setViewMode(lastUsed)
        }
    }, [preferences])

    useEffect(() => {
        if (preferences.tractorFilters?.viewMode !== undefined && preferences.tractorFilters?.viewMode !== null) setViewMode(preferences.tractorFilters.viewMode)
        else if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) setViewMode(preferences.defaultViewMode)
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
                const sel = String(selectedPlant || '').trim().toUpperCase()
                if (sel && codes && !codes.has(sel)) {
                    setSelectedPlant('')
                    updateTractorFilter('selectedPlant', '')
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

    function handleHeaderClick(label) {
        if (sortKey === label) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(label)
            setSortDirection('asc')
        }
    }

    async function fetchTractors(codes) {
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
        } catch (error) {
        }
    }

    async function runVerificationCheck(tractorsToCheck) {
        if (!tractorsToCheck || tractorsToCheck.length === 0) return

        try {
            const verificationResult = await CleanupUtility.verificationCheck(
                tractorsToCheck,
                TractorService.updateTractor,
                'tractor',
                operators
            )

            if (verificationResult.fixed > 0) {
                const codes = await RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code)
                const refreshedTractors = await TractorService.fetchTractorsWithDetails(codes)
                setTractors(refreshedTractors)
                setAllTractors(refreshedTractors)
                loadDetailsForTractors(refreshedTractors)
            }
        } catch (error) {
        }
    }


    async function fetchOperators() {
        try {
            const data = await OperatorService.fetchOperators();
            setOperators(Array.isArray(data) ? data : []);
            setOperatorsLoaded(true)
        } catch (error) {
            setOperators([]);
        }
    }

    async function fetchPlants(codes) {
        try {
            const data = await PlantService.fetchPlants(codes);
            setPlants(data);
        } catch (error) {
        }
    }

    function handleSelectTractor(tractorId) {
        const tractor = tractors.find(m => m.id === tractorId);
        if (tractor) {
            saveLastViewedFilters();
            setSelectedTractor(tractorId);
            onSelectTractor?.(tractorId);
        }
    }

    const handleVerifyTractor = useCallback(async (tractorId) => {
        const tractor = tractors.find(t => t.id === tractorId);
        if (tractor) {
            if (tractor.status === 'Retired') {
                return;
            }
            setVerifyTractor(tractor);
            setVerifyVin(tractor.vin || tractor.vinNumber || '');
            setVerifyMake(tractor.make || '');
            setVerifyModel(tractor.model || '');
            setVerifyYear(tractor.year || '');
            setVerifyLastServiceDate(tractor.lastServiceDate || null);
            setShowVerifyModal(true);
        }
    }, [tractors]);

    const handleSaveAndVerify = useCallback(async () => {
        if (!verifyTractor) return;

        try {
            const updates = {};
            if (verifyVin && verifyVin.trim() !== '' && verifyVin !== (verifyTractor.vin || '')) {
                updates.vin = verifyVin;
            }
            if (verifyMake && verifyMake.trim() !== '' && verifyMake !== (verifyTractor.make || '')) {
                updates.make = verifyMake;
            }
            if (verifyModel && verifyModel.trim() !== '' && verifyModel !== (verifyTractor.model || '')) {
                updates.model = verifyModel;
            }
            if (verifyYear && String(verifyYear).trim() !== '' && verifyYear !== (verifyTractor.year || '')) {
                updates.year = verifyYear;
            }
            if (verifyLastServiceDate && verifyLastServiceDate !== verifyTractor.lastServiceDate) {
                updates.lastServiceDate = verifyLastServiceDate;
            }

            if (Object.keys(updates).length > 0) {
                await TractorService.updateTractor(verifyTractor.id, updates);
            }

            const verified = await TractorService.verifyTractor(verifyTractor.id);

            setTractors(prevTractors => prevTractors.map(t =>
                t.id === verifyTractor.id ? verified : t
            ));
            setAllTractors(prevTractors => prevTractors.map(t =>
                t.id === verifyTractor.id ? verified : t
            ));

            setShowVerifyModal(false);
            setVerifyTractor(null);
        } catch (error) {
            console.error('Failed to verify tractor:', error);
            alert('Failed to verify tractor. Please try again.');
        }
    }, [verifyTractor, verifyVin, verifyMake, verifyModel, verifyYear, verifyLastServiceDate]);

    const filteredTractors = useMemo(() => {
        const filtered = tractors.filter(tractor => {
            const normalizedSearch = searchText.trim().toLowerCase().replace(/\s+/g, '')
            const truckMatch = (tractor.truckNumber || '').toLowerCase().includes(normalizedSearch)
            const operatorMatch = tractor.assignedOperator && operators.find(op => op.employeeId === tractor.assignedOperator)?.name.toLowerCase().includes(normalizedSearch)
            const vinRaw = (tractor.vinNumber || tractor.vin || '').toLowerCase()
            const vinNoSpaces = vinRaw.replace(/\s+/g, '')
            const vinMatch = vinRaw.includes(searchText.trim().toLowerCase()) || vinNoSpaces.includes(normalizedSearch)
            const matchesSearch = !normalizedSearch || truckMatch || operatorMatch || vinMatch
            const matchesPlant = !selectedPlant || tractor.assignedPlant === selectedPlant
            const matchesRegion = !regionPlantCodes || regionPlantCodes.size === 0 || regionPlantCodes.has(String(tractor.assignedPlant || '').trim().toUpperCase())
            let matchesStatus = true
            if (statusFilter && statusFilter !== 'All Statuses') {
                matchesStatus = ['Active', 'Spare', 'In Shop', 'Retired'].includes(statusFilter) ? tractor.status === statusFilter : statusFilter === 'Past Due Service' ? TractorUtility.isServiceOverdue(tractor.lastServiceDate) : statusFilter === 'Verified' ? tractor.isVerified() : statusFilter === 'Not Verified' ? (!tractor.isVerified() && tractor.status !== 'Retired') : statusFilter === 'Open Issues' ? (Number(tractor.openIssuesCount || 0) > 0) : false
            }
            const matchesFreight = !freightFilter || tractor.freight === freightFilter
            return matchesSearch && matchesPlant && matchesRegion && matchesStatus && matchesFreight
        });

        return FleetUtility.sortWithRetiredLast(filtered, (a, b) => {
            if (!sortKey) {
                return FleetUtility.compareByStatusThenNumber(a, b, 'status', 'truckNumber')
            }
            const prop = sortMappings[sortKey]
            let aVal, bVal;
            if (sortKey === 'Verified') {
                aVal = a.status === 'Retired' ? 0 : (a.isVerified() ? 2 : 1)
                bVal = b.status === 'Retired' ? 0 : (b.isVerified() ? 2 : 1)
            } else if (sortKey === 'Operator') {
                aVal = operators.find(op => op.employeeId === a.assignedOperator)?.name || ''
                bVal = operators.find(op => op.employeeId === b.assignedOperator)?.name || ''
            } else if (sortKey === 'Plant') {
                aVal = plants.find(p => p.code === a.assignedPlant)?.name || a.assignedPlant
                bVal = plants.find(p => p.code === b.assignedPlant)?.name || b.assignedPlant
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
        }, 'status');
    }, [tractors, operators, selectedPlant, searchText, statusFilter, freightFilter, regionPlantCodes, sortKey, sortDirection, plants])

    const debouncedSetSearchText = useCallback(AsyncUtility.debounce(value => {
        setSearchText(value);
        updateTractorFilter('searchText', value)
    }, 300), [updateTractorFilter])

    const canShowUnassignedOverlay = tractorsLoaded && operatorsLoaded && !isLoading && unassignedActiveOperatorsCount > 0
    const showReset = (searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses') || freightFilter)

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
            const normalizedSearch = searchText.trim().toLowerCase().replace(/\s+/g, '');
            if (normalizedSearch.length >= 17 && /^[a-z0-9]+$/i.test(normalizedSearch)) {
                setIsLoading(true);
                try {
                    const vinTractors = await TractorService.searchTractorsByVinProcessed(normalizedSearch);
                    const filteredVinTractors = regionPlantCodes ? vinTractors.filter(t => regionPlantCodes.has(String(t.assignedPlant || '').trim().toUpperCase())) : vinTractors
                    setTractors(filteredVinTractors);
                    setTractorsLoaded(true)
                } catch {
                }
                setIsLoading(false);
            } else {
                setTractors(allTractors);
            }
        }

        if (searchText.trim().length >= 1) {
            searchByVin();
        } else {
            setTractors(allTractors);
        }
    }, [searchText, allTractors, regionPlantCodes]);

    const content = useMemo(() => {
        if (isLoading || isRegionLoading) {
            return (
                <div className="global-loading-container loading-container">
                    <LoadingScreen message="Loading tractors..." inline={true}/>
                </div>
            )
        }
        if (filteredTractors.length === 0) {
            return (
                <div className="global-no-results-container no-results-container">
                    <div className="no-results-icon">
                        <i className="fas fa-truck"></i>
                    </div>
                    <h3>No Tractors Found</h3>
                    <p>{searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses') || freightFilter ? "No tractors match your search criteria." : "There are no tractors in the system yet."}</p>
                    <button className="global-primary-button primary-button" onClick={() => setShowAddSheet(true)}>Add
                        Tractor
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
                        setModalTractorId(id);
                        setModalTractorNumber(number);
                        setShowCommentModal(true);
                    }}
                    onShowIssueModal={(id, number) => {
                        setModalTractorId(id);
                        setModalTractorNumber(number);
                        setShowIssueModal(true);
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
                renderRow={(item, handleSelect, onComment, onIssue, onVerify) => {
                    const operator = operators.find(op => op.employeeId === item.assignedOperator);
                    const plant = plants.find(p => p.code === item.assignedPlant);
                    const cellStyle = {
                        padding: '20px 16px',
                        fontSize: '14px',
                        color: '#374151',
                        backgroundColor: 'white',
                        borderBottom: '1px solid #e5e7eb',
                        verticalAlign: 'middle'
                    };
                    const cellBoldStyle = {
                        ...cellStyle,
                        fontWeight: 700,
                        color: '#1e3a5f',
                        fontSize: '15px'
                    };
                    const statusBadge = (status) => {
                        let bg = '#f1f5f9', color = '#64748b';
                        if (status === 'Active') { bg = '#dcfce7'; color = '#166534'; }
                        else if (status === 'Spare') { bg = '#dbeafe'; color = '#1e40af'; }
                        else if (status === 'In Shop') { bg = '#fef3c7'; color = '#92400e'; }
                        else if (status === 'Retired') { bg = '#f1f5f9'; color = '#64748b'; }
                        return { display: 'inline-block', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, backgroundColor: bg, color: color };
                    };
                    const verifyBtnStyle = (verified) => ({
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: verified ? 'default' : 'pointer',
                        backgroundColor: verified ? '#dcfce7' : '#fef3c7',
                        color: verified ? '#166534' : '#92400e'
                    });
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
                    };
                    return (
                        <tr key={item.id} onClick={() => handleSelect(item.id)} style={{cursor: 'pointer'}}
                            onMouseEnter={(e) => { 
                                e.currentTarget.querySelectorAll('td').forEach(td => td.style.backgroundColor = '#e0f2fe'); 
                            }}
                            onMouseLeave={(e) => { 
                                e.currentTarget.querySelectorAll('td').forEach(td => td.style.backgroundColor = ''); 
                            }}>
                            <td style={{...cellStyle, width: '10%'}}>{plant?.name || item.assignedPlant}</td>
                            <td style={{...cellBoldStyle, width: '12%'}}>{item.truckNumber}</td>
                            <td style={{...cellStyle, width: '12%'}}>
                                <span style={statusBadge(item.status)}>{item.status}</span>
                            </td>
                            <td style={{...cellStyle, width: '18%'}}>{operator?.name || <span style={{color: '#94a3b8', fontStyle: 'italic'}}>Not Assigned</span>}</td>
                            <td style={{...cellStyle, width: '12%'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                    {Array.from({length: 5}).map((_, i) => (
                                        <i key={i} className="fas fa-star" style={{color: i < Math.round(item.cleanlinessRating || 0) ? '#f59e0b' : '#e5e7eb', fontSize: '14px'}}></i>
                                    ))}
                                </div>
                            </td>
                            <td style={{...cellStyle, width: '16%', fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: '#64748b'}}>{item.vinNumber || item.vin || '-'}</td>
                            <td style={{...cellStyle, width: '10%'}}>
                                {item.status === 'Retired' ? (
                                    <span style={{padding: '8px 14px', backgroundColor: '#f1f5f9', color: '#94a3b8', borderRadius: '8px', fontSize: '12px', fontWeight: 600}}>N/A</span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); if (onVerify) onVerify(item.id, item.truckNumber); }}
                                        title={item.isVerified() ? 'Verified' : 'Click to verify'}
                                        style={verifyBtnStyle(item.isVerified())}
                                    >
                                        <i className={`fas ${item.isVerified() ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{color: item.isVerified() ? '#166534' : '#92400e'}}></i>
                                        <span style={{color: item.isVerified() ? '#166534' : '#92400e'}}>{item.isVerified() ? 'Verified' : 'Verify'}</span>
                                    </button>
                                )}
                            </td>
                            <td style={{...cellStyle, width: '10%'}}>
                                <div style={{display: 'flex', alignItems: 'center'}}>
                                    <button type="button" onClick={e => { e.stopPropagation(); onComment(item.id, item.truckNumber); }} style={actionBtnStyle} title="View comments">
                                        <i className="fas fa-comments"></i>
                                    </button>
                                    <button type="button" onClick={e => { e.stopPropagation(); onIssue(item.id, item.truckNumber); }} style={actionBtnStyle} title="View issues">
                                        <i className="fas fa-tools"></i>
                                    </button>
                                    <button type="button" onClick={e => { e.stopPropagation(); setSelectedTractorForHistory(item); setShowHistoryModal(true); }} style={actionBtnStyle} title="View history">
                                        <i className="fas fa-history"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                }}
                onShowCommentModal={(id, number) => {
                    setModalTractorId(id);
                    setModalTractorNumber(number);
                    setShowCommentModal(true);
                }}
                onShowIssueModal={(id, number) => {
                    setModalTractorId(id);
                    setModalTractorNumber(number);
                    setShowIssueModal(true);
                }}
                onVerify={handleVerifyTractor}
                containerClassName="list-table-container"
                tableClassName="list-table"
            />
        )
    }, [isLoading, isRegionLoading, filteredTractors, viewMode, searchText, selectedPlant, statusFilter, freightFilter, operators, plants, tractors])

    const loadDetailsForTractors = async (tractors) => {
        const items = tractors.slice()
        let index = 0
        const concurrency = 20

        async function worker() {
            while (index < items.length) {
                const current = index++
                const t = items[current]
                try {
                    const [comments, issues] = await Promise.all([
                        TractorService.fetchComments(t.id).catch(() => []),
                        TractorService.fetchIssues(t.id).catch(() => [])
                    ])
                    const openIssuesCount = Array.isArray(issues) ? issues.filter(i => !i.time_completed).length : 0
                    const commentsCount = Array.isArray(comments) ? comments.length : 0
                    t.comments = comments
                    t.issues = issues
                    t.openIssuesCount = openIssuesCount
                    t.commentsCount = commentsCount
                } catch (e) {
                }
            }
        }

        await Promise.all(Array.from({length: concurrency}, () => worker()))
        setTractors([...tractors])
        setAllTractors([...tractors])
    }

    return (
        <>
            <div
                className={`global-dashboard-container dashboard-container global-flush-top flush-top tractors-view${selectedTractor ? ' detail-open' : ''}`}>
                {selectedTractor ? (
                    <TractorDetailView tractorId={selectedTractor} onClose={() => {
                        setSelectedTractor(null);
                        setIsLoading(true);
                        RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code).then(codes => fetchTractors(codes).finally(() => setIsLoading(false)));
                    }}/>
                ) : (
                    <>
                        <TopSection
                            title={title}
                            badge={canShowUnassignedOverlay ? `${unassignedActiveOperatorsCount} Unassigned Active Operator${unassignedActiveOperatorsCount !== 1 ? 's' : ''}` : null}
                            onBadgeClick={canShowUnassignedOverlay ? () => {
                                setSelectedView('Operators', 'Unassigned Active', selectedPlant, 'Tractor');
                                updateOperatorFilter('selectedPlant', selectedPlant);
                                updateOperatorFilter('positionFilter', 'Tractor');
                                updateOperatorFilter('statusFilter', 'Unassigned Active');
                            } : null}
                            addButtonLabel="Add Tractor"
                            onAddClick={() => setShowAddSheet(true)}
                            searchInput={searchInput}
                            onSearchInputChange={(v) => {
                                setSearchInput(v);
                                debouncedSetSearchText(v)
                            }}
                            onClearSearch={() => {
                                setSearchInput('');
                                debouncedSetSearchText('')
                            }}
                            searchPlaceholder="Search by truck or operator..."
                            viewMode={viewMode}
                            onViewModeChange={handleViewModeChange}
                            plants={plants}
                            regionPlantCodes={regionPlantCodes}
                            selectedPlant={selectedPlant}
                            onSelectedPlantChange={(v) => {
                                setSelectedPlant(v);
                                updateTractorFilter('selectedPlant', v)
                            }}
                            statusFilter={statusFilter}
                            statusOptions={filterOptions}
                            onStatusFilterChange={(v) => {
                                setStatusFilter(v);
                                updateTractorFilter('statusFilter', v)
                            }}
                            freightFilter={freightFilter}
                            freightOptions={['All Freight', 'Cement', 'Aggregate', 'Dump Truck']}
                            onFreightFilterChange={(v) => {
                                setFreightFilter(v);
                                updateTractorFilter('freightFilter', v)
                            }}
                            showReset={showReset}
                            onReset={() => {
                                setSearchText('');
                                setSearchInput('');
                                setSelectedPlant('');
                                setStatusFilter('');
                                setFreightFilter('');
                                resetTractorFilters({keepViewMode: true, currentViewMode: viewMode})
                            }}
                            listLabels={['Plant', 'Truck #', 'Status', 'Operator', 'Cleanliness', 'VIN', 'Verified', 'More']}
                            colWidths={['10%', '12%', '12%', '18%', '12%', '16%', '10%', '10%']}
                            forwardedRef={headerRef}
                            onHeaderClick={handleHeaderClick}
                            sortKey={sortKey}
                            sortDirection={sortDirection}
                        />
                        <div className="global-content-container content-container">{content}</div>
                        {showAddSheet &&
                            <TractorAddView plants={plants} operators={operators} onClose={() => setShowAddSheet(false)}
                                            onTractorAdded={newTractor => setTractors([...tractors, newTractor])}/>}
                        {showCommentModal &&
                            <TractorCommentModal tractorId={modalTractorId} tractorNumber={modalTractorNumber}
                                                 onClose={() => setShowCommentModal(false)}/>}
                        {showIssueModal &&
                            <TractorIssueModal tractorId={modalTractorId} tractorNumber={modalTractorNumber}
                                               onClose={() => setShowIssueModal(false)}/>}
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
                                    setShowVerifyModal(false);
                                    setVerifyTractor(null);
                                }}
                                onSaveAndVerify={handleSaveAndVerify}
                                missingFields={[
                                    ...(!verifyTractor.vin || !ValidationUtility.isVIN(verifyTractor.vin) ? ['VIN'] : []),
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

export default TractorsView;
