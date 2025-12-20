import React, {useEffect, useState} from 'react'
import './styles/Reports.css'
import {ReportService} from '../../services/ReportService'
import {PlantManagerSubmitPlugin} from './types/WeeklyPlantManagerReport'
import {DistrictManagerSubmitPlugin} from './types/WeeklyDistrictManagerReport'
import {EfficiencySubmitPlugin} from './types/WeeklyEfficiencyReport'
import {SafetyManagerSubmitPlugin} from './types/WeeklySafetyManagerReport'
import {GeneralManagerSubmitPlugin} from './types/WeeklyGeneralManagerReport'
import {AggregateProductionSubmitPlugin} from './types/WeeklyAggregateProductionReport'
import {ReadyMixInstructorSubmitPlugin} from './types/WeeklyReadyMixInstructorReport'
import {ReportUtility} from '../../utils/ReportUtility'
import {EmailUtility} from '../../utils/EmailUtility'
import {exportGeneralManagerReport} from '../../utils/ExportUtility'
import {DateUtility} from '../../utils/DateUtility'

const plugins = {
    plant_manager: PlantManagerSubmitPlugin,
    district_manager: DistrictManagerSubmitPlugin,
    plant_production: EfficiencySubmitPlugin,
    safety_manager: SafetyManagerSubmitPlugin,
    general_manager: GeneralManagerSubmitPlugin,
    aggregate_production: AggregateProductionSubmitPlugin,
    ready_mix_instructor: ReadyMixInstructorSubmitPlugin
}

