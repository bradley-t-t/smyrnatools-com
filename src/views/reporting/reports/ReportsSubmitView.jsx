import React, { useEffect, useRef, useState } from 'react'

import ConfirmationModal from '../../../app/components/reports/ConfirmationModal'
import ErrorModal from '../../../app/components/reports/ErrorModal'
import OperatorExclusionReasonModal from '../../../app/components/reports/OperatorExclusionReasonModal'
import SubmitHeader from '../../../app/components/reports/SubmitHeader'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { useSubmitData } from '../../../app/hooks/useSubmitData'
import { useSubmitForm } from '../../../app/hooks/useSubmitForm'
import ErrorReporterUtility from '../../../utils/ErrorReporterUtility'
import { exportGeneralManagerReport } from '../../../utils/ExportUtility'
import { ReportUtility } from '../../../utils/ReportUtility'
import { AggregateProductionSubmitPlugin } from './types/WeeklyAggregateProductionReport'
import { DistrictManagerSubmitPlugin } from './types/WeeklyDistrictManagerReport'
import { EfficiencySubmitPlugin } from './types/WeeklyEfficiencyReport'
import { GeneralManagerSubmitPlugin } from './types/WeeklyGeneralManagerReport'
import { PlantManagerSubmitPlugin } from './types/WeeklyPlantManagerReport'
import { QualityControlManagerSubmitPlugin } from './types/WeeklyQualityControlManagerReport'
import { ReadyMixInstructorSubmitPlugin } from './types/WeeklyReadyMixInstructorReport'
import { SafetyManagerSubmitPlugin } from './types/WeeklySafetyManagerReport'
/** Maps report type keys to their submit-mode plugin components. */
const PLUGINS = {
    aggregate_production: AggregateProductionSubmitPlugin,
    district_manager: DistrictManagerSubmitPlugin,
    general_manager: GeneralManagerSubmitPlugin,
    plant_manager: PlantManagerSubmitPlugin,
    plant_production: EfficiencySubmitPlugin,
    quality_control_manager: QualityControlManagerSubmitPlugin,
    ready_mix_instructor: ReadyMixInstructorSubmitPlugin,
    safety_environmental_rep: SafetyManagerSubmitPlugin,
    safety_manager: SafetyManagerSubmitPlugin
}
const EXCLUDED_REPORT_TYPES = [
    'district_manager',
    'general_manager',
    'aggregate_production',
    'quality_control_manager',
    'safety_manager',
    'safety_environmental_rep'
]
const GM_REQUIRED_FIELD_SUFFIXES = [
    'active_operators',
    'runnable_trucks',
    'down_trucks',
    'operators_starting',
    'new_operators_training',
    'operators_leaving',
    'total_yardage',
    'total_hours'
]
const validateSafetyManager = (form) => {
    const issues = Array.isArray(form.issues) ? form.issues : []
    return issues.some((i) => !i.description || !i.plant || !i.tag)
        ? 'All issues must have a description, plant, and tag.'
        : null
}
const validateRequiredFields = (form, fields) => {
    for (const field of fields) {
        const val = form[field.name]
        if (
            field.required &&
            (val === undefined || val === null || val === '' || (Array.isArray(val) && !val.length))
        ) {
            return 'Please fill out all required fields before submitting.'
        }
    }
    return null
}
const validateGMFields = (form, plants) => {
    if (!plants.length) return null
    for (const plant of plants) {
        for (const suffix of GM_REQUIRED_FIELD_SUFFIXES) {
            const val = form[`${suffix}_${plant.plant_code}`]
            if (val === undefined || val === null || val === '') {
                return 'Please fill out all required fields before submitting.'
            }
        }
    }
    return null
}
const getEditingUserName = (managerEditUser, userProfiles) => {
    if (!managerEditUser) return ''
    const profile = userProfiles?.[managerEditUser]
    return profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : managerEditUser.slice(0, 8)
}
const getFieldIcon = (fieldName) => {
    const iconMap = { total_hours: 'fa-clock', yardage: 'fa-box' }
    return iconMap[fieldName] || 'fa-recycle'
}
/**
 * Generic report submission form. Delegates rendering to a type-specific
 * plugin component (e.g. EfficiencySubmitPlugin, PlantManagerSubmitPlugin).
 * Handles validation, draft auto-save, GM multi-plant field requirements,
 * operator exclusion reasons, and manager-on-behalf-of editing.
 */
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
    const PluginComponent = PLUGINS[report.name]
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
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
        userPlantCode,
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
    const [error, setError] = useState('')
    const [showErrorModal, setShowErrorModal] = useState(false)
    const [success, setSuccess] = useState(false)
    const [summaryTab, setSummaryTab] = useState('summary')
    const [saveMessage, setSaveMessage] = useState('')
    const [showConfirmationModal, setShowConfirmationModal] = useState(false)
    const [confirmationChecks, setConfirmationChecks] = useState([false, false])
    const [exporting, setExporting] = useState(false)
    const [exportError, setExportError] = useState('')
    const [showExclusionReasonModal, setShowExclusionReasonModal] = useState(false)
    const rowsInitializedRef = useRef(false)
    const hasInitializedExclusionCheckRef = useRef(false)
    const showError = (msg) => {
        setError(msg)
        setShowErrorModal(true)
    }
    const clearMessages = () => {
        setError('')
        setShowErrorModal(false)
        setSuccess(false)
    }
    // Show exclusion reason modal immediately when the last operator is excluded
    useEffect(() => {
        if (report.name !== 'plant_production') return
        if (!hasInitializedExclusionCheckRef.current) {
            if (operatorOptions.length > 0) hasInitializedExclusionCheckRef.current = true
            return
        }
        const allExcluded = excludedOperators.length === operatorOptions.length && operatorOptions.length > 0
        if (allExcluded && !form.operator_exclusion_reason) {
            setShowExclusionReasonModal(true)
        }
        // Clear the stored reason when operators are re-included
        if (!allExcluded && form.operator_exclusion_reason) {
            setForm((f) => {
                const { operator_exclusion_reason: _, ...rest } = f
                return rest
            })
        }
    }, [excludedOperators, operatorOptions, report.name, form.operator_exclusion_reason, setForm])
    const editingUserName = getEditingUserName(managerEditUser, userProfiles)
    const handleSubmit = async (e) => {
        e.preventDefault()
        clearMessages()
        if (report.name === 'plant_manager') {
            setAiValidating(true)
            setAiValidationProgress({ current: 0, total: 1 })
            try {
                const { AIService } = await import('../../../services/AIService')
                const validation = await AIService.validatePlantManagerMetrics(form)
                setAiValidating(false)
                if (validation.error) {
                    ErrorReporterUtility.reportError(new Error('AI validation failed for plant manager report'), {
                        context: `validatePlantManagerMetrics returned error — yardage: ${form.yardage}, total_hours: ${form.total_hours}`
                    })
                } else if (validation.needsReview) {
                    showError(
                        'AI analysis flagged a potential data entry issue — please double-check your yardage and total hours before confirming.'
                    )
                }
            } catch (error) {
                setAiValidating(false)
                ErrorReporterUtility.reportError(error instanceof Error ? error : new Error(String(error)), {
                    context: 'Unexpected error during AI validation of plant manager report'
                })
            }
            setShowConfirmationModal(true)
            return
        }
        if (report.name === 'safety_manager' || report.name === 'safety_environmental_rep') {
            const err = validateSafetyManager(form)
            if (err) return showError(err)
        }
        if (report.name !== 'general_manager') {
            const err = validateRequiredFields(form, report.fields)
            if (err) return showError(err)
        } else {
            const err = validateGMFields(form, plants)
            if (err) return showError(err)
        }
        if (report.name === 'plant_production') {
            const allExcluded = excludedOperators.length === operatorOptions.length && operatorOptions.length > 0
            if (allExcluded && !form.operator_exclusion_reason) {
                setShowExclusionReasonModal(true)
                return
            }
            if (!allExcluded) {
                setAiValidating(true)
                const v = await ReportUtility.validatePlantProduction(form, operatorOptions)
                setAiValidating(false)
                if (v) return showError(v)
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
    const handleConfirmedSubmit = async () => {
        setShowConfirmationModal(false)
        setSubmitting(true)
        clearMessages()
        try {
            const submitData = { ...form }
            if (report.name === 'plant_manager' && user?.plant_code && !submitData.plant)
                submitData.plant = user.plant_code
            await onSubmit(submitData, 'submit')
            setSuccess(true)
        } catch (err) {
            showError(err?.message || 'Error submitting report')
        }
        setSubmitting(false)
    }
    const handleExclusionReasonConfirm = (reason) => {
        setShowExclusionReasonModal(false)
        setForm((f) => ({ ...f, operator_exclusion_reason: reason }))
    }
    const handleSaveDraft = async (e) => {
        e.preventDefault()
        clearMessages()
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
    const handleBackClick = () => {
        if (hasUnsavedChanges) {
            handleSaveDraft({ preventDefault: () => {} })
            setTimeout(onBack, 800)
        } else {
            onBack()
        }
    }
    const handleExport = async () => {
        if (exporting || loadingPlants || !plants.length) return
        setExportError('')
        setExporting(true)
        try {
            await exportGeneralManagerReport({ form, plants, weekIso: report.weekIso })
        } catch (e) {
            setExportError(e?.message || 'Export failed')
        }
        setExporting(false)
    }
    useEffect(() => {
        if (report.name !== 'plant_production') return
        if (!form.plant) {
            clearRows()
            rowsInitializedRef.current = false
            return
        }
        fetchOperatorsAndMixers(form.plant).then((result) => {
            if (!readOnly && !initialData?.rows?.length && !form.rows?.length && !rowsInitializedRef.current) {
                initializeRows(result.activeOperators, result.mixers)
                rowsInitializedRef.current = true
            }
            if (form.rows?.length > 0) {
                rowsInitializedRef.current = true
            }
        })
    }, [report.name, form.plant, readOnly, initialData, clearRows, fetchOperatorsAndMixers, initializeRows, form.rows])
    useEffect(() => {
        if (report.name === 'plant_manager') fetchHoursReceived(form.plant || user?.plant_code, report.weekIso)
    }, [report.name, report.weekIso, user?.plant_code, form.plant, fetchHoursReceived])
    const renderPlantProductionForm = () => (
        <>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 mb-4">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">
                        Plant<span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                        value={form.plant ?? ''}
                        onChange={(e) => {
                            setForm((f) => ({ ...f, plant: e.target.value, rows: [] }))
                            setCarouselIndex(0)
                        }}
                        required
                        disabled={readOnly}
                        className="appearance-none px-4 py-3 border border-gray-200 rounded-lg text-sm text-slate-800 bg-white disabled:bg-gray-100 disabled:text-gray-500 cursor-pointer pr-10 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_12px_center] bg-no-repeat"
                    >
                        <option value="">Select Plant...</option>
                        {plants.map((p) => (
                            <option key={p.plant_code} value={p.plant_code}>
                                {p.plant_name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">
                        Report Date<span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                        type="date"
                        value={form.report_date ?? ''}
                        required
                        disabled
                        className="px-4 py-3 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500"
                    />
                    <div className="text-slate-500 text-xs mt-1">
                        Next Report {ReportUtility.formatDate(nextForcedReportDate)}
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-2 col-span-full">
                <label className="text-sm font-semibold text-gray-700">Operators</label>
                <div>
                    {form.plant && !form.rows?.length && !excludedOperators.length && (
                        <div className="text-slate-500 text-sm p-4 bg-slate-50 rounded-lg text-center">
                            No active operators for this plant.
                        </div>
                    )}
                    {!form.plant && (
                        <div className="text-slate-500 text-sm p-4 bg-slate-50 rounded-lg text-center">
                            Please wait, loading plant assignment...
                        </div>
                    )}
                    {form.rows?.length > 0 && (
                        <div className="mb-4">
                            <div className="flex flex-wrap gap-2 mb-4">
                                {form.rows.map((_, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setCarouselIndex(idx)}
                                        className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold cursor-pointer transition-all border-2 ${idx === carouselIndex ? 'text-white' : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200'}`}
                                        style={
                                            idx === carouselIndex
                                                ? { background: accentColor, borderColor: accentColor }
                                                : {}
                                        }
                                    >
                                        {idx + 1}
                                    </div>
                                ))}
                            </div>
                            <div className="bg-slate-50 rounded-xl border border-gray-200 p-5">
                                {form.rows[carouselIndex] && (
                                    <div className="flex flex-col gap-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                    Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={
                                                        operatorOptions.find(
                                                            (opt) => opt.value === form.rows[carouselIndex]?.name
                                                        )?.label ?? ''
                                                    }
                                                    disabled
                                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-slate-800 bg-white disabled:bg-slate-100 disabled:text-slate-500 w-full"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1 w-28">
                                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
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
                                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-slate-800 bg-white disabled:bg-slate-100 disabled:text-slate-500 w-full"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                    Start Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={form.rows[carouselIndex]?.start_time ?? ''}
                                                    onChange={(e) =>
                                                        handleChange(e, 'rows', carouselIndex, 'start_time')
                                                    }
                                                    disabled={!!readOnly}
                                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-slate-800 bg-white disabled:bg-slate-100 disabled:text-slate-500 w-full"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                    1st Load
                                                </label>
                                                <input
                                                    type="time"
                                                    value={form.rows[carouselIndex]?.first_load ?? ''}
                                                    onChange={(e) =>
                                                        handleChange(e, 'rows', carouselIndex, 'first_load')
                                                    }
                                                    disabled={!!readOnly}
                                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-slate-800 bg-white disabled:bg-slate-100 disabled:text-slate-500 w-full"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                    EOD In Yard
                                                </label>
                                                <input
                                                    type="time"
                                                    value={form.rows[carouselIndex]?.eod_in_yard ?? ''}
                                                    onChange={(e) =>
                                                        handleChange(e, 'rows', carouselIndex, 'eod_in_yard')
                                                    }
                                                    disabled={!!readOnly}
                                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-slate-800 bg-white disabled:bg-slate-100 disabled:text-slate-500 w-full"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                    Punch Out
                                                </label>
                                                <input
                                                    type="time"
                                                    value={form.rows[carouselIndex]?.punch_out ?? ''}
                                                    onChange={(e) =>
                                                        handleChange(e, 'rows', carouselIndex, 'punch_out')
                                                    }
                                                    disabled={!!readOnly}
                                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-slate-800 bg-white disabled:bg-slate-100 disabled:text-slate-500 w-full"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                Total Loads
                                            </label>
                                            <input
                                                type="number"
                                                value={form.rows[carouselIndex]?.loads ?? ''}
                                                onChange={(e) => handleChange(e, 'rows', carouselIndex, 'loads')}
                                                disabled={readOnly}
                                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-slate-800 bg-white disabled:bg-slate-100 disabled:text-slate-500 w-full"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                Comments
                                            </label>
                                            <input
                                                type="text"
                                                value={form.rows[carouselIndex]?.comments ?? ''}
                                                onChange={(e) => handleChange(e, 'rows', carouselIndex, 'comments')}
                                                disabled={readOnly}
                                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-slate-800 bg-white disabled:bg-slate-100 disabled:text-slate-500 w-full"
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => removeOperatorRow(carouselIndex)}
                                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
                                    >
                                        Exclude Operator
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCarouselIndex((i) => Math.max(i - 1, 0))}
                                        disabled={carouselIndex === 0}
                                        className="px-4 py-2 text-white rounded-lg text-sm font-semibold disabled:bg-slate-400 disabled:cursor-not-allowed"
                                        style={{ background: accentColor }}
                                    >
                                        &#8592; Prev
                                    </button>
                                    <span className="text-sm text-slate-500 font-medium">
                                        Operator {carouselIndex + 1} of {form.rows.length}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setCarouselIndex((i) => Math.min(i + 1, form.rows.length - 1))}
                                        disabled={carouselIndex === form.rows.length - 1}
                                        className="px-4 py-2 text-white rounded-lg text-sm font-semibold disabled:bg-slate-400 disabled:cursor-not-allowed"
                                        style={{ background: accentColor }}
                                    >
                                        Next &#8594;
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {excludedOperators.length > 0 && (
                        <div className="my-4">
                            <div className="text-sm font-semibold text-gray-700 mb-2">Excluded Operators</div>
                            <div className="flex flex-wrap gap-2">
                                {excludedOperators.map((opId) => {
                                    const op = operatorOptions.find((opt) => opt.value === opId)
                                    return (
                                        <button
                                            key={opId}
                                            type="button"
                                            onClick={() => addOperatorRow(opId, mixers)}
                                            className="px-3 py-2 bg-sky-100 text-sky-700 rounded-md text-sm font-medium hover:bg-sky-200 transition-colors"
                                        >
                                            {op?.label || opId} (Re-include)
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
    const renderPlantManagerForm = () => (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 col-span-full">
            <div className="mb-5">
                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800 m-0">
                    <i className="fas fa-clipboard-list"></i>Weekly Production Data
                </h3>
                <p className="text-sm text-slate-500 mt-2 mb-0">
                    Enter the key production metrics for this reporting period
                </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {report.fields
                    .filter((f) => f.name !== 'issues' && f.type !== 'table')
                    .map((field) => (
                        <div key={field.name} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <i
                                    className={`fas ${getFieldIcon(field.name)} text-sm`}
                                    style={{ color: accentColor }}
                                ></i>
                                <label className="text-sm font-semibold text-gray-700">
                                    {field.name === 'yardage' ? 'Total Yardage' : field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                            </div>
                            {renderFieldInput(
                                field,
                                'px-4 py-3 border border-gray-200 rounded-lg text-sm text-slate-800 bg-white w-full disabled:bg-slate-50 disabled:text-slate-500'
                            )}
                        </div>
                    ))}
            </div>
        </div>
    )
    const renderFieldInput = (field, className = '') => {
        const value = form[field.name] ?? ''
        const baseClass = className || 'px-4 py-3 border border-gray-200 rounded-lg text-sm text-slate-800 bg-white'
        const props = {
            className: baseClass,
            disabled: readOnly,
            onChange: (e) => handleChange(e, field.name),
            required: field.required,
            value
        }
        if (field.type === 'textarea') return <textarea {...props} className={`${baseClass} min-h-[100px] resize-y`} />
        if (field.type === 'select')
            return (
                <select
                    {...props}
                    className={`${baseClass} appearance-none cursor-pointer pr-10 disabled:bg-gray-100 disabled:text-gray-500`}
                >
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ))}
                </select>
            )
        return <input type={field.type} {...props} />
    }
    const renderDefaultForm = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {report.fields
                .filter((f) => f.name !== 'issues' && f.type !== 'table')
                .map((field) => (
                    <div key={field.name} className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-gray-700">
                            {field.name === 'yardage' ? 'Total Yardage' : field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderFieldInput(field)}
                    </div>
                ))}
        </div>
    )
    const renderFormSection = () => {
        if (report.name === 'plant_production') return renderPlantProductionForm()
        if (report.name === 'plant_manager') return renderPlantManagerForm()
        if (!EXCLUDED_REPORT_TYPES.includes(report.name)) return renderDefaultForm()
        return null
    }
    return (
        <div className="bg-slate-50 min-h-screen w-full">
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
            <form className="max-w-5xl mx-auto px-3 py-4 sm:px-4 sm:py-6 md:px-6" onSubmit={handleSubmit}>
                {!EXCLUDED_REPORT_TYPES.includes(report.name) && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                        {renderFormSection()}
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
                        setDebugMsg={() => {}}
                        allReports={report.name === 'general_manager' ? allReports : undefined}
                        weekIso={
                            [
                                'general_manager',
                                'aggregate_production',
                                'plant_manager',
                                'ready_mix_instructor'
                            ].includes(report.name)
                                ? report.weekIso
                                : undefined
                        }
                        setForm={setForm}
                        plants={plants}
                        readOnly={readOnly}
                        user={user}
                        userId={targetUserId}
                        userPlantCode={userPlantCode}
                        onChange={handleChange}
                    />
                )}
                {success && (
                    <div className="bg-green-100 text-green-700 p-4 rounded-lg mx-4 my-4 text-sm font-medium">
                        Report submitted successfully.
                    </div>
                )}
                {saveMessage && (
                    <div className="bg-green-100 text-green-700 p-4 rounded-lg mx-4 my-4 text-sm font-medium">
                        {saveMessage}
                    </div>
                )}
                {!readOnly && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-gray-200 mt-4 sm:mt-6">
                        <button
                            type="button"
                            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors order-3 sm:order-1"
                            onClick={handleBackClick}
                            disabled={submitting || savingDraft}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-sky-100 text-sky-700 rounded-lg text-sm font-semibold hover:bg-sky-200 transition-colors order-2"
                            onClick={handleSaveDraft}
                            disabled={submitting || savingDraft}
                        >
                            {savingDraft ? 'Saving...' : 'Save Changes'}
                        </button>
                        {!managerEditUser && (
                            <button
                                type="submit"
                                className="px-4 sm:px-6 py-2.5 sm:py-3 text-white rounded-lg text-sm font-semibold transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed order-1 sm:order-3"
                                style={{ background: accentColor }}
                                disabled={submitting || savingDraft}
                            >
                                {submitting
                                    ? report.name === 'plant_production'
                                        ? 'Validating...'
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
            {showExclusionReasonModal && (
                <OperatorExclusionReasonModal
                    onConfirm={handleExclusionReasonConfirm}
                    onCancel={() => {
                        setShowExclusionReasonModal(false)
                        // Re-include the last excluded operator since they declined to give a reason
                        if (excludedOperators.length > 0) {
                            addOperatorRow(excludedOperators[excludedOperators.length - 1], mixers)
                        }
                    }}
                />
            )}
            {aiValidating && (
                <AIValidatingModal progress={aiValidationProgress} reportName={report.name} accentColor={accentColor} />
            )}
        </div>
    )
}
const AIValidatingModal = ({ progress, reportName, accentColor }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-200 border-3 border-amber-500 text-amber-500 text-2xl animate-spin">
                    <i className="fas fa-robot"></i>
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-bold m-0 mb-1" style={{ color: accentColor }}>
                        AI Validation in Progress
                    </h2>
                    <p className="text-slate-500 text-sm m-0">Analyzing efficiency report comments...</p>
                </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg mb-4 p-4">
                <div className="flex items-center gap-3 mb-3">
                    <i className="fas fa-clipboard-check text-amber-500 text-lg"></i>
                    <span className="text-gray-700 text-sm font-semibold">
                        Validating operator explanations for timing issues
                    </span>
                </div>
                {progress.total > 0 && (
                    <div>
                        <div className="text-slate-500 text-xs mb-2">
                            Checking {progress.total} operator{progress.total !== 1 ? 's' : ''} with performance issues
                        </div>
                        <div className="bg-slate-200 rounded-lg h-2 overflow-hidden w-full">
                            <div
                                className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-300"
                                style={{
                                    width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%'
                                }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>
            <div className="bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300 border-l-4 border-l-amber-500 rounded-md text-amber-800 text-xs p-3">
                <div className="flex gap-2">
                    <i className="fas fa-info-circle text-amber-500 flex-shrink-0 mt-0.5"></i>
                    <div>
                        {reportName === 'plant_manager'
                            ? 'AI is checking if your hours, yardage, lost yardage, and resold yardage values make sense together. This helps catch data entry errors.'
                            : 'AI is ensuring all comments provide specific explanations for delayed starts, delayed washouts, low loads, or excessive hours.'}
                    </div>
                </div>
            </div>
        </div>
    </div>
)
export default ReportsSubmitView
