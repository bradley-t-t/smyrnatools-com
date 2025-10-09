import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import EquipmentAddView from './EquipmentAddView';
import EquipmentUtility from '../../../utils/EquipmentUtility';
import {EquipmentService} from '../../../services/EquipmentService';
import {PlantService} from '../../../services/PlantService';
import LoadingScreen from '../../common/LoadingScreen';
import {usePreferences} from '../../../app/context/PreferencesContext';
import EquipmentCard from './EquipmentCard';
import EquipmentDetailView from './EquipmentDetailView';
import '../../../styles/FilterStyles.css';
import './styles/Equipment.css';
import EquipmentIssueModal from './EquipmentIssueModal'
import EquipmentCommentModal from './EquipmentCommentModal'
import {RegionService} from '../../../services/RegionService'
import {debounce} from '../../../utils/AsyncUtility'
import {getPlantName as lookupGetPlantName} from '../../../utils/LookupUtility'
import FleetUtility from '../../../utils/FleetUtility'
import TopSection from '../../sections/TopSection'
import GridViewModeSection from '../../sections/GridViewModeSection'
import ListViewModeSection from '../../sections/ListViewModeSection'

function EquipmentsView({title = 'Equipment Fleet', onSelectEquipment}) {
    const {preferences, updateEquipmentFilter, resetEquipmentFilters, saveLastViewedFilters} = usePreferences();
    const safeUpdateEquipmentFilter = typeof updateEquipmentFilter === 'function' ? updateEquipmentFilter : () => {
    };
    const [equipments, setEquipments] = useState([]);
    const [plants, setPlants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchText, setSearchText] = useState(preferences.equipmentFilters?.searchText || '');
    const [searchInput, setSearchInput] = useState(preferences.equipmentFilters?.searchText || '');
    const [selectedPlant, setSelectedPlant] = useState(preferences.equipmentFilters?.selectedPlant || '');
    const [statusFilter, setStatusFilter] = useState(preferences.equipmentFilters?.statusFilter || '');
    const [showAddSheet, setShowAddSheet] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [viewMode, setViewMode] = useState(() => {
        if (preferences.equipmentFilters?.viewMode !== undefined && preferences.equipmentFilters?.viewMode !== null) return preferences.equipmentFilters.viewMode
        if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) return preferences.defaultViewMode
        const lastUsed = localStorage.getItem('equipments_last_view_mode')
        return lastUsed || 'grid'
    });
    const [showIssueModal, setShowIssueModal] = useState(false)
    const [showCommentModal, setShowCommentModal] = useState(false)
    const [modalEquipmentId, setModalEquipmentId] = useState(null)
    const [modalEquipmentNumber, setModalEquipmentNumber] = useState('')
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const filterOptions = ['All Statuses', 'Active', 'Spare', 'In Shop', 'Retired', 'Past Due Service', 'Open Issues'];
    const headerRef = useRef(null)

    useEffect(() => {
        async function fetchAllData() {
            setIsLoading(true);
            try {
                await Promise.all([fetchEquipments(), fetchPlants()]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchAllData();
        if (preferences?.equipmentFilters) {
            setSearchText(preferences.equipmentFilters.searchText || '');
            setSearchInput(preferences.equipmentFilters.searchText || '');
            setSelectedPlant(preferences.equipmentFilters.selectedPlant || '');
            setStatusFilter(preferences.equipmentFilters.statusFilter || '');
            setViewMode(preferences.equipmentFilters.viewMode || preferences.defaultViewMode || 'grid');
        }
    }, [preferences]);

    useEffect(() => {
        const code = preferences.selectedRegion?.code || ''
        let cancelled = false

        async function loadRegionPlants() {
            if (!code) {
                setRegionPlantCodes(null);
                return
            }
            try {
                const codes = await RegionService.getAllowedPlantCodes(code)
                if (cancelled) return
                setRegionPlantCodes(codes)
                if (selectedPlant && codes && !codes.has(selectedPlant)) {
                    setSelectedPlant('');
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
        } catch {
            setEquipments([]);
        }
    }

    async function fetchPlants() {
        try {
            const data = await PlantService.fetchPlants();
            setPlants(data);
        } catch {
        }
    }

    function handleDetailViewSaved(updated) {
        if (updated && updated.id) {
            setEquipments(prev => {
                const arr = prev.slice();
                const idx = arr.findIndex(e => e.id === updated.id);
                if (idx >= 0) arr[idx] = {...arr[idx], ...updated};
                else arr.unshift(updated);
                return arr;
            });
        }
        setSelectedEquipment(null);
        fetchEquipments();
    }

    function handleSelectEquipment(equipmentId) {
        const equipment = equipments.find(e => e.id === equipmentId);
        if (!equipment || !equipment.id) return;
        saveLastViewedFilters();
        setSelectedEquipment(equipment);
        if (onSelectEquipment) onSelectEquipment(equipmentId);
    }

    const debouncedSetSearchText = useCallback(debounce(value => {
        setSearchText(value);
        safeUpdateEquipmentFilter('searchText', value);
    }, 300), [safeUpdateEquipmentFilter]);

    const filteredEquipments = useMemo(() => equipments.filter(equipment => {
        const matchesSearch = !searchText.trim() || equipment.identifyingNumber?.toLowerCase().includes(searchText.toLowerCase()) || equipment.equipmentType?.toLowerCase().includes(searchText.toLowerCase());
        const matchesPlant = !selectedPlant || equipment.assignedPlant === selectedPlant;
        const matchesRegion = !preferences.selectedRegion?.code || !regionPlantCodes || regionPlantCodes.has(equipment.assignedPlant);
        let matchesStatus = true;
        if (statusFilter && statusFilter !== 'All Statuses') {
            matchesStatus = ['Active', 'Spare', 'In Shop', 'Retired'].includes(statusFilter) ? equipment.status === statusFilter : statusFilter === 'Past Due Service' ? EquipmentUtility.isServiceOverdue(equipment.lastServiceDate) : statusFilter === 'Open Issues' ? Number(equipment.openIssuesCount || 0) > 0 : false
        }
        return matchesSearch && matchesPlant && matchesRegion && matchesStatus;
    }).sort((a, b) => FleetUtility.compareByStatusThenNumber(a, b, 'status', 'identifyingNumber')), [equipments, selectedPlant, searchText, statusFilter, preferences.selectedRegion?.code, regionPlantCodes]);

    useEffect(() => {
        if (preferences.equipmentFilters?.viewMode !== undefined && preferences.equipmentFilters?.viewMode !== null) setViewMode(preferences.equipmentFilters.viewMode)
        else if (preferences.defaultViewMode !== undefined && preferences.defaultViewMode !== null) setViewMode(preferences.defaultViewMode)
        else {
            const lastUsed = localStorage.getItem('equipments_last_view_mode');
            if (lastUsed) setViewMode(lastUsed)
        }
    }, [preferences])

    function handleViewModeChange(mode) {
        if (viewMode === mode) {
            setViewMode(null);
            updateEquipmentFilter('viewMode', null);
            localStorage.removeItem('equipments_last_view_mode')
        } else {
            setViewMode(mode);
            updateEquipmentFilter('viewMode', mode);
            localStorage.setItem('equipments_last_view_mode', mode)
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
    }, [viewMode, searchInput, selectedPlant, statusFilter])

    const content = useMemo(() => {
        if (isLoading) return <div className="global-loading-container loading-container"><LoadingScreen
            message="Loading equipment..." inline={true}/></div>
        if (filteredEquipments.length === 0) return <div className="global-no-results-container no-results-container">
            <div className="no-results-icon"><i className="fas fa-truck-loading"></i></div>
            <h3>No Equipment Found</h3>
            <p>{searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses') ? "No equipment matches your search criteria." : "There is no equipment in the system yet."}</p>
            <button className="global-primary-button primary-button" onClick={() => setShowAddSheet(true)}>Add
                Equipment
            </button>
        </div>
        if (viewMode === 'grid') return (
            <GridViewModeSection
                filteredItems={filteredEquipments}
                getCardProps={(equipment) => ({
                    plantName: lookupGetPlantName(plants, equipment.assignedPlant),
                    operatorName: undefined
                })}
                handleSelectItem={handleSelectEquipment}
                cardComponent={EquipmentCard}
                itemPropName="equipment"
                onShowCommentModal={(id, number) => { setModalEquipmentId(id); setModalEquipmentNumber(number); setShowCommentModal(true); }}
                onShowIssueModal={(id, number) => { setModalEquipmentId(id); setModalEquipmentNumber(number); setShowIssueModal(true); }}
                gridClassName="grid"
            />
        )
        return (
            <ListViewModeSection
                filteredItems={filteredEquipments}
                operators={[]}
                plants={plants}
                handleSelectItem={handleSelectEquipment}
                headerLabels={['Plant', 'Equipment #', 'Status', 'Type', 'Cleanliness', 'Condition', 'More']}
                colWidths={['12%', '14%', '12%', '24%', '14%', '16%', '8%']}
                renderRow={(item, handleSelect, onComment, onIssue) => {
                    const issuesCount = Number(item.openIssuesCount || 0);
                    const commentsCount = Number(item.commentsCount || 0);
                    return (
                        <tr key={item.id} onClick={() => handleSelect(item.id)} style={{cursor: 'pointer'}}>
                            <td style={{width: '12%'}}>{item.assignedPlant || '---'}</td>
                            <td style={{width: '14%'}}>{item.identifyingNumber || '---'}</td>
                            <td style={{width: '12%'}}><span className="item-status-dot" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', backgroundColor: item.status === 'Active' ? 'var(--status-active)' : item.status === 'Spare' ? 'var(--status-spare)' : item.status === 'In Shop' ? 'var(--status-inshop)' : item.status === 'Retired' ? 'var(--status-retired)' : 'var(--accent)'}}></span>{item.status || '---'}</td>
                            <td style={{width: '24%'}}>{item.equipmentType || '---'}</td>
                            <td style={{width: '14%'}}>{(() => {
                                const rating = Math.round(item.cleanlinessRating || 0);
                                const stars = rating > 0 ? rating : 1;
                                return Array.from({length: stars}).map((_, i) => <i key={i} className="fas fa-star" style={{color: 'var(--accent)'}}></i>)
                            })()}</td>
                            <td style={{width: '16%'}}>{(() => {
                                const rating = Math.round(item.conditionRating || 0);
                                const stars = rating > 0 ? rating : 1;
                                return Array.from({length: stars}).map((_, i) => <i key={i} className="fas fa-star" style={{color: 'var(--accent)'}}></i>)
                            })()}</td>
                            <td style={{width: '8%'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                                    <button type="button" onClick={e => { e.stopPropagation(); onIssue(item.id, item.identifyingNumber); }} style={{background: 'transparent', border: 'none', padding: 0, display: 'inline-flex', alignItems: 'center', cursor: 'pointer'}} title="View issues"><i className="fas fa-tools" style={{color: 'var(--accent)', marginRight: 4}}></i><span>{issuesCount}</span></button>
                                    <button type="button" onClick={e => { e.stopPropagation(); onComment(item.id, item.identifyingNumber); }} style={{background: 'transparent', border: 'none', padding: 0, display: 'inline-flex', alignItems: 'center', cursor: 'pointer'}} title="View comments"><i className="fas fa-comments" style={{color: 'var(--accent)', marginRight: 4}}></i><span>{commentsCount}</span></button>
                                </div>
                            </td>
                        </tr>
                    );
                }}
                onShowCommentModal={(id, number) => { setModalEquipmentId(id); setModalEquipmentNumber(number); setShowCommentModal(true); }}
                onShowIssueModal={(id, number) => { setModalEquipmentId(id); setModalEquipmentNumber(number); setShowIssueModal(true); }}
                containerClassName="list-table-container"
                tableClassName="list-table"
            />
        )
    }, [isLoading, filteredEquipments, viewMode, searchText, selectedPlant, statusFilter, plants, equipments])

    const showReset = (searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses'))

    return (
        <div
            className={`global-dashboard-container dashboard-container global-flush-top flush-top equipments-view${selectedEquipment ? ' detail-open' : ''}`}>
            {selectedEquipment ? (
                <EquipmentDetailView equipmentId={selectedEquipment.id} onClose={() => setSelectedEquipment(null)}
                                     onSaved={handleDetailViewSaved}/>
            ) : (
                <>
                    <TopSection
                        title={title}
                        addButtonLabel="Add Equipment"
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
                        searchPlaceholder="Search by identifying number or equipment type..."
                        viewMode={viewMode}
                        onViewModeChange={handleViewModeChange}
                        plants={plants}
                        regionPlantCodes={regionPlantCodes}
                        selectedPlant={selectedPlant}
                        onSelectedPlantChange={v => {
                            setSelectedPlant(v);
                            safeUpdateEquipmentFilter('selectedPlant', v)
                        }}
                        statusFilter={statusFilter}
                        statusOptions={filterOptions}
                        onStatusFilterChange={v => {
                            setStatusFilter(v);
                            safeUpdateEquipmentFilter('statusFilter', v)
                        }}
                        showReset={showReset}
                        onReset={() => {
                            setSearchText('');
                            setSearchInput('');
                            setSelectedPlant('');
                            setStatusFilter('');
                            resetEquipmentFilters({keepViewMode: true, currentViewMode: viewMode})
                        }}
                        listLabels={['Plant', 'Equipment #', 'Status', 'Type', 'Cleanliness', 'Condition', 'More']}
                        colWidths={['12%', '14%', '12%', '24%', '14%', '16%', '8%']}
                        forwardedRef={headerRef}
                        sticky={true}
                    />
                    <div className="global-content-container content-container">{content}</div>
                    {showAddSheet && <EquipmentAddView plants={plants} onClose={() => setShowAddSheet(false)}
                                                       onEquipmentAdded={newEquipment => setEquipments([...equipments, newEquipment])}/>}
                    {showCommentModal &&
                        <EquipmentCommentModal equipmentId={modalEquipmentId} equipmentNumber={modalEquipmentNumber}
                                               onClose={() => setShowCommentModal(false)}/>}
                    {showIssueModal &&
                        <EquipmentIssueModal equipmentId={modalEquipmentId} equipmentNumber={modalEquipmentNumber}
                                             onClose={() => setShowIssueModal(false)}/>}
                </>
            )}
        </div>
    );
}

export default EquipmentsView;
