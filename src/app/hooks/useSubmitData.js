import { useEffect, useMemo, useState } from 'react'

import { supabase } from '../../services/DatabaseService'
import { ReportService } from '../../services/ReportService'
import { UserService } from '../../services/UserService'
import { DateUtility } from '../../utils/DateUtility'
import { ReportUtility } from '../../utils/ReportUtility'

/**
 * Loads data needed for the report submission form: maintenance items, operator options,
 * mixer lists, plants, and cross-plant hours received.
 */
export function useSubmitData({ report, initialData, user, managerEditUser }) {
    const [maintenanceItems, setMaintenanceItems] = useState([])
    const [operatorOptions, setOperatorOptions] = useState([])
    const [mixers, setMixers] = useState([])
    const [plants, setPlants] = useState([])
    const [loadingPlants, setLoadingPlants] = useState(true)
    const [hoursReceivedFromOtherPlants, setHoursReceivedFromOtherPlants] = useState(0)
    const [userPlantCode, setUserPlantCode] = useState('')

    const targetUserId = managerEditUser || user?.id

    const forcedReportDate = useMemo(() => {
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

    const nextForcedReportDate = useMemo(() => {
        if (report.name !== 'plant_production' || !forcedReportDate) return ''
        const nextDate = new Date(forcedReportDate)
        const addDays = new Date(forcedReportDate).getDay() === 6 ? 10 : 9
        nextDate.setDate(nextDate.getDate() + addDays)
        return nextDate.toISOString().slice(0, 10)
    }, [report.name, forcedReportDate])

    useEffect(() => {
        async function fetchPlants() {
            setLoadingPlants(true)
            let list = []
            if (targetUserId) {
                const plantCode = await UserService.getUserPlant(targetUserId)
                if (plantCode) setUserPlantCode(plantCode)
                list = await ReportService.fetchPlantsForUser(targetUserId)
            }
            if (!list || list.length === 0) {
                list = await ReportService.fetchPlantsSorted()
            }
            setPlants(list)
            setLoadingPlants(false)
        }
        fetchPlants()
    }, [targetUserId])

    useEffect(() => {
        async function fetchMaintenanceItems() {
            if (!report.weekIso) return
            const items = await ReportService.fetchMaintenanceItems(report.weekIso)
            setMaintenanceItems(items)
        }
        fetchMaintenanceItems()
    }, [report.weekIso])

    const fetchOperatorsAndMixers = async (plantCode) => {
        if (!plantCode) {
            setOperatorOptions([])
            setMixers([])
            return { activeOperators: [], mixers: [], operatorOptions: [] }
        }
        const result = await ReportService.fetchActiveOperatorsAndMixers(plantCode)
        setOperatorOptions(result.operatorOptions)
        setMixers(result.mixers)
        return result
    }

    const fetchHoursReceived = async (plantCode, weekIso) => {
        if (report.name !== 'plant_manager' || !weekIso || !plantCode) {
            setHoursReceivedFromOtherPlants(0)
            return 0
        }

        try {
            const weekStart = weekIso.split('T')[0]
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
                setHoursReceivedFromOtherPlants(0)
                return 0
            }

            const totalReceived = ReportUtility.calculateHoursReceivedForWeek(allReports, weekIso, plantCode)
            setHoursReceivedFromOtherPlants(totalReceived)
            return totalReceived
        } catch {
            setHoursReceivedFromOtherPlants(0)
            return 0
        }
    }

    const weekVerbose = ReportUtility.getWeekVerbose(report.weekIso)
    const isCompleted = initialData?.completed || false

    return {
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
        setHoursReceivedFromOtherPlants,
        targetUserId,
        userPlantCode,
        weekVerbose
    }
}
