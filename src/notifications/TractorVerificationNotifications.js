import { UserService } from '../services/UserService'
import { RegionService } from '../services/RegionService'
import { TractorService } from '../services/TractorService'
import TractorUtility from '../utils/TractorUtility'

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

    const tmNode = await UserService.hasPermission(userId, 'notifications.tractor_manager').catch(() => false)

    if (!tmNode) return []

    const hasMultiple = await UserService.hasPermission(userId, 'notifications.multiple').catch(() => false)

    const scopedPlants = await getRegionScopedPlantCodes(userId, selectedRegion)
    if (scopedPlants.size === 0) return []

    const all = await TractorService.getAllTractors().catch(() => [])
    const tractors = (all || []).filter((t) => String(t.status || '').toLowerCase() !== 'retired')

    const now = new Date()
    const centralParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
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
        tractors.forEach((t) => {
            const code = String(t.assignedPlant || '').toUpperCase()
            if (!scopedPlants.has(code)) return
            if (!byPlant.has(code)) byPlant.set(code, [])
            byPlant.get(code).push(t)
        })

        const notifications = []
        byPlant.forEach((list, code) => {
            const unverifiedCount = list.reduce(
                (acc, t) =>
                    acc +
                    (!TractorUtility.isVerified(t.updatedLast, t.updatedAt, t.updatedBy, t.latestHistoryDate) ? 1 : 0),
                0
            )
            if (unverifiedCount > 0) {
                const titlePhase = pastDue ? 'Past Due' : 'Due'
                const severity = pastDue ? 'error' : 'warning'
                notifications.push({
                    id: `tractors-verify-${code}`,
                    title: `Plant ${code} Tractor Verifications ${titlePhase}`,
                    subtitle: `This plant has ${unverifiedCount} unverified tractors.`,
                    severity,
                    type: 'tractors.verifications',
                    plantCode: code
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

    const tractorsAtPlant = tractors.filter((t) => String(t.assignedPlant || '').toUpperCase() === userPlantCodeUpper)
    const unverifiedCount = tractorsAtPlant.reduce(
        (acc, t) =>
            acc + (!TractorUtility.isVerified(t.updatedLast, t.updatedAt, t.updatedBy, t.latestHistoryDate) ? 1 : 0),
        0
    )

    if (unverifiedCount === 0) return []

    const titlePhase = pastDue ? 'Past Due' : 'Due'
    const severity = pastDue ? 'error' : 'warning'

    return [
        {
            id: `tractors-verify-${userPlantCodeUpper}`,
            title: `Tractor Verifications ${titlePhase}`,
            subtitle: `You have ${unverifiedCount} unverified tractors.`,
            severity,
            type: 'tractors.verifications'
        }
    ]
}

export default { id: 'tractors.verifications', getNotifications }
