import { useCallback, useEffect, useMemo, useState } from 'react'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import DetailViewSection from '../../../app/components/sections/DetailViewSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import Database from '../../../services/DatabaseService'
import { MixerService } from '../../../services/MixerService'
import { OperatorService } from '../../../services/OperatorService'
import { PlantService } from '../../../services/PlantService'
import { TractorService } from '../../../services/TractorService'
import { UserService } from '../../../services/UserService'
import GrammarUtility from '../../../utils/GrammarUtility'
import OperatorCommentModal from './OperatorCommentModal'
import OperatorHistoryView from './OperatorHistoryView'
/**
 * Full detail/edit view for a single operator. Supports editing name, Smyrna ID,
 * status, plant (with region-scoped picker), position, trainer assignment,
 * rating, phone, CDL restriction, and pending start date. Automatically
 * unassigns the operator from active mixers/tractors when their plant changes
 * or status moves to non-Active. Also supports cross-region transfer and
 * sub-modals for comments and history.
 *
 * @param {string} operatorId - Employee ID of the operator to display.
 * @param {Function} onClose - Callback to return to the list view.
 * @param {Set<string>} [allowedPlantCodes] - Region-scoped plant codes for the plant picker.
 */
function OperatorDetailView({ operatorId, onClose, allowedPlantCodes }) {
    const { preferences: _preferences } = usePreferences()
    const [operator, setOperator] = useState(null)
    const [plants, setPlants] = useState([])
    const [trainers, setTrainers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [smyrnaId, setSmyrnaId] = useState('')
    const [name, setName] = useState('')
    const [status, setStatus] = useState('')
    const [assignedPlant, setAssignedPlant] = useState('')
    const [position, setPosition] = useState('')
    const [pendingStartDate, setPendingStartDate] = useState('')
    const [isTrainer, setIsTrainer] = useState(false)
    const [assignedTrainer, setAssignedTrainer] = useState('')
    const [hasTrainingPermission, setHasTrainingPermission] = useState(false)
    const [_showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [_hasUnsavedChanges, _setHasUnsavedChanges] = useState(false)
    const [rating, setRating] = useState(0)
    const [phone, setPhone] = useState('')
    const [showPlantModal, setShowPlantModal] = useState(false)
    const [currentRegion, setCurrentRegion] = useState(null)
    const [showHistory, setShowHistory] = useState(false)
    const [showComments, setShowComments] = useState(false)
    const [canEditOperator, setCanEditOperator] = useState(false)
    const [canDeleteOperator, setCanDeleteOperator] = useState(false)
    const [automaticRestriction, setAutomaticRestriction] = useState(false)
    useEffect(() => {
        if (allowedPlantCodes && allowedPlantCodes.size > 0) {
            if (assignedPlant && !allowedPlantCodes.has(String(assignedPlant).trim().toUpperCase())) {
                setAssignedPlant('')
            }
        }
    }, [allowedPlantCodes, assignedPlant])
    useEffect(() => {
        document.body.classList.add('in-detail-view')
        return () => {
            document.body.classList.remove('in-detail-view')
        }
    }, [])
    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const { data } = await Database.from('operators').select('*').eq('employee_id', operatorId).single()
            setOperator({
                ...data,
                employeeId: data.employee_id,
                id: data.employee_id
            })
            setSmyrnaId(data.smyrna_id || '')
            setName(data.name || '')
            setStatus(data.status || '')
            setAssignedPlant(data.plant_code || '')
            setPosition(data.position || '')
            const rawPending = data.pending_start_date || ''
            const normalizedPending =
                typeof rawPending === 'string' && rawPending.includes('T') ? rawPending.slice(0, 10) : rawPending
            setPendingStartDate(normalizedPending)
            setIsTrainer(data.is_trainer || false)
            setAssignedTrainer(data.assigned_trainer || '')
            setHasTrainingPermission(true)
            setRating(typeof data.rating === 'number' ? data.rating : Number(data.rating) || 0)
            setPhone(data.phone || '')
            setAutomaticRestriction(data.automatic_restriction === true)
        } catch (error) {
            console.error('Failed to fetch operator details:', error)
        }
        setIsLoading(false)
    }, [operatorId])
    const fetchPlants = useCallback(async () => {
        const { data } = await Database.from('plants').select('*')
        setPlants(data || [])
    }, [])
    const fetchTrainers = useCallback(async () => {
        const { data } = await Database.from('operators')
            .select('employee_id, name, is_trainer, plant_code')
            .eq('is_trainer', true)
        setTrainers(
            (data || [])
                .filter((trainer) =>
                    allowedPlantCodes && allowedPlantCodes.size > 0
                        ? allowedPlantCodes.has(
                              String(trainer.plant_code || '')
                                  .trim()
                                  .toUpperCase()
                          )
                        : false
                )
                .map((trainer) => ({
                    employeeId: trainer.employee_id,
                    name: trainer.name
                }))
        )
    }, [allowedPlantCodes])
    useEffect(() => {
        fetchData()
        fetchPlants()
        fetchTrainers()
    }, [operatorId, fetchData, fetchPlants, fetchTrainers])
    useEffect(() => {
        const checkDeletePermission = async () => {
            try {
                const currentUser = await UserService.getCurrentUser()
                const userId = currentUser?.id || currentUser
                if (userId) {
                    const hasPermission = await UserService.hasPermission(userId, 'detailview.delete')
                    setCanDeleteOperator(hasPermission)
                } else {
                    setCanDeleteOperator(false)
                }
            } catch (error) {
                setCanDeleteOperator(false)
            }
        }
        checkDeletePermission()
    }, [])
    const filteredPlants = useMemo(() => {
        return plants
            .filter((p) => {
                const code = String(p.plant_code || '')
                    .trim()
                    .toUpperCase()
                return allowedPlantCodes && allowedPlantCodes.size > 0 ? allowedPlantCodes.has(code) : false
            })
            .sort((a, b) => {
                const aCode = parseInt(a.plant_code?.replace(/\D/g, '') || '0')
                const bCode = parseInt(b.plant_code?.replace(/\D/g, '') || '0')
                return aCode - bCode
            })
    }, [plants, allowedPlantCodes])
    const selectedPlantObj = plants.find((p) => p.plant_code === assignedPlant)
    const plantDisplayText = assignedPlant
        ? `(${selectedPlantObj?.plant_code || assignedPlant}) ${selectedPlantObj?.plant_name || ''}`
        : 'Select Plant'
    const handleBackClick = async () => {
        if (_hasUnsavedChanges) {
            await handleSave()
        }
        if (onClose) onClose()
    }
    useEffect(() => {
        if (operator?.plant_code) {
            PlantService.fetchRegionsByPlantCode(operator.plant_code)
                .then((regions) => {
                    if (regions && regions.length > 0) {
                        setCurrentRegion(regions[0].regionCode)
                    } else {
                        setCurrentRegion(null)
                    }
                })
                .catch(() => setCurrentRegion(null))
        }
    }, [operator?.plant_code])
    /** Transfers the operator to a different region/plant via OperatorService, then refreshes local state. */
    const handleRegionTransfer = async (newRegionCode, newPlantCode) => {
        if (!operator?.employeeId || !newRegionCode || !newPlantCode) {
            throw new Error('Invalid operator, region, or plant')
        }
        const newRegion = await PlantService.fetchRegionByCode(newRegionCode)
        if (!newRegion) {
            throw new Error('Target region not found')
        }
        setIsSaving(true)
        setMessage('')
        try {
            const userObj = await UserService.getCurrentUser()
            const userId = typeof userObj === 'object' && userObj !== null ? userObj.id : userObj
            const updatedOperator = {
                ...operator,
                plant_code: newPlantCode
            }
            await OperatorService.updateOperator(operator.employeeId, updatedOperator, userId)
            setAssignedPlant(newPlantCode)
            setMessage(`Successfully transferred to ${newRegion.regionName}`)
            setTimeout(() => setMessage(''), 3000)
            await fetchData()
        } catch (error) {
            console.error('Region transfer failed:', error)
            throw error
        } finally {
            setIsSaving(false)
        }
    }
    const handleDelete = async () => {
        setIsSaving(true)
        await OperatorService.deleteOperator(operatorId)
        setIsSaving(false)
        if (onClose) onClose()
    }
    /** Persists all field changes. If plant changed or status became non-Active, auto-unassigns the operator from active mixers and tractors. */
    const handleSave = async () => {
        setIsSaving(true)
        setMessage('')
        const pendingForSave = status === 'Pending Start' && pendingStartDate ? pendingStartDate.slice(0, 10) : null
        const updateObj = {
            assigned_trainer: ['Training', 'Pending Start'].includes(status) && !isTrainer ? assignedTrainer : null,
            automatic_restriction: automaticRestriction,
            is_trainer: isTrainer,
            name: name,
            pending_start_date: pendingForSave,
            phone: phone || null,
            plant_code: assignedPlant,
            position: position,
            rating: typeof rating === 'number' ? rating : Number(rating) || 0,
            smyrna_id: smyrnaId,
            status: status,
            updated_at: new Date().toISOString()
        }
        try {
            const shouldUnassignEquipment =
                (operator && operator.plant_code !== assignedPlant) ||
                (operator && operator.status !== status && !['Active'].includes(status))
            if (shouldUnassignEquipment) {
                const assignedMixers = await MixerService.getMixersByOperator(operatorId)
                for (const mixer of assignedMixers) {
                    if (mixer.status === 'Active') {
                        await MixerService.updateMixer(mixer.id, { ...mixer, assignedOperator: null, status: 'Spare' })
                    }
                }
                const assignedTractors = await TractorService.getTractorsByOperator(operatorId)
                for (const tractor of assignedTractors) {
                    if (tractor.status === 'Active') {
                        await TractorService.updateTractor(tractor.id, {
                            ...tractor,
                            assignedOperator: null,
                            status: 'Spare'
                        })
                    }
                }
            }
            await OperatorService.updateOperator({
                ...updateObj,
                employee_id: operatorId
            })
            setMessage('Changes saved successfully!')
            fetchData()
            const currentUser = await UserService.getCurrentUser()
            const changedBy = currentUser?.id || 'system'
            const fieldsToCheck = [
                'smyrna_id',
                'name',
                'status',
                'plant_code',
                'position',
                'is_trainer',
                'assigned_trainer',
                'pending_start_date',
                'rating',
                'phone',
                'automatic_restriction'
            ]
            for (const field of fieldsToCheck) {
                const oldValue = operator[field]
                const newValue = updateObj[field]
                if (oldValue !== newValue) {
                    await OperatorService.createHistoryEntry(operatorId, field, oldValue, newValue, changedBy)
                }
            }
        } catch (e) {
            setMessage('Error saving changes. Please try again.')
        }
        setIsSaving(false)
        setTimeout(() => setMessage(''), 3000)
    }
    return (
        <DetailViewSection
            title={operator && operator.name ? operator.name : 'Operator Details'}
            onClose={onClose}
            onBack={handleBackClick}
            headerActions={
                <>
                    <button
                        className="flex items-center gap-2 rounded-xl border border-border-light bg-bg-primary px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover"
                        onClick={() => setShowComments(true)}
                    >
                        <i className="fas fa-comments"></i>
                        <span>Comments</span>
                    </button>
                    <button
                        className="flex items-center gap-2 rounded-xl border border-border-light bg-bg-primary px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover"
                        onClick={() => setShowHistory(true)}
                    >
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
            currentRegion={currentRegion}
            assetType="operator"
            onRegionTransfer={handleRegionTransfer}
            notFoundMessage="Operator Not Found"
            notFoundDescription="Could not find the requested operator."
            footerActions={
                <>
                    {canEditOperator ? (
                        <>
                            <button
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-light bg-bg-primary px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover"
                                onClick={handleSave}
                                disabled={isSaving || !canEditOperator}
                            >
                                <i className="fas fa-save"></i>
                                <span>{isSaving ? 'Saving...' : 'Save'}</span>
                            </button>
                            {canDeleteOperator && (
                                <button
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-light bg-bg-primary px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover"
                                    onClick={() => setShowDeleteConfirmation(true)}
                                    disabled={isSaving || !canEditOperator}
                                >
                                    <i className="fas fa-trash-alt"></i>
                                    <span>Delete</span>
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-text-secondary text-sm font-medium">
                            <i className="fas fa-lock"></i>
                            <span>View-Only Mode</span>
                        </div>
                    )}
                </>
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
                    {showHistory && <OperatorHistoryView operator={operator} onClose={() => setShowHistory(false)} />}
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
            <DetailViewSection.Section id="basic" title="Basic Information" icon="fas fa-user">
                <DetailViewSection.Card title="Personal Details" icon="fas fa-id-card">
                    <div className="flex flex-col gap-1.5">
                        <label>Employee ID</label>
                        <input
                            type="text"
                            value={smyrnaId}
                            onChange={(e) => setSmyrnaId(e.target.value)}
                            className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                            disabled={!canEditOperator}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label>Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                            disabled={!canEditOperator}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label>Phone</label>
                        <input
                            type="tel"
                            value={GrammarUtility.formatPhone(phone)}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                            placeholder="(555) 555-5555"
                            disabled={!canEditOperator}
                        />
                    </div>
                </DetailViewSection.Card>
                <DetailViewSection.Card title="Rating" icon="fas fa-star">
                    <div className="flex flex-col gap-1.5">
                        <label>Rating</label>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className={`p-1 bg-transparent border-none text-xl transition-colors ${!canEditOperator ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        onClick={() => canEditOperator && setRating(star === rating ? 0 : star)}
                                        aria-label={`Rate ${star} of 5 stars`}
                                        disabled={!canEditOperator}
                                    >
                                        <i
                                            className={`fas fa-star ${star <= rating ? 'text-amber-400' : 'text-border-light'}`}
                                        ></i>
                                    </button>
                                ))}
                            </div>
                            {rating > 0 && (
                                <span className="text-sm font-medium text-text-secondary">
                                    {[null, 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="mt-2">
                        <label
                            className={`flex items-center gap-3 ${!canEditOperator ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <div className="relative inline-flex items-center">
                                <input
                                    type="checkbox"
                                    checked={automaticRestriction}
                                    onChange={(e) => {
                                        if (canEditOperator) {
                                            setAutomaticRestriction(e.target.checked)
                                        }
                                    }}
                                    disabled={!canEditOperator}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 rounded-full peer-checked:bg-accent transition-colors"></div>
                                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
                            </div>
                            <span className="text-sm font-medium text-text-primary">Automatic Only (CDL)</span>
                        </label>
                        <p className="text-xs text-text-secondary mt-2">
                            Enable this if the operator has a CDL restriction that only allows them to drive automatic
                            transmission trucks
                        </p>
                    </div>
                </DetailViewSection.Card>
            </DetailViewSection.Section>
            <DetailViewSection.Section id="assignment" title="Assignment" icon="fas fa-building">
                <DetailViewSection.Card title="Assignment Information" icon="fas fa-map-marker-alt">
                    <div className="flex flex-col gap-1.5">
                        <label>Status</label>
                        <select
                            value={status}
                            onChange={(e) => {
                                const value = e.target.value
                                setStatus(value)
                                if (value === 'Active') setAssignedTrainer('')
                            }}
                            className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
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
                        <div className="flex flex-col gap-1.5">
                            <label>Pending Start Date</label>
                            <input
                                type="date"
                                value={pendingStartDate || ''}
                                onChange={(e) => setPendingStartDate(e.target.value)}
                                className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                                disabled={!canEditOperator}
                            />
                        </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                        <label>Assigned Plant</label>
                        <button
                            className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary text-left outline-none transition-colors focus:border-accent"
                            onClick={() => setShowPlantModal(true)}
                            type="button"
                            disabled={!canEditOperator}
                        >
                            <span className="block overflow-hidden text-ellipsis">{plantDisplayText}</span>
                        </button>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label>Position</label>
                        <select
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                            className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                            disabled={!canEditOperator}
                        >
                            <option value="">Select Position</option>
                            <option value="Mixer Operator">Mixer Operator</option>
                            <option value="Tractor Operator">Tractor Operator</option>
                        </select>
                    </div>
                </DetailViewSection.Card>
            </DetailViewSection.Section>
            {hasTrainingPermission && (
                <DetailViewSection.Section id="training" title="Training" icon="fas fa-graduation-cap">
                    <DetailViewSection.Card title="Training Details" icon="fas fa-chalkboard-teacher">
                        <div className="flex flex-col gap-1.5">
                            <label>Trainer Status</label>
                            <select
                                id="trainer-status"
                                className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                                value={isTrainer ? 'true' : 'false'}
                                onChange={(e) => {
                                    const isTrainerValue = e.target.value === 'true'
                                    setIsTrainer(isTrainerValue)
                                    if (isTrainerValue) {
                                        setAssignedTrainer(null)
                                    }
                                }}
                                disabled={!canEditOperator}
                            >
                                <option value="false">Not a Trainer</option>
                                <option value="true">Trainer</option>
                            </select>
                        </div>
                        {(status === 'Training' || status === 'Pending Start') && (
                            <div className="flex flex-col gap-1.5">
                                <label>Assigned Trainer</label>
                                <select
                                    value={assignedTrainer}
                                    onChange={(e) => setAssignedTrainer(e.target.value)}
                                    className="w-full rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                                    disabled={isTrainer || !canEditOperator}
                                >
                                    <option value="">None</option>
                                    {trainers.map((trainer) => (
                                        <option key={trainer.employeeId} value={trainer.employeeId}>
                                            {trainer.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </DetailViewSection.Card>
                </DetailViewSection.Section>
            )}
        </DetailViewSection>
    )
}
export default OperatorDetailView
