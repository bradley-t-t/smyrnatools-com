import { useCallback, useEffect, useMemo, useState } from 'react'

import Database from '../../services/DatabaseService'
import { MixerService } from '../../services/MixerService'
import { OperatorService } from '../../services/OperatorService'
import { PlantService } from '../../services/PlantService'
import { TractorService } from '../../services/TractorService'
import { UserService } from '../../services/UserService'

/**
 * Encapsulates all data fetching, form state, derived plant lists, region
 * lookup, save/delete/transfer handlers and equipment-unassignment side
 * effects for OperatorDetailView. Returns the full state surface so the view
 * is purely presentational.
 *
 * @param {{ operatorId: string, onClose: Function, allowedPlantCodes?: Set<string> }} params
 */
export function useOperatorDetail({ operatorId, onClose, allowedPlantCodes }) {
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
            await UserService.getCurrentUser()
            const updatedOperator = {
                ...operator,
                plant_code: newPlantCode
            }
            await OperatorService.updateOperator({
                ...updatedOperator,
                employeeId: operator.employeeId,
                employee_id: operator.employeeId
            })
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
                employeeId: operatorId,
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

    const handleBackClick = async () => {
        if (_hasUnsavedChanges) {
            await handleSave()
        }
        if (onClose) onClose()
    }

    return {
        _hasUnsavedChanges,
        _setHasUnsavedChanges,
        _showDeleteConfirmation,
        assignedPlant,
        assignedTrainer,
        automaticRestriction,
        canDeleteOperator,
        canEditOperator,
        currentRegion,
        filteredPlants,
        handleBackClick,
        handleDelete,
        handleRegionTransfer,
        handleSave,
        hasTrainingPermission,
        isLoading,
        isSaving,
        isTrainer,
        message,
        name,
        operator,
        pendingStartDate,
        phone,
        plantDisplayText,
        position,
        rating,
        setAssignedPlant,
        setAssignedTrainer,
        setAutomaticRestriction,
        setCanEditOperator,
        setIsTrainer,
        setName,
        setPendingStartDate,
        setPhone,
        setPosition,
        setRating,
        setShowComments,
        setShowDeleteConfirmation,
        setShowHistory,
        setShowPlantModal,
        setSmyrnaId,
        setStatus,
        showComments,
        showHistory,
        showPlantModal,
        smyrnaId,
        status,
        trainers
    }
}
