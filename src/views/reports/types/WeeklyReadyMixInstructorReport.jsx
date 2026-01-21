import React, {useEffect, useState} from 'react'
import ReactDOM from 'react-dom'
import {OperatorService} from '../../../services/OperatorService'
import PlantDropdownModal from '../../../components/common/PlantDropdownModal'

const rmiReportStyles = `
.rmi-report-plugin { }
.rmi-section { background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 1.5rem; margin-bottom: 1.5rem; }
.rmi-section-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem; }
.rmi-section-title { display: flex; align-items: center; gap: 0.75rem; font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0; }
.rmi-section-title i { color: #1e3a5f; }
.rmi-section-subtitle { font-size: 0.875rem; color: #64748b; margin: 0.5rem 0 0 0; }
.rmi-trainers-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; }
.rmi-trainer-category { background: #f8fafc; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }
.rmi-category-header { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: #1e3a5f; color: white; font-weight: 600; }
.rmi-mixer-header { background: #1e3a5f; }
.rmi-tractor-header { background: #0369a1; }
.rmi-count-badge { margin-left: auto; padding: 0.25rem 0.625rem; background: rgba(255,255,255,0.2); border-radius: 9999px; font-size: 0.8125rem; }
.rmi-category-actions { display: flex; gap: 0.5rem; margin-left: 0.5rem; }
.rmi-category-btn-new { display: flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.625rem; background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; font-size: 0.75rem; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.rmi-category-btn-new:hover { background: rgba(255,255,255,0.25); }
.rmi-category-btn-new:disabled { opacity: 0.5; cursor: not-allowed; }
.rmi-btn-pull { }
.rmi-btn-add-new { }
.rmi-trainer-list { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.rmi-trainer-card { display: flex; align-items: center; gap: 1rem; padding: 0.875rem; background: white; border-radius: 8px; border: 1px solid #e5e7eb; }
.rmi-trainer-avatar { width: 40px; height: 40px; border-radius: 50%; background: #e0f2fe; color: #0369a1; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem; }
.rmi-trainer-info { flex: 1; }
.rmi-trainer-name { font-weight: 600; color: #1e293b; font-size: 0.9375rem; }
.rmi-trainer-plant { font-size: 0.8125rem; color: #64748b; display: flex; align-items: center; gap: 0.375rem; }
.rmi-trainer-actions { display: flex; gap: 0.5rem; }
.rmi-btn-icon { padding: 0.5rem; background: transparent; border: 1px solid #e5e7eb; border-radius: 6px; color: #64748b; cursor: pointer; transition: all 0.15s; }
.rmi-btn-icon:hover { background: #f1f5f9; color: #1e293b; }
.rmi-btn-icon.danger:hover { background: #fee2e2; color: #dc2626; border-color: #fecaca; }
.rmi-empty-state { text-align: center; padding: 2rem; color: #64748b; }
.rmi-empty-state i { font-size: 2rem; color: #cbd5e1; margin-bottom: 0.75rem; display: block; }
.rmi-empty-state p { margin: 0; font-size: 0.875rem; }
.rmi-pending-section { margin-top: 1.5rem; }
.rmi-pending-category { background: #f8fafc; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; margin-bottom: 1rem; }
.rmi-pending-header { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: #f59e0b; color: white; font-weight: 600; }
.rmi-pending-list { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.rmi-pending-card { display: flex; align-items: center; gap: 1rem; padding: 0.875rem; background: white; border-radius: 8px; border: 1px solid #e5e7eb; }
.rmi-pending-info { flex: 1; }
.rmi-pending-name { font-weight: 600; color: #1e293b; font-size: 0.9375rem; }
.rmi-pending-details { font-size: 0.8125rem; color: #64748b; display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.25rem; }
.rmi-pending-detail { display: flex; align-items: center; gap: 0.375rem; }
.rmi-training-section { margin-top: 1.5rem; }
.rmi-training-category { background: #f8fafc; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; margin-bottom: 1rem; }
.rmi-training-header { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: #22c55e; color: white; font-weight: 600; }
.rmi-training-list { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.rmi-training-card { display: flex; align-items: center; gap: 1rem; padding: 0.875rem; background: white; border-radius: 8px; border: 1px solid #e5e7eb; }
.rmi-training-info { flex: 1; }
.rmi-training-name { font-weight: 600; color: #1e293b; font-size: 0.9375rem; }
.rmi-training-details { font-size: 0.8125rem; color: #64748b; display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.25rem; }
.rmi-hiring-section { margin-top: 1.5rem; }
.rmi-hiring-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
.rmi-hiring-card { background: #f8fafc; border-radius: 8px; padding: 1rem; border: 1px solid #e5e7eb; }
.rmi-hiring-label { font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.5rem; }
.rmi-hiring-input { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.9375rem; color: #1e293b; background: white; box-sizing: border-box; }
.rmi-hiring-input:disabled { background: #f1f5f9; color: #64748b; }
.rmi-modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.rmi-modal-content { background: white; border-radius: 16px; padding: 1.5rem; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.rmi-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
.rmi-modal-title { font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0; }
.rmi-modal-close { background: none; border: none; font-size: 1.25rem; color: #64748b; cursor: pointer; padding: 0.5rem; }
.rmi-modal-close:hover { color: #1e293b; }
.rmi-form-group { margin-bottom: 1rem; }
.rmi-form-label { display: block; font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem; }
.rmi-form-input, .rmi-form-select { width: 100%; padding: 0.75rem 1rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem; color: #1e293b; background: white; box-sizing: border-box; }
.rmi-form-select-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0.75rem 1rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem; color: #1e293b; background: white; cursor: pointer; text-align: left; }
.rmi-form-select-btn i { color: #64748b; font-size: 0.75rem; }
.rmi-modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
.rmi-btn-cancel { padding: 0.75rem 1.5rem; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; }
.rmi-btn-cancel:hover { background: #e2e8f0; }
.rmi-btn-save { padding: 0.75rem 1.5rem; background: #1e3a5f; color: white; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; }
.rmi-btn-save:hover { background: #15304f; }
.rmi-btn-save:disabled { background: #94a3b8; cursor: not-allowed; }
.rmi-accuracy-indicator { display: flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; margin-left: auto; }
.rmi-accuracy-indicator.accurate { color: #22c55e; }
.rmi-accuracy-indicator.outdated { color: #f59e0b; }
.rmi-review-section { margin-bottom: 2rem; }
.rmi-review-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
.rmi-review-title { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 0; }
.rmi-review-count { padding: 0.25rem 0.5rem; background: #e0f2fe; color: #0369a1; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
.rmi-review-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.rmi-review-card { background: #f8fafc; border-radius: 8px; padding: 1rem; border: 1px solid #e5e7eb; }
.rmi-review-card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
.rmi-review-card-avatar { width: 36px; height: 36px; border-radius: 50%; background: #e0f2fe; color: #0369a1; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.8125rem; }
.rmi-review-card-name { font-weight: 600; color: #1e293b; font-size: 0.9375rem; }
.rmi-review-card-details { display: flex; flex-direction: column; gap: 0.375rem; }
.rmi-review-card-detail { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; color: #64748b; }
.rmi-review-card-detail i { width: 16px; color: #94a3b8; }
.rmi-review-empty { text-align: center; padding: 1.5rem; color: #94a3b8; font-size: 0.875rem; }
.rmi-review-empty i { font-size: 1.5rem; margin-bottom: 0.5rem; display: block; }
.rmi-table-wrapper { overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; background: white; }
.rmi-table { width: 100%; border-collapse: collapse; min-width: 400px; }
.rmi-table th { background: #f8fafc; padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
.rmi-table td { padding: 0.75rem 1rem; font-size: 0.9375rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.rmi-table tr:last-child td { border-bottom: none; }
.rmi-table tr:hover td { background: #f8fafc; }
.rmi-name-cell { display: flex; align-items: center; gap: 0.5rem; font-weight: 500; }
.rmi-icon-small { color: #64748b; font-size: 0.875rem; }
.rmi-status-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
.rmi-status-active { background: #d1fae5; color: #059669; }
.rmi-status-pending { background: #fef3c7; color: #d97706; }
.rmi-status-training { background: #dbeafe; color: #2563eb; }
.rmi-goals-section { margin-top: 1.5rem; }
.rmi-goals-header { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: #6366f1; color: white; font-weight: 600; border-radius: 12px 12px 0 0; }
.rmi-goals-table-wrapper { border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; overflow: hidden; }
.rmi-goals-table { width: 100%; border-collapse: collapse; }
.rmi-goals-table th { background: #f8fafc; padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; }
.rmi-goals-table td { padding: 0.75rem 1rem; font-size: 0.9375rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; background: white; }
.rmi-goals-table tr:last-child td { border-bottom: none; }
.rmi-goals-td-plant { font-weight: 500; }
.rmi-goals-td-goal { }
.rmi-goals-input { width: 80px; padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.875rem; text-align: center; color: #1e293b; background: white; }
.rmi-goals-input:disabled { background: #f8fafc; color: #64748b; }
.rmi-goals-display { font-weight: 600; color: #1e293b; }
`

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
        <>
            <style>{rmiReportStyles}</style>
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
        </>
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
        <>
            <style>{rmiReportStyles}</style>
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
        </>
    )
}