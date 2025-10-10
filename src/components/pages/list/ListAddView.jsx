import React, {useEffect, useState} from 'react';
import './styles/List.css';
import {ListService} from '../../../services/ListService';
import {UserService} from '../../../services/UserService';
import {RegionService} from '../../../services/RegionService';
import {PlantService} from '../../../services/PlantService';
import {usePreferences} from '../../../app/context/PreferencesContext';
import GrammarUtility from '../../../utils/GrammarUtility';

function ListAddView({onClose, onItemAdded, item = null}) {
    const {preferences} = usePreferences();
    const [description, setDescription] = useState('');
    const [plantCode, setPlantCode] = useState('');
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

    useEffect(() => {
        async function fetchCurrentUser() {
            const user = await UserService.getCurrentUser();
            if (!user) return;
            setCurrentUserId(user.id);
            const hasPermission = await UserService.hasPermission(user.id, 'list.bypass.plantrestriction');
            setCanBypassPlantRestriction(hasPermission);
            if (!hasPermission) {
                const {data: profileData} = await ListService.supabase
                    .from('users_profiles')
                    .select('plant_code')
                    .eq('id', user.id)
                    .single();
                if (profileData?.plant_code) {
                    setUserPlantCode(profileData.plant_code);
                    setPlantCode(profileData.plant_code);
                    setPlantRestrictionMessage(`You can only create items for your assigned plant (${profileData.plant_code}).`);
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

    const validate = () => {
        const newErrors = {};
        if (!description.trim()) newErrors.description = 'Description is required';
        if (!plantCode) newErrors.plantCode = 'Plant is required';
        if (!deadline) newErrors.deadline = 'Deadline is required';
        if (!canBypassPlantRestriction && userPlantCode && plantCode !== userPlantCode) {
            newErrors.plantCode = `You can only create items for your assigned plant (${userPlantCode})`;
        }
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
            const updateData = {
                plant_code: plantCode,
                description: description.trim(),
                deadline: new Date(deadline).toISOString(),
                comments: comments.trim()
            };
            if (item) {
                await ListService.updateListItem({...item, ...updateData});
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
        <div className="add-list-modal-backdrop">
            <div className="add-list-modal enhanced">
                <div className="add-list-header sticky">
                    <h2>{item ? 'Edit List Item' : 'Add New List Item'}</h2>
                    <button className="ios-button close-btn" onClick={onClose} aria-label="Close">×</button>
                </div>
                <div className="add-list-content-scrollable">
                    <div className="add-list-content">
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
                                    <div className="form-group">
                                        <label htmlFor="plantCode">Plant*</label>
                                        <select
                                            id="plantCode"
                                            className="ios-select"
                                            value={plantCode}
                                            onChange={e => setPlantCode(e.target.value)}
                                            required
                                        >
                                            <option value=""
                                                    disabled={!canBypassPlantRestriction && userPlantCode}>Select Plant
                                            </option>
                                            {plants.map(plant => (
                                                <option
                                                    key={plant.plant_code}
                                                    value={plant.plant_code}
                                                    disabled={!canBypassPlantRestriction && userPlantCode && plant.plant_code !== userPlantCode}
                                                >
                                                    ({plant.plant_code}) {plant.plant_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
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
                            <div className="form-section">
                                <div className="form-row">
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
                            <div className="form-actions">
                                <button type="submit" className="ios-button-primary" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
                                </button>
                            </div>
                        </form>
                        {errors.description && <div className="error-message">{errors.description}</div>}
                        {errors.plantCode && <div className="error-message">{errors.plantCode}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ListAddView;
