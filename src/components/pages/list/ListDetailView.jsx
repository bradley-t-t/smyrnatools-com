import React, {useEffect, useMemo, useState} from 'react';
import {ListService} from '../../../services/ListService';
import {UserService} from '../../../services/UserService';
import {usePreferences} from '../../../app/context/PreferencesContext';
import GrammarUtility from '../../../utils/GrammarUtility';
import '../../sections/styles/DetailView.css';
import {RegionService} from '../../../services/RegionService';
import PlantDropdownModal from '../../common/PlantDropdownModal';
import DetailViewSection from '../../sections/DetailViewSection';

function ListDetailView({itemId, onClose}) {
    const {preferences} = usePreferences();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [plant, setPlant] = useState(null);
    const [creator, setCreator] = useState(null);
    const [completer, setCompleter] = useState(null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [formData, setFormData] = useState({description: '', plantCode: '', deadline: '', comments: ''});
    const [status, setStatus] = useState('');
    const [plants, setPlants] = useState([]);
    const [message, setMessage] = useState('');
    const [regionPlantCodes, setRegionPlantCodes] = useState(new Set());
    const [showPlantModal, setShowPlantModal] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [originalValues, setOriginalValues] = useState({});
    const [canEditList, setCanEditList] = useState(false);

    const canEdit = true;

    useEffect(() => {
        if (itemId) {
            Promise.all([fetchItem(), fetchPlants()]).catch(() => {
            });
        }
        return () => {
        };
    }, [itemId]);

    async function fetchItem() {
        setLoading(true);
        try {
            const items = await ListService.fetchListItems();
            const found = items.find(i => i.id === itemId);
            setItem(found);
            setFormData({
                description: found?.description || '',
                plantCode: found?.plant_code || '',
                deadline: ListService.formatDateForInput(found?.deadline) || '',
                comments: found?.comments || ''
            });
            const plantData = ListService.plants.find(p => p.plant_code === found?.plant_code);
            setPlant(plantData);
            setCreator(ListService.creatorProfiles[found?.user_id]);
            setCompleter(ListService.creatorProfiles[found?.completed_by]);
            setStatus(found?.completed ? 'Completed' : 'Pending');
            setOriginalValues({
                description: found?.description || '',
                plantCode: found?.plant_code || '',
                deadline: ListService.formatDateForInput(found?.deadline) || '',
                comments: found?.comments || '',
                status: found?.completed ? 'Completed' : 'Pending'
            });
        } catch {
            showMessage('Failed to load item details', 'error');
        } finally {
            setLoading(false);
        }
    }

    async function fetchPlants() {
        try {
            const plantsData = await ListService.fetchPlants();
            setPlants(plantsData);
        } catch {
            showMessage('Failed to load plants', 'error');
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function loadAllowed() {
            let regionCode = preferences.selectedRegion?.code || '';
            try {
                if (!regionCode) {
                    const user = await UserService.getCurrentUser();
                    const uid = user?.id || '';
                    if (uid) {
                        const profilePlant = await UserService.getUserPlant(uid);
                        const plantCode = typeof profilePlant === 'string' ? profilePlant : (profilePlant?.plant_code || profilePlant?.plantCode || '');
                        if (plantCode) {
                            const regions = await RegionService.fetchRegionsByPlantCode(plantCode);
                            const r = Array.isArray(regions) && regions.length ? regions[0] : null;
                            regionCode = r ? (r.regionCode || r.region_code || '') : '';
                        }
                    }
                }
                if (!regionCode) {
                    if (!cancelled) setRegionPlantCodes(new Set());
                    return;
                }
                const regionPlants = await RegionService.fetchRegionPlants(regionCode);
                if (cancelled) return;
                const codes = new Set(regionPlants.map(p => String(p.plantCode || p.plant_code || '').trim().toUpperCase()).filter(Boolean));
                setRegionPlantCodes(codes);
                if (formData.plantCode && !codes.has(String(formData.plantCode).trim().toUpperCase()))
                    setFormData(prev => ({...prev, plantCode: prev.plantCode}));
            } catch {
                if (!cancelled) setRegionPlantCodes(new Set());
            }
        }

        loadAllowed();

        return () => {
            cancelled = true
        };
    }, [preferences.selectedRegion?.code, formData.plantCode]);

    const filteredPlants = useMemo(() => {
        if (!regionPlantCodes || regionPlantCodes.size === 0) return plants;
        return plants.filter(p => regionPlantCodes.has(String(p.plant_code || '').trim().toUpperCase()));
    }, [plants, regionPlantCodes]);

    useEffect(() => {
        const hasChanges =
            formData.description !== originalValues.description ||
            formData.plantCode !== originalValues.plantCode ||
            formData.deadline !== originalValues.deadline ||
            formData.comments !== originalValues.comments ||
            status !== originalValues.status
        setHasUnsavedChanges(hasChanges)
    }, [formData, status, originalValues])

    function handleChange(e) {
        setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
    }

    function showMessage(text, type = 'success', duration = 3000) {
        setMessage(type === 'error' ? `Error: ${text}` : text);
        if (duration) setTimeout(() => setMessage(''), duration);
    }

    async function handleSubmit() {
        try {
            if (!formData.description.trim()) return showMessage('Description is required', 'error');
            const deadlineDate = new Date(formData.deadline);
            if (isNaN(deadlineDate.getTime())) return showMessage('Invalid deadline date', 'error');
            await ListService.updateListItem({
                ...item,
                description: formData.description,
                plant_code: formData.plantCode || null,
                deadline: deadlineDate.toISOString(),
                comments: formData.comments || null,
                completed: status === 'Completed'
            });
            await fetchItem();
            setHasUnsavedChanges(false);
            showMessage('Changes saved successfully!');
        } catch {
            showMessage('Failed to update item', 'error', 5000);
        }
    }

    async function handleToggleCompletion() {
        try {
            const user = await UserService.getCurrentUser();
            const userId = user?.id;
            await ListService.toggleCompletion(item, userId);
            showMessage(!item.completed ? 'Item marked as complete' : 'Item marked as incomplete');
            onClose();
        } catch {
            showMessage('Failed to update completion status', 'error');
        }
    }

    async function handleDelete() {
        try {
            await ListService.deleteListItem(itemId);
            onClose();
        } catch {
            showMessage('Failed to delete item', 'error');
            setShowDeleteConfirmation(false);
        }
    }

    const statusInfo = ListService.calculateStatusInfo(item);

    useEffect(() => {
        function onKeyDown(e) {
            const tag = (e.target && e.target.tagName) || ''
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
            const key = (e.key || '').toLowerCase()
            if (key === 'escape') {
                e.preventDefault()
                onClose?.()
            } else if (key === 'delete' || key === 'backspace') {
                e.preventDefault()
                setShowDeleteConfirmation(true)
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    if (loading) {
        return (
            <DetailViewSection
                title="Task Details"
                onClose={onClose}
                isLoading={true}
                loadingMessage="Loading item details..."
            />
        );
    }

    if (!item) {
        return (
            <DetailViewSection
                title="Item Not Found"
                onClose={onClose}
                notFound={true}
                notFoundMessage="Item Not Found"
                notFoundDescription="The requested item could not be found or has been deleted."
            />
        );
    }

    return (
        <DetailViewSection
            title="Task Details"
            onClose={onClose}
            headerActions={null}
            itemAssignedPlant={item?.plant_code}
            onCanEditChange={setCanEditList}
            footerActions={
                canEditList && (
                    <>
                        <button className="primary-button save-button" onClick={handleSubmit}
                                disabled={!hasUnsavedChanges || !canEditList}>
                            Save Changes
                        </button>
                        <button className="danger-button" onClick={() => setShowDeleteConfirmation(true)}
                                disabled={!canEditList}>
                            <i className="fas fa-trash"></i> Delete
                        </button>
                    </>
                )
            }
            message={message}
            showDeleteConfirmation={showDeleteConfirmation}
            onDeleteConfirm={handleDelete}
            onDeleteCancel={() => setShowDeleteConfirmation(false)}
            deleteTitle="Delete Item"
            deleteMessage="Are you sure you want to delete this item? This action cannot be undone."
        >
            <div className="detail-section">
                <div className="detail-card">
                    <h2>Task Information</h2>
                    <div className="detail-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="description">Description *</label>
                                <input
                                    type="text"
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    onBlur={() => setFormData(prev => ({
                                        ...prev,
                                        description: GrammarUtility.cleanDescription(prev.description)
                                    }))}
                                    disabled={!canEdit || !canEditList}
                                    required
                                    className="form-control"
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="plantCode">Plant</label>
                                <button className="operator-select-button" onClick={() => setShowPlantModal(true)}
                                        disabled={!canEdit || !canEditList}>
                                    {formData.plantCode ? `(${filteredPlants.find(p => p.plant_code === formData.plantCode)?.plant_code || formData.plantCode}) ${filteredPlants.find(p => p.plant_code === formData.plantCode)?.plant_name || ''}` : 'Select Plant'}
                                </button>
                            </div>
                            <div className="form-group">
                                <label htmlFor="deadline">Deadline *</label>
                                <input
                                    type="datetime-local"
                                    id="deadline"
                                    name="deadline"
                                    value={formData.deadline}
                                    onChange={handleChange}
                                    disabled={!canEdit || !canEditList}
                                    required
                                    className="form-control"
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="status">Status</label>
                                <select id="status" value={status} onChange={e => setStatus(e.target.value)}
                                        disabled={!canEdit || !canEditList} className="form-control">
                                    <option value="Pending">Pending</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="comments">Comments</label>
                                <textarea
                                    id="comments"
                                    name="comments"
                                    value={formData.comments}
                                    onChange={handleChange}
                                    onBlur={() => setFormData(prev => ({
                                        ...prev,
                                        comments: GrammarUtility.cleanComments(prev.comments)
                                    }))}
                                    disabled={!canEdit || !canEditList}
                                    className="form-control"
                                    rows="4"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="detail-section">
                <div className="detail-card">
                    <h2><i className="fas fa-history"></i> History</h2>
                    <div className="meta-information">
                        <div className="meta-row">
                            <div className="meta-label">Created by</div>
                            <div
                                className="meta-value">{creator ? `${creator.first_name} ${creator.last_name}` : 'Unknown'}</div>
                        </div>
                        <div className="meta-row">
                            <div className="meta-label">Created on</div>
                            <div className="meta-value">{ListService.formatDate(item.created_at)}</div>
                        </div>
                        {item.completed && (
                            <>
                                <div className="meta-row">
                                    <div className="meta-label">Completed by</div>
                                    <div
                                        className="meta-value">{completer ? `${completer.first_name} ${completer.last_name}` : 'Unknown'}</div>
                                </div>
                                <div className="meta-row">
                                    <div className="meta-label">Completed on</div>
                                    <div className="meta-value">{ListService.formatDate(item.completed_at)}</div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            {showPlantModal && (
                <PlantDropdownModal
                    isOpen={showPlantModal}
                    onClose={() => setShowPlantModal(false)}
                    plants={filteredPlants}
                    onSelect={code => {
                        setFormData(prev => ({...prev, plantCode: code}));
                        setShowPlantModal(false);
                    }}
                    searchPlaceholder="Search plants..."
                />
            )}
        </DetailViewSection>
    );
}

export default ListDetailView;
