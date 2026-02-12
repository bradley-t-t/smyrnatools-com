import React, { useEffect, useState } from 'react'

import { useSubmitData } from '../../app/hooks/useSubmitData'
import { useSubmitForm } from '../../app/hooks/useSubmitForm'
import { exportGeneralManagerReport } from '../../utils/ExportUtility'
import { ReportUtility } from '../../utils/ReportUtility'
import ConfirmationModal from './components/ConfirmationModal'
import ErrorModal from './components/ErrorModal'
import SubmitHeader from './components/SubmitHeader'
import { reportsSubmitViewStyles } from './styles/ReportsSubmitViewStyles'
import { AggregateProductionSubmitPlugin } from './types/WeeklyAggregateProductionReport'
import { DistrictManagerSubmitPlugin } from './types/WeeklyDistrictManagerReport'
import { EfficiencySubmitPlugin } from './types/WeeklyEfficiencyReport'
import { GeneralManagerSubmitPlugin } from './types/WeeklyGeneralManagerReport'
import { PlantManagerSubmitPlugin } from './types/WeeklyPlantManagerReport'
import { ReadyMixInstructorSubmitPlugin } from './types/WeeklyReadyMixInstructorReport'
import { SafetyManagerSubmitPlugin } from './types/WeeklySafetyManagerReport'

const styles = reportsSubmitViewStyles

