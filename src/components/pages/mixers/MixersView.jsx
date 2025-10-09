import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import MixerAddView from './MixerAddView';
import MixerUtility from '../../../utils/MixerUtility';
import {MixerService} from '../../../services/MixerService';
import {PlantService} from '../../../services/PlantService';
import {OperatorService} from '../../../services/OperatorService';
import LoadingScreen from '../../common/LoadingScreen';
import {usePreferences} from '../../../app/context/PreferencesContext';
import MixerCard from './MixerCard';
import '../../../styles/FilterStyles.css';
import './styles/Mixers.css';
import MixerDetailView from './MixerDetailView'
import MixerIssueModal from './MixerIssueModal'
import MixerCommentModal from './MixerCommentModal'
import {RegionService} from '../../../services/RegionService'
import AsyncUtility from '../../../utils/AsyncUtility'
import FleetUtility from '../../../utils/FleetUtility'
import TopSection from '../../sections/TopSection'
import ListViewModeSection from '../../sections/ListViewModeSection'
import GridViewModeSection from '../../sections/GridViewModeSection'

function MixersView({title = 'Mixer Fleet', onSelectMixer}) {
    const {preferences, updateMixerFilter, resetMixerFilters, saveLastViewedFilters} = usePreferences();
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
    const filterOptions = ['All Statuses', 'Active', 'Spare', 'In Shop', 'Retired', 'Past Due Service', 'Verified', 'Not Verified', 'Open Issues'];

    const unassignedActiveOperatorsCount = useMemo(() => FleetUtility.countUnassignedActiveOperators(mixers, operators, searchText, {
        position: 'Mixer Operator',
        selectedPlant,
        operatorIdField: 'employeeId',
        assignedOperatorField: 'assignedOperator',
        assignedPlantField: 'assignedPlant'
    }), [operators, mixers, selectedPlant, searchText])

    useEffect(() => {
        async function fetchAllData() {
            setIsLoading(true);
            try {
                await Promise.all([fetchMixersWithDetails(), fetchOperators(), fetchPlants()]);
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

    async function fetchPlants() {
        try {
            const data = await PlantService.fetchPlants();
            setPlants(data);
        } catch (error) {
        }
    }

    async function fetchMixersWithDetails() {
        try {
            const processedBase = await MixerService.fetchMixersWithDetails()
            setMixers(processedBase)
            setAllMixers(processedBase)
            setMixersLoaded(true)
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

    useEffect(() => {
        async function searchByVin() {
            const normalizedSearch = searchText.trim().toLowerCase().replace(/\s+/g, '');
            if (normalizedSearch.length >= 17 && /^[a-z0-9]+$/i.test(normalizedSearch)) {
                setIsLoading(true);
                try {
                    const vinMixers = await MixerService.searchMixersByVinProcessed(normalizedSearch);
                    setMixers(vinMixers);
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
    }, [searchText, allMixers]);

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
                                statusFilter === 'Not Verified' ? !mixer.isVerified() :
                                    statusFilter === 'Open Issues' ? (Number(mixer.openIssuesCount || 0) > 0) : false
                }
                return matchesSearch && matchesPlant && matchesRegion && matchesStatus
            })
            .sort((a, b) => FleetUtility.compareByStatusThenNumber(a, b, 'status', 'truckNumber'))
    }, [mixers, operators, selectedPlant, searchText, statusFilter, regionPlantCodes])

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
                    getCardProps={(mixer) => {
                        const operator = operators.find(op => op.employeeId === mixer.assignedOperator);
                        const plant = plants.find(p => p.code === mixer.assignedPlant);
                        return {
                            operatorName: operator?.name,
                            plantName: plant?.name || mixer.assignedPlant,
                            showOperatorWarning: false
                        };
                    }}
                    handleSelectItem={handleSelectMixer}
                    cardComponent={MixerCard}
                    itemPropName="mixer"
                    onShowCommentModal={(id, number) => { setModalMixerId(id); setModalMixerNumber(number); setShowCommentModal(true); }}
                    onShowIssueModal={(id, number) => { setModalMixerId(id); setModalMixerNumber(number); setShowIssueModal(true); }}
                    gridClassName="grid"
                />
            )
        }
        return (
            <ListViewModeSection
                filteredItems={filteredMixers}
                handleSelectItem={handleSelectMixer}
                headerLabels={['Plant', 'Truck #', 'Status', 'Operator', 'Cleanliness', 'VIN', 'Verified', 'More']}
                colWidths={['10%', '12%', '12%', '18%', '12%', '18%', '10%', '8%']}
                renderRow={(item, handleSelect, onComment, onIssue) => {
                    const operator = operators.find(op => op.employeeId === item.assignedOperator);
                    const plant = plants.find(p => p.code === item.assignedPlant);
                    return (
                        <tr key={item.id} onClick={() => handleSelect(item.id)} style={{cursor: 'pointer'}}>
                            <td style={{width: '10%'}}>{plant?.name || item.assignedPlant}</td>
                            <td style={{width: '12%'}}>{item.truckNumber}</td>
                            <td style={{width: '12%'}}><span className="item-status-dot" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', backgroundColor: item.status === 'Active' ? 'var(--status-active)' : item.status === 'Spare' ? 'var(--status-spare)' : item.status === 'In Shop' ? 'var(--status-inshop)' : item.status === 'Retired' ? 'var(--status-retired)' : 'var(--accent)'}}></span>{item.status}</td>
                            <td style={{width: '18%'}}>{operator?.name || 'Not Assigned'}</td>
                            <td style={{width: '12%'}}>{(() => {
                                const rating = Math.round(item.cleanlinessRating || 0);
                                const stars = rating > 0 ? rating : 1;
                                return Array.from({length: stars}).map((_, i) => <i key={i} className="fas fa-star" style={{color: 'var(--accent)'}}></i>)
                            })()}</td>
                            <td style={{width: '18%'}}>{item.vinNumber || item.vin}</td>
                            <td style={{width: '10%'}}>{item.isVerified() ? <span><i className="fas fa-check" style={{color: 'green', marginRight: '4px'}}></i>Verified</span> : <span><i className="fas fa-flag" style={{color: 'red', marginRight: '4px'}}></i>Not Verified</span>}</td>
                            <td style={{width: '8%'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                                    <button type="button" onClick={e => { e.stopPropagation(); onComment(item.id, item.truckNumber); }} style={{background: 'transparent', border: 'none', padding: 0, display: 'inline-flex', alignItems: 'center', cursor: 'pointer'}} title="View comments"><i className="fas fa-comments" style={{color: 'var(--accent)', marginRight: 4}}></i><span>{item.commentsCount || 0}</span></button>
                                    <button type="button" onClick={e => { e.stopPropagation(); onIssue(item.id, item.truckNumber); }} style={{background: 'transparent', border: 'none', padding: 0, display: 'inline-flex', alignItems: 'center', cursor: 'pointer'}} title="View issues"><i className="fas fa-tools" style={{color: 'var(--accent)', marginRight: 4}}></i><span>{item.openIssuesCount || 0}</span></button>
                                </div>
                            </td>
                        </tr>
                    );
                }}
                onShowCommentModal={(id, number) => { setModalMixerId(id); setModalMixerNumber(number); setShowCommentModal(true); }}
                onShowIssueModal={(id, number) => { setModalMixerId(id); setModalMixerNumber(number); setShowIssueModal(true); }}
                containerClassName="list-table-container"
                tableClassName="list-table"
            />
        )
    }, [isLoading, isRegionLoading, filteredMixers, viewMode, searchText, selectedPlant, statusFilter, operators, plants, mixers])

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

    return (
        <>
            {canShowUnassignedOverlay && (
                <div className="global-availability-overlay operators-availability-overlay">
                    {unassignedActiveOperatorsCount} active
                    operator{unassignedActiveOperatorsCount !== 1 ? 's' : ''} unassigned
                </div>
            )}
            <div
                className={`global-dashboard-container dashboard-container global-flush-top flush-top mixers-view${selectedMixer ? ' detail-open' : ''}`}>
                {selectedMixer ? (
                    <MixerDetailView mixerId={selectedMixer} onClose={() => setSelectedMixer(null)}/>
                ) : (
                    <>
                        <TopSection
                            title={title}
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
                            colWidths={['10%', '12%', '12%', '18%', '12%', '18%', '10%', '8%']}
                            forwardedRef={headerRef}
                        />
                        <div className="global-content-container content-container">{content}</div>
                        {showAddSheet &&
                            <MixerAddView plants={plants} operators={operators} onClose={() => setShowAddSheet(false)}
                                          onMixerAdded={newMixer => setMixers([...mixers, newMixer])}/>}
                        {showCommentModal && <MixerCommentModal mixerId={modalMixerId} mixerNumber={modalMixerNumber}
                                                                onClose={() => setShowCommentModal(false)}/>}
                        {showIssueModal && <MixerIssueModal mixerId={modalMixerId} mixerNumber={modalMixerNumber}
                                                            onClose={() => setShowIssueModal(false)}/>}
                    </>
                )}
            </div>
        </>
    )
}

export default MixersView;
