import React, {useEffect, useMemo, useState} from 'react';
import {EquipmentService} from '../../services/EquipmentService';
import {AuthService} from '../../services/AuthService';
import './styles/Equipment.css';
import {usePreferences} from '../../app/context/PreferencesContext'
import {RegionService} from '../../services/RegionService'
import PlantDropdownModal from '../../components/common/PlantDropdownModal';

function EquipmentAddView({plants, onClose, onEquipmentAdded}) {
    const {preferences} = usePreferences()
    const [identifyingNumber, setIdentifyingNumber] = useState('');
    const [assignedPlant, setAssignedPlant] = useState('');
    const [equipmentType, setEquipmentType] = useState('');
    const [status, setStatus] = useState('Active');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false);

    useEffect(() => {
        const code = preferences.selectedRegion?.code || ''
        let cancelled = false

        async function loadRegionPlants() {
            if (!code) {
                setRegionPlantCodes(null)
                return
            }
            try {
                const regionPlants = await RegionService.fetchRegionPlants(code)
                if (cancelled) return
                const codes = new Set(regionPlants.map(p => p.plantCode))
                setRegionPlantCodes(codes)
                if (assignedPlant && !codes.has(assignedPlant)) setAssignedPlant('')
            } catch {
                setRegionPlantCodes(new Set())
            }
        }

        loadRegionPlants()
        return () => {
            cancelled = true
        }
    }, [preferences.selectedRegion?.code, assignedPlant])

    const visiblePlants = useMemo(() => {
        const list = Array.isArray(plants) ? plants : []
        return list.slice().sort((a, b) => parseInt(a.plantCode?.replace(/\D/g, '') || '0') - parseInt(b.plantCode?.replace(/\D/g, '') || '0'))
    }, [plants])

    const selectedPlantObj = visiblePlants.find(p => p.plantCode === assignedPlant);
    const plantDisplayText = assignedPlant ? `(${selectedPlantObj?.plantCode}) ${selectedPlantObj?.plantName}` : 'Select Plant';

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (!identifyingNumber) return setError('Identifying number is required');
        if (!assignedPlant) return setError('Plant is required');
        if (!equipmentType) return setError('Equipment type is required');

        setIsSaving(true);
        try {
            const userId = AuthService.currentUser?.id || sessionStorage.getItem('userId');
            if (!userId) throw new Error('User ID not available. Please log in again.');

            const newEquipment = {
                identifying_number: identifyingNumber,
                assigned_plant: assignedPlant,
                equipment_type: equipmentType,
                status
            };

            const savedEquipment = await EquipmentService.createEquipment(newEquipment, userId);
            if (!savedEquipment) throw new Error('Failed to add equipment - no data returned from server');

            onEquipmentAdded(savedEquipment);
            onClose();
        } catch (error) {
            const errorMessage = error.message || 'Unknown error';
            if (errorMessage.toLowerCase().includes('duplicate') || errorMessage.toLowerCase().includes('unique constraint') || errorMessage.toLowerCase().includes('already exists')) {
                setError('This identifying number is already in use. Please use a different identifying number.');
            } else {
                setError(`Failed to add equipment: ${errorMessage}`);
            }
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="add-equipment-modal-backdrop">
            <div className="add-equipment-modal enhanced">
                <div className="add-equipment-header sticky">
                    <h2>Add New Equipment</h2>
                    <button className="ios-button close-btn" onClick={onClose} aria-label="Close">×</button>
                </div>
                <div className="add-equipment-content-scrollable">
                    <div className="add-equipment-content">
                        {error && <div className="error-message">{error}</div>}
                        <form onSubmit={handleSubmit} autoComplete="off">
                            <div className="form-section">
                                <div className="form-row">
                                    <div className="form-group wide">
                                        <label htmlFor="identifyingNumber">Identifying Number*</label>
                                        <input
                                            id="identifyingNumber"
                                            type="text"
                                            className="ios-input"
                                            value={identifyingNumber}
                                            onChange={e => setIdentifyingNumber(e.target.value)}
                                            placeholder="Enter identifying number"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="form-section">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="assignedPlant">Assigned Plant*</label>
                                        <button
                                            type="button"
                                            className="ios-select"
                                            onClick={() => setIsPlantModalOpen(true)}
                                            aria-label="Select assigned plant"
                                        >
                                            {plantDisplayText}
                                        </button>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="equipmentType">Equipment Type*</label>
                                        <select
                                            id="equipmentType"
                                            className="ios-select"
                                            value={equipmentType}
                                            onChange={e => setEquipmentType(e.target.value)}
                                            required
                                        >
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
                                            <option value="Roller">Roller</option>
                                            <option value="Maintainer">Maintainer</option>
                                            <option value="Sweeper">Sweeper</option>
                                            <option value="Other">Other</option>
                                            <option value="Unknown">Unknown</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="status">Status</label>
                                        <select
                                            id="status"
                                            className="ios-select"
                                            value={status}
                                            onChange={e => setStatus(e.target.value)}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Spare">Spare</option>
                                            <option value="In Shop">In Shop</option>
                                            <option value="Retired">Retired</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="ios-button-primary" disabled={isSaving}>
                                    {isSaving ? 'Adding...' : 'Add Equipment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {isPlantModalOpen && (
                <PlantDropdownModal
                    isOpen={isPlantModalOpen}
                    onClose={() => setIsPlantModalOpen(false)}
                    onSelect={code => {
                        setAssignedPlant(code);
                        setIsPlantModalOpen(false);
                    }}
                    plants={visiblePlants}
                />
            )}
        </div>
    );
}

export default EquipmentAddView;