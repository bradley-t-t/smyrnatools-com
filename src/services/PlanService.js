import APIUtility from '../utils/APIUtility'
const SERVICE_PREFIX = 'plan-service'
/**
 * Shared daily dispatch planning service managing inter-plant travel times
 * and collaborative daily assignment plans.
 */
class PlanServiceImpl {
    travelTimesCache = null
    /** Fetches all configured travel times between plants. */
    async fetchTravelTimes() {
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/fetch-travel-times`)
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch travel times')
        const data = json?.data ?? []
        this.travelTimesCache = data
        return data
    }
    /** Creates or updates a travel time entry between two plants. */
    async upsertTravelTime(fromPlantCode, toPlantCode, travelMinutes) {
        if (!fromPlantCode || !toPlantCode || typeof travelMinutes !== 'number') {
            throw new Error('fromPlantCode, toPlantCode, and travelMinutes are required')
        }
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/upsert-travel-time`, {
            fromPlantCode,
            toPlantCode,
            travelMinutes
        })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to save travel time')
        this.travelTimesCache = null
        return true
    }
    /** Removes a travel time configuration between two plants. */
    async deleteTravelTime(fromPlantCode, toPlantCode) {
        if (!fromPlantCode || !toPlantCode) {
            throw new Error('fromPlantCode and toPlantCode are required')
        }
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/delete-travel-time`, {
            fromPlantCode,
            toPlantCode
        })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to delete travel time')
        this.travelTimesCache = null
        return true
    }
    /** Looks up a cached travel time between two plants. Returns null if not cached. */
    getTravelTime(fromPlantCode, toPlantCode) {
        if (!this.travelTimesCache) return null
        const entry = this.travelTimesCache.find(
            (t) => t.from_plant_code === fromPlantCode && t.to_plant_code === toPlantCode
        )
        return entry?.travel_minutes ?? null
    }
    /** Builds a lookup map of all cached travel times keyed by "from→to" plant pairs. */
    getTravelTimesMap() {
        if (!this.travelTimesCache) return {}
        const map = {}
        for (const entry of this.travelTimesCache) {
            const key = `${entry.from_plant_code}->${entry.to_plant_code}`
            map[key] = entry.travel_minutes
        }
        return map
    }
    /** Fetches the shared plan for a specific date. */
    async fetchPlan(planDate) {
        if (!planDate) return null
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/fetch-plan`, { planDate })
        if (!res.ok) return null
        return json?.data ?? null
    }
    /** Saves or updates the shared daily plan with assignments and notes. */
    async savePlan(planDate, assignments, notes) {
        if (!planDate) throw new Error('planDate is required')
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/save-plan`, {
            assignments: assignments || [],
            notes: notes || '',
            planDate
        })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to save plan')
        return true
    }
    /** Fetches all saved plan templates for a user. */
    async fetchTemplates(userId) {
        if (!userId) return []
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/fetch-templates`, { userId })
        if (!res.ok) return []
        return json?.data ?? []
    }
    /** Saves the current plan as a named template. */
    async saveTemplate(userId, name, assignments, notes) {
        if (!userId || !name) throw new Error('userId and name are required')
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/save-template`, {
            assignments: assignments || [],
            name,
            notes: notes || '',
            userId
        })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to save template')
        return true
    }
    /** Deletes a saved plan template by ID. */
    async deleteTemplate(templateId) {
        if (!templateId) throw new Error('templateId is required')
        const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/delete-template`, { templateId })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to delete template')
        return true
    }
}
export const PlanService = new PlanServiceImpl()
