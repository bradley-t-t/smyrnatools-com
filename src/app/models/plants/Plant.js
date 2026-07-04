/** Plant location record with code, display name, physical address, an
 *  optional latitude/longitude (consumed by the Plan → Map tab), the
 *  list of user ids attached as managers for this plant, and the
 *  optional co-location group id shared by plants at the same physical
 *  site (e.g. Baytown 403/404, Conroe 408/409). */
export class Plant {
    constructor(data = {}) {
        this.plantCode = data.plant_code ?? ''
        this.plantName = data.plant_name ?? ''
        this.plantAddress = data.plant_address ?? ''
        this.latitude = data.latitude != null ? Number(data.latitude) : null
        this.longitude = data.longitude != null ? Number(data.longitude) : null
        // Always an array — backend defaults the column to `'{}'`, so callers
        // never have to null-check before iterating.
        this.managerUserIds = Array.isArray(data.manager_user_ids) ? data.manager_user_ids : []
        // NULL when the plant is standalone. Plants sharing the same value
        // are at the same physical location.
        this.locationGroupId = data.location_group_id ?? null
        // Phantom code aliases that share this plant's physical location
        // but don't exist as their own plant rows (e.g. dispatch's "404"
        // sibling of 403). Defaults to empty array.
        this.colocatedAliasCodes = Array.isArray(data.colocated_alias_codes) ? data.colocated_alias_codes : []
        this.createdAt = data.created_at ?? new Date().toISOString()
        this.updatedAt = data.updated_at ?? new Date().toISOString()
    }
    static fromRow(row) {
        if (!row) return null
        return new Plant(row)
    }
}
