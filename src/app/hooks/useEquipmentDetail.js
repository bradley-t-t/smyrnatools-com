import { useEffect, useMemo, useState } from 'react'

import { EquipmentService } from '../../services/EquipmentService'
import { PlantService } from '../../services/PlantService'
import { UserService } from '../../services/UserService'

/**
 * Loads equipment + plants and exposes the editable form state. Centralizes
 * change tracking against the originally loaded values, the region-scoped
 * plant allowlist, and the comments/issues fetch effect.
 *
 * @param {string} equipmentId - Equipment ID to load.
 * @param {object} preferences - Preferences context (used for selected region).
 * @returns {object} Form state, setters, derived data, and load status.
 */
export default function useEquipmentDetail(equipmentId, preferences) {
    const [equipment, setEquipment] = useState(null)
    const [plants, setPlants] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [message, setMessage] = useState('')
    const [originalValues, setOriginalValues] = useState({})
    const [identifyingNumber, setIdentifyingNumber] = useState('')
    const [assignedPlant, setAssignedPlant] = useState('')
    const [equipmentType, setEquipmentType] = useState('')
    const [status, setStatus] = useState('')
    const [cleanlinessRating, setCleanlinessRating] = useState(0)
    const [conditionRating, setConditionRating] = useState(0)
    const [lastServiceDate, setLastServiceDate] = useState(null)
    const [hoursMileage, setHoursMileage] = useState('')
    const [hours, setHours] = useState('')
    const [make, setMake] = useState('')
    const [model, setModel] = useState('')
    const [year, setYear] = useState('')
    const [_comments, setComments] = useState([])
    const [_issues, setIssues] = useState([])
    const [regionPlantCodes, setRegionPlantCodes] = useState(new Set())
    const [currentRegion, setCurrentRegion] = useState(null)
    const [updatedByEmail, setUpdatedByEmail] = useState('')
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true)
            try {
                const [equipmentData, plantsData] = await Promise.all([
                    EquipmentService.fetchEquipmentById(equipmentId),
                    PlantService.fetchPlants()
                ])
                setEquipment(equipmentData)
                setPlants(plantsData)
                setIdentifyingNumber(equipmentData.identifyingNumber || '')
                setAssignedPlant(equipmentData.assignedPlant || '')
                setEquipmentType(equipmentData.equipmentType || '')
                setStatus(equipmentData.status || '')
                setCleanlinessRating(equipmentData.cleanlinessRating || 0)
                setConditionRating(equipmentData.conditionRating || 0)
                setLastServiceDate(equipmentData.lastServiceDate || null)
                setHoursMileage(equipmentData.hoursMileage ? equipmentData.hoursMileage.toString() : '')
                setHours(equipmentData.hours != null ? String(equipmentData.hours) : '')
                setMake(equipmentData.equipmentMake || '')
                setModel(equipmentData.equipmentModel || '')
                setYear(equipmentData.yearMade ? equipmentData.yearMade.toString() : '')
                setComments(equipmentData.comments || [])
                setIssues(equipmentData.issues || [])
                setOriginalValues({
                    assignedPlant: equipmentData.assignedPlant || '',
                    cleanlinessRating: equipmentData.cleanlinessRating || 0,
                    conditionRating: equipmentData.conditionRating || 0,
                    equipmentMake: equipmentData.equipmentMake || '',
                    equipmentModel: equipmentData.equipmentModel || '',
                    equipmentType: equipmentData.equipmentType || '',
                    hours: equipmentData.hours != null ? String(equipmentData.hours) : '',
                    hoursMileage: equipmentData.hoursMileage ? equipmentData.hoursMileage.toString() : '',
                    identifyingNumber: equipmentData.identifyingNumber || '',
                    lastServiceDate: equipmentData.lastServiceDate || null,
                    status: equipmentData.status || '',
                    yearMade: equipmentData.yearMade ? equipmentData.yearMade.toString() : ''
                })
            } catch (error) {
                setMessage('Error loading equipment details')
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [equipmentId])

    // Resolve which plants the user can reassign to, scoped by their region permissions.
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
                        const plantCode =
                            typeof profilePlant === 'string'
                                ? profilePlant
                                : profilePlant?.plant_code || profilePlant?.plantCode || ''
                        if (plantCode) {
                            const regions = await PlantService.fetchRegionsByPlantCode(plantCode)
                            const r = Array.isArray(regions) && regions.length ? regions[0] : null
                            regionCode = r ? r.regionCode || r.region_code || '' : ''
                        }
                    }
                }
                if (!regionCode) {
                    if (!cancelled) setRegionPlantCodes(new Set())
                    return
                }
                const regionPlants = await PlantService.fetchRegionPlants(regionCode)
                if (cancelled) return
                const codes = new Set(
                    regionPlants
                        .map((p) =>
                            String(p.plantCode || p.plant_code || '')
                                .trim()
                                .toUpperCase()
                        )
                        .filter(Boolean)
                )
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
        return plants.filter((p) =>
            regionPlantCodes.has(
                String(p.plantCode || p.plant_code || '')
                    .trim()
                    .toUpperCase()
            )
        )
    }, [plants, regionPlantCodes])

    useEffect(() => {
        if (!originalValues.identifyingNumber || isLoading) return
        const formatDateForComparison = (date) =>
            date ? (date instanceof Date ? date.toISOString().split('T')[0] : '') : ''
        const hasChanges =
            identifyingNumber !== originalValues.identifyingNumber ||
            assignedPlant !== originalValues.assignedPlant ||
            equipmentType !== originalValues.equipmentType ||
            status !== originalValues.status ||
            cleanlinessRating !== originalValues.cleanlinessRating ||
            conditionRating !== originalValues.conditionRating ||
            formatDateForComparison(lastServiceDate) !== formatDateForComparison(originalValues.lastServiceDate) ||
            hoursMileage !== originalValues.hoursMileage ||
            hours !== originalValues.hours ||
            make !== originalValues.equipmentMake ||
            model !== originalValues.equipmentModel ||
            year !== originalValues.yearMade
        setHasUnsavedChanges(hasChanges)
    }, [
        identifyingNumber,
        assignedPlant,
        equipmentType,
        status,
        cleanlinessRating,
        conditionRating,
        lastServiceDate,
        hoursMileage,
        hours,
        make,
        model,
        year,
        originalValues,
        isLoading
    ])

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasUnsavedChanges])

    useEffect(() => {
        if (equipment?.assignedPlant) {
            PlantService.fetchRegionsByPlantCode(equipment.assignedPlant)
                .then((regions) => {
                    if (regions && regions.length > 0) {
                        setCurrentRegion(regions[0].regionCode)
                    } else {
                        setCurrentRegion(null)
                    }
                })
                .catch(() => setCurrentRegion(null))
        }
    }, [equipment?.assignedPlant])

    useEffect(() => {
        async function fetchCommentsAndIssues() {
            if (!equipmentId) return
            try {
                const comments = await EquipmentService.fetchComments(equipmentId)
                setComments(Array.isArray(comments) ? comments.filter((c) => c && (c.comment || c.text)) : [])
                const issues = await EquipmentService.fetchIssues(equipmentId)
                setIssues(Array.isArray(issues) ? issues.filter((i) => i && (i.issue || i.title || i.description)) : [])
            } catch {
                setComments([])
                setIssues([])
            }
        }
        fetchCommentsAndIssues()
    }, [equipmentId])

    useEffect(() => {
        if (equipment?.updatedBy) {
            UserService.getUserDisplayName(equipment.updatedBy)
                .then((name) => setUpdatedByEmail(name))
                .catch(() => setUpdatedByEmail('Unknown User'))
        }
    }, [equipment?.updatedBy])

    return {
        assignedPlant,
        cleanlinessRating,
        conditionRating,
        currentRegion,
        equipment,
        equipmentType,
        filteredPlants,
        hasUnsavedChanges,
        hours,
        hoursMileage,
        identifyingNumber,
        isLoading,
        lastServiceDate,
        make,
        message,
        model,
        originalValues,
        plants,
        setAssignedPlant,
        setCleanlinessRating,
        setComments,
        setConditionRating,
        setEquipment,
        setEquipmentType,
        setHasUnsavedChanges,
        setHours,
        setHoursMileage,
        setIdentifyingNumber,
        setIssues,
        setLastServiceDate,
        setMake,
        setMessage,
        setModel,
        setOriginalValues,
        setStatus,
        setUpdatedByEmail,
        setYear,
        status,
        updatedByEmail,
        year
    }
}