function ReportsSubmitView({
                               report,
                               initialData,
                               onBack,
                               onSubmit,
                               user,
                               readOnly,
                               allReports,
                               managerEditUser,
                               userProfiles
                           }) {
    const isGM = (report?.name === 'general_manager') || (/general manager/i.test(report?.title || ''))

    const forcedReportDate = React.useMemo(() => {
        if (report.name !== 'plant_production') return ''
        const sunday = new Date(report.weekIso)
        const monday = new Date(sunday)
        const week = DateUtility.getISOWeek(sunday)
        const dayIndex = (week + 1) % 6
        const dayOfWeek = dayIndex + 1
        const forcedDate = new Date(monday)
        forcedDate.setDate(monday.getDate() + (dayOfWeek - 1))
        return forcedDate.toISOString().slice(0, 10)
    }, [report.name, report.weekIso])

    const nextForcedReportDate = React.useMemo(() => {
        if (report.name !== 'plant_production' || !forcedReportDate) return ''
        const nextDate = new Date(forcedReportDate)
        const addDays = new Date(forcedReportDate).getDay() === 6 ? 10 : 9
        nextDate.setDate(nextDate.getDate() + addDays)
        return nextDate.toISOString().slice(0, 10)
    }, [report.name, forcedReportDate])

    const [form, setForm] = useState(() => {
        if (initialData) {
            if (initialData.data) {
                return {...Object.fromEntries(report.fields.map(f => [f.name, f.type === 'table' ? [] : ''])), ...initialData.data, ...(initialData.rows ? {rows: initialData.rows} : {})}
            }
            return {...Object.fromEntries(report.fields.map(f => [f.name, f.type === 'table' ? [] : ''])), ...initialData}
        }
        return Object.fromEntries(report.fields.map(f => [f.name, f.type === 'table' ? [] : '']))
    })
    const [submitting, setSubmitting] = useState(false)
    const [savingDraft, setSavingDraft] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [maintenanceItems, setMaintenanceItems] = useState([])
    const [summaryTab, setSummaryTab] = useState('summary')
    const [yph, setYph] = useState(null)
    const [yphGrade, setYphGrade] = useState('')
    const [yphLabel, setYphLabel] = useState('')
    const [lost, setLost] = useState(null)
    const [lostGrade, setLostGrade] = useState('')
    const [lostLabel, setLostLabel] = useState('')
    const [carouselIndex, setCarouselIndex] = useState(0)
    const [operatorOptions, setOperatorOptions] = useState([])
    const [mixers, setMixers] = useState([])
    const [plants, setPlants] = useState([])
    const [excludedOperators, setExcludedOperators] = useState([])
    const [saveMessage, setSaveMessage] = useState('')
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [initialFormSnapshot, setInitialFormSnapshot] = useState(null)
    const [, setDebugMsg] = useState('')
    const [showConfirmationModal, setShowConfirmationModal] = useState(false)
    const [confirmationChecks, setConfirmationChecks] = useState([false, false])
    const [exporting, setExporting] = useState(false)
    const [exportError, setExportError] = useState('')

    const PluginComponent = plugins[report.name]
    const targetUserId = managerEditUser || user?.id

    function handleChange(e, name, idx, colName) {
        if (report.name === 'plant_production' && name === 'rows') {
            const updatedRows = [...(form.rows || [])]
            if (colName === 'name' || colName === 'truck_number') {
                return
            } else {
                updatedRows[idx][colName] = e.target.value
            }
            setForm({...form, rows: updatedRows})
            return
        }
        if (report.name === 'general_manager' && name.startsWith('plant_field_')) {
            setForm({...form, [name]: e.target.value})
            return
        }
        let value = e.target.value
        if (
            ['total_yards_lost', 'yardage_lost', 'lost_yardage', 'Yardage Lost', 'yardage_lost'].includes(name)
            && value !== ''
            && !isNaN(Number(value))
            && Number(value) < 0
        ) {
            value = 0
        }
        setForm({...form, [name]: value})
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setSuccess(false)
        if (report.name === 'plant_manager') {
            setShowConfirmationModal(true)
            return
        }
        if (report.name === 'safety_manager') {
            const issues = Array.isArray(form.issues) ? form.issues : []
            if (issues.some(i => !i.description || !i.plant || !i.tag)) {
                setError('All issues must have a description, plant, and tag.')
                return
            }
        }
        if (report.name !== 'general_manager') {
            for (const field of report.fields) {
                const val = form[field.name]
                if (field.required && (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0))) {
                    setError('Please fill out all required fields before submitting.')
                    return
                }
            }
        } else {
            if (plants.length > 0) {
                for (const plant of plants) {
                    const code = plant.plant_code
                    const requiredFields = [
                        `active_operators_${code}`,
                        `runnable_trucks_${code}`,
                        `down_trucks_${code}`,
                        `operators_starting_${code}`,
                        `new_operators_training_${code}`,
                        `operators_leaving_${code}`,
                        `total_yardage_${code}`,
                        `total_hours_${code}`
                    ]
                    for (const field of requiredFields) {
                        const val = form[field]
                        if (val === undefined || val === null || val === '') {
                            setError('Please fill out all required fields before submitting.')
                            return
                        }
                    }
                }
            }
        }
        if (report.name === 'plant_production') {
            const v = ReportUtility.validatePlantProduction(form, operatorOptions)
            if (v) {
                setError(v)
                return
            }
        }
        setSubmitting(true)
        try {
            await onSubmit(form, 'submit')
            setSuccess(true)
            await EmailUtility.sendReportSubmittedEmail({report, weekVerbose})
        } catch (err) {
            setError(err?.message || 'Error submitting report')
        }
        setSubmitting(false)
    }

    async function handleConfirmedSubmit() {
        setShowConfirmationModal(false)
        setSubmitting(true)
        setError('')
        setSuccess(false)
        try {
            const submitData = {...form}
            if (report.name === 'plant_manager' && user && user.plant_code && !submitData.plant) {
                submitData.plant = user.plant_code
            }
            await onSubmit(submitData, 'submit')
            setSuccess(true)
            await EmailUtility.sendReportSubmittedEmail({report, weekVerbose})
        } catch (err) {
            setError(err?.message || 'Error submitting report')
        }
        setSubmitting(false)
    }

    async function handleSaveDraft(e) {
        e.preventDefault()
        setError('')
        setSuccess(false)
        setSaveMessage('')
        if (managerEditUser && report.name === 'plant_production') {
            const v = ReportUtility.validatePlantProduction(form, operatorOptions)
            if (v) {
                setError(v)
                return
            }
        }
        setSavingDraft(true)
        try {
            await onSubmit(form, 'draft')
            setSaveMessage('Changes saved.')
            setInitialFormSnapshot(JSON.stringify(form))
            setHasUnsavedChanges(false)
            if (managerEditUser) await EmailUtility.sendReportSubmittedEmail({report, weekVerbose})
        } catch (err) {
            setError(err?.message || 'Error saving draft')
        }
        setSavingDraft(false)
    }

    function handleExcludeOperator(idx) {
        const updatedRows = [...(form.rows || [])]
        if (updatedRows[idx]) {
            updatedRows.splice(idx, 1)
        }
        let newIndex = carouselIndex
        if (newIndex >= updatedRows.length) {
            newIndex = Math.max(0, updatedRows.length - 1)
        }
        setForm({...form, rows: updatedRows})
        setCarouselIndex(newIndex)
    }

    function handleReincludeOperator(operatorId) {
        if (!operatorId) return
        const mixer = mixers.find(m => m.assigned_operator === operatorId)
        const newRow = {
            name: operatorId,
            truck_number: mixer && mixer.truck_number ? mixer.truck_number : '',
            start_time: '',
            first_load: '',
            eod_in_yard: '',
            punch_out: '',
            loads: '',
            comments: ''
        }
        setForm(f => {
            const rows = [...(f.rows || []), newRow]
            return {...f, rows}
        })
        setCarouselIndex(form.rows ? form.rows.length : 0)
    }

    function handleBackClick() {
        if (hasUnsavedChanges) {
            handleSaveDraft({
                preventDefault: () => {
                }
            })
            setTimeout(() => onBack(), 800)
        } else {
            onBack()
        }
    }

    async function handleExport() {
        if (exporting) return
        setExportError('')
        setExporting(true)
        try {
            await exportGeneralManagerReport({
                form,
                plants,
                weekIso: report.weekIso
            })
        } catch (e) {
            setExportError(e?.message || 'Export failed')
        }
        setExporting(false)
    }

    useEffect(() => {
        async function fetchPlants() {
            const targetUserId = managerEditUser || user?.id
            if (targetUserId) {
                const list = await ReportService.fetchPlantsForUser(targetUserId)
                setPlants(list)
            } else {
                const list = await ReportService.fetchPlantsSorted()
                setPlants(list)
            }
        }

        fetchPlants()
    }, [user, managerEditUser])

    useEffect(() => {
        async function fetchMaintenanceItems() {
            if (!report.weekIso) return
            const items = await ReportService.fetchMaintenanceItems(report.weekIso)
            setMaintenanceItems(items)
        }

        fetchMaintenanceItems()
    }, [report.weekIso])

    useEffect(() => {
        if (report.name === 'plant_production' && !form.plant && user && plants.length > 0) {
            const userPlant = user?.plant_code && plants.some(p => p.plant_code === user.plant_code) ? user.plant_code : plants[0]?.plant_code || ''
            setForm(f => ({...f, plant: userPlant}))
        }
    }, [report.name, form.plant, user, plants])

    useEffect(() => {
        async function fetchOperatorsAndMixers(plantCode) {
            if (!plantCode) {
                setOperatorOptions([])
                setMixers([])
                setForm(f => ({...f, rows: []}))
                return
            }
            const {
                operatorOptions,
                mixers,
                activeOperators
            } = await ReportService.fetchActiveOperatorsAndMixers(plantCode)
            setOperatorOptions(operatorOptions)
            setMixers(mixers)
            if (report.name === 'plant_production' && !readOnly) {
                if ((!initialData || !initialData.rows || initialData.rows.length === 0) && (!form.rows || form.rows.length === 0)) {
                    const rows = []
                    activeOperators.forEach(op => {
                        const mixer = mixers.find(m => m.assigned_operator === op.employee_id)
                        rows.push({
                            name: op.employee_id,
                            truck_number: mixer && mixer.truck_number ? mixer.truck_number : '',
                            start_time: '',
                            first_load: '',
                            eod_in_yard: '',
                            punch_out: '',
                            loads: '',
                            comments: ''
                        })
                    })
                    setForm(f => ({...f, rows}))
                    setCarouselIndex(0)
                }
            }
        }

        if (report.name === 'plant_production') {
            const plantCode = form.plant
            if (!plantCode) {
                setForm(f => ({...f, rows: []}))
                return
            }
            fetchOperatorsAndMixers(plantCode)
        }
    }, [report.name, form.plant, user, readOnly, plants])

    useEffect(() => {
        if (initialData) {
            if (initialData.data) {
                setForm(() => ({
                    ...Object.fromEntries(report.fields.map(f => [f.name, f.type === 'table' ? [] : ''])),
                    ...initialData.data,
                    ...(initialData.rows ? {rows: initialData.rows} : {})
                }))
            } else {
                setForm(() => ({
                    ...Object.fromEntries(report.fields.map(f => [f.name, f.type === 'table' ? [] : ''])),
                    ...initialData
                }))
            }
        }
    }, [initialData])

    useEffect(() => {
        let {yph, yphGrade, yphLabel, lost, lostGrade, lostLabel} = ReportService.getYardageMetrics(form)
        setYph(yph)
        setYphGrade(yphGrade)
        setYphLabel(yphLabel)
        setLost(lost)
        setLostGrade(lostGrade)
        setLostLabel(lostLabel)
    }, [form, report.name])

    useEffect(() => {
        if (report.name === 'plant_production' && Array.isArray(form.rows) && Array.isArray(operatorOptions)) {
            const excluded = ReportUtility.getExcludedOperators(form.rows, operatorOptions)
            setExcludedOperators(excluded)
        }
    }, [form.rows, operatorOptions, report.name])

    useEffect(() => {
        if (
            (report.name !== 'plant_production') ||
            (report.name === 'plant_production' && plants.length > 0 && operatorOptions.length > 0 && Array.isArray(form.rows))
        ) {
            if (initialFormSnapshot === null) {
                setInitialFormSnapshot(JSON.stringify(form))
            }
        }
    }, [report.name, plants, operatorOptions, form.rows, initialData])

    useEffect(() => {
        if (initialFormSnapshot !== null) {
            setHasUnsavedChanges(JSON.stringify(form) !== initialFormSnapshot)
        }
    }, [form, initialFormSnapshot])

    useEffect(() => {
        if (report.name === 'plant_manager' && user && user.plant_code) {
            setForm(f => ({...f, plant: user.plant_code}))
        }
    }, [report.name, user])

    useEffect(() => {
        if (report.name === 'plant_production' && forcedReportDate) {
            setForm(f => ({...f, report_date: forcedReportDate}))
        }
    }, [report.name, forcedReportDate])

    let editingUserName = ''
    if (managerEditUser && userProfiles && userProfiles[managerEditUser]) {
        const profile = userProfiles[managerEditUser]
        editingUserName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    } else if (managerEditUser) {
        editingUserName = managerEditUser.slice(0, 8)
    }

    const weekVerbose = ReportUtility.getWeekVerbose(report.weekIso)
    const reportDateVerbose = form.report_date ? ReportUtility.formatVerboseDate(form.report_date) : ''
    const isCompleted = initialData?.completed || false

    return (
        <div className="rpts-sbmt-root">
            <div className="rpts-sbmt-container">
                {managerEditUser && (
                    <div className="rpts-sbmt-edit-banner">
                        <i className="fas fa-edit"></i>
                        {`Editing ${editingUserName}'s Report`}
                    </div>
                )}
                <div className="rpts-report-header">
                    <div className="rpts-report-header-top">
                        <div className="rpts-report-header-left">
                            <button className="rpts-report-back-btn" onClick={handleBackClick} type="button">
                                <i className="fas fa-arrow-left"></i> Back
                            </button>
                            <h1 className="rpts-report-header-title">{report.title || ''}</h1>
                        </div>
                        <div className="rpts-report-header-actions">
                            <div className={`rpts-report-status-badge ${isCompleted ? 'submitted' : 'draft'}`}>
                                <i className={`fas ${isCompleted ? 'fa-check-circle' : 'fa-edit'}`}></i>
                                {readOnly ? 'View Only' : (isCompleted ? 'Submitted' : 'Editing')}
                            </div>
                            {isGM && (
                                <button type="button" className="rpts-manager-edit-button" onClick={handleExport}
                                        disabled={exporting}>
                                    <i className="fas fa-file-export"></i>
                                    {exporting ? 'Exporting...' : 'Export'}
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
                        {(report.name === 'plant_production' && form.plant) && (
                            <div className="rpts-report-meta-item">
                                <i className="fas fa-industry"></i>
                                <span>Plant:</span>
                                <strong>{form.plant}</strong>
                            </div>
                        )}
                    </div>
                </div>
                {exportError && <div className="rpts-sbmt-error">{exportError}</div>}
                <form className="rpts-sbmt-body" onSubmit={handleSubmit}>
                    <div className="rpts-sbmt-grid">
                        {report.name === 'plant_production' ? (
                            <>
                                <div className="rpts-sbmt-pp-row">
                                    <div className="rpts-sbmt-col">
                                        <label>
                                            Plant
                                            <span className="rpts-sbmt-required">*</span>
                                        </label>
                                        <select
                                            value={form.plant ?? ''}
                                            onChange={e => {
                                                const newPlant = e.target.value
                                                setForm(f => ({...f, plant: newPlant, rows: []}))
                                                setCarouselIndex(0)
                                            }}
                                            required
                                            disabled={readOnly}
                                            className="rpts-sbmt-input rpts-sbmt-select"
                                        >
                                            <option value="">Select Plant...</option>
                                            {plants.map(p => (
                                                <option key={p.plant_code} value={p.plant_code}>{p.plant_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="rpts-sbmt-right-col">
                                        <label>
                                            Report Date
                                            <span className="rpts-sbmt-required">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={form.report_date ?? ''}
                                            required
                                            disabled={readOnly || report.name === 'plant_production'}
                                            className="rpts-sbmt-input rpts-sbmt-date"
                                        />
                                        {report.name === 'plant_production' && (
                                            <div className="rpts-sbmt-next-report-notice">
                                                Next Report {ReportUtility.formatDate(nextForcedReportDate)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="rpts-sbmt-field-wide rpts-sbmt-grid-col-span-all">
                                    <label>Operators</label>
                                    <div>
                                        {form.plant && (form.rows || []).length === 0 && (
                                            <div className="rpts-sbmt-muted">
                                                No active operators for this plant.
                                            </div>
                                        )}
                                        {!form.plant && (
                                            <div className="rpts-sbmt-muted">
                                                Please wait, loading plant assignment...
                                            </div>
                                        )}
                                        {(form.rows || []).length > 0 && (
                                            <div className="rpts-sbmt-mb-18">
                                                <div className="rpts-sbmt-op-carousel">
                                                    {form.rows.map((row, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => {
                                                                setCarouselIndex(idx)
                                                            }}
                                                            className={`rpts-sbmt-op-dot ${idx === carouselIndex ? 'active' : ''}`}
                                                        >
                                                            {idx + 1}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="rpts-sbmt-op-card">
                                                    {form.rows[carouselIndex] && (
                                                        <div className="rpts-sbmt-op-card-body">
                                                            <div className="rpts-sbmt-row">
                                                                <div className="rpts-sbmt-col">
                                                                    <label className="rpts-sbmt-label">Name</label>
                                                                    <input type="text"
                                                                           value={operatorOptions.find(opt => opt.value === form.rows[carouselIndex]?.name)?.label ?? ''}
                                                                           disabled className="rpts-sbmt-field"/>
                                                                </div>
                                                                <div className="rpts-sbmt-w-120">
                                                                    <label className="rpts-sbmt-label">Truck #</label>
                                                                    <input type="text"
                                                                           value={ReportUtility.getTruckNumberForOperator(form.rows[carouselIndex], mixers) ?? ''}
                                                                           disabled className="rpts-sbmt-field"/>
                                                                </div>
                                                            </div>
                                                            <div className="rpts-sbmt-row">
                                                                <div className="rpts-sbmt-col">
                                                                    <label className="rpts-sbmt-label">Start
                                                                        Time</label>
                                                                    <input type="time"
                                                                           value={form.rows[carouselIndex]?.start_time ?? ''}
                                                                           onChange={e => handleChange(e, 'rows', carouselIndex, 'start_time')}
                                                                           disabled={!!readOnly}
                                                                           className="rpts-sbmt-field"/>
                                                                </div>
                                                                <div className="rpts-sbmt-col">
                                                                    <label className="rpts-sbmt-label">1st Load</label>
                                                                    <input type="time"
                                                                           value={form.rows[carouselIndex]?.first_load ?? ''}
                                                                           onChange={e => handleChange(e, 'rows', carouselIndex, 'first_load')}
                                                                           disabled={!!readOnly}
                                                                           className="rpts-sbmt-field"/>
                                                                </div>
                                                            </div>
                                                            <div className="rpts-sbmt-row">
                                                                <div className="rpts-sbmt-col">
                                                                    <label className="rpts-sbmt-label">EOD In
                                                                        Yard</label>
                                                                    <input type="time"
                                                                           value={form.rows[carouselIndex]?.eod_in_yard ?? ''}
                                                                           onChange={e => handleChange(e, 'rows', carouselIndex, 'eod_in_yard')}
                                                                           disabled={!!readOnly}
                                                                           className="rpts-sbmt-field"/>
                                                                </div>
                                                                <div className="rpts-sbmt-col">
                                                                    <label className="rpts-sbmt-label">Punch Out</label>
                                                                    <input type="time"
                                                                           value={form.rows[carouselIndex]?.punch_out ?? ''}
                                                                           onChange={e => handleChange(e, 'rows', carouselIndex, 'punch_out')}
                                                                           disabled={!!readOnly}
                                                                           className="rpts-sbmt-field"/>
                                                                </div>
                                                            </div>
                                                            <div className="rpts-sbmt-row">
                                                                <div className="rpts-sbmt-col">
                                                                    <label className="rpts-sbmt-label">Total
                                                                        Loads</label>
                                                                    <input type="number"
                                                                           value={form.rows[carouselIndex]?.loads ?? ''}
                                                                           onChange={e => handleChange(e, 'rows', carouselIndex, 'loads')}
                                                                           disabled={readOnly}
                                                                           className="rpts-sbmt-field"/>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="rpts-sbmt-label">Comments</label>
                                                                <input type="text"
                                                                       value={form.rows[carouselIndex]?.comments ?? ''}
                                                                       onChange={e => handleChange(e, 'rows', carouselIndex, 'comments')}
                                                                       disabled={readOnly} className="rpts-sbmt-field"/>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="rpts-sbmt-op-card-actions">
                                                        <button type="button"
                                                                onClick={() => handleExcludeOperator(carouselIndex)}
                                                                className="rpts-sbmt-btn-secondary">Exclude Operator
                                                        </button>
                                                        <button type="button"
                                                                onClick={() => setCarouselIndex(i => Math.max(i - 1, 0))}
                                                                disabled={carouselIndex === 0}
                                                                className="rpts-sbmt-btn-primary">&#8592; Prev Operator
                                                        </button>
                                                        <span
                                                            className="rpts-sbmt-operator-count">Operator {carouselIndex + 1} of {form.rows.length}</span>
                                                        <button type="button"
                                                                onClick={() => setCarouselIndex(i => Math.min(i + 1, form.rows.length - 1))}
                                                                disabled={carouselIndex === form.rows.length - 1}
                                                                className="rpts-sbmt-btn-primary">Next
                                                            Operator &#8594;</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {excludedOperators.length > 0 && (
                                            <div className="rpts-sbmt-my-18">
                                                <div className="rpts-sbmt-section-title">Excluded Operators</div>
                                                <div className="rpts-sbmt-flex-wrap">
                                                    {excludedOperators.map(opId => {
                                                        const op = operatorOptions.find(opt => opt.value === opId)
                                                        return (
                                                            <button key={opId} type="button"
                                                                    onClick={() => handleReincludeOperator(opId)}
                                                                    className="rpts-sbmt-chip-btn">{op ? op.label : opId} (Re-include)</button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : report.name === 'general_manager' ? null : report.name === 'aggregate_production' ? null : report.name === 'safety_manager' ? null : report.name === 'district_manager' ? null : report.name === 'plant_manager' ? (
                            <div className="pm-metrics-section pm-production-data-section rpts-sbmt-grid-col-span-all">
                                <div className="pm-metrics-header">
                                    <h3 className="pm-metrics-title">
                                        <i className="fas fa-clipboard-list"></i>
                                        Weekly Production Data
                                    </h3>
                                    <p className="pm-metrics-subtitle">
                                        Enter the key production metrics for this reporting period
                                    </p>
                                </div>
                                <div className="pm-production-grid">
                                    {report.fields.map(field => (
                                        field.name === 'issues' || field.type === 'table' ? null : (
                                            <div key={field.name} className="pm-production-field">
                                                <div className="pm-production-field-header">
                                                    <i className={`fas ${field.name === 'yardage' ? 'fa-box' : field.name === 'total_hours' ? 'fa-clock' : field.name === 'total_yards_lost' ? 'fa-exclamation-triangle' : 'fa-recycle'} pm-production-field-icon`}></i>
                                                    <label>{field.name === 'yardage' ? 'Total Yardage' : field.label}{field.required &&
                                                        <span className="rpts-sbmt-required">*</span>}</label>
                                                </div>
                                                {field.type === 'textarea' ? (
                                                    <textarea value={form[field.name] ?? ''}
                                                              onChange={e => handleChange(e, field.name)}
                                                              required={field.required} disabled={readOnly}
                                                              className="pm-production-input"/>
                                                ) : field.type === 'select' ? (
                                                    <select value={form[field.name] ?? ''}
                                                            onChange={e => handleChange(e, field.name)}
                                                            required={field.required} disabled={readOnly}
                                                            className="pm-production-input">
                                                        <option value="">Select...</option>
                                                        {field.options?.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input type={field.type} value={form[field.name] ?? ''}
                                                           onChange={e => handleChange(e, field.name)}
                                                           required={field.required}
                                                           disabled={readOnly}
                                                           className="pm-production-input"/>
                                                )}
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="rpts-sbmt-fields-container">
                                {report.fields.map(field => (
                                    field.name === 'issues' || field.type === 'table' ? null : (
                                        <div key={field.name} className="rpts-sbmt-field-wide">
                                            <label>{field.name === 'yardage' ? 'Total Yardage' : field.label}{field.required &&
                                                <span className="rpts-sbmt-required">*</span>}</label>
                                            {field.type === 'textarea' ? (
                                                <textarea value={form[field.name] ?? ''}
                                                          onChange={e => handleChange(e, field.name)}
                                                          required={field.required} disabled={readOnly}/>
                                            ) : field.type === 'select' ? (
                                                <select value={form[field.name] ?? ''}
                                                        onChange={e => handleChange(e, field.name)}
                                                        required={field.required} disabled={readOnly}>
                                                    <option value="">Select...</option>
                                                    {field.options?.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input type={field.type} value={form[field.name] ?? ''}
                                                       onChange={e => handleChange(e, field.name)}
                                                       required={field.required}
                                                       disabled={readOnly}/>
                                            )}
                                        </div>
                                    )
                                ))}
                            </div>
                        )}
                    </div>
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
                            setDebugMsg={setDebugMsg}
                            allReports={report.name === 'general_manager' ? allReports : undefined}
                            weekIso={(report.name === 'general_manager' || report.name === 'aggregate_production' || report.name === 'plant_manager') ? report.weekIso : undefined}
                            setForm={setForm}
                            plants={plants}
                            readOnly={readOnly}
                            user={user}
                            userId={targetUserId}
                            onChange={handleChange}
                        />
                    )}
                    {error && <div className="rpts-sbmt-error">{error}</div>}
                    {success && <div className="rpts-sbmt-success">Report submitted successfully.</div>}
                    {saveMessage && <div className="rpts-sbmt-success">{saveMessage}</div>}
                    {!readOnly && (
                        <div className="rpts-sbmt-actions-wide rpts-sbmt-actions">
                            <button type="button" className="rpts-sbmt-cancel" onClick={handleBackClick}
                                    disabled={submitting || savingDraft}>Cancel
                            </button>
                            <button type="button" className="rpts-sbmt-save" onClick={handleSaveDraft}
                                    disabled={submitting || savingDraft}>{savingDraft ? 'Saving...' : 'Save Changes'}</button>
                            {(!managerEditUser) && (
                                <button type="submit" className="rpts-sbmt-submit"
                                        disabled={submitting || savingDraft}>{submitting ? 'Submitting...' : 'Submit'}</button>
                            )}
                        </div>
                    )}
                </form>
            </div>
            {showConfirmationModal && (
                <div className="rpts-sbmt-modal-backdrop">
                    <div className="rpts-sbmt-modal-content">
                        <h2 className="rpts-sbmt-modal-title">Confirm Submission</h2>
                        <div className="rpts-sbmt-modal-text">Please confirm the following before submitting:</div>
                        <div>
                            <label className="rpts-sbmt-checkbox-label">
                                <input type="checkbox" checked={confirmationChecks[0]}
                                       onChange={e => setConfirmationChecks([e.target.checked, confirmationChecks[1]])}/>
                                Total yardage includes all yardage we can bill for and does not include lost yardage.
                            </label>
                        </div>
                        <div>
                            <label className="rpts-sbmt-checkbox-label">
                                <input type="checkbox" checked={confirmationChecks[1]}
                                       onChange={e => setConfirmationChecks([confirmationChecks[0], e.target.checked])}/>
                                Total hours only includes hours from operators and not from plant managers, loader
                                operators or any other roles.
                            </label>
                        </div>
                        <div className="rpts-sbmt-modal-actions">
                            <button type="button" className="rpts-sbmt-btn-secondary"
                                    onClick={() => setShowConfirmationModal(false)}>Cancel
                            </button>
                            <button type="button" className="rpts-sbmt-btn-confirm"
                                    disabled={!(confirmationChecks[0] && confirmationChecks[1])}
                                    onClick={handleConfirmedSubmit}>Confirm & Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ReportsSubmitView
