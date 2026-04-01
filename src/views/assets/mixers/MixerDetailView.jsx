import React, { useEffect, useMemo, useState } from 'react'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import VerificationRequirementsModal from '../../../app/components/common/VerificationRequirementsModal'
import DetailViewSection from '../../../app/components/sections/DetailViewSection'
import VerificationCardSection from '../../../app/components/sections/VerificationCardSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { Mixer } from '../../../app/models/mixers/Mixer'
import { Database } from '../../../services/DatabaseService'
import { MixerService } from '../../../services/MixerService'
import { OperatorService } from '../../../services/OperatorService'
import { PlantService } from '../../../services/PlantService'
import { UserService } from '../../../services/UserService'
import AssetStatsUtility from '../../../utils/AssetStatsUtility'
import { DateUtility } from '../../../utils/DateUtility'
import { ValidationUtility } from '../../../utils/ValidationUtility'
import MixerCommentModal from './MixerCommentModal'
import MixerHistoryView from './MixerHistoryView'
import MixerIssueModal from './MixerIssueModal'
import OperatorSelectModal from './OperatorSelectModal'
/**
 * Full detail/edit view for a single mixer record. Handles loading, saving,
 * verification (with missing-field modal), deletion, operator assignment/
 * unassignment, region-scoped plant transfer, In Shop sub-status tracking,
 * and sub-modals for comments, issues, and history.
 *
 * @param {string} mixerId - ID of the mixer record to display.
 * @param {Function} onClose - Callback to return to the list view.
 */
