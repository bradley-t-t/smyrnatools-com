import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import MixerAddView from './MixerAddView';
import MixerUtility from '../../utils/MixerUtility';
import {MixerService} from '../../services/MixerService';
import {PlantService} from '../../services/PlantService';
import {OperatorService} from '../../services/OperatorService';
import LoadingScreen from '../../components/common/LoadingScreen';
import {usePreferences} from '../../app/context/PreferencesContext';
import MixerCard from './MixerCard';
import '../../styles/FilterStyles.css';
import './styles/Mixers.css';
import MixerDetailView from './MixerDetailView'
import MixerIssueModal from './MixerIssueModal'
import MixerCommentModal from './MixerCommentModal'
import VerificationRequirementsModal from '../../components/common/VerificationRequirementsModal'
import {RegionService} from '../../services/RegionService'
import AsyncUtility from '../../utils/AsyncUtility'
import FleetUtility from '../../utils/FleetUtility'
import FormatUtility from '../../utils/FormatUtility'
import TopSection from '../../components/sections/TopSection'
import ListViewModeSection from '../../components/sections/ListViewModeSection'
import GridViewModeSection from '../../components/sections/GridViewModeSection'
import HistoryViewSection from '../../components/sections/HistoryViewSection'
import ThemeUtility from '../../utils/ThemeUtility'
import {ValidationUtility} from '../../utils/ValidationUtility'

