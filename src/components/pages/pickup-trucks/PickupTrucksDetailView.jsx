import React, {useEffect, useMemo, useState} from 'react'
import {PickupTruckService} from '../../../services/PickupTruckService'
import './styles/PickupTrucks.css'
import LoadingScreen from '../../common/LoadingScreen'
import {PlantService} from '../../../services/PlantService'
import {usePreferences} from '../../../app/context/PreferencesContext'
import {RegionService} from '../../../services/RegionService'
import {UserService} from '../../../services/UserService'
import PlantDropdownModal from '../../common/PlantDropdownModal'

function PickupTrucksDetailView({pickupId, onClose, onSaved}) {
    const {preferences} = usePreferences()
    const [pickup, setPickup] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [vin, setVin] = useState('')
    const [make, setMake] = useState('')
    const [model, setModel] = useState('')
    const [year, setYear] = useState('')
    const [assigned, setAssigned] = useState('')
    const [assignedPlant, setAssignedPlant] = useState('')
    const [status, setStatus] = useState('')
    const [mileage, setMileage] = useState('')
    const [comments, setComments] = useState('')
    const [plants, setPlants] = useState([])
    const [regionPlantCodes, setRegionPlantCodes] = useState(new Set())
    const [originalValues, setOriginalValues] = useState(null)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [showPlantModal, setShowPlantModal] = useState(false)

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true)
            try {
                const data = await PickupTruckService.getById(pickupId)
                setPickup(data)
                setVin(data?.vin || '')
                setMake(data?.make || '')
                setModel(data?.model || '')
                setYear(data?.year || '')
                setAssigned(data?.assigned || '')
                setAssignedPlant(data?.assignedPlant || '')
                setStatus(data?.status || '')
                setMileage(data?.mileage ?? '')
                setComments(data?.comments || '')
                setOriginalValues({
                    vin: data?.vin || '',
                    make: data?.make || '',
                    model: data?.model || '',
                    year: data?.year || '',
                    assigned: data?.assigned || '',
                    assignedPlant: data?.assignedPlant || '',
                    status: data?.status || '',
                    mileage: data?.mileage ?? '',
                    comments: data?.comments || ''
                })
            } catch {
                setPickup(null)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [pickupId])

    useEffect(() => {
        async function loadPlants() {
            try {
                const data = await PlantService.fetchPlants()
                setPlants(Array.isArray(data) ? data : [])
            } catch {
                setPlants([])
            }
        }

        loadPlants()
    }, [])

    useEffect(() => {
        let cancelled = false

        async function loadAllowedPlants() {
            let regionCode = preferences.selectedRegion?.code || ''
            try {
                if (!regionCode) {
                    const user = await UserService.getCurrentUser()
                    const uid = user?.id || ''
                    if (uid) {
                        const profilePlant = await UserService.getUserPlant(uid)
                        const plantCode = typeof profilePlant === 'string' ? profilePlant : (profilePlant?.plant_code || profilePlant?.plantCode || '')
                        if (plantCode) {
                            const regions = await RegionService.fetchRegionsByPlantCode(plantCode)
                            const r = Array.isArray(regions) && regions.length ? regions[0] : null
                            regionCode = r ? (r.regionCode || r.region_code || '') : ''
                        }
                    }
                }
                if (!regionCode) {
                    if (!cancelled) setRegionPlantCodes(new Set())
                    return
                }
                const regionPlants = await RegionService.fetchRegionPlants(regionCode)
                if (cancelled) return
                const codes = new Set(regionPlants.map(p => String(p.plantCode || p.plant_code || '').trim().toUpperCase()).filter(Boolean))
                setRegionPlantCodes(codes)
            } catch {
                if (!cancelled) setRegionPlantCodes(new Set())
            }
        }

        loadAllowedPlants()
        return () => {
            cancelled = true
        }
    }, [preferences.selectedRegion?.code])

    const filteredPlants = useMemo(() => {
        if (!regionPlantCodes || regionPlantCodes.size === 0) return []
        return plants.filter(p => regionPlantCodes.has(String(p.plantCode || p.plant_code || '').trim().toUpperCase()))
    }, [plants, regionPlantCodes])

    const selectedPlantObj = plants.find(p => (p.plantCode || p.plant_code) === assignedPlant);
    const plantDisplayText = assignedPlant ? `(${selectedPlantObj?.plantCode || selectedPlantObj?.plant_code || assignedPlant}) ${selectedPlantObj?.plantName || selectedPlantObj?.plant_name || ''}` : 'Select Plant';

    useEffect(() => {
        if (!originalValues) return
        const changed =
            (vin || '') !== (originalValues.vin || '') ||
            (make || '') !== (originalValues.make || '') ||
            (model || '') !== (originalValues.model || '') ||
            (year || '') !== (originalValues.year || '') ||
            (assigned || '') !== (originalValues.assigned || '') ||
            (assignedPlant || '') !== (originalValues.assignedPlant || '') ||
            (status || '') !== (originalValues.status || '') ||
            String(mileage ?? '') !== String(originalValues.mileage ?? '') ||
            (comments || '') !== (originalValues.comments || '')
        setHasUnsavedChanges(changed)
    }, [vin, make, model, year, assigned, assignedPlant, status, mileage, comments, originalValues])

    async function handleSave() {
        if (!pickup?.id) return null
        setIsSaving(true)
        try {
            const payload = {
                vin: vin || null,
                make: make || null,
                model: model || null,
                year: year || null,
                assigned: assigned || null,
                assignedPlant: assignedPlant || null,
                status: status || null,
                mileage: mileage === '' ? null : Number(mileage),
                comments: comments || null
            }
            const updated = await PickupTruckService.update(pickup.id, payload)
            setPickup(updated)
            setMessage('Changes saved')
            setTimeout(() => setMessage(''), 3000)
            setOriginalValues({
                vin: updated?.vin || '',
                make: updated?.make || '',
                model: updated?.model || '',
                year: updated?.year || '',
                assigned: updated?.assigned || '',
                assignedPlant: updated?.assignedPlant || '',
                status: updated?.status || '',
                mileage: updated?.mileage ?? '',
                comments: updated?.comments || ''
            })
            setHasUnsavedChanges(false)
            return updated
        } catch (e) {
            setMessage(e?.message || 'Error saving changes')
            setTimeout(() => setMessage(''), 4000)
            return null
        } finally {
            setIsSaving(false)
        }
    }

    async function handleDelete() {
        if (!pickup?.id) return
        try {
            await PickupTruckService.remove(pickup.id)
            onClose?.()
        } catch {
        }
    }

    async function handleBackClick() {
        if (hasUnsavedChanges) {
            const updated = await handleSave()
            if (!updated) return
            if (typeof onSaved === 'function') onSaved(updated)
            else onClose?.()
            return
        }
        if (typeof onSaved === 'function') onSaved()
        else onClose?.()
    }

    if (isLoading) {
        return (
            <div className="mixer-detail-view pickup-trucks-detail">
                <div className="detail-header themed">
                    <button className="back-button" onClick={onClose}><i className="fas fa-arrow-left"></i></button>
                    <h1>Pickup Details</h1>
                    <div className="header-spacer-36"></div>
                </div>
                <div className="detail-content">
                    <LoadingScreen message="Loading pickup details..." inline={true}/>
                </div>
            </div>
        )
    }

    if (!pickup) {
        return (
            <div className="mixer-detail-view pickup-trucks-detail">
                <div className="detail-header themed">
                    <button className="back-button" onClick={onClose}><i className="fas fa-arrow-left"></i></button>
                    <h1>Pickup Not Found</h1>
                </div>
                <div className="error-message">
                    <p>Could not find the requested pickup.</p>
                    <button className="primary-button" onClick={onClose}>Return</button>
                </div>
            </div>
        )
    }

    const assignedPlantInRegion = assignedPlant && regionPlantCodes.has(String(assignedPlant).trim().toUpperCase())

    return (
        <div className="mixer-detail-view pickup-trucks-detail">
            {isSaving && (
                <div className="saving-overlay">
                    <div className="saving-indicator"></div>
                </div>
            )}
            <div className="detail-header themed" style={{display: 'flex', alignItems: 'center'}}>
                <button className="back-button" onClick={handleBackClick} aria-label="Back"><i
                    className="fas fa-arrow-left"></i><span>Back</span></button>
                <h1 style={{flex: 1, textAlign: 'center'}}>Pickup {assigned ? `- ${assigned}` : ''}</h1>
                <div style={{width: '36px'}}></div>
            </div>
            <div className="detail-content pickup-detail-content">
                {message && (<div
                    className={`message ${message.toLowerCase().includes('error') ? 'error' : 'success'}`}>{message}</div>)}
                <div className="detail-card">
                    <div className="card-header"><h2>Pickup Information</h2></div>
                    <p className="edit-instructions">You can make changes below. Remember to save your changes.</p>
                    <div className="form-sections pickup-form-sections">
                        <div className="form-section basic-info">
                            <h3>Basic Information</h3>
                            <div className="form-group"><label>Assigned Plant</label>
                                <button className="operator-select-button form-control"
                                        onClick={() => setShowPlantModal(true)} type="button"><span style={{
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>{plantDisplayText}</span></button>
                            </div>
                            <div className="form-group"><label>Status</label><select value={status}
                                                                                     onChange={e => setStatus(e.target.value)}
                                                                                     className="form-control">
                                <option value="">Select Status</option>
                                <option value="Active">Active</option>
                                <option value="Stationary">Stationary</option>
                                <option value="Spare">Spare</option>
                                <option value="In Shop">In Shop</option>
                                <option value="Retired">Retired</option>
                                <option value="Sold">Sold</option>
                            </select></div>
                            <div className="form-group"><label>Assigned</label><input type="text" value={assigned}
                                                                                      onChange={e => setAssigned(e.target.value)}
                                                                                      className="form-control"/></div>
                            <div className="form-group"><label>Mileage</label><input type="number" value={mileage}
                                                                                     onChange={e => setMileage(e.target.value)}
                                                                                     className="form-control"/></div>
                        </div>
                        <div className="form-section vehicle-info">
                            <h3>Asset Details</h3>
                            <div className="form-group"><label>VIN</label><input type="text" value={vin}
                                                                                 onChange={e => setVin(e.target.value.toUpperCase().replace(/[IOQ]/g, ''))}
                                                                                 maxLength="17"
                                                                                 className="form-control"/></div>
                            <div className="form-group"><label>Make</label><input type="text" value={make}
                                                                                  onChange={e => setMake(e.target.value)}
                                                                                  className="form-control"/></div>
                            <div className="form-group"><label>Model</label><input type="text" value={model}
                                                                                   onChange={e => setModel(e.target.value)}
                                                                                   className="form-control"/></div>
                            <div className="form-group"><label>Year</label><input type="text" value={year}
                                                                                  onChange={e => setYear(e.target.value)}
                                                                                  className="form-control"/></div>
                            <div className="form-group"><label>Comments</label><textarea value={comments}
                                                                                         onChange={e => setComments(e.target.value)}
                                                                                         className="form-control"
                                                                                         rows={3}/></div>
                        </div>
                    </div>
                </div>
                <div className="form-actions">
                    <button className="primary-button save-button" onClick={handleSave}
                            disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
                    <button className="danger-button" onClick={handleDelete} disabled={isSaving}>Delete Pickup</button>
                </div>
            </div>
            {showPlantModal && (
                <PlantDropdownModal
                    isOpen={showPlantModal}
                    onClose={() => setShowPlantModal(false)}
                    plants={filteredPlants}
                    onSelect={setAssignedPlant}
                    searchPlaceholder="Search plants..."
                />
            )}
        </div>
    )
}

export default PickupTrucksDetailView
