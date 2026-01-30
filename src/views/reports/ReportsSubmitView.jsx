import React, { useEffect, useState } from 'react'

import { supabase } from '../../services/DatabaseService'
import { ReportService } from '../../services/ReportService'
import { DateUtility } from '../../utils/DateUtility'
import { exportGeneralManagerReport } from '../../utils/ExportUtility'
import { ReportUtility } from '../../utils/ReportUtility'
import { AggregateProductionSubmitPlugin } from './types/WeeklyAggregateProductionReport'
import { DistrictManagerSubmitPlugin } from './types/WeeklyDistrictManagerReport'
import { EfficiencySubmitPlugin } from './types/WeeklyEfficiencyReport'
import { GeneralManagerSubmitPlugin } from './types/WeeklyGeneralManagerReport'
import { PlantManagerSubmitPlugin } from './types/WeeklyPlantManagerReport'
import { ReadyMixInstructorSubmitPlugin } from './types/WeeklyReadyMixInstructorReport'
import { SafetyManagerSubmitPlugin } from './types/WeeklySafetyManagerReport'

const styles = {
    actions: {
        alignItems: 'center',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'flex-end',
        marginTop: '1.5rem',
        paddingTop: '1.5rem'
    },
    backBtn: {
        alignItems: 'center',
        background: '#f1f5f9',
        border: 'none',
        borderRadius: '10px',
        color: '#475569',
        cursor: 'pointer',
        display: 'flex',
        fontSize: '1rem',
        height: '40px',
        justifyContent: 'center',
        transition: 'all 0.2s',
        width: '40px'
    },
    btnConfirm: {
        background: '#1e3a5f',
        border: 'none',
        borderRadius: '8px',
        color: 'white',
        cursor: 'pointer',
        fontSize: '0.9375rem',
        fontWeight: 600,
        padding: '0.75rem 1.5rem'
    },
    btnSecondary: {
        background: '#f1f5f9',
        border: 'none',
        borderRadius: '8px',
        color: '#475569',
        cursor: 'pointer',
        fontSize: '0.9375rem',
        fontWeight: 600,
        padding: '0.75rem 1.5rem'
    },
    cancelBtn: {
        background: '#f1f5f9',
        border: 'none',
        borderRadius: '8px',
        color: '#475569',
        cursor: 'pointer',
        fontSize: '0.9375rem',
        fontWeight: 600,
        padding: '0.75rem 1.5rem',
        transition: 'all 0.2s'
    },
    checkboxLabel: {
        alignItems: 'flex-start',
        color: '#374151',
        cursor: 'pointer',
        display: 'flex',
        fontSize: '0.9375rem',
        gap: '0.75rem',
        marginBottom: '1rem'
    },
    container: {
        background: '#f8fafc',
        minHeight: '100vh',
        padding: '0',
        width: '100%'
    },
    content: {
        margin: '0 auto',
        maxWidth: '1200px',
        padding: '1.5rem'
    },
    error: {
        background: '#fee2e2',
        borderRadius: '8px',
        color: '#dc2626',
        fontSize: '0.875rem',
        fontWeight: 500,
        marginBottom: '1rem',
        padding: '1rem'
    },
    exportBtn: {
        alignItems: 'center',
        background: '#10b981',
        border: 'none',
        borderRadius: '8px',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        fontSize: '0.875rem',
        fontWeight: 600,
        gap: '0.5rem',
        padding: '0.625rem 1rem',
        transition: 'all 0.2s'
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    },
    fieldHeader: {
        alignItems: 'center',
        display: 'flex',
        gap: '0.5rem'
    },
    fieldIcon: {
        color: '#1e3a5f',
        fontSize: '0.875rem'
    },
    fieldLabel: {
        color: '#374151',
        fontSize: '0.875rem',
        fontWeight: 600
    },
    fieldsGrid: {
        display: 'grid',
        gap: '1.25rem',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
    },
    header: {
        alignItems: 'center',
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 40
    },
    headerLeft: {
        alignItems: 'center',
        display: 'flex',
        gap: '1rem'
    },
    headerRight: {
        alignItems: 'center',
        display: 'flex',
        gap: '0.75rem'
    },
    input: {
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxSizing: 'border-box',
        color: '#1e293b',
        fontSize: '0.9375rem',
        outline: 'none',
        padding: '0.75rem 1rem',
        transition: 'all 0.2s',
        width: '100%'
    },
    metaBar: {
        alignItems: 'center',
        background: '#f8fafc',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.5rem',
        padding: '1rem 1.5rem'
    },
    metaIcon: {
        color: '#94a3b8'
    },
    metaItem: {
        alignItems: 'center',
        color: '#64748b',
        display: 'flex',
        fontSize: '0.875rem',
        gap: '0.5rem'
    },
    metaStrong: {
        color: '#1e293b',
        fontWeight: 600
    },
    modalActions: {
        alignItems: 'center',
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'flex-end',
        marginTop: '1.5rem'
    },
    modalBackdrop: {
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        left: 0,
        padding: '1rem',
        position: 'fixed',
        right: 0,
        top: 0,
        zIndex: 1000
    },
    modalContent: {
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        maxWidth: '500px',
        padding: '2rem',
        width: '100%'
    },
    modalText: {
        color: '#64748b',
        fontSize: '0.9375rem',
        marginBottom: '1.5rem'
    },
    modalTitle: {
        color: '#1e293b',
        fontSize: '1.25rem',
        fontWeight: 700,
        marginBottom: '1rem'
    },
    required: {
        color: '#ef4444',
        marginLeft: '0.25rem'
    },
    saveBtn: {
        background: '#e0f2fe',
        border: 'none',
        borderRadius: '8px',
        color: '#0369a1',
        cursor: 'pointer',
        fontSize: '0.9375rem',
        fontWeight: 600,
        padding: '0.75rem 1.5rem',
        transition: 'all 0.2s'
    },
    section: {
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        marginBottom: '1.5rem',
        padding: '1.5rem'
    },
    sectionHeader: {
        marginBottom: '1.25rem'
    },
    sectionSubtitle: {
        color: '#64748b',
        fontSize: '0.875rem',
        margin: '0.5rem 0 0 0'
    },
    sectionTitle: {
        alignItems: 'center',
        color: '#1e293b',
        display: 'flex',
        fontSize: '1.125rem',
        fontWeight: 600,
        gap: '0.75rem',
        margin: 0
    },
    select: {
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxSizing: 'border-box',
        color: '#1e293b',
        cursor: 'pointer',
        fontSize: '0.9375rem',
        outline: 'none',
        padding: '0.75rem 1rem',
        width: '100%'
    },
    submitBtn: {
        background: '#1e3a5f',
        border: 'none',
        borderRadius: '8px',
        color: 'white',
        cursor: 'pointer',
        fontSize: '0.9375rem',
        fontWeight: 600,
        padding: '0.75rem 1.5rem',
        transition: 'all 0.2s'
    },
    subtitle: {
        color: '#64748b',
        fontSize: '0.875rem',
        margin: 0
    },
    success: {
        background: '#d1fae5',
        borderRadius: '8px',
        color: '#059669',
        fontSize: '0.875rem',
        fontWeight: 500,
        marginBottom: '1rem',
        padding: '1rem'
    },
    textarea: {
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxSizing: 'border-box',
        color: '#1e293b',
        fontSize: '0.9375rem',
        minHeight: '100px',
        outline: 'none',
        padding: '0.75rem 1rem',
        resize: 'vertical',
        transition: 'all 0.2s',
        width: '100%'
    },
    title: {
        color: '#1e293b',
        fontSize: '1.25rem',
        fontWeight: 700,
        margin: 0
    },
    titleSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
    }
}

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
                return {
                    ...Object.fromEntries(report.fields.map((f) => [f.name, f.type === 'table' ? [] : ''])),
                    ...initialData.data,
                    ...(initialData.rows ? { rows: initialData.rows } : {})
                }
            }
            return {
                ...Object.fromEntries(report.fields.map((f) => [f.name, f.type === 'table' ? [] : ''])),
                ...initialData
            }
        }
        return Object.fromEntries(report.fields.map((f) => [f.name, f.type === 'table' ? [] : '']))
    })
    const [submitting, setSubmitting] = useState(false)
    const [savingDraft, setSavingDraft] = useState(false)
    const [aiValidating, setAiValidating] = useState(false)
    const [aiValidationProgress, setAiValidationProgress] = useState({ current: 0, total: 0 })
    const [aiWarningModal, setAiWarningModal] = useState(null)
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
    const [loadingPlants, setLoadingPlants] = useState(true)

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
            setForm({ ...form, rows: updatedRows })
            return
        }
        if (report.name === 'general_manager' && name.startsWith('plant_field_')) {
            setForm({ ...form, [name]: e.target.value })
            return
        }
        let value = e.target.value
        if (
            ['total_yards_lost', 'yardage_lost', 'lost_yardage', 'Yardage Lost', 'yardage_lost'].includes(name) &&
            value !== '' &&
            !isNaN(Number(value)) &&
            Number(value) < 0
        ) {
            value = 0
        }
        setForm({ ...form, [name]: value })
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
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
                setError('All issues must have a description, plant, and tag.')
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
                setError(v)
                return
            }
        }
        setSubmitting(true)
        try {
            await onSubmit(form, 'submit')
            setSuccess(true)
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
            const submitData = { ...form }
            if (report.name === 'plant_manager' && user && user.plant_code && !submitData.plant) {
                submitData.plant = user.plant_code
            }
            await onSubmit(submitData, 'submit')
            setSuccess(true)
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
        setForm({ ...form, rows: updatedRows })
        setCarouselIndex(newIndex)
    }

    function handleReincludeOperator(operatorId) {
        if (!operatorId) return
        const mixer = mixers.find((m) => m.assigned_operator === operatorId)
        const newRow = {
            comments: '',
            eod_in_yard: '',
            first_load: '',
            loads: '',
            name: operatorId,
            punch_out: '',
            start_time: '',
            truck_number: mixer && mixer.truck_number ? mixer.truck_number : ''
        }
        setForm((f) => {
            const rows = [...(f.rows || []), newRow]
            return { ...f, rows }
        })
        setCarouselIndex(form.rows ? form.rows.length : 0)
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
        async function fetchPlants() {
            setLoadingPlants(true)
            const targetUserId = managerEditUser || user?.id
            if (targetUserId) {
                const list = await ReportService.fetchPlantsForUser(targetUserId)
                setPlants(list)
            } else {
                const list = await ReportService.fetchPlantsSorted()
                setPlants(list)
            }
            setLoadingPlants(false)
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
            const userPlant =
                user?.plant_code && plants.some((p) => p.plant_code === user.plant_code)
                    ? user.plant_code
                    : plants[0]?.plant_code || ''
            setForm((f) => ({ ...f, plant: userPlant }))
        }
    }, [report.name, form.plant, user, plants])

    useEffect(() => {
        async function fetchOperatorsAndMixers(plantCode) {
            if (!plantCode) {
                setOperatorOptions([])
                setMixers([])
                setForm((f) => ({ ...f, rows: [] }))
                return
            }
            const { operatorOptions, mixers, activeOperators } =
                await ReportService.fetchActiveOperatorsAndMixers(plantCode)
            setOperatorOptions(operatorOptions)
            setMixers(mixers)
            if (report.name === 'plant_production' && !readOnly) {
                if (
                    (!initialData || !initialData.rows || initialData.rows.length === 0) &&
                    (!form.rows || form.rows.length === 0)
                ) {
                    const rows = []
                    activeOperators.forEach((op) => {
                        const mixer = mixers.find((m) => m.assigned_operator === op.employee_id)
                        rows.push({
                            comments: '',
                            eod_in_yard: '',
                            first_load: '',
                            loads: '',
                            name: op.employee_id,
                            punch_out: '',
                            start_time: '',
                            truck_number: mixer && mixer.truck_number ? mixer.truck_number : ''
                        })
                    })
                    setForm((f) => ({ ...f, rows }))
                    setCarouselIndex(0)
                }
            }
        }

        if (report.name === 'plant_production') {
            const plantCode = form.plant
            if (!plantCode) {
                setForm((f) => ({ ...f, rows: [] }))
                return
            }
            fetchOperatorsAndMixers(plantCode)
        }
    }, [report.name, form.plant, user, readOnly, plants])

    useEffect(() => {
        if (initialData) {
            if (initialData.data) {
                setForm(() => ({
                    ...Object.fromEntries(report.fields.map((f) => [f.name, f.type === 'table' ? [] : ''])),
                    ...initialData.data,
                    ...(initialData.rows ? { rows: initialData.rows } : {})
                }))
            } else {
                setForm(() => ({
                    ...Object.fromEntries(report.fields.map((f) => [f.name, f.type === 'table' ? [] : ''])),
                    ...initialData
                }))
            }
        }
    }, [initialData])

    const [hoursReceivedFromOtherPlants, setHoursReceivedFromOtherPlants] = useState(0)

    useEffect(() => {
        async function fetchHoursReceived() {
            const plantCode = String(form?.plant || user?.plant_code || '')
            if (report.name !== 'plant_manager' || !report.weekIso || !plantCode) {
                setHoursReceivedFromOtherPlants(0)
                return
            }

            try {
                const weekStart = report.weekIso.split('T')[0]
                const [year] = weekStart.split('-').map(Number)

                const startOfYear = new Date(year, 0, 1)
                const endOfYear = new Date(year, 11, 31, 23, 59, 59)

                const { data: allReports, error } = await supabase
                    .from('reports')
                    .select('*')
                    .eq('report_name', 'plant_manager')
                    .eq('completed', true)
                    .gte('week', startOfYear.toISOString())
                    .lte('week', endOfYear.toISOString())

                if (error) {
                    console.error('Error fetching reports:', error)
                    setHoursReceivedFromOtherPlants(0)
                    return
                }

                const totalReceived = ReportUtility.calculateHoursReceivedForWeek(allReports, report.weekIso, plantCode)
                setHoursReceivedFromOtherPlants(totalReceived)
            } catch (err) {
                console.error('Error fetching hours received:', err)
                setHoursReceivedFromOtherPlants(0)
            }
        }

        fetchHoursReceived()
    }, [report.name, report.weekIso, user?.plant_code, form?.plant])

    useEffect(() => {
        const { lost, lostGrade, lostLabel } = ReportService.getYardageMetrics(form)

        if (report.name === 'plant_manager') {
            const metrics = ReportUtility.getFullYphMetrics(form, hoursReceivedFromOtherPlants)
            setYph({ adjusted: metrics.adjusted, raw: metrics.raw })
            setYphGrade({ adjusted: metrics.adjustedGrade, raw: metrics.rawGrade })
            setYphLabel({ adjusted: metrics.adjustedLabel, raw: metrics.rawLabel })
        } else {
            const { yph, yphGrade, yphLabel } = ReportService.getYardageMetrics(form)
            setYph({ adjusted: yph, raw: yph })
            setYphGrade({ adjusted: yphGrade, raw: yphGrade })
            setYphLabel({ adjusted: yphLabel, raw: yphLabel })
        }

        setLost(lost)
        setLostGrade(lostGrade)
        setLostLabel(lostLabel)
    }, [form, report.name, hoursReceivedFromOtherPlants])

    useEffect(() => {
        if (report.name === 'plant_production' && Array.isArray(form.rows) && Array.isArray(operatorOptions)) {
            const excluded = ReportUtility.getExcludedOperators(form.rows, operatorOptions)
            setExcludedOperators(excluded)
        }
    }, [form.rows, operatorOptions, report.name])

    useEffect(() => {
        if (
            report.name !== 'plant_production' ||
            (report.name === 'plant_production' &&
                plants.length > 0 &&
                operatorOptions.length > 0 &&
                Array.isArray(form.rows))
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
            setForm((f) => ({ ...f, plant: user.plant_code }))
        }
    }, [report.name, user])

    useEffect(() => {
        if (report.name === 'plant_production' && forcedReportDate) {
            setForm((f) => ({ ...f, report_date: forcedReportDate }))
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
            `}</style>
            <div>
                {managerEditUser && (
                    <div
                        style={{
                            alignItems: 'center',
                            background: '#fef3c7',
                            color: '#92400e',
                            display: 'flex',
                            fontWeight: 500,
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem'
                        }}
                    >
                        <i className="fas fa-edit"></i>
                        {`Editing ${editingUserName}'s Report`}
                    </div>
                )}
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <button style={styles.backBtn} onClick={handleBackClick} type="button">
                            <i className="fas fa-arrow-left"></i>
                        </button>
                        <div style={styles.titleSection}>
                            <h1 style={styles.title}>{report.title || ''}</h1>
                            <p style={styles.subtitle}>{weekVerbose}</p>
                        </div>
                    </div>
                    <div style={styles.headerRight}>
                        <div
                            style={{
                                alignItems: 'center',
                                background: isCompleted ? '#d1fae5' : '#fef3c7',
                                borderRadius: '8px',
                                color: isCompleted ? '#059669' : '#d97706',
                                display: 'flex',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                gap: '0.5rem',
                                padding: '0.5rem 1rem'
                            }}
                        >
                            <i className={`fas ${isCompleted ? 'fa-check-circle' : 'fa-edit'}`}></i>
                            {readOnly ? 'View Only' : isCompleted ? 'Submitted' : 'Editing'}
                        </div>
                        {isGM && (
                            <button
                                type="button"
                                style={styles.exportBtn}
                                onClick={handleExport}
                                disabled={exporting || loadingPlants}
                            >
                                <i className="fas fa-file-export"></i>
                                {loadingPlants ? 'Loading...' : exporting ? 'Exporting...' : 'Export'}
                            </button>
                        )}
                    </div>
                </div>
                <div style={styles.metaBar}>
                    {reportDateVerbose && (
                        <div style={styles.metaItem}>
                            <i className="far fa-calendar-check" style={styles.metaIcon}></i>
                            <span>Report Date:</span>
                            <strong style={styles.metaStrong}>{reportDateVerbose}</strong>
                        </div>
                    )}
                    {report.name === 'plant_production' && form.plant && (
                        <div style={styles.metaItem}>
                            <i className="fas fa-industry" style={styles.metaIcon}></i>
                            <span>Plant:</span>
                            <strong style={styles.metaStrong}>{form.plant}</strong>
                        </div>
                    )}
                </div>
                {exportError && <div style={styles.error}>{exportError}</div>}
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
                                                                            <label className="rpts-sbmt-label">
                                                                                Name
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={
                                                                                    operatorOptions.find(
                                                                                        (opt) =>
                                                                                            opt.value ===
                                                                                            form.rows[carouselIndex]
                                                                                                ?.name
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
                                                                                    form.rows[carouselIndex]
                                                                                        ?.start_time ?? ''
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
                                                                                    form.rows[carouselIndex]
                                                                                        ?.first_load ?? ''
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
                                                                                    form.rows[carouselIndex]
                                                                                        ?.eod_in_yard ?? ''
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
                                                                                    form.rows[carouselIndex]
                                                                                        ?.punch_out ?? ''
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
                                                                                    form.rows[carouselIndex]?.loads ??
                                                                                    ''
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
                                                                        <label className="rpts-sbmt-label">
                                                                            Comments
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={
                                                                                form.rows[carouselIndex]?.comments ?? ''
                                                                            }
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
                                                        <div className="rpts-sbmt-section-title">
                                                            Excluded Operators
                                                        </div>
                                                        <div className="rpts-sbmt-flex-wrap">
                                                            {excludedOperators.map((opId) => {
                                                                const op = operatorOptions.find(
                                                                    (opt) => opt.value === opId
                                                                )
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
                                  'aggregate_production' ? null : report.name ===
                                  'safety_manager' ? null : report.name === 'district_manager' ? null : report.name ===
                                  'plant_manager' ? (
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
                                                                {field.name === 'yardage'
                                                                    ? 'Total Yardage'
                                                                    : field.label}
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
                                                        {field.required && (
                                                            <span className="rpts-sbmt-required">*</span>
                                                        )}
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
                    {error && <div className="rpts-sbmt-error">{error}</div>}
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
            </div>
            {showConfirmationModal && (
                <div className="rpts-sbmt-modal-backdrop">
                    <div className="rpts-sbmt-modal-content">
                        <h2 className="rpts-sbmt-modal-title">Confirm Submission</h2>
                        <div className="rpts-sbmt-modal-text">Please confirm the following before submitting:</div>
                        <div>
                            <label className="rpts-sbmt-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={confirmationChecks[0]}
                                    onChange={(e) => setConfirmationChecks([e.target.checked, confirmationChecks[1]])}
                                />
                                Total yardage includes all yardage we can bill for and does not include lost yardage.
                            </label>
                        </div>
                        <div>
                            <label className="rpts-sbmt-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={confirmationChecks[1]}
                                    onChange={(e) => setConfirmationChecks([confirmationChecks[0], e.target.checked])}
                                />
                                Total hours only includes hours from operators and not from plant managers, loader
                                operators or any other roles.
                            </label>
                        </div>
                        <div className="rpts-sbmt-modal-actions">
                            <button
                                type="button"
                                className="rpts-sbmt-btn-secondary"
                                onClick={() => setShowConfirmationModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rpts-sbmt-btn-confirm"
                                disabled={!(confirmationChecks[0] && confirmationChecks[1])}
                                onClick={handleConfirmedSubmit}
                            >
                                Confirm & Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
