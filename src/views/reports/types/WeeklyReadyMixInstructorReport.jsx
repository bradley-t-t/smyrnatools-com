import React, {useEffect, useState} from 'react'
import ReactDOM from 'react-dom'
import '../styles/report-styles/Reports.css'
import {OperatorService} from '../../../services/OperatorService'
import PlantDropdownModal from '../../../components/common/PlantDropdownModal'

export function ReadyMixInstructorSubmitPlugin({form, setForm, readOnly, plants}) {
    const [liveOperators, setLiveOperators] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [showAddTrainerModal, setShowAddTrainerModal] = useState(false)
    const [showAddPendingModal, setShowAddPendingModal] = useState(false)
    const [showPlantModal, setShowPlantModal] = useState(false)
    const [plantModalTarget, setPlantModalTarget] = useState(null)
    const [newTrainer, setNewTrainer] = useState({trainerId: '', plant: '', position: 'Mixer Operator'})
    const [newPending, setNewPending] = useState({
        name: '',
        plant: '',
        position: 'Mixer Operator',
        startDate: '',
        trainer: ''
    })

    const snapshotData = form?.snapshot_data || {}
    const mixerTrainers = snapshotData.mixer_trainers || []
    const tractorTrainers = snapshotData.tractor_trainers || []
    const mixerPending = snapshotData.mixer_pending || []
    const tractorPending = snapshotData.tractor_pending || []
    const mixerTraining = snapshotData.mixer_training || []
    const tractorTraining = snapshotData.tractor_training || []
    const hiringGoals = form?.hiring_goals || {}

    const isMixerTrainersAccurate = React.useMemo(() => {
        if (!liveOperators.length || mixerTrainers.length === 0) return false
        const liveTrainers = liveOperators.filter(op => op.isTrainer && op.status !== 'Terminated' && op.position === 'Mixer Operator')
        if (mixerTrainers.length !== liveTrainers.length) return false
        const mixerTrainerIds = new Set(mixerTrainers.map(t => t.id))
        return liveTrainers.every(op => mixerTrainerIds.has(op.employeeId))
    }, [liveOperators, mixerTrainers])

    const isTractorTrainersAccurate = React.useMemo(() => {
        if (!liveOperators.length || tractorTrainers.length === 0) return false
        const liveTrainers = liveOperators.filter(op => op.isTrainer && op.status !== 'Terminated' && op.position === 'Tractor Operator')
        if (tractorTrainers.length !== liveTrainers.length) return false
        const tractorTrainerIds = new Set(tractorTrainers.map(t => t.id))
        return liveTrainers.every(op => tractorTrainerIds.has(op.employeeId))
    }, [liveOperators, tractorTrainers])

    const isMixerPendingAccurate = React.useMemo(() => {
        if (!liveOperators.length || mixerPending.length === 0) return false
        const livePending = liveOperators.filter(op => op.status === 'Pending Start' && op.pendingStartDate && op.pendingStartDate.trim() !== '' && op.position === 'Mixer Operator')
        if (mixerPending.length !== livePending.length) return false
        const mixerPendingIds = new Set(mixerPending.map(p => p.id))
        return livePending.every(op => mixerPendingIds.has(op.employeeId))
    }, [liveOperators, mixerPending])

    const isTractorPendingAccurate = React.useMemo(() => {
        if (!liveOperators.length || tractorPending.length === 0) return false
        const livePending = liveOperators.filter(op => op.status === 'Pending Start' && op.pendingStartDate && op.pendingStartDate.trim() !== '' && op.position === 'Tractor Operator')
        if (tractorPending.length !== livePending.length) return false
        const tractorPendingIds = new Set(tractorPending.map(p => p.id))
        return livePending.every(op => tractorPendingIds.has(op.employeeId))
    }, [liveOperators, tractorPending])

    const isMixerTrainingAccurate = React.useMemo(() => {
        if (!liveOperators.length || mixerTraining.length === 0) return false
        const liveTraining = liveOperators.filter(op => op.status === 'Training' && op.position === 'Mixer Operator')
        if (mixerTraining.length !== liveTraining.length) return false
        const mixerTrainingIds = new Set(mixerTraining.map(t => t.id))
        return liveTraining.every(op => mixerTrainingIds.has(op.employeeId))
    }, [liveOperators, mixerTraining])

    const isTractorTrainingAccurate = React.useMemo(() => {
        if (!liveOperators.length || tractorTraining.length === 0) return false
        const liveTraining = liveOperators.filter(op => op.status === 'Training' && op.position === 'Tractor Operator')
        if (tractorTraining.length !== liveTraining.length) return false
        const tractorTrainingIds = new Set(tractorTraining.map(t => t.id))
        return liveTraining.every(op => tractorTrainingIds.has(op.employeeId))
    }, [liveOperators, tractorTraining])

    async function loadLiveData() {
        setIsLoading(true)
        try {
            const plantCodes = plants ? new Set(plants.map(p => p.plant_code || p.code).filter(Boolean)) : null
            const ops = await OperatorService.fetchOperators(plantCodes)
            setLiveOperators(ops || [])
        } catch (error) {
            console.error('Failed to load operators:', error)
            alert('Failed to load live data')
        } finally {
            setIsLoading(false)
        }
    }

    function pullMixerTrainers() {
        if (!liveOperators.length) {
            alert('Please load live data first')
            return
        }
        const trainers = liveOperators.filter(op => op.isTrainer && op.status !== 'Terminated' && op.position === 'Mixer Operator')
        const mixerTrainersData = trainers.map(op => ({
            id: op.employeeId,
            name: op.name,
            plant: op.plantCode,
            status: op.status
        }))
        setForm(prev => ({
            ...prev,
            snapshot_data: {
                ...prev.snapshot_data,
                mixer_trainers: mixerTrainersData
            }
        }))
    }

    function pullTractorTrainers() {
        if (!liveOperators.length) {
            alert('Please load live data first')
            return
        }
        const trainers = liveOperators.filter(op => op.isTrainer && op.status !== 'Terminated' && op.position === 'Tractor Operator')
        const tractorTrainersData = trainers.map(op => ({
            id: op.employeeId,
            name: op.name,
            plant: op.plantCode,
            status: op.status
        }))
        setForm(prev => ({
            ...prev,
            snapshot_data: {
                ...prev.snapshot_data,
                tractor_trainers: tractorTrainersData
            }
        }))
    }

    function pullMixerPending() {
        if (!liveOperators.length) {
            alert('Please load live data first')
            return
        }
        const pending = liveOperators.filter(op => op.status === 'Pending Start' && op.pendingStartDate && op.pendingStartDate.trim() !== '' && op.position === 'Mixer Operator')
        const mixerPendingData = pending.map(op => ({
            id: op.employeeId,
            name: op.name,
            plant: op.plantCode,
            startDate: op.pendingStartDate,
            trainer: op.assignedTrainer
        }))
        setForm(prev => ({
            ...prev,
            snapshot_data: {
                ...prev.snapshot_data,
                mixer_pending: mixerPendingData
            }
        }))
    }

    function pullTractorPending() {
        if (!liveOperators.length) {
            alert('Please load live data first')
            return
        }
        const pending = liveOperators.filter(op => op.status === 'Pending Start' && op.pendingStartDate && op.pendingStartDate.trim() !== '' && op.position === 'Tractor Operator')
        const tractorPendingData = pending.map(op => ({
            id: op.employeeId,
            name: op.name,
            plant: op.plantCode,
            startDate: op.pendingStartDate,
            trainer: op.assignedTrainer
        }))
        setForm(prev => ({
            ...prev,
            snapshot_data: {
                ...prev.snapshot_data,
                tractor_pending: tractorPendingData
            }
        }))
    }

    function pullMixerTraining() {
        if (!liveOperators.length) {
            alert('Please load live data first')
            return
        }
        const training = liveOperators.filter(op => op.status === 'Training' && op.position === 'Mixer Operator')
        const mixerTrainingData = training.map(op => {
            const trainer = liveOperators.find(t => t.employeeId === op.assignedTrainer)
            return {
                id: op.employeeId,
                name: op.name,
                plant: op.plantCode,
                trainer: trainer?.name || op.assignedTrainer || '—'
            }
        })
        setForm(prev => ({
            ...prev,
            snapshot_data: {
                ...prev.snapshot_data,
                mixer_training: mixerTrainingData
            }
        }))
    }

    function pullTractorTraining() {
        if (!liveOperators.length) {
            alert('Please load live data first')
            return
        }
        const training = liveOperators.filter(op => op.status === 'Training' && op.position === 'Tractor Operator')
        const tractorTrainingData = training.map(op => {
            const trainer = liveOperators.find(t => t.employeeId === op.assignedTrainer)
            return {
                id: op.employeeId,
                name: op.name,
                plant: op.plantCode,
                trainer: trainer?.name || op.assignedTrainer || '—'
            }
        })
        setForm(prev => ({
            ...prev,
            snapshot_data: {
                ...prev.snapshot_data,
                tractor_training: tractorTrainingData
            }
        }))
    }

    function removeTrainer(position, id) {
        const key = position === 'Mixer Operator' ? 'mixer_trainers' : 'tractor_trainers'
        setForm(prev => ({
            ...prev,
            snapshot_data: {
                ...prev.snapshot_data,
                [key]: (prev.snapshot_data?.[key] || []).filter(t => t.id !== id)
            }
        }))
    }

    function removePending(position, id) {
        const key = position === 'Mixer Operator' ? 'mixer_pending' : 'tractor_pending'
        setForm(prev => ({
            ...prev,
            snapshot_data: {
                ...prev.snapshot_data,
                [key]: (prev.snapshot_data?.[key] || []).filter(t => t.id !== id)
            }
        }))
    }

    function removeTraining(position, id) {
        const key = position === 'Mixer Operator' ? 'mixer_training' : 'tractor_training'
        setForm(prev => ({
            ...prev,
            snapshot_data: {
                ...prev.snapshot_data,
                [key]: (prev.snapshot_data?.[key] || []).filter(t => t.id !== id)
            }
        }))
    }

    function addTrainer() {
        if (!newTrainer.trainerId || !newTrainer.plant) {
            alert('Please select a trainer and plant')
            return
        }

        const selectedOperator = liveOperators.find(op => op.employeeId === newTrainer.trainerId)
        if (!selectedOperator) {
            alert('Selected trainer not found')
            return
        }

        const key = newTrainer.position === 'Mixer Operator' ? 'mixer_trainers' : 'tractor_trainers'
        const trainer = {
            id: selectedOperator.employeeId,
            name: selectedOperator.name,
            plant: newTrainer.plant,
            status: selectedOperator.status || 'Active'
        }
        setForm(prev => ({
            ...prev,
            snapshot_data: {
                ...prev.snapshot_data,
                [key]: [...(prev.snapshot_data?.[key] || []), trainer]
            }
        }))
        setNewTrainer({trainerId: '', plant: '', position: 'Mixer Operator'})
        setShowAddTrainerModal(false)
    }

    function addPending() {
        if (!newPending.name || !newPending.plant || !newPending.startDate) {
            alert('Please fill in all required fields')
            return
        }
        const key = newPending.position === 'Mixer Operator' ? 'mixer_pending' : 'tractor_pending'
        const pending = {
            id: `manual-${Date.now()}`,
            name: newPending.name,
            plant: newPending.plant,
            startDate: newPending.startDate,
            trainer: newPending.trainer
        }
        setForm(prev => ({
            ...prev,
            snapshot_data: {
                ...prev.snapshot_data,
                [key]: [...(prev.snapshot_data?.[key] || []), pending]
            }
        }))
        setNewPending({name: '', plant: '', position: 'Mixer Operator', startDate: '', trainer: ''})
        setShowAddPendingModal(false)
    }

    function getPlantName(plantCode) {
        const plant = plants?.find(p => (p.plant_code || p.code) === plantCode)
        return plant?.name || plantCode || '—'
    }

    function getAvailableTrainers(position) {
        return liveOperators.filter(op =>
            op.isTrainer &&
            op.status !== 'Terminated' &&
            op.position === position
        )
    }

    function handleHiringGoalChange(plantCode, value) {
        if (!setForm) return
        setForm(prev => ({
            ...prev,
            hiring_goals: {
                ...(prev.hiring_goals || {}),
                [plantCode]: value
            }
        }))
    }

    useEffect(() => {
        loadLiveData()
    }, [plants])

    function clearMixerTrainers() {
        if (!confirm('Are you sure you want to clear all Mixer Trainers data?')) return
        setForm(prev => ({
            ...prev,
            snapshot_data: {
                ...prev.snapshot_data,
                mixer_trainers: []
            }
        }))
    }

    function clearTractorTrainers() {
        if (!confirm('Are you sure you want to clear all Tractor Trainers data?')) return
        setForm(prev => ({
            ...prev,
            snapshot_data: {
                ...prev.snapshot_data,
                tractor_trainers: []
            }
        }))
    }

    function clearMixerPending() {
        if (!confirm('Are you sure you want to clear all Mixer Pending data?')) return
        setForm(prev => ({
            ...prev,
            snapshot_data: {
                ...prev.snapshot_data,
                mixer_pending: []
            }
        }))
    }

    function clearTractorPending() {
        if (!confirm('Are you sure you want to clear all Tractor Pending data?')) return
        setForm(prev => ({
            ...prev,
            snapshot_data: {
                ...prev.snapshot_data,
                tractor_pending: []
            }
        }))
    }

    function clearMixerTraining() {
        if (!confirm('Are you sure you want to clear all Mixer Training data?')) return
        setForm(prev => ({
            ...prev,
            snapshot_data: {
                ...prev.snapshot_data,
                mixer_training: []
            }
        }))
    }

    function clearTractorTraining() {
        if (!confirm('Are you sure you want to clear all Tractor Training data?')) return
        setForm(prev => ({
            ...prev,
            snapshot_data: {
                ...prev.snapshot_data,
                tractor_training: []
            }
        }))
    }

    return (
        <div className="rmi-report-plugin">
            <div className="rmi-section">
                <div className="rmi-section-header">
                    <div>
                        <h3 className="rmi-section-title">
                            <i className="fas fa-chalkboard-teacher"></i>
                            Active Trainers by Position
                        </h3>
                        <p className="rmi-section-subtitle">
                            Current instructors assigned to train new operators
                        </p>
                    </div>
                </div>

                <div className="rmi-trainers-grid">
                    <div className="rmi-trainer-category">
                        <div className="rmi-category-header rmi-mixer-header">
                            <i className="fas fa-truck-loading"></i>
                            <span>Mixer Trainers</span>
                            <span className="rmi-count-badge">{mixerTrainers.length}</span>
                            <div className="rmi-category-actions">
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-pull"
                                    onClick={pullMixerTrainers}
                                    disabled={isLoading || readOnly || isMixerTrainersAccurate}
                                    title={isMixerTrainersAccurate ? "Data is up to date" : "Pull live mixer trainer data"}
                                >
                                    <i className="fas fa-sync-alt"></i>
                                    <span>Pull</span>
                                </button>
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-add-new"
                                    onClick={() => {
                                        setNewTrainer({trainerId: '', plant: '', position: 'Mixer Operator'})
                                        setShowAddTrainerModal(true)
                                    }}
                                    disabled={readOnly}
                                    title="Add mixer trainer"
                                >
                                    <i className="fas fa-plus"></i>
                                    <span>Add</span>
                                </button>
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-clear"
                                    onClick={clearMixerTrainers}
                                    disabled={readOnly || mixerTrainers.length === 0}
                                    title="Clear all mixer trainers"
                                >
                                    <i className="fas fa-trash-alt"></i>
                                    <span>Clear</span>
                                </button>
                            </div>
                        </div>
                        {mixerTrainers.length > 0 ? (
                            <div className="rmi-table-wrapper">
                                <table className="rmi-table">
                                    <thead>
                                    <tr>
                                        <th>Trainer Name</th>
                                        <th>Plant</th>
                                        <th>Status</th>
                                        {!readOnly && <th>Action</th>}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {mixerTrainers.map(trainer => (
                                        <tr key={trainer.id}>
                                            <td className="rmi-name-cell">
                                                <i className="fas fa-user-tie rmi-icon-small"></i>
                                                {trainer.name}
                                            </td>
                                            <td>{getPlantName(trainer.plant)}</td>
                                            <td>
                                                    <span className="rmi-status-badge rmi-status-active">
                                                        {trainer.status}
                                                    </span>
                                            </td>
                                            {!readOnly && (
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="rmi-delete-btn"
                                                        onClick={() => removeTrainer('Mixer Operator', trainer.id)}
                                                        title="Remove trainer"
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="rmi-empty-state">
                                <i className="fas fa-user-slash"></i>
                                <p>No mixer trainers - pull live data or add manually</p>
                            </div>
                        )}
                    </div>

                    <div className="rmi-trainer-category">
                        <div className="rmi-category-header rmi-tractor-header">
                            <i className="fas fa-tractor"></i>
                            <span>Tractor Trainers</span>
                            <span className="rmi-count-badge">{tractorTrainers.length}</span>
                            <div className="rmi-category-actions">
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-pull"
                                    onClick={pullTractorTrainers}
                                    disabled={isLoading || readOnly || isTractorTrainersAccurate}
                                    title={isTractorTrainersAccurate ? "Data is up to date" : "Pull live tractor trainer data"}
                                >
                                    <i className="fas fa-sync-alt"></i>
                                    <span>Pull</span>
                                </button>
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-add-new"
                                    onClick={() => {
                                        setNewTrainer({trainerId: '', plant: '', position: 'Tractor Operator'})
                                        setShowAddTrainerModal(true)
                                    }}
                                    disabled={readOnly}
                                    title="Add tractor trainer"
                                >
                                    <i className="fas fa-plus"></i>
                                    <span>Add</span>
                                </button>
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-clear"
                                    onClick={clearTractorTrainers}
                                    disabled={readOnly || tractorTrainers.length === 0}
                                    title="Clear all tractor trainers"
                                >
                                    <i className="fas fa-trash-alt"></i>
                                    <span>Clear</span>
                                </button>
                            </div>
                        </div>
                        {tractorTrainers.length > 0 ? (
                            <div className="rmi-table-wrapper">
                                <table className="rmi-table">
                                    <thead>
                                    <tr>
                                        <th>Trainer Name</th>
                                        <th>Plant</th>
                                        <th>Status</th>
                                        {!readOnly && <th>Action</th>}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {tractorTrainers.map(trainer => (
                                        <tr key={trainer.id}>
                                            <td className="rmi-name-cell">
                                                <i className="fas fa-user-tie rmi-icon-small"></i>
                                                {trainer.name}
                                            </td>
                                            <td>{getPlantName(trainer.plant)}</td>
                                            <td>
                                                    <span className="rmi-status-badge rmi-status-active">
                                                        {trainer.status}
                                                    </span>
                                            </td>
                                            {!readOnly && (
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="rmi-delete-btn"
                                                        onClick={() => removeTrainer('Tractor Operator', trainer.id)}
                                                        title="Remove trainer"
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="rmi-empty-state">
                                <i className="fas fa-user-slash"></i>
                                <p>No tractor trainers - pull live data or add manually</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="rmi-section">
                <div className="rmi-section-header">
                    <div>
                        <h3 className="rmi-section-title">
                            <i className="fas fa-user-clock"></i>
                            Pending Start Operators
                        </h3>
                        <p className="rmi-section-subtitle">
                            New operators awaiting start date with assigned trainers
                        </p>
                    </div>
                </div>

                <div className="rmi-pending-grid">
                    <div className="rmi-pending-category">
                        <div className="rmi-category-header rmi-mixer-header">
                            <i className="fas fa-truck-loading"></i>
                            <span>Mixer Operators</span>
                            <span className="rmi-count-badge">{mixerPending.length}</span>
                            <div className="rmi-category-actions">
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-pull"
                                    onClick={pullMixerPending}
                                    disabled={isLoading || readOnly || isMixerPendingAccurate}
                                    title={isMixerPendingAccurate ? "Data is up to date" : "Pull live mixer pending data"}
                                >
                                    <i className="fas fa-sync-alt"></i>
                                    <span>Pull</span>
                                </button>
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-add-new"
                                    onClick={() => {
                                        setNewPending({
                                            name: '',
                                            plant: '',
                                            position: 'Mixer Operator',
                                            startDate: '',
                                            trainer: ''
                                        })
                                        setShowAddPendingModal(true)
                                    }}
                                    disabled={readOnly}
                                    title="Add pending mixer operator"
                                >
                                    <i className="fas fa-plus"></i>
                                    <span>Add</span>
                                </button>
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-clear"
                                    onClick={clearMixerPending}
                                    disabled={readOnly || mixerPending.length === 0}
                                    title="Clear all mixer pending"
                                >
                                    <i className="fas fa-trash-alt"></i>
                                    <span>Clear</span>
                                </button>
                            </div>
                        </div>
                        {mixerPending.length > 0 ? (
                            <div className="rmi-table-wrapper">
                                <table className="rmi-table">
                                    <thead>
                                    <tr>
                                        <th>Operator Name</th>
                                        <th>Plant</th>
                                        <th>Start Date</th>
                                        {!readOnly && <th>Action</th>}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {mixerPending.map(op => (
                                        <tr key={op.id}>
                                            <td className="rmi-name-cell">
                                                <i className="fas fa-user rmi-icon-small"></i>
                                                {op.name}
                                            </td>
                                            <td>{getPlantName(op.plant)}</td>
                                            <td>
                                                    <span className="rmi-date-badge">
                                                        {op.startDate}
                                                    </span>
                                            </td>
                                            {!readOnly && (
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="rmi-delete-btn"
                                                        onClick={() => removePending('Mixer Operator', op.id)}
                                                        title="Remove pending operator"
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="rmi-empty-state">
                                <i className="fas fa-check-circle"></i>
                                <p>No pending mixer operators</p>
                            </div>
                        )}
                    </div>

                    <div className="rmi-pending-category">
                        <div className="rmi-category-header rmi-tractor-header">
                            <i className="fas fa-tractor"></i>
                            <span>Tractor Operators</span>
                            <span className="rmi-count-badge">{tractorPending.length}</span>
                            <div className="rmi-category-actions">
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-pull"
                                    onClick={pullTractorPending}
                                    disabled={isLoading || readOnly || isTractorPendingAccurate}
                                    title={isTractorPendingAccurate ? "Data is up to date" : "Pull live tractor pending data"}
                                >
                                    <i className="fas fa-sync-alt"></i>
                                    <span>Pull</span>
                                </button>
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-add-new"
                                    onClick={() => {
                                        setNewPending({
                                            name: '',
                                            plant: '',
                                            position: 'Tractor Operator',
                                            startDate: '',
                                            trainer: ''
                                        })
                                        setShowAddPendingModal(true)
                                    }}
                                    disabled={readOnly}
                                    title="Add pending tractor operator"
                                >
                                    <i className="fas fa-plus"></i>
                                    <span>Add</span>
                                </button>
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-clear"
                                    onClick={clearTractorPending}
                                    disabled={readOnly || tractorPending.length === 0}
                                    title="Clear all tractor pending"
                                >
                                    <i className="fas fa-trash-alt"></i>
                                    <span>Clear</span>
                                </button>
                            </div>
                        </div>
                        {tractorPending.length > 0 ? (
                            <div className="rmi-table-wrapper">
                                <table className="rmi-table">
                                    <thead>
                                    <tr>
                                        <th>Operator Name</th>
                                        <th>Plant</th>
                                        <th>Start Date</th>
                                        {!readOnly && <th>Action</th>}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {tractorPending.map(op => (
                                        <tr key={op.id}>
                                            <td className="rmi-name-cell">
                                                <i className="fas fa-user rmi-icon-small"></i>
                                                {op.name}
                                            </td>
                                            <td>{getPlantName(op.plant)}</td>
                                            <td>
                                                    <span className="rmi-date-badge">
                                                        {op.startDate}
                                                    </span>
                                            </td>
                                            {!readOnly && (
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="rmi-delete-btn"
                                                        onClick={() => removePending('Tractor Operator', op.id)}
                                                        title="Remove pending operator"
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="rmi-empty-state">
                                <i className="fas fa-check-circle"></i>
                                <p>No pending tractor operators</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="rmi-section">
                <div className="rmi-section-header">
                    <div>
                        <h3 className="rmi-section-title">
                            <i className="fas fa-graduation-cap"></i>
                            Training Operators
                        </h3>
                        <p className="rmi-section-subtitle">
                            Operators currently in training with assigned trainers
                        </p>
                    </div>
                </div>

                <div className="rmi-pending-grid">
                    <div className="rmi-pending-category">
                        <div className="rmi-category-header rmi-mixer-header">
                            <i className="fas fa-truck-loading"></i>
                            <span>Mixer Operators</span>
                            <span className="rmi-count-badge">{mixerTraining.length}</span>
                            <div className="rmi-category-actions">
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-pull"
                                    onClick={pullMixerTraining}
                                    disabled={isLoading || readOnly || isMixerTrainingAccurate}
                                    title={isMixerTrainingAccurate ? "Data is up to date" : "Pull live mixer training data"}
                                >
                                    <i className="fas fa-sync-alt"></i>
                                    <span>Pull</span>
                                </button>
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-add-new"
                                    onClick={() => {
                                        setNewPending({
                                            name: '',
                                            plant: '',
                                            position: 'Mixer Operator',
                                            startDate: '',
                                            trainer: ''
                                        })
                                        setShowAddPendingModal(true)
                                    }}
                                    disabled={readOnly}
                                    title="Add training mixer operator"
                                >
                                    <i className="fas fa-plus"></i>
                                    <span>Add</span>
                                </button>
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-clear"
                                    onClick={clearMixerTraining}
                                    disabled={readOnly || mixerTraining.length === 0}
                                    title="Clear all mixer training"
                                >
                                    <i className="fas fa-trash-alt"></i>
                                    <span>Clear</span>
                                </button>
                            </div>
                        </div>
                        {mixerTraining.length > 0 ? (
                            <div className="rmi-table-wrapper">
                                <table className="rmi-table">
                                    <thead>
                                    <tr>
                                        <th>Operator Name</th>
                                        <th>Plant</th>
                                        <th>Trainer</th>
                                        {!readOnly && <th>Action</th>}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {mixerTraining.map(op => (
                                        <tr key={op.id}>
                                            <td className="rmi-name-cell">
                                                <i className="fas fa-user rmi-icon-small"></i>
                                                {op.name}
                                            </td>
                                            <td>{getPlantName(op.plant)}</td>
                                            <td>{op.trainer || '—'}</td>
                                            {!readOnly && (
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="rmi-delete-btn"
                                                        onClick={() => removeTraining('Mixer Operator', op.id)}
                                                        title="Remove training operator"
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="rmi-empty-state">
                                <i className="fas fa-check-circle"></i>
                                <p>No mixer operators in training</p>
                            </div>
                        )}
                    </div>

                    <div className="rmi-pending-category">
                        <div className="rmi-category-header rmi-tractor-header">
                            <i className="fas fa-tractor"></i>
                            <span>Tractor Operators</span>
                            <span className="rmi-count-badge">{tractorTraining.length}</span>
                            <div className="rmi-category-actions">
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-pull"
                                    onClick={pullTractorTraining}
                                    disabled={isLoading || readOnly || isTractorTrainingAccurate}
                                    title={isTractorTrainingAccurate ? "Data is up to date" : "Pull live tractor training data"}
                                >
                                    <i className="fas fa-sync-alt"></i>
                                    <span>Pull</span>
                                </button>
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-add-new"
                                    onClick={() => {
                                        setNewPending({
                                            name: '',
                                            plant: '',
                                            position: 'Tractor Operator',
                                            startDate: '',
                                            trainer: ''
                                        })
                                        setShowAddPendingModal(true)
                                    }}
                                    disabled={readOnly}
                                    title="Add training tractor operator"
                                >
                                    <i className="fas fa-plus"></i>
                                    <span>Add</span>
                                </button>
                                <button
                                    type="button"
                                    className="rmi-category-btn-new rmi-btn-clear"
                                    onClick={clearTractorTraining}
                                    disabled={readOnly || tractorTraining.length === 0}
                                    title="Clear all tractor training"
                                >
                                    <i className="fas fa-trash-alt"></i>
                                    <span>Clear</span>
                                </button>
                            </div>
                        </div>
                        {tractorTraining.length > 0 ? (
                            <div className="rmi-table-wrapper">
                                <table className="rmi-table">
                                    <thead>
                                    <tr>
                                        <th>Operator Name</th>
                                        <th>Plant</th>
                                        <th>Trainer</th>
                                        {!readOnly && <th>Action</th>}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {tractorTraining.map(op => (
                                        <tr key={op.id}>
                                            <td className="rmi-name-cell">
                                                <i className="fas fa-user rmi-icon-small"></i>
                                                {op.name}
                                            </td>
                                            <td>{getPlantName(op.plant)}</td>
                                            <td>{op.trainer || '—'}</td>
                                            {!readOnly && (
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="rmi-delete-btn"
                                                        onClick={() => removeTraining('Tractor Operator', op.id)}
                                                        title="Remove training operator"
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="rmi-empty-state">
                                <i className="fas fa-check-circle"></i>
                                <p>No tractor operators in training</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="rmi-section">
                <div className="rmi-section-header">
                    <h3 className="rmi-section-title">
                        <i className="fas fa-bullseye"></i>
                        Weekly Hiring Goals
                    </h3>
                    <p className="rmi-section-subtitle">
                        Set hiring targets for each plant location
                    </p>
                </div>

                <div className="rmi-goals-table-container">
                    <table className="rmi-goals-table">
                        <thead>
                        <tr>
                            <th className="rmi-goals-th-plant">Plant Name</th>
                            <th className="rmi-goals-th-code">Code</th>
                            <th className="rmi-goals-th-goal">Hiring Goal</th>
                        </tr>
                        </thead>
                        <tbody>
                        {plants?.map(plant => {
                            const plantCode = plant.plant_code || plant.code
                            const plantName = plant.name || plant.plant_name || plantCode
                            return (
                                <tr key={plantCode}>
                                    <td className="rmi-goals-td-plant">
                                        <div className="rmi-goals-plant-cell">
                                            <i className="fas fa-industry"></i>
                                            <span>{plantName}</span>
                                        </div>
                                    </td>
                                    <td className="rmi-goals-td-code">
                                            <span className="rmi-goals-code-badge">
                                                {plantCode}
                                            </span>
                                    </td>
                                    <td className="rmi-goals-td-goal">
                                        <input
                                            type="number"
                                            min="0"
                                            className="rmi-goals-input"
                                            value={hiringGoals[plantCode] || ''}
                                            onChange={(e) => handleHiringGoalChange(plantCode, e.target.value)}
                                            placeholder="0"
                                            disabled={readOnly}
                                        />
                                    </td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAddTrainerModal && ReactDOM.createPortal(
                <div className="rmi-modal-backdrop" onClick={() => setShowAddTrainerModal(false)}>
                    <div className="rmi-modal-container" onClick={e => e.stopPropagation()}>
                        <div className="rmi-modal-header-modern">
                            <div className="rmi-modal-header-content">
                                <i className="fas fa-user-plus"></i>
                                <div>
                                    <h2>Add Trainer</h2>
                                    <span
                                        className="rmi-modal-subtitle">Select an existing trainer from your region</span>
                                </div>
                            </div>
                            <button type="button" className="rmi-modal-close-modern"
                                    onClick={() => setShowAddTrainerModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="rmi-modal-body-modern">
                            <div className="rmi-form-group-modern">
                                <label>Position *</label>
                                <select
                                    value={newTrainer.position}
                                    onChange={e => setNewTrainer({
                                        ...newTrainer,
                                        position: e.target.value,
                                        trainerId: ''
                                    })}
                                    className="rmi-form-select-modern"
                                >
                                    <option value="Mixer Operator">Mixer Operator</option>
                                    <option value="Tractor Operator">Tractor Operator</option>
                                </select>
                            </div>
                            <div className="rmi-form-group-modern">
                                <label>Select Trainer *</label>
                                <select
                                    value={newTrainer.trainerId}
                                    onChange={e => setNewTrainer({...newTrainer, trainerId: e.target.value})}
                                    className="rmi-form-select-modern"
                                >
                                    <option value="">Choose a trainer...</option>
                                    {getAvailableTrainers(newTrainer.position).map(trainer => (
                                        <option key={trainer.employeeId} value={trainer.employeeId}>
                                            {trainer.name} - {getPlantName(trainer.plantCode)}
                                        </option>
                                    ))}
                                </select>
                                {getAvailableTrainers(newTrainer.position).length === 0 && (
                                    <span
                                        className="rmi-form-helper-text">No trainers available for this position</span>
                                )}
                            </div>
                            <div className="rmi-form-group-modern">
                                <label>Assign to Plant *</label>
                                <button
                                    type="button"
                                    className="rmi-plant-selector-btn"
                                    onClick={() => {
                                        setPlantModalTarget('trainer')
                                        setShowPlantModal(true)
                                    }}
                                >
                                    <i className="fas fa-industry"></i>
                                    <span>{newTrainer.plant ? getPlantName(newTrainer.plant) : 'Select Plant...'}</span>
                                    <i className="fas fa-chevron-down"></i>
                                </button>
                            </div>
                        </div>
                        <div className="rmi-modal-footer-modern">
                            <button type="button" className="rmi-modal-btn-modern rmi-btn-cancel-modern"
                                    onClick={() => setShowAddTrainerModal(false)}>
                                Cancel
                            </button>
                            <button type="button" className="rmi-modal-btn-modern rmi-btn-save-modern"
                                    onClick={addTrainer}>
                                <i className="fas fa-plus"></i>
                                Add Trainer
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showAddPendingModal && ReactDOM.createPortal(
                <div className="rmi-modal-backdrop" onClick={() => setShowAddPendingModal(false)}>
                    <div className="rmi-modal-container" onClick={e => e.stopPropagation()}>
                        <div className="rmi-modal-header-modern">
                            <div className="rmi-modal-header-content">
                                <i className="fas fa-user-clock"></i>
                                <div>
                                    <h2>Add Pending Start Operator</h2>
                                    <span className="rmi-modal-subtitle">Add a new operator awaiting start date</span>
                                </div>
                            </div>
                            <button type="button" className="rmi-modal-close-modern"
                                    onClick={() => setShowAddPendingModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="rmi-modal-body-modern">
                            <div className="rmi-form-group-modern">
                                <label>Position *</label>
                                <select
                                    value={newPending.position}
                                    onChange={e => setNewPending({...newPending, position: e.target.value})}
                                    className="rmi-form-select-modern"
                                >
                                    <option value="Mixer Operator">Mixer Operator</option>
                                    <option value="Tractor Operator">Tractor Operator</option>
                                </select>
                            </div>
                            <div className="rmi-form-group-modern">
                                <label>Operator Name *</label>
                                <input
                                    type="text"
                                    value={newPending.name}
                                    onChange={e => setNewPending({...newPending, name: e.target.value})}
                                    className="rmi-form-input-modern"
                                    placeholder="Enter operator name"
                                />
                            </div>
                            <div className="rmi-form-group-modern">
                                <label>Assign to Plant *</label>
                                <button
                                    type="button"
                                    className="rmi-plant-selector-btn"
                                    onClick={() => {
                                        setPlantModalTarget('pending')
                                        setShowPlantModal(true)
                                    }}
                                >
                                    <i className="fas fa-industry"></i>
                                    <span>{newPending.plant ? getPlantName(newPending.plant) : 'Select Plant...'}</span>
                                    <i className="fas fa-chevron-down"></i>
                                </button>
                            </div>
                            <div className="rmi-form-group-modern">
                                <label>Start Date *</label>
                                <input
                                    type="date"
                                    value={newPending.startDate}
                                    onChange={e => setNewPending({...newPending, startDate: e.target.value})}
                                    className="rmi-form-input-modern"
                                />
                            </div>
                            <div className="rmi-form-group-modern">
                                <label>Assigned Trainer</label>
                                <input
                                    type="text"
                                    value={newPending.trainer}
                                    onChange={e => setNewPending({...newPending, trainer: e.target.value})}
                                    className="rmi-form-input-modern"
                                    placeholder="Enter trainer name (optional)"
                                />
                            </div>
                        </div>
                        <div className="rmi-modal-footer-modern">
                            <button type="button" className="rmi-modal-btn-modern rmi-btn-cancel-modern"
                                    onClick={() => setShowAddPendingModal(false)}>
                                Cancel
                            </button>
                            <button type="button" className="rmi-modal-btn-modern rmi-btn-save-modern"
                                    onClick={addPending}>
                                <i className="fas fa-plus"></i>
                                Add Operator
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <PlantDropdownModal
                isOpen={showPlantModal}
                onClose={() => setShowPlantModal(false)}
                plants={plants?.map(p => ({
                    plantCode: p.plant_code || p.code,
                    plantName: p.name
                })) || []}
                onSelect={(plantCode) => {
                    if (plantModalTarget === 'trainer') {
                        setNewTrainer({...newTrainer, plant: plantCode})
                    } else if (plantModalTarget === 'pending') {
                        setNewPending({...newPending, plant: plantCode})
                    }
                    setShowPlantModal(false)
                }}
                searchPlaceholder="Search plants..."
            />
        </div>
    )
}

export function ReadyMixInstructorReviewPlugin({form, plants}) {
    const snapshotData = form?.snapshot_data || {}
    const mixerTrainers = snapshotData.mixer_trainers || []
    const tractorTrainers = snapshotData.tractor_trainers || []
    const mixerPending = snapshotData.mixer_pending || []
    const tractorPending = snapshotData.tractor_pending || []
    const mixerTraining = snapshotData.mixer_training || []
    const tractorTraining = snapshotData.tractor_training || []
    const hiringGoals = form?.hiring_goals || {}

    function getPlantName(plantCode) {
        const plant = plants?.find(p => (p.plant_code || p.code) === plantCode)
        return plant?.name || plantCode || '—'
    }

    return (
        <div className="rmi-report-plugin">
            <div className="rmi-section">
                <div className="rmi-section-header">
                    <div>
                        <h3 className="rmi-section-title">
                            <i className="fas fa-chalkboard-teacher"></i>
                            Active Trainers by Position
                        </h3>
                        <p className="rmi-section-subtitle">
                            Current instructors assigned to train new operators
                        </p>
                    </div>
                </div>

                <div className="rmi-trainers-grid">
                    <div className="rmi-trainer-category">
                        <div className="rmi-category-header rmi-mixer-header">
                            <i className="fas fa-truck-loading"></i>
                            <span>Mixer Trainers</span>
                            <span className="rmi-count-badge">{mixerTrainers.length}</span>
                        </div>
                        {mixerTrainers.length > 0 ? (
                            <div className="rmi-table-wrapper">
                                <table className="rmi-table">
                                    <thead>
                                    <tr>
                                        <th>Trainer Name</th>
                                        <th>Plant</th>
                                        <th>Status</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {mixerTrainers.map(trainer => (
                                        <tr key={trainer.id}>
                                            <td className="rmi-name-cell">
                                                <i className="fas fa-user-tie rmi-icon-small"></i>
                                                {trainer.name}
                                            </td>
                                            <td>{getPlantName(trainer.plant)}</td>
                                            <td>
                                                    <span className="rmi-status-badge rmi-status-active">
                                                        {trainer.status}
                                                    </span>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="rmi-empty-state">
                                <i className="fas fa-user-slash"></i>
                                <p>No mixer trainers recorded</p>
                            </div>
                        )}
                    </div>

                    <div className="rmi-trainer-category">
                        <div className="rmi-category-header rmi-tractor-header">
                            <i className="fas fa-tractor"></i>
                            <span>Tractor Trainers</span>
                            <span className="rmi-count-badge">{tractorTrainers.length}</span>
                        </div>
                        {tractorTrainers.length > 0 ? (
                            <div className="rmi-table-wrapper">
                                <table className="rmi-table">
                                    <thead>
                                    <tr>
                                        <th>Trainer Name</th>
                                        <th>Plant</th>
                                        <th>Status</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {tractorTrainers.map(trainer => (
                                        <tr key={trainer.id}>
                                            <td className="rmi-name-cell">
                                                <i className="fas fa-user-tie rmi-icon-small"></i>
                                                {trainer.name}
                                            </td>
                                            <td>{getPlantName(trainer.plant)}</td>
                                            <td>
                                                    <span className="rmi-status-badge rmi-status-active">
                                                        {trainer.status}
                                                    </span>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="rmi-empty-state">
                                <i className="fas fa-user-slash"></i>
                                <p>No tractor trainers recorded</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="rmi-section">
                <div className="rmi-section-header">
                    <div>
                        <h3 className="rmi-section-title">
                            <i className="fas fa-user-clock"></i>
                            Pending Start Operators
                        </h3>
                        <p className="rmi-section-subtitle">
                            New operators awaiting start date with assigned trainers
                        </p>
                    </div>
                </div>

                <div className="rmi-pending-grid">
                    <div className="rmi-pending-category">
                        <div className="rmi-category-header rmi-mixer-header">
                            <i className="fas fa-truck-loading"></i>
                            <span>Mixer Operators</span>
                            <span className="rmi-count-badge">{mixerPending.length}</span>
                        </div>
                        {mixerPending.length > 0 ? (
                            <div className="rmi-table-wrapper">
                                <table className="rmi-table">
                                    <thead>
                                    <tr>
                                        <th>Operator Name</th>
                                        <th>Plant</th>
                                        <th>Start Date</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {mixerPending.map(op => (
                                        <tr key={op.id}>
                                            <td className="rmi-name-cell">
                                                <i className="fas fa-user rmi-icon-small"></i>
                                                {op.name}
                                            </td>
                                            <td>{getPlantName(op.plant)}</td>
                                            <td>
                                                    <span className="rmi-date-badge">
                                                        {op.startDate}
                                                    </span>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="rmi-empty-state">
                                <i className="fas fa-check-circle"></i>
                                <p>No pending mixer operators</p>
                            </div>
                        )}
                    </div>

                    <div className="rmi-pending-category">
                        <div className="rmi-category-header rmi-tractor-header">
                            <i className="fas fa-tractor"></i>
                            <span>Tractor Operators</span>
                            <span className="rmi-count-badge">{tractorPending.length}</span>
                        </div>
                        {tractorPending.length > 0 ? (
                            <div className="rmi-table-wrapper">
                                <table className="rmi-table">
                                    <thead>
                                    <tr>
                                        <th>Operator Name</th>
                                        <th>Plant</th>
                                        <th>Start Date</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {tractorPending.map(op => (
                                        <tr key={op.id}>
                                            <td className="rmi-name-cell">
                                                <i className="fas fa-user rmi-icon-small"></i>
                                                {op.name}
                                            </td>
                                            <td>{getPlantName(op.plant)}</td>
                                            <td>
                                                    <span className="rmi-date-badge">
                                                        {op.startDate}
                                                    </span>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="rmi-empty-state">
                                <i className="fas fa-check-circle"></i>
                                <p>No pending tractor operators</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="rmi-section">
                <div className="rmi-section-header">
                    <div>
                        <h3 className="rmi-section-title">
                            <i className="fas fa-graduation-cap"></i>
                            Training Operators
                        </h3>
                        <p className="rmi-section-subtitle">
                            Operators currently in training with assigned trainers
                        </p>
                    </div>
                </div>

                <div className="rmi-pending-grid">
                    <div className="rmi-pending-category">
                        <div className="rmi-category-header rmi-mixer-header">
                            <i className="fas fa-truck-loading"></i>
                            <span>Mixer Operators</span>
                            <span className="rmi-count-badge">{mixerTraining.length}</span>
                        </div>
                        {mixerTraining.length > 0 ? (
                            <div className="rmi-table-wrapper">
                                <table className="rmi-table">
                                    <thead>
                                    <tr>
                                        <th>Operator Name</th>
                                        <th>Plant</th>
                                        <th>Trainer</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {mixerTraining.map(op => (
                                        <tr key={op.id}>
                                            <td className="rmi-name-cell">
                                                <i className="fas fa-user rmi-icon-small"></i>
                                                {op.name}
                                            </td>
                                            <td>{getPlantName(op.plant)}</td>
                                            <td>{op.trainer || '—'}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="rmi-empty-state">
                                <i className="fas fa-check-circle"></i>
                                <p>No mixer operators in training</p>
                            </div>
                        )}
                    </div>

                    <div className="rmi-pending-category">
                        <div className="rmi-category-header rmi-tractor-header">
                            <i className="fas fa-tractor"></i>
                            <span>Tractor Operators</span>
                            <span className="rmi-count-badge">{tractorTraining.length}</span>
                        </div>
                        {tractorTraining.length > 0 ? (
                            <div className="rmi-table-wrapper">
                                <table className="rmi-table">
                                    <thead>
                                    <tr>
                                        <th>Operator Name</th>
                                        <th>Plant</th>
                                        <th>Trainer</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {tractorTraining.map(op => (
                                        <tr key={op.id}>
                                            <td className="rmi-name-cell">
                                                <i className="fas fa-user rmi-icon-small"></i>
                                                {op.name}
                                            </td>
                                            <td>{getPlantName(op.plant)}</td>
                                            <td>{op.trainer || '—'}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="rmi-empty-state">
                                <i className="fas fa-check-circle"></i>
                                <p>No tractor operators in training</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="rmi-section">
                <div className="rmi-section-header">
                    <h3 className="rmi-section-title">
                        <i className="fas fa-bullseye"></i>
                        Weekly Hiring Goals
                    </h3>
                    <p className="rmi-section-subtitle">
                        Hiring targets for each plant location
                    </p>
                </div>

                <div className="rmi-goals-table-container">
                    <table className="rmi-goals-table">
                        <thead>
                        <tr>
                            <th className="rmi-goals-th-plant">Plant Name</th>
                            <th className="rmi-goals-th-code">Code</th>
                            <th className="rmi-goals-th-goal">Hiring Goal</th>
                        </tr>
                        </thead>
                        <tbody>
                        {plants?.map(plant => {
                            const plantCode = plant.plant_code || plant.code
                            const plantName = plant.name || plant.plant_name || plantCode
                            return (
                                <tr key={plantCode}>
                                    <td className="rmi-goals-td-plant">
                                        <div className="rmi-goals-plant-cell">
                                            <i className="fas fa-industry"></i>
                                            <span>{plantName}</span>
                                        </div>
                                    </td>
                                    <td className="rmi-goals-td-code">
                                            <span className="rmi-goals-code-badge">
                                                {plantCode}
                                            </span>
                                    </td>
                                    <td className="rmi-goals-td-goal">
                                        <div className="rmi-goals-display">
                                            {hiringGoals[plantCode] || '0'}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}