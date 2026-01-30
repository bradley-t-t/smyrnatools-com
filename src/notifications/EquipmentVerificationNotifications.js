import { EquipmentService } from '../services/EquipmentService'
import { RegionService } from '../services/RegionService'
import { UserService } from '../services/UserService'
import EquipmentUtility from '../utils/EquipmentUtility'

async function getRegionScopedPlantCodes(userId, selectedRegion) {
    const code = selectedRegion?.code || ''
    const type = selectedRegion?.type || ''
    if (!code) return new Set()
    if (String(type).toLowerCase() === 'office') {
        const regions = await UserService.getPermittedRegions(userId).catch(() => [])
        const out = new Set()
        for (const r of Array.isArray(regions) ? regions : []) {
            const rCode = r.regionCode || r.region_code
            if (!rCode) continue
            const list = await RegionService.getAllowedPlantCodes(rCode).catch(() => null)
            if (!list) continue
            if (list instanceof Set) list.forEach((p) => out.add(String(p).toUpperCase()))
            else if (Array.isArray(list)) list.forEach((p) => out.add(String(p).toUpperCase()))
        }
        return out
    }
    const list = await RegionService.getAllowedPlantCodes(code).catch(() => null)
    const out = new Set()
    if (list instanceof Set) list.forEach((p) => out.add(String(p).toUpperCase()))
    else if (Array.isArray(list)) list.forEach((p) => out.add(String(p).toUpperCase()))
    return out
}

async function getNotifications({ userId, selectedRegion }) {
    if (!userId) return []

    const emNode = await UserService.hasPermission(userId, 'notifications.equipment_manager').catch(() => false)

    if (!emNode) return []

    const hasMultiple = await UserService.hasPermission(userId, 'notifications.multiple').catch(() => false)

    const scopedPlants = await getRegionScopedPlantCodes(userId, selectedRegion)
    if (scopedPlants.size === 0) return []

    const all = await EquipmentService.getAllEquipments().catch(() => [])
    const equipments = (all || []).filter((e) => String(e.status || '').toLowerCase() !== 'retired')

    const now = new Date()
    const centralParts = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        hour12: false,
        minute: '2-digit',
        timeZone: 'America/Chicago',
        weekday: 'short'
    }).formatToParts(now)
    const mp = {}
    centralParts.forEach((p) => {
        mp[p.type] = p.value
    })
    const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(mp.weekday)
    const hour = parseInt(mp.hour, 10)
    const pastDue = (dayIndex === 5 && hour >= 10) || dayIndex === 6 || dayIndex === 0 || (dayIndex === 1 && hour < 17)

    if (hasMultiple) {
        const byPlant = new Map()
        equipments.forEach((e) => {
            const code = String(e.assignedPlant || '').toUpperCase()
            if (!scopedPlants.has(code)) return
            if (!byPlant.has(code)) byPlant.set(code, [])
            byPlant.get(code).push(e)
        })

        const notifications = []
        byPlant.forEach((list, code) => {
            const unverifiedCount = list.reduce(
                (acc, e) =>
                    acc +
                    (!EquipmentUtility.isVerified(e.updatedLast, e.updatedAt, e.updatedBy, e.latestHistoryDate)
                        ? 1
                        : 0),
                0
            )
            if (unverifiedCount > 0) {
                const titlePhase = pastDue ? 'Past Due' : 'Due'
                const severity = pastDue ? 'error' : 'warning'
                notifications.push({
                    id: `equipment-verify-${code}`,
                    plantCode: code,
                    severity,
                    subtitle: `This plant has ${unverifiedCount} unverified equipment.`,
                    title: `Plant ${code} Equipment Verifications ${titlePhase}`,
                    type: 'equipment.verifications'
                })
            }
        })
        return notifications
    }

    const userPlant = await UserService.getUserPlant(userId).catch(() => null)
    const userPlantCode =
        typeof userPlant === 'string' ? userPlant : userPlant?.plant_code || userPlant?.plantCode || ''
    if (!userPlantCode) return []

    const userPlantCodeUpper = String(userPlantCode).toUpperCase()
    if (!scopedPlants.has(userPlantCodeUpper)) return []

    const equipmentsAtPlant = equipments.filter(
        (e) => String(e.assignedPlant || '').toUpperCase() === userPlantCodeUpper
    )
    const unverifiedCount = equipmentsAtPlant.reduce(
        (acc, e) =>
            acc + (!EquipmentUtility.isVerified(e.updatedLast, e.updatedAt, e.updatedBy, e.latestHistoryDate) ? 1 : 0),
        0
    )

    if (unverifiedCount === 0) return []

    const titlePhase = pastDue ? 'Past Due' : 'Due'
    const severity = pastDue ? 'error' : 'warning'

    return [
        {
            id: `equipment-verify-${userPlantCodeUpper}`,
            severity,
            subtitle: `You have ${unverifiedCount} unverified equipment.`,
            title: `Equipment Verifications ${titlePhase}`,
            type: 'equipment.verifications'
        }
    ]
}

export default { getNotifications, id: 'equipment.verifications' }
