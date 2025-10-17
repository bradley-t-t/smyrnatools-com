import React, {useEffect, useMemo, useState} from 'react';
import {EquipmentService} from '../../../services/EquipmentService';
import {PlantService} from '../../../services/PlantService';
import {UserService} from '../../../services/UserService';
import {usePreferences} from '../../../app/context/PreferencesContext';
import EquipmentCommentModal from './EquipmentCommentModal';
import EquipmentIssueModal from './EquipmentIssueModal';
import EquipmentUtility from '../../../utils/EquipmentUtility';
import EquipmentHistoryView from './EquipmentHistoryView';
import {RegionService} from '../../../services/RegionService';
import ThemeUtility from '../../../utils/ThemeUtility';
import PlantDropdownModal from '../../common/PlantDropdownModal';
import DetailViewSection from '../../sections/DetailViewSection';

function EquipmentDetailView({equipmentId, onClose}) {
    const {preferences} = usePreferences();
    const [equipment, setEquipment] = useState(null);
    const [plants, setPlants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [showIssues, setShowIssues] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [message, setMessage] = useState('');
    const [canEditEquipment, setCanEditEquipment] = useState(false);
    const [canDeleteEquipment, setCanDeleteEquipment] = useState(false);
    const [originalValues, setOriginalValues] = useState({});
    const [identifyingNumber, setIdentifyingNumber] = useState('');
    const [assignedPlant, setAssignedPlant] = useState('');
    const [equipmentType, setEquipmentType] = useState('');
    const [status, setStatus] = useState('');
    const [cleanlinessRating, setCleanlinessRating] = useState(0);
    const [conditionRating, setConditionRating] = useState(0);
    const [lastServiceDate, setLastServiceDate] = useState(null);
    const [hoursMileage, setHoursMileage] = useState('');
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [_comments, setComments] = useState([]);
    const [_issues, setIssues] = useState([]);
    const [regionPlantCodes, setRegionPlantCodes] = useState(new Set());
    const [showPlantModal, setShowPlantModal] = useState(false);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const [equipmentData, plantsData] = await Promise.all([
                    EquipmentService.fetchEquipmentById(equipmentId),
                    PlantService.fetchPlants()
                ]);

                setEquipment(equipmentData);
                setPlants(plantsData);

                setIdentifyingNumber(equipmentData.identifyingNumber || '');
                setAssignedPlant(equipmentData.assignedPlant || '');
                setEquipmentType(equipmentData.equipmentType || '');
                setStatus(equipmentData.status || '');
                setCleanlinessRating(equipmentData.cleanlinessRating || 0);
                setConditionRating(equipmentData.conditionRating || 0);
                setLastServiceDate(equipmentData.lastServiceDate || null);
                setHoursMileage(equipmentData.hoursMileage ? equipmentData.hoursMileage.toString() : '');
                setMake(equipmentData.equipmentMake || '');
                setModel(equipmentData.equipmentModel || '');
                setYear(equipmentData.yearMade ? equipmentData.yearMade.toString() : '');
                setComments(equipmentData.comments || []);
                setIssues(equipmentData.issues || []);
                setOriginalValues({
                    identifyingNumber: equipmentData.identifyingNumber || '',
                    assignedPlant: equipmentData.assignedPlant || '',
                    equipmentType: equipmentData.equipmentType || '',
                    status: equipmentData.status || '',
                    cleanlinessRating: equipmentData.cleanlinessRating || 0,
                    conditionRating: equipmentData.conditionRating || 0,
                    lastServiceDate: equipmentData.lastServiceDate || null,
                    hoursMileage: equipmentData.hoursMileage ? equipmentData.hoursMileage.toString() : '',
                    equipmentMake: equipmentData.equipmentMake || '',
                    equipmentModel: equipmentData.equipmentModel || '',
                    yearMade: equipmentData.yearMade ? equipmentData.yearMade.toString() : ''
                });
            } catch (error) {
                setMessage('Error loading equipment details');
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, [equipmentId]);

    useEffect(() => {
        let cancelled = false;

        async function loadAllowedPlants() {
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
            } catch {
                if (!cancelled) setRegionPlantCodes(new Set());
            }
        }

        loadAllowedPlants();
        return () => {
            cancelled = true;
        };
    }, [preferences.selectedRegion?.code]);

    const filteredPlants = useMemo(() => {
        if (!regionPlantCodes || regionPlantCodes.size === 0) return [];
        return plants.filter(p => regionPlantCodes.has(String(p.plantCode || p.plant_code || '').trim().toUpperCase()));
    }, [plants, regionPlantCodes]);

    useEffect(() => {
        if (!originalValues.identifyingNumber || isLoading) return;

        const formatDateForComparison = date => date ? (date instanceof Date ? date.toISOString().split('T')[0] : '') : '';
        const hasChanges =
            identifyingNumber !== originalValues.identifyingNumber ||
            assignedPlant !== originalValues.assignedPlant ||
            equipmentType !== originalValues.equipmentType ||
            status !== originalValues.status ||
            cleanlinessRating !== originalValues.cleanlinessRating ||
            conditionRating !== originalValues.conditionRating ||
            formatDateForComparison(lastServiceDate) !== formatDateForComparison(originalValues.lastServiceDate) ||
            hoursMileage !== originalValues.hoursMileage ||
            make !== originalValues.equipmentMake ||
            model !== originalValues.equipmentModel ||
            year !== originalValues.yearMade;

        setHasUnsavedChanges(hasChanges);
    }, [identifyingNumber, assignedPlant, equipmentType, status, cleanlinessRating, conditionRating, lastServiceDate, hoursMileage, make, model, year, originalValues, isLoading]);

    useEffect(() => {
        const handleBeforeUnload = e => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    async function handleSave() {
        if (!equipment?.id) {
            alert('Error: Cannot save equipment with undefined ID');
            return null;
        }
        setIsSaving(true);
        try {
            const user = await UserService.getCurrentUser();
            const userId = user && typeof user === 'object' ? user.id : user;
            if (!userId) {
                setMessage('Error saving changes: User ID is required');
                return null;
            }
            const updatedEquipment = {
                ...equipment,
                id: equipment.id,
                identifyingNumber,
                assignedPlant,
                equipmentType,
                status,
                cleanlinessRating: cleanlinessRating || null,
                conditionRating: conditionRating || null,
                lastServiceDate,
                hoursMileage: hoursMileage ? parseFloat(hoursMileage) : null,
                equipmentMake: make,
                equipmentModel: model,
                yearMade: year ? parseInt(year) : null,
                updatedAt: new Date().toISOString(),
                updatedBy: userId
            };
            await EquipmentService.updateEquipment(updatedEquipment.id, updatedEquipment, userId);
            setEquipment(updatedEquipment);
            setMessage('Changes saved successfully!');
            setTimeout(() => setMessage(''), 5000);
            setOriginalValues({
                identifyingNumber: updatedEquipment.identifyingNumber,
                assignedPlant: updatedEquipment.assignedPlant,
                equipmentType: updatedEquipment.equipmentType,
                status: updatedEquipment.status,
                cleanlinessRating: updatedEquipment.cleanlinessRating,
                conditionRating: updatedEquipment.conditionRating,
                lastServiceDate: updatedEquipment.lastServiceDate,
                hoursMileage: updatedEquipment.hoursMileage ? updatedEquipment.hoursMileage.toString() : '',
                equipmentMake: updatedEquipment.equipmentMake,
                equipmentModel: updatedEquipment.equipmentModel,
                yearMade: updatedEquipment.yearMade ? updatedEquipment.yearMade.toString() : ''
            });
            setHasUnsavedChanges(false);
            return updatedEquipment;
        } catch (error) {
            setMessage('Error saving changes: ' + (error.message || 'Unknown error'));
            return null;
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete() {
        if (!equipment) return;
        if (!showDeleteConfirmation) return setShowDeleteConfirmation(true);

        try {
            await EquipmentService.deleteEquipment(equipment.id);
            alert('Equipment deleted successfully');
            onClose();
        } catch (error) {
            alert('Error deleting equipment');
        } finally {
            setShowDeleteConfirmation(false);
        }
    }

    function handleBackClick() {
        if (hasUnsavedChanges) {
            handleSave();
        }
        onClose();
    }

    function formatDate(date) {
        if (!date) return '';
        return date instanceof Date ? date.toISOString().split('T')[0] : date;
    }

    useEffect(() => {
        async function fetchCommentsAndIssues() {
            if (!equipmentId) return;
            try {
                const comments = await EquipmentService.fetchComments(equipmentId);
                setComments(Array.isArray(comments) ? comments.filter(c => c && (c.comment || c.text)) : []);
                const issues = await EquipmentService.fetchIssues(equipmentId);
                setIssues(Array.isArray(issues) ? issues.filter(i => i && (i.issue || i.title || i.description)) : []);
            } catch {
                setComments([]);
                setIssues([]);
            }
        }

        fetchCommentsAndIssues();
    }, [equipmentId]);

    useEffect(() => {
        const checkDeletePermission = async () => {
            try {
                const currentUser = await UserService.getCurrentUser();
                const userId = currentUser?.id || currentUser;
                if (userId) {
                    const hasPermission = await UserService.hasPermission(userId, 'detailview.delete');
                    setCanDeleteEquipment(hasPermission);
                } else {
                    setCanDeleteEquipment(false);
                }
            } catch (error) {
                setCanDeleteEquipment(false);
            }
        };
        checkDeletePermission();
    }, []);

    if (isLoading) {
        return null;
    }

    if (!equipment) {
        return (
            <DetailViewSection
                title="Equipment Not Found"
                onClose={onClose}
                notFound={true}
                notFoundMessage="Equipment Not Found"
                notFoundDescription="Could not find the requested equipment. It may have been deleted."
            />
        );
    }

    const selectedPlantObj = plants.find(p => (p.plantCode || p.plant_code) === assignedPlant);
    const plantDisplayText = assignedPlant ? `(${selectedPlantObj?.plantCode || selectedPlantObj?.plant_code || assignedPlant}) ${selectedPlantObj?.plantName || selectedPlantObj?.plant_name || ''}` : 'Select Plant';

    return (
        <>
            {showHistory && (
                <EquipmentHistoryView
                    equipment={equipment}
                    onClose={() => setShowHistory(false)}
                />
            )}
            {showComments &&
                <EquipmentCommentModal equipmentId={equipmentId} equipmentNumber={equipment?.identifyingNumber}
                                       onClose={() => setShowComments(false)}/>}
            {showIssues && <EquipmentIssueModal equipmentId={equipmentId} equipmentNumber={equipment?.identifyingNumber}
                                                onClose={() => setShowIssues(false)}/>}
            {showPlantModal && (
                <PlantDropdownModal
                    isOpen={showPlantModal}
                    onClose={() => setShowPlantModal(false)}
                    plants={filteredPlants}
                    onSelect={setAssignedPlant}
                    searchPlaceholder="Search plants..."
                />
            )}
            <DetailViewSection
                title={`${equipment.equipmentType} #${equipment.identifyingNumber || 'Not Assigned'}`}
                onClose={handleBackClick}
                isSaving={isSaving}
                message={message}
                canEdit={canEditEquipment}
                isLoading={false}
                showDeleteConfirmation={showDeleteConfirmation}
                onDeleteConfirm={handleDelete}
                onDeleteCancel={() => setShowDeleteConfirmation(false)}
                deleteTitle="Confirm Delete"
                deleteMessage={`Are you sure you want to delete ${equipment.equipmentType} #${equipment.identifyingNumber}? This action cannot be undone.`}
                itemAssignedPlant={assignedPlant}
                onCanEditChange={setCanEditEquipment}
                footerActions={
                    canEditEquipment && (
                        <>
                            <button className="primary-button save-button" onClick={handleSave}
                                    disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
                            {canDeleteEquipment && (
                                <button className="danger-button" onClick={() => setShowDeleteConfirmation(true)}
                                        disabled={isSaving}>Delete Equipment
                                </button>
                            )}
                        </>
                    )
                }
            >
                <div className="detail-card">
                    <div className="card-header">
                        <h2>Equipment Information</h2>
                    </div>
                    <p className="edit-instructions">{canEditEquipment ? "You can make changes below. Remember to save your changes." : "You are in read-only mode and cannot make changes to this equipment."}</p>
                    <div className="form-sections">
                        <div className="form-section basic-info">
                            <h3>Basic Information</h3>
                            <div className="form-group">
                                <label>Identifying Number</label>
                                <input type="text" value={identifyingNumber}
                                       onChange={e => setIdentifyingNumber(e.target.value)} className="form-control"
                                       readOnly={!canEditEquipment}/>
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select value={status} onChange={e => setStatus(e.target.value)}
                                        disabled={!canEditEquipment} className="form-control">
                                    <option value="">Select Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Spare">Spare</option>
                                    <option value="In Shop">In Shop</option>
                                    <option value="Retired">Retired</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Assigned Plant</label>
                                <button className="operator-select-button form-control"
                                        onClick={() => canEditEquipment && setShowPlantModal(true)} type="button"
                                        disabled={!canEditEquipment} style={!canEditEquipment ? {
                                    cursor: 'not-allowed',
                                    opacity: 0.8,
                                    backgroundColor: 'var(--card-bg)'
                                } : {}}>
                                    <span style={{
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>{plantDisplayText}</span>
                                </button>
                            </div>
                            <div className="form-group">
                                <label>Equipment Type</label>
                                <select value={equipmentType} onChange={e => setEquipmentType(e.target.value)}
                                        disabled={!canEditEquipment} className="form-control">
                                    <option value="">Select Type</option>
                                    <option value="Front-End Loader">Front-End Loader</option>
                                    <option value="Excavator">Excavator</option>
                                    <option value="Mini-Excavator">Mini-Excavator</option>
                                    <option value="Backhoe">Backhoe</option>
                                    <option value="Skid Steer">Skid Steer</option>
                                    <option value="Forklift">Forklift</option>
                                    <option value="Manlift">Manlift</option>
                                    <option value="Dozer">Dozer</option>
                                    <option value="Off-Road Dump Truck">Off-Road Dump Truck</option>
                                    <option value="Water/Trash Pump">Water/Trash Pump</option>
                                    <option value="Water Truck">Water Truck</option>
                                    <option value="Trailer">Trailer</option>
                                    <option value="Portable Compressor">Portable Compressor</option>
                                    <option value="Portable Conveyor">Portable Conveyor</option>
                                    <option value="Crusher">Crusher</option>
                                    <option value="Ice Conveyor">Ice Conveyor</option>
                                    <option value="Rotary Mixer">Rotary Mixer</option>
                                    <option value="Road Reclaimer">Road Reclaimer</option>
                                    <option value="Maintainer">Maintainer</option>
                                    <option value="Sweeper">Sweeper</option>
                                    <option value="Other">Other</option>
                                    <option value="Unknown">Unknown</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-section maintenance-info">
                            <h3>Maintenance Information</h3>
                            <div className="form-group">
                                <label>Last Service Date</label>
                                <input type="date" value={lastServiceDate ? formatDate(lastServiceDate) : ''}
                                       onChange={e => setLastServiceDate(e.target.value ? new Date(e.target.value) : null)}
                                       className="form-control" readOnly={!canEditEquipment}/>
                                {lastServiceDate && EquipmentUtility.isServiceOverdue(lastServiceDate) &&
                                    <div className="warning-text">Service overdue</div>}
                            </div>
                            <div className="form-group">
                                <label>Hours/Mileage</label>
                                <input type="number" value={hoursMileage}
                                       onChange={e => setHoursMileage(e.target.value)} className="form-control"
                                       readOnly={!canEditEquipment} min="0"/>
                            </div>
                            <div className="form-group">
                                <label>Cleanliness Rating</label>
                                <div className="cleanliness-rating-editor">
                                    <div className="star-input">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                type="button"
                                                className={`star-button ${star <= cleanlinessRating ? 'active' : ''} ${!canEditEquipment ? 'disabled' : ''}`}
                                                onClick={() => canEditEquipment && setCleanlinessRating(star === cleanlinessRating ? 0 : star)}
                                                aria-label={`Rate ${star} of 5 stars`}
                                                disabled={!canEditEquipment}
                                            >
                                                <i className={`fas fa-star ${star <= cleanlinessRating ? 'filled' : ''}`}
                                                   style={star <= cleanlinessRating ? {color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor))} : {}}></i>
                                            </button>
                                        ))}
                                    </div>
                                    {cleanlinessRating > 0 && (
                                        <div className="rating-value-display">
                                            <span
                                                className="rating-label">{[null, 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][cleanlinessRating]}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Condition Rating</label>
                                <div className="condition-rating-editor">
                                    <div className="star-input">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                type="button"
                                                className={`star-button ${star <= conditionRating ? 'active' : ''} ${!canEditEquipment ? 'disabled' : ''}`}
                                                onClick={() => canEditEquipment && setConditionRating(star === conditionRating ? 0 : star)}
                                                aria-label={`Rate ${star} of 5 stars`}
                                                disabled={!canEditEquipment}
                                            >
                                                <i className={`fas fa-star ${star <= conditionRating ? 'filled' : ''}`}
                                                   style={star <= conditionRating ? {color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor))} : {}}></i>
                                            </button>
                                        ))}
                                    </div>
                                    {conditionRating > 0 && (
                                        <div className="rating-value-display">
                                            <span
                                                className="rating-label">{[null, 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][conditionRating]}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="form-sections">
                        <div className="form-section vehicle-info">
                            <h3>Asset Details</h3>
                            <div className="form-group">
                                <label>Make</label>
                                <input type="text" value={make} onChange={e => setMake(e.target.value)}
                                       className="form-control" readOnly={!canEditEquipment}/>
                            </div>
                            <div className="form-group">
                                <label>Model</label>
                                <input type="text" value={model} onChange={e => setModel(e.target.value)}
                                       className="form-control" readOnly={!canEditEquipment}/>
                            </div>
                            <div className="form-group">
                                <label>Year</label>
                                <input type="number" value={year} onChange={e => setYear(e.target.value)}
                                       className="form-control" readOnly={!canEditEquipment} min="1900"
                                       max={new Date().getFullYear()}/>
                            </div>
                        </div>
                    </div>
                </div>
            </DetailViewSection>
        </>
    );
}

export default EquipmentDetailView;
