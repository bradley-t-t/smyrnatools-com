/**
 * Factory for asset-history domain models (TrailerHistory, PickupTruckHistory,
 * etc.). Each asset's history row has the same shape — id, FK to the parent
 * asset, fieldName, oldValue, newValue, changedAt, changedBy. The only
 * differences across asset types are:
 *
 *   - FK field name (e.g. `trailerId` vs `truckId`)
 *   - FK DB column (e.g. `trailer_id` vs `truck_id`)
 *   - Optional whitelist of fields whose timestamp suffix should be stripped
 *     during deserialization (e.g. `last_service_date` rows come back as
 *     `2026-04-12T00:00:00+00:00` and we want `2026-04-12` for display).
 *
 * Asset types with richer behavior — value-formatting methods, blower-aware
 * display logic, etc. — still hand-roll their classes (see MixerHistory,
 * TractorHistory). This factory is for the "just hydrate the row" cases.
 *
 * @param {Object} config
 * @param {string} config.foreignKey       - camelCase instance property (e.g. 'trailerId')
 * @param {string} config.foreignKeyColumn - snake_case DB column (e.g. 'trailer_id')
 * @param {string[]} [config.dateFields=[]] - Field names whose timestamps are stripped to a YYYY-MM-DD string
 */
export function createAssetHistory({ foreignKey, foreignKeyColumn, dateFields = [] }) {
    const dateFieldSet = new Set(dateFields)

    class AssetHistory {
        constructor(data = {}) {
            this.id = data.id ?? null
            this[foreignKey] = data[foreignKeyColumn] ?? ''
            this.fieldName = data.field_name ?? ''
            this.oldValue = data.old_value ?? ''
            this.newValue = data.new_value ?? ''
            this.changedAt = data.changed_at ?? ''
            this.changedBy = data.changed_by ?? ''
        }

        static fromApiFormat(data) {
            if (!data) return null
            let oldValue = data.old_value
            let newValue = data.new_value
            // Strip the time component on whitelisted date fields so history
            // rows display as `2026-04-12` instead of the raw ISO timestamp.
            if (dateFieldSet.has(data.field_name)) {
                if (typeof oldValue === 'string' && oldValue.includes('T')) oldValue = oldValue.split('T')[0]
                if (typeof newValue === 'string' && newValue.includes('T')) newValue = newValue.split('T')[0]
            }
            return new AssetHistory({
                changed_at: data.changed_at,
                changed_by: data.changed_by,
                field_name: data.field_name,
                [foreignKeyColumn]: data[foreignKeyColumn],
                id: data.id,
                new_value: newValue,
                old_value: oldValue
            })
        }

        toApiFormat() {
            return {
                changed_at: this.changedAt,
                changed_by: this.changedBy,
                field_name: this.fieldName,
                [foreignKeyColumn]: this[foreignKey],
                id: this.id,
                new_value: this.newValue,
                old_value: this.oldValue
            }
        }
    }

    return AssetHistory
}
