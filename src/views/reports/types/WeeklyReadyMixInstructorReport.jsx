import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import { OperatorService } from '../../../services/OperatorService'

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

const POSITIONS = {
    MIXER: 'Mixer Operator',
    TRACTOR: 'Tractor Operator'
}

const CATEGORY_STYLES = {
    [POSITIONS.MIXER]: { className: 'rmi-mixer-header', icon: 'fa-truck-loading' },
    [POSITIONS.TRACTOR]: { className: 'rmi-tractor-header', icon: 'fa-tractor' }
}

function getPlantNameFromList(plantCode, plants) {
    const plant = plants?.find((p) => (p.plant_code || p.code) === plantCode)
    return plant?.name || plantCode || '—'
}

function RMIEmptyState({ icon = 'fa-user-slash', message }) {
    return (
        <div className="rmi-empty-state">
            <i className={`fas ${icon}`}></i>
            <p>{message}</p>
        </div>
    )
}

function RMICategoryHeader({ position, label, count, actions }) {
    const style = CATEGORY_STYLES[position] || CATEGORY_STYLES[POSITIONS.MIXER]
    return (
        <div className={`rmi-category-header ${style.className}`}>
            <i className={`fas ${style.icon}`}></i>
            <span>{label}</span>
            <span className="rmi-count-badge">{count}</span>
            {actions && <div className="rmi-category-actions">{actions}</div>}
        </div>
    )
}

function RMIDataTable({ headers, data, renderRow, emptyMessage, emptyIcon = 'fa-check-circle' }) {
    if (!data?.length) return <RMIEmptyState icon={emptyIcon} message={emptyMessage} />
    return (
        <div className="rmi-table-wrapper">
            <table className="rmi-table">
                <thead>
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i}>{h}</th>
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
                <tr key={trainer.id}>
                    <td className="rmi-name-cell">
                        <i className="fas fa-user-tie rmi-icon-small"></i>
                        {trainer.name}
                    </td>
                    <td>{getPlantNameFromList(trainer.plant, plants)}</td>
                    <td>
                        <span className="rmi-status-badge rmi-status-active">{trainer.status}</span>
                    </td>
                    {!readOnly && (
                        <td>
                            <button
                                type="button"
                                className="rmi-delete-btn"
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
                <tr key={op.id}>
                    <td className="rmi-name-cell">
                        <i className="fas fa-user rmi-icon-small"></i>
                        {op.name}
                    </td>
                    <td>{getPlantNameFromList(op.plant, plants)}</td>
                    <td>
                        <span className="rmi-date-badge">{op.startDate}</span>
                    </td>
                    {!readOnly && (
                        <td>
                            <button
                                type="button"
                                className="rmi-delete-btn"
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
                <tr key={op.id}>
                    <td className="rmi-name-cell">
                        <i className="fas fa-user rmi-icon-small"></i>
                        {op.name}
                    </td>
                    <td>{getPlantNameFromList(op.plant, plants)}</td>
                    <td>{op.trainer || '—'}</td>
                    {!readOnly && (
                        <td>
                            <button
                                type="button"
                                className="rmi-delete-btn"
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
                    {plants?.map((plant) => {
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
                                    <span className="rmi-goals-code-badge">{plantCode}</span>
                                </td>
                                <td className="rmi-goals-td-goal">
                                    {readOnly ? (
                                        <div className="rmi-goals-display">{hiringGoals[plantCode] || '0'}</div>
                                    ) : (
                                        <input
                                            type="number"
                                            min="0"
                                            className="rmi-goals-input"
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
        <div className="rmi-section">
            <div className="rmi-section-header">
                <div>
                    <h3 className="rmi-section-title">
                        <i className="fas fa-chalkboard-teacher"></i>Active Trainers by Position
                    </h3>
                    <p className="rmi-section-subtitle">Current instructors assigned to train new operators</p>
                </div>
            </div>
            <div className="rmi-trainers-grid">
                <div className="rmi-trainer-category">
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
                <div className="rmi-trainer-category">
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
        <div className="rmi-section">
            <div className="rmi-section-header">
                <div>
                    <h3 className="rmi-section-title">
                        <i className="fas fa-user-clock"></i>Pending Start Operators
                    </h3>
                    <p className="rmi-section-subtitle">New operators awaiting start date with assigned trainers</p>
                </div>
            </div>
            <div className="rmi-pending-grid">
                <div className="rmi-pending-category">
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
                <div className="rmi-pending-category">
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
        <div className="rmi-section">
            <div className="rmi-section-header">
                <div>
                    <h3 className="rmi-section-title">
                        <i className="fas fa-graduation-cap"></i>Training Operators
                    </h3>
                    <p className="rmi-section-subtitle">Operators currently in training with assigned trainers</p>
                </div>
            </div>
            <div className="rmi-pending-grid">
                <div className="rmi-pending-category">
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
                <div className="rmi-pending-category">
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
        <div className="rmi-section">
            <div className="rmi-section-header">
                <h3 className="rmi-section-title">
                    <i className="fas fa-bullseye"></i>Weekly Hiring Goals
                </h3>
                <p className="rmi-section-subtitle">
                    {readOnly ? 'Hiring targets for each plant location' : 'Set hiring targets for each plant location'}
                </p>
            </div>
            <HiringGoalsTable plants={plants} hiringGoals={hiringGoals} onChange={onChange} readOnly={readOnly} />
        </div>
    )
}

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
    }

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
    }, [plants])

    const createActionButtons = (pullFn, addFn, clearFn, isAccurate, dataLength) => (
        <>
            <button
                type="button"
                className="rmi-category-btn-new rmi-btn-pull"
                onClick={pullFn}
                disabled={isLoading || readOnly || isAccurate}
                title={isAccurate ? 'Data is up to date' : 'Pull live data'}
            >
                <i className="fas fa-sync-alt"></i>
                <span>Pull</span>
            </button>
            <button
                type="button"
                className="rmi-category-btn-new rmi-btn-add-new"
                onClick={addFn}
                disabled={readOnly}
                title="Add"
            >
                <i className="fas fa-plus"></i>
                <span>Add</span>
            </button>
            <button
                type="button"
                className="rmi-category-btn-new rmi-btn-clear"
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
            <style>{rmiReportStyles}</style>
            <div className="rmi-report-plugin">
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
                        <div className="rmi-modal-backdrop" onClick={() => setShowAddTrainerModal(false)}>
                            <div className="rmi-modal-container" onClick={(e) => e.stopPropagation()}>
                                <div className="rmi-modal-header-modern">
                                    <div className="rmi-modal-header-content">
                                        <i className="fas fa-user-plus"></i>
                                        <div>
                                            <h2>Add Trainer</h2>
                                            <span className="rmi-modal-subtitle">
                                                Select an existing trainer from your region
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="rmi-modal-close-modern"
                                        onClick={() => setShowAddTrainerModal(false)}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                                <div className="rmi-modal-body-modern">
                                    <div className="rmi-form-group-modern">
                                        <label>Position *</label>
                                        <select
                                            value={newTrainer.position}
                                            onChange={(e) =>
                                                setNewTrainer({
                                                    ...newTrainer,
                                                    position: e.target.value,
                                                    trainerId: ''
                                                })
                                            }
                                            className="rmi-form-select-modern"
                                        >
                                            <option value={POSITIONS.MIXER}>Mixer Operator</option>
                                            <option value={POSITIONS.TRACTOR}>Tractor Operator</option>
                                        </select>
                                    </div>
                                    <div className="rmi-form-group-modern">
                                        <label>Select Trainer *</label>
                                        <select
                                            value={newTrainer.trainerId}
                                            onChange={(e) =>
                                                setNewTrainer({ ...newTrainer, trainerId: e.target.value })
                                            }
                                            className="rmi-form-select-modern"
                                        >
                                            <option value="">Choose a trainer...</option>
                                            {getAvailableTrainers(newTrainer.position).map((trainer) => (
                                                <option key={trainer.employeeId} value={trainer.employeeId}>
                                                    {trainer.name} - {getPlantName(trainer.plantCode)}
                                                </option>
                                            ))}
                                        </select>
                                        {getAvailableTrainers(newTrainer.position).length === 0 && (
                                            <span className="rmi-form-helper-text">
                                                No trainers available for this position
                                            </span>
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
                                            <span>
                                                {newTrainer.plant ? getPlantName(newTrainer.plant) : 'Select Plant...'}
                                            </span>
                                            <i className="fas fa-chevron-down"></i>
                                        </button>
                                    </div>
                                </div>
                                <div className="rmi-modal-footer-modern">
                                    <button
                                        type="button"
                                        className="rmi-modal-btn-modern rmi-btn-cancel-modern"
                                        onClick={() => setShowAddTrainerModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="rmi-modal-btn-modern rmi-btn-save-modern"
                                        onClick={addTrainer}
                                    >
                                        <i className="fas fa-plus"></i>Add Trainer
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}

                {showAddPendingModal &&
                    ReactDOM.createPortal(
                        <div className="rmi-modal-backdrop" onClick={() => setShowAddPendingModal(false)}>
                            <div className="rmi-modal-container" onClick={(e) => e.stopPropagation()}>
                                <div className="rmi-modal-header-modern">
                                    <div className="rmi-modal-header-content">
                                        <i className="fas fa-user-clock"></i>
                                        <div>
                                            <h2>Add Pending Start Operator</h2>
                                            <span className="rmi-modal-subtitle">
                                                Add a new operator awaiting start date
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="rmi-modal-close-modern"
                                        onClick={() => setShowAddPendingModal(false)}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                                <div className="rmi-modal-body-modern">
                                    <div className="rmi-form-group-modern">
                                        <label>Position *</label>
                                        <select
                                            value={newPending.position}
                                            onChange={(e) => setNewPending({ ...newPending, position: e.target.value })}
                                            className="rmi-form-select-modern"
                                        >
                                            <option value={POSITIONS.MIXER}>Mixer Operator</option>
                                            <option value={POSITIONS.TRACTOR}>Tractor Operator</option>
                                        </select>
                                    </div>
                                    <div className="rmi-form-group-modern">
                                        <label>Operator Name *</label>
                                        <input
                                            type="text"
                                            value={newPending.name}
                                            onChange={(e) => setNewPending({ ...newPending, name: e.target.value })}
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
                                            <span>
                                                {newPending.plant ? getPlantName(newPending.plant) : 'Select Plant...'}
                                            </span>
                                            <i className="fas fa-chevron-down"></i>
                                        </button>
                                    </div>
                                    <div className="rmi-form-group-modern">
                                        <label>Start Date *</label>
                                        <input
                                            type="date"
                                            value={newPending.startDate}
                                            onChange={(e) =>
                                                setNewPending({ ...newPending, startDate: e.target.value })
                                            }
                                            className="rmi-form-input-modern"
                                        />
                                    </div>
                                    <div className="rmi-form-group-modern">
                                        <label>Assigned Trainer</label>
                                        <input
                                            type="text"
                                            value={newPending.trainer}
                                            onChange={(e) => setNewPending({ ...newPending, trainer: e.target.value })}
                                            className="rmi-form-input-modern"
                                            placeholder="Enter trainer name (optional)"
                                        />
                                    </div>
                                </div>
                                <div className="rmi-modal-footer-modern">
                                    <button
                                        type="button"
                                        className="rmi-modal-btn-modern rmi-btn-cancel-modern"
                                        onClick={() => setShowAddPendingModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="rmi-modal-btn-modern rmi-btn-save-modern"
                                        onClick={addPending}
                                    >
                                        <i className="fas fa-plus"></i>Add Operator
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
        <>
            <style>{rmiReportStyles}</style>
            <div className="rmi-report-plugin">
                <TrainersSection
                    mixerTrainers={mixerTrainers}
                    tractorTrainers={tractorTrainers}
                    plants={plants}
                    readOnly
                />
                <PendingSection mixerPending={mixerPending} tractorPending={tractorPending} plants={plants} readOnly />
                <TrainingSection
                    mixerTraining={mixerTraining}
                    tractorTraining={tractorTraining}
                    plants={plants}
                    readOnly
                />
                <HiringGoalsSection plants={plants} hiringGoals={hiringGoals} readOnly />
            </div>
        </>
    )
}
