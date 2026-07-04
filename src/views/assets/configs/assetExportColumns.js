import VerifiedUtility from '../../../utils/VerifiedUtility'

/**
 * Single source of truth for the data-export column layout of every asset
 * type. Each entry is keyed by the asset config `key` and lists the columns —
 * in display order — that the shared `exportAssetDataSheet` utility renders.
 *
 * A column is `{ header, type, get }`:
 *   - `header` — human-readable, Title Case label for the spreadsheet column.
 *   - `type`   — render kind consumed by the export utility
 *                ('text' | 'number' | 'rating' | 'date' | 'bool').
 *   - `get(item, context)` — pulls the raw value off an asset row. `context`
 *                exposes `{ plants, operators, tractors }` for label lookups.
 *
 * Internal ids / uuids are intentionally omitted — only fields a fleet user
 * would expect to read are included.
 */

/** Maps a mixer shop sub-status to its human label, matching the list view. */
const SHOP_STATUS_LABELS = {
    down_in_yard: 'Down In Yard',
    in_shop: 'In Shop',
    ready_for_pickup: 'Ready For Pickup',
    third_party: 'Third Party Work',
    waiting_for_shop: 'Waiting For Shop'
}

/** Resolves a plant code to its display name, falling back to the raw code. */
function plantLabel(code, context) {
    if (!code) return ''
    const plant = context.plants?.find((p) => (p.plantCode ?? p.plant_code ?? p.code) === code)
    return plant?.plantName ?? plant?.plant_name ?? plant?.name ?? code
}

/** Resolves an operator employee id to their name (blank when unmatched). */
function operatorLabel(employeeId, context) {
    if (!employeeId) return ''
    const operator = context.operators?.find((op) => (op.employeeId ?? op.employee_id) === employeeId)
    return operator?.name ?? ''
}

/** Resolves an assigned tractor id to its truck number (blank when unmatched). */
function tractorLabel(tractorId, context) {
    if (!tractorId) return ''
    const tractor = context.tractors?.find((t) => t.id === tractorId)
    return tractor?.truckNumber ?? ''
}

/** Mirrors the list view's combined status / shop sub-status display. */
function mixerStatusLabel(item) {
    if (item.status !== 'In Shop') return item.status
    return SHOP_STATUS_LABELS[item.shopStatus] ?? 'In Shop'
}

/** Verification state, preferring the row's attached method to match the UI. */
function verifiedValue(item) {
    if (typeof item.isVerified === 'function') return !!item.isVerified()
    return VerifiedUtility.isVerified(item.updatedLast, item.updatedAt, item.updatedBy)
}

const PLANT_COLUMN = { get: (item, ctx) => plantLabel(item.assignedPlant, ctx), header: 'Plant', type: 'text' }
const CLEANLINESS_COLUMN = { get: (item) => item.cleanlinessRating, header: 'Cleanliness', type: 'rating' }
const OPEN_ISSUES_COLUMN = { get: (item) => item.openIssuesCount, header: 'Open Issues', type: 'number' }
const VERIFIED_COLUMN = { get: (item) => verifiedValue(item), header: 'Verified', type: 'bool' }
const LAST_UPDATED_COLUMN = { get: (item) => item.updatedLast, header: 'Last Updated', type: 'date' }