function MixersView({title = 'Mixer Fleet', onSelectMixer, setSelectedView}) {
    const {
        preferences,
        updateMixerFilter,
        resetMixerFilters,
        saveLastViewedFilters,
        updateOperatorFilter
    } = usePreferences();
    const headerRef = useRef(null)
    const [mixers, setMixers] = useState([]);
    const [allMixers, setAllMixers] = useState([]);
    const [operators, setOperators] = useState([]);
    const [plants, setPlants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegionLoading, setIsRegionLoading] = useState(false)
    const [searchText, setSearchText] = useState(preferences.mixerFilters?.searchText || '');
    const [searchInput, setSearchInput] = useState(preferences.mixerFilters?.searchText || '');
    const [selectedPlant, setSelectedPlant] = useState(preferences.mixerFilters?.selectedPlant || '');
    const [statusFilter, setStatusFilter] = useState(preferences.mixerFilters?.statusFilter || '');
    const [showAddSheet, setShowAddSheet] = useState(false);
    const [selectedMixer, setSelectedMixer] = useState(null);
    const [viewMode, setViewMode] = useState(() => {
        if (preferences.mixerFilters?.viewMode !== undefined && preferences.mixerFilters?.viewMode !== null) return preferences.mixerFilters.viewMode
        if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) return preferences.defaultViewMode
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
    const filterOptions = ['All Statuses', 'Active', 'Spare', 'In Shop', 'Retired', 'Past Due Service', 'Verified', 'Not Verified', 'Open Issues'];
    const sortMappings = {
        'Plant': 'assignedPlant',
        'Truck #': 'status',
        'Status': 'status',
        'Operator': 'assignedOperator',
        'Cleanliness': 'cleanlinessRating',
        'VIN': 'vinNumber',
        'Verified': null,
        'More': null
    }

    const unassignedActiveOperatorsCount = useMemo(() => FleetUtility.countUnassignedActiveOperators(mixers, operators, searchText, {
        position: 'Mixer Operator',
        selectedPlant,
        regionPlantCodes,
        operatorIdField: 'employeeId',
        assignedOperatorField: 'assignedOperator',
        assignedPlantField: 'assignedPlant'
    }), [operators, mixers, selectedPlant, searchText, regionPlantCodes])

    useEffect(() => {
        async function fetchAllData() {
            setIsLoading(true);
            try {
                const codes = await RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code)
                setRegionPlantCodes(codes)
                await Promise.all([fetchMixersWithDetails(codes), fetchOperators(), fetchPlants(codes)]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchAllData();
        if (preferences?.mixerFilters) {
            setSearchText(preferences.mixerFilters.searchText || '');
            setSearchInput(preferences.mixerFilters.searchText || '');
            setSelectedPlant(preferences.mixerFilters.selectedPlant || '');
            setStatusFilter(preferences.mixerFilters.statusFilter || '');
        }
        if (preferences.mixerFilters?.viewMode !== undefined && preferences.mixerFilters?.viewMode !== null) {
            setViewMode(preferences.mixerFilters.viewMode)
        } else if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) {
            setViewMode(preferences.defaultViewMode)
        } else {
            const lastUsed = localStorage.getItem('mixers_last_view_mode')
            if (lastUsed) setViewMode(lastUsed)
        }
    }, [preferences]);

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

    const loadDetailsForMixers = async (mixers) => {
        const items = mixers.slice()
        let index = 0
        const concurrency = 20

        async function worker() {
            while (index < items.length) {
                const current = index++
                const m = items[current]
                try {
                    const [comments, issues] = await Promise.all([
                        MixerService.fetchComments(m.id).catch(() => []),
                        MixerService.fetchIssues(m.id).catch(() => [])
                    ])
                    const openIssuesCount = Array.isArray(issues) ? issues.filter(i => !i.time_completed).length : 0
                    const commentsCount = Array.isArray(comments) ? comments.length : 0
                    m.comments = comments
                    m.issues = issues
                    m.openIssuesCount = openIssuesCount
                    m.commentsCount = commentsCount
                } catch (e) {
                }
            }
        }

        await Promise.all(Array.from({length: concurrency}, () => worker()))
        setMixers([...mixers])
        setAllMixers([...mixers])
    }

    async function fetchMixersWithDetails(codes) {
        try {
            const processedBase = await MixerService.fetchMixersWithDetails(codes)
            setMixers(processedBase)
            setAllMixers(processedBase)
            setMixersLoaded(true)
            loadDetailsForMixers(processedBase)
            setTimeout(() => {
                MixerService.ensureSpareIfNoOperator(processedBase).catch(() => {
                })
            }, 0)
        } catch (error) {
        }
    }

    function handleSelectMixer(mixerId) {
        const mixer = mixers.find(m => m.id === mixerId);
        if (mixer) {
            saveLastViewedFilters();
            setSelectedMixer(mixer);
            onSelectMixer?.(mixerId);
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
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(label)
            setSortDirection('asc')
        }
    }

    const handleVerifyMixer = useCallback(async (mixerId) => {
        const mixer = mixers.find(m => m.id === mixerId);
        if (mixer) {
            if (mixer.status === 'Retired') {
                return;
            }
            setVerifyMixer(mixer);
            setVerifyVin(mixer.vin || mixer.vinNumber || '');
            setVerifyMake(mixer.make || '');
            setVerifyModel(mixer.model || '');
            setVerifyYear(mixer.year || '');
            setVerifyLastServiceDate(mixer.lastServiceDate || null);
            setVerifyLastChipDate(mixer.lastChipDate || null);
            setShowVerifyModal(true);
        }
    }, [mixers]);

    const handleSaveAndVerify = useCallback(async () => {
        if (!verifyMixer) return;
        
        try {
            const updates = {};
            if (verifyVin && verifyVin.trim() !== '' && verifyVin !== (verifyMixer.vin || '')) {
                updates.vin = verifyVin;
            }
            if (verifyMake && verifyMake.trim() !== '' && verifyMake !== (verifyMixer.make || '')) {
                updates.make = verifyMake;
            }
            if (verifyModel && verifyModel.trim() !== '' && verifyModel !== (verifyMixer.model || '')) {
                updates.model = verifyModel;
            }
            if (verifyYear && String(verifyYear).trim() !== '' && verifyYear !== (verifyMixer.year || '')) {
                updates.year = verifyYear;
            }
            if (verifyLastServiceDate && verifyLastServiceDate !== verifyMixer.lastServiceDate) {
                updates.lastServiceDate = verifyLastServiceDate;
            }
            if (verifyLastChipDate && verifyLastChipDate !== verifyMixer.lastChipDate) {
                updates.lastChipDate = verifyLastChipDate;
            }
            
            if (Object.keys(updates).length > 0) {
                await MixerService.updateMixer(verifyMixer.id, updates);
            }
            
            const verified = await MixerService.verifyMixer(verifyMixer.id);
            
            setMixers(prevMixers => prevMixers.map(m => 
                m.id === verifyMixer.id ? verified : m
            ));
            setAllMixers(prevMixers => prevMixers.map(m => 
                m.id === verifyMixer.id ? verified : m
            ));
            
            setShowVerifyModal(false);
            setVerifyMixer(null);
        } catch (error) {
            console.error('Failed to verify mixer:', error);
            alert('Failed to verify mixer. Please try again.');
        }
    }, [verifyMixer, verifyVin, verifyMake, verifyModel, verifyYear, verifyLastServiceDate, verifyLastChipDate]);

    useEffect(() => {
        async function searchByVin() {
            const normalizedSearch = searchText.trim().toLowerCase().replace(/\s+/g, '');
            if (normalizedSearch.length >= 17 && /^[a-z0-9]+$/i.test(normalizedSearch)) {
                setIsLoading(true);
                try {
                    const vinMixers = await MixerService.searchMixersByVinProcessed(normalizedSearch);
                    const filteredVinMixers = regionPlantCodes ? vinMixers.filter(m => regionPlantCodes.has(String(m.assignedPlant || '').trim().toUpperCase())) : vinMixers
                    setMixers(filteredVinMixers);
                    setMixersLoaded(true)
                } catch {
                }
                setIsLoading(false);
            } else {
                setMixers(allMixers);
            }
        }

        if (searchText.trim().length >= 1) {
            searchByVin();
        } else {
            setMixers(allMixers);
        }
    }, [searchText, allMixers, regionPlantCodes]);

    const filteredMixers = useMemo(() => {
        return mixers
            .filter(mixer => {
                const normalizedSearch = searchText.trim().toLowerCase().replace(/\s+/g, '')
                const truckMatch = (mixer.truckNumber || '').toLowerCase().includes(normalizedSearch)
                const operatorMatch = mixer.assignedOperator && operators.find(op => op.employeeId === mixer.assignedOperator)?.name.toLowerCase().includes(normalizedSearch)
                const vinRaw = (mixer.vinNumber || mixer.vin || '').toLowerCase()
                const vinNoSpaces = vinRaw.replace(/\s+/g, '')
                const vinMatch = vinRaw.includes(searchText.trim().toLowerCase()) || vinNoSpaces.includes(normalizedSearch)
                const matchesSearch = !normalizedSearch || truckMatch || operatorMatch || vinMatch
                const matchesPlant = !selectedPlant || mixer.assignedPlant === selectedPlant
                const matchesRegion = !regionPlantCodes || regionPlantCodes.size === 0 || regionPlantCodes.has(String(mixer.assignedPlant || '').trim().toUpperCase())
                let matchesStatus = true
                if (statusFilter && statusFilter !== 'All Statuses') {
                    matchesStatus = ['Active', 'Spare', 'In Shop', 'Retired'].includes(statusFilter) ? mixer.status === statusFilter :
                        statusFilter === 'Past Due Service' ? MixerUtility.isServiceOverdue(mixer.lastServiceDate) :
                            statusFilter === 'Verified' ? mixer.isVerified() :
                                statusFilter === 'Not Verified' ? (!mixer.isVerified() && mixer.status !== 'Retired') :
                                    statusFilter === 'Open Issues' ? (Number(mixer.openIssuesCount || 0) > 0) : false
                }
                return matchesSearch && matchesPlant && matchesRegion && matchesStatus
            })
            .sort((a, b) => {
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
            })
    }, [mixers, operators, selectedPlant, searchText, statusFilter, regionPlantCodes, sortKey, sortDirection, plants])

    const debouncedSetSearchText = useCallback(AsyncUtility.debounce((value) => {
        setSearchText(value);
        updateMixerFilter('searchText', value);
    }, 300), []);

    const canShowUnassignedOverlay = mixersLoaded && operatorsLoaded && !isLoading && unassignedActiveOperatorsCount > 0

    const content = useMemo(() => {
        if (isLoading || isRegionLoading) {
            return (
                <div className="global-loading-container loading-container">
                    <LoadingScreen message="Loading mixers..." inline={true}/>
                </div>
            )
        }
        if (filteredMixers.length === 0) {
            return (
                <div className="global-no-results-container no-results-container">
                    <div className="no-results-icon">
                        <i className="fas fa-truck-loading"></i>
                    </div>
                    <h3>No Mixers Found</h3>
                    <p>{searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses') ? "No mixers match your search criteria." : "There are no mixers in the system yet."}</p>
                    <button className="global-primary-button primary-button" onClick={() => setShowAddSheet(true)}>Add
                        Mixer
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
                        setModalMixerId(id);
                        setModalMixerNumber(number);
                        setShowCommentModal(true);
                    }}
                    onShowIssueModal={(id, number) => {
                        setModalMixerId(id);
                        setModalMixerNumber(number);
                        setShowIssueModal(true);
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
                renderRow={(item, handleSelect, onComment, onIssue, onVerify) => {
                    const operator = operators.find(op => op.employeeId === item.assignedOperator);
                    const plant = plants.find(p => p.code === item.assignedPlant);
                    return (
                        <tr key={item.id} onClick={() => handleSelect(item.id)} style={{cursor: 'pointer'}}>
                            <td style={{width: '10%'}}>{plant?.name || item.assignedPlant}</td>
                            <td style={{width: '12%'}}>{item.truckNumber}</td>
                            <td style={{width: '12%'}}><span className="item-status-dot" style={{
                                display: 'inline-block',
                                verticalAlign: 'middle',
                                marginRight: '8px',
                                backgroundColor: item.status === 'Active' ? 'var(--status-active)' : item.status === 'Spare' ? 'var(--status-spare)' : item.status === 'In Shop' ? 'var(--status-inshop)' : item.status === 'Retired' ? 'var(--status-retired)' : 'var(--accent)'
                            }}></span>{item.status}</td>
                            <td style={{width: '18%'}}>{operator?.name || 'Not Assigned'}</td>
                            <td style={{width: '12%'}}>{(() => {
                                const rating = Math.round(item.cleanlinessRating || 0);
                                const stars = rating > 0 ? rating : 1;
                                return Array.from({length: stars}).map((_, i) => <i key={i} className="fas fa-star"
                                                                                    style={{color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor))}}></i>)
                            })()}</td>
                            <td style={{width: '16%'}}>{item.vinNumber || item.vin}</td>
                            <td style={{width: '10%'}}>
                                {item.status === 'Retired' ? (
                                    <span className="list-verify-status list-verify-na">N/A</span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onVerify) {
                                                onVerify(item.id, item.truckNumber);
                                            }
                                        }}
                                        title={item.isVerified() ? 'Verified - Click to view details' : 'Click to verify'}
                                        className={`list-verify-btn ${item.isVerified() ? 'verified' : 'not-verified'}`}
                                    >
                                        <i className={`fas ${item.isVerified() ? 'fa-check' : 'fa-flag'}`}></i>
                                        <span>{item.isVerified() ? 'Verified' : 'Not Verified'}</span>
                                    </button>
                                )}
                            </td>
                            <td style={{width: '10%'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                    <button type="button" onClick={e => {
                                        e.stopPropagation();
                                        onComment(item.id, item.truckNumber);
                                    }} style={{
                                        background: 'transparent',
                                        border: 'none',
                                        padding: 0,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        cursor: 'pointer'
                                    }} title="View comments"><i className="fas fa-comments" style={{
                                        color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor)),
                                        marginRight: 4
                                    }}></i><span>{item.commentsCount || 0}</span></button>
                                    <button type="button" onClick={e => {
                                        e.stopPropagation();
                                        onIssue(item.id, item.truckNumber);
                                    }} style={{
                                        background: 'transparent',
                                        border: 'none',
                                        padding: 0,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        cursor: 'pointer'
                                    }} title="View issues"><i className="fas fa-tools" style={{
                                        color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor)),
                                        marginRight: 4
                                    }}></i><span>{item.openIssuesCount || 0}</span></button>
                                    <button type="button" onClick={e => {
                                        e.stopPropagation();
                                        setSelectedMixerForHistory(item);
                                        setShowHistoryModal(true);
                                    }} style={{
                                        background: 'transparent',
                                        border: 'none',
                                        padding: 0,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        cursor: 'pointer'
                                    }} title="View history"><i className="fas fa-history" style={{
                                        color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor)),
                                        marginRight: 4
                                    }}></i></button>
                                </div>
                            </td>
                        </tr>
                    );
                }}
                onShowCommentModal={(id, number) => {
                    setModalMixerId(id);
                    setModalMixerNumber(number);
                    setShowCommentModal(true);
                }}
                onShowIssueModal={(id, number) => {
                    setModalMixerId(id);
                    setModalMixerNumber(number);
                    setShowIssueModal(true);
                }}
                onVerify={handleVerifyMixer}
                containerClassName="list-table-container"
                tableClassName="list-table"
            />
        )
    }, [isLoading, isRegionLoading, filteredMixers, viewMode, searchText, selectedPlant, statusFilter, operators, plants, mixers, handleVerifyMixer])

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

    const showReset = (searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses'))

    useEffect(() => {
        document.documentElement.style.setProperty('--star-color', ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor)));
    }, [preferences.accentColor]);

    return (
        <>
            <div
                className={`global-dashboard-container dashboard-container global-flush-top flush-top mixers-view${selectedMixer ? ' detail-open' : ''}`}>
                {selectedMixer ? (
                    <MixerDetailView mixerId={selectedMixer} onClose={() => setSelectedMixer(null)}/>
                ) : (
                    <>
                        <TopSection
                            title={title}
                            badge={canShowUnassignedOverlay ? `${unassignedActiveOperatorsCount} Unassigned Active Operator${unassignedActiveOperatorsCount !== 1 ? 's' : ''}` : null}
                            onBadgeClick={canShowUnassignedOverlay ? () => {
                                setSelectedView('Operators', 'Unassigned Active', selectedPlant, 'Mixer');
                                updateOperatorFilter('selectedPlant', selectedPlant);
                                updateOperatorFilter('positionFilter', 'Mixer');
                                updateOperatorFilter('statusFilter', 'Unassigned Active');
                            } : null}
                            addButtonLabel="Add Mixer"
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
                                updateMixerFilter('selectedPlant', v)
                            }}
                            statusFilter={statusFilter}
                            statusOptions={filterOptions}
                            onStatusFilterChange={(v) => {
                                setStatusFilter(v);
                                updateMixerFilter('statusFilter', v)
                            }}
                            showReset={showReset}
                            onReset={() => {
                                setSearchText('');
                                setSearchInput('');
                                setSelectedPlant('');
                                setStatusFilter('');
                                resetMixerFilters({keepViewMode: true, currentViewMode: viewMode})
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
                            <MixerAddView plants={plants} operators={operators} onClose={() => setShowAddSheet(false)}
                                          onMixerAdded={newMixer => setMixers([...mixers, newMixer])}/>}
                        {showCommentModal && <MixerCommentModal mixerId={modalMixerId} mixerNumber={modalMixerNumber}
                                                                onClose={() => setShowCommentModal(false)}/>}
                        {showIssueModal && <MixerIssueModal mixerId={modalMixerId} mixerNumber={modalMixerNumber}
                                                            onClose={() => setShowIssueModal(false)}/>}
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
                                    setShowVerifyModal(false);
                                    setVerifyMixer(null);
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
                            />
                        )}
                    </>
                )}
            </div>
        </>
    )
}

export default MixersView;
