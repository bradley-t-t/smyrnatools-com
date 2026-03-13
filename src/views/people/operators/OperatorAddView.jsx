import React, { useEffect, useState } from 'react'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import AddViewSection from '../../../app/components/sections/AddViewSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { OperatorService } from '../../../services/OperatorService'
import { RegionService } from '../../../services/RegionService'
import { UserService } from '../../../services/UserService'
import UserUtility from '../../../utils/UserUtility'
/**
 * Slide-in form for creating a new operator record. Supports name, phone,
 * plant assignment (region-scoped), status (with permission-gated Training/
 * Pending Start options), position, trainer assignment, and CDL automatic
 * restriction. Warns on duplicate operator names before saving.
 *
 * @param {Object[]} plants - Available plant records for the plant picker.
 * @param {Object[]} [operators] - Existing operators used for duplicate-name detection.
 * @param {Function} onClose - Callback to dismiss the add view.
 * @param {Function} onOperatorAdded - Callback with the newly created operator record.
 * @param {Set<string>} [allowedPlantCodes] - Region-scoped plant codes to restrict the picker.
 */
function OperatorAddView({ plants, operators = [], onClose, onOperatorAdded, allowedPlantCodes }) {
    const { preferences } = usePreferences()
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [assignedPlant, setAssignedPlant] = useState('')
    const [status, setStatus] = useState('Active')
    const [position, setPosition] = useState('')
    const [isTrainer, setIsTrainer] = useState(false)
    const [assignedTrainer, setAssignedTrainer] = useState('0')
    const [pendingStartDate, setPendingStartDate] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const [hasTrainingPermission, setHasTrainingPermission] = useState(false)
    const [regionPlantCodes, setRegionPlantCodes] = useState(null)
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false)
    const [automaticRestriction, setAutomaticRestriction] = useState(false)
    useEffect(() => {
        if (allowedPlantCodes && allowedPlantCodes.size > 0) {
            if (assignedPlant && !allowedPlantCodes.has(String(assignedPlant).trim().toUpperCase())) {
                setAssignedPlant('')
            }
        }
    }, [allowedPlantCodes, assignedPlant])
    useEffect(() => {
        async function checkPermission() {
            const userId = sessionStorage.getItem('userId')
            if (userId) {
                const hasPermission = await UserService.hasPermission(userId, 'operators.training')
                setHasTrainingPermission(hasPermission)
            }
        }
        checkPermission()
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
                const codes = new Set(regionPlants.map((p) => p.plantCode))
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
    const filteredPlants = plants
        .filter((p) => {
            const code = String(p.plantCode || '')
                .trim()
                .toUpperCase()
            return regionPlantCodes && regionPlantCodes.size > 0 ? regionPlantCodes.has(code) : false
        })
        .sort((a, b) => {
            const aCode = parseInt(a.plantCode?.replace(/\D/g, '') || '0')
            const bCode = parseInt(b.plantCode?.replace(/\D/g, '') || '0')
            return aCode - bCode
        })
    const selectedPlantObj = filteredPlants.find((p) => p.plantCode === assignedPlant)
    const plantDisplayText = assignedPlant
        ? `(${selectedPlantObj?.plantCode}) ${selectedPlantObj?.plantName}`
        : 'Select Plant'
    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!name) {
            setError('Name is required')
            return
        }
        if (!assignedPlant) {
            setError('Plant is required')
            return
        }
        if (!hasTrainingPermission && ['Training', 'Pending Start'].includes(status)) {
            setError('You do not have permission to assign this status.')
            return
        }
        const normalizedNewName = name.trim().toLowerCase()
        const hasDuplicate =
            Array.isArray(operators) &&
            operators.some((o) => (o?.name || '').trim().toLowerCase() === normalizedNewName)
        if (hasDuplicate) {
            const proceed = window.confirm(`An operator named "${name.trim()}" already exists. Create anyway?`)
            if (!proceed) return
        }
        setIsSaving(true)
        try {
            let userId = sessionStorage.getItem('userId')
            if (!UserUtility.isValidUUID(userId)) throw new Error('Invalid or missing User ID. Please log in again.')
            const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
            const normalizedPending =
                status === 'Pending Start' && pendingStartDate ? pendingStartDate.slice(0, 10) : null
            const newOperator = {
                assigned_trainer:
                    ['Training', 'Pending Start'].includes(status) && !isTrainer
                        ? UserUtility.safeUUID(assignedTrainer)
                        : null,
                automatic_restriction: automaticRestriction,
                created_at: now,
                employee_id: UserUtility.generateUUID(),
                is_trainer: isTrainer,
                name: name.trim(),
                pending_start_date: normalizedPending,
                phone: phone || null,
                plant_code: assignedPlant,
                position: position || null,
                smyrna_id: null,
                status,
                updated_at: now,
                updated_by: userId
            }
            const savedOperator = await OperatorService.createOperator(newOperator)
            if (savedOperator) {
                onOperatorAdded(savedOperator)
                onClose()
            } else {
                throw new Error('Failed to add operator - no data returned from server')
            }
        } catch (error) {
            setError(`Failed to add operator: ${error.message || 'Unknown error. Check console for details.'}`)
        } finally {
            setIsSaving(false)
        }
    }
    return (
        <>
            <AddViewSection title="Add New Operator" onClose={onClose} error={error}>
                <form onSubmit={handleSubmit}>
                    <div className="form-section">
                        <div className="form-section-title">
                            <i className="fas fa-user"></i>
                            <span>Basic Information</span>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="name">Name*</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter full name"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">Phone</label>
                                <input
                                    id="phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="(555) 555-5555"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="form-section">
                        <div className="form-section-title">
                            <i className="fas fa-building"></i>
                            <span>Assignment & Status</span>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="assignedPlant">Assigned Plant*</label>
                                <button
                                    type="button"
                                    onClick={() => setIsPlantModalOpen(true)}
                                    aria-label="Select assigned plant"
                                >
                                    {plantDisplayText}
                                </button>
                            </div>
                            <div className="form-group">
                                <label htmlFor="status">Status</label>
                                <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                                    <option value="Active">Active</option>
                                    <option value="Light Duty">Light Duty</option>
                                    <option value="Terminated">Terminated</option>
                                    {hasTrainingPermission && <option value="Pending Start">Pending Start</option>}
                                    {hasTrainingPermission && <option value="Training">Training</option>}
                                    <option value="No Hire">No Hire</option>
                                </select>
                            </div>
                        </div>
                        {status === 'Pending Start' && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="pendingStartDate">Pending Start Date</label>
                                    <input
                                        id="pendingStartDate"
                                        type="date"
                                        value={pendingStartDate}
                                        onChange={(e) => setPendingStartDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="form-section">
                        <div className="form-section-title">
                            <i className="fas fa-briefcase"></i>
                            <span>Position & Training</span>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="position">Position</label>
                                <select id="position" value={position} onChange={(e) => setPosition(e.target.value)}>
                                    <option value="">Select Position</option>
                                    <option value="Mixer Operator">Mixer Operator</option>
                                    <option value="Tractor Operator">Tractor Operator</option>
                                </select>
                            </div>
                            {hasTrainingPermission && (
                                <div className="form-group">
                                    <label htmlFor="isTrainer">Trainer Status</label>
                                    <select
                                        id="isTrainer"
                                        value={isTrainer ? 'true' : 'false'}
                                        onChange={(e) => {
                                            const isTrainerValue = e.target.value === 'true'
                                            setIsTrainer(isTrainerValue)
                                            if (isTrainerValue) {
                                                setAssignedTrainer('0')
                                            }
                                        }}
                                    >
                                        <option value="false">Not a Trainer</option>
                                        <option value="true">Trainer</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        {hasTrainingPermission && (status === 'Training' || status === 'Pending Start') && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="assignedTrainer">Assigned Trainer</label>
                                    <select
                                        id="assignedTrainer"
                                        value={assignedTrainer}
                                        onChange={(e) => setAssignedTrainer(e.target.value)}
                                        disabled={isTrainer}
                                        style={{ opacity: isTrainer ? 0.5 : 1 }}
                                    >
                                        <option value="0">None</option>
                                        {operators
                                            .filter((operator) => operator.isTrainer)
                                            .map((trainer) => (
                                                <option key={trainer.employeeId} value={trainer.employeeId}>
                                                    {trainer.name}
                                                </option>
                                            ))}
                                    </select>
                                    {operators.filter((op) => op.isTrainer).length === 0 && (
                                        <span className="form-warning">No trainers available</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="form-section">
                        <div className="form-section-title">
                            <i className="fas fa-car"></i>
                            <span>CDL Restrictions</span>
                        </div>
                        <div className="form-group">
                            <label className="form-checkbox">
                                <input
                                    type="checkbox"
                                    checked={automaticRestriction}
                                    onChange={(e) => setAutomaticRestriction(e.target.checked)}
                                />
                                <span>Automatic Only</span>
                            </label>
                            <span className="form-hint">
                                Enable if the operator has a CDL restriction for automatic transmission only
                            </span>
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" disabled={isSaving}>
                            {isSaving ? 'Adding...' : 'Add Operator'}
                        </button>
                    </div>
                </form>
            </AddViewSection>
            {isPlantModalOpen && (
                <PlantDropdownModal
                    isOpen={isPlantModalOpen}
                    onClose={() => setIsPlantModalOpen(false)}
                    onSelect={(code) => {
                        setAssignedPlant(code)
                        setIsPlantModalOpen(false)
                    }}
                    plants={filteredPlants}
                />
            )}
        </>
    )
}
export default OperatorAddView
