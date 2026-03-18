import { useCallback, useEffect, useRef, useState } from 'react'

import { PlanService } from '../../services/PlanService'
import { ReportService } from '../../services/ReportService'
import { UserService } from '../../services/UserService'
import { AUTOSAVE_DELAY_MS, createEmptyAssignment, ensureUniqueIds, getOffsetDate } from '../../utils/PlanUtility'
import { useRealtimeSubscription } from './useRealtimeSubscription'

export function usePlanData(planDate) {
    const [plants, setPlants] = useState([])
    const [mixerCountsByPlant, setMixerCountsByPlant] = useState({})
    const [assignments, setAssignments] = useState([])
    const [notes, setNotes] = useState('')
    const [travelTimes, setTravelTimes] = useState({})
    const [userId, setUserId] = useState(null)
    const [canEdit, setCanEdit] = useState(true)
    const [isLoading, setIsLoading] = useState(true)
    const [plantProduction, setPlantProduction] = useState({})
    const [adjacentPlans, setAdjacentPlans] = useState({})
    const [adjacentProduction, setAdjacentProduction] = useState({})
    const dirtyRef = useRef(false)

    const getTravelTime = (from, to) => travelTimes[`${from}->${to}`] ?? null

    const refreshTravelTimes = async () => {
        await PlanService.fetchTravelTimes()
        setTravelTimes(PlanService.getTravelTimesMap())
    }

    // Initial data load
    useEffect(() => {
        const loadInitialData = async () => {
            const user = await UserService.getCurrentUser()
            const uid = user?.id || user
            if (uid) {
                setUserId(uid)
                try {
                    const hasEdit = await UserService.hasPermission(uid, 'plan.edit')
                    setCanEdit(hasEdit)
                } catch {
                    setCanEdit(true)
                }
            }
            let plantList = uid ? await ReportService.fetchPlantsForUser(uid) : []
            if (!plantList.length) plantList = await ReportService.fetchPlantsSorted()
            const sorted = plantList
                .filter((p) => p.plant_code)
                .sort((a, b) => String(a.plant_code).localeCompare(String(b.plant_code)))
            setPlants(sorted)
            if (sorted.length) {
                const counts = await ReportService.fetchActiveMixerCountsByPlant(
                    sorted.map((p) => p.plant_code).filter(Boolean)
                )
                setMixerCountsByPlant(counts)
            }
            await refreshTravelTimes()
            setIsLoading(false)
        }
        loadInitialData()
    }, [])

    // Load plan for selected date
    const loadedForDateRef = useRef(null)
    const autosaveEnabledRef = useRef(false)
    useEffect(() => {
        if (!planDate || isLoading) return
        loadedForDateRef.current = null
        autosaveEnabledRef.current = false
        const loadPlan = async () => {
            try {
                const plan = await PlanService.fetchPlan(planDate)
                if (plan?.assignments?.length) {
                    setAssignments(ensureUniqueIds(plan.assignments))
                } else {
                    setAssignments([createEmptyAssignment()])
                }
                setNotes(plan?.notes || '')
                setPlantProduction(plan?.plant_production || {})
            } catch {
                setAssignments([createEmptyAssignment()])
                setNotes('')
                setPlantProduction({})
            }
            loadedForDateRef.current = planDate
            requestAnimationFrame(() => {
                autosaveEnabledRef.current = true
            })
        }
        loadPlan()
    }, [planDate, isLoading])

    // Fetch adjacent days for timeline view
    const adjacentFetchRef = useRef(0)
    useEffect(() => {
        if (!planDate || isLoading) return
        const fetchId = ++adjacentFetchRef.current
        const loadAdjacentPlans = async () => {
            const offsets = [-3, -2, -1, 1, 2, 3]
            const dates = offsets.map((o) => getOffsetDate(planDate, o))
            const results = await Promise.allSettled(dates.map((d) => PlanService.fetchPlan(d)))
            if (adjacentFetchRef.current !== fetchId) return
            const plans = {}
            const production = {}
            dates.forEach((d, i) => {
                const result = results[i]
                if (result.status === 'fulfilled' && result.value) {
                    if (result.value.assignments?.length) plans[d] = result.value.assignments
                    if (result.value.plant_production) production[d] = result.value.plant_production
                }
            })
            setAdjacentPlans(plans)
            setAdjacentProduction(production)
        }
        loadAdjacentPlans()
    }, [planDate, isLoading])

    // Autosave
    useEffect(() => {
        if (!canEdit || !planDate || isLoading) return
        if (loadedForDateRef.current !== planDate || !autosaveEnabledRef.current) return
        dirtyRef.current = true
        const timeout = setTimeout(async () => {
            try {
                await PlanService.savePlan(planDate, assignments, notes, plantProduction)
                dirtyRef.current = false
            } catch {}
        }, AUTOSAVE_DELAY_MS)
        return () => clearTimeout(timeout)
    }, [canEdit, planDate, assignments, notes, plantProduction, isLoading])

    // Realtime: sync plan changes from other users
    const planDateRef = useRef(planDate)
    planDateRef.current = planDate
    const assignmentsRef = useRef(assignments)
    assignmentsRef.current = assignments
    const notesRef = useRef(notes)
    notesRef.current = notes
    const plantProductionRef = useRef(plantProduction)
    plantProductionRef.current = plantProduction

    useRealtimeSubscription({
        table: 'plans',
        enabled: !isLoading,
        onChange: useCallback((payload) => {
            if (dirtyRef.current) return
            const record = payload.new
            if (!record || record.plan_date !== planDateRef.current) return
            const incoming = JSON.stringify(record.assignments ?? [])
            const local = JSON.stringify(assignmentsRef.current)
            if (incoming !== local) {
                setAssignments(
                    record.assignments?.length ? ensureUniqueIds(record.assignments) : [createEmptyAssignment()]
                )
            }
            if ((record.notes || '') !== notesRef.current) {
                setNotes(record.notes || '')
            }
            if (record.plant_production && Object.keys(record.plant_production).length > 0) {
                const incomingProd = JSON.stringify(record.plant_production)
                const localProd = JSON.stringify(plantProductionRef.current)
                if (incomingProd !== localProd) {
                    setPlantProduction(record.plant_production)
                }
            }
        }, [])
    })

    // Realtime: refresh mixer counts
    const plantCodesRef = useRef([])
    plantCodesRef.current = plants.map((p) => p.plant_code).filter(Boolean)

    useRealtimeSubscription({
        table: 'mixers',
        enabled: !isLoading && plants.length > 0,
        onChange: useCallback(async () => {
            if (!plantCodesRef.current.length) return
            const counts = await ReportService.fetchActiveMixerCountsByPlant(plantCodesRef.current)
            setMixerCountsByPlant(counts)
        }, [])
    })

    // Realtime: refresh travel times
    useRealtimeSubscription({
        table: 'plant_travel_times',
        enabled: !isLoading,
        onChange: useCallback(async () => {
            await PlanService.fetchTravelTimes()
            setTravelTimes(PlanService.getTravelTimesMap())
        }, [])
    })

    return {
        adjacentPlans,
        adjacentProduction,
        assignments,
        canEdit,
        dirtyRef,
        getTravelTime,
        isLoading,
        mixerCountsByPlant,
        notes,
        plantProduction,
        plants,
        refreshTravelTimes,
        setAssignments,
        setNotes,
        setPlantProduction,
        travelTimes,
        userId
    }
}
