import { useEffect, useMemo, useState } from 'react'

import { supabase } from '../../services/DatabaseService'
import { ReportService } from '../../services/ReportService'
import { UserService } from '../../services/UserService'
import { ReportUtility } from '../../utils/ReportUtility'

export function useReviewData({ report, initialData, user, completedByUser }) {
    const [form, setForm] = useState(initialData?.data || initialData || {})
    const [maintenanceItems, setMaintenanceItems] = useState([])
    const [ownerName, setOwnerName] = useState('')
    const [submittedAt, setSubmittedAt] = useState('')
    const [operatorOptions, setOperatorOptions] = useState([])
    const [assignedPlant, setAssignedPlant] = useState('')
    const [hasManagerEditPermission, setHasManagerEditPermission] = useState(false)
    const [showManagerEditButton, setShowManagerEditButton] = useState(false)
    const [plants, setPlants] = useState([])
    const [isPlantShutdown, setIsPlantShutdown] = useState(false)
    const [loadingPlants, setLoadingPlants] = useState(true)
    const [hoursReceivedFromOtherPlants, setHoursReceivedFromOtherPlants] = useState(0)

    const plantCode = useMemo(() => {
        if (form.plant) return form.plant
        if (Array.isArray(form.rows) && form.rows.length > 0) return form.rows[0].plant_code || ''
        return ''
    }, [form.plant, form.rows])

    const isSubmitted = !!initialData?.completed
    const weekIso = report.weekIso || initialData?.week
    const weekVerbose = ReportUtility.getWeekVerbose(weekIso)
    const reportDateVerbose = form.report_date ? ReportUtility.formatVerboseDate(form.report_date) : ''

    useEffect(() => {
        async function fetchHoursReceived() {
            const pCode = String(assignedPlant || form?.plant || '')
            if (report.name !== 'plant_manager' || !report.weekIso || !pCode) {
                setHoursReceivedFromOtherPlants(0)
                return
            }

            try {
                const weekStart = report.weekIso.split('T')[0]
                const [year, month, day] = weekStart.split('-').map(Number)
                const normalizedWeekStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

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
                    setHoursReceivedFromOtherPlants(0)
                    return
                }

                let totalReceived = 0
                if (allReports && Array.isArray(allReports)) {
                    allReports.forEach((otherReport) => {
                        const rawWeekStr = otherReport.week.split('T')[0]
                        const [wy, wm, wd] = rawWeekStr.split('-').map(Number)
                        const reportWeekStr = `${wy}-${String(wm).padStart(2, '0')}-${String(wd).padStart(2, '0')}`

                        if (reportWeekStr === normalizedWeekStr) {
                            const helpEntries = otherReport.data?.operators_sent_to_help || []
                            if (Array.isArray(helpEntries)) {
                                helpEntries.forEach((entry) => {
                                    const destPlant = String(entry.destination_plant || '')
                                    if (destPlant === pCode && entry.operators && Array.isArray(entry.operators)) {
                                        entry.operators.forEach((op) => {
                                            totalReceived += parseFloat(op.hours) || 0
                                        })
                                    }
                                })
                            }
                        }
                    })
                }

                setHoursReceivedFromOtherPlants(totalReceived)
            } catch {
                setHoursReceivedFromOtherPlants(0)
            }
        }

        fetchHoursReceived()
    }, [report.name, report.weekIso, assignedPlant, form?.plant])

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
            const name =
                completedByUser && (completedByUser.first_name || completedByUser.last_name)
                    ? `${completedByUser.first_name || ''} ${completedByUser.last_name || ''}`.trim()
                    : (await UserService.getUserDisplayName(ownerId)) || ownerId.slice(0, 8)
            setOwnerName(name)
        }

        fetchOwnerName()
    }, [report, user, initialData, completedByUser])

    useEffect(() => {
        async function fetchMaintenanceItems() {
            if (!weekIso) {
                setMaintenanceItems([])
                return
            }
            const items = await ReportService.fetchMaintenanceItems(weekIso)
            setMaintenanceItems(items)
        }

        fetchMaintenanceItems()
    }, [weekIso])

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
            if (
                (report.name === 'plant_manager' ||
                    report.name === 'district_manager' ||
                    report.name === 'plant_production') &&
                completedByUser &&
                completedByUser.id
            ) {
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
            setLoadingPlants(true)
            if (report.name === 'general_manager' && user?.id) {
                const list = await ReportService.fetchPlantsForUser(user.id)
                if (list && list.length > 0) {
                    setPlants(list)
                } else {
                    const allPlants = await ReportService.fetchPlantsSorted()
                    setPlants(allPlants)
                }
            } else {
                const list = await ReportService.fetchPlantsSorted()
                setPlants(list)
            }
            setLoadingPlants(false)
        }

        fetchPlants()
    }, [report.name, user?.id])

    const { yph, yphGrade, yphLabel, lost, lostGrade, lostLabel } = useMemo(() => {
        const { lost, lostGrade, lostLabel } = ReportService.getYardageMetrics(form)

        if (report.name === 'plant_manager') {
            const metrics = ReportUtility.getFullYphMetrics(form, hoursReceivedFromOtherPlants)
            return {
                lost,
                lostGrade,
                lostLabel,
                yph: { adjusted: metrics.adjusted, raw: metrics.raw },
                yphGrade: { adjusted: metrics.adjustedGrade, raw: metrics.rawGrade },
                yphLabel: { adjusted: metrics.adjustedLabel, raw: metrics.rawLabel }
            }
        } else {
            const { yph, yphGrade, yphLabel } = ReportService.getYardageMetrics(form)
            return {
                lost,
                lostGrade,
                lostLabel,
                yph: { adjusted: yph, raw: yph },
                yphGrade: { adjusted: yphGrade, raw: yphGrade },
                yphLabel: { adjusted: yphLabel, raw: yphLabel }
            }
        }
    }, [form, report.name, hoursReceivedFromOtherPlants])

    return {
        assignedPlant,
        form,
        hasManagerEditPermission,
        hoursReceivedFromOtherPlants,
        isPlantShutdown,
        isSubmitted,
        loadingPlants,
        lost,
        lostGrade,
        lostLabel,
        maintenanceItems,
        operatorOptions,
        ownerName,
        plants,
        reportDateVerbose,
        showManagerEditButton,
        submittedAt,
        weekIso,
        weekVerbose,
        yph,
        yphGrade,
        yphLabel
    }
}