const plugins = {
    aggregate_production: AggregateProductionSubmitPlugin,
    district_manager: DistrictManagerSubmitPlugin,
    general_manager: GeneralManagerSubmitPlugin,
    plant_manager: PlantManagerSubmitPlugin,
    plant_production: EfficiencySubmitPlugin,
    ready_mix_instructor: ReadyMixInstructorSubmitPlugin,
    safety_manager: SafetyManagerSubmitPlugin
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
    const isGM = report?.name === 'general_manager' || /general manager/i.test(report?.title || '')

    const {
        fetchHoursReceived,
        fetchOperatorsAndMixers,
        forcedReportDate,
        hoursReceivedFromOtherPlants,
        isCompleted,
        loadingPlants,
        maintenanceItems,
        mixers,
        nextForcedReportDate,
        operatorOptions,
        plants,
        targetUserId,
        weekVerbose
    } = useSubmitData({ initialData, managerEditUser, report, user })

    const {
        addOperatorRow,
        carouselIndex,
        clearRows,
        excludedOperators,
        form,
        handleChange,
        hasUnsavedChanges,
        initializeRows,
        lost,
        lostGrade,
        lostLabel,
        removeOperatorRow,
        reportDateVerbose,
        setCarouselIndex,
        setForm,
        setHasUnsavedChanges,
        setInitialFormSnapshot,
        yph,
        yphGrade,
        yphLabel
    } = useSubmitForm({
        forcedReportDate,
        hoursReceivedFromOtherPlants,
        initialData,
        operatorOptions,
        plants,
        report,
        user
    })

    const [submitting, setSubmitting] = useState(false)
    const [savingDraft, setSavingDraft] = useState(false)
    const [aiValidating, setAiValidating] = useState(false)
    const [aiValidationProgress, setAiValidationProgress] = useState({ current: 0, total: 0 })
    const [aiWarningModal, setAiWarningModal] = useState(null)
    const [error, setError] = useState('')
    const [showErrorModal, setShowErrorModal] = useState(false)
    const [success, setSuccess] = useState(false)
    const [summaryTab, setSummaryTab] = useState('summary')
    const [saveMessage, setSaveMessage] = useState('')
    const [showConfirmationModal, setShowConfirmationModal] = useState(false)
    const [confirmationChecks, setConfirmationChecks] = useState([false, false])
    const [exporting, setExporting] = useState(false)
    const [exportError, setExportError] = useState('')
    const setDebugMsg = () => {}

    const PluginComponent = plugins[report.name]

    function showError(msg) {
        setError(msg)
        setShowErrorModal(true)
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setShowErrorModal(false)
        setSuccess(false)
        if (report.name === 'plant_manager') {
            setAiValidating(true)
            setAiValidationProgress({ current: 0, total: 1 })

            const { AIService } = await import('../../services/AIService')
            const validation = await AIService.validatePlantManagerMetrics(form)

            setAiValidating(false)

            if (!validation.error && validation.needsReview) {
                setAiWarningModal({
                    concerns: validation.concerns || [],
                    suggestion: validation.suggestion || 'Please review your entries for accuracy.'
                })
                return
            }

            setShowConfirmationModal(true)
            return
        }
        if (report.name === 'safety_manager') {
            const issues = Array.isArray(form.issues) ? form.issues : []
            if (issues.some((i) => !i.description || !i.plant || !i.tag)) {
                showError('All issues must have a description, plant, and tag.')
                return
            }
        }
        if (report.name !== 'general_manager') {
            for (const field of report.fields) {
                const val = form[field.name]
                if (
                    field.required &&
                    (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0))
                ) {
                    showError('Please fill out all required fields before submitting.')
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
                            showError('Please fill out all required fields before submitting.')
                            return
                        }
                    }
                }
            }
        }
        if (report.name === 'plant_production') {
            setAiValidating(true)
            const rows = Array.isArray(form.rows) ? form.rows : []
            const rowsWithIssues = rows.filter((r) => {
                const start = ReportUtility.parseTimeToMinutes(r.start_time)
                const first = ReportUtility.parseTimeToMinutes(r.first_load)
                const eod = ReportUtility.parseTimeToMinutes(r.eod_in_yard)
                const punch = ReportUtility.parseTimeToMinutes(r.punch_out)
                const dStart = start !== null && first !== null ? first - start : null
                const dEnd = eod !== null && punch !== null ? punch - eod : null
                const hours = start !== null && punch !== null ? (punch - start) / 60 : null
                const loadsNum = Number(r.loads)
                return (
                    (dStart !== null && dStart > 15) ||
                    (dEnd !== null && dEnd > 20) ||
                    loadsNum < 3 ||
                    (hours !== null && hours > 14)
                )
            })
            setAiValidationProgress({ current: 0, total: rowsWithIssues.length })

            const v = await ReportUtility.validatePlantProduction(form, operatorOptions)
            setAiValidating(false)
            if (v) {
                showError(v)
                return
            }
        }
        setSubmitting(true)
        try {
            await onSubmit(form, 'submit')
            setSuccess(true)
        } catch (err) {
            showError(err?.message || 'Error submitting report')
        }
        setSubmitting(false)
    }

    async function handleConfirmedSubmit() {
        setShowConfirmationModal(false)
        setSubmitting(true)
        setError('')
        setShowErrorModal(false)
        setSuccess(false)
        try {
            const submitData = { ...form }
            if (report.name === 'plant_manager' && user && user.plant_code && !submitData.plant) {
                submitData.plant = user.plant_code
            }
            await onSubmit(submitData, 'submit')
            setSuccess(true)
        } catch (err) {
            showError(err?.message || 'Error submitting report')
        }
        setSubmitting(false)
    }

    async function handleSaveDraft(e) {
        e.preventDefault()
        setError('')
        setShowErrorModal(false)
        setSuccess(false)
        setSaveMessage('')
        setSavingDraft(true)
        try {
            await onSubmit(form, 'draft')
            setSaveMessage('Changes saved.')
            setInitialFormSnapshot(JSON.stringify(form))
            setHasUnsavedChanges(false)
        } catch (err) {
            showError(err?.message || 'Error saving draft')
        }
        setSavingDraft(false)
    }

    function handleExcludeOperator(idx) {
        removeOperatorRow(idx)
    }

    function handleReincludeOperator(operatorId) {
        addOperatorRow(operatorId, mixers)
    }

    function handleBackClick() {
        if (hasUnsavedChanges) {
            handleSaveDraft({
                preventDefault: () => {}
            })
            setTimeout(() => onBack(), 800)
        } else {
            onBack()
        }
    }

    async function handleExport() {
        if (exporting || loadingPlants || plants.length === 0) return
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
        if (report.name === 'plant_production') {
            const plantCode = form.plant
            if (!plantCode) {
                clearRows()
                return
            }
            fetchOperatorsAndMixers(plantCode).then((result) => {
                if (
                    report.name === 'plant_production' &&
                    !readOnly &&
                    (!initialData || !initialData.rows || initialData.rows.length === 0) &&
                    (!form.rows || form.rows.length === 0)
                ) {
                    initializeRows(result.activeOperators, result.mixers)
                }
            })
        }
    }, [report.name, form.plant, readOnly, initialData, clearRows, fetchOperatorsAndMixers, initializeRows, form.rows])

    useEffect(() => {
        if (report.name === 'plant_manager') {
            fetchHoursReceived(form.plant || user?.plant_code, report.weekIso)
        }
    }, [report.name, report.weekIso, user?.plant_code, form.plant, fetchHoursReceived])

    let editingUserName = ''
    if (managerEditUser && userProfiles && userProfiles[managerEditUser]) {
        const profile = userProfiles[managerEditUser]
        editingUserName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    } else if (managerEditUser) {
        editingUserName = managerEditUser.slice(0, 8)
    }

    return (
        <div style={styles.container}>
            <style>{`
                .rpts-sbmt-error { background: #fee2e2; color: #dc2626; padding: 1rem; border-radius: 8px; margin: 1rem; font-size: 0.875rem; font-weight: 500; }
                .rpts-sbmt-success { background: #d1fae5; color: #059669; padding: 1rem; border-radius: 8px; margin: 1rem; font-size: 0.875rem; font-weight: 500; }
                .rpts-sbmt-fields-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.25rem; }
                .rpts-sbmt-field-wide { display: flex; flex-direction: column; gap: 0.5rem; }
                .rpts-sbmt-field-wide label { font-size: 0.875rem; font-weight: 600; color: #374151; }
                .rpts-sbmt-field-wide input, .rpts-sbmt-field-wide select, .rpts-sbmt-field-wide textarea { padding: 0.75rem 1rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem; color: #1e293b; background: white; }
                .rpts-sbmt-field-wide textarea { min-height: 100px; resize: vertical; }
                .rpts-sbmt-required { color: #ef4444; margin-left: 0.25rem; }
                .rpts-sbmt-actions, .rpts-sbmt-actions-wide { display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; margin-top: 1.5rem; }
                .rpts-sbmt-cancel { padding: 0.75rem 1.5rem; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; }
                .rpts-sbmt-save { padding: 0.75rem 1.5rem; background: #e0f2fe; color: #0369a1; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; }
                .rpts-sbmt-submit { padding: 0.75rem 1.5rem; background: #1e3a5f; color: white; border: none; border-radius: 8px; font-size: 0.9375rem; fontWeight: 600; cursor: pointer; }
                .rpts-sbmt-modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
                .rpts-sbmt-modal-content { background: white; border-radius: 16px; padding: 2rem; max-width: 500px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
                .rpts-sbmt-modal-title { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 1rem; }
                .rpts-sbmt-modal-text { font-size: 0.9375rem; color: #64748b; margin-bottom: 1.5rem; }
                .rpts-sbmt-checkbox-label { display: flex; align-items: flex-start; gap: 0.75rem; font-size: 0.9375rem; color: #374151; margin-bottom: 1rem; cursor: pointer; }
                .rpts-sbmt-modal-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
                .rpts-sbmt-btn-secondary { padding: 0.75rem 1.5rem; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; }
                .rpts-sbmt-btn-confirm { padding: 0.75rem 1.5rem; background: #1e3a5f; color: white; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; }
                .rpts-sbmt-btn-confirm:disabled { background: #94a3b8; cursor: not-allowed; }
                .rpts-sbmt-muted { color: #64748b; font-size: 0.875rem; padding: 1rem; background: #f8fafc; border-radius: 8px; text-align: center; }
                .rpts-sbmt-mb-18 { margin-bottom: 1.125rem; }
                .rpts-sbmt-my-18 { margin: 1.125rem 0; }
                .rpts-sbmt-grid-col-span-all { grid-column: 1 / -1; }
                .rpts-sbmt-op-carousel { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
                .rpts-sbmt-op-dot { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #f1f5f9; color: #64748b; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s; border: 2px solid transparent; }
                .rpts-sbmt-op-dot:hover { background: #e2e8f0; }
                .rpts-sbmt-op-dot.active { background: #1e3a5f; color: white; border-color: #1e3a5f; }
                .rpts-sbmt-op-card { background: #f8fafc; border-radius: 12px; border: 1px solid #e5e7eb; padding: 1.25rem; }
                .rpts-sbmt-op-card-body { display: flex; flex-direction: column; gap: 1rem; }
                .rpts-sbmt-op-card-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; flex-wrap: wrap; }
                .rpts-sbmt-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; }
                .rpts-sbmt-col { display: flex; flex-direction: column; gap: 0.375rem; }
                .rpts-sbmt-w-120 { width: 120px; display: flex; flex-direction: column; gap: 0.375rem; }
                .rpts-sbmt-label { font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
                .rpts-sbmt-field { padding: 0.625rem 0.875rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem; color: #1e293b; background: white; width: 100%; box-sizing: border-box; }
                .rpts-sbmt-field:disabled { background: #f1f5f9; color: #64748b; }
                .rpts-sbmt-textarea { padding: 0.625rem 0.875rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem; color: #1e293b; background: white; width: 100%; box-sizing: border-box; min-height: 80px; resize: vertical; }
                .rpts-sbmt-nav-row { display: flex; align-items: center; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; flex-wrap: wrap; }
                .rpts-sbmt-btn-danger { padding: 0.5rem 1rem; background: #fee2e2; color: #dc2626; border: none; border-radius: 8px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-top: 1rem; }
                .rpts-sbmt-btn-danger:hover { background: #fecaca; }
                .rpts-sbmt-btn-primary { padding: 0.5rem 1rem; background: #1e3a5f; color: white; border: none; border-radius: 8px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .rpts-sbmt-btn-primary:disabled { background: #94a3b8; cursor: not-allowed; }
                .rpts-sbmt-operator-count { font-size: 0.875rem; color: #64748b; font-weight: 500; }
                .rpts-sbmt-section-title { font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem; }
                .rpts-sbmt-flex-wrap { display: flex; flex-wrap: wrap; gap: 0.5rem; }
                .rpts-sbmt-chip-btn { padding: 0.5rem 0.875rem; background: #e0f2fe; color: #0369a1; border: none; border-radius: 6px; font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
                .rpts-sbmt-chip-btn:hover { background: #bae6fd; }
                .pm-metrics-section { background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 1.5rem; margin-bottom: 1.5rem; }
                .pm-metrics-header { margin-bottom: 1.25rem; }
                .pm-metrics-title { display: flex; align-items: center; gap: 0.75rem; font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0; }
                .pm-metrics-subtitle { font-size: 0.875rem; color: #64748b; margin: 0.5rem 0 0 0; }
                .pm-production-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; }
                .pm-production-field { display: flex; flex-direction: column; gap: 0.5rem; }
                .pm-production-field-header { display: flex; align-items: center; gap: 0.5rem; }
                .pm-production-field-icon { color: #1e3a5f; font-size: 0.875rem; }
                .pm-production-field label { font-size: 0.875rem; font-weight: 600; color: #374151; }
                .pm-production-input { padding: 0.75rem 1rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem; color: #1e293b; background: white; width: 100%; box-sizing: border-box; }
                .pm-production-input:disabled { background: #f8fafc; color: #64748b; }
                .rpt-card { background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 1.5rem; margin-bottom: 1.5rem; }
                .rpt-card-accent { border-left: 4px solid #1e3a5f; }
                .rpt-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem; }
                .rpt-card-title { font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0; }
                .rpt-form-row { display: flex; flex-direction: column; gap: 1rem; }
                .rpt-flex-col { flex-direction: column; }
                .rpt-plant-summary-table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
                .rpt-plant-summary-table th { background: #f8fafc; padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; }
                .rpt-plant-summary-table td { padding: 0.75rem 1rem; font-size: 0.9375rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; vertical-align: middle; background: white; }
                .rpt-plant-summary-table tr:last-child td { border-bottom: none; }
                .rpt-plant-summary-table tr:hover td { background: #f8fafc; }
                .rpt-agg-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; margin-top: 0; }
                .rpt-agg-table th { background: #f8fafc; padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; }
                .rpt-agg-table td { padding: 0.75rem 1rem; font-size: 0.9375rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
                .rpt-agg-table tr:last-child td { border-bottom: none; }
                .rpt-agg-table tr:hover td { background: #f8fafc; }
                .rpt-input { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.875rem; color: #1e293b; background: white; box-sizing: border-box; }
                .rpt-input:disabled { background: #f8fafc; color: #64748b; }
                .rpt-input:focus { outline: none; border-color: #1e3a5f; box-shadow: 0 0 0 2px rgba(30, 58, 95, 0.1); }
                .rpt-variance-cell { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.8125rem; font-weight: 600; padding: 0.25rem 0.5rem; border-radius: 4px; }
                .rpt-variance-positive { color: #059669; background: #d1fae5; }
                .rpt-variance-negative { color: #dc2626; background: #fee2e2; }
                .rpt-variance-neutral { color: #64748b; background: #f1f5f9; }
                .rpt-variance-symbol { font-size: 0.6875rem; }
                .rpt-empty { text-align: center; padding: 2rem; color: #64748b; font-size: 0.9375rem; background: #f8fafc; border-radius: 8px; }
            `}</style>
            <SubmitHeader
                report={report}
                weekVerbose={weekVerbose}
                reportDateVerbose={reportDateVerbose}
                isCompleted={isCompleted}
                readOnly={readOnly}
                isGM={isGM}
                exporting={exporting}
                loadingPlants={loadingPlants}
                exportError={exportError}
                managerEditUser={managerEditUser}
                editingUserName={editingUserName}
                formPlant={form.plant}
                onBack={handleBackClick}
                onExport={handleExport}
            />
            <form style={styles.content} onSubmit={handleSubmit}>
                {report.name !== 'district_manager' &&
                    report.name !== 'general_manager' &&
                    report.name !== 'aggregate_production' &&
                    report.name !== 'safety_manager' && (
                        <div style={styles.section}>
                            {report.name === 'plant_production' ? (
                                <>
                                    <div
                                        style={{
                                            display: 'grid',
                                            gap: '1rem',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                            marginBottom: '1rem'
                                        }}
                                    >
                                        <div style={styles.field}>
                                            <label style={styles.fieldLabel}>
                                                Plant
                                                <span style={styles.required}>*</span>
                                            </label>
                                            <select
                                                value={form.plant ?? ''}
                                                onChange={(e) => {
                                                    const newPlant = e.target.value
                                                    setForm((f) => ({ ...f, plant: newPlant, rows: [] }))
                                                    setCarouselIndex(0)
                                                }}
                                                required
                                                disabled={readOnly}
                                                style={styles.select}
                                            >
                                                <option value="">Select Plant...</option>
                                                {plants.map((p) => (
                                                    <option key={p.plant_code} value={p.plant_code}>
                                                        {p.plant_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={styles.field}>
                                            <label style={styles.fieldLabel}>
                                                Report Date
                                                <span style={styles.required}>*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={form.report_date ?? ''}
                                                required
                                                disabled={readOnly || report.name === 'plant_production'}
                                                style={styles.input}
                                            />
                                            {report.name === 'plant_production' && (
                                                <div
                                                    style={{
                                                        color: '#64748b',
                                                        fontSize: '0.8125rem',
                                                        marginTop: '0.25rem'
                                                    }}
                                                >
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
                                                                        <input
                                                                            type="text"
                                                                            value={
                                                                                operatorOptions.find(
                                                                                    (opt) =>
                                                                                        opt.value ===
                                                                                        form.rows[carouselIndex]?.name
                                                                                )?.label ?? ''
                                                                            }
                                                                            disabled
                                                                            className="rpts-sbmt-field"
                                                                        />
                                                                    </div>
                                                                    <div className="rpts-sbmt-w-120">
                                                                        <label className="rpts-sbmt-label">
                                                                            Truck #
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={
                                                                                ReportUtility.getTruckNumberForOperator(
                                                                                    form.rows[carouselIndex],
                                                                                    mixers
                                                                                ) ?? ''
                                                                            }
                                                                            disabled
                                                                            className="rpts-sbmt-field"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="rpts-sbmt-row">
                                                                    <div className="rpts-sbmt-col">
                                                                        <label className="rpts-sbmt-label">
                                                                            Start Time
                                                                        </label>
                                                                        <input
                                                                            type="time"
                                                                            value={
                                                                                form.rows[carouselIndex]?.start_time ??
                                                                                ''
                                                                            }
                                                                            onChange={(e) =>
                                                                                handleChange(
                                                                                    e,
                                                                                    'rows',
                                                                                    carouselIndex,
                                                                                    'start_time'
                                                                                )
                                                                            }
                                                                            disabled={!!readOnly}
                                                                            className="rpts-sbmt-field"
                                                                        />
                                                                    </div>
                                                                    <div className="rpts-sbmt-col">
                                                                        <label className="rpts-sbmt-label">
                                                                            1st Load
                                                                        </label>
                                                                        <input
                                                                            type="time"
                                                                            value={
                                                                                form.rows[carouselIndex]?.first_load ??
                                                                                ''
                                                                            }
                                                                            onChange={(e) =>
                                                                                handleChange(
                                                                                    e,
                                                                                    'rows',
                                                                                    carouselIndex,
                                                                                    'first_load'
                                                                                )
                                                                            }
                                                                            disabled={!!readOnly}
                                                                            className="rpts-sbmt-field"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="rpts-sbmt-row">
                                                                    <div className="rpts-sbmt-col">
                                                                        <label className="rpts-sbmt-label">
                                                                            EOD In Yard
                                                                        </label>
                                                                        <input
                                                                            type="time"
                                                                            value={
                                                                                form.rows[carouselIndex]?.eod_in_yard ??
                                                                                ''
                                                                            }
                                                                            onChange={(e) =>
                                                                                handleChange(
                                                                                    e,
                                                                                    'rows',
                                                                                    carouselIndex,
                                                                                    'eod_in_yard'
                                                                                )
                                                                            }
                                                                            disabled={!!readOnly}
                                                                            className="rpts-sbmt-field"
                                                                        />
                                                                    </div>
                                                                    <div className="rpts-sbmt-col">
                                                                        <label className="rpts-sbmt-label">
                                                                            Punch Out
                                                                        </label>
                                                                        <input
                                                                            type="time"
                                                                            value={
                                                                                form.rows[carouselIndex]?.punch_out ??
                                                                                ''
                                                                            }
                                                                            onChange={(e) =>
                                                                                handleChange(
                                                                                    e,
                                                                                    'rows',
                                                                                    carouselIndex,
                                                                                    'punch_out'
                                                                                )
                                                                            }
                                                                            disabled={!!readOnly}
                                                                            className="rpts-sbmt-field"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="rpts-sbmt-row">
                                                                    <div className="rpts-sbmt-col">
                                                                        <label className="rpts-sbmt-label">
                                                                            Total Loads
                                                                        </label>
                                                                        <input
                                                                            type="number"
                                                                            value={
                                                                                form.rows[carouselIndex]?.loads ?? ''
                                                                            }
                                                                            onChange={(e) =>
                                                                                handleChange(
                                                                                    e,
                                                                                    'rows',
                                                                                    carouselIndex,
                                                                                    'loads'
                                                                                )
                                                                            }
                                                                            disabled={readOnly}
                                                                            className="rpts-sbmt-field"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="rpts-sbmt-label">Comments</label>
                                                                    <input
                                                                        type="text"
                                                                        value={form.rows[carouselIndex]?.comments ?? ''}
                                                                        onChange={(e) =>
                                                                            handleChange(
                                                                                e,
                                                                                'rows',
                                                                                carouselIndex,
                                                                                'comments'
                                                                            )
                                                                        }
                                                                        disabled={readOnly}
                                                                        className="rpts-sbmt-field"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="rpts-sbmt-op-card-actions">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleExcludeOperator(carouselIndex)}
                                                                className="rpts-sbmt-btn-secondary"
                                                            >
                                                                Exclude Operator
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setCarouselIndex((i) => Math.max(i - 1, 0))
                                                                }
                                                                disabled={carouselIndex === 0}
                                                                className="rpts-sbmt-btn-primary"
                                                            >
                                                                &#8592; Prev Operator
                                                            </button>
                                                            <span className="rpts-sbmt-operator-count">
                                                                Operator {carouselIndex + 1} of {form.rows.length}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setCarouselIndex((i) =>
                                                                        Math.min(i + 1, form.rows.length - 1)
                                                                    )
                                                                }
                                                                disabled={carouselIndex === form.rows.length - 1}
                                                                className="rpts-sbmt-btn-primary"
                                                            >
                                                                Next Operator &#8594;
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {excludedOperators.length > 0 && (
                                                <div className="rpts-sbmt-my-18">
                                                    <div className="rpts-sbmt-section-title">Excluded Operators</div>
                                                    <div className="rpts-sbmt-flex-wrap">
                                                        {excludedOperators.map((opId) => {
                                                            const op = operatorOptions.find((opt) => opt.value === opId)
                                                            return (
                                                                <button
                                                                    key={opId}
                                                                    type="button"
                                                                    onClick={() => handleReincludeOperator(opId)}
                                                                    className="rpts-sbmt-chip-btn"
                                                                >
                                                                    {op ? op.label : opId} (Re-include)
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : report.name === 'general_manager' ? null : report.name ===
                              'aggregate_production' ? null : report.name === 'safety_manager' ? null : report.name ===
                              'district_manager' ? null : report.name === 'plant_manager' ? (
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
                                        {report.fields.map((field) =>
                                            field.name === 'issues' || field.type === 'table' ? null : (
                                                <div key={field.name} className="pm-production-field">
                                                    <div className="pm-production-field-header">
                                                        <i
                                                            className={`fas ${field.name === 'yardage' ? 'fa-box' : field.name === 'total_hours' ? 'fa-clock' : field.name === 'total_yards_lost' ? 'fa-exclamation-triangle' : 'fa-recycle'} pm-production-field-icon`}
                                                        ></i>
                                                        <label>
                                                            {field.name === 'yardage' ? 'Total Yardage' : field.label}
                                                            {field.required && (
                                                                <span className="rpts-sbmt-required">*</span>
                                                            )}
                                                        </label>
                                                    </div>
                                                    {field.type === 'textarea' ? (
                                                        <textarea
                                                            value={form[field.name] ?? ''}
                                                            onChange={(e) => handleChange(e, field.name)}
                                                            required={field.required}
                                                            disabled={readOnly}
                                                            className="pm-production-input"
                                                        />
                                                    ) : field.type === 'select' ? (
                                                        <select
                                                            value={form[field.name] ?? ''}
                                                            onChange={(e) => handleChange(e, field.name)}
                                                            required={field.required}
                                                            disabled={readOnly}
                                                            className="pm-production-input"
                                                        >
                                                            <option value="">Select...</option>
                                                            {field.options?.map((opt) => (
                                                                <option key={opt} value={opt}>
                                                                    {opt}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type={field.type}
                                                            value={form[field.name] ?? ''}
                                                            onChange={(e) => handleChange(e, field.name)}
                                                            required={field.required}
                                                            disabled={readOnly}
                                                            className="pm-production-input"
                                                        />
                                                    )}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="rpts-sbmt-fields-container">
                                    {report.fields.map((field) =>
                                        field.name === 'issues' || field.type === 'table' ? null : (
                                            <div key={field.name} className="rpts-sbmt-field-wide">
                                                <label>
                                                    {field.name === 'yardage' ? 'Total Yardage' : field.label}
                                                    {field.required && <span className="rpts-sbmt-required">*</span>}
                                                </label>
                                                {field.type === 'textarea' ? (
                                                    <textarea
                                                        value={form[field.name] ?? ''}
                                                        onChange={(e) => handleChange(e, field.name)}
                                                        required={field.required}
                                                        disabled={readOnly}
                                                    />
                                                ) : field.type === 'select' ? (
                                                    <select
                                                        value={form[field.name] ?? ''}
                                                        onChange={(e) => handleChange(e, field.name)}
                                                        required={field.required}
                                                        disabled={readOnly}
                                                    >
                                                        <option value="">Select...</option>
                                                        {field.options?.map((opt) => (
                                                            <option key={opt} value={opt}>
                                                                {opt}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={field.type}
                                                        value={form[field.name] ?? ''}
                                                        onChange={(e) => handleChange(e, field.name)}
                                                        required={field.required}
                                                        disabled={readOnly}
                                                    />
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
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
                        setDebugMsg={setDebugMsg}
                        allReports={report.name === 'general_manager' ? allReports : undefined}
                        weekIso={
                            report.name === 'general_manager' ||
                            report.name === 'aggregate_production' ||
                            report.name === 'plant_manager'
                                ? report.weekIso
                                : undefined
                        }
                        setForm={setForm}
                        plants={plants}
                        readOnly={readOnly}
                        user={user}
                        userId={targetUserId}
                        onChange={handleChange}
                    />
                )}
                {success && <div className="rpts-sbmt-success">Report submitted successfully.</div>}
                {saveMessage && <div className="rpts-sbmt-success">{saveMessage}</div>}
                {!readOnly && (
                    <div className="rpts-sbmt-actions-wide rpts-sbmt-actions">
                        <button
                            type="button"
                            className="rpts-sbmt-cancel"
                            onClick={handleBackClick}
                            disabled={submitting || savingDraft}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="rpts-sbmt-save"
                            onClick={handleSaveDraft}
                            disabled={submitting || savingDraft}
                        >
                            {savingDraft ? 'Saving...' : 'Save Changes'}
                        </button>
                        {!managerEditUser && (
                            <button type="submit" className="rpts-sbmt-submit" disabled={submitting || savingDraft}>
                                {submitting
                                    ? report.name === 'plant_production'
                                        ? 'Validating comments...'
                                        : 'Submitting...'
                                    : 'Submit'}
                            </button>
                        )}
                    </div>
                )}
            </form>
            {showConfirmationModal && (
                <ConfirmationModal
                    confirmationChecks={confirmationChecks}
                    setConfirmationChecks={setConfirmationChecks}
                    onCancel={() => setShowConfirmationModal(false)}
                    onConfirm={handleConfirmedSubmit}
                />
            )}
            {showErrorModal && error && <ErrorModal error={error} onClose={() => setShowErrorModal(false)} />}
            {aiValidating && (
                <div className="rpts-sbmt-modal-backdrop" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
                    <div className="rpts-sbmt-modal-content" style={{ maxWidth: '500px' }}>
                        <div style={{ alignItems: 'center', display: 'flex', gap: '16px', marginBottom: '24px' }}>
                            <div
                                style={{
                                    alignItems: 'center',
                                    animation: 'spin 2s linear infinite',
                                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                    border: '3px solid #f59e0b',
                                    borderRadius: '50%',
                                    color: '#f59e0b',
                                    display: 'flex',
                                    fontSize: '24px',
                                    height: '60px',
                                    justifyContent: 'center',
                                    width: '60px'
                                }}
                            >
                                <i className="fas fa-robot"></i>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2
                                    style={{
                                        color: '#1e3a5f',
                                        fontSize: '20px',
                                        fontWeight: 700,
                                        margin: 0,
                                        marginBottom: '4px'
                                    }}
                                >
                                    AI Validation in Progress
                                </h2>
                                <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                                    Analyzing efficiency report comments...
                                </p>
                            </div>
                        </div>

                        <div
                            style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                padding: '16px'
                            }}
                        >
                            <div style={{ alignItems: 'center', display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                <i
                                    className="fas fa-clipboard-check"
                                    style={{ color: '#f59e0b', fontSize: '18px' }}
                                ></i>
                                <span style={{ color: '#374151', fontSize: '14px', fontWeight: 600 }}>
                                    Validating operator explanations for timing issues
                                </span>
                            </div>
                            {aiValidationProgress.total > 0 && (
                                <div>
                                    <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
                                        Checking {aiValidationProgress.total} operator
                                        {aiValidationProgress.total !== 1 ? 's' : ''} with performance issues
                                    </div>
                                    <div
                                        style={{
                                            background: '#e2e8f0',
                                            borderRadius: '8px',
                                            height: '8px',
                                            overflow: 'hidden',
                                            width: '100%'
                                        }}
                                    >
                                        <div
                                            style={{
                                                background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
                                                height: '100%',
                                                transition: 'width 0.3s ease',
                                                width:
                                                    aiValidationProgress.total > 0
                                                        ? `${(aiValidationProgress.current / aiValidationProgress.total) * 100}%`
                                                        : '0%'
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div
                            style={{
                                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                border: '1px solid #fbbf24',
                                borderLeft: '4px solid #f59e0b',
                                borderRadius: '6px',
                                color: '#92400e',
                                fontSize: '13px',
                                padding: '12px'
                            }}
                        >
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <i
                                    className="fas fa-info-circle"
                                    style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }}
                                ></i>
                                <div>
                                    {report.name === 'plant_manager'
                                        ? 'AI is checking if your hours, yardage, lost yardage, and resold yardage values make sense together. This helps catch data entry errors.'
                                        : 'AI is ensuring all comments provide specific explanations for delayed starts, delayed washouts, low loads, or excessive hours.'}
                                </div>
                            </div>
                        </div>

                        <style>{`
                            @keyframes spin {
                                from { transform: rotate(0deg); }
                                to { transform: rotate(360deg); }
                            }
                        `}</style>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ReportsSubmitView