const ASSET_EXPORT_COLUMNS = {
    equipment: [
        { get: (item) => item.identifyingNumber, header: 'ID #', type: 'text' },
        { get: (item) => item.equipmentType, header: 'Type', type: 'text' },
        PLANT_COLUMN,
        { get: (item) => item.status, header: 'Status', type: 'text' },
        { get: (item) => item.equipmentMake, header: 'Make', type: 'text' },
        { get: (item) => item.equipmentModel, header: 'Model', type: 'text' },
        { get: (item) => item.yearMade, header: 'Year', type: 'text' },
        { get: (item) => item.hours, header: 'Hours', type: 'number' },
        { get: (item) => item.hoursMileage, header: 'Hours / Mileage', type: 'number' },
        CLEANLINESS_COLUMN,
        { get: (item) => item.conditionRating, header: 'Condition', type: 'rating' },
        { get: (item) => item.lastServiceDate, header: 'Last Service', type: 'date' },
        OPEN_ISSUES_COLUMN,
        VERIFIED_COLUMN,
        LAST_UPDATED_COLUMN
    ],
    mixer: [
        { get: (item) => item.truckNumber, header: 'Truck #', type: 'text' },
        PLANT_COLUMN,
        { get: (item) => mixerStatusLabel(item), header: 'Status', type: 'text' },
        { get: (item, ctx) => operatorLabel(item.assignedOperator, ctx), header: 'Operator', type: 'text' },
        CLEANLINESS_COLUMN,
        { get: (item) => item.hours, header: 'Hours', type: 'number' },
        { get: (item) => item.vinNumber ?? item.vin, header: 'VIN', type: 'text' },
        { get: (item) => item.make, header: 'Make', type: 'text' },
        { get: (item) => item.model, header: 'Model', type: 'text' },
        { get: (item) => item.year, header: 'Year', type: 'text' },
        { get: (item) => item.lastServiceDate, header: 'Last Service', type: 'date' },
        { get: (item) => item.lastChipDate, header: 'Last Chip', type: 'date' },
        OPEN_ISSUES_COLUMN,
        VERIFIED_COLUMN,
        LAST_UPDATED_COLUMN
    ],
    'pickup-truck': [
        { get: (item) => item.assigned, header: 'Assigned To', type: 'text' },
        PLANT_COLUMN,
        { get: (item) => item.status, header: 'Status', type: 'text' },
        { get: (item) => item.make, header: 'Make', type: 'text' },
        { get: (item) => item.model, header: 'Model', type: 'text' },
        { get: (item) => item.year, header: 'Year', type: 'text' },
        { get: (item) => item.vin, header: 'VIN', type: 'text' },
        { get: (item) => item.mileage, header: 'Mileage', type: 'number' },
        { get: (item) => item.comments, header: 'Comments', type: 'text' },
        LAST_UPDATED_COLUMN
    ],
    tractor: [
        { get: (item) => item.truckNumber, header: 'Truck #', type: 'text' },
        PLANT_COLUMN,
        { get: (item) => item.status, header: 'Status', type: 'text' },
        { get: (item, ctx) => operatorLabel(item.assignedOperator, ctx), header: 'Operator', type: 'text' },
        { get: (item) => item.freight, header: 'Freight', type: 'text' },
        { get: (item) => item.hasBlower, header: 'Blower', type: 'bool' },
        CLEANLINESS_COLUMN,
        { get: (item) => item.hours, header: 'Hours', type: 'number' },
        { get: (item) => item.vinNumber ?? item.vin, header: 'VIN', type: 'text' },
        { get: (item) => item.make, header: 'Make', type: 'text' },
        { get: (item) => item.model, header: 'Model', type: 'text' },
        { get: (item) => item.year, header: 'Year', type: 'text' },
        { get: (item) => item.lastServiceDate, header: 'Last Service', type: 'date' },
        OPEN_ISSUES_COLUMN,
        VERIFIED_COLUMN,
        LAST_UPDATED_COLUMN
    ],
    trailer: [
        { get: (item) => item.trailerNumber, header: 'Trailer #', type: 'text' },
        PLANT_COLUMN,
        { get: (item) => item.trailerType, header: 'Type', type: 'text' },
        { get: (item) => item.status, header: 'Status', type: 'text' },
        { get: (item, ctx) => tractorLabel(item.assignedTractor, ctx), header: 'Assigned Tractor', type: 'text' },
        CLEANLINESS_COLUMN,
        OPEN_ISSUES_COLUMN,
        VERIFIED_COLUMN,
        LAST_UPDATED_COLUMN
    ]
}

/** Returns the export column layout for an asset config key, or `null`. */
export function getAssetExportColumns(configKey) {
    return ASSET_EXPORT_COLUMNS[configKey] ?? null
}

export default ASSET_EXPORT_COLUMNS
