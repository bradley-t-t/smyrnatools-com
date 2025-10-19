import supabase, {DatabaseService} from '../../services/DatabaseService';
import GrammarUtility from '../../utils/GrammarUtility';
import {useEffect, useMemo, useState} from "react";
import PlantDropdownModal from '../../components/common/PlantDropdownModal';
import {MixerService} from '../../services/MixerService';
import {TractorService} from '../../services/TractorService';
import OperatorHistoryView from './OperatorHistoryView';
import OperatorCommentModal from './OperatorCommentModal';
import {UserService} from '../../services/UserService';
import {OperatorService} from '../../services/OperatorService';
import DetailViewSection from '../../components/sections/DetailViewSection';
import ThemeUtility from '../../utils/ThemeUtility';
import {usePreferences} from '../../app/context/PreferencesContext';

function OperatorDetailView({operatorId, onClose, allowedPlantCodes}) {
    const {preferences} = usePreferences()
    const [operator, setOperator] = useState(null);
    const [plants, setPlants] = useState([]);
    const [trainers, setTrainers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [smyrnaId, setSmyrnaId] = useState('');
    const [name, setName] = useState('');
    const [status, setStatus] = useState('');
    const [assignedPlant, setAssignedPlant] = useState('');
    const [position, setPosition] = useState('');
    const [pendingStartDate, setPendingStartDate] = useState('');
    const [isTrainer, setIsTrainer] = useState(false);
    const [assignedTrainer, setAssignedTrainer] = useState('');
    const [hasTrainingPermission, setHasTrainingPermission] = useState(false);
    const [_showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [_hasUnsavedChanges, _setHasUnsavedChanges] = useState(false);
    const [rating, setRating] = useState(0);
    const [phone, setPhone] = useState('');
    const [showPlantModal, setShowPlantModal] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [canEditOperator, setCanEditOperator] = useState(false);
    const [canDeleteOperator, setCanDeleteOperator] = useState(false);

    useEffect(() => {
        if (allowedPlantCodes && allowedPlantCodes.size > 0) {
            if (assignedPlant && !allowedPlantCodes.has(String(assignedPlant).trim().toUpperCase())) {
                setAssignedPlant('');
            }
        }
    }, [allowedPlantCodes]);

    useEffect(() => {
        document.body.classList.add('in-detail-view');
        return () => {
            document.body.classList.remove('in-detail-view');
        };
    }, []);

    useEffect(() => {
        fetchData();
        fetchPlants();
        fetchTrainers();
    }, [operatorId]);

    useEffect(() => {
        const checkDeletePermission = async () => {
            try {
                const currentUser = await UserService.getCurrentUser();
                const userId = currentUser?.id || currentUser;
                if (userId) {
                    const hasPermission = await UserService.hasPermission(userId, 'detailview.delete');
                    setCanDeleteOperator(hasPermission);
                } else {
                    setCanDeleteOperator(false);
                }
            } catch (error) {
                setCanDeleteOperator(false);
            }
        };
        checkDeletePermission();
    }, []);

    const fetchPlants = async () => {
        const {data} = await supabase.from('plants').select('*');
        setPlants(data || []);
    };

    const fetchTrainers = async () => {
        const {data} = await supabase
            .from('operators')
            .select('employee_id, name, is_trainer, plant_code')
            .eq('is_trainer', true);
        setTrainers((data || []).filter(trainer => allowedPlantCodes && allowedPlantCodes.size > 0 ? allowedPlantCodes.has(String(trainer.plant_code || '').trim().toUpperCase()) : false).map(trainer => ({
            employeeId: trainer.employee_id,
            name: trainer.name
        })));
    };

    const filteredPlants = useMemo(() => {
        return plants
            .filter(p => {
                const code = String(p.plant_code || '').trim().toUpperCase();
                return allowedPlantCodes && allowedPlantCodes.size > 0 ? allowedPlantCodes.has(code) : false;
            })
            .sort((a, b) => {
                const aCode = parseInt(a.plant_code?.replace(/\D/g, '') || '0');
                const bCode = parseInt(b.plant_code?.replace(/\D/g, '') || '0');
                return aCode - bCode;
            });
    }, [plants, allowedPlantCodes]);

    const selectedPlantObj = plants.find(p => p.plant_code === assignedPlant);
    const plantDisplayText = assignedPlant ? `(${selectedPlantObj?.plant_code || assignedPlant}) ${selectedPlantObj?.plant_name || ''}` : 'Select Plant';

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const {data} = await supabase
                .from('operators')
                .select('*')
                .eq('employee_id', operatorId)
                .single();
            setOperator({
                ...data,
                id: data.employee_id,
                employeeId: data.employee_id
            });
            setSmyrnaId(data.smyrna_id || '');
            setName(data.name || '');
            setStatus(data.status || '');
            setAssignedPlant(data.plant_code || '');
            setPosition(data.position || '');
            const rawPending = data.pending_start_date || '';
            const normalizedPending = typeof rawPending === 'string' && rawPending.includes('T') ? rawPending.slice(0, 10) : rawPending;
            setPendingStartDate(normalizedPending);
            setIsTrainer(data.is_trainer || false);
            setAssignedTrainer(data.assigned_trainer || '');
            setHasTrainingPermission(true);
            setRating(typeof data.rating === 'number' ? data.rating : Number(data.rating) || 0);
            setPhone(data.phone || '');
        } catch (error) {
        }
        setIsLoading(false);
    };

    const handleBackClick = async () => {
        if (_hasUnsavedChanges) {
            await handleSave();
        }
        if (onClose) onClose();
    };

    const handleDelete = async () => {
        setIsSaving(true);
        await supabase.from('operators').delete().eq('employee_id', operatorId);
        setIsSaving(false);
        if (onClose) onClose();
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage('');
        const pendingForSave = (status === 'Pending Start' && pendingStartDate) ? pendingStartDate.slice(0, 10) : null;
        const updateObj = {
            smyrna_id: smyrnaId,
            name: name,
            status: status,
            plant_code: assignedPlant,
            position: position,
            is_trainer: isTrainer,
            assigned_trainer: (['Training', 'Pending Start'].includes(status) && !isTrainer) ? assignedTrainer : null,
            pending_start_date: pendingForSave,
            rating: typeof rating === 'number' ? rating : Number(rating) || 0,
            phone: phone || null
        };
        try {
            const shouldUnassignEquipment =
                (operator && operator.plant_code !== assignedPlant) ||
                (operator && operator.status !== status && !['Active'].includes(status));

            if (shouldUnassignEquipment) {
                const assignedMixers = await MixerService.getMixersByOperator(operatorId);
                for (const mixer of assignedMixers) {
                    if (mixer.status === 'Active') {
                        await MixerService.updateMixer(mixer.id, {...mixer, assignedOperator: null, status: 'Spare'});
                    }
                }
                const assignedTractors = await TractorService.getTractorsByOperator(operatorId);
                for (const tractor of assignedTractors) {
                    if (tractor.status === 'Active') {
                        await TractorService.updateTractor(tractor.id, {
                            ...tractor,
                            assignedOperator: null,
                            status: 'Spare'
                        });
                    }
                }
            }

            const {error} = await supabase
                .from('operators')
                .update(updateObj)
                .eq('employee_id', operatorId);
            if (error) {
                if (String(error?.code) === '42703' || /column\s+"?phone"?\s+does not exist/i.test(String(error?.message))) {
                    try {
                        await DatabaseService.executeRawQuery('alter table public.operators add column if not exists phone text');
                        const retry = await supabase
                            .from('operators')
                            .update(updateObj)
                            .eq('employee_id', operatorId);
                        if (retry?.error) {
                            setMessage('Error saving changes. Please try again.');
                        } else {
                            setMessage('Changes saved successfully!');
                            fetchData();
                        }
                    } catch (e) {
                        setMessage('Error saving changes. Please try again.');
                    }
                } else {
                    setMessage('Error saving changes. Please try again.');
                }
            } else {
                setMessage('Changes saved successfully!');
                fetchData();
                try {
                    const currentUser = await UserService.getCurrentUser();
                    const changedBy = currentUser?.id || 'system';
                    const fieldsToCheck = ['smyrna_id', 'name', 'status', 'plant_code', 'position', 'is_trainer', 'assigned_trainer', 'pending_start_date', 'rating', 'phone'];
                    for (const field of fieldsToCheck) {
                        const oldValue = operator[field];
                        const newValue = updateObj[field];
                        if (oldValue !== newValue) {
                            await OperatorService.createHistoryEntry(operatorId, field, oldValue, newValue, changedBy);
                        }
                    }
                } catch (historyError) {
                    console.error('Failed to log history:', historyError);
                }
            }
        } catch (e) {
            setMessage('Error saving changes. Please try again.');
        }
        setIsSaving(false);
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <DetailViewSection
            title={operator && operator.name ? operator.name : 'Operator Details'}
            onClose={onClose}
            onBack={handleBackClick}
            headerActions={
                <>
                    <button className="global-button-secondary" onClick={() => setShowComments(true)}>
                        <i className="fas fa-comments"></i>
                        <span>Comments</span>
                    </button>
                    <button className="global-button-secondary" onClick={() => setShowHistory(true)}>
                        <i className="fas fa-history"></i>
                        <span>History</span>
                    </button>
                </>
            }
            isSaving={isSaving}
            message={message}
            itemAssignedPlant={operator?.plant_code}
            onCanEditChange={setCanEditOperator}
            isLoading={isLoading}
            loadingMessage="Loading operator details..."
            notFound={!operator && !isLoading}
            notFoundMessage="Operator Not Found"
            notFoundDescription="Could not find the requested operator."
            footerActions={
                canEditOperator && (
                    <>
                        <button
                            className="primary-button save-button"
                            onClick={handleSave}
                            disabled={isSaving || !canEditOperator}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        {canDeleteOperator && (
                            <button
                                className="danger-button"
                                onClick={() => setShowDeleteConfirmation(true)}
                                disabled={isSaving || !canEditOperator}
                            >
                                Delete Operator
                            </button>
                        )}
                    </>
                )
            }
            showDeleteConfirmation={_showDeleteConfirmation}
            onDeleteConfirm={handleDelete}
            onDeleteCancel={() => setShowDeleteConfirmation(false)}
            deleteTitle="Confirm Delete"
            deleteMessage={`Are you sure you want to delete ${operator && operator.name}? This action cannot be undone.`}
            modals={
                <>
                    {showPlantModal && (
                        <PlantDropdownModal
                            isOpen={showPlantModal}
                            onClose={() => setShowPlantModal(false)}
                            plants={filteredPlants}
                            onSelect={setAssignedPlant}
                            searchPlaceholder="Search plants..."
                        />
                    )}
                    {showHistory && <OperatorHistoryView operator={operator} onClose={() => setShowHistory(false)}/>}
                    {showComments && operator && (
                        <OperatorCommentModal
                            operatorId={operatorId}
                            operatorName={operator.name}
                            onClose={() => setShowComments(false)}
                        />
                    )}
                </>
            }
        >
            <div className="detail-card">
                <div className="card-header">
                    <h2>Edit Information</h2>
                </div>
                <p className="edit-instructions">{canEditOperator ? 'Make changes below and click Save when finished.' : 'You are in read-only mode and cannot make changes to this operator.'}</p>
                <div className="form-sections">
                    <div className="form-section basic-info">
                        <h3>Basic Information</h3>
                        <div className="form-group">
                            <label>Employee ID</label>
                            <input
                                type="text"
                                value={smyrnaId}
                                onChange={(e) => setSmyrnaId(e.target.value)}
                                className="form-control"
                                disabled={!canEditOperator}
                            />
                        </div>
                        <div className="form-group">
                            <label>Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="form-control"
                                disabled={!canEditOperator}
                            />
                        </div>
                        <div className="form-group">
                            <label>Phone</label>
                            <input
                                type="tel"
                                value={GrammarUtility.formatPhone(phone)}
                                onChange={(e) => setPhone(e.target.value)}
                                className="form-control"
                                placeholder="(555) 555-5555"
                                disabled={!canEditOperator}
                            />
                        </div>
                        <div className="form-group">
                            <label>Rating</label>
                            <div className="cleanliness-rating-editor">
                                <div className="star-input">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            className={`star-button ${star <= rating ? 'active' : ''} ${!canEditOperator ? 'disabled' : ''}`}
                                            onClick={() => canEditOperator && setRating(star === rating ? 0 : star)}
                                            aria-label={`Rate ${star} of 5 stars`}
                                            disabled={!canEditOperator}
                                        >
                                            <i className={`fas fa-star ${star <= rating ? 'filled' : ''}`}
                                               style={star <= rating ? {color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor))} : {}}></i>
                                        </button>
                                    ))}
                                </div>
                                {rating > 0 && (
                                    <div className="rating-value-display">
                                        <span className="rating-label">
                                            {[null, 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="form-section assignment-info">
                        <h3>Assignment Information</h3>
                        <div className="form-group">
                            <label>Status</label>
                            <select
                                value={status}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setStatus(value);
                                    if (value === 'Active') setAssignedTrainer('');
                                }}
                                className="form-control"
                                disabled={!canEditOperator}
                            >
                                <option value="Active">Active</option>
                                <option value="Light Duty">Light Duty</option>
                                <option value="Terminated">Terminated</option>
                                {hasTrainingPermission && <option value="Pending Start">Pending Start</option>}
                                {hasTrainingPermission && <option value="Training">Training</option>}
                                <option value="No Hire">No Hire</option>
                            </select>
                        </div>
                        {status === 'Pending Start' && (
                            <div className="form-group">
                                <label>Pending Start Date</label>
                                <input
                                    type="date"
                                    value={pendingStartDate || ''}
                                    onChange={e => setPendingStartDate(e.target.value)}
                                    className="form-control"
                                    disabled={!canEditOperator}
                                />
                            </div>
                        )}
                        <div className="form-group">
                            <label>Assigned Plant</label>
                            <button className="operator-select-button form-control"
                                    onClick={() => setShowPlantModal(true)}
                                    type="button" disabled={!canEditOperator}><span style={{
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>{plantDisplayText}</span></button>
                        </div>
                        <div className="form-group">
                            <label>Position</label>
                            <select
                                value={position}
                                onChange={(e) => setPosition(e.target.value)}
                                className="form-control"
                                disabled={!canEditOperator}
                            >
                                <option value="">Select Position</option>
                                <option value="Mixer Operator">Mixer Operator</option>
                                <option value="Tractor Operator">Tractor Operator</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            {hasTrainingPermission && (
                <div className="detail-card">
                    <div className="card-header">
                        <h2>Training Information</h2>
                    </div>
                    <div className="form-sections">
                        <div className="form-section training-info">
                            <h3>Training Details</h3>
                            <div className="form-group">
                                <label>Trainer Status</label>
                                <select
                                    id="trainer-status"
                                    className="form-control"
                                    value={isTrainer ? "true" : "false"}
                                    onChange={(e) => {
                                        const isTrainerValue = e.target.value === "true";
                                        setIsTrainer(isTrainerValue);
                                        if (isTrainerValue) {
                                            setAssignedTrainer(null);
                                        }
                                    }}
                                    disabled={!canEditOperator}
                                >
                                    <option value="false">Not a Trainer</option>
                                    <option value="true">Trainer</option>
                                </select>
                            </div>
                            {(status === 'Training' || status === 'Pending Start') && (
                                <div className="form-group">
                                    <label>Assigned Trainer</label>
                                    <select
                                        value={assignedTrainer}
                                        onChange={(e) => setAssignedTrainer(e.target.value)}
                                        className="form-control"
                                        disabled={isTrainer || !canEditOperator}
                                    >
                                        <option value="">None</option>
                                        {trainers.map(trainer => (
                                            <option key={trainer.employeeId} value={trainer.employeeId}>
                                                {trainer.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </DetailViewSection>
    );
}

export default OperatorDetailView
