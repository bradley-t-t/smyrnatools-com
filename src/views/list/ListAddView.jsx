import React, {useEffect, useState} from 'react';
import './styles/List.css';
import {ListService} from '../../services/ListService';
import {UserService} from '../../services/UserService';
import {RegionService} from '../../services/RegionService';
import {PlantService} from '../../services/PlantService';
import {usePreferences} from '../../app/context/PreferencesContext';
import GrammarUtility from '../../utils/GrammarUtility';
import PlantDropdownModal from '../../components/common/PlantDropdownModal';
import AddViewSection from '../../components/sections/AddViewSection';

function ListAddView({onClose, onItemAdded, item = null}) {
    const {preferences} = usePreferences();
    const [description, setDescription] = useState('');
    const [plantCode, setPlantCode] = useState('');
    const [selectedPlantCodes, setSelectedPlantCodes] = useState([]);
    const [deadline, setDeadline] = useState(() => {
        const today = new Date();
        today.setHours(17, 0, 0, 0);
        return today.toISOString().slice(0, 16);
    });
    const [comments, setComments] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [errors, setErrors] = useState({});
    const [userPlantCode, setUserPlantCode] = useState(null);
    const [canBypassPlantRestriction, setCanBypassPlantRestriction] = useState(null);
    const [plantRestrictionMessage, setPlantRestrictionMessage] = useState('');
    const [plants, setPlants] = useState([]);
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false);

    useEffect(() => {
        async function fetchCurrentUser() {
            const user = await UserService.getCurrentUser();
            if (!user) return;
            setCurrentUserId(user.id);
            const hasPermission = await UserService.hasPermission(user.id, 'list.bypass.plantrestriction');
            setCanBypassPlantRestriction(hasPermission);
            if (!hasPermission) {
                const plantData = await UserService.getUserPlant(user.id);
                if (plantData) {
                    setUserPlantCode(plantData);
                    setPlantCode(plantData);
                    setPlantRestrictionMessage(`You can only create items for your assigned plant (${plantData}).`);
                }
            }
        }

        fetchCurrentUser();
    }, []);

    useEffect(() => {
        async function fetchPlants() {
            const selectedRegionCode = preferences?.selectedRegion?.code || '';
            const allowedCodes = await RegionService.getAllowedPlantCodes(selectedRegionCode);
            if (allowedCodes) {
                const allPlants = await PlantService.fetchAllPlants();
                setPlants(allPlants.filter(p => allowedCodes.has(p.plantCode.toUpperCase())).map(p => ({
                    plant_code: p.plantCode,
                    plant_name: p.plantName
                })));
            }
        }

        if (canBypassPlantRestriction !== null || userPlantCode !== null) {
            fetchPlants();
        }
    }, [canBypassPlantRestriction, userPlantCode, preferences]);

    useEffect(() => {
        if (item) {
            setDescription(item.description || '');
            if (canBypassPlantRestriction || !userPlantCode || item.plantCode === userPlantCode) {
                setPlantCode(item.plantCode || '');
            }
            setDeadline(item.deadline ? new Date(item.deadline).toISOString().slice(0, 16) : deadline);
            setComments(item.comments || '');
        }
    }, [item, canBypassPlantRestriction, userPlantCode]);

    const visiblePlants = plants.filter(p => canBypassPlantRestriction || !userPlantCode || p.plant_code === userPlantCode);
    const selectedPlantObj = visiblePlants.find(p => p.plant_code === plantCode);
    const plantDisplayText = plantCode ? `(${selectedPlantObj?.plant_code}) ${selectedPlantObj?.plant_name}` : 'Select Plant';


    const validate = () => {
        const newErrors = {};
        if (!description.trim()) newErrors.description = 'Description is required';
        const isBulkMode = selectedPlantCodes.length > 0;
        if (isBulkMode) {
            if (!canBypassPlantRestriction) {
                newErrors.plantCode = 'You do not have permission to add items to multiple plants';
            } else if (!selectedPlantCodes.length) {
                newErrors.plantCode = 'At least one plant is required';
            }
        } else {
            if (!plantCode) newErrors.plantCode = 'Plant is required';
            if (!canBypassPlantRestriction && userPlantCode && plantCode !== userPlantCode) {
                newErrors.plantCode = `You can only create items for your assigned plant (${userPlantCode})`;
            }
        }
        if (!deadline) newErrors.deadline = 'Deadline is required';
        setErrors(newErrors);
        return !Object.keys(newErrors).length;
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!validate()) return;
        setIsSaving(true);
        try {
            let userId = currentUserId;
            if (!userId) {
                const user = await UserService.getCurrentUser();
                if (!user || !user.id) {
                    alert('User ID is required. Please ensure you are logged in.');
                    setIsSaving(false);
                    return;
                }
                userId = user.id;
                setCurrentUserId(userId);
            }

            if (item) {
                const updateData = {
                    plant_code: plantCode,
                    description: description.trim(),
                    deadline: new Date(deadline).toISOString(),
                    comments: comments.trim()
                };
                await ListService.updateListItem({...item, ...updateData});
            } else if (selectedPlantCodes.length > 0) {
                const promises = selectedPlantCodes.map(code =>
                    ListService.createListItem(code, description, new Date(deadline), comments)
                );
                await Promise.all(promises);
            } else {
                await ListService.createListItem(plantCode, description, new Date(deadline), comments);
            }
            onItemAdded?.();
            onClose?.();
        } catch (error) {
            alert(`Failed to save list item: ${error.message || 'Unknown error'}. Please try again.`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <AddViewSection title={item ? 'Edit List Item' : 'Add New List Item'} onClose={onClose} isListItem={true}>
                {plantRestrictionMessage && (
                    <div className="plant-restriction-notice">
                        <i className="fas fa-info-circle"></i> {plantRestrictionMessage}
                    </div>
                )}
                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="form-section">
                        <div className="form-row">
                            <div className="form-group wide">
                                <label htmlFor="description">Description*</label>
                                <input
                                    id="description"
                                    type="text"
                                    className="ios-input"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    onBlur={() => setDescription(GrammarUtility.cleanDescription(description))}
                                    placeholder="Enter item description"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>
                    </div>
                    <div className="form-section">
                        <div className="form-row">
                            {canBypassPlantRestriction ? (
                                <div className="form-group">
                                    <label
                                        htmlFor="plantCode">{selectedPlantCodes.length > 0 ? 'Plants*' : 'Plant*'}</label>
                                    {!item ? (
                                        <>
                                            <button
                                                type="button"
                                                className="ios-select"
                                                onClick={() => setIsPlantModalOpen(true)}
                                                aria-label="Select plants"
                                            >
                                                {selectedPlantCodes.length === 0
                                                    ? 'Select Plants'
                                                    : `${selectedPlantCodes.length} plant${selectedPlantCodes.length !== 1 ? 's' : ''} selected`}
                                            </button>
                                            {selectedPlantCodes.length > 0 && (
                                                <div className="selected-plants-list">
                                                    {selectedPlantCodes.map(code => {
                                                        const plant = visiblePlants.find(p => p.plant_code === code);
                                                        return (
                                                            <div key={code} className="selected-plant-chip">
                                                                <span>({plant?.plant_code}) {plant?.plant_name}</span>
                                                                <button
                                                                    type="button"
                                                                    className="remove-plant-button"
                                                                    onClick={() => setSelectedPlantCodes(prev => prev.filter(c => c !== code))}
                                                                    aria-label="Remove plant"
                                                                >
                                                                    <i className="fas fa-times"></i>
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            className="ios-select"
                                            onClick={() => setIsPlantModalOpen(true)}
                                            aria-label="Select plant"
                                        >
                                            {plantDisplayText}
                                        </button>
                                    )}
                                </div>
                            ) : !canBypassPlantRestriction && (
                                <div className="form-group">
                                    <label htmlFor="plantCode">Plant*</label>
                                    {userPlantCode ? (
                                        <>
                                            <input
                                                id="plantCode"
                                                type="text"
                                                className="ios-input plant-input-disabled"
                                                value={plantDisplayText}
                                                disabled
                                            />
                                            <div className="plant-assignment-info">
                                                <i className="fas fa-info-circle"></i>
                                                <span>You are creating items for Plant {userPlantCode}{selectedPlantObj?.plant_name ? ` (${selectedPlantObj.plant_name})` : ''} because you are assigned there.</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <input
                                                id="plantCode"
                                                type="text"
                                                className="ios-input plant-input-disabled"
                                                value="No Plant Assigned"
                                                disabled
                                            />
                                            <div className="plant-assignment-info">
                                                <i className="fas fa-exclamation-triangle"></i>
                                                <span>You need to be assigned to a plant before you can create list items. Please contact your administrator.</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            <div className="form-group">
                                <label htmlFor="deadline">Deadline*</label>
                                <input
                                    id="deadline"
                                    type="datetime-local"
                                    className="ios-input"
                                    value={deadline}
                                    onChange={e => setDeadline(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    <div className="add-form-section">
                        <div className="add-form-row">
                            <div className="form-group wide">
                                <label htmlFor="comments">Comments</label>
                                <textarea
                                    id="comments"
                                    className="ios-input"
                                    value={comments}
                                    onChange={e => setComments(e.target.value)}
                                    placeholder="Enter any additional comments"
                                    rows="3"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="add-form-actions">
                        <button type="submit" className="ios-button-primary" disabled={isSaving}>
                            {isSaving ? 'Saving...' : item ? 'Update Item' : selectedPlantCodes.length > 0 ? `Add to ${selectedPlantCodes.length} Plant${selectedPlantCodes.length !== 1 ? 's' : ''}` : 'Add Item'}
                        </button>
                    </div>
                </form>
                {errors.description && <div className="error-message">{errors.description}</div>}
                {errors.plantCode && <div className="error-message">{errors.plantCode}</div>}
            </AddViewSection>
            {isPlantModalOpen && canBypassPlantRestriction && (
                <PlantDropdownModal
                    isOpen={isPlantModalOpen}
                    onClose={() => setIsPlantModalOpen(false)}
                    onSelect={code => {
                        if (!item) {
                            if (!selectedPlantCodes.includes(code)) {
                                setSelectedPlantCodes(prev => [...prev, code]);
                            }
                        } else {
                            setPlantCode(code);
                            setIsPlantModalOpen(false);
                        }
                    }}
                    plants={visiblePlants}
                    allowMultiple={!item}
                    selectedPlantCodes={selectedPlantCodes}
                />
            )}
        </>
    );
}

export default ListAddView;
