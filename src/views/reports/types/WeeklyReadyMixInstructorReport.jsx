import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import { OperatorService } from '../../../services/OperatorService'
const POSITIONS = {
    MIXER: 'Mixer Operator',
    TRACTOR: 'Tractor Operator'
}
const CATEGORY_HEADER_COLORS = {
    [POSITIONS.MIXER]: 'bg-slate-700',
    [POSITIONS.TRACTOR]: 'bg-slate-600'
}
const CATEGORY_ICONS = {
    [POSITIONS.MIXER]: 'fa-truck-loading',
    [POSITIONS.TRACTOR]: 'fa-tractor'
}
const TH =
    'bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-gray-200 whitespace-nowrap'
const TD = 'px-4 py-3 text-[0.9375rem] text-slate-800 border-b border-slate-100 align-middle last:border-b-0'
const ACTION_BTN =
    'inline-flex items-center gap-1.5 rounded-md border border-white/30 bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white cursor-pointer transition-colors hover:bg-white/25 disabled:opacity-50 disabled:cursor-not-allowed'
function getPlantNameFromList(plantCode, plants) {
    const plant = plants?.find((p) => (p.plant_code || p.code) === plantCode)
    return plant?.name || plantCode || '—'
}
function RMIEmptyState({ icon = 'fa-user-slash', message }) {
    return (
        <div className="text-center p-8 text-slate-500">
            <i className={`fas ${icon} text-3xl text-slate-300 mb-3 block`}></i>
            <p className="m-0 text-sm">{message}</p>
        </div>
    )
}
function RMICategoryHeader({ position, label, count, actions }) {
    const bgColor = CATEGORY_HEADER_COLORS[position] || CATEGORY_HEADER_COLORS[POSITIONS.MIXER]
    const icon = CATEGORY_ICONS[position] || CATEGORY_ICONS[POSITIONS.MIXER]
    return (
        <div className={`flex items-center gap-3 p-4 text-white font-semibold ${bgColor}`}>
            <i className={`fas ${icon}`}></i>
            <span>{label}</span>
            <span className="ml-auto rounded-full bg-white/20 px-2.5 py-1 text-[0.8125rem]">{count}</span>
            {actions && <div className="flex gap-2 ml-2">{actions}</div>}
        </div>
    )
}
function RMIDataTable({ headers, data, renderRow, emptyMessage, emptyIcon = 'fa-check-circle' }) {
    if (!data?.length) return <RMIEmptyState icon={emptyIcon} message={emptyMessage} />
    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full min-w-[400px] border-collapse">
                <thead>
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i} className={TH}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>{data.map(renderRow)}</tbody>
            </table>
        </div>
    )
}
function TrainerTable({ trainers, plants, position, onRemove, readOnly }) {
    const headers = readOnly ? ['Trainer Name', 'Plant', 'Status'] : ['Trainer Name', 'Plant', 'Status', 'Action']
    return (
        <RMIDataTable
            headers={headers}
            data={trainers}
            emptyMessage={`No ${position === POSITIONS.MIXER ? 'mixer' : 'tractor'} trainers ${readOnly ? 'recorded' : '- pull live data or add manually'}`}
            emptyIcon="fa-user-slash"
            renderRow={(trainer) => (
                <tr key={trainer.id} className="hover:[&>td]:bg-slate-50">
                    <td className={TD}>
                        <div className="flex items-center gap-2 font-medium">
                            <i className="fas fa-user-tie text-sm text-slate-500"></i>
                            {trainer.name}
                        </div>
                    </td>
                    <td className={TD}>{getPlantNameFromList(trainer.plant, plants)}</td>
                    <td className={TD}>
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-600">
                            {trainer.status}
                        </span>
                    </td>
                    {!readOnly && (
                        <td className={TD}>
                            <button
                                type="button"
                                className="rounded-md border border-gray-200 bg-transparent p-2 text-slate-500 cursor-pointer hover:bg-red-100 hover:text-red-600 hover:border-red-200"
                                onClick={() => onRemove(position, trainer.id)}
                                title="Remove trainer"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </td>
                    )}
                </tr>
            )}
        />
    )
}
function PendingTable({ pending, plants, position, onRemove, readOnly }) {
    const headers = readOnly
        ? ['Operator Name', 'Plant', 'Start Date']
        : ['Operator Name', 'Plant', 'Start Date', 'Action']
    return (
        <RMIDataTable
            headers={headers}
            data={pending}
            emptyMessage={`No pending ${position === POSITIONS.MIXER ? 'mixer' : 'tractor'} operators`}
            renderRow={(op) => (
                <tr key={op.id} className="hover:[&>td]:bg-slate-50">
                    <td className={TD}>
                        <div className="flex items-center gap-2 font-medium">
                            <i className="fas fa-user text-sm text-slate-500"></i>
                            {op.name}
                        </div>
                    </td>
                    <td className={TD}>{getPlantNameFromList(op.plant, plants)}</td>
                    <td className={TD}>{op.startDate}</td>
                    {!readOnly && (
                        <td className={TD}>
                            <button
                                type="button"
                                className="rounded-md border border-gray-200 bg-transparent p-2 text-slate-500 cursor-pointer hover:bg-red-100 hover:text-red-600 hover:border-red-200"
                                onClick={() => onRemove(position, op.id)}
                                title="Remove pending operator"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </td>
                    )}
                </tr>
            )}
        />
    )
}
function TrainingTable({ training, plants, position, onRemove, readOnly }) {
    const headers = readOnly ? ['Operator Name', 'Plant', 'Trainer'] : ['Operator Name', 'Plant', 'Trainer', 'Action']
    return (
        <RMIDataTable
            headers={headers}
            data={training}
            emptyMessage={`No ${position === POSITIONS.MIXER ? 'mixer' : 'tractor'} operators in training`}
            renderRow={(op) => (
                <tr key={op.id} className="hover:[&>td]:bg-slate-50">
                    <td className={TD}>
                        <div className="flex items-center gap-2 font-medium">
                            <i className="fas fa-user text-sm text-slate-500"></i>
                            {op.name}
                        </div>
                    </td>
                    <td className={TD}>{getPlantNameFromList(op.plant, plants)}</td>
                    <td className={TD}>{op.trainer || '—'}</td>
                    {!readOnly && (
                        <td className={TD}>
                            <button
                                type="button"
                                className="rounded-md border border-gray-200 bg-transparent p-2 text-slate-500 cursor-pointer hover:bg-red-100 hover:text-red-600 hover:border-red-200"
                                onClick={() => onRemove(position, op.id)}
                                title="Remove training operator"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </td>
                    )}
                </tr>
            )}
        />
    )
}
function HiringGoalsTable({ plants, hiringGoals, onChange, readOnly }) {
    return (
        <div>
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        {['Plant Name', 'Code', 'Hiring Goal'].map((h) => (
                            <th key={h} className={TH}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {plants?.map((plant) => {
                        const plantCode = plant.plant_code || plant.code
                        const plantName = plant.name || plant.plant_name || plantCode
                        return (
                            <tr key={plantCode} className="hover:[&>td]:bg-slate-50">
                                <td className={`${TD} font-medium`}>
                                    <div className="flex items-center gap-2">
                                        <i className="fas fa-industry text-slate-400"></i>
                                        <span>{plantName}</span>
                                    </div>
                                </td>
                                <td className={TD}>
                                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                                        {plantCode}
                                    </span>
                                </td>
                                <td className={TD}>
                                    {readOnly ? (
                                        <div className="font-semibold text-slate-800">
                                            {hiringGoals[plantCode] || '0'}
                                        </div>
                                    ) : (
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-20 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-center text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                            value={hiringGoals[plantCode] || ''}
                                            onChange={(e) => onChange(plantCode, e.target.value)}
                                            placeholder="0"
                                        />
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
function TrainersSection({ mixerTrainers, tractorTrainers, plants, readOnly, onRemove, actions }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
            <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
                <div>
                    <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800 m-0">
                        <i className="fas fa-chalkboard-teacher text-slate-600"></i>Active Trainers by Position
                    </h3>
                    <p className="text-sm text-slate-500 mt-2 mb-0">
                        Current instructors assigned to train new operators
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6">
                <div className="rounded-xl border border-gray-200 bg-slate-50 overflow-hidden">
                    <RMICategoryHeader
                        position={POSITIONS.MIXER}
                        label="Mixer Trainers"
                        count={mixerTrainers.length}
                        actions={actions?.mixer}
                    />
                    <TrainerTable
                        trainers={mixerTrainers}
                        plants={plants}
                        position={POSITIONS.MIXER}
                        onRemove={onRemove}
                        readOnly={readOnly}
                    />
                </div>
                <div className="rounded-xl border border-gray-200 bg-slate-50 overflow-hidden">
                    <RMICategoryHeader
                        position={POSITIONS.TRACTOR}
                        label="Tractor Trainers"
                        count={tractorTrainers.length}
                        actions={actions?.tractor}
                    />
                    <TrainerTable
                        trainers={tractorTrainers}
                        plants={plants}
                        position={POSITIONS.TRACTOR}
                        onRemove={onRemove}
                        readOnly={readOnly}
                    />
                </div>
            </div>
        </div>
    )
}
function PendingSection({ mixerPending, tractorPending, plants, readOnly, onRemove, actions }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
            <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
                <div>
                    <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800 m-0">
                        <i className="fas fa-user-clock text-slate-600"></i>Pending Start Operators
                    </h3>
                    <p className="text-sm text-slate-500 mt-2 mb-0">
                        New operators awaiting start date with assigned trainers
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6">
                <div className="rounded-xl border border-gray-200 bg-slate-50 overflow-hidden mb-4">
                    <RMICategoryHeader
                        position={POSITIONS.MIXER}
                        label="Mixer Operators"
                        count={mixerPending.length}
                        actions={actions?.mixer}
                    />
                    <PendingTable
                        pending={mixerPending}
                        plants={plants}
                        position={POSITIONS.MIXER}
                        onRemove={onRemove}
                        readOnly={readOnly}
                    />
                </div>
                <div className="rounded-xl border border-gray-200 bg-slate-50 overflow-hidden mb-4">
                    <RMICategoryHeader
                        position={POSITIONS.TRACTOR}
                        label="Tractor Operators"
                        count={tractorPending.length}
                        actions={actions?.tractor}
                    />
                    <PendingTable
                        pending={tractorPending}
                        plants={plants}
                        position={POSITIONS.TRACTOR}
                        onRemove={onRemove}
                        readOnly={readOnly}
                    />
                </div>
            </div>
        </div>
    )
}
function TrainingSection({ mixerTraining, tractorTraining, plants, readOnly, onRemove, actions }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
            <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
                <div>
                    <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800 m-0">
                        <i className="fas fa-graduation-cap text-slate-600"></i>Training Operators
                    </h3>
                    <p className="text-sm text-slate-500 mt-2 mb-0">
                        Operators currently in training with assigned trainers
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6">
                <div className="rounded-xl border border-gray-200 bg-slate-50 overflow-hidden mb-4">
                    <RMICategoryHeader
                        position={POSITIONS.MIXER}
                        label="Mixer Operators"
                        count={mixerTraining.length}
                        actions={actions?.mixer}
                    />
                    <TrainingTable
                        training={mixerTraining}
                        plants={plants}
                        position={POSITIONS.MIXER}
                        onRemove={onRemove}
                        readOnly={readOnly}
                    />
                </div>
                <div className="rounded-xl border border-gray-200 bg-slate-50 overflow-hidden mb-4">
                    <RMICategoryHeader
                        position={POSITIONS.TRACTOR}
                        label="Tractor Operators"
                        count={tractorTraining.length}
                        actions={actions?.tractor}
                    />
                    <TrainingTable
                        training={tractorTraining}
                        plants={plants}
                        position={POSITIONS.TRACTOR}
                        onRemove={onRemove}
                        readOnly={readOnly}
                    />
                </div>
            </div>
        </div>
    )
}
function HiringGoalsSection({ plants, hiringGoals, onChange, readOnly }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
            <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800 m-0">
                    <i className="fas fa-bullseye text-slate-600"></i>Weekly Hiring Goals
                </h3>
                <p className="text-sm text-slate-500 mt-2 mb-0">
                    {readOnly ? 'Hiring targets for each plant location' : 'Set hiring targets for each plant location'}
                </p>
            </div>
            <HiringGoalsTable plants={plants} hiringGoals={hiringGoals} onChange={onChange} readOnly={readOnly} />
        </div>
    )
}
/** Submit-mode plugin for the Ready Mix Instructor report — manages trainer/trainee rosters by category (Mixer/Tractor) with operator selection. */
export function ReadyMixInstructorSubmitPlugin({ form, setForm, readOnly, plants }) {
    const [liveOperators, setLiveOperators] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [showAddTrainerModal, setShowAddTrainerModal] = useState(false)
    const [showAddPendingModal, setShowAddPendingModal] = useState(false)
    const [showPlantModal, setShowPlantModal] = useState(false)
    const [plantModalTarget, setPlantModalTarget] = useState(null)
    const [newTrainer, setNewTrainer] = useState({ plant: '', position: 'Mixer Operator', trainerId: '' })
    const [newPending, setNewPending] = useState({
        name: '',
        plant: '',
        position: 'Mixer Operator',
        startDate: '',
        trainer: ''
    })
    const snapshotData = React.useMemo(() => form?.snapshot_data || {}, [form])
    const mixerTrainers = React.useMemo(() => snapshotData.mixer_trainers || [], [snapshotData])
    const tractorTrainers = React.useMemo(() => snapshotData.tractor_trainers || [], [snapshotData])
    const mixerPending = React.useMemo(() => snapshotData.mixer_pending || [], [snapshotData])
    const tractorPending = React.useMemo(() => snapshotData.tractor_pending || [], [snapshotData])
    const mixerTraining = React.useMemo(() => snapshotData.mixer_training || [], [snapshotData])
    const tractorTraining = React.useMemo(() => snapshotData.tractor_training || [], [snapshotData])
    const hiringGoals = form?.hiring_goals || {}
    const isMixerTrainersAccurate = React.useMemo(() => {
        if (!liveOperators.length || mixerTrainers.length === 0) return false
        const liveTrainers = liveOperators.filter(
            (op) => op.isTrainer && op.status !== 'Terminated' && op.position === 'Mixer Operator'
        )
        if (mixerTrainers.length !== liveTrainers.length) return false
        const mixerTrainerIds = new Set(mixerTrainers.map((t) => t.id))
        return liveTrainers.every((op) => mixerTrainerIds.has(op.employeeId))
    }, [liveOperators, mixerTrainers])
    const isTractorTrainersAccurate = React.useMemo(() => {
        if (!liveOperators.length || tractorTrainers.length === 0) return false
        const liveTrainers = liveOperators.filter(
            (op) => op.isTrainer && op.status !== 'Terminated' && op.position === 'Tractor Operator'
        )
        if (tractorTrainers.length !== liveTrainers.length) return false
        const tractorTrainerIds = new Set(tractorTrainers.map((t) => t.id))
        return liveTrainers.every((op) => tractorTrainerIds.has(op.employeeId))
    }, [liveOperators, tractorTrainers])
    const isMixerPendingAccurate = React.useMemo(() => {
        if (!liveOperators.length || mixerPending.length === 0) return false
        const livePending = liveOperators.filter(
            (op) =>
                op.status === 'Pending Start' &&
                op.pendingStartDate &&
                op.pendingStartDate.trim() !== '' &&
                op.position === 'Mixer Operator'
        )
        if (mixerPending.length !== livePending.length) return false
        const mixerPendingIds = new Set(mixerPending.map((p) => p.id))
        return livePending.every((op) => mixerPendingIds.has(op.employeeId))
    }, [liveOperators, mixerPending])
    const isTractorPendingAccurate = React.useMemo(() => {
        if (!liveOperators.length || tractorPending.length === 0) return false
        const livePending = liveOperators.filter(
            (op) =>
                op.status === 'Pending Start' &&
                op.pendingStartDate &&
                op.pendingStartDate.trim() !== '' &&
                op.position === 'Tractor Operator'
        )
        if (tractorPending.length !== livePending.length) return false
        const tractorPendingIds = new Set(tractorPending.map((p) => p.id))
        return livePending.every((op) => tractorPendingIds.has(op.employeeId))
    }, [liveOperators, tractorPending])
    const isMixerTrainingAccurate = React.useMemo(() => {
        if (!liveOperators.length || mixerTraining.length === 0) return false
        const liveTraining = liveOperators.filter((op) => op.status === 'Training' && op.position === 'Mixer Operator')
        if (mixerTraining.length !== liveTraining.length) return false
        const mixerTrainingIds = new Set(mixerTraining.map((t) => t.id))
        return liveTraining.every((op) => mixerTrainingIds.has(op.employeeId))
    }, [liveOperators, mixerTraining])
    const isTractorTrainingAccurate = React.useMemo(() => {
        if (!liveOperators.length || tractorTraining.length === 0) return false
        const liveTraining = liveOperators.filter(
            (op) => op.status === 'Training' && op.position === 'Tractor Operator'
        )
        if (tractorTraining.length !== liveTraining.length) return false
        const tractorTrainingIds = new Set(tractorTraining.map((t) => t.id))
        return liveTraining.every((op) => tractorTrainingIds.has(op.employeeId))
    }, [liveOperators, tractorTraining])
    const loadLiveData = React.useCallback(
        async function loadLiveData() {
            setIsLoading(true)
            try {
                const plantCodes = plants ? new Set(plants.map((p) => p.plant_code || p.code).filter(Boolean)) : null
                const ops = await OperatorService.fetchOperators(plantCodes)
                setLiveOperators(ops || [])
            } catch (error) {
                console.error('Failed to load operators:', error)
                alert('Failed to load live data')
            } finally {
                setIsLoading(false)
            }
        },
        [plants]
    )
    function updateSnapshotData(key, value) {
        setForm((prev) => ({ ...prev, snapshot_data: { ...prev.snapshot_data, [key]: value } }))
    }
    function pullMixerTrainers() {
        if (!liveOperators.length) {
            alert('Please load live data first')
            return
        }
        const trainers = liveOperators.filter(
            (op) => op.isTrainer && op.status !== 'Terminated' && op.position === 'Mixer Operator'
        )
        updateSnapshotData(
            'mixer_trainers',
            trainers.map((op) => ({ id: op.employeeId, name: op.name, plant: op.plantCode, status: op.status }))
        )
    }
    function pullTractorTrainers() {
        if (!liveOperators.length) {
            alert('Please load live data first')
            return
        }
        const trainers = liveOperators.filter(
            (op) => op.isTrainer && op.status !== 'Terminated' && op.position === 'Tractor Operator'
        )
        updateSnapshotData(
            'tractor_trainers',
            trainers.map((op) => ({ id: op.employeeId, name: op.name, plant: op.plantCode, status: op.status }))
        )
    }
    function pullMixerPending() {
        if (!liveOperators.length) {
            alert('Please load live data first')
            return
        }
        const pending = liveOperators.filter(
            (op) => op.status === 'Pending Start' && op.pendingStartDate?.trim() && op.position === 'Mixer Operator'
        )
        updateSnapshotData(
            'mixer_pending',
            pending.map((op) => ({
                id: op.employeeId,
                name: op.name,
                plant: op.plantCode,
                startDate: op.pendingStartDate,
                trainer: op.assignedTrainer
            }))
        )
    }
    function pullTractorPending() {
        if (!liveOperators.length) {
            alert('Please load live data first')
            return
        }
        const pending = liveOperators.filter(
            (op) => op.status === 'Pending Start' && op.pendingStartDate?.trim() && op.position === 'Tractor Operator'
        )
        updateSnapshotData(
            'tractor_pending',
            pending.map((op) => ({
                id: op.employeeId,
                name: op.name,
                plant: op.plantCode,
                startDate: op.pendingStartDate,
                trainer: op.assignedTrainer
            }))
        )
    }
    function pullMixerTraining() {
        if (!liveOperators.length) {
            alert('Please load live data first')
            return
        }
        const training = liveOperators.filter((op) => op.status === 'Training' && op.position === 'Mixer Operator')
        updateSnapshotData(
            'mixer_training',
            training.map((op) => {
                const trainer = liveOperators.find((t) => t.employeeId === op.assignedTrainer)
                return {
                    id: op.employeeId,
                    name: op.name,
                    plant: op.plantCode,
                    trainer: trainer?.name || op.assignedTrainer || '—'
                }
            })
        )
    }
    function pullTractorTraining() {
        if (!liveOperators.length) {
            alert('Please load live data first')
            return
        }
        const training = liveOperators.filter((op) => op.status === 'Training' && op.position === 'Tractor Operator')
        updateSnapshotData(
            'tractor_training',
            training.map((op) => {
                const trainer = liveOperators.find((t) => t.employeeId === op.assignedTrainer)
                return {
                    id: op.employeeId,
                    name: op.name,
                    plant: op.plantCode,
                    trainer: trainer?.name || op.assignedTrainer || '—'
                }
            })
        )
    }
    function removeTrainer(position, id) {
        const key = position === POSITIONS.MIXER ? 'mixer_trainers' : 'tractor_trainers'
        updateSnapshotData(
            key,
            (snapshotData[key] || []).filter((t) => t.id !== id)
        )
    }
    function removePending(position, id) {
        const key = position === POSITIONS.MIXER ? 'mixer_pending' : 'tractor_pending'
        updateSnapshotData(
            key,
            (snapshotData[key] || []).filter((t) => t.id !== id)
        )
    }
    function removeTraining(position, id) {
        const key = position === POSITIONS.MIXER ? 'mixer_training' : 'tractor_training'
        updateSnapshotData(
            key,
            (snapshotData[key] || []).filter((t) => t.id !== id)
        )
    }
    function clearData(key) {
        if (!confirm(`Are you sure you want to clear all ${key.replace(/_/g, ' ')} data?`)) return
        updateSnapshotData(key, [])
    }
    function addTrainer() {
        if (!newTrainer.trainerId || !newTrainer.plant) {
            alert('Please select a trainer and plant')
            return
        }
        const selectedOperator = liveOperators.find((op) => op.employeeId === newTrainer.trainerId)
        if (!selectedOperator) {
            alert('Selected trainer not found')
            return
        }
        const key = newTrainer.position === POSITIONS.MIXER ? 'mixer_trainers' : 'tractor_trainers'
        const trainer = {
            id: selectedOperator.employeeId,
            name: selectedOperator.name,
            plant: newTrainer.plant,
            status: selectedOperator.status || 'Active'
        }
        updateSnapshotData(key, [...(snapshotData[key] || []), trainer])
        setNewTrainer({ plant: '', position: 'Mixer Operator', trainerId: '' })
        setShowAddTrainerModal(false)
    }
    function addPending() {
        if (!newPending.name || !newPending.plant || !newPending.startDate) {
            alert('Please fill in all required fields')
            return
        }
        const key = newPending.position === POSITIONS.MIXER ? 'mixer_pending' : 'tractor_pending'
        const pending = {
            id: `manual-${Date.now()}`,
            name: newPending.name,
            plant: newPending.plant,
            startDate: newPending.startDate,
            trainer: newPending.trainer
        }
        updateSnapshotData(key, [...(snapshotData[key] || []), pending])
        setNewPending({ name: '', plant: '', position: 'Mixer Operator', startDate: '', trainer: '' })
        setShowAddPendingModal(false)
    }
    function getPlantName(plantCode) {
        return getPlantNameFromList(plantCode, plants)
    }
    function getAvailableTrainers(position) {
        return liveOperators.filter((op) => op.isTrainer && op.status !== 'Terminated' && op.position === position)
    }
    function handleHiringGoalChange(plantCode, value) {
        if (setForm)
            setForm((prev) => ({ ...prev, hiring_goals: { ...(prev.hiring_goals || {}), [plantCode]: value } }))
    }
    useEffect(() => {
        loadLiveData()
    }, [plants, loadLiveData])
    const createActionButtons = (pullFn, addFn, clearFn, isAccurate, dataLength) => (
        <>
            <button
                type="button"
                className={ACTION_BTN}
                onClick={pullFn}
                disabled={isLoading || readOnly || isAccurate}
                title={isAccurate ? 'Data is up to date' : 'Pull live data'}
            >
                <i className="fas fa-sync-alt"></i>
                <span>Pull</span>
            </button>
            <button type="button" className={ACTION_BTN} onClick={addFn} disabled={readOnly} title="Add">
                <i className="fas fa-plus"></i>
                <span>Add</span>
            </button>
            <button
                type="button"
                className={ACTION_BTN}
                onClick={clearFn}
                disabled={readOnly || dataLength === 0}
                title="Clear all"
            >
                <i className="fas fa-trash-alt"></i>
                <span>Clear</span>
            </button>
        </>
    )
    const trainerActions = {
        mixer: createActionButtons(
            pullMixerTrainers,
            () => {
                setNewTrainer({ plant: '', position: POSITIONS.MIXER, trainerId: '' })
                setShowAddTrainerModal(true)
            },
            () => clearData('mixer_trainers'),
            isMixerTrainersAccurate,
            mixerTrainers.length
        ),
        tractor: createActionButtons(
            pullTractorTrainers,
            () => {
                setNewTrainer({ plant: '', position: POSITIONS.TRACTOR, trainerId: '' })
                setShowAddTrainerModal(true)
            },
            () => clearData('tractor_trainers'),
            isTractorTrainersAccurate,
            tractorTrainers.length
        )
    }
    const pendingActions = {
        mixer: createActionButtons(
            pullMixerPending,
            () => {
                setNewPending({ name: '', plant: '', position: POSITIONS.MIXER, startDate: '', trainer: '' })
                setShowAddPendingModal(true)
            },
            () => clearData('mixer_pending'),
            isMixerPendingAccurate,
            mixerPending.length
        ),
        tractor: createActionButtons(
            pullTractorPending,
            () => {
                setNewPending({ name: '', plant: '', position: POSITIONS.TRACTOR, startDate: '', trainer: '' })
                setShowAddPendingModal(true)
            },
            () => clearData('tractor_pending'),
            isTractorPendingAccurate,
            tractorPending.length
        )
    }
    const trainingActions = {
        mixer: createActionButtons(
            pullMixerTraining,
            () => {
                setNewPending({ name: '', plant: '', position: POSITIONS.MIXER, startDate: '', trainer: '' })
                setShowAddPendingModal(true)
            },
            () => clearData('mixer_training'),
            isMixerTrainingAccurate,
            mixerTraining.length
        ),
        tractor: createActionButtons(
            pullTractorTraining,
            () => {
                setNewPending({ name: '', plant: '', position: POSITIONS.TRACTOR, startDate: '', trainer: '' })
                setShowAddPendingModal(true)
            },
            () => clearData('tractor_training'),
            isTractorTrainingAccurate,
            tractorTraining.length
        )
    }
    return (
        <>
            <div>
                <TrainersSection
                    mixerTrainers={mixerTrainers}
                    tractorTrainers={tractorTrainers}
                    plants={plants}
                    readOnly={readOnly}
                    onRemove={removeTrainer}
                    actions={trainerActions}
                />
                <PendingSection
                    mixerPending={mixerPending}
                    tractorPending={tractorPending}
                    plants={plants}
                    readOnly={readOnly}
                    onRemove={removePending}
                    actions={pendingActions}
                />
                <TrainingSection
                    mixerTraining={mixerTraining}
                    tractorTraining={tractorTraining}
                    plants={plants}
                    readOnly={readOnly}
                    onRemove={removeTraining}
                    actions={trainingActions}
                />
                <HiringGoalsSection
                    plants={plants}
                    hiringGoals={hiringGoals}
                    onChange={handleHiringGoalChange}
                    readOnly={readOnly}
                />
                {showAddTrainerModal &&
                    ReactDOM.createPortal(
                        <div
                            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
                            onClick={() => setShowAddTrainerModal(false)}
                        >
                            <div
                                className="w-full max-w-[500px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <i className="fas fa-user-plus text-slate-600"></i>
                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-800 m-0">Add Trainer</h2>
                                            <span className="text-sm text-slate-500">
                                                Select an existing trainer from your region
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="border-none bg-transparent text-xl text-slate-500 cursor-pointer p-2 hover:text-slate-800"
                                        onClick={() => setShowAddTrainerModal(false)}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Position *
                                        </label>
                                        <select
                                            value={newTrainer.position}
                                            onChange={(e) =>
                                                setNewTrainer({
                                                    ...newTrainer,
                                                    position: e.target.value,
                                                    trainerId: ''
                                                })
                                            }
                                            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[0.9375rem] text-slate-800"
                                        >
                                            <option value={POSITIONS.MIXER}>Mixer Operator</option>
                                            <option value={POSITIONS.TRACTOR}>Tractor Operator</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Select Trainer *
                                        </label>
                                        <select
                                            value={newTrainer.trainerId}
                                            onChange={(e) =>
                                                setNewTrainer({ ...newTrainer, trainerId: e.target.value })
                                            }
                                            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[0.9375rem] text-slate-800"
                                        >
                                            <option value="">Choose a trainer...</option>
                                            {getAvailableTrainers(newTrainer.position).map((trainer) => (
                                                <option key={trainer.employeeId} value={trainer.employeeId}>
                                                    {trainer.name} - {getPlantName(trainer.plantCode)}
                                                </option>
                                            ))}
                                        </select>
                                        {getAvailableTrainers(newTrainer.position).length === 0 && (
                                            <span className="text-xs text-slate-400 mt-1">
                                                No trainers available for this position
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Assign to Plant *
                                        </label>
                                        <button
                                            type="button"
                                            className="flex items-center justify-between w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[0.9375rem] text-slate-800 text-left cursor-pointer"
                                            onClick={() => {
                                                setPlantModalTarget('trainer')
                                                setShowPlantModal(true)
                                            }}
                                        >
                                            <span className="flex items-center gap-2">
                                                <i className="fas fa-industry text-slate-500"></i>
                                                {newTrainer.plant ? getPlantName(newTrainer.plant) : 'Select Plant...'}
                                            </span>
                                            <i className="fas fa-chevron-down text-xs text-slate-500"></i>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        className="rounded-lg border-none bg-slate-100 px-6 py-3 text-[0.9375rem] font-semibold text-slate-600 cursor-pointer hover:bg-slate-200"
                                        onClick={() => setShowAddTrainerModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-lg border-none bg-slate-700 px-6 py-3 text-[0.9375rem] font-semibold text-white cursor-pointer hover:bg-slate-800"
                                        onClick={addTrainer}
                                    >
                                        <i className="fas fa-plus mr-1.5"></i>Add Trainer
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
                {showAddPendingModal &&
                    ReactDOM.createPortal(
                        <div
                            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
                            onClick={() => setShowAddPendingModal(false)}
                        >
                            <div
                                className="w-full max-w-[500px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <i className="fas fa-user-clock text-slate-600"></i>
                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-800 m-0">
                                                Add Pending Start Operator
                                            </h2>
                                            <span className="text-sm text-slate-500">
                                                Add a new operator awaiting start date
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="border-none bg-transparent text-xl text-slate-500 cursor-pointer p-2 hover:text-slate-800"
                                        onClick={() => setShowAddPendingModal(false)}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Position *
                                        </label>
                                        <select
                                            value={newPending.position}
                                            onChange={(e) => setNewPending({ ...newPending, position: e.target.value })}
                                            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[0.9375rem] text-slate-800"
                                        >
                                            <option value={POSITIONS.MIXER}>Mixer Operator</option>
                                            <option value={POSITIONS.TRACTOR}>Tractor Operator</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Operator Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={newPending.name}
                                            onChange={(e) => setNewPending({ ...newPending, name: e.target.value })}
                                            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[0.9375rem] text-slate-800"
                                            placeholder="Enter operator name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Assign to Plant *
                                        </label>
                                        <button
                                            type="button"
                                            className="flex items-center justify-between w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[0.9375rem] text-slate-800 text-left cursor-pointer"
                                            onClick={() => {
                                                setPlantModalTarget('pending')
                                                setShowPlantModal(true)
                                            }}
                                        >
                                            <span className="flex items-center gap-2">
                                                <i className="fas fa-industry text-slate-500"></i>
                                                {newPending.plant ? getPlantName(newPending.plant) : 'Select Plant...'}
                                            </span>
                                            <i className="fas fa-chevron-down text-xs text-slate-500"></i>
                                        </button>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Start Date *
                                        </label>
                                        <input
                                            type="date"
                                            value={newPending.startDate}
                                            onChange={(e) =>
                                                setNewPending({ ...newPending, startDate: e.target.value })
                                            }
                                            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[0.9375rem] text-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Assigned Trainer
                                        </label>
                                        <input
                                            type="text"
                                            value={newPending.trainer}
                                            onChange={(e) => setNewPending({ ...newPending, trainer: e.target.value })}
                                            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[0.9375rem] text-slate-800"
                                            placeholder="Enter trainer name (optional)"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        className="rounded-lg border-none bg-slate-100 px-6 py-3 text-[0.9375rem] font-semibold text-slate-600 cursor-pointer hover:bg-slate-200"
                                        onClick={() => setShowAddPendingModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-lg border-none bg-slate-700 px-6 py-3 text-[0.9375rem] font-semibold text-white cursor-pointer hover:bg-slate-800"
                                        onClick={addPending}
                                    >
                                        <i className="fas fa-plus mr-1.5"></i>Add Operator
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
                <PlantDropdownModal
                    isOpen={showPlantModal}
                    onClose={() => setShowPlantModal(false)}
                    plants={plants?.map((p) => ({ plantCode: p.plant_code || p.code, plantName: p.name })) || []}
                    onSelect={(plantCode) => {
                        if (plantModalTarget === 'trainer') setNewTrainer({ ...newTrainer, plant: plantCode })
                        else if (plantModalTarget === 'pending') setNewPending({ ...newPending, plant: plantCode })
                        setShowPlantModal(false)
                    }}
                    searchPlaceholder="Search plants..."
                />
            </div>
        </>
    )
}
/** Review-mode plugin for the Ready Mix Instructor report — read-only view of trainer/trainee assignments by category. */
export function ReadyMixInstructorReviewPlugin({ form, plants }) {
    const snapshotData = form?.snapshot_data || {}
    const mixerTrainers = snapshotData.mixer_trainers || []
    const tractorTrainers = snapshotData.tractor_trainers || []
    const mixerPending = snapshotData.mixer_pending || []
    const tractorPending = snapshotData.tractor_pending || []
    const mixerTraining = snapshotData.mixer_training || []
    const tractorTraining = snapshotData.tractor_training || []
    const hiringGoals = form?.hiring_goals || {}
    return (
        <div>
            <TrainersSection mixerTrainers={mixerTrainers} tractorTrainers={tractorTrainers} plants={plants} readOnly />
            <PendingSection mixerPending={mixerPending} tractorPending={tractorPending} plants={plants} readOnly />
            <TrainingSection mixerTraining={mixerTraining} tractorTraining={tractorTraining} plants={plants} readOnly />
            <HiringGoalsSection plants={plants} hiringGoals={hiringGoals} readOnly />
        </div>
    )
}
