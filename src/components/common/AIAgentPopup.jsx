import React, {useState, useRef, useEffect, useCallback} from 'react'
import './styles/AIAgentPopup.css'
import {AIInsightsService} from '../../services/AIInsightsService'
import {RegionService} from '../../services/RegionService'
import {MixerService} from '../../services/MixerService'
import {TractorService} from '../../services/TractorService'
import {TrailerService} from '../../services/TrailerService'
import {EquipmentService} from '../../services/EquipmentService'
import {PickupTruckService} from '../../services/PickupTruckService'
import {OperatorService} from '../../services/OperatorService'
import {ListService} from '../../services/ListService'
import {supabase} from '../../services/DatabaseService'

export default function AIAgentPopup({isOpen, onClose, regionName, regionCode, selectedPlant}) {
    const [messages, setMessages] = useState([])
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [contextData, setContextData] = useState(null)
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'})
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
                    console.log('AI Agent - Region plants fetched:', plants)
                    plants.forEach(p => {
                        const code = String(p.plantCode || p.plant_code || '').trim().toUpperCase()
                        const name = p.plantName || p.plant_name || ''
                        if (code) {
                            regionPlantCodes.add(code)
                            plantCodeToName.set(code, name)
                        }
                    })
                    console.log('AI Agent - Region plant codes:', Array.from(regionPlantCodes))
                } catch (err) {
                    console.error('Error fetching region plants:', err)
                }
            } else {
                console.log('AI Agent - No regionCode provided')
            }

            const filterByPlant = (item, plantField = 'assignedPlant') => {
                if (regionPlantCodes.size === 0) return true
                const plantCode = String(item[plantField] || item.assigned_plant || '').trim().toUpperCase()
                return regionPlantCodes.has(plantCode)
            }

            const [
                mixersRes, 
                tractorsRes, 
                trailersRes, 
                equipmentRes, 
                pickupsRes,
                operatorsRes, 
                listItemsRes
            ] = await Promise.all([
                MixerService.fetchMixers().catch(e => { console.error('AI Agent - Mixers fetch error:', e); return [] }),
                TractorService.fetchTractors().catch(e => { console.error('AI Agent - Tractors fetch error:', e); return [] }),
                TrailerService.fetchTrailers().catch(e => { console.error('AI Agent - Trailers fetch error:', e); return [] }),
                EquipmentService.fetchEquipments().catch(e => { console.error('AI Agent - Equipment fetch error:', e); return [] }),
                PickupTruckService.fetchAll().catch(e => { console.error('AI Agent - Pickups fetch error:', e); return [] }),
                OperatorService.fetchOperators().catch(e => { console.error('AI Agent - Operators fetch error:', e); return [] }),
                ListService.fetchListItems().catch(e => { console.error('AI Agent - ListItems fetch error:', e); return [] })
            ])
            
            console.log('AI Agent - operatorsRes type:', typeof operatorsRes, 'length:', operatorsRes?.length)

            let reportsData = []
            let userIdToPlantCode = new Map()
            try {
                const [reportsResult, usersResult] = await Promise.all([
                    supabase.from('reports').select('*').eq('completed', true).order('week', {ascending: false}),
                    supabase.from('users_profiles').select('id, plant_code')
                ])
                if (reportsResult.data) reportsData = reportsResult.data
                if (usersResult.data) {
                    usersResult.data.forEach(u => {
                        if (u.id && u.plant_code) {
                            userIdToPlantCode.set(u.id, String(u.plant_code).trim())
                        }
                    })
                }
                console.log('AI Agent - UserIdToPlantCode map size:', userIdToPlantCode.size)
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

            const mixers = allMixers.filter(m => filterByPlant(m))
            const tractors = allTractors.filter(t => filterByPlant(t))
            const trailers = allTrailers.filter(t => filterByPlant(t))
            const equipment = allEquipment.filter(e => filterByPlant(e))
            const pickups = allPickups.filter(p => filterByPlant(p))
            const operators = allOperators.filter(o => filterByPlant(o, 'plantCode'))
            const listItems = allListItems.filter(li => filterByPlant(li, 'plantCode'))

            if (allOperators.length > 0) {
                console.log('AI Agent - Sample operator object keys:', Object.keys(allOperators[0]))
                console.log('AI Agent - Sample operator:', allOperators[0])
            }

            const operatorIdToName = new Map()
            allOperators.forEach(o => {
                const opId = o.employeeId || o.employee_id || o.id
                const opName = o.name
                if (opId && opName) {
                    operatorIdToName.set(opId, opName)
                }
            })

            console.log('AI Agent - Raw counts:', {
                allMixers: allMixers.length,
                allTractors: allTractors.length,
                allTrailers: allTrailers.length,
                allEquipment: allEquipment.length,
                allPickups: allPickups.length
            })
            console.log('AI Agent - Filtered counts:', {
                mixers: mixers.length,
                tractors: tractors.length,
                trailers: trailers.length,
                equipment: equipment.length,
                pickups: pickups.length
            })
            if (allTractors.length > 0) {
                const tractorPlants = [...new Set(allTractors.map(t => t.assignedPlant))]
                console.log('AI Agent - All tractor plant codes in DB:', tractorPlants)
            }
            if (allTrailers.length > 0) {
                const trailerPlants = [...new Set(allTrailers.map(t => t.assignedPlant))]
                console.log('AI Agent - All trailer plant codes in DB:', trailerPlants)
                const trailerTypes = [...new Set(allTrailers.map(t => t.trailerType))]
                console.log('AI Agent - All trailer type values:', trailerTypes)
            }
            if (allPickups.length > 0) {
                const pickupPlants = [...new Set(allPickups.map(p => p.assignedPlant))]
                console.log('AI Agent - All pickup plant codes in DB:', pickupPlants)
            }

            const isOverdue = (date) => {
                if (!date) return false
                const diff = Math.ceil((Date.now() - new Date(date).getTime()) / 86400000)
                return diff > 90
            }

            const mixerStats = {
                total: mixers.filter(m => m.status !== 'Retired').length,
                active: mixers.filter(m => m.status === 'Active').length,
                inShop: mixers.filter(m => m.status === 'In Shop').length,
                spare: mixers.filter(m => m.status === 'Spare').length,
                serviceOverdue: mixers.filter(m => m.status !== 'Retired' && isOverdue(m.lastServiceDate)).length,
                openIssues: 0
            }

            const tractorStats = {
                total: tractors.filter(t => t.status !== 'Retired').length,
                active: tractors.filter(t => t.status === 'Active').length,
                inShop: tractors.filter(t => t.status === 'In Shop').length,
                spare: tractors.filter(t => t.status === 'Spare').length,
                serviceOverdue: tractors.filter(t => t.status !== 'Retired' && isOverdue(t.lastServiceDate)).length,
                openIssues: 0,
                endDump: tractors.filter(t => t.tractorType === 'End Dump').length,
                cementHauler: tractors.filter(t => t.tractorType === 'Cement Hauler').length,
                dumpTruck: tractors.filter(t => t.tractorType === 'Dump Truck').length
            }

            const trailerStats = {
                total: trailers.filter(t => t.status !== 'Retired').length,
                active: trailers.filter(t => t.status === 'Active').length,
                inShop: trailers.filter(t => t.status === 'In Shop').length,
                spare: trailers.filter(t => t.status === 'Spare').length,
                serviceOverdue: trailers.filter(t => t.status !== 'Retired' && isOverdue(t.lastServiceDate)).length,
                openIssues: 0
            }

            const equipmentStats = {
                total: equipment.filter(e => e.status !== 'Retired').length,
                active: equipment.filter(e => e.status === 'Active').length,
                inShop: equipment.filter(e => e.status === 'In Shop').length,
                spare: equipment.filter(e => e.status === 'Spare').length,
                serviceOverdue: equipment.filter(e => e.status !== 'Retired' && isOverdue(e.lastServiceDate)).length,
                openIssues: 0
            }

            const pickupStats = {
                total: pickups.filter(p => p.status !== 'Retired').length,
                active: pickups.filter(p => p.status === 'Active').length,
                inShop: pickups.filter(p => p.status === 'In Shop').length,
                spare: pickups.filter(p => p.status === 'Spare').length,
                stationary: pickups.filter(p => p.status === 'Stationary').length
            }

            const operatorStats = {
                total: operators.length,
                active: operators.filter(o => o.status === 'Active').length,
                training: operators.filter(o => o.status === 'Training').length,
                pending: operators.filter(o => o.status === 'Pending Start').length,
                lightDuty: operators.filter(o => o.status === 'Light Duty').length,
                terminated: operators.filter(o => o.status === 'Terminated').length
            }

            const mixersInShop = mixers.filter(m => m.status === 'In Shop').map(m => ({
                truckNumber: m.truckNumber,
                plant: m.assignedPlant
            }))

            const tractorsInShop = tractors.filter(t => t.status === 'In Shop').map(t => ({
                truckNumber: t.truckNumber,
                plant: t.assignedPlant,
                type: t.tractorType
            }))

            const mixersSpare = mixers.filter(m => m.status === 'Spare').map(m => ({
                truckNumber: m.truckNumber,
                plant: m.assignedPlant
            }))

            const tractorsSpare = tractors.filter(t => t.status === 'Spare').map(t => ({
                truckNumber: t.truckNumber,
                plant: t.assignedPlant,
                type: t.tractorType
            }))

            const allMixersList = mixers.filter(m => m.status !== 'Retired').map(m => ({
                truckNumber: m.truckNumber,
                status: m.status,
                plant: m.assignedPlant,
                operatorId: m.assignedOperator,
                operatorName: operatorIdToName.get(m.assignedOperator) || 'Unassigned',
                vin: m.vin || '',
                make: m.make || '',
                model: m.model || '',
                year: m.year || '',
                lastServiceDate: m.lastServiceDate || '',
                cleanlinessRating: m.cleanlinessRating || 0
            }))

            const allTractorsList = tractors.filter(t => t.status !== 'Retired').map(t => ({
                truckNumber: t.truckNumber,
                status: t.status,
                plant: t.assignedPlant,
                operatorId: t.assignedOperator,
                operatorName: operatorIdToName.get(t.assignedOperator) || 'Unassigned',
                type: t.freight || t.tractorType || 'Unknown',
                vin: t.vin || '',
                make: t.make || '',
                model: t.model || '',
                year: t.year || '',
                lastServiceDate: t.lastServiceDate || ''
            }))

            const allTrailersList = trailers.filter(t => t.status !== 'Retired').map(t => ({
                trailerNumber: t.trailerNumber,
                status: t.status,
                plant: t.assignedPlant,
                type: t.trailerType,
                vin: t.vin,
                make: t.make,
                model: t.model,
                year: t.year,
                licensePlate: t.licensePlate,
                lastServiceDate: t.lastServiceDate
            }))

            const allEquipmentList = equipment.filter(e => e.status !== 'Retired').map(e => ({
                identifyingNumber: e.identifyingNumber,
                status: e.status,
                plant: e.assignedPlant,
                type: e.equipmentType,
                make: e.make,
                model: e.model,
                year: e.year,
                serialNumber: e.serialNumber,
                lastServiceDate: e.lastServiceDate
            }))

            const allPickupsList = pickups.filter(p => p.status !== 'Retired').map(p => ({
                truckNumber: p.truckNumber,
                status: p.status,
                plant: p.assignedPlant,
                assignedTo: p.assignedTo,
                vin: p.vin,
                make: p.make,
                model: p.model,
                year: p.year,
                licensePlate: p.licensePlate,
                mileage: p.mileage
            }))

            const operatorsTraining = operators.filter(o => o.status === 'Training').map(o => ({
                name: o.name,
                plant: o.plantCode,
                position: o.position,
                trainer: o.assignedTrainer
            }))

            const operatorsPendingStart = operators.filter(o => o.status === 'Pending Start').map(o => ({
                name: o.name,
                plant: o.plantCode,
                position: o.position,
                pendingDate: o.pendingStartDate
            }))

            const pendingListItems = listItems.filter(li => !li.completed).map(li => ({
                description: li.description,
                deadline: li.deadline,
                plant: li.plantCode,
                status: li.status,
                responsible: li.responsible,
                comments: li.comments
            }))

            const completedListItems = listItems.filter(li => li.completed).slice(0, 20).map(li => ({
                description: li.description,
                completedAt: li.completedAt,
                plant: li.plantCode
            }))

            const [mixersHistRes, tractorsHistRes, trailersHistRes, equipmentHistRes, pickupsHistRes, mixerOpHistRes, tractorOpHistRes] = await Promise.all([
                supabase.from('mixers_history').select('mixer_id, field_name, old_value, new_value, changed_at').eq('field_name', 'status').order('changed_at', {ascending: false}),
                supabase.from('tractors_history').select('tractor_id, field_name, old_value, new_value, changed_at').eq('field_name', 'status').order('changed_at', {ascending: false}),
                supabase.from('trailers_history').select('trailer_id, field_name, old_value, new_value, changed_at').eq('field_name', 'status').order('changed_at', {ascending: false}),
                supabase.from('heavy_equipment_history').select('equipment_id, field_name, old_value, new_value, changed_at').eq('field_name', 'status').order('changed_at', {ascending: false}),
                supabase.from('pickup_trucks_history').select('truck_id, field_name, old_value, new_value, changed_at').eq('field_name', 'status').order('changed_at', {ascending: false}),
                supabase.from('mixers_history').select('mixer_id, field_name, old_value, new_value, changed_at').eq('field_name', 'assigned_operator').order('changed_at', {ascending: false}),
                supabase.from('tractors_history').select('tractor_id, field_name, old_value, new_value, changed_at').eq('field_name', 'assigned_operator').order('changed_at', {ascending: false})
            ])

            const mixerIdToPlant = new Map(mixers.map(m => [m.id, m.assignedPlant]))
            const tractorIdToPlant = new Map(tractors.map(t => [t.id, t.assignedPlant]))
            const trailerIdToPlant = new Map(trailers.map(t => [t.id, t.assignedPlant]))
            const equipmentIdToPlant = new Map(equipment.map(e => [e.id, e.assignedPlant]))
            const pickupIdToPlant = new Map(pickups.map(p => [p.id, p.assignedPlant]))
            const mixerIdToTruck = new Map(mixers.map(m => [m.id, m.truckNumber]))
            const tractorIdToTruck = new Map(tractors.map(t => [t.id, t.truckNumber]))
            const trailerIdToNumber = new Map(trailers.map(t => [t.id, t.trailerNumber]))
            const equipmentIdToNumber = new Map(equipment.map(e => [e.id, e.identifyingNumber]))
            const pickupIdToTruck = new Map(pickups.map(p => [p.id, p.truckNumber]))

            const mixersHistory = (mixersHistRes.data || []).filter(h => mixerIdToPlant.has(h.mixer_id)).map(h => ({assetNumber: mixerIdToTruck.get(h.mixer_id), plant: mixerIdToPlant.get(h.mixer_id), oldStatus: h.old_value, newStatus: h.new_value, changedAt: h.changed_at}))
            const tractorsHistory = (tractorsHistRes.data || []).filter(h => tractorIdToPlant.has(h.tractor_id)).map(h => ({assetNumber: tractorIdToTruck.get(h.tractor_id), plant: tractorIdToPlant.get(h.tractor_id), oldStatus: h.old_value, newStatus: h.new_value, changedAt: h.changed_at}))
            const trailersHistory = (trailersHistRes.data || []).filter(h => trailerIdToPlant.has(h.trailer_id)).map(h => ({assetNumber: trailerIdToNumber.get(h.trailer_id), plant: trailerIdToPlant.get(h.trailer_id), oldStatus: h.old_value, newStatus: h.new_value, changedAt: h.changed_at}))
            const equipmentHistory = (equipmentHistRes.data || []).filter(h => equipmentIdToPlant.has(h.equipment_id)).map(h => ({assetNumber: equipmentIdToNumber.get(h.equipment_id), plant: equipmentIdToPlant.get(h.equipment_id), oldStatus: h.old_value, newStatus: h.new_value, changedAt: h.changed_at}))
            const pickupsHistory = (pickupsHistRes.data || []).filter(h => pickupIdToPlant.has(h.truck_id)).map(h => ({assetNumber: pickupIdToTruck.get(h.truck_id), plant: pickupIdToPlant.get(h.truck_id), oldStatus: h.old_value, newStatus: h.new_value, changedAt: h.changed_at}))

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

            console.log('AI Agent - Operator ID to Name map size:', operatorIdToName.size)
            console.log('AI Agent - Sample operator IDs:', Array.from(operatorIdToName.keys()).slice(0, 5))
            
            const rawMixerOpHist = mixerOpHistRes.data || []
            console.log('AI Agent - Mixer operator history count:', rawMixerOpHist.length)
            if (rawMixerOpHist.length > 0) {
                console.log('AI Agent - Sample mixer op history entry:', rawMixerOpHist[0])
            }

            const mixerOperatorHistory = rawMixerOpHist.filter(h => mixerIdToPlant.has(h.mixer_id)).map(h => ({
                truckNumber: mixerIdToTruck.get(h.mixer_id),
                plant: mixerIdToPlant.get(h.mixer_id),
                previousOperator: getOperatorName(h.old_value),
                previousOperatorId: h.old_value,
                newOperator: getOperatorName(h.new_value),
                newOperatorId: h.new_value,
                changedAt: h.changed_at,
                assetType: 'Mixer'
            }))
            const tractorOperatorHistory = (tractorOpHistRes.data || []).filter(h => tractorIdToPlant.has(h.tractor_id)).map(h => ({
                truckNumber: tractorIdToTruck.get(h.tractor_id),
                plant: tractorIdToPlant.get(h.tractor_id),
                previousOperator: getOperatorName(h.old_value),
                previousOperatorId: h.old_value,
                newOperator: getOperatorName(h.new_value),
                newOperatorId: h.new_value,
                changedAt: h.changed_at,
                assetType: 'Tractor'
            }))
            const operatorAssignmentHistory = [...mixerOperatorHistory, ...tractorOperatorHistory].sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))
            
            console.log('AI Agent - Operator assignment history count:', operatorAssignmentHistory.length)
            if (operatorAssignmentHistory.length > 0) {
                console.log('AI Agent - Sample assignment history:', operatorAssignmentHistory[0])
            }

            const allOperatorsList = operators.map(o => ({
                id: o.employeeId || o.employee_id || o.id,
                name: o.name,
                status: o.status,
                plant: o.plantCode,
                position: o.position,
                hireDate: o.createdAt,
                trainer: o.assignedTrainer,
                isTrainer: o.isTrainer,
                phone: o.phone
            }))

            const statusHistorySummary = {
                mixers: {totalChanges: mixersHistory.length, enteredShop: mixersHistory.filter(h => h.newStatus === 'In Shop').length, exitedShop: mixersHistory.filter(h => h.oldStatus === 'In Shop').length, byPlant: {}},
                tractors: {totalChanges: tractorsHistory.length, enteredShop: tractorsHistory.filter(h => h.newStatus === 'In Shop').length, exitedShop: tractorsHistory.filter(h => h.oldStatus === 'In Shop').length, byPlant: {}},
                trailers: {totalChanges: trailersHistory.length, enteredShop: trailersHistory.filter(h => h.newStatus === 'In Shop').length, exitedShop: trailersHistory.filter(h => h.oldStatus === 'In Shop').length, byPlant: {}},
                equipment: {totalChanges: equipmentHistory.length, enteredShop: equipmentHistory.filter(h => h.newStatus === 'In Shop').length, exitedShop: equipmentHistory.filter(h => h.oldStatus === 'In Shop').length, byPlant: {}},
                pickups: {totalChanges: pickupsHistory.length, enteredShop: pickupsHistory.filter(h => h.newStatus === 'In Shop').length, exitedShop: pickupsHistory.filter(h => h.oldStatus === 'In Shop').length, byPlant: {}}
            }

            ;[mixersHistory, tractorsHistory, trailersHistory, equipmentHistory, pickupsHistory].forEach((hist, i) => {
                const key = ['mixers', 'tractors', 'trailers', 'equipment', 'pickups'][i]
                hist.forEach(h => {
                    const plant = h.plant || 'Unknown'
                    if (!statusHistorySummary[key].byPlant[plant]) statusHistorySummary[key].byPlant[plant] = {enteredShop: 0, exitedShop: 0, totalChanges: 0}
                    statusHistorySummary[key].byPlant[plant].totalChanges++
                    if (h.newStatus === 'In Shop') statusHistorySummary[key].byPlant[plant].enteredShop++
                    if (h.oldStatus === 'In Shop') statusHistorySummary[key].byPlant[plant].exitedShop++
                })
            })

            const allReports = reportsData
            console.log('AI Agent - Total reports fetched:', allReports.length)
            console.log('AI Agent - PlantCodeToName map entries:', Array.from(plantCodeToName.entries()))
            console.log('AI Agent - UserIdToPlantCode map size:', userIdToPlantCode.size)
            if (allReports.length > 0) {
                const pmSample = allReports.find(r => r.report_name === 'plant_manager')
                if (pmSample) {
                    console.log('AI Agent - Sample PM report user_id:', pmSample.user_id)
                    console.log('AI Agent - Sample PM report user plant from map:', userIdToPlantCode.get(pmSample.user_id))
                }
            }
            const plantManagerReports = allReports.filter(r => r.report_name === 'plant_manager').map(r => {
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
                    week: r.week?.slice(0, 10),
                    submittedAt: r.submitted_at,
                    plant: plantCode || 'Unknown',
                    plantName: plantName,
                    yardage: parseFloat(r.data?.yardage || 0),
                    totalHours: parseFloat(r.data?.total_hours || 0),
                    totalYardsLost: parseFloat(r.data?.total_yards_lost || 0),
                    operatorCount: r.data?.operators?.length || 0,
                    runnableMixers: r.data?.runnable_mixers || r.data?.runnableMixers || 0,
                    downMixers: r.data?.down_mixers || r.data?.downMixers || 0,
                    notes: r.data?.notes,
                    operatorsSentToHelp: r.data?.operators_sent_to_help || [],
                    helpReceivedFromOtherPlants: r.data?.help_received_from_other_plants || []
                }
            })
            console.log('AI Agent - Plant Manager reports:', plantManagerReports.length)
            if (plantManagerReports.length > 0) {
                console.log('AI Agent - Sample PM report:', JSON.stringify(plantManagerReports[0], null, 2))
            }
            const efficiencyReports = allReports.filter(r => r.report_name === 'efficiency').map(r => {
                let plantCode = r.data?.plant || ''
                if (!plantCode && r.user_id) {
                    plantCode = userIdToPlantCode.get(r.user_id) || ''
                }
                return {
                    week: r.week?.slice(0, 10), 
                    submittedAt: r.submitted_at, 
                    plant: plantCode,
                    rows: (r.data?.rows || []).map(row => ({date: row.date, avgStart: row.avgStart, avgEnd: row.avgEnd, loadsPerHour: row.loadsPerHour}))
                }
            }).filter(r => {
                if (regionPlantCodes.size === 0) return true
                return regionPlantCodes.has(r.plant) || regionPlantCodes.has(String(r.plant).toUpperCase())
            })
            const aggregateReports = allReports.filter(r => r.report_name === 'aggregate_production').map(r => ({
                week: r.week?.slice(0, 10), submittedAt: r.submitted_at, location: r.data?.location, materials: r.data?.materials || []
            }))
            const rmiReports = allReports.filter(r => r.report_name === 'rmi').map(r => ({
                week: r.week?.slice(0, 10), submittedAt: r.submitted_at, data: r.data
            }))

            setContextData({
                regionName,
                selectedPlant,
                currentDate: new Date().toISOString().slice(0, 10),
                mixerStats,
                tractorStats,
                trailerStats,
                equipmentStats,
                pickupStats,
                operatorStats,
                mixersInShop,
                tractorsInShop,
                mixersSpare,
                tractorsSpare,
                allMixersList,
                allTractorsList,
                operatorsTraining,
                operatorsPendingStart,
                pendingListItems,
                completedListItems,
                totalOpenMaintenanceIssues: 0,
                totalServiceOverdue: mixerStats.serviceOverdue + tractorStats.serviceOverdue + trailerStats.serviceOverdue + equipmentStats.serviceOverdue,
                statusHistorySummary,
                mixersHistory,
                tractorsHistory,
                trailersHistory,
                equipmentHistory,
                pickupsHistory,
                operatorAssignmentHistory,
                allOperatorsList,
                allTrailersList,
                allEquipmentList,
                allPickupsList,
                plantManagerReports,
                efficiencyReports,
                aggregateReports,
                rmiReports
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
        setMessages(prev => [...prev, {role: 'user', content: userMessage}])
        setIsLoading(true)

        try {
            const conversationHistory = [...messages, {role: 'user', content: userMessage}]
            const response = await AIInsightsService.askFollowUp(userMessage, conversationHistory, contextData || {})
            setMessages(prev => [...prev, {role: 'assistant', content: response}])
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.'
            }])
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

    return (
        <div className="ai-agent-overlay" onClick={onClose}>
            <div className="ai-agent-popup" onClick={e => e.stopPropagation()}>
                <div className="ai-agent-header">
                    <div className="ai-agent-title">
                        <i className="fas fa-robot"></i>
                        <span>AI Assistant</span>
                    </div>
                    <div className="ai-agent-actions">
                        <button className="ai-agent-refresh" onClick={handleRefreshContext} title="Refresh data">
                            <i className="fas fa-sync-alt"></i>
                        </button>
                        <button className="ai-agent-clear" onClick={handleClearChat} title="Clear chat">
                            <i className="fas fa-trash-alt"></i>
                        </button>
                        <button className="ai-agent-close" onClick={onClose} title="Close">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div className="ai-agent-messages">
                    {messages.length === 0 ? (
                        <div className="ai-agent-welcome">
                            <i className="fas fa-comments"></i>
                            <p>Ask me anything about your fleet, operators, reports, or operations.</p>
                            <div className="ai-agent-suggestions">
                                <button onClick={() => setInputValue('What is our current fleet status?')}>
                                    Fleet status
                                </button>
                                <button onClick={() => setInputValue('How many spare mixer trucks do we have?')}>
                                    Spare mixers
                                </button>
                                <button onClick={() => setInputValue('Which trucks are currently in the shop?')}>
                                    Trucks in shop
                                </button>
                                <button onClick={() => setInputValue('How many operators are in training?')}>
                                    Training operators
                                </button>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div key={idx} className={`ai-agent-message ${msg.role}`}>
                                <div className="ai-agent-message-icon">
                                    <i className={`fas ${msg.role === 'user' ? 'fa-user' : 'fa-robot'}`}></i>
                                </div>
                                <div className="ai-agent-message-content">
                                    {msg.content.split('\n').filter(line => line.trim()).map((line, lineIdx) => (
                                        <p key={lineIdx}>{line.replace(/^\[!\]\s*/, '').replace(/^\[~\]\s*/, '').replace(/^\[i\]\s*/, '').replace(/^[-•]\s*/, '').replace(/\*\*/g, '').replace(/\*/g, '')}</p>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="ai-agent-message assistant">
                            <div className="ai-agent-message-icon">
                                <i className="fas fa-robot"></i>
                            </div>
                            <div className="ai-agent-message-content">
                                <div className="ai-agent-typing">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef}/>
                </div>
                <div className="ai-agent-input-container">
                    <textarea
                        ref={inputRef}
                        className="ai-agent-input"
                        placeholder="Ask a question..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        className="ai-agent-send"
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isLoading}
                    >
                        <i className="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    )
}
