import React, {useEffect, useMemo, useState} from 'react'
import {PickupTruckService} from '../../services/PickupTruckService'
import {AuthService} from '../../services/AuthService'
import './styles/PickupTrucks.css'
import {usePreferences} from '../../app/context/PreferencesContext'
import {PlantService} from '../../services/PlantService'
import {RegionService} from '../../services/RegionService'
import PlantDropdownModal from '../../components/common/PlantDropdownModal';
import AddViewSection from '../../components/sections/AddViewSection';

function PickupTrucksAddView({onClose, onAdded}) {
    const {preferences} = usePreferences()
    const [vin, setVin] = useState('')
    const [make, setMake] = useState('')
    const [model, setModel] = useState('')
    const [year, setYear] = useState('')
    const [assigned, setAssigned] = useState('')
    const [assignedPlant, setAssignedPlant] = useState('')
    const [status, setStatus] = useState('Active')
    const [mileage, setMileage] = useState('')
    const [comments, setComments] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const [plants, setPlants] = useState([])
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false);

    useEffect(() => {
        let cancelled = false

        async function loadPlants() {
            try {
                const data = await PlantService.fetchPlants()
                if (!cancelled) setPlants(Array.isArray(data) ? data : [])
            } catch {
                if (!cancelled) setPlants([])
            }
        }

        loadPlants()
        return () => {
            cancelled = true
        }
    }, [])

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

    const sortedFilteredPlants = useMemo(() => {
        const list = plants
        const filtered = !preferences.selectedRegion?.code || !regionPlantCodes ? list : list.filter(p => regionPlantCodes.has(String(p.plantCode || p.plant_code || '').trim().toUpperCase()))
        return filtered.slice().sort((a, b) => parseInt(String(a.plantCode || a.plant_code || '').replace(/\D/g, '') || '0') - parseInt(String(b.plantCode || b.plant_code || '').replace(/\D/g, '') || '0'))
    }, [plants, regionPlantCodes, preferences.selectedRegion?.code])

    const selectedPlantObj = sortedFilteredPlants.find(p => (p.plantCode || p.plant_code) === assignedPlant);
    const plantDisplayText = assignedPlant ? `(${selectedPlantObj?.plantCode || selectedPlantObj?.plant_code}) ${selectedPlantObj?.plantName || selectedPlantObj?.plant_name}` : 'Select Plant';

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        if (!assignedPlant) {
            setError('Assigned plant is required')
            return
        }
        setIsSaving(true)
        try {
            const userId = AuthService.currentUser?.id || sessionStorage.getItem('userId')
            if (!userId) throw new Error('User ID not available. Please log in again.')
            const payload = {
                vin: vin || null,
                make: make || null,
                model: model || null,
                year: year || null,
                assigned: assigned || null,
                assignedPlant: assignedPlant || null,
                assigned_plant: assignedPlant || null,
                status: status || null,
                mileage: mileage === '' ? null : Number(mileage),
                comments: comments || null
            }
            const saved = await PickupTruckService.create(payload, userId)
            onAdded?.(saved)
            onClose?.()
        } catch (err) {
            setError(err?.message || 'Failed to add pickup truck')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <>
            <AddViewSection title="Add Pickup Truck" onClose={onClose} error={error}>
                <form onSubmit={handleSubmit} autoComplete="off" className="add-form">
                    <div className="add-form-section">
                        <div className="add-form-section-title">
                            <i className="fas fa-building"></i>
                            <span>Assignment & Status</span>
                        </div>
                        <div className="add-form-row">
                            <div className="form-group">
                                <label>Plant*</label>
                                <button
                                    type="button"
                                    className="ios-select"
                                    onClick={() => setIsPlantModalOpen(true)}
                                    aria-label="Select plant"
                                >
                                    {plantDisplayText}
                                </button>
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select className="ios-select" value={status}
                                        onChange={e => setStatus(e.target.value)}>
                                    <option value="Active">Active</option>
                                    <option value="Stationary">Stationary</option>
                                    <option value="Spare">Spare</option>
                                    <option value="In Shop">In Shop</option>
                                    <option value="Retired">Retired</option>
                                    <option value="Sold">Sold</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="add-form-section">
                        <div className="add-form-section-title">
                            <i className="fas fa-car"></i>
                            <span>Vehicle Information</span>
                        </div>
                        <div className="add-form-row">
                            <div className="form-group">
                                <label>VIN</label>
                                <input type="text" className="ios-input" value={vin}
                                       onChange={e => setVin(e.target.value.toUpperCase().replace(/[IOQ]/g, ''))}
                                       placeholder="Enter VIN (no I, O, Q)"/>
                                <div className="vin-hint">Letters I, O, and Q are not used.</div>
                            </div>
                            <div className="form-group">
                                <label>Year</label>
                                <input type="text" className="ios-input" value={year}
                                       onChange={e => setYear(e.target.value)} placeholder="Enter year"/>
                            </div>
                        </div>
                        <div className="add-form-row">
                            <div className="form-group">
                                <label>Make</label>
                                <input type="text" className="ios-input" value={make}
                                       onChange={e => setMake(e.target.value)} placeholder="Enter make"/>
                            </div>
                            <div className="form-group">
                                <label>Model</label>
                                <input type="text" className="ios-input" value={model}
                                       onChange={e => setModel(e.target.value)} placeholder="Enter model"/>
                            </div>
                        </div>
                    </div>

                    <div className="add-form-section">
                        <div className="add-form-section-title">
                            <i className="fas fa-user"></i>
                            <span>Usage Details</span>
                        </div>
                        <div className="add-form-row">
                            <div className="form-group">
                                <label>Assigned</label>
                                <input type="text" className="ios-input" value={assigned}
                                       onChange={e => setAssigned(e.target.value)} placeholder="Enter name"/>
                            </div>
                            <div className="form-group">
                                <label>Mileage</label>
                                <input type="number" className="ios-input" value={mileage}
                                       onChange={e => setMileage(e.target.value)} placeholder="Enter mileage"/>
                            </div>
                        </div>
                        <div className="add-form-row">
                            <div className="form-group wide">
                                <label>Comments</label>
                                <textarea className="ios-input" rows={3} value={comments}
                                          onChange={e => setComments(e.target.value)} placeholder="Notes"/>
                            </div>
                        </div>
                    </div>

                    <div className="add-form-actions">
                        <button type="submit" className="ios-button-primary"
                                disabled={isSaving}>{isSaving ? 'Adding...' : 'Add Pickup'}</button>
                    </div>
                </form>
            </AddViewSection>
            {isPlantModalOpen && (
                <PlantDropdownModal
                    isOpen={isPlantModalOpen}
                    onClose={() => setIsPlantModalOpen(false)}
                    onSelect={code => {
                        setAssignedPlant(code);
                        setIsPlantModalOpen(false);
                    }}
                    plants={sortedFilteredPlants}
                />
            )}
        </>
    )
}

export default PickupTrucksAddView