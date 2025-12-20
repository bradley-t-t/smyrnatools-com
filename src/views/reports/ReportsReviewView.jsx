import React, {useEffect, useMemo, useState} from 'react'
import './styles/Reports.css'
import {UserService} from '../../services/UserService'
import {ReportService} from '../../services/ReportService'
import {PlantManagerReviewPlugin} from './types/WeeklyPlantManagerReport'
import {DistrictManagerReviewPlugin} from './types/WeeklyDistrictManagerReport'
import {EfficiencyReviewPlugin} from './types/WeeklyEfficiencyReport'
import {SafetyManagerReviewPlugin} from './types/WeeklySafetyManagerReport'
import {GeneralManagerReviewPlugin} from './types/WeeklyGeneralManagerReport'
import {ReadyMixInstructorReviewPlugin} from './types/WeeklyReadyMixInstructorReport'
import {ReportUtility} from '../../utils/ReportUtility'
import {exportGeneralManagerReport} from '../../utils/ExportUtility'

const plugins = {
    plant_manager: PlantManagerReviewPlugin,
    district_manager: DistrictManagerReviewPlugin,
    plant_production: EfficiencyReviewPlugin,
    safety_manager: SafetyManagerReviewPlugin,
    general_manager: GeneralManagerReviewPlugin,
    ready_mix_instructor: ReadyMixInstructorReviewPlugin
}

