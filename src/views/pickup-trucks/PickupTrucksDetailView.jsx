import React, {useEffect, useMemo, useState} from 'react'
import {PickupTruckService} from '../../services/PickupTruckService'
import {PlantService} from '../../services/PlantService'
import {usePreferences} from '../../app/context/PreferencesContext'
import {RegionService} from '../../services/RegionService'
import {UserService} from '../../services/UserService'
import PlantDropdownModal from '../../components/common/PlantDropdownModal'
import DetailViewSection from '../../components/sections/DetailViewSection'
import PickupTruckHistoryView from './PickupTruckHistoryView'
import PickupTruckCommentModal from './PickupTruckCommentModal'
import PickupTruckIssueModal from './PickupTruckIssueModal'

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
    const [canEditPickup, setCanEditPickup] = useState(false)
    const [canDeletePickup, setCanDeletePickup] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [showComments, setShowComments] = useState(false)
    const [showIssues, setShowIssues] = useState(false)

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

    useEffect(() => {
        const checkDeletePermission = async () => {
            try {
                const currentUser = await UserService.getCurrentUser();
                const userId = currentUser?.id || currentUser;
                if (userId) {
                    const hasPermission = await UserService.hasPermission(userId, 'detailview.delete');
                    setCanDeletePickup(hasPermission);
                } else {
                    setCanDeletePickup(false);
                }
            } catch (error) {
                setCanDeletePickup(false);
            }
        };
        checkDeletePermission();
    }, []);

    return (
        <DetailViewSection
            title={`Pickup ${assigned ? `- ${assigned}` : ''}`}
            onClose={onClose}
            onBack={handleBackClick}
            isSaving={isSaving}
            message={message}
            itemAssignedPlant={pickup?.assignedPlant}
            onCanEditChange={setCanEditPickup}
            isLoading={isLoading}
            loadingMessage="Loading pickup details..."
            notFound={!pickup && !isLoading}
            notFoundMessage="Pickup Not Found"
            notFoundDescription="Could not find the requested pickup."
            headerActions={
                pickup && (
                    <>
                        <button className="global-button-secondary" onClick={() => setShowIssues(true)}>
                            <i className="fas fa-tools"></i> Issues
                        </button>
                        <button className="global-button-secondary" onClick={() => setShowComments(true)}>
                            <i className="fas fa-comments"></i> Comments
                        </button>
                        <button className="global-button-secondary" onClick={() => setShowHistory(true)}>
                            <i className="fas fa-history"></i>
                            <span>History</span>
                        </button>
                    </>
                )
            }
            footerActions={
                canEditPickup && (
                    <>
                        <button className="primary-button save-button" onClick={handleSave}
                                disabled={isSaving || !canEditPickup}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
                        {canDeletePickup && (
                            <button className="danger-button" onClick={handleDelete}
                                    disabled={isSaving || !canEditPickup}>Delete Pickup
                            </button>
                        )}
                    </>
                )
            }
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
                    {showHistory &&
                        <PickupTruckHistoryView pickupTruck={pickup} onClose={() => setShowHistory(false)}/>}
                    {showComments &&
                        <PickupTruckCommentModal pickupTruck={pickup} onClose={() => setShowComments(false)}/>}
                    {showIssues && <PickupTruckIssueModal pickupTruck={pickup} onClose={() => setShowIssues(false)}/>}
                </>
            }
        >
            <div className="detail-card">
                <div className="card-header"><h2>Pickup Information</h2></div>
                <p className="edit-instructions">{canEditPickup ? 'You can make changes below. Remember to save your changes.' : 'You are in read-only mode and cannot make changes to this pickup.'}</p>
                <div className="form-sections pickup-form-sections">
                    <div className="form-section basic-info">
                        <h3>Basic Information</h3>
                        <div className="form-group"><label>Assigned Plant</label>
                            <button className="operator-select-button form-control"
                                    onClick={() => setShowPlantModal(true)} type="button"
                                    disabled={!canEditPickup}><span style={{
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>{plantDisplayText}</span></button>
                        </div>
                        <div className="form-group"><label>Status</label><select value={status}
                                                                                 onChange={e => setStatus(e.target.value)}
                                                                                 className="form-control"
                                                                                 disabled={!canEditPickup}>
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
                                                                                  className="form-control"
                                                                                  disabled={!canEditPickup}/></div>
                        <div className="form-group"><label>Mileage</label><input type="number" value={mileage}
                                                                                 onChange={e => setMileage(e.target.value)}
                                                                                 className="form-control"
                                                                                 disabled={!canEditPickup}/></div>
                    </div>
                    <div className="form-section vehicle-info">
                        <h3>Asset Details</h3>
                        <div className="form-group"><label>VIN</label><input type="text" value={vin}
                                                                             onChange={e => setVin(e.target.value.toUpperCase().replace(/[IOQ]/g, ''))}
                                                                             maxLength="17"
                                                                             className="form-control"
                                                                             disabled={!canEditPickup}/></div>
                        <div className="form-group"><label>Make</label><input type="text" value={make}
                                                                              onChange={e => setMake(e.target.value)}
                                                                              className="form-control"
                                                                              disabled={!canEditPickup}/></div>
                        <div className="form-group"><label>Model</label><input type="text" value={model}
                                                                               onChange={e => setModel(e.target.value)}
                                                                               className="form-control"
                                                                               disabled={!canEditPickup}/></div>
                        <div className="form-group"><label>Year</label><input type="text" value={year}
                                                                              onChange={e => setYear(e.target.value)}
                                                                              className="form-control"
                                                                              disabled={!canEditPickup}/></div>
                        <div className="form-group"><label>Comments</label><textarea value={comments}
                                                                                     onChange={e => setComments(e.target.value)}
                                                                                     className="form-control"
                                                                                     rows={3}
                                                                                     disabled={!canEditPickup}/></div>
                    </div>
                </div>
            </div>
        </DetailViewSection>
    )
}

export default PickupTrucksDetailView
