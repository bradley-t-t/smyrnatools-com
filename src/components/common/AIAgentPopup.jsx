import React, { useCallback, useEffect, useRef, useState } from 'react'

import { AIService } from '../../services/AIService'
import { supabase } from '../../services/DatabaseService'
import { EquipmentService } from '../../services/EquipmentService'
import { ListService } from '../../services/ListService'
import { MixerService } from '../../services/MixerService'
import { OperatorService } from '../../services/OperatorService'
import { PickupTruckService } from '../../services/PickupTruckService'
import { RegionService } from '../../services/RegionService'
import { TractorService } from '../../services/TractorService'
import { TrailerService } from '../../services/TrailerService'

export default function AIAgentPopup({ isOpen, onClose, regionName, regionCode, selectedPlant }) {
    const [messages, setMessages] = useState([])
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [contextData, setContextData] = useState(null)
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [isOpen])

    const fetchContextData = useCallback(async () => {
        try {
            let regionPlantCodes = new Set()
            let plantCodeToName = new Map()
            if (regionCode) {
                try {
                    const plants = await RegionService.fetchRegionPlants(regionCode)
                    plants.forEach((p) => {
                        const code = String(p.plantCode || p.plant_code || '')
                            .trim()
                            .toUpperCase()
                        const name = p.plantName || p.plant_name || ''
                        if (code) {
                            regionPlantCodes.add(code)
                            plantCodeToName.set(code, name)
                        }
                    })
                } catch (err) {
                    console.error('Error fetching region plants:', err)
                }
            } else {
            }

            const filterByPlant = (item, plantField = 'assignedPlant') => {
                if (regionPlantCodes.size === 0) return true
                const plantCode = String(item[plantField] || item.assigned_plant || '')
                    .trim()
                    .toUpperCase()
                return regionPlantCodes.has(plantCode)
            }

            const [mixersRes, tractorsRes, trailersRes, equipmentRes, pickupsRes, operatorsRes, listItemsRes] =
                await Promise.all([
                    MixerService.fetchMixers().catch((e) => {
                        console.error('AI Agent - Mixers fetch error:', e)
                        return []
                    }),
                    TractorService.fetchTractors().catch((e) => {
                        console.error('AI Agent - Tractors fetch error:', e)
                        return []
                    }),
                    TrailerService.fetchTrailers().catch((e) => {
                        console.error('AI Agent - Trailers fetch error:', e)
                        return []
                    }),
                    EquipmentService.fetchEquipments().catch((e) => {
                        console.error('AI Agent - Equipment fetch error:', e)
                        return []
                    }),
                    PickupTruckService.fetchAll().catch((e) => {
                        console.error('AI Agent - Pickups fetch error:', e)
                        return []
                    }),
                    OperatorService.fetchOperators().catch((e) => {
                        console.error('AI Agent - Operators fetch error:', e)
                        return []
                    }),
                    ListService.fetchListItems().catch((e) => {
                        console.error('AI Agent - ListItems fetch error:', e)
                        return []
                    })
                ])

            let reportsData = []
            let userIdToPlantCode = new Map()
            try {
                const [reportsResult, usersResult] = await Promise.all([
                    supabase.from('reports').select('*').eq('completed', true).order('week', { ascending: false }),
                    supabase.from('users_profiles').select('id, plant_code')
                ])
                if (reportsResult.data) reportsData = reportsResult.data
                if (usersResult.data) {
                    usersResult.data.forEach((u) => {
                        if (u.id && u.plant_code) {
                            userIdToPlantCode.set(u.id, String(u.plant_code).trim())
                        }
                    })
                }
            } catch (e) {
                console.error('Error fetching reports:', e)
            }

            const allMixers = mixersRes || []
            const allTractors = tractorsRes || []
            const allTrailers = trailersRes || []
            const allEquipment = equipmentRes || []
            const allPickups = pickupsRes || []
            const allOperators = operatorsRes || []
            const allListItems = listItemsRes || []

            const mixers = allMixers.filter((m) => filterByPlant(m))
            const tractors = allTractors.filter((t) => filterByPlant(t))
            const trailers = allTrailers.filter((t) => filterByPlant(t))
            const equipment = allEquipment.filter((e) => filterByPlant(e))
            const pickups = allPickups.filter((p) => filterByPlant(p))
            const operators = allOperators.filter((o) => filterByPlant(o, 'plantCode'))
            const listItems = allListItems.filter((li) => filterByPlant(li, 'plantCode'))

            if (allOperators.length > 0) {
            }

            const operatorIdToName = new Map()
            allOperators.forEach((o) => {
                const opId = o.employeeId || o.employee_id || o.id
                const opName = o.name
                if (opId && opName) {
                    operatorIdToName.set(opId, opName)
                }
            })

            if (allTractors.length > 0) {
                const tractorPlants = [...new Set(allTractors.map((t) => t.assignedPlant))]
            }
            if (allTrailers.length > 0) {
                const trailerPlants = [...new Set(allTrailers.map((t) => t.assignedPlant))]
                const trailerTypes = [...new Set(allTrailers.map((t) => t.trailerType))]
            }
            if (allPickups.length > 0) {
                const pickupPlants = [...new Set(allPickups.map((p) => p.assignedPlant))]
            }

            const isOverdue = (date) => {
                if (!date) return false
                const diff = Math.ceil((Date.now() - new Date(date).getTime()) / 86400000)
                return diff > 180
            }

            const mixerStats = {
                active: mixers.filter((m) => m.status === 'Active').length,
                inShop: mixers.filter((m) => m.status === 'In Shop').length,
                openIssues: 0,
                serviceOverdue: mixers.filter((m) => m.status !== 'Retired' && isOverdue(m.lastServiceDate)).length,
                spare: mixers.filter((m) => m.status === 'Spare').length,
                total: mixers.filter((m) => m.status !== 'Retired').length
            }

            const tractorStats = {
                active: tractors.filter((t) => t.status === 'Active').length,
                cementHauler: tractors.filter((t) => t.tractorType === 'Cement Hauler').length,
                dumpTruck: tractors.filter((t) => t.tractorType === 'Dump Truck').length,
                endDump: tractors.filter((t) => t.tractorType === 'End Dump').length,
                inShop: tractors.filter((t) => t.status === 'In Shop').length,
                openIssues: 0,
                serviceOverdue: tractors.filter((t) => t.status !== 'Retired' && isOverdue(t.lastServiceDate)).length,
                spare: tractors.filter((t) => t.status === 'Spare').length,
                total: tractors.filter((t) => t.status !== 'Retired').length
            }

            const trailerStats = {
                active: trailers.filter((t) => t.status === 'Active').length,
                inShop: trailers.filter((t) => t.status === 'In Shop').length,
                openIssues: 0,
                serviceOverdue: trailers.filter((t) => t.status !== 'Retired' && isOverdue(t.lastServiceDate)).length,
                spare: trailers.filter((t) => t.status === 'Spare').length,
                total: trailers.filter((t) => t.status !== 'Retired').length
            }

            const equipmentStats = {
                active: equipment.filter((e) => e.status === 'Active').length,
                inShop: equipment.filter((e) => e.status === 'In Shop').length,
                openIssues: 0,
                serviceOverdue: equipment.filter((e) => e.status !== 'Retired' && isOverdue(e.lastServiceDate)).length,
                spare: equipment.filter((e) => e.status === 'Spare').length,
                total: equipment.filter((e) => e.status !== 'Retired').length
            }

            const pickupStats = {
                active: pickups.filter((p) => p.status === 'Active').length,
                inShop: pickups.filter((p) => p.status === 'In Shop').length,
                spare: pickups.filter((p) => p.status === 'Spare').length,
                stationary: pickups.filter((p) => p.status === 'Stationary').length,
                total: pickups.filter((p) => p.status !== 'Retired').length
            }

            const operatorStats = {
                active: operators.filter((o) => o.status === 'Active').length,
                lightDuty: operators.filter((o) => o.status === 'Light Duty').length,
                pending: operators.filter((o) => o.status === 'Pending Start').length,
                terminated: operators.filter((o) => o.status === 'Terminated').length,
                total: operators.length,
                training: operators.filter((o) => o.status === 'Training').length
            }

            const mixersInShop = mixers
                .filter((m) => m.status === 'In Shop')
                .map((m) => ({
                    plant: m.assignedPlant,
                    truckNumber: m.truckNumber
                }))

            const tractorsInShop = tractors
                .filter((t) => t.status === 'In Shop')
                .map((t) => ({
                    plant: t.assignedPlant,
                    truckNumber: t.truckNumber,
                    type: t.tractorType
                }))

            const mixersSpare = mixers
                .filter((m) => m.status === 'Spare')
                .map((m) => ({
                    plant: m.assignedPlant,
                    truckNumber: m.truckNumber
                }))

            const tractorsSpare = tractors
                .filter((t) => t.status === 'Spare')
                .map((t) => ({
                    plant: t.assignedPlant,
                    truckNumber: t.truckNumber,
                    type: t.tractorType
                }))

            const allMixersList = mixers
                .filter((m) => m.status !== 'Retired')
                .map((m) => ({
                    cleanlinessRating: m.cleanlinessRating || 0,
                    lastServiceDate: m.lastServiceDate || '',
                    make: m.make || '',
                    model: m.model || '',
                    operatorId: m.assignedOperator,
                    operatorName: operatorIdToName.get(m.assignedOperator) || 'Unassigned',
                    plant: m.assignedPlant,
                    status: m.status,
                    truckNumber: m.truckNumber,
                    vin: m.vin || '',
                    year: m.year || ''
                }))

            const allTractorsList = tractors
                .filter((t) => t.status !== 'Retired')
                .map((t) => ({
                    lastServiceDate: t.lastServiceDate || '',
                    make: t.make || '',
                    model: t.model || '',
                    operatorId: t.assignedOperator,
                    operatorName: operatorIdToName.get(t.assignedOperator) || 'Unassigned',
                    plant: t.assignedPlant,
                    status: t.status,
                    truckNumber: t.truckNumber,
                    type: t.freight || t.tractorType || 'Unknown',
                    vin: t.vin || '',
                    year: t.year || ''
                }))

            const allTrailersList = trailers
                .filter((t) => t.status !== 'Retired')
                .map((t) => ({
                    lastServiceDate: t.lastServiceDate,
                    licensePlate: t.licensePlate,
                    make: t.make,
                    model: t.model,
                    plant: t.assignedPlant,
                    status: t.status,
                    trailerNumber: t.trailerNumber,
                    type: t.trailerType,
                    vin: t.vin,
                    year: t.year
                }))

            const allEquipmentList = equipment
                .filter((e) => e.status !== 'Retired')
                .map((e) => ({
                    identifyingNumber: e.identifyingNumber,
                    lastServiceDate: e.lastServiceDate,
                    make: e.make,
                    model: e.model,
                    plant: e.assignedPlant,
                    serialNumber: e.serialNumber,
                    status: e.status,
                    type: e.equipmentType,
                    year: e.year
                }))

            const allPickupsList = pickups
                .filter((p) => p.status !== 'Retired')
                .map((p) => ({
                    assignedTo: p.assignedTo,
                    licensePlate: p.licensePlate,
                    make: p.make,
                    mileage: p.mileage,
                    model: p.model,
                    plant: p.assignedPlant,
                    status: p.status,
                    truckNumber: p.truckNumber,
                    vin: p.vin,
                    year: p.year
                }))

            const operatorsTraining = operators
                .filter((o) => o.status === 'Training')
                .map((o) => ({
                    name: o.name,
                    plant: o.plantCode,
                    position: o.position,
                    trainer: o.assignedTrainer
                }))

            const operatorsPendingStart = operators
                .filter((o) => o.status === 'Pending Start')
                .map((o) => ({
                    name: o.name,
                    pendingDate: o.pendingStartDate,
                    plant: o.plantCode,
                    position: o.position
                }))

            const pendingListItems = listItems
                .filter((li) => !li.completed)
                .map((li) => ({
                    comments: li.comments,
                    deadline: li.deadline,
                    description: li.description,
                    plant: li.plantCode,
                    responsible: li.responsible,
                    status: li.status
                }))

            const completedListItems = listItems
                .filter((li) => li.completed)
                .slice(0, 20)
                .map((li) => ({
                    completedAt: li.completedAt,
                    description: li.description,
                    plant: li.plantCode
                }))

            const [
                mixersHistRes,
                tractorsHistRes,
                trailersHistRes,
                equipmentHistRes,
                pickupsHistRes,
                mixerOpHistRes,
                tractorOpHistRes
            ] = await Promise.all([
                supabase
                    .from('mixers_history')
                    .select('mixer_id, field_name, old_value, new_value, changed_at')
                    .eq('field_name', 'status')
                    .order('changed_at', { ascending: false }),
                supabase
                    .from('tractors_history')
                    .select('tractor_id, field_name, old_value, new_value, changed_at')
                    .eq('field_name', 'status')
                    .order('changed_at', { ascending: false }),
                supabase
                    .from('trailers_history')
                    .select('trailer_id, field_name, old_value, new_value, changed_at')
                    .eq('field_name', 'status')
                    .order('changed_at', { ascending: false }),
                supabase
                    .from('heavy_equipment_history')
                    .select('equipment_id, field_name, old_value, new_value, changed_at')
                    .eq('field_name', 'status')
                    .order('changed_at', { ascending: false }),
                supabase
                    .from('pickup_trucks_history')
                    .select('truck_id, field_name, old_value, new_value, changed_at')
                    .eq('field_name', 'status')
                    .order('changed_at', { ascending: false }),
                supabase
                    .from('mixers_history')
                    .select('mixer_id, field_name, old_value, new_value, changed_at')
                    .eq('field_name', 'assigned_operator')
                    .order('changed_at', { ascending: false }),
                supabase
                    .from('tractors_history')
                    .select('tractor_id, field_name, old_value, new_value, changed_at')
                    .eq('field_name', 'assigned_operator')
                    .order('changed_at', { ascending: false })
            ])

            const mixerIdToPlant = new Map(mixers.map((m) => [m.id, m.assignedPlant]))
            const tractorIdToPlant = new Map(tractors.map((t) => [t.id, t.assignedPlant]))
            const trailerIdToPlant = new Map(trailers.map((t) => [t.id, t.assignedPlant]))
            const equipmentIdToPlant = new Map(equipment.map((e) => [e.id, e.assignedPlant]))
            const pickupIdToPlant = new Map(pickups.map((p) => [p.id, p.assignedPlant]))
            const mixerIdToTruck = new Map(mixers.map((m) => [m.id, m.truckNumber]))
            const tractorIdToTruck = new Map(tractors.map((t) => [t.id, t.truckNumber]))
            const trailerIdToNumber = new Map(trailers.map((t) => [t.id, t.trailerNumber]))
            const equipmentIdToNumber = new Map(equipment.map((e) => [e.id, e.identifyingNumber]))
            const pickupIdToTruck = new Map(pickups.map((p) => [p.id, p.truckNumber]))

            const mixersHistory = (mixersHistRes.data || [])
                .filter((h) => mixerIdToPlant.has(h.mixer_id))
                .map((h) => ({
                    assetNumber: mixerIdToTruck.get(h.mixer_id),
                    changedAt: h.changed_at,
                    newStatus: h.new_value,
                    oldStatus: h.old_value,
                    plant: mixerIdToPlant.get(h.mixer_id)
                }))
            const tractorsHistory = (tractorsHistRes.data || [])
                .filter((h) => tractorIdToPlant.has(h.tractor_id))
                .map((h) => ({
                    assetNumber: tractorIdToTruck.get(h.tractor_id),
                    changedAt: h.changed_at,
                    newStatus: h.new_value,
                    oldStatus: h.old_value,
                    plant: tractorIdToPlant.get(h.tractor_id)
                }))
            const trailersHistory = (trailersHistRes.data || [])
                .filter((h) => trailerIdToPlant.has(h.trailer_id))
                .map((h) => ({
                    assetNumber: trailerIdToNumber.get(h.trailer_id),
                    changedAt: h.changed_at,
                    newStatus: h.new_value,
                    oldStatus: h.old_value,
                    plant: trailerIdToPlant.get(h.trailer_id)
                }))
            const equipmentHistory = (equipmentHistRes.data || [])
                .filter((h) => equipmentIdToPlant.has(h.equipment_id))
                .map((h) => ({
                    assetNumber: equipmentIdToNumber.get(h.equipment_id),
                    changedAt: h.changed_at,
                    newStatus: h.new_value,
                    oldStatus: h.old_value,
                    plant: equipmentIdToPlant.get(h.equipment_id)
                }))
            const pickupsHistory = (pickupsHistRes.data || [])
                .filter((h) => pickupIdToPlant.has(h.truck_id))
                .map((h) => ({
                    assetNumber: pickupIdToTruck.get(h.truck_id),
                    changedAt: h.changed_at,
                    newStatus: h.new_value,
                    oldStatus: h.old_value,
                    plant: pickupIdToPlant.get(h.truck_id)
                }))

            const getOperatorName = (id) => {
                if (!id || id === 'null' || id === 'undefined') return 'None'
                const name = operatorIdToName.get(id)
                if (name) return name
                const idLower = String(id).toLowerCase()
                for (const [key, value] of operatorIdToName.entries()) {
                    if (String(key).toLowerCase() === idLower) return value
                }
                return 'Unknown Operator'
            }

            const rawMixerOpHist = mixerOpHistRes.data || []
            if (rawMixerOpHist.length > 0) {
            }

            const mixerOperatorHistory = rawMixerOpHist
                .filter((h) => mixerIdToPlant.has(h.mixer_id))
                .map((h) => ({
                    assetType: 'Mixer',
                    changedAt: h.changed_at,
                    newOperator: getOperatorName(h.new_value),
                    newOperatorId: h.new_value,
                    plant: mixerIdToPlant.get(h.mixer_id),
                    previousOperator: getOperatorName(h.old_value),
                    previousOperatorId: h.old_value,
                    truckNumber: mixerIdToTruck.get(h.mixer_id)
                }))
            const tractorOperatorHistory = (tractorOpHistRes.data || [])
                .filter((h) => tractorIdToPlant.has(h.tractor_id))
                .map((h) => ({
                    assetType: 'Tractor',
                    changedAt: h.changed_at,
                    newOperator: getOperatorName(h.new_value),
                    newOperatorId: h.new_value,
                    plant: tractorIdToPlant.get(h.tractor_id),
                    previousOperator: getOperatorName(h.old_value),
                    previousOperatorId: h.old_value,
                    truckNumber: tractorIdToTruck.get(h.tractor_id)
                }))
            const operatorAssignmentHistory = [...mixerOperatorHistory, ...tractorOperatorHistory].sort(
                (a, b) => new Date(b.changedAt) - new Date(a.changedAt)
            )

            if (operatorAssignmentHistory.length > 0) {
            }

            const allOperatorsList = operators.map((o) => ({
                hireDate: o.createdAt,
                id: o.employeeId || o.employee_id || o.id,
                isTrainer: o.isTrainer,
                name: o.name,
                phone: o.phone,
                plant: o.plantCode,
                position: o.position,
                status: o.status,
                trainer: o.assignedTrainer
            }))

            const statusHistorySummary = {
                equipment: {
                    byPlant: {},
                    enteredShop: equipmentHistory.filter((h) => h.newStatus === 'In Shop').length,
                    exitedShop: equipmentHistory.filter((h) => h.oldStatus === 'In Shop').length,
                    totalChanges: equipmentHistory.length
                },
                mixers: {
                    byPlant: {},
                    enteredShop: mixersHistory.filter((h) => h.newStatus === 'In Shop').length,
                    exitedShop: mixersHistory.filter((h) => h.oldStatus === 'In Shop').length,
                    totalChanges: mixersHistory.length
                },
                pickups: {
                    byPlant: {},
                    enteredShop: pickupsHistory.filter((h) => h.newStatus === 'In Shop').length,
                    exitedShop: pickupsHistory.filter((h) => h.oldStatus === 'In Shop').length,
                    totalChanges: pickupsHistory.length
                },
                tractors: {
                    byPlant: {},
                    enteredShop: tractorsHistory.filter((h) => h.newStatus === 'In Shop').length,
                    exitedShop: tractorsHistory.filter((h) => h.oldStatus === 'In Shop').length,
                    totalChanges: tractorsHistory.length
                },
                trailers: {
                    byPlant: {},
                    enteredShop: trailersHistory.filter((h) => h.newStatus === 'In Shop').length,
                    exitedShop: trailersHistory.filter((h) => h.oldStatus === 'In Shop').length,
                    totalChanges: trailersHistory.length
                }
            }

            ;[mixersHistory, tractorsHistory, trailersHistory, equipmentHistory, pickupsHistory].forEach((hist, i) => {
                const key = ['mixers', 'tractors', 'trailers', 'equipment', 'pickups'][i]
                hist.forEach((h) => {
                    const plant = h.plant || 'Unknown'
                    if (!statusHistorySummary[key].byPlant[plant])
                        statusHistorySummary[key].byPlant[plant] = {
                            enteredShop: 0,
                            exitedShop: 0,
                            totalChanges: 0
                        }
                    statusHistorySummary[key].byPlant[plant].totalChanges++
                    if (h.newStatus === 'In Shop') statusHistorySummary[key].byPlant[plant].enteredShop++
                    if (h.oldStatus === 'In Shop') statusHistorySummary[key].byPlant[plant].exitedShop++
                })
            })

            const allReports = reportsData
            if (allReports.length > 0) {
                const pmSample = allReports.find((r) => r.report_name === 'plant_manager')
                if (pmSample) {
                }
            }
            const plantManagerReports = allReports
                .filter((r) => r.report_name === 'plant_manager')
                .map((r) => {
                    let plantCode = r.data?.plant || ''
                    if (!plantCode && r.user_id) {
                        plantCode = userIdToPlantCode.get(r.user_id) || ''
                    }
                    plantCode = String(plantCode).trim()
                    const plantCodeUpper = plantCode.toUpperCase()
                    let plantName = plantCodeToName.get(plantCodeUpper) || plantCodeToName.get(plantCode) || ''
                    if (!plantName && plantCode) {
                        plantName = plantCode
                    }
                    if (!plantName) {
                        plantName = 'Unknown'
                    }
                    return {
                        downMixers: r.data?.down_mixers || r.data?.downMixers || 0,
                        helpReceivedFromOtherPlants: r.data?.help_received_from_other_plants || [],
                        notes: r.data?.notes,
                        operatorCount: r.data?.operators?.length || 0,
                        operatorsSentToHelp: r.data?.operators_sent_to_help || [],
                        plant: plantCode || 'Unknown',
                        plantName: plantName,
                        runnableMixers: r.data?.runnable_mixers || r.data?.runnableMixers || 0,
                        submittedAt: r.submitted_at,
                        totalHours: parseFloat(r.data?.total_hours || 0),
                        totalYardsLost: parseFloat(r.data?.total_yards_lost || 0),
                        week: r.week?.slice(0, 10),
                        yardage: parseFloat(r.data?.yardage || 0)
                    }
                })
            if (plantManagerReports.length > 0) {
            }
            const efficiencyReports = allReports
                .filter((r) => r.report_name === 'efficiency')
                .map((r) => {
                    let plantCode = r.data?.plant || ''
                    if (!plantCode && r.user_id) {
                        plantCode = userIdToPlantCode.get(r.user_id) || ''
                    }
                    return {
                        plant: plantCode,
                        rows: (r.data?.rows || []).map((row) => ({
                            avgEnd: row.avgEnd,
                            avgStart: row.avgStart,
                            date: row.date,
                            loadsPerHour: row.loadsPerHour
                        })),
                        submittedAt: r.submitted_at,
                        week: r.week?.slice(0, 10)
                    }
                })
                .filter((r) => {
                    if (regionPlantCodes.size === 0) return true
                    return regionPlantCodes.has(r.plant) || regionPlantCodes.has(String(r.plant).toUpperCase())
                })
            const aggregateReports = allReports
                .filter((r) => r.report_name === 'aggregate_production')
                .map((r) => ({
                    location: r.data?.location,
                    materials: r.data?.materials || [],
                    submittedAt: r.submitted_at,
                    week: r.week?.slice(0, 10)
                }))
            const rmiReports = allReports
                .filter((r) => r.report_name === 'rmi')
                .map((r) => ({
                    data: r.data,
                    submittedAt: r.submitted_at,
                    week: r.week?.slice(0, 10)
                }))

            setContextData({
                aggregateReports,
                allEquipmentList,
                allMixersList,
                allOperatorsList,
                allPickupsList,
                allTractorsList,
                allTrailersList,
                completedListItems,
                currentDate: new Date().toISOString().slice(0, 10),
                efficiencyReports,
                equipmentHistory,
                equipmentStats,
                mixerStats,
                mixersHistory,
                mixersInShop,
                mixersSpare,
                operatorAssignmentHistory,
                operatorStats,
                operatorsPendingStart,
                operatorsTraining,
                pendingListItems,
                pickupStats,
                pickupsHistory,
                plantManagerReports,
                regionName,
                rmiReports,
                selectedPlant,
                statusHistorySummary,
                totalOpenMaintenanceIssues: 0,
                totalServiceOverdue:
                    mixerStats.serviceOverdue +
                    tractorStats.serviceOverdue +
                    trailerStats.serviceOverdue +
                    equipmentStats.serviceOverdue,
                tractorStats,
                tractorsHistory,
                tractorsInShop,
                tractorsSpare,
                trailerStats,
                trailersHistory
            })
        } catch (err) {
            console.error('Error fetching AI context:', err)
        }
    }, [regionName, regionCode, selectedPlant])

    useEffect(() => {
        if (isOpen && !contextData) {
            fetchContextData()
        }
    }, [isOpen, contextData, fetchContextData])

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return

        const userMessage = inputValue.trim()
        setInputValue('')
        setMessages((prev) => [...prev, { content: userMessage, role: 'user' }])
        setIsLoading(true)

        try {
            const conversationHistory = [...messages, { content: userMessage, role: 'user' }]
            const response = await AIService.askFollowUp(userMessage, conversationHistory, contextData || {})
            setMessages((prev) => [...prev, { content: response, role: 'assistant' }])
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    content: 'Sorry, I encountered an error. Please try again.',
                    role: 'assistant'
                }
            ])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleClearChat = () => {
        setMessages([])
        setContextData(null)
    }

    const handleRefreshContext = () => {
        setContextData(null)
        fetchContextData()
    }

    if (!isOpen) return null

    const overlayStyle = {
        alignItems: 'flex-start',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        bottom: 0,
        display: 'flex',
        justifyContent: 'flex-end',
        left: 0,
        padding: '16px',
        position: 'fixed',
        right: 0,
        top: 0,
        zIndex: 10000
    }

    const popupStyle = {
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 32px)',
        maxHeight: '700px',
        maxWidth: 'calc(100vw - 32px)',
        overflow: 'hidden',
        width: '420px'
    }

    const headerStyle = {
        alignItems: 'center',
        backgroundColor: '#f0f7ff',
        borderBottom: '1px solid #e5e7eb',
        borderRadius: '16px 16px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        padding: '16px 20px'
    }

    const titleStyle = {
        alignItems: 'center',
        color: '#1e3a5f',
        display: 'flex',
        fontSize: '16px',
        fontWeight: 600,
        gap: '10px'
    }

    const iconButtonStyle = {
        alignItems: 'center',
        background: 'transparent',
        border: 'none',
        borderRadius: '8px',
        color: '#64748b',
        cursor: 'pointer',
        display: 'flex',
        height: '32px',
        justifyContent: 'center',
        width: '32px'
    }

    const messagesContainerStyle = {
        backgroundColor: 'white',
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        gap: '16px',
        overflowY: 'auto',
        padding: '16px'
    }

    const welcomeStyle = {
        alignItems: 'center',
        color: '#64748b',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        height: '100%',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center'
    }

    const suggestionButtonStyle = {
        backgroundColor: '#f0f7ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        color: '#1e3a5f',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 500,
        padding: '8px 14px'
    }

    const messageStyle = (isUser) => ({
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: '12px'
    })

    const messageIconStyle = (isUser) => ({
        alignItems: 'center',
        backgroundColor: isUser ? '#1e3a5f' : '#e2e8f0',
        borderRadius: '50%',
        color: isUser ? 'white' : '#64748b',
        display: 'flex',
        flexShrink: 0,
        fontSize: '14px',
        height: '32px',
        justifyContent: 'center',
        width: '32px'
    })

    const messageContentStyle = (isUser) => ({
        backgroundColor: isUser ? '#1e3a5f' : '#f1f5f9',
        borderRadius: '12px',
        color: isUser ? 'white' : '#374151',
        flex: 1,
        fontSize: '14px',
        lineHeight: 1.6,
        padding: '12px 16px'
    })

    const inputContainerStyle = {
        alignItems: 'flex-end',
        backgroundColor: '#f9fafb',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        gap: '12px',
        padding: '16px 20px'
    }

    const textareaStyle = {
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        flex: 1,
        fontFamily: 'inherit',
        fontSize: '14px',
        maxHeight: '120px',
        minHeight: '44px',
        outline: 'none',
        padding: '12px 16px',
        resize: 'none'
    }

    const sendButtonStyle = {
        alignItems: 'center',
        backgroundColor: '#1e3a5f',
        border: 'none',
        borderRadius: '12px',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        height: '44px',
        justifyContent: 'center',
        opacity: !inputValue.trim() || isLoading ? 0.5 : 1,
        width: '44px'
    }

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={popupStyle} onClick={(e) => e.stopPropagation()}>
                <div style={headerStyle}>
                    <div style={titleStyle}>
                        <i className="fas fa-robot" style={{ color: '#1e3a5f', fontSize: '18px' }}></i>
                        <span>AI Assistant</span>
                    </div>
                    <div style={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
                        <button style={iconButtonStyle} onClick={handleRefreshContext} title="Refresh data">
                            <i className="fas fa-sync-alt"></i>
                        </button>
                        <button style={iconButtonStyle} onClick={handleClearChat} title="Clear chat">
                            <i className="fas fa-trash-alt"></i>
                        </button>
                        <button style={iconButtonStyle} onClick={onClose} title="Close">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div style={messagesContainerStyle}>
                    {messages.length === 0 ? (
                        <div style={welcomeStyle}>
                            <i
                                className="fas fa-comments"
                                style={{ color: '#94a3b8', fontSize: '48px', opacity: 0.4 }}
                            ></i>
                            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6, maxWidth: '280px' }}>
                                Ask me anything about your fleet, operators, reports, or operations.
                            </p>
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    justifyContent: 'center',
                                    marginTop: '8px'
                                }}
                            >
                                <button
                                    style={suggestionButtonStyle}
                                    onClick={() => setInputValue('What is our current fleet status?')}
                                >
                                    Fleet status
                                </button>
                                <button
                                    style={suggestionButtonStyle}
                                    onClick={() => setInputValue('How many spare mixer trucks do we have?')}
                                >
                                    Spare mixers
                                </button>
                                <button
                                    style={suggestionButtonStyle}
                                    onClick={() => setInputValue('Which trucks are currently in the shop?')}
                                >
                                    Trucks in shop
                                </button>
                                <button
                                    style={suggestionButtonStyle}
                                    onClick={() => setInputValue('How many operators are in training?')}
                                >
                                    Training operators
                                </button>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isUser = msg.role === 'user'
                            return (
                                <div key={idx} style={messageStyle(isUser)}>
                                    <div style={messageIconStyle(isUser)}>
                                        <i className={`fas ${isUser ? 'fa-user' : 'fa-robot'}`}></i>
                                    </div>
                                    <div style={messageContentStyle(isUser)}>
                                        {msg.content
                                            .split('\n')
                                            .filter((line) => line.trim())
                                            .map((line, lineIdx) => (
                                                <p
                                                    key={lineIdx}
                                                    style={{
                                                        color: isUser ? 'white' : '#374151',
                                                        margin: lineIdx > 0 ? '8px 0 0 0' : 0
                                                    }}
                                                >
                                                    {line
                                                        .replace(/^\[!\]\s*/, '')
                                                        .replace(/^\[~\]\s*/, '')
                                                        .replace(/^\[i\]\s*/, '')
                                                        .replace(/^[-•]\s*/, '')
                                                        .replace(/\*\*/g, '')
                                                        .replace(/\*/g, '')}
                                                </p>
                                            ))}
                                    </div>
                                </div>
                            )
                        })
                    )}
                    {isLoading && (
                        <div style={messageStyle(false)}>
                            <div style={messageIconStyle(false)}>
                                <i className="fas fa-robot"></i>
                            </div>
                            <div style={messageContentStyle(false)}>
                                <div style={{ alignItems: 'center', display: 'flex', gap: '4px' }}>
                                    <span
                                        style={{
                                            animation: 'bounce 1s infinite',
                                            backgroundColor: '#94a3b8',
                                            borderRadius: '50%',
                                            height: '8px',
                                            width: '8px'
                                        }}
                                    ></span>
                                    <span
                                        style={{
                                            animation: 'bounce 1s infinite 0.2s',
                                            backgroundColor: '#94a3b8',
                                            borderRadius: '50%',
                                            height: '8px',
                                            width: '8px'
                                        }}
                                    ></span>
                                    <span
                                        style={{
                                            animation: 'bounce 1s infinite 0.4s',
                                            backgroundColor: '#94a3b8',
                                            borderRadius: '50%',
                                            height: '8px',
                                            width: '8px'
                                        }}
                                    ></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div style={inputContainerStyle}>
                    <textarea
                        ref={inputRef}
                        style={textareaStyle}
                        placeholder="Ask a question..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        disabled={isLoading}
                    />
                    <button style={sendButtonStyle} onClick={handleSend} disabled={!inputValue.trim() || isLoading}>
                        <i className="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    )
}
