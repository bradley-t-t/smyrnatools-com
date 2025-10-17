import React, {useEffect, useMemo, useState} from 'react';
import {TractorService} from '../../../services/TractorService';
import {PlantService} from '../../../services/PlantService';
import {OperatorService} from '../../../services/OperatorService';
import {UserService} from '../../../services/UserService';
import TractorHistoryView from './TractorHistoryView';
import TractorCommentModal from './TractorCommentModal';
import TractorIssueModal from './TractorIssueModal';
import {TractorUtility} from "../../../utils/TractorUtility";
import {Tractor} from "../../../models/tractors/Tractor";
import OperatorSelectModal from "../mixers/OperatorSelectModal";
import {usePreferences} from '../../../app/context/PreferencesContext';
import {RegionService} from '../../../services/RegionService';
import {ValidationUtility} from '../../../utils/ValidationUtility';
import PlantDropdownModal from '../../common/PlantDropdownModal';
import ThemeUtility from '../../../utils/ThemeUtility';
import VerificationRequirementsModal from "../../common/VerificationRequirementsModal";
import DetailViewSection from "../../sections/DetailViewSection";
import VerificationCardSection from "../../sections/VerificationCardSection";
import './styles/Tractors.css';

function TractorDetailView({tractorId, onClose}) {
    const {preferences} = usePreferences()
    const [tractor, setTractor] = useState(null);
    const [operators, setOperators] = useState([]);
    const [plants, setPlants] = useState([]);
    const [tractors, setTractors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [showIssues, setShowIssues] = useState(false);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [updatedByEmail, setUpdatedByEmail] = useState(null);
    const [message, setMessage] = useState('');
    const [showOperatorModal, setShowOperatorModal] = useState(false);
    const [canEditTractor, setCanEditTractor] = useState(false);
    const [originalValues, setOriginalValues] = useState({});
    const [truckNumber, setTruckNumber] = useState('');
    const [assignedOperator, setAssignedOperator] = useState('');
    const [assignedPlant, setAssignedPlant] = useState('');
    const [status, setStatus] = useState('');
    const [cleanlinessRating, setCleanlinessRating] = useState(0);
    const [lastServiceDate, setLastServiceDate] = useState(null);
    const [hasBlower, setHasBlower] = useState(false);
    const [vin, setVin] = useState('');
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [freight, setFreight] = useState('');
    const [operatorModalOperators, setOperatorModalOperators] = useState([]);
    const [lastUnassignedOperatorId, setLastUnassignedOperatorId] = useState(null);
    const [_comments, setComments] = useState([]);
    const [_issues, setIssues] = useState([]);
    const [regionPlantCodes, setRegionPlantCodes] = useState(new Set())
    const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false);
    const [missingFields, setMissingFields] = useState([]);
    const [showPlantModal, setShowPlantModal] = useState(false);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const [tractorData, operatorsData, plantsData, allTractors] = await Promise.all([
                    TractorService.fetchTractorById(tractorId),
                    OperatorService.fetchOperators(),
                    PlantService.fetchPlants(),
                    TractorService.getAllTractors()
                ]);
                setTractor(tractorData);
                setOperators(operatorsData);
                setPlants(plantsData);
                setTractors(allTractors);
                setTruckNumber(tractorData.truckNumber || '');
                setAssignedOperator(tractorData.assignedOperator || '');
                setAssignedPlant(tractorData.assignedPlant || '');
                setStatus(tractorData.status || '');
                setCleanlinessRating(tractorData.cleanlinessRating || 0);
                setLastServiceDate(tractorData.lastServiceDate ? new Date(tractorData.lastServiceDate) : null);
                setHasBlower(tractorData.hasBlower || false);
                setVin((tractorData.vin || '').toUpperCase());
                setMake(tractorData.make || '');
                setModel(tractorData.model || '');
                setYear(String(tractorData.year || ''));
                setFreight(tractorData.freight || '');
                setOriginalValues({
                    truckNumber: tractorData.truckNumber || '',
                    assignedOperator: tractorData.assignedOperator || '',
                    assignedPlant: tractorData.assignedPlant || '',
                    status: tractorData.status || '',
                    cleanlinessRating: tractorData.cleanlinessRating || 0,
                    lastServiceDate: tractorData.lastServiceDate ? new Date(tractorData.lastServiceDate) : null,
                    hasBlower: tractorData.hasBlower || false,
                    vin: (tractorData.vin || '').toUpperCase(),
                    make: tractorData.make || '',
                    model: tractorData.model || '',
                    year: String(tractorData.year || ''),
                    freight: tractorData.freight || ''
                });
                document.documentElement.style.setProperty('--rating-value', tractorData.cleanlinessRating || 0);
                if (tractorData.updatedBy) {
                    try {
                        const userName = await UserService.getUserDisplayName(tractorData.updatedBy);
                        setUpdatedByEmail(userName);
                    } catch {
                        setUpdatedByEmail('Unknown User');
                    }
                }
            } catch (error) {
            } finally {
                setIsLoading(false);
                setHasUnsavedChanges(false);
            }
        }

        fetchData();
    }, [tractorId]);

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
        if (!originalValues.truckNumber || isLoading) return;
        const formatDateForComparison = date => date ? (date instanceof Date ? date.toISOString().split('T')[0] : '') : '';
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
            freight !== originalValues.freight;
        setHasUnsavedChanges(hasChanges);
    }, [truckNumber, assignedPlant, status, cleanlinessRating, lastServiceDate, hasBlower, vin, make, model, year, freight, originalValues, isLoading]);

    useEffect(() => {
        const handleBeforeUnload = e => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    async function handleSave(overrideValues = {}) {
        if (!tractor?.id) {
            alert('Error: Cannot save tractor with undefined ID');
            return;
        }
        setIsSaving(true);
        try {
            let userObj = await UserService.getCurrentUser();
            let userId = typeof userObj === 'object' && userObj !== null ? userObj.id : userObj;
            const formatDate = date => {
                if (!date) return null;
                const parsedDate = date instanceof Date ? date : new Date(date);
                if (isNaN(parsedDate.getTime())) return null;
                return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')} ${String(parsedDate.getHours()).padStart(2, '0')}:${String(parsedDate.getMinutes()).padStart(2, '0')}:${String(parsedDate.getSeconds()).padStart(2, '0')}+00`;
            };
            let assignedOperatorValue = Object.prototype.hasOwnProperty.call(overrideValues, 'assignedOperator') ? overrideValues.assignedOperator : assignedOperator;
            let statusValue = Object.prototype.hasOwnProperty.call(overrideValues, 'status') ? overrideValues.status : status;
            if ((!assignedOperatorValue || assignedOperatorValue === '' || assignedOperatorValue === null) && statusValue === 'Active') statusValue = 'Spare';
            if (assignedOperatorValue && statusValue !== 'Active') statusValue = 'Active';
            if (['In Shop', 'Retired', 'Spare'].includes(statusValue) && assignedOperatorValue) assignedOperatorValue = null;
            let tractorForHistory = {
                ...tractor,
                assignedOperator: Object.prototype.hasOwnProperty.call(overrideValues, 'prevAssignedOperator') ? overrideValues.prevAssignedOperator : tractor.assignedOperator
            };
            let cleanlinessValue = overrideValues.cleanlinessRating ?? cleanlinessRating;
            if (!cleanlinessValue || isNaN(cleanlinessValue) || cleanlinessValue < 1) cleanlinessValue = 1;
            const updatedTractor = {
                ...tractor,
                id: tractor.id,
                truckNumber: overrideValues.truckNumber ?? truckNumber,
                assignedOperator: assignedOperatorValue || null,
                assignedPlant: overrideValues.assignedPlant ?? assignedPlant,
                status: statusValue,
                cleanlinessRating: cleanlinessValue,
                lastServiceDate: formatDate(overrideValues.lastServiceDate ?? lastServiceDate),
                hasBlower: overrideValues.hasBlower ?? hasBlower,
                vin: ((overrideValues.vin ?? vin) || '').toUpperCase(),
                make: overrideValues.make ?? make,
                model: overrideValues.model ?? model,
                year: (() => {
                    const y = overrideValues.year ?? year;
                    const n = Number(y);
                    return Number.isFinite(n) && n > 0 ? n : null;
                })(),
                freight: overrideValues.freight ?? freight,
                updatedAt: new Date().toISOString(),
                updatedBy: userId,
                updatedLast: tractor.updatedLast
            };
            await TractorService.updateTractor(updatedTractor.id, updatedTractor, undefined, tractorForHistory);
            if (tractorForHistory.assignedOperator !== updatedTractor.assignedOperator) {
                if (tractorForHistory.assignedOperator) {
                    await OperatorService.createHistoryEntry(tractorForHistory.assignedOperator, "assigned_tractor", updatedTractor.truckNumber, null, userId)
                }
                if (updatedTractor.assignedOperator) {
                    await OperatorService.createHistoryEntry(updatedTractor.assignedOperator, "assigned_tractor", null, updatedTractor.truckNumber, userId)
                }
            }
            const refreshedTractor = await TractorService.fetchTractorById(tractor.id);
            setTractor(refreshedTractor);
            if (!overrideValues.silent) {
                setMessage('Changes saved successfully! Tractor needs verification.');
                setTimeout(() => setMessage(''), 5000);
            }
            setOriginalValues({
                truckNumber: refreshedTractor.truckNumber,
                assignedOperator: refreshedTractor.assignedOperator,
                assignedPlant: refreshedTractor.assignedPlant,
                status: refreshedTractor.status,
                cleanlinessRating: refreshedTractor.cleanlinessRating,
                lastServiceDate: refreshedTractor.lastServiceDate ? new Date(refreshedTractor.lastServiceDate) : null,
                hasBlower: refreshedTractor.hasBlower,
                vin: (refreshedTractor.vin || '').toUpperCase(),
                make: refreshedTractor.make,
                model: refreshedTractor.model,
                year: String(refreshedTractor.year || ''),
                freight: refreshedTractor.freight || ''
            });
            setVin((refreshedTractor.vin || '').toUpperCase());
            setYear(String(refreshedTractor.year || ''))
            setHasUnsavedChanges(false);
        } catch (error) {
            alert(`Error saving changes: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete() {
        if (!tractor) return;
        if (!showDeleteConfirmation) return setShowDeleteConfirmation(true);
        try {
            await TractorService.deleteTractor(tractor.id);
            alert('Tractor deleted successfully');
            onClose();
        } catch (error) {
            alert('Error deleting tractor');
        } finally {
            setShowDeleteConfirmation(false);
        }
    }

    async function handleVerifyTractor() {
        if (status === 'Retired') {
            setMessage('Cannot verify: Retired tractors cannot be verified.')
            setTimeout(() => setMessage(''), 4000)
            return
        }
        const vinValid = !!vin && ValidationUtility.isVIN(vin)

        if (!vinValid || !make || !model || !year) {
            let missing = [];
            if (!vinValid) missing.push('VIN');
            if (!make) missing.push('Make');
            if (!model) missing.push('Model');
            if (!year) missing.push('Year');
            setMissingFields(missing);
            setShowMissingFieldsModal(true);
            return;
        }
        if (lastServiceDate && TractorUtility.isServiceOverdue(lastServiceDate)) {
            setMissingFields([]);
            setShowMissingFieldsModal(true);
            return;
        }
        const operatorName = getOperatorName(assignedOperator)

        if (status === 'Active' && (assignedOperator === null || assignedOperator === undefined || assignedOperator === '0' || (assignedOperator && operatorName === 'Unknown'))) {
            setMessage('Cannot verify: Assigned operator is missing or invalid.');
            setTimeout(() => setMessage(''), 4000);
            return;
        }

        setIsSaving(true)
        try {
            if (hasUnsavedChanges) {
                await handleSave().catch(() => {
                    alert('Failed to save your changes before verification. Please try saving manually first.');
                    throw new Error('Failed to save changes before verification')
                })
            }
            let userObj = await UserService.getCurrentUser();
            let userId = typeof userObj === 'object' && userObj !== null ? userObj.id : userObj;
            const updated = await TractorService.verifyTractor(tractor.id, userId);
            if (updated) {
                setTractor(updated);
                setMessage('Tractor verified successfully!');
                setTimeout(() => setMessage(''), 3000);
                if (updated.updatedBy) {
                    try {
                        const userName = await UserService.getUserDisplayName(updated.updatedBy);
                        setUpdatedByEmail(userName);
                    } catch {
                        setUpdatedByEmail('Unknown User');
                    }
                }
            }
            setHasUnsavedChanges(false);
        } catch (error) {
            alert(`Error verifying tractor: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSaveMissingFields() {
        const needVin = !tractor.vin || !ValidationUtility.isVIN(tractor.vin)
        const needMake = !tractor.make
        const needModel = !tractor.model
        const needYear = !tractor.year
        const vinOk = needVin ? ValidationUtility.isVIN(vin) : true
        const makeOk = needMake ? !!String(make).trim() : true
        const modelOk = needModel ? !!String(model).trim() : true
        const yearOk = needYear ? !!String(year).trim() : true
        if (!(vinOk && makeOk && modelOk && yearOk)) {
            setMessage(!vinOk ? 'Invalid VIN. Please enter a valid 17-character VIN.' : 'Please fill all required fields before verifying.');
            setTimeout(() => setMessage(''), 4000);
            return
        }
        const overrides = {silent: true}
        if (needVin) overrides.vin = String(vin).trim().toUpperCase()
        if (needMake) overrides.make = String(make).trim()
        if (needModel) overrides.model = String(model).trim()
        if (needYear) overrides.year = String(year).trim()
        const parseDate = d => d ? new Date(d) : null
        const existingService = parseDate(tractor.lastServiceDate)
        const incomingService = lastServiceDate ? (lastServiceDate instanceof Date ? lastServiceDate : new Date(lastServiceDate)) : null
        if (incomingService && (!existingService || existingService.getTime() !== incomingService.getTime())) overrides.lastServiceDate = incomingService
        await handleSave(overrides)
        const refreshed = await TractorService.fetchTractorById(tractorId)
        setTractor(refreshed)
        setVin((refreshed.vin || '').toUpperCase())
        setYear(String(refreshed.year || ''))
        setShowMissingFieldsModal(false)
        await handleVerifyTractor()
    }

    function handleBackClick() {
        if (hasUnsavedChanges) {
            handleSave()
        }
        onClose()
    }

    function getOperatorName(operatorId) {
        if (!operatorId || operatorId === '0') return 'None';
        const operator = operators.find(op => op.employeeId === operatorId);
        return operator ? (operator.position ? `${operator.name} (${operator.position})` : operator.name) : 'Unknown';
    }

    function getPlantName(plantCode) {
        const plant = plants.find(p => p.plantCode === plantCode);
        return plant ? plant.plantName : plantCode;
    }

    function formatDate(date) {
        if (!date) return '';
        return date instanceof Date ? date.toISOString().split('T')[0] : date;
    }

    async function fetchOperatorsForModal() {
        let dbOperators = await OperatorService.fetchOperators();
        if (lastUnassignedOperatorId) {
            const unassignedOperator = dbOperators.find(op => op.employeeId === lastUnassignedOperatorId);
            if (unassignedOperator) {
                dbOperators = [...dbOperators, unassignedOperator];
            }
        }
        setOperatorModalOperators(dbOperators);
    }

    async function refreshOperators() {
        const updatedOperators = await OperatorService.fetchOperators();
        setOperators(updatedOperators);
    }

    useEffect(() => {
        async function fetchCommentsAndIssues() {
            if (!tractorId) return
            try {
                const [commentData, issueData] = await Promise.all([
                    TractorService.fetchComments(tractorId),
                    TractorService.fetchIssues(tractorId)
                ])
                setComments(Array.isArray(commentData) ? commentData.filter(c => c && (c.comment || c.text)) : [])
                setIssues(Array.isArray(issueData) ? issueData.filter(i => i && (i.issue || i.title || i.description)) : [])
            } catch (e) {
            }
        }

        fetchCommentsAndIssues()
    }, [tractorId]);

    if (isLoading) {
        return null
    }

    if (!tractor) {
        return (
            <DetailViewSection
                title="Tractor Not Found"
                onClose={onClose}
                notFound={true}
                notFoundMessage="Tractor Not Found"
                notFoundDescription="Could not find the requested tractor. It may have been deleted."
            />
        )
    }

    const verificationItems = [
        {
            icon: 'fas fa-calendar-plus',
            label: 'Created',
            value: tractor.createdAt ? new Date(tractor.createdAt).toLocaleString() : 'Not Assigned'
        },
        {
            icon: 'fas fa-calendar-check',
            label: 'Last Verified',
            value: tractor.updatedLast
                ? `${new Date(tractor.updatedLast).toLocaleString()}${!Tractor.ensureInstance(tractor).isVerified() ? (new Date(tractor.updatedAt) > new Date(tractor.updatedLast) ? ' (Changes have been made)' : ' (It is a new week)') : ''}`
                : 'Never verified',
            iconStyle: {
                color: tractor.updatedLast
                    ? (Tractor.ensureInstance(tractor).isVerified() ? 'var(--success)' : new Date(tractor.updatedAt) > new Date(tractor.updatedLast) ? 'var(--error)' : 'var(--warning)')
                    : 'var(--error)'
            },
            valueStyle: {
                color: tractor.updatedLast
                    ? (Tractor.ensureInstance(tractor).isVerified() ? 'inherit' : new Date(tractor.updatedAt) > new Date(tractor.updatedLast) ? 'var(--error)' : 'var(--warning)')
                    : 'var(--error)'
            }
        },
        {
            icon: 'fas fa-user-check',
            label: 'Verified By',
            value: tractor.updatedBy ? (updatedByEmail || 'Unknown User') : 'No verification record',
            title: `Last Updated: ${new Date(tractor.updatedAt).toLocaleString()}`,
            iconStyle: {
                color: tractor.updatedBy ? 'var(--success)' : 'var(--error)'
            },
            valueStyle: {
                color: tractor.updatedBy ? 'inherit' : 'var(--error)'
            }
        }
    ]

    return (
        <>
            {showHistory && <TractorHistoryView tractor={tractor} onClose={() => setShowHistory(false)}/>}
            {showComments && <TractorCommentModal tractorId={tractorId} tractorNumber={tractor?.truckNumber}
                                                  onClose={() => setShowComments(false)}/>}
            {showIssues && <TractorIssueModal tractorId={tractorId} tractorNumber={tractor?.truckNumber}
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
                title={`Truck #${tractor.truckNumber || 'Not Assigned'}`}
                onClose={handleBackClick}
                isSaving={isSaving}
                message={message}
                itemAssignedPlant={tractor?.assignedPlant}
                onCanEditChange={setCanEditTractor}
                isLoading={false}
                showDeleteConfirmation={showDeleteConfirmation}
                onDeleteConfirm={handleDelete}
                onDeleteCancel={() => setShowDeleteConfirmation(false)}
                deleteTitle="Confirm Delete"
                deleteMessage={`Are you sure you want to delete Truck #${tractor.truckNumber}? This action cannot be undone.`}
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
                        isVerified={Tractor.ensureInstance(tractor).isVerified()}
                        verificationLabel={!tractor.updatedLast || !tractor.updatedBy ? 'Needs Verification' : 'Verification Outdated'}
                        verificationItems={verificationItems}
                        onVerify={handleVerifyTractor}
                        canEdit={canEditTractor}
                        noticeText='Assets require verification after any changes are made and are reset weekly. <strong>Due: Every Friday at 10:00 AM.</strong> Resets on Mondays at 5pm.'
                    />
                }
                footerActions={
                    canEditTractor && (
                        <>
                            <button className="primary-button save-button" onClick={handleSave}
                                    disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
                            <button className="danger-button" onClick={() => setShowDeleteConfirmation(true)}
                                    disabled={isSaving}>Delete Tractor
                            </button>
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
                                            const updatedTractor = await TractorService.fetchTractorById(tractorId)
                                            setTractor(updatedTractor)
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
                                tractors={tractors}
                                assignedPlant={assignedPlant}
                                readOnly={!canEditTractor}
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
                                setVin={setVin}
                                setMake={setMake}
                                setModel={setModel}
                                setYear={setYear}
                                setLastServiceDate={setLastServiceDate}
                                onSaveAndVerify={handleSaveMissingFields}
                                isServiceOverdue={TractorUtility.isServiceOverdue}
                            />
                        )}
                    </>
                }
            >
                <div className="detail-card">
                    <div className="card-header">
                        <h2>Tractor Information</h2>
                    </div>
                    <p className="edit-instructions">{canEditTractor ? 'You can make changes below. Remember to save your changes.' : 'You are in read-only mode and cannot make changes to this tractor.'}</p>
                    <div className="form-sections">
                        <div className="form-section basic-info">
                            <h3>Basic Information</h3>
                            <div className="form-group">
                                <label>Truck Number</label>
                                <input type="text" value={truckNumber} onChange={e => setTruckNumber(e.target.value)}
                                       className="form-control" readOnly={!canEditTractor}/>
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    value={status}
                                    onChange={async e => {
                                        const newStatus = e.target.value
                                        if (assignedOperator && originalValues.status === 'Active' && ['In Shop', 'Retired', 'Spare'].includes(newStatus)) {
                                            await handleSave({
                                                status: newStatus,
                                                assignedOperator: null
                                            })
                                            setStatus(newStatus)
                                            setAssignedOperator(null)
                                            setLastUnassignedOperatorId(assignedOperator)
                                            setMessage('Status changed and operator unassigned')
                                            setTimeout(() => setMessage(''), 3000)
                                            await refreshOperators()
                                            await fetchOperatorsForModal()
                                            const updatedTractor = await TractorService.fetchTractorById(tractorId)
                                            setTractor(updatedTractor)
                                        } else {
                                            setStatus(newStatus)
                                        }
                                    }}
                                    disabled={!canEditTractor}
                                    className="form-control"
                                >
                                    <option value="">Select Status</option>
                                    <option value="Active"
                                            disabled={!assignedOperator}>Active{!assignedOperator ? ' (Cannot set without an operator assigned)' : ''}</option>
                                    <option value="Spare">Spare</option>
                                    <option value="In Shop">In Shop</option>
                                    <option value="Retired">Retired</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Assigned Plant</label>
                                <button className="operator-select-button form-control"
                                        onClick={() => canEditTractor && setShowPlantModal(true)} type="button"
                                        disabled={!canEditTractor} style={!canEditTractor ? {
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
                                            if (canEditTractor) {
                                                await fetchOperatorsForModal()
                                                setShowOperatorModal(true)
                                            }
                                        }}
                                        type="button"
                                        disabled={!canEditTractor}
                                        style={!canEditTractor ? {
                                            cursor: 'not-allowed',
                                            opacity: 0.8,
                                            backgroundColor: 'var(--bg-secondary)'
                                        } : {}}
                                    >
                                        <span style={{display: 'block', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                            {assignedOperator ? getOperatorName(assignedOperator) : 'None (Click to select)'}
                                        </span>
                                    </button>
                                    {canEditTractor && (
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
                                                        const updatedTractor = await TractorService.fetchTractorById(tractorId)
                                                        setTractor(updatedTractor)
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
                                                            const updatedTractor = await TractorService.fetchTractorById(tractorId)
                                                            setTractor(updatedTractor)
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
                            <div className="form-group">
                                <label>Freight</label>
                                <select value={freight} onChange={e => setFreight(e.target.value)}
                                        disabled={!canEditTractor} className="form-control">
                                    <option value="">Select Freight</option>
                                    <option value="Cement">Cement</option>
                                    <option value="Aggregate">Aggregate</option>
                                    <option value="Dump Truck">Dump Truck</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-section maintenance-info">
                            <h3>Maintenance Information</h3>
                            <div className="form-group">
                                <label>Last Service Date</label>
                                <input type="date" value={lastServiceDate ? formatDate(lastServiceDate) : ''}
                                       onChange={e => setLastServiceDate(e.target.value ? new Date(e.target.value) : null)}
                                       className="form-control" readOnly={!canEditTractor}/>
                                {lastServiceDate && TractorUtility.isServiceOverdue(lastServiceDate) &&
                                    <div className="warning-text">Service overdue</div>}
                            </div>
                            <div className="form-group">
                                <label>Has Blower</label>
                                <select value={hasBlower ? 'Yes' : 'No'}
                                        onChange={e => setHasBlower(e.target.value === 'Yes')}
                                        disabled={!canEditTractor} className="form-control">
                                    <option value="No">No</option>
                                    <option value="Yes">Yes</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Cleanliness Rating</label>
                                <div className="cleanliness-rating-editor">
                                    <div className="star-input">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button key={star} type="button"
                                                    className={`star-button ${star <= cleanlinessRating ? 'active' : ''} ${!canEditTractor ? 'disabled' : ''}`}
                                                    onClick={() => canEditTractor && setCleanlinessRating(star === cleanlinessRating ? 0 : star)}
                                                    aria-label={`Rate ${star} of 5 stars`} disabled={!canEditTractor}>
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
                                <input type="text" value={vin}
                                       onChange={e => setVin(e.target.value.toUpperCase().replace(/[IOQ]/g, ''))}
                                       className="form-control" readOnly={!canEditTractor}/>
                            </div>
                            <div className="form-group">
                                <label>Make</label>
                                <input type="text" value={make} onChange={e => setMake(e.target.value)}
                                       className="form-control" readOnly={!canEditTractor}/>
                            </div>
                            <div className="form-group">
                                <label>Model</label>
                                <input type="text" value={model} onChange={e => setModel(e.target.value)}
                                       className="form-control" readOnly={!canEditTractor}/>
                            </div>
                            <div className="form-group">
                                <label>Year</label>
                                <input type="text" value={year} onChange={e => setYear(e.target.value)}
                                       className="form-control" readOnly={!canEditTractor}/>
                            </div>
                        </div>
                    </div>
                </div>
            </DetailViewSection>
        </>
    )
}

export default TractorDetailView;

