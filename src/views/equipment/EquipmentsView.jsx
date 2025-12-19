import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import EquipmentAddView from './EquipmentAddView';
import EquipmentUtility from '../../utils/EquipmentUtility';
import {EquipmentService} from '../../services/EquipmentService';
import {PlantService} from '../../services/PlantService';
import LoadingScreen from '../../components/common/LoadingScreen';
import {usePreferences} from '../../app/context/PreferencesContext';
import EquipmentCard from './EquipmentCard';
import EquipmentDetailView from './EquipmentDetailView';
import '../../styles/FilterStyles.css';
import './styles/Equipment.css';
import EquipmentIssueModal from './EquipmentIssueModal'
import EquipmentCommentModal from './EquipmentCommentModal'
import VerificationRequirementsModal from '../../components/common/VerificationRequirementsModal'
import {RegionService} from '../../services/RegionService'
import {debounce} from '../../utils/AsyncUtility'
import {getPlantName as lookupGetPlantName} from '../../utils/LookupUtility'
import FleetUtility from '../../utils/FleetUtility'
import TopSection from '../../components/sections/TopSection'
import GridViewModeSection from '../../components/sections/GridViewModeSection'
import ListViewModeSection from '../../components/sections/ListViewModeSection'
import HistoryViewSection from '../../components/sections/HistoryViewSection'
import ThemeUtility from '../../utils/ThemeUtility'
import CleanupUtility from '../../utils/CleanupUtility'
import {supabase} from '../../services/DatabaseService'

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
    const [equipmentTypeFilter, setEquipmentTypeFilter] = useState(preferences.equipmentFilters?.equipmentTypeFilter || '');
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

    const filterOptions = ['All Statuses', 'Active', 'Spare', 'In Shop', 'Retired', 'Past Due Service', 'Verified', 'Not Verified', 'Open Issues'];
    const equipmentTypeOptions = ['', 'Front-End Loader', 'Excavator', 'Mini-Excavator', 'Backhoe', 'Skid Steer', 'Forklift', 'Manlift', 'Dozer', 'Off-Road Dump Truck', 'Water/Trash Pump', 'Water Truck', 'Trailer', 'Portable Compressor', 'Portable Conveyor', 'Crusher', 'Ice Conveyor', 'Rotary Mixer', 'Road Reclaimer', 'Roller', 'Maintainer', 'Sweeper', 'Other', 'Unknown'];
    const headerRef = useRef(null)
    const sortMappings = {
        'Plant': 'assignedPlant',
        'Equipment #': 'identifyingNumber',
        'Status': 'status',
        'Type': 'equipmentType',
        'Make & Model': 'equipmentMake',
        'Cleanliness': 'cleanlinessRating',
        'Condition': 'conditionRating',
        'Verified': 'verified',
        'More': null
    }

    const attachIsVerified = useCallback((obj) => {
        if (!obj) return obj
        obj.isVerified = function(latestHistoryDate) {
            return EquipmentUtility.isVerified(this.updatedLast, this.updatedAt, this.updatedBy, latestHistoryDate ?? this.latestHistoryDate)
        }
        return obj
    }, [])

    const handleRealtimeUpdate = useCallback((eventType, data) => {
        if (eventType === 'UPDATE' && data.new) {
            const updatedData = data.new
            setEquipments(prev => prev.map(equipment => {
                if (equipment.id === updatedData.id) {
                    const updated = {
                        ...equipment,
                        identifyingNumber: updatedData.identifying_number ?? equipment.identifyingNumber,
                        assignedPlant: updatedData.assigned_plant ?? equipment.assignedPlant,
                        equipmentType: updatedData.equipment_type ?? equipment.equipmentType,
                        status: updatedData.status ?? equipment.status,
                        lastServiceDate: updatedData.last_service_date ?? equipment.lastServiceDate,
                        hoursMileage: updatedData.hours_mileage ?? equipment.hoursMileage,
                        cleanlinessRating: updatedData.cleanliness_rating ?? equipment.cleanlinessRating,
                        conditionRating: updatedData.condition_rating ?? equipment.conditionRating,
                        equipmentMake: updatedData.equipment_make ?? equipment.equipmentMake,
                        equipmentModel: updatedData.equipment_model ?? equipment.equipmentModel,
                        yearMade: updatedData.year_made ?? equipment.yearMade,
                        updatedAt: updatedData.updated_at ?? equipment.updatedAt,
                        updatedLast: updatedData.updated_last ?? equipment.updatedLast,
                        updatedBy: updatedData.updated_by ?? equipment.updatedBy
                    }
                    return attachIsVerified(updated)
                }
                return equipment
            }))
        } else if (eventType === 'INSERT' && data.new) {
            const newData = data.new
            if (regionPlantCodes && !regionPlantCodes.has(newData.assigned_plant)) return
            const newEquipment = attachIsVerified({
                id: newData.id,
                identifyingNumber: newData.identifying_number ?? '',
                assignedPlant: newData.assigned_plant ?? '',
                equipmentType: newData.equipment_type ?? '',
                status: newData.status ?? 'Active',
                lastServiceDate: newData.last_service_date ?? null,
                hoursMileage: newData.hours_mileage ?? null,
                cleanlinessRating: newData.cleanliness_rating ?? null,
                conditionRating: newData.condition_rating ?? null,
                equipmentMake: newData.equipment_make ?? '',
                equipmentModel: newData.equipment_model ?? '',
                yearMade: newData.year_made ?? '',
                createdAt: newData.created_at ?? new Date().toISOString(),
                updatedAt: newData.updated_at ?? new Date().toISOString(),
                updatedLast: newData.updated_last ?? new Date().toISOString(),
                updatedBy: newData.updated_by ?? null
            })
            setEquipments(prev => {
                if (prev.some(e => e.id === newData.id)) return prev
                return [...prev, newEquipment]
            })
        } else if (eventType === 'DELETE' && data.old) {
            setEquipments(prev => prev.filter(equipment => equipment.id !== data.old.id))
        }
    }, [regionPlantCodes, attachIsVerified])

    useEffect(() => {
        const channel = supabase
            .channel('equipment-realtime-changes')
            .on(
                'postgres_changes',
                {event: '*', schema: 'public', table: 'heavy_equipment'},
                (payload) => {
                    const eventType = payload.eventType
                    const data = {new: payload.new, old: payload.old}
                    handleRealtimeUpdate(eventType, data)
                }
            )
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
            setIsLoading(true);
            try {
                const codes = await RegionService.getAllowedPlantCodes(preferences.selectedRegion?.code)
                setRegionPlantCodes(codes)
                await Promise.all([fetchEquipments(codes), fetchPlants(codes)]);
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
            setEquipmentTypeFilter(preferences.equipmentFilters.equipmentTypeFilter || '');
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
            loadDetailsForEquipments(processedBase)

            if (processedBase && processedBase.length > 0) {
                setTimeout(() => {
                    runVerificationCheck(processedBase)
                }, 1000)
            }
        } catch {
            setEquipments([]);
        }
    }

    async function fetchPlants(codes) {
        try {
            const data = await PlantService.fetchPlants(codes);
            setPlants(data);
        } catch {
        }
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
        } catch (error) {
        }
    }

    const loadDetailsForEquipments = async (equipments) => {
        const items = equipments.slice()
        let index = 0
        const concurrency = 20

        async function worker() {
            while (index < items.length) {
                const current = index++
                const e = items[current]
                try {
                    const [comments, issues] = await Promise.all([
                        EquipmentService.fetchComments(e.id).catch(() => []),
                        EquipmentService.fetchIssues(e.id).catch(() => [])
                    ])
                    const openIssuesCount = Array.isArray(issues) ? issues.filter(i => !i.time_completed).length : 0
                    const commentsCount = Array.isArray(comments) ? comments.length : 0
                    e.comments = comments
                    e.issues = issues
                    e.openIssuesCount = openIssuesCount
                    e.commentsCount = commentsCount
                } catch (e) {
                }
            }
        }

        await Promise.all(Array.from({length: concurrency}, () => worker()))
        setEquipments([...items])
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
    }

    async function handleCloseDetailView() {
        await fetchEquipments();
        setSelectedEquipment(null);
    }

    function handleSelectEquipment(equipmentId) {
        const equipment = equipments.find(e => e.id === equipmentId);
        if (!equipment || !equipment.id) return;
        saveLastViewedFilters();
        setSelectedEquipment(equipment);
        if (onSelectEquipment) onSelectEquipment(equipmentId);
    }

    const handleVerifyEquipment = useCallback(async (equipmentId) => {
        const equipment = equipments.find(e => e.id === equipmentId);
        if (equipment) {
            if (equipment.status === 'Retired') {
                return;
            }
            setVerifyEquipment(equipment);
            setVerifyVin(equipment.vin || '');
            setVerifyMake(equipment.make || equipment.equipmentMake || '');
            setVerifyModel(equipment.model || equipment.equipmentModel || '');
            setVerifyYear(equipment.year || equipment.yearMade || '');
            setVerifyLastServiceDate(equipment.lastServiceDate || null);
            setShowVerifyModal(true);
        }
    }, [equipments]);

    const handleSaveAndVerify = useCallback(async () => {
        if (!verifyEquipment) return;

        try {
            const updates = {};
            if (verifyVin && verifyVin.trim() !== '' && verifyVin !== (verifyEquipment.vin || '')) {
                updates.vin = verifyVin;
            }
            if (verifyMake && verifyMake.trim() !== '' && verifyMake !== (verifyEquipment.make || verifyEquipment.equipmentMake || '')) {
                updates.make = verifyMake;
            }
            if (verifyModel && verifyModel.trim() !== '' && verifyModel !== (verifyEquipment.model || verifyEquipment.equipmentModel || '')) {
                updates.model = verifyModel;
            }
            if (verifyYear && String(verifyYear).trim() !== '' && verifyYear !== (verifyEquipment.year || verifyEquipment.yearMade || '')) {
                updates.year = verifyYear;
            }
            if (verifyLastServiceDate && verifyLastServiceDate !== verifyEquipment.lastServiceDate) {
                updates.lastServiceDate = verifyLastServiceDate;
            }

            if (Object.keys(updates).length > 0) {
                await EquipmentService.updateEquipment(verifyEquipment.id, updates);
            }

            const verified = await EquipmentService.verifyEquipment(verifyEquipment.id);

            setEquipments(prevEquipments => prevEquipments.map(e =>
                e.id === verifyEquipment.id ? verified : e
            ));

            setShowVerifyModal(false);
            setVerifyEquipment(null);
        } catch (error) {
            console.error('Failed to verify equipment:', error);
            alert('Failed to verify equipment. Please try again.');
        }
    }, [verifyEquipment, verifyVin, verifyMake, verifyModel, verifyYear, verifyLastServiceDate]);

    const debouncedSetSearchText = useCallback(debounce(value => {
        setSearchText(value);
        safeUpdateEquipmentFilter('searchText', value);
    }, 300), [safeUpdateEquipmentFilter]);

    const filteredEquipments = useMemo(() => {
        const filtered = equipments.filter(equipment => {
            const matchesSearch = !searchText.trim() || equipment.identifyingNumber?.toLowerCase().includes(searchText.toLowerCase()) || equipment.equipmentType?.toLowerCase().includes(searchText.toLowerCase());
            const matchesPlant = !selectedPlant || equipment.assignedPlant === selectedPlant;
            const matchesRegion = !preferences.selectedRegion?.code || !regionPlantCodes || regionPlantCodes.has(equipment.assignedPlant);
            let matchesStatus = true;
            if (statusFilter && statusFilter !== 'All Statuses') {
                matchesStatus = ['Active', 'Spare', 'In Shop', 'Retired'].includes(statusFilter) ? equipment.status === statusFilter : statusFilter === 'Past Due Service' ? EquipmentUtility.isServiceOverdue(equipment.lastServiceDate) : statusFilter === 'Verified' ? EquipmentUtility.isVerified(equipment.updatedLast, equipment.updatedAt, equipment.updatedBy) : statusFilter === 'Not Verified' ? (!EquipmentUtility.isVerified(equipment.updatedLast, equipment.updatedAt, equipment.updatedBy) && equipment.status !== 'Retired') : statusFilter === 'Open Issues' ? Number(equipment.openIssuesCount || 0) > 0 : false
            }
            const matchesType = !equipmentTypeFilter || equipment.equipmentType === equipmentTypeFilter;
            return matchesSearch && matchesPlant && matchesRegion && matchesStatus && matchesType;
        });

        return FleetUtility.sortWithRetiredLast(filtered, (a, b) => {
            if (!sortKey) {
                return FleetUtility.compareByStatusThenNumber(a, b, 'status', 'identifyingNumber')
            }
            const prop = sortMappings[sortKey]
            let aVal, bVal;
            if (sortKey === 'Verified') {
                aVal = a.status === 'Retired' ? 0 : (EquipmentUtility.isVerified(a.updatedLast, a.updatedAt, a.updatedBy) ? 2 : 1)
                bVal = b.status === 'Retired' ? 0 : (EquipmentUtility.isVerified(b.updatedLast, b.updatedAt, b.updatedBy) ? 2 : 1)
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
        }, 'status');
    }, [equipments, selectedPlant, searchText, statusFilter, equipmentTypeFilter, preferences.selectedRegion?.code, regionPlantCodes, sortKey, sortDirection]);

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

    function handleHeaderClick(label) {
        if (sortKey === label) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
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
        if (isLoading) return <div className="global-loading-container loading-container"><LoadingScreen
            message="Loading equipment..." inline={true}/></div>
        if (filteredEquipments.length === 0) return <div className="global-no-results-container no-results-container">
            <div className="no-results-icon"><i className="fas fa-truck-loading"></i></div>
            <h3>No Equipment Found</h3>
            <p>{searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses') || equipmentTypeFilter ? "No equipment matches your search criteria." : "There is no equipment in the system yet."}</p>
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
                onShowCommentModal={(id, number) => {
                    setModalEquipmentId(id);
                    setModalEquipmentNumber(number);
                    setShowCommentModal(true);
                }}
                onShowIssueModal={(id, number) => {
                    setModalEquipmentId(id);
                    setModalEquipmentNumber(number);
                    setShowIssueModal(true);
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
                headerLabels={['Plant', 'Type', 'Equipment #', 'Make & Model', 'Status', 'Cleanliness', 'Condition', 'Verified', 'More']}
                colWidths={['10%', '15%', '10%', '15%', '8%', '10%', '10%', '10%', '12%']}
                renderRow={(item, handleSelect, onComment, onIssue, onVerify) => {
                    const issuesCount = Number(item.openIssuesCount || 0);
                    const commentsCount = Number(item.commentsCount || 0);
                    const isVerified = typeof item.isVerified === 'function'
                        ? item.isVerified(item.latestHistoryDate)
                        : EquipmentUtility.isVerified(item.updatedLast, item.updatedAt, item.updatedBy, item.latestHistoryDate);
                    return (
                        <tr key={item.id} onClick={() => handleSelect(item.id)} style={{cursor: 'pointer'}}>
                            <td style={{width: '10%'}}>{item.assignedPlant || '---'}</td>
                            <td style={{width: '15%'}}>{item.equipmentType || '---'}</td>
                            <td style={{width: '10%'}}>{item.identifyingNumber || '---'}</td>
                            <td style={{width: '15%'}}>{item.yearMade || item.equipmentMake || item.equipmentModel ? `${item.yearMade ? item.yearMade + ' ' : ''}${item.equipmentMake || ''} ${item.equipmentModel || ''}`.trim() : '---'}</td>
                            <td style={{width: '8%'}}><span className="item-status-dot" style={{
                                display: 'inline-block',
                                verticalAlign: 'middle',
                                marginRight: '8px',
                                backgroundColor: item.status === 'Active' ? 'var(--status-active)' : item.status === 'Spare' ? 'var(--status-spare)' : item.status === 'In Shop' ? 'var(--status-inshop)' : item.status === 'Retired' ? 'var(--status-retired)' : 'var(--accent)'
                            }}></span>{item.status || '---'}</td>
                            <td style={{width: '10%'}}>{(() => {
                                const rating = Math.round(item.cleanlinessRating || 0);
                                const stars = rating > 0 ? rating : 1;
                                return Array.from({length: stars}).map((_, i) => <i key={i} className="fas fa-star"
                                                                                    style={{color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor))}}></i>)
                            })()}</td>
                            <td style={{width: '10%'}}>{(() => {
                                const rating = Math.round(item.conditionRating || 0);
                                const stars = rating > 0 ? rating : 1;
                                return Array.from({length: stars}).map((_, i) => <i key={i} className="fas fa-star"
                                                                                    style={{color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor))}}></i>)
                            })()}</td>
                            <td style={{width: '10%'}}>
                                {item.status === 'Retired' ? (
                                    <span className="list-verify-status list-verify-na">N/A</span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onVerify) {
                                                onVerify(item.id, item.identifyingNumber);
                                            }
                                        }}
                                        title={isVerified ? 'Verified - Click to view details' : 'Click to verify'}
                                        className={`list-verify-btn ${isVerified ? 'verified' : 'not-verified'}`}
                                    >
                                        <i className={`fas ${isVerified ? 'fa-check' : 'fa-flag'}`}></i>
                                        <span>{isVerified ? 'Verified' : 'Not Verified'}</span>
                                    </button>
                                )}
                            </td>
                            <td style={{width: '12%'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                    <button type="button" onClick={e => {
                                        e.stopPropagation();
                                        onIssue(item.id, item.identifyingNumber);
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
                                    }}></i><span>{issuesCount}</span></button>
                                    <button type="button" onClick={e => {
                                        e.stopPropagation();
                                        onComment(item.id, item.identifyingNumber);
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
                                    }}></i><span>{commentsCount}</span></button>
                                    <button type="button" onClick={e => {
                                        e.stopPropagation();
                                        setSelectedEquipmentForHistory(item);
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
                    setModalEquipmentId(id);
                    setModalEquipmentNumber(number);
                    setShowCommentModal(true);
                }}
                onShowIssueModal={(id, number) => {
                    setModalEquipmentId(id);
                    setModalEquipmentNumber(number);
                    setShowIssueModal(true);
                }}
                onVerify={handleVerifyEquipment}
                containerClassName="list-table-container"
                tableClassName="list-table"
            />
        )
    }, [isLoading, filteredEquipments, viewMode, searchText, selectedPlant, statusFilter, equipmentTypeFilter, plants, equipments])

    const showReset = (searchText || selectedPlant || (statusFilter && statusFilter !== 'All Statuses') || equipmentTypeFilter)

    return (
        <>
            <div
                className={`global-dashboard-container dashboard-container global-flush-top flush-top equipments-view${selectedEquipment ? ' detail-open' : ''}`}>
                {selectedEquipment ? (
                    <EquipmentDetailView equipmentId={selectedEquipment.id} onClose={handleCloseDetailView}/>
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
                            customFilters={<div className="filter-wrapper"><select className="ios-select"
                                                                                   value={equipmentTypeFilter}
                                                                                   onChange={e => {
                                                                                       setEquipmentTypeFilter(e.target.value);
                                                                                       safeUpdateEquipmentFilter('equipmentTypeFilter', e.target.value);
                                                                                   }}
                                                                                   aria-label="Equipment type filter">
                                <option value="">All Types</option>
                                {equipmentTypeOptions.slice(1).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select></div>}
                            showReset={showReset}
                            onReset={() => {
                                setSearchText('');
                                setSearchInput('');
                                setSelectedPlant('');
                                setStatusFilter('');
                                setEquipmentTypeFilter('');
                                resetEquipmentFilters({keepViewMode: true, currentViewMode: viewMode})
                            }}
                            listLabels={['Plant', 'Type', 'Equipment #', 'Make & Model', 'Status', 'Cleanliness', 'Condition', 'Verified', 'More']}
                            colWidths={['10%', '15%', '10%', '15%', '8%', '10%', '10%', '10%', '12%']}
                            forwardedRef={headerRef}
                            sticky={true}
                            onHeaderClick={handleHeaderClick}
                            sortKey={sortKey}
                            sortDirection={sortDirection}
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
                                    setShowVerifyModal(false);
                                    setVerifyEquipment(null);
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
    );
}

export default EquipmentsView;
