import APIUtility from '../utils/APIUtility'
const AUTH_FUNCTION = 'plan-service'
/**
 * Daily dispatch planning service managing inter-plant travel times
 * and per-user daily assignment plans.
 */
class PlanServiceImpl {
    travelTimesCache = null
    /** Fetches all configured travel times between plants. */
    async fetchTravelTimes() {
        const { res, json } = await APIUtility.post(`/${AUTH_FUNCTION}/fetch-travel-times`)
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
        const { res, json } = await APIUtility.post(`/${AUTH_FUNCTION}/upsert-travel-time`, {
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
        const { res, json } = await APIUtility.post(`/${AUTH_FUNCTION}/delete-travel-time`, {
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
    /** Fetches a user's saved plan for a specific date. */
    async fetchUserPlan(userId, planDate) {
        if (!userId || !planDate) return null
        const { res, json } = await APIUtility.post(`/${AUTH_FUNCTION}/fetch-user-plan`, {
            planDate,
            userId
        })
        if (!res.ok) return null
        return json?.data ?? null
    }
    /** Saves or updates a user's daily plan with assignments and notes. */
    async saveUserPlan(userId, planDate, assignments, notes) {
        if (!userId || !planDate) {
            throw new Error('userId and planDate are required')
        }
        const { res, json } = await APIUtility.post(`/${AUTH_FUNCTION}/save-user-plan`, {
            assignments: assignments || [],
            notes: notes || '',
            planDate,
            userId
        })
        if (!res.ok || json?.success !== true) throw new Error(json?.error || 'Failed to save plan')
        return true
    }
}
export const PlanService = new PlanServiceImpl()
