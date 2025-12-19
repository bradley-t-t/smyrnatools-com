import React, {useEffect, useMemo, useState} from 'react'
import {MixerService} from '../../services/MixerService'
import {PlantService} from '../../services/PlantService'
import {OperatorService} from '../../services/OperatorService'
import {UserService} from '../../services/UserService'
import {usePreferences} from '../../app/context/PreferencesContext'
import MixerHistoryView from './MixerHistoryView'
import MixerCommentModal from './MixerCommentModal'
import MixerIssueModal from './MixerIssueModal'
import OperatorSelectModal from './OperatorSelectModal'
import MixerUtility from '../../utils/MixerUtility'
import {Mixer} from "../../models/mixers/Mixer"
import {RegionService} from '../../services/RegionService'
import {ValidationUtility} from '../../utils/ValidationUtility'
import PlantDropdownModal from '../../components/common/PlantDropdownModal'
import ThemeUtility from '../../utils/ThemeUtility'
import VerificationRequirementsModal from "../../components/common/VerificationRequirementsModal"
import DetailViewSection from "../../components/sections/DetailViewSection"
import VerificationCardSection from "../../components/sections/VerificationCardSection"
import {DateUtility} from "../../utils/DateUtility"
import {supabase} from '../../services/DatabaseService'

function MixerDetailView({mixerId, onClose}) {
    const {preferences} = usePreferences()
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
    const [downInYard, setDownInYard] = useState(false)

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
                setLastServiceDate(mixerData.lastServiceDate ? DateUtility.parseLocalDate(mixerData.lastServiceDate) : null)
                setLastChipDate(mixerData.lastChipDate ? DateUtility.parseLocalDate(mixerData.lastChipDate) : null)
                setVin((mixerData.vin || '').toUpperCase())
                setMake(mixerData.make || '')
                setModel(mixerData.model || '')
                setYear(mixerData.year || '')
                setDownInYard(mixerData.downInYard || false)
                setOriginalValues({
                    truckNumber: mixerData.truckNumber || '',
                    assignedOperator: mixerData.assignedOperator || '',
                    assignedPlant: mixerData.assignedPlant || '',
                    status: mixerData.status || '',
                    cleanlinessRating: mixerData.cleanlinessRating || 0,
                    lastServiceDate: mixerData.lastServiceDate ? DateUtility.parseLocalDate(mixerData.lastServiceDate) : null,
                    lastChipDate: mixerData.lastChipDate ? DateUtility.parseLocalDate(mixerData.lastChipDate) : null,
                    vin: (mixerData.vin || '').toUpperCase(),
                    make: mixerData.make || '',
                    model: mixerData.model || '',
                    year: mixerData.year || '',
                    downInYard: mixerData.downInYard || false
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
                const currentUser = await UserService.getCurrentUser();
                const userId = currentUser?.id || currentUser;
                if (userId) {
                    const hasPermission = await UserService.hasPermission(userId, 'detailview.delete');
                    setCanDeleteMixer(hasPermission);
                } else {
                    setCanDeleteMixer(false);
                }
            } catch (error) {
                setCanDeleteMixer(false);
            }
        };
        checkDeletePermission();
    }, []);

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

    useEffect(() => {
        if (!originalValues.truckNumber || isLoading) return
        const formatDateForComparison = date => date ? (date instanceof Date ? date.toISOString() : date) : ''
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
            downInYard !== originalValues.downInYard
        setHasUnsavedChanges(hasChanges)
    }, [truckNumber, assignedPlant, status, cleanlinessRating, lastServiceDate, lastChipDate, vin, make, model, year, downInYard, originalValues, isLoading])

    useEffect(() => {
        const handleBeforeUnload = e => {
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

        const regionService = RegionService
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
                assignedPlant: newPlantCode,
                assignedOperator: null
            }

            const result = await MixerService.updateMixer(mixer.id, updatedMixer, userId, mixer)
            setMixer(result)
            setAssignedPlant(newPlantCode)
            setAssignedOperator('')
            setOriginalValues({
                ...originalValues,
                assignedPlant: newPlantCode,
                assignedOperator: ''
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

        const relevantOverrideKeys = Object.keys(overrideValues || {}).filter(k => !['silent', 'prevAssignedOperator'].includes(k))
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
                const {data: openIssues} = await supabase
                    .from('mixers_maintenance')
                    .select('id')
                    .eq('mixer_id', mixer.id)
                    .is('time_completed', null)

                if (!openIssues || openIssues.length === 0) {
                    setIsSaving(false)
                    setMessage('Cannot change status to "In Shop" without having at least one open issue. Please add an issue first.')
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
            if ((!assignedOperatorValue || assignedOperatorValue === '' || assignedOperatorValue === null) && statusValue === 'Active') {
                statusValue = 'Spare'
            }
            let mixerForHistory = {
                ...mixer,
                assignedOperator: Object.prototype.hasOwnProperty.call(overrideValues, 'prevAssignedOperator')
                    ? overrideValues.prevAssignedOperator
                    : mixer.assignedOperator
            }

            let cleanlinessValue = overrideValues.cleanlinessRating ?? cleanlinessRating;
            if (!cleanlinessValue || isNaN(cleanlinessValue) || cleanlinessValue < 1) cleanlinessValue = 1;

            const finalDownInYard = statusValue === 'In Shop' ? (overrideValues.downInYard ?? downInYard) : false;

            const updatedMixer = {
                ...mixer,
                id: mixer.id,
                truckNumber: overrideValues.truckNumber ?? truckNumber,
                assignedOperator: assignedOperatorValue || null,
                assignedPlant: overrideValues.assignedPlant ?? assignedPlant,
                status: statusValue,
                cleanlinessRating: cleanlinessValue,
                lastServiceDate: DateUtility.toDbDate(overrideValues.lastServiceDate ?? lastServiceDate),
                lastChipDate: DateUtility.toDbDate(overrideValues.lastChipDate ?? lastChipDate),
                vin: ((overrideValues.vin ?? vin) || '').toUpperCase(),
                make: overrideValues.make ?? make,
                model: overrideValues.model ?? model,
                year: overrideValues.year ?? year,
                downInYard: finalDownInYard,
                updatedAt: new Date().toISOString(),
                updatedBy: userId,
                updatedLast: mixer.updatedLast
            }
            await MixerService.updateMixer(
                updatedMixer.id,
                updatedMixer,
                undefined,
                mixerForHistory
            )
            if (mixerForHistory.assignedOperator !== updatedMixer.assignedOperator) {
                if (mixerForHistory.assignedOperator) {
                    await OperatorService.createHistoryEntry(mixerForHistory.assignedOperator, "assigned_mixer", updatedMixer.truckNumber, null, userId)
                }
                if (updatedMixer.assignedOperator) {
                    await OperatorService.createHistoryEntry(updatedMixer.assignedOperator, "assigned_mixer", null, updatedMixer.truckNumber, userId)
                }
            }
            setMixer(updatedMixer)
            if (!overrideValues.silent) {
                setMessage('Changes saved successfully! Mixer needs verification.')
                setTimeout(() => setMessage(''), 5000)
            }
            setOriginalValues({
                truckNumber: updatedMixer.truckNumber,
                assignedOperator: updatedMixer.assignedOperator,
                assignedPlant: updatedMixer.assignedPlant,
                status: updatedMixer.status,
                cleanlinessRating: updatedMixer.cleanlinessRating,
                lastServiceDate: updatedMixer.lastServiceDate ? DateUtility.parseLocalDate(updatedMixer.lastServiceDate) : null,
                lastChipDate: updatedMixer.lastChipDate ? DateUtility.parseLocalDate(updatedMixer.lastChipDate) : null,
                vin: updatedMixer.vin,
                make: updatedMixer.make,
                model: updatedMixer.model,
                year: updatedMixer.year,
                downInYard: updatedMixer.downInYard
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

    async function handleVerifyMixer(skipIssueCheck = false) {
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
                setMessage(!vinOk ? 'Invalid VIN. Please enter a valid 17-character VIN.' : 'Please fill all required fields before verifying.')
                setTimeout(() => setMessage(''), 4000)
                return
            }
            const overrides = {silent: true}
            if (vin && vin.trim()) overrides.vin = String(vin).trim().toUpperCase()
            if (make && make.trim()) overrides.make = String(make).trim()
            if (model && model.trim()) overrides.model = String(model).trim()
            if (year && year.trim()) overrides.year = String(year).trim()
            const parseDate = d => d ? new Date(d) : null
            const existingService = parseDate(mixer.lastServiceDate)
            const existingChip = parseDate(mixer.lastChipDate)
            const incomingService = lastServiceDate ? (lastServiceDate instanceof Date ? lastServiceDate : new Date(lastServiceDate)) : null
            const incomingChip = lastChipDate ? (lastChipDate instanceof Date ? lastChipDate : new Date(lastChipDate)) : null
            if (incomingService && (!existingService || existingService.getTime() !== incomingService.getTime())) overrides.lastServiceDate = incomingService
            if (incomingChip && (!existingChip || existingChip.getTime() !== incomingChip.getTime())) overrides.lastChipDate = incomingChip
            await handleSave(overrides)
            const candidateMixer = {
                ...mixer,
                vin: overrides.vin ?? mixer.vin,
                make: overrides.make ?? mixer.make,
                model: overrides.model ?? mixer.model,
                year: overrides.year ?? mixer.year,
                lastServiceDate: overrides.lastServiceDate ?? mixer.lastServiceDate,
                lastChipDate: overrides.lastChipDate ?? mixer.lastChipDate
            }
            const operatorName = getOperatorName(assignedOperator)
            if (
                status === 'Active' &&
                (
                    assignedOperator === null ||
                    assignedOperator === undefined ||
                    assignedOperator === '0' ||
                    (assignedOperator && operatorName === 'Unknown')
                )
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
        const operator = operators.find(op => op.employeeId === operatorId)
        return operator ? (operator.position ? `${operator.name} (${operator.position})` : operator.name) : 'Unknown'
    }

    function formatDate(date) {
        if (!date) return ''
        return DateUtility.toLocalDateString(date)
    }

    async function fetchOperatorsForModal() {
        let dbOperators = await OperatorService.fetchOperators()
        if (lastUnassignedOperatorId) {
            const unassignedOperator = dbOperators.find(op => op.employeeId === lastUnassignedOperatorId)
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
                const normalizedComments = Array.isArray(commentData) ? commentData.map(c => ({
                    id: c.id,
                    author: c.author,
                    text: c.text,
                    created_at: c.createdAt || c.created_at
                })) : []
                setComments(normalizedComments)
                setIssues(Array.isArray(issueData) ? issueData.filter(i => i && (i.issue || i.title || i.description)) : [])
            } catch {
                setComments([])
                setIssues([])
            }
        }

        fetchCommentsAndIssues()
    }, [mixerId])

    useEffect(() => {
        if (mixer?.assignedPlant) {
            RegionService.fetchRegionsByPlantCode(mixer.assignedPlant)
                .then(regions => {
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

    const selectedPlantObj = plants.find(p => (p.plantCode || p.plant_code) === assignedPlant);
    const plantDisplayText = assignedPlant ? `(${selectedPlantObj?.plantCode || selectedPlantObj?.plant_code || assignedPlant}) ${selectedPlantObj?.plantName || selectedPlantObj?.plant_name || ''}` : 'Select Plant';

    const verificationItems = [
        {
            icon: 'fas fa-calendar-plus',
            label: 'Created',
            value: mixer.createdAt ? new Date(mixer.createdAt).toLocaleString() : 'Not Assigned'
        },
        {
            icon: 'fas fa-calendar-check',
            label: 'Last Verified',
            value: mixer.updatedLast
                ? `${new Date(mixer.updatedLast).toLocaleString()}${!Mixer.ensureInstance(mixer).isVerified() ? (new Date(mixer.updatedAt) > new Date(mixer.updatedLast) ? ' (Changes have been made)' : ' (It is a new week)') : ''}`
                : 'Never verified',
            style: {
                color: mixer.updatedLast
                    ? (Mixer.ensureInstance(mixer).isVerified() ? 'var(--success)' : new Date(mixer.updatedAt) > new Date(mixer.updatedLast) ? 'var(--error)' : 'var(--warning)')
                    : 'var(--error)'
            },
            iconStyle: {
                color: mixer.updatedLast
                    ? (Mixer.ensureInstance(mixer).isVerified() ? 'var(--success)' : new Date(mixer.updatedAt) > new Date(mixer.updatedLast) ? 'var(--error)' : 'var(--warning)')
                    : 'var(--error)'
            },
            valueStyle: {
                color: mixer.updatedLast
                    ? (Mixer.ensureInstance(mixer).isVerified() ? 'inherit' : new Date(mixer.updatedAt) > new Date(mixer.updatedLast) ? 'var(--error)' : 'var(--warning)')
                    : 'var(--error)'
            }
        },
        {
            icon: 'fas fa-user-check',
            label: 'Verified By',
            value: mixer.updatedBy ? (updatedByEmail || 'Unknown User') : 'No verification record',
            title: `Last Updated: ${new Date(mixer.updatedAt).toLocaleString()}`,
            iconStyle: {
                color: mixer.updatedBy ? 'var(--success)' : 'var(--error)'
            },
            valueStyle: {
                color: mixer.updatedBy ? 'inherit' : 'var(--error)'
            }
        }
    ]

    return (
        <>
            {showHistory && <MixerHistoryView mixer={mixer} onClose={() => setShowHistory(false)}/>}
            {showComments && <MixerCommentModal mixerId={mixerId} mixerNumber={mixer?.truckNumber}
                                                onClose={() => setShowComments(false)}/>}
            {showIssues && <MixerIssueModal mixerId={mixerId} mixerNumber={mixer?.truckNumber}
                                            onClose={() => setShowIssues(false)}/>}
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
                }
                verificationCard={
                    <VerificationCardSection
                        isVerified={Mixer.ensureInstance(mixer).isVerified()}
                        verificationLabel={!mixer.updatedLast || !mixer.updatedBy ? 'Needs Verification' : 'Verification Outdated'}
                        verificationItems={verificationItems}
                        onVerify={handleVerifyMixer}
                        canEdit={canEditMixer}
                        noticeText='Assets require verification after any changes are made and are reset weekly. <strong>Due: Every Friday at 10:00 AM.</strong> Resets on Mondays at 5pm.'
                    />
                }
                footerActions={
                    canEditMixer && (
                        <>
                            <button className="primary-button save-button" onClick={handleSave}
                                    disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
                            {canDeleteMixer && (
                                <button className="danger-button" onClick={() => setShowDeleteConfirmation(true)}
                                        disabled={isSaving}>Delete Mixer
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
                                onSelect={async operatorId => {
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
                                isServiceOverdue={MixerUtility.isServiceOverdue}
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
                <div className="detail-card">
                    <div className="card-header">
                        <h2>Mixer Information</h2>
                    </div>
                    <p className="edit-instructions">{canEditMixer ? 'You can make changes below. Remember to save your changes.' : 'You are in read-only mode and cannot make changes to this mixer.'}</p>
                    <div className="form-sections">
                        <div className="form-section basic-info">
                            <h3>Basic Information</h3>
                            <div className="form-group">
                                <label>Truck Number</label>
                                <input type="text" value={truckNumber} onChange={e => setTruckNumber(e.target.value)}
                                       className="form-control" readOnly={!canEditMixer}/>
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    value={status}
                                    onChange={async e => {
                                        const newStatus = e.target.value
                                        if (assignedOperator && originalValues.status === 'Active' && newStatus !== 'Active') {
                                            await handleSave({status: newStatus, assignedOperator: null})
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
                                    <option value="Active">Active</option>
                                    <option value="Spare">Spare</option>
                                    <option value="In Shop">In Shop</option>
                                    <option value="Retired">Retired</option>
                                </select>
                            </div>
                            {status === 'Spare' && (
                                <div className="spare-status-note">
                                    If this truck is not runnable, it needs to be set as &quot;In Shop&quot; with down
                                    toggled, not as a spare
                                </div>
                            )}
                            {status === 'In Shop' && (
                                <div className="down-in-yard-container">
                                    <div className="down-in-yard-toggle">
                                        <label className={`toggle-label ${!canEditMixer ? 'disabled' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={downInYard}
                                                onChange={(e) => {
                                                    if (canEditMixer) {
                                                        setDownInYard(e.target.checked);
                                                    }
                                                }}
                                                disabled={!canEditMixer}
                                                className="toggle-checkbox"
                                            />
                                            <span className="toggle-switch">
                                                <span className="toggle-slider"></span>
                                            </span>
                                            <span className="toggle-text">In Yard</span>
                                        </label>
                                    </div>
                                    <div className="down-in-yard-note">
                                        Trucks that are down in the yard need to have this toggled on, but also need
                                        say &quot;In Shop&quot; as the status
                                    </div>
                                </div>
                            )}
                            <div className="form-group">
                                <label>Assigned Plant</label>
                                <button className="operator-select-button form-control"
                                        onClick={() => canEditMixer && setShowPlantModal(true)} type="button"
                                        disabled={!canEditMixer} style={!canEditMixer ? {
                                    cursor: 'not-allowed',
                                    opacity: 0.8,
                                    backgroundColor: 'var(--card-bg)'
                                } : {}}>
                                    <span style={{
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>{plantDisplayText}</span>
                                </button>
                            </div>
                            <div className="form-group">
                                <label>Assigned Operator</label>
                                <div className="operator-select-container">
                                    <button
                                        className="operator-select-button form-control"
                                        onClick={async () => {
                                            if (canEditMixer) {
                                                await fetchOperatorsForModal()
                                                setShowOperatorModal(true)
                                            }
                                        }}
                                        type="button"
                                        disabled={!canEditMixer}
                                        style={!canEditMixer ? {
                                            cursor: 'not-allowed',
                                            opacity: 0.8,
                                            backgroundColor: 'var(--bg-secondary)'
                                        } : {}}
                                    >
                                        <span style={{display: 'block', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                            {assignedOperator ? getOperatorName(assignedOperator) : 'None (Click to select)'}
                                        </span>
                                    </button>
                                    {canEditMixer && (
                                        assignedOperator ? (
                                            <button
                                                className="unassign-operator-button"
                                                title="Unassign Operator"
                                                onClick={async () => {
                                                    try {
                                                        const prevOperator = assignedOperator
                                                        await handleSave({
                                                            assignedOperator: null,
                                                            status: 'Spare',
                                                            prevAssignedOperator: prevOperator
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
                                                        color: 'var(--text-light)',
                                                        marginLeft: '8px',
                                                        height: '38px',
                                                        minWidth: '140px',
                                                        fontSize: '1rem',
                                                        borderRadius: '4px',
                                                        border: 'none',
                                                        padding: '0 16px',
                                                        cursor: 'pointer',
                                                        boxSizing: 'border-box'
                                                    }}
                                                >
                                                    Undo
                                                </button>
                                            )
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="form-section maintenance-info">
                            <h3>Maintenance Information</h3>
                            <div className="form-group">
                                <label>Last Service Date</label>
                                <input type="date" value={lastServiceDate ? formatDate(lastServiceDate) : ''}
                                       onChange={e => setLastServiceDate(e.target.value ? DateUtility.parseLocalDate(e.target.value) : null)}
                                       className="form-control" readOnly={!canEditMixer}/>
                                {lastServiceDate && MixerUtility.isServiceOverdue(lastServiceDate) &&
                                    <div className="warning-text">Service overdue</div>}
                            </div>
                            <div className="form-group">
                                <label>Last Chip Date</label>
                                <input type="date" value={lastChipDate ? formatDate(lastChipDate) : ''}
                                       onChange={e => setLastChipDate(e.target.value ? DateUtility.parseLocalDate(e.target.value) : null)}
                                       className="form-control" readOnly={!canEditMixer}/>
                                {lastChipDate && MixerUtility.isChipOverdue(lastChipDate) &&
                                    <div className="warning-text">Chip overdue</div>}
                            </div>
                            <div className="form-group">
                                <label>Cleanliness Rating</label>
                                <div className="cleanliness-rating-editor">
                                    <div className="star-input">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button key={star} type="button"
                                                    className={`star-button ${star <= cleanlinessRating ? 'active' : ''} ${!canEditMixer ? 'disabled' : ''}`}
                                                    onClick={() => canEditMixer && setCleanlinessRating(star === cleanlinessRating ? 0 : star)}
                                                    aria-label={`Rate ${star} of 5 stars`} disabled={!canEditMixer}>
                                                <i className={`fas fa-star ${star <= cleanlinessRating ? 'filled' : ''}`}
                                                   style={star <= cleanlinessRating ? {color: ThemeUtility.getAccentColor(ThemeUtility.getOtherAccentColor(preferences.accentColor))} : {}}></i>
                                            </button>
                                        ))}
                                    </div>
                                    {cleanlinessRating > 0 && (
                                        <div className="rating-value-display">
                                            <span
                                                className="rating-label">{[null, 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][cleanlinessRating]}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="form-sections">
                        <div className="form-section vehicle-info">
                            <h3>Asset Details</h3>
                            <div className="form-group">
                                <label>VIN</label>
                                <input type="text" value={vin} placeholder="VIN (no I, O, Q)"
                                       onChange={e => setVin(e.target.value.toUpperCase().replace(/[IOQ]/g, ''))}
                                       className="form-control" readOnly={!canEditMixer}/>
                            </div>
                            <div className="form-group">
                                <label>Make</label>
                                <input type="text" value={make} onChange={e => setMake(e.target.value)}
                                       className="form-control" readOnly={!canEditMixer}/>
                            </div>
                            <div className="form-group">
                                <label>Model</label>
                                <input type="text" value={model} onChange={e => setModel(e.target.value)}
                                       className="form-control" readOnly={!canEditMixer}/>
                            </div>
                            <div className="form-group">
                                <label>Year</label>
                                <input type="text" value={year} onChange={e => setYear(e.target.value)}
                                       className="form-control" readOnly={!canEditMixer}/>
                            </div>
                        </div>
                    </div>
                </div>
            </DetailViewSection>
        </>
    )
}

export default MixerDetailView
