import APIUtility from '../utils/APIUtility'
import { Database } from './DatabaseService'

const NRMCA_FUNCTION = '/nrmca-service'

const post = (endpoint, body) => APIUtility.post(`${NRMCA_FUNCTION}/${endpoint}`, body)

const NRMCAServiceImpl = {
    /** Fetch all defined NRMCA plant entries, optionally filtered by plant codes. */
    async fetchPlants(plantCodes = null) {
        let query = Database.from('nrmca_plants').select('*').order('plant_code').order('plant_label')
        if (plantCodes?.size) query = query.in('plant_code', [...plantCodes])
        const { data, error } = await query
        if (error) throw error
        return data ?? []
    },

    /** Fetch all scales, with their parent nrmca_plant info, optionally filtered by plant codes. */
    async fetchScales(plantCodes = null) {
        let query = Database.from('nrmca_scales')
            .select('*, nrmca_plants(plant_label, plant_code)')
            .order('plant_code')
            .order('scale_name')
        if (plantCodes?.size) query = query.in('plant_code', [...plantCodes])
        const { data, error } = await query
        if (error) throw error
        return data ?? []
    },

    /** Fetch calibration history for a single scale. */
    async fetchCalibrationHistory(scaleId) {
        const { data, error } = await Database.from('nrmca_scale_calibrations')
            .select('*')
            .eq('scale_id', scaleId)
            .order('calibrated_at', { ascending: false })
            .limit(20)
        if (error) throw error
        return data ?? []
    },

    /** Fetch renewal history for a single nrmca_plant. */
    async fetchRenewalHistory(nrmcaPlantId) {
        const { data, error } = await Database.from('nrmca_renewals')
            .select('*')
            .eq('nrmca_plant_id', nrmcaPlantId)
            .order('renewed_at', { ascending: false })
            .limit(20)
        if (error) throw error
        return data ?? []
    },

    async upsertPlant({ id, plant_code, plant_label, notes }) {
        const { res, json } = await post('upsert-plant', { id, plant_code, plant_label, notes })
        if (!res?.ok) throw new Error(json?.error || 'Failed to save plant')
        return json
    },

    async deletePlant(id) {
        const { res, json } = await post('delete-plant', { id })
        if (!res?.ok) throw new Error(json?.error || 'Failed to delete plant')
    },

    async upsertScale({ id, nrmca_plant_id, plant_code, scale_name, scale_type, calibration_interval_days, notes }) {
        const { res, json } = await post('upsert-scale', {
            id,
            nrmca_plant_id,
            plant_code,
            scale_name,
            scale_type,
            calibration_interval_days,
            notes
        })
        if (!res?.ok) throw new Error(json?.error || 'Failed to save scale')
        return json
    },

    async deleteScale(id) {
        const { res, json } = await post('delete-scale', { id })
        if (!res?.ok) throw new Error(json?.error || 'Failed to delete scale')
    },

    async logRenewal({ nrmca_plant_id, renewed_at, renewal_expires_at, notes }) {
        const { res, json } = await post('log-renewal', { nrmca_plant_id, renewed_at, renewal_expires_at, notes })
        if (!res?.ok) throw new Error(json?.error || 'Failed to log renewal')
    },

    async logCalibration({ scale_id, calibrated_at, calibrated_by, notes }) {
        const { res, json } = await post('log-calibration', { scale_id, calibrated_at, calibrated_by, notes })
        if (!res?.ok) throw new Error(json?.error || 'Failed to log calibration')
    }
}

export const NRMCAService = NRMCAServiceImpl