function ReportsReviewView({report, initialData, onBack, user, completedByUser, onManagerEdit}) {
    const [form, setForm] = useState(initialData?.data || initialData || {})
    const [maintenanceItems, setMaintenanceItems] = useState([])
    const [ownerName, setOwnerName] = useState('')
    const [submittedAt, setSubmittedAt] = useState('')
    const [summaryTab, setSummaryTab] = useState('summary')
    const [operatorOptions, setOperatorOptions] = useState([])
    const [assignedPlant, setAssignedPlant] = useState('')
    const [hasManagerEditPermission, setHasManagerEditPermission] = useState(false)
    const [showManagerEditButton, setShowManagerEditButton] = useState(false)
    const [plants, setPlants] = useState([])
    const [exporting, setExporting] = useState(false)
    const [exportError, setExportError] = useState('')
    const [isPlantShutdown, setIsPlantShutdown] = useState(false)

    useEffect(() => {
        if (report.name === 'plant_production' && operatorOptions.length > 0) {
            const rows = Array.isArray(form.rows) ? form.rows : []
            const excludedOperators = ReportUtility.getExcludedOperators(rows, operatorOptions)
            setIsPlantShutdown(excludedOperators.length === operatorOptions.length && operatorOptions.length > 0)
        } else {
            setIsPlantShutdown(false)
        }
    }, [report.name, form.rows, operatorOptions])

    useEffect(() => {
        async function fetchOwnerName() {
            const ownerId = completedByUser?.id || initialData?.user_id || report?.userId || user?.id
            if (!ownerId) {
                setOwnerName('')
                return
            }
            const name = completedByUser && (completedByUser.first_name || completedByUser.last_name)
                ? `${completedByUser.first_name || ''} ${completedByUser.last_name || ''}`.trim()
                : await UserService.getUserDisplayName(ownerId) || ownerId.slice(0, 8)
            setOwnerName(name)
        }

        fetchOwnerName()
    }, [report, user, initialData, completedByUser])

    useEffect(() => {
        async function fetchMaintenanceItems() {
            const weekIso = report.weekIso || initialData?.week
            if (!weekIso) {
                setMaintenanceItems([])
                return
            }
            const items = await ReportService.fetchMaintenanceItems(weekIso)
            setMaintenanceItems(items)
        }

        fetchMaintenanceItems()
    }, [report.weekIso, initialData?.week])

    useEffect(() => {
        setSubmittedAt(initialData?.submitted_at ? ReportUtility.formatDateTime(initialData.submitted_at) : '')
    }, [initialData])

    useEffect(() => {
        if (initialData?.data) {
            setForm(initialData.data)
        } else if (initialData) {
            setForm(initialData)
        }
    }, [initialData])

    const plantCode = useMemo(() => {
        if (form.plant) return form.plant
        if (Array.isArray(form.rows) && form.rows.length > 0) return form.rows[0].plant_code || ''
        return ''
    }, [form.plant, form.rows])

    useEffect(() => {
        async function fetchOperatorOptions() {
            if (report.name !== 'plant_production') {
                setOperatorOptions([])
                return
            }
            if (!plantCode) {
                setOperatorOptions([])
                return
            }
            const options = await ReportService.fetchOperatorOptions(plantCode)
            setOperatorOptions(options)
        }

        fetchOperatorOptions()
    }, [report.name, plantCode])

    useEffect(() => {
        async function fetchAssignedPlant() {
            if ((report.name === 'plant_manager' || report.name === 'district_manager' || report.name === 'plant_production') && completedByUser && completedByUser.id) {
                const plant = await UserService.getUserPlant(completedByUser.id)
                setAssignedPlant(plant || '')
            }
        }

        fetchAssignedPlant()
    }, [report.name, completedByUser])

    useEffect(() => {
        async function checkPermissionAndRoleWeight() {
            if (user && user.id) {
                const perm = await UserService.hasPermission(user.id, 'reports.edit.others')
                setHasManagerEditPermission(!!perm)
                let ownerId = completedByUser?.id || initialData?.user_id || report?.userId
                if (ownerId && ownerId !== user.id) {
                    const userRole = await UserService.getHighestRole(user.id)
                    const ownerRole = await UserService.getHighestRole(ownerId)
                    if (userRole && ownerRole && userRole.weight > ownerRole.weight) {
                        setShowManagerEditButton(true)
                    } else {
                        setShowManagerEditButton(false)
                    }
                } else {
                    setShowManagerEditButton(false)
                }
            } else {
                setHasManagerEditPermission(false)
                setShowManagerEditButton(false)
            }
        }

        checkPermissionAndRoleWeight()
    }, [user, completedByUser, initialData, report])

    useEffect(() => {
        async function fetchPlants() {
            const list = await ReportService.fetchPlantsSorted()
            setPlants(list)
        }

        fetchPlants()
    }, [])

    let reportTitle = report.title || 'Report Review'

    let {yph, yphGrade, yphLabel, lost, lostGrade, lostLabel} = ReportService.getYardageMetrics(form)
    ReportService.getYphColor(yphGrade)
    ReportService.getYphColor(lostGrade)
    const PluginComponent = plugins[report.name]
    const isSubmitted = !!initialData?.completed

    let statusText = isSubmitted ? 'Submitted' : 'Saved (Draft)'

    const tabOptions = [
        {key: 'review', label: 'Review'},
        {key: 'overview', label: 'Overview'}
    ]
    const [, setActiveTab] = useState(tabOptions[0].key)

    useEffect(() => {
        setActiveTab(tabOptions[0].key)
    }, [report.name])

    const weekVerbose = ReportUtility.getWeekVerbose(report.weekIso || initialData?.week)
    const reportDateVerbose = form.report_date ? ReportUtility.formatVerboseDate(form.report_date) : ''

    async function handleExport() {
        if (exporting) return
        setExportError('')
        setExporting(true)
        try {
            await exportGeneralManagerReport({
                form,
                plants,
                weekIso: report.weekIso || initialData?.week
            })
        } catch (e) {
            setExportError(e?.message || 'Export failed')
        }
        setExporting(false)
    }

    return (
        <div className="rpts-reports-review-view">
            <div className="rpts-reports-review-container">
                <div className="rpts-report-header">
                    <div className="rpts-report-header-top">
                        <div className="rpts-report-header-left">
                            <button className="rpts-report-back-btn" onClick={onBack} type="button">
                                <i className="fas fa-arrow-left"></i> Back
                            </button>
                            <h1 className="rpts-report-header-title">{reportTitle}</h1>
                        </div>
                        <div className="rpts-report-header-actions">
                            <div className={`rpts-report-status-badge ${isSubmitted ? 'submitted' : 'draft'}`}>
                                <i className={`fas ${isSubmitted ? 'fa-check-circle' : 'fa-save'}`}></i>
                                {statusText}
                            </div>
                            {report.name === 'general_manager' && (
                                <button type="button" className="rpts-manager-edit-button" disabled={exporting}
                                        onClick={handleExport}>
                                    <i className="fas fa-file-export"></i>
                                    {exporting ? 'Exporting...' : 'Export'}
                                </button>
                            )}
                            {hasManagerEditPermission && showManagerEditButton && (
                                <button type="button" className="rpts-manager-edit-button"
                                        onClick={() => onManagerEdit(report, initialData)}>
                                    <i className="fas fa-edit"></i>
                                    Manager Edit
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="rpts-report-header-divider"></div>
                    <div className="rpts-report-header-meta">
                        {weekVerbose && (
                            <div className="rpts-report-meta-item">
                                <i className="far fa-calendar-alt"></i>
                                <span>Week:</span>
                                <strong>{weekVerbose}</strong>
                            </div>
                        )}
                        {reportDateVerbose && (
                            <div className="rpts-report-meta-item">
                                <i className="far fa-calendar-check"></i>
                                <span>Report Date:</span>
                                <strong>{reportDateVerbose}</strong>
                            </div>
                        )}
                        {ownerName && (
                            <div className="rpts-report-meta-item">
                                <i className="fas fa-user"></i>
                                <span>Submitted By:</span>
                                <strong>{ownerName}</strong>
                            </div>
                        )}
                        {assignedPlant && (
                            <div className="rpts-report-meta-item">
                                <i className="fas fa-industry"></i>
                                <span>Plant:</span>
                                <strong>{assignedPlant}</strong>
                            </div>
                        )}
                        {submittedAt && (
                            <div className="rpts-report-meta-item">
                                <i className="far fa-clock"></i>
                                <span>{isSubmitted ? 'Submitted:' : 'Saved:'}</span>
                                <strong>{submittedAt}</strong>
                            </div>
                        )}
                    </div>
                </div>
                {exportError && <div className="rpts-sbmt-error">{exportError}</div>}
                {isPlantShutdown && (
                    <div className="rpts-plant-shutdown-notice">
                        <i className="fas fa-info-circle"></i>
                        <span>Plant was shut down on {reportDateVerbose || 'the reported date'}</span>
                    </div>
                )}
                <div className="rpts-form-body-wide">
                    <>
                        {report.name === 'plant_manager' ? (
                            <div className="pm-metrics-section pm-production-data-section">
                                <div className="pm-metrics-header">
                                    <h3 className="pm-metrics-title">
                                        <i className="fas fa-clipboard-list"></i>
                                        Weekly Production Data
                                    </h3>
                                    <p className="pm-metrics-subtitle">
                                        Key production metrics for this reporting period
                                    </p>
                                </div>
                                <div className="pm-production-grid">
                                    {report.fields.map(field => (
                                        field.name === 'issues' || field.type === 'table' ? null : (
                                            <div key={field.name} className="pm-production-field">
                                                <div className="pm-production-field-header">
                                                    <i className={`fas ${field.name === 'yardage' ? 'fa-box' : field.name === 'total_hours' ? 'fa-clock' : field.name === 'total_yards_lost' ? 'fa-exclamation-triangle' : 'fa-recycle'} pm-production-field-icon`}></i>
                                                    <label>{field.name === 'yardage' ? 'Total Yardage' : field.label}</label>
                                                </div>
                                                <input type={field.type} value={form[field.name] ?? ''} readOnly
                                                       disabled className="pm-production-input"/>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        ) : report.name === 'plant_production' || report.name === 'general_manager' || report.name === 'aggregate_production' || report.name === 'district_manager' || report.name === 'ready_mix_instructor' ? null : (
                            <div className="rpts-form-fields-grid">
                                {report.fields.map(field => (
                                    (report.name === 'safety_manager' && field.name === 'issues') || field.type === 'table' ? null : (
                                        <div key={field.name} className="rpts-form-field-wide">
                                            <label>
                                                {field.name === 'yardage' ? 'Total Yardage' : field.label}
                                                {field.required && <span className="rpts-modal-required">*</span>}
                                            </label>
                                            {field.type === 'textarea' || (typeof form[field.name] === 'string' && form[field.name].length > 80) ? (
                                                <textarea
                                                    value={form[field.name] ?? ''}
                                                    readOnly
                                                    disabled
                                                />
                                            ) : field.type === 'select' ? (
                                                <select value={form[field.name] ?? ''} readOnly disabled>
                                                    <option value="">Select...</option>
                                                    {field.options?.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input type={field.type} value={form[field.name] ?? ''} readOnly
                                                       disabled/>
                                            )}
                                        </div>
                                    )
                                ))}
                            </div>
                        )}
                        {PluginComponent && (
                            <PluginComponent
                                form={form}
                                yph={yph}
                                yphGrade={yphGrade}
                                yphLabel={yphLabel}
                                lost={lost}
                                lostGrade={lostGrade}
                                lostLabel={lostLabel}
                                summaryTab={summaryTab}
                                setSummaryTab={setSummaryTab}
                                maintenanceItems={maintenanceItems}
                                operatorOptions={operatorOptions}
                                plants={plants}
                                weekIso={report.weekIso || initialData?.week}
                                user={completedByUser || user}
                                assignedPlant={assignedPlant}
                                reportUserId={initialData?.user_id}
                            />
                        )}
                        {report.name === 'aggregate_production' && (
                            <div className="rpt-table-wrapper">
                                <table className="rpt-table">
                                    <thead>
                                    <tr>
                                        <th>Material</th>
                                        <th>Amount</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {report.fields.map(field => (
                                        <tr key={field.name}>
                                            <td>{field.label}</td>
                                            <td>{form[field.name] || 0}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                </div>
            </div>
        </div>
    )
}

export default ReportsReviewView