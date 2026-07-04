import { useEffect, useMemo, useState } from 'react'

import { OperatorService } from '../../services/OperatorService'
import { PlantService } from '../../services/PlantService'
import { TractorService } from '../../services/TractorService'
import { UserService } from '../../services/UserService'

/**
 * Loads a tractor record and all dependent lists (operators, plants, other
 * tractors), seeds the editable form fields, tracks original values for
 * dirty-state detection, computes region-scoped plant filtering, and watches
 * for unsaved changes to enable the beforeunload prompt.
 *
 * @param {string} tractorId
 * @param {object} preferences - From PreferencesContext, used for region scope.
 */
export default function useTractorDetail(tractorId, preferences) {
    const [tractor, setTractor] = useState(null)
    const [operators, setOperators] = useState([])
    const [plants, setPlants] = useState([])
    const [tractors, setTractors] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [updatedByEmail, setUpdatedByEmail] = useState(null)
    const [originalValues, setOriginalValues] = useState({})
    const [truckNumber, setTruckNumber] = useState('')
    const [assignedOperator, setAssignedOperator] = useState('')
    const [assignedPlant, setAssignedPlant] = useState('')
    const [status, setStatus] = useState('')
    const [cleanlinessRating, setCleanlinessRating] = useState(0)
    const [lastServiceDate, setLastServiceDate] = useState(null)
    const [hasBlower, setHasBlower] = useState(false)
    const [vin, setVin] = useState('')
    const [make, setMake] = useState('')
    const [model, setModel] = useState('')
    const [year, setYear] = useState('')
    const [freight, setFreight] = useState('')
    const [hours, setHours] = useState('')
    const [comments, setComments] = useState([])
    const [issues, setIssues] = useState([])
    const [regionPlantCodes, setRegionPlantCodes] = useState(new Set())
    const [currentRegion, setCurrentRegion] = useState(null)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true)
            try {
                const [tractorData, operatorsData, plantsData, allTractors] = await Promise.all([
                    TractorService.fetchTractorById(tractorId),
                    OperatorService.fetchOperators(),
                    PlantService.fetchPlants(),
                    TractorService.getAllTractors()
                ])
                setTractor(tractorData)
                setOperators(operatorsData)
                setPlants(plantsData)
                setTractors(allTractors)
                setTruckNumber(tractorData.truckNumber || '')
                setAssignedOperator(tractorData.assignedOperator || '')
                setAssignedPlant(tractorData.assignedPlant || '')
                setStatus(tractorData.status || '')
                setCleanlinessRating(tractorData.cleanlinessRating || 0)
                setLastServiceDate(tractorData.lastServiceDate ? new Date(tractorData.lastServiceDate) : null)
                setHasBlower(tractorData.hasBlower || false)
                setVin((tractorData.vin || '').toUpperCase())
                setMake(tractorData.make || '')
                setModel(tractorData.model || '')
                setYear(String(tractorData.year || ''))
                setFreight(tractorData.freight || '')
                setHours(tractorData.hours != null ? String(tractorData.hours) : '')
                setOriginalValues({
                    assignedOperator: tractorData.assignedOperator || '',
                    assignedPlant: tractorData.assignedPlant || '',
                    cleanlinessRating: tractorData.cleanlinessRating || 0,
                    freight: tractorData.freight || '',
                    hasBlower: tractorData.hasBlower || false,
                    hours: tractorData.hours != null ? String(tractorData.hours) : '',
                    lastServiceDate: tractorData.lastServiceDate ? new Date(tractorData.lastServiceDate) : null,
                    make: tractorData.make || '',
                    model: tractorData.model || '',
                    status: tractorData.status || '',
                    truckNumber: tractorData.truckNumber || '',
                    vin: (tractorData.vin || '').toUpperCase(),
                    year: String(tractorData.year || '')
                })
                document.documentElement.style.setProperty('--rating-value', tractorData.cleanlinessRating || 0)
                if (tractorData.updatedBy) {
                    try {
                        const userName = await UserService.getUserDisplayName(tractorData.updatedBy)
                        setUpdatedByEmail(userName)
                    } catch {
                        setUpdatedByEmail('Unknown User')
                    }
                }
            } catch {
                // Best-effort; UI handles missing tractor in render.
            } finally {
                setIsLoading(false)
                setHasUnsavedChanges(false)
            }
        }
        fetchData()
    }, [tractorId])

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
        if (!originalValues.truckNumber || isLoading) return
        const formatDateForComparison = (date) =>
            date ? (date instanceof Date ? date.toISOString().split('T')[0] : '') : ''
        const hasChanges =
            truckNumber !== originalValues.truckNumber ||
            assignedPlant !== originalValues.assignedPlant ||
            status !== originalValues.status ||
            cleanlinessRating !== originalValues.cleanlinessRating ||
            formatDateForComparison(lastServiceDate) !== formatDateForComparison(originalValues.lastServiceDate) ||
            hasBlower !== originalValues.hasBlower ||
            vin !== originalValues.vin ||
            make !== originalValues.make ||
            model !== originalValues.model ||
            String(year) !== String(originalValues.year) ||
            freight !== originalValues.freight ||
            hours !== originalValues.hours
        setHasUnsavedChanges(hasChanges)
    }, [
        truckNumber,
        assignedPlant,
        status,
        cleanlinessRating,
        lastServiceDate,
        hasBlower,
        vin,
        make,
        model,
        year,
        freight,
        hours,
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
        if (tractor?.assignedPlant) {
            PlantService.fetchRegionsByPlantCode(tractor.assignedPlant)
                .then((regions) => {
                    setCurrentRegion(regions && regions.length > 0 ? regions[0].regionCode : null)
                })
                .catch(() => setCurrentRegion(null))
        }
    }, [tractor?.assignedPlant])

    useEffect(() => {
        async function fetchCommentsAndIssues() {
            if (!tractorId) return
            try {
                const [commentData, issueData] = await Promise.all([
                    TractorService.fetchComments(tractorId),
                    TractorService.fetchIssues(tractorId)
                ])
                setComments(Array.isArray(commentData) ? commentData.filter((c) => c && (c.comment || c.text)) : [])
                setIssues(
                    Array.isArray(issueData) ? issueData.filter((i) => i && (i.issue || i.title || i.description)) : []
                )
            } catch {
                // Best-effort comment/issue prefetch
            }
        }
        fetchCommentsAndIssues()
    }, [tractorId])

    return {
        assignedOperator,
        assignedPlant,
        cleanlinessRating,
        comments,
        currentRegion,
        filteredPlants,
        freight,
        hasBlower,
        hasUnsavedChanges,
        hours,
        isLoading,
        issues,
        lastServiceDate,
        make,
        model,
        operators,
        originalValues,
        plants,
        setAssignedOperator,
        setAssignedPlant,
        setCleanlinessRating,
        setFreight,
        setHasBlower,
        setHasUnsavedChanges,
        setHours,
        setLastServiceDate,
        setMake,
        setModel,
        setOperators,
        setOriginalValues,
        setStatus,
        setTractor,
        setTruckNumber,
        setUpdatedByEmail,
        setVin,
        setYear,
        status,
        tractor,
        tractors,
        truckNumber,
        updatedByEmail,
        vin,
        year
    }
}