function MixerDetailView({ mixerId, onClose }) {
    const { preferences } = usePreferences()
    const [mixer, setMixer] = useState(null)
    const [operators, setOperators] = useState([])
    const [plants, setPlants] = useState([])
    const [mixers, setMixers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [showComments, setShowComments] = useState(false)
    const [showIssues, setShowIssues] = useState(false)
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [updatedByEmail, setUpdatedByEmail] = useState(null)
    const [message, setMessage] = useState('')
    const [showOperatorModal, setShowOperatorModal] = useState(false)
    const [canEditMixer, setCanEditMixer] = useState(false)
    const [canDeleteMixer, setCanDeleteMixer] = useState(false)
    const [originalValues, setOriginalValues] = useState({})
    const [truckNumber, setTruckNumber] = useState('')
    const [assignedOperator, setAssignedOperator] = useState('')
    const [assignedPlant, setAssignedPlant] = useState('')
    const [status, setStatus] = useState('')
    const [cleanlinessRating, setCleanlinessRating] = useState(0)
    const [lastServiceDate, setLastServiceDate] = useState(null)
    const [lastChipDate, setLastChipDate] = useState(null)
    const [vin, setVin] = useState('')
    const [make, setMake] = useState('')
    const [model, setModel] = useState('')
    const [year, setYear] = useState('')
    const [operatorModalOperators, setOperatorModalOperators] = useState([])
    const [lastUnassignedOperatorId, setLastUnassignedOperatorId] = useState(null)
    const [_comments, setComments] = useState([])
    const [_issues, setIssues] = useState([])
    const [regionPlantCodes, setRegionPlantCodes] = useState(new Set())
    const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false)
    const [missingFields, setMissingFields] = useState([])
    const [showPlantModal, setShowPlantModal] = useState(false)
    const [currentRegion, setCurrentRegion] = useState(null)
    const [shopStatus, setShopStatus] = useState(null)
    useEffect(() => {
        async function fetchData() {
            setIsLoading(true)
            try {
                const [mixerData, operatorsData, plantsData, allMixers] = await Promise.all([
                    MixerService.fetchMixerById(mixerId),
                    OperatorService.fetchOperators(),
                    PlantService.fetchPlants(),
                    MixerService.getAllMixers()
                ])
                setMixer(mixerData)
                setOperators(operatorsData)
                setPlants(plantsData)
                setMixers(allMixers)
                setTruckNumber(mixerData.truckNumber || '')
                setAssignedOperator(mixerData.assignedOperator || '')
                setAssignedPlant(mixerData.assignedPlant || '')
                setStatus(mixerData.status || '')
                setCleanlinessRating(mixerData.cleanlinessRating || 0)
                setLastServiceDate(
                    mixerData.lastServiceDate ? DateUtility.parseLocalDate(mixerData.lastServiceDate) : null
                )
                setLastChipDate(mixerData.lastChipDate ? DateUtility.parseLocalDate(mixerData.lastChipDate) : null)
                setVin((mixerData.vin || '').toUpperCase())
                setMake(mixerData.make || '')
                setModel(mixerData.model || '')
                setYear(mixerData.year || '')
                setShopStatus(mixerData.shopStatus || null)
                setOriginalValues({
                    assignedOperator: mixerData.assignedOperator || '',
                    assignedPlant: mixerData.assignedPlant || '',
                    cleanlinessRating: mixerData.cleanlinessRating || 0,
                    lastChipDate: mixerData.lastChipDate ? DateUtility.parseLocalDate(mixerData.lastChipDate) : null,
                    lastServiceDate: mixerData.lastServiceDate
                        ? DateUtility.parseLocalDate(mixerData.lastServiceDate)
                        : null,
                    make: mixerData.make || '',
                    model: mixerData.model || '',
                    shopStatus: mixerData.shopStatus || null,
                    status: mixerData.status || '',
                    truckNumber: mixerData.truckNumber || '',
                    vin: (mixerData.vin || '').toUpperCase(),
                    year: mixerData.year || ''
                })
                document.documentElement.style.setProperty('--rating-value', mixerData.cleanlinessRating || 0)
                if (mixerData.updatedBy) {
                    try {
                        const userName = await UserService.getUserDisplayName(mixerData.updatedBy)
                        setUpdatedByEmail(userName)
                    } catch {
                        setUpdatedByEmail('Unknown User')
                    }
                }
            } catch (error) {
            } finally {
                setIsLoading(false)
                setHasUnsavedChanges(false)
            }
        }
        fetchData()
    }, [mixerId])
    useEffect(() => {
        const checkDeletePermission = async () => {
            try {
                const currentUser = await UserService.getCurrentUser()
                const userId = currentUser?.id || currentUser
                if (userId) {
                    const hasPermission = await UserService.hasPermission(userId, 'detailview.delete')
                    setCanDeleteMixer(hasPermission)
                } else {
                    setCanDeleteMixer(false)
                }
            } catch (error) {
                setCanDeleteMixer(false)
            }
        }
        checkDeletePermission()
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
    const isCleanlinessBlocking = cleanlinessRating > 0 && cleanlinessRating < 3
    useEffect(() => {
        if (!originalValues.truckNumber || isLoading) return
        const formatDateForComparison = (date) => (date ? (date instanceof Date ? date.toISOString() : date) : '')
        const hasChanges =
            truckNumber !== originalValues.truckNumber ||
            assignedPlant !== originalValues.assignedPlant ||
            status !== originalValues.status ||
            cleanlinessRating !== originalValues.cleanlinessRating ||
            formatDateForComparison(lastServiceDate) !== formatDateForComparison(originalValues.lastServiceDate) ||
            formatDateForComparison(lastChipDate) !== formatDateForComparison(originalValues.lastChipDate) ||
            vin !== originalValues.vin ||
            make !== originalValues.make ||
            model !== originalValues.model ||
            year !== originalValues.year ||
            shopStatus !== originalValues.shopStatus
        setHasUnsavedChanges(hasChanges)
    }, [
        truckNumber,
        assignedPlant,
        status,
        cleanlinessRating,
        lastServiceDate,
        lastChipDate,
        vin,
        make,
        model,
        year,
        shopStatus,
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
    async function handleRegionTransfer(newRegionCode, newPlantCode) {
        if (!mixer?.id || !newRegionCode || !newPlantCode) {
            throw new Error('Invalid mixer, region, or plant')
        }
        const regionService = PlantService
        const newRegion = await regionService.fetchRegionByCode(newRegionCode)
        if (!newRegion) {
            throw new Error('Target region not found')
        }
        setIsSaving(true)
        setMessage('')
        try {
            const userObj = await UserService.getCurrentUser()
            const userId = typeof userObj === 'object' && userObj !== null ? userObj.id : userObj
            const updatedMixer = {
                ...mixer,
                assignedOperator: null,
                assignedPlant: newPlantCode
            }
            const result = await MixerService.updateMixer(mixer.id, updatedMixer, userId, mixer)
            setMixer(result)
            setAssignedPlant(newPlantCode)
            setAssignedOperator('')
            setOriginalValues({
                ...originalValues,
                assignedOperator: '',
                assignedPlant: newPlantCode
            })
            setHasUnsavedChanges(false)
            setMessage(`Successfully transferred to ${newRegion.regionName}`)
            setTimeout(() => setMessage(''), 3000)
        } catch (error) {
            console.error('Region transfer failed:', error)
            throw error
        } finally {
            setIsSaving(false)
        }
    }
    async function handleSave(overrideValues = {}) {
        if (!mixer?.id) {
            alert('Error: Cannot save mixer with undefined ID')
            return
        }
        const relevantOverrideKeys = Object.keys(overrideValues || {}).filter(
            (k) => !['silent', 'prevAssignedOperator'].includes(k)
        )
        if (!hasUnsavedChanges && relevantOverrideKeys.length === 0) {
            return
        }
        setIsSaving(true)
        try {
            let userObj = await UserService.getCurrentUser()
            let userId = typeof userObj === 'object' && userObj !== null ? userObj.id : userObj
            let assignedOperatorValue = Object.prototype.hasOwnProperty.call(overrideValues, 'assignedOperator')
                ? overrideValues.assignedOperator
                : assignedOperator
            let statusValue = Object.prototype.hasOwnProperty.call(overrideValues, 'status')
                ? overrideValues.status
                : status
            if (statusValue === 'In Shop' && originalValues.status !== 'In Shop') {
                const { data: openIssues } = await Database.from('mixers_maintenance')
                    .select('id')
                    .eq('mixer_id', mixer.id)
                    .is('time_completed', null)
                if (!openIssues || openIssues.length === 0) {
                    setIsSaving(false)
                    setMessage(
                        'Cannot change status to "In Shop" without having at least one open issue. Please add an issue first.'
                    )
                    setTimeout(() => setMessage(''), 5000)
                    return
                }
            }
            if (originalValues.status === 'Active' && statusValue !== 'Active' && assignedOperatorValue) {
                assignedOperatorValue = null
            }
            if (assignedOperatorValue && statusValue !== 'Active') {
                statusValue = 'Active'
            }
            if (
                (!assignedOperatorValue || assignedOperatorValue === '' || assignedOperatorValue === null) &&
                statusValue === 'Active'
            ) {
                statusValue = 'Spare'
            }
            let mixerForHistory = {
                ...mixer,
                assignedOperator: Object.prototype.hasOwnProperty.call(overrideValues, 'prevAssignedOperator')
                    ? overrideValues.prevAssignedOperator
                    : mixer.assignedOperator
            }
            let cleanlinessValue = overrideValues.cleanlinessRating ?? cleanlinessRating
            if (!cleanlinessValue || isNaN(cleanlinessValue) || cleanlinessValue < 1) cleanlinessValue = 1
            const finalShopStatus =
                statusValue === 'In Shop' ? (overrideValues.shopStatus ?? shopStatus ?? 'in_shop') : null
            const updatedMixer = {
                ...mixer,
                assignedOperator: assignedOperatorValue || null,
                assignedPlant: overrideValues.assignedPlant ?? assignedPlant,
                cleanlinessRating: cleanlinessValue,
                id: mixer.id,
                lastChipDate: DateUtility.toDbDate(overrideValues.lastChipDate ?? lastChipDate),
                lastServiceDate: DateUtility.toDbDate(overrideValues.lastServiceDate ?? lastServiceDate),
                make: overrideValues.make ?? make,
                model: overrideValues.model ?? model,
                shopStatus: finalShopStatus,
                status: statusValue,
                truckNumber: overrideValues.truckNumber ?? truckNumber,
                updatedAt: new Date().toISOString(),
                updatedBy: userId,
                updatedLast: mixer.updatedLast,
                vin: ((overrideValues.vin ?? vin) || '').toUpperCase(),
                year: overrideValues.year ?? year
            }
            await MixerService.updateMixer(updatedMixer.id, updatedMixer, undefined, mixerForHistory)
            if (mixerForHistory.assignedOperator !== updatedMixer.assignedOperator) {
                if (mixerForHistory.assignedOperator) {
                    await OperatorService.createHistoryEntry(
                        mixerForHistory.assignedOperator,
                        'assigned_mixer',
                        updatedMixer.truckNumber,
                        null,
                        userId
                    )
                }
                if (updatedMixer.assignedOperator) {
                    await OperatorService.createHistoryEntry(
                        updatedMixer.assignedOperator,
                        'assigned_mixer',
                        null,
                        updatedMixer.truckNumber,
                        userId
                    )
                }
            }
            setMixer(updatedMixer)
            if (!overrideValues.silent) {
                setMessage('Changes saved successfully! Mixer needs verification.')
                setTimeout(() => setMessage(''), 5000)
            }
            setOriginalValues({
                assignedOperator: updatedMixer.assignedOperator,
                assignedPlant: updatedMixer.assignedPlant,
                cleanlinessRating: updatedMixer.cleanlinessRating,
                lastChipDate: updatedMixer.lastChipDate ? DateUtility.parseLocalDate(updatedMixer.lastChipDate) : null,
                lastServiceDate: updatedMixer.lastServiceDate
                    ? DateUtility.parseLocalDate(updatedMixer.lastServiceDate)
                    : null,
                make: updatedMixer.make,
                model: updatedMixer.model,
                shopStatus: updatedMixer.shopStatus,
                status: updatedMixer.status,
                truckNumber: updatedMixer.truckNumber,
                vin: updatedMixer.vin,
                year: updatedMixer.year
            })
            setHasUnsavedChanges(false)
        } catch (error) {
            let errorMessage = 'Unknown error'
            if (error.message && typeof error.message === 'string') {
                if (error.message.includes('duplicate key') && error.message.includes('mixers_truck_number_key')) {
                    errorMessage = `This truck number already exists. Please use a different truck number.`
                } else {
                    errorMessage = error.message
                }
            }
            alert(`Error saving changes: ${errorMessage}`)
        } finally {
            setIsSaving(false)
        }
    }
    async function handleDelete() {
        if (!mixer) return
        if (!showDeleteConfirmation) return setShowDeleteConfirmation(true)
        try {
            await MixerService.deleteMixer(mixer.id)
            alert('Mixer deleted successfully')
            onClose()
        } catch (error) {
            alert('Error deleting mixer')
        } finally {
            setShowDeleteConfirmation(false)
        }
    }
    async function handleVerifyMixer(_skipIssueCheck = false) {
        if (status === 'Retired') {
            setMessage('Cannot verify: Retired mixers cannot be verified.')
            setTimeout(() => setMessage(''), 4000)
            return
        }
        const missing = []
        if (!mixer.vin || !ValidationUtility.isVIN(mixer.vin)) missing.push('VIN')
        if (!mixer.make) missing.push('Make')
        if (!mixer.model) missing.push('Model')
        if (!mixer.year) missing.push('Year')
        setMissingFields(missing)
        setShowMissingFieldsModal(true)
    }
    async function handleSaveMissingFields() {
        try {
            const needVin = !mixer.vin || !ValidationUtility.isVIN(mixer.vin)
            const needMake = !mixer.make
            const needModel = !mixer.model
            const needYear = !mixer.year
            const vinOk = needVin ? ValidationUtility.isVIN(vin) : true
            const makeOk = needMake ? !!String(make).trim() : true
            const modelOk = needModel ? !!String(model).trim() : true
            const yearOk = needYear ? !!String(year).trim() : true
            if (!(vinOk && makeOk && modelOk && yearOk)) {
                setMessage(
                    !vinOk
                        ? 'Invalid VIN. Please enter a valid 17-character VIN.'
                        : 'Please fill all required fields before verifying.'
                )
                setTimeout(() => setMessage(''), 4000)
                return
            }
            const overrides = { silent: true }
            if (vin && vin.trim()) overrides.vin = String(vin).trim().toUpperCase()
            if (make && make.trim()) overrides.make = String(make).trim()
            if (model && model.trim()) overrides.model = String(model).trim()
            if (year && year.trim()) overrides.year = String(year).trim()
            const parseDate = (d) => (d ? new Date(d) : null)
            const existingService = parseDate(mixer.lastServiceDate)
            const existingChip = parseDate(mixer.lastChipDate)
            const incomingService = lastServiceDate
                ? lastServiceDate instanceof Date
                    ? lastServiceDate
                    : new Date(lastServiceDate)
                : null
            const incomingChip = lastChipDate
                ? lastChipDate instanceof Date
                    ? lastChipDate
                    : new Date(lastChipDate)
                : null
            if (incomingService && (!existingService || existingService.getTime() !== incomingService.getTime()))
                overrides.lastServiceDate = incomingService
            if (incomingChip && (!existingChip || existingChip.getTime() !== incomingChip.getTime()))
                overrides.lastChipDate = incomingChip
            await handleSave(overrides)
            const candidateMixer = {
                ...mixer,
                lastChipDate: overrides.lastChipDate ?? mixer.lastChipDate,
                lastServiceDate: overrides.lastServiceDate ?? mixer.lastServiceDate,
                make: overrides.make ?? mixer.make,
                model: overrides.model ?? mixer.model,
                vin: overrides.vin ?? mixer.vin,
                year: overrides.year ?? mixer.year
            }
            const operatorName = getOperatorName(assignedOperator)
            if (
                status === 'Active' &&
                (assignedOperator === null ||
                    assignedOperator === undefined ||
                    assignedOperator === '0' ||
                    (assignedOperator && operatorName === 'Unknown'))
            ) {
                setMessage('Cannot verify: Assigned operator is missing or invalid.')
                setTimeout(() => setMessage(''), 4000)
                return
            }
            if (hasUnsavedChanges) {
                await handleSave().catch(() => {
                    alert('Failed to save your changes before verification. Please try saving manually first.')
                    throw new Error('Failed to save changes before verification')
                })
            }
            let userObj = await UserService.getCurrentUser()
            let userId = typeof userObj === 'object' && userObj !== null ? userObj.id : userObj
            const verified = await MixerService.verifyMixer(candidateMixer.id, userId)
            setMixer(verified)
            setMessage('Mixer verified successfully!')
            setTimeout(() => setMessage(''), 3000)
            setHasUnsavedChanges(false)
            setShowMissingFieldsModal(false)
            setMissingFields([])
            if (verified.updatedBy) {
                try {
                    const userName = await UserService.getUserDisplayName(verified.updatedBy)
                    setUpdatedByEmail(userName)
                } catch {
                    setUpdatedByEmail('Unknown User')
                }
            }
        } catch (error) {
            alert('Failed to save missing fields. Please try again.')
        }
    }
    async function handleBackClick() {
        if (hasUnsavedChanges) {
            await handleSave()
        }
        onClose()
    }
    function getOperatorName(operatorId) {
        if (!operatorId || operatorId === '0') return 'None'
        const operator = operators.find((op) => op.employeeId === operatorId)
        return operator ? (operator.position ? `${operator.name} (${operator.position})` : operator.name) : 'Unknown'
    }
    function formatDate(date) {
        if (!date) return ''
        return DateUtility.toLocalDateString(date)
    }
    async function fetchOperatorsForModal() {
        let dbOperators = await OperatorService.fetchOperators()
        if (lastUnassignedOperatorId) {
            const unassignedOperator = dbOperators.find((op) => op.employeeId === lastUnassignedOperatorId)
            if (unassignedOperator) {
                dbOperators = [...dbOperators, unassignedOperator]
            }
        }
        setOperatorModalOperators(dbOperators)
    }
    async function refreshOperators() {
        const updatedOperators = await OperatorService.fetchOperators()
        setOperators(updatedOperators)
    }
    useEffect(() => {
        async function fetchCommentsAndIssues() {
            if (!mixerId) return
            try {
                const [commentData, issueData] = await Promise.all([
                    MixerService.fetchComments(mixerId).catch(() => []),
                    MixerService.fetchIssues(mixerId).catch(() => [])
                ])
                const normalizedComments = Array.isArray(commentData)
                    ? commentData.map((c) => ({
                          author: c.author,
                          created_at: c.createdAt || c.created_at,
                          id: c.id,
                          text: c.text
                      }))
                    : []
                setComments(normalizedComments)
                setIssues(
                    Array.isArray(issueData) ? issueData.filter((i) => i && (i.issue || i.title || i.description)) : []
                )
            } catch {
                setComments([])
                setIssues([])
            }
        }
        fetchCommentsAndIssues()
    }, [mixerId])
    useEffect(() => {
        if (mixer?.assignedPlant) {
            PlantService.fetchRegionsByPlantCode(mixer.assignedPlant)
                .then((regions) => {
                    if (regions && regions.length > 0) {
                        setCurrentRegion(regions[0].regionCode)
                    } else {
                        setCurrentRegion(null)
                    }
                })
                .catch(() => setCurrentRegion(null))
        }
    }, [mixer?.assignedPlant])
    if (isLoading) {
        return null
    }
    if (!mixer) {
        return (
            <DetailViewSection
                title="Mixer Not Found"
                onClose={onClose}
                notFound={true}
                notFoundMessage="Mixer Not Found"
                notFoundDescription="Could not find the requested mixer. It may have been deleted."
            />
        )
    }
    const selectedPlantObj = plants.find((p) => (p.plantCode || p.plant_code) === assignedPlant)
    const plantDisplayText = assignedPlant
        ? `(${selectedPlantObj?.plantCode || selectedPlantObj?.plant_code || assignedPlant}) ${selectedPlantObj?.plantName || selectedPlantObj?.plant_name || ''}`
        : 'Select Plant'
    const verificationItems = [
        {
            icon: 'fas fa-calendar-check',
            iconStyle: {
                color: mixer.updatedLast
                    ? Mixer.ensureInstance(mixer).isVerified()
                        ? 'var(--success)'
                        : new Date(mixer.updatedAt) > new Date(mixer.updatedLast)
                          ? 'var(--error)'
                          : 'var(--warning)'
                    : 'var(--error)'
            },
            label: 'Verified',
            style: {
                color: mixer.updatedLast
                    ? Mixer.ensureInstance(mixer).isVerified()
                        ? 'var(--success)'
                        : new Date(mixer.updatedAt) > new Date(mixer.updatedLast)
                          ? 'var(--error)'
                          : 'var(--warning)'
                    : 'var(--error)'
            },
            value: mixer.updatedLast
                ? `${new Date(mixer.updatedLast).toLocaleString()}${!Mixer.ensureInstance(mixer).isVerified() ? (new Date(mixer.updatedAt) > new Date(mixer.updatedLast) ? ' (Changes have been made)' : ' (It is a new week)') : ''}`
                : 'Never verified',
            valueStyle: {
                color: mixer.updatedLast
                    ? Mixer.ensureInstance(mixer).isVerified()
                        ? 'inherit'
                        : new Date(mixer.updatedAt) > new Date(mixer.updatedLast)
                          ? 'var(--error)'
                          : 'var(--warning)'
                    : 'var(--error)'
            }
        },
        {
            icon: 'fas fa-user-check',
            iconStyle: {
                color: mixer.updatedBy ? 'var(--success)' : 'var(--error)'
            },
            label: 'Verified By',
            title: `Last Updated: ${new Date(mixer.updatedAt).toLocaleString()}`,
            value: mixer.updatedBy ? updatedByEmail || 'Unknown User' : 'No verification record',
            valueStyle: {
                color: mixer.updatedBy ? 'inherit' : 'var(--error)'
            }
        }
    ]
    return (
        <>
            {showHistory && <MixerHistoryView mixer={mixer} onClose={() => setShowHistory(false)} />}
            {showComments && (
                <MixerCommentModal
                    mixerId={mixerId}
                    mixerNumber={mixer?.truckNumber}
                    onClose={() => setShowComments(false)}
                />
            )}
            {showIssues && (
                <MixerIssueModal
                    mixerId={mixerId}
                    mixerNumber={mixer?.truckNumber}
                    onClose={() => setShowIssues(false)}
                />
            )}
            {showPlantModal && (
                <PlantDropdownModal
                    isOpen={showPlantModal}
                    onClose={() => setShowPlantModal(false)}
                    plants={filteredPlants}
                    onSelect={setAssignedPlant}
                    searchPlaceholder="Search plants..."
                />
            )}
            <DetailViewSection
                title={`Truck #${mixer.truckNumber || 'Not Assigned'}`}
                onClose={handleBackClick}
                isSaving={isSaving}
                message={message}
                itemAssignedPlant={mixer?.assignedPlant}
                onCanEditChange={setCanEditMixer}
                isLoading={false}
                showDeleteConfirmation={showDeleteConfirmation}
                onDeleteConfirm={handleDelete}
                onDeleteCancel={() => setShowDeleteConfirmation(false)}
                deleteTitle="Confirm Delete"
                deleteMessage={`Are you sure you want to delete Truck #${mixer.truckNumber}? This action cannot be undone.`}
                currentRegion={currentRegion}
                assetType="mixer"
                onRegionTransfer={handleRegionTransfer}
                headerActions={
                    <>
                        <button className="global-button-secondary" onClick={() => setShowIssues(true)}>
                            <i className="fas fa-tools"></i>
                            <span>Issues</span>
                        </button>
                        <button className="global-button-secondary" onClick={() => setShowComments(true)}>
                            <i className="fas fa-comments"></i>
                            <span>Comments</span>
                        </button>
                        <button className="global-button-secondary" onClick={() => setShowHistory(true)}>
                            <i className="fas fa-history"></i>
                            <span>History</span>
                        </button>
                    </>
                }
                footerActions={
                    canEditMixer && (
                        <>
                            <button
                                className="global-button-secondary"
                                onClick={handleSave}
                                disabled={isSaving}
                                style={{ flex: 1, justifyContent: 'center' }}
                            >
                                <i className="fas fa-save"></i>
                                <span>{isSaving ? 'Saving...' : 'Save'}</span>
                            </button>
                            {canDeleteMixer && (
                                <button
                                    className="global-button-secondary"
                                    onClick={() => setShowDeleteConfirmation(true)}
                                    disabled={isSaving}
                                    style={{ flex: 1, justifyContent: 'center' }}
                                >
                                    <i className="fas fa-trash-alt"></i>
                                    <span>Delete</span>
                                </button>
                            )}
                        </>
                    )
                }
                modals={
                    <>
                        {showOperatorModal && (
                            <OperatorSelectModal
                                isOpen={showOperatorModal}
                                onClose={() => setShowOperatorModal(false)}
                                onSelect={async (operatorId) => {
                                    const newOperator = operatorId === '0' ? '' : operatorId
                                    const newStatus = newOperator ? 'Active' : status
                                    setShowOperatorModal(false)
                                    if (newOperator) {
                                        try {
                                            await handleSave({
                                                assignedOperator: newOperator,
                                                status: newStatus
                                            })
                                            setAssignedOperator(newOperator)
                                            setStatus(newStatus)
                                            setLastUnassignedOperatorId(null)
                                            await refreshOperators()
                                            const updatedMixer = await MixerService.fetchMixerById(mixerId)
                                            setMixer(updatedMixer)
                                            setMessage('Operator assigned and status set to Active')
                                            setTimeout(() => setMessage(''), 3000)
                                            setHasUnsavedChanges(false)
                                        } catch (error) {
                                            setMessage('Error assigning operator. Please try again.')
                                            setTimeout(() => setMessage(''), 3000)
                                        }
                                    }
                                }}
                                currentValue={assignedOperator}
                                mixers={mixers}
                                assignedPlant={assignedPlant}
                                readOnly={!canEditMixer}
                                operators={operatorModalOperators}
                                onRefresh={async () => {
                                    await fetchOperatorsForModal()
                                }}
                            />
                        )}
                        {showMissingFieldsModal && (
                            <VerificationRequirementsModal
                                open={showMissingFieldsModal}
                                onClose={() => setShowMissingFieldsModal(false)}
                                missingFields={missingFields}
                                vin={vin}
                                make={make}
                                model={model}
                                year={year}
                                lastServiceDate={lastServiceDate}
                                lastChipDate={lastChipDate}
                                setVin={setVin}
                                setMake={setMake}
                                setModel={setModel}
                                setYear={setYear}
                                setLastServiceDate={setLastServiceDate}
                                setLastChipDate={setLastChipDate}
                                onSaveAndVerify={handleSaveMissingFields}
                                isServiceOverdue={AssetStatsUtility.isServiceOverdue}
                                assignedOperator={assignedOperator}
                                itemType="Mixer"
                                itemId={mixer?.id}
                                service={MixerService}
                                status={status}
                            />
                        )}
                    </>
                }
            >
                <DetailViewSection.Section id="basic" title="Basic Information" icon="fas fa-truck">
                    <DetailViewSection.Card title="Truck Details" icon="fas fa-info-circle">
                        <div className="form-group">
                            <label>Truck Number</label>
                            <input
                                type="text"
                                value={truckNumber}
                                onChange={(e) => setTruckNumber(e.target.value)}
                                className="form-control"
                                readOnly={!canEditMixer}
                            />
                        </div>
                        <div className="form-group">
                            <label>Status</label>
                            <select
                                value={status}
                                onChange={async (e) => {
                                    const newStatus = e.target.value
                                    if (isCleanlinessBlocking && newStatus === 'Active') {
                                        return
                                    }
                                    if (
                                        assignedOperator &&
                                        originalValues.status === 'Active' &&
                                        newStatus !== 'Active'
                                    ) {
                                        await handleSave({ assignedOperator: null, status: newStatus })
                                        setStatus(newStatus)
                                        setAssignedOperator(null)
                                        setLastUnassignedOperatorId(assignedOperator)
                                        setMessage('Status changed and operator unassigned')
                                        setTimeout(() => setMessage(''), 3000)
                                        await refreshOperators()
                                        await fetchOperatorsForModal()
                                        const updatedMixer = await MixerService.fetchMixerById(mixerId)
                                        setMixer(updatedMixer)
                                    } else {
                                        setStatus(newStatus)
                                    }
                                }}
                                disabled={!canEditMixer}
                                className="form-control"
                            >
                                <option value="">Select Status</option>
                                <option value="Active" disabled={isCleanlinessBlocking}>
                                    Active{isCleanlinessBlocking ? ' (Requires 3+ stars)' : ''}
                                </option>
                                <option value="Spare">Spare</option>
                                <option value="In Shop">In Shop</option>
                                <option value="Retired">Retired</option>
                            </select>
                            {isCleanlinessBlocking && (
                                <div
                                    style={{
                                        alignItems: 'center',
                                        background: 'var(--bg-hover)',
                                        borderRadius: '6px',
                                        color: 'var(--text-secondary)',
                                        display: 'flex',
                                        fontSize: '0.8125rem',
                                        gap: '0.5rem',
                                        marginTop: '0.5rem',
                                        padding: '0.5rem 0.75rem'
                                    }}
                                >
                                    <i className="fas fa-exclamation-triangle"></i>
                                    <span>Cleanliness must be 3+ stars to set Active status</span>
                                </div>
                            )}
                        </div>
                        {status === 'Spare' && (
                            <div className="spare-status-note">
                                If this truck is not runnable, it needs to be set as &quot;In Shop&quot; with the
                                appropriate shop status selected
                            </div>
                        )}
                        {status === 'In Shop' && (
                            <div className="down-in-yard-container">
                                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                    <label>Shop Status</label>
                                    <select
                                        className="form-control"
                                        value={shopStatus || 'in_shop'}
                                        onChange={(e) => {
                                            if (canEditMixer) {
                                                setShopStatus(e.target.value)
                                            }
                                        }}
                                        disabled={!canEditMixer}
                                        style={
                                            !canEditMixer
                                                ? {
                                                      backgroundColor: 'var(--card-bg)',
                                                      cursor: 'not-allowed',
                                                      opacity: 0.8
                                                  }
                                                : {}
                                        }
                                    >
                                        <option value="in_shop">In Shop</option>
                                        <option value="waiting_for_shop">Waiting For Shop</option>
                                        <option value="down_in_yard">Down In Yard</option>
                                        <option value="third_party">Third Party Work</option>
                                        <option value="ready_for_pickup">Ready For Pickup</option>
                                    </select>
                                </div>
                                <div
                                    className="down-in-yard-note"
                                    style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}
                                >
                                    {shopStatus === 'down_in_yard' &&
                                        'The shop has to come fix it where it is - it cannot move.'}
                                    {shopStatus === 'waiting_for_shop' && 'We need to move it to the shop for repairs.'}
                                    {shopStatus === 'third_party' && 'Being painted or at a third party shop.'}
                                    {shopStatus === 'ready_for_pickup' &&
                                        'Repairs complete — ready to be picked up from the shop.'}
                                    {(shopStatus === 'in_shop' || !shopStatus) &&
                                        'Currently at the shop being worked on.'}
                                </div>
                            </div>
                        )}
                    </DetailViewSection.Card>
                    <DetailViewSection.Card title="Assignment" icon="fas fa-user-tag">
                        <div className="form-group">
                            <label>Assigned Plant</label>
                            <button
                                className="operator-select-button form-control"
                                onClick={() => canEditMixer && setShowPlantModal(true)}
                                type="button"
                                disabled={!canEditMixer}
                                style={
                                    !canEditMixer
                                        ? {
                                              backgroundColor: 'var(--card-bg)',
                                              cursor: 'not-allowed',
                                              opacity: 0.8
                                          }
                                        : {}
                                }
                            >
                                <span
                                    style={{
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}
                                >
                                    {plantDisplayText}
                                </span>
                            </button>
                        </div>
                        <div className="form-group">
                            <label>Assigned Operator</label>
                            <div className="operator-select-container">
                                <button
                                    className="operator-select-button form-control"
                                    onClick={async () => {
                                        if (canEditMixer && !isCleanlinessBlocking) {
                                            await fetchOperatorsForModal()
                                            setShowOperatorModal(true)
                                        }
                                    }}
                                    type="button"
                                    disabled={!canEditMixer || isCleanlinessBlocking}
                                    style={
                                        !canEditMixer || isCleanlinessBlocking
                                            ? {
                                                  backgroundColor: 'var(--bg-secondary)',
                                                  cursor: 'not-allowed',
                                                  opacity: 0.8
                                              }
                                            : {}
                                    }
                                >
                                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {assignedOperator
                                            ? getOperatorName(assignedOperator)
                                            : 'None (Click to select)'}
                                    </span>
                                </button>
                                {canEditMixer &&
                                    (assignedOperator ? (
                                        <button
                                            className="unassign-operator-button"
                                            title="Unassign Operator"
                                            onClick={async () => {
                                                try {
                                                    const prevOperator = assignedOperator
                                                    await handleSave({
                                                        assignedOperator: null,
                                                        prevAssignedOperator: prevOperator,
                                                        status: 'Spare'
                                                    })
                                                    setAssignedOperator(null)
                                                    setStatus('Spare')
                                                    setLastUnassignedOperatorId(prevOperator)
                                                    await refreshOperators()
                                                    await fetchOperatorsForModal()
                                                    const updatedMixer = await MixerService.fetchMixerById(mixerId)
                                                    setMixer(updatedMixer)
                                                    setMessage('Operator unassigned and status set to Spare')
                                                    setTimeout(() => setMessage(''), 3000)
                                                    if (showOperatorModal) {
                                                        setShowOperatorModal(false)
                                                        setTimeout(() => {
                                                            setShowOperatorModal(true)
                                                        }, 0)
                                                    }
                                                } catch (error) {
                                                    setMessage('Error unassigning operator. Please try again.')
                                                    setTimeout(() => setMessage(''), 3000)
                                                }
                                            }}
                                            type="button"
                                        >
                                            Unassign Operator
                                        </button>
                                    ) : (
                                        lastUnassignedOperatorId && (
                                            <button
                                                className="undo-operator-button unassign-operator-button"
                                                title="Undo Unassign"
                                                onClick={async () => {
                                                    try {
                                                        await handleSave({
                                                            assignedOperator: lastUnassignedOperatorId,
                                                            status: 'Active'
                                                        })
                                                        setAssignedOperator(lastUnassignedOperatorId)
                                                        setStatus('Active')
                                                        setLastUnassignedOperatorId(null)
                                                        await refreshOperators()
                                                        await fetchOperatorsForModal()
                                                        const updatedMixer = await MixerService.fetchMixerById(mixerId)
                                                        setMixer(updatedMixer)
                                                        setMessage('Operator re-assigned and status set to Active')
                                                        setTimeout(() => setMessage(''), 3000)
                                                    } catch (error) {
                                                        setMessage('Error undoing unassign. Please try again.')
                                                        setTimeout(() => setMessage(''), 3000)
                                                    }
                                                }}
                                                type="button"
                                                style={{
                                                    backgroundColor: 'var(--success)',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    boxSizing: 'border-box',
                                                    color: 'var(--text-light)',
                                                    cursor: 'pointer',
                                                    fontSize: '1rem',
                                                    height: '38px',
                                                    marginLeft: '8px',
                                                    minWidth: '140px',
                                                    padding: '0 16px'
                                                }}
                                            >
                                                Undo
                                            </button>
                                        )
                                    ))}
                            </div>
                            {isCleanlinessBlocking && (
                                <div
                                    style={{
                                        alignItems: 'center',
                                        background: 'var(--bg-hover)',
                                        borderRadius: '6px',
                                        color: 'var(--text-secondary)',
                                        display: 'flex',
                                        fontSize: '0.8125rem',
                                        gap: '0.5rem',
                                        marginTop: '0.5rem',
                                        padding: '0.5rem 0.75rem'
                                    }}
                                >
                                    <i className="fas fa-exclamation-triangle"></i>
                                    <span>Cleanliness must be 3+ stars to assign an operator</span>
                                </div>
                            )}
                        </div>
                    </DetailViewSection.Card>
                    <DetailViewSection.Card title="Vehicle Information" icon="fas fa-car">
                        <div className="form-group">
                            <label>VIN</label>
                            <input
                                type="text"
                                value={vin}
                                placeholder="VIN (no I, O, Q)"
                                onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[IOQ]/g, ''))}
                                className="form-control"
                                readOnly={!canEditMixer}
                            />
                        </div>
                        <div className="form-row-2">
                            <div className="form-group">
                                <label>Make</label>
                                <input
                                    type="text"
                                    value={make}
                                    onChange={(e) => setMake(e.target.value)}
                                    className="form-control"
                                    readOnly={!canEditMixer}
                                />
                            </div>
                            <div className="form-group">
                                <label>Model</label>
                                <input
                                    type="text"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="form-control"
                                    readOnly={!canEditMixer}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Year</label>
                            <input
                                type="text"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                className="form-control"
                                readOnly={!canEditMixer}
                            />
                        </div>
                    </DetailViewSection.Card>
                </DetailViewSection.Section>
                <DetailViewSection.Section id="maintenance" title="Maintenance" icon="fas fa-wrench">
                    <DetailViewSection.Card title="Service Information" icon="fas fa-calendar-alt">
                        <div className="form-group">
                            <label>Last Service Date</label>
                            <input
                                type="date"
                                value={lastServiceDate ? formatDate(lastServiceDate) : ''}
                                onChange={(e) =>
                                    setLastServiceDate(
                                        e.target.value ? DateUtility.parseLocalDate(e.target.value) : null
                                    )
                                }
                                className="form-control"
                                readOnly={!canEditMixer}
                            />
                            {lastServiceDate && AssetStatsUtility.isServiceOverdue(lastServiceDate) && (
                                <div className="warning-text">Service overdue</div>
                            )}
                            <div
                                style={{
                                    color: 'var(--text-secondary)',
                                    fontSize: '11px',
                                    lineHeight: '1.4',
                                    marginTop: '4px'
                                }}
                            >
                                Service will show as overdue if it has been more than 6 months since last serviced.
                                Service is determined by hours on the asset - check hours of service.
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Last Chip Date</label>
                            <input
                                type="date"
                                value={lastChipDate ? formatDate(lastChipDate) : ''}
                                onChange={(e) =>
                                    setLastChipDate(e.target.value ? DateUtility.parseLocalDate(e.target.value) : null)
                                }
                                className="form-control"
                                readOnly={!canEditMixer}
                            />
                            {lastChipDate && AssetStatsUtility.isServiceOverdue(lastChipDate, 90) && (
                                <div className="warning-text">Chip overdue</div>
                            )}
                        </div>
                    </DetailViewSection.Card>
                    <DetailViewSection.Card title="Cleanliness Rating" icon="fas fa-broom">
                        <div className="form-group">
                            <label>Cleanliness Rating</label>
                            <div className="cleanliness-rating-editor">
                                <div className="star-input">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            className={`star-button ${star <= cleanlinessRating ? 'active' : ''} ${!canEditMixer ? 'disabled' : ''}`}
                                            onClick={() =>
                                                canEditMixer &&
                                                setCleanlinessRating(star === cleanlinessRating ? 0 : star)
                                            }
                                            aria-label={`Rate ${star} of 5 stars`}
                                            disabled={!canEditMixer}
                                        >
                                            <i
                                                className={`fas fa-star ${star <= cleanlinessRating ? 'filled' : ''}`}
                                                style={star <= cleanlinessRating ? { color: '#f59e0b' } : {}}
                                            ></i>
                                        </button>
                                    ))}
                                </div>
                                {cleanlinessRating > 0 && (
                                    <div className="rating-value-display">
                                        <span className="rating-label">
                                            {
                                                [null, 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][
                                                    cleanlinessRating
                                                ]
                                            }
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </DetailViewSection.Card>
                </DetailViewSection.Section>
                <DetailViewSection.Section id="verification" title="Verification" icon="fas fa-clipboard-check">
                    <DetailViewSection.Card>
                        <VerificationCardSection
                            isVerified={Mixer.ensureInstance(mixer).isVerified()}
                            verificationLabel={
                                !mixer.updatedLast || !mixer.updatedBy ? 'Needs Verification' : 'Verification Outdated'
                            }
                            verificationItems={verificationItems}
                            onVerify={handleVerifyMixer}
                            canEdit={canEditMixer}
                            lastVerifiedDate={mixer.updatedLast}
                            lastChangedDate={mixer.updatedAt}
                            assetId={mixerId}
                            assetType="mixer"
                        />
                    </DetailViewSection.Card>
                </DetailViewSection.Section>
            </DetailViewSection>
        </>
    )
}
export default MixerDetailView
