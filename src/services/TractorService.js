import { Tractor } from '../app/models/tractors/Tractor'
import { TractorComment } from '../app/models/tractors/TractorComment'
import { TractorHistory } from '../app/models/tractors/TractorHistory'
import CleanupUtility from '../utils/CleanupUtility'
import VerifiedUtility from '../utils/VerifiedUtility'
import { createAssetService } from './BaseAssetService'

/** Tractor history columns allowed in the audit trail; others are silently dropped. */
const ALLOWED_HISTORY_FIELDS = [
    'truck_number',
    'assigned_plant',
    'assigned_operator',
    'last_service_date',
    'cleanliness_rating',
    'has_blower',
    'vin',
    'make',
    'model',
    'year',
    'freight',
    'status',
    'hours'
]

/** Attaches isVerified() and normalizes VIN casing on a tractor instance. */
function enrichTractorWithVerification(tractor) {
    if (!tractor) return tractor
    tractor.vin = (tractor.vin || '').toUpperCase()
    tractor.isVerified = () => VerifiedUtility.isVerified(tractor.updatedLast, tractor.updatedAt, tractor.updatedBy)
    return tractor
}

const base = createAssetService({
    allowedHistoryFields: ALLOWED_HISTORY_FIELDS,
    clearOperatorOnPlantChange: true,
    commentModelFn: TractorComment.fromRow,
    commentsTable: 'tractors_comments',
    enrichFn: enrichTractorWithVerification,
    entityIdParam: 'tractorId',
    entityKey: 'tractor',
    entityName: 'Tractor',
    historyTable: 'tractors_history',
    idColumn: 'tractor_id',
    issuesTable: 'tractors_maintenance',
    parseHistoryRow: TractorHistory.fromApiFormat,
    parseRow: Tractor.fromApiFormat,
    servicePrefix: '/tractor-service',
    uppercaseVin: true
})

/** Tractor CRUD, history, comments, issues, and verification service. */
export const TractorService = {
    ...base,
    /** Batch-corrects null operator fields by setting affected tractors to Spare. */
    cleanupNullOperators(tractors = null) {
        return CleanupUtility.cleanupNullOperators(
            tractors,
            (id, updates, userId) => this.updateTractor(id, updates, userId),
            () => this.getAllTractors()
        )
    },

    createTractor(tractor, userId) {
        return base._base.create(tractor, userId)
    },

    deleteTractor(id) {
        return base._base.delete(id)
    },

    fetchTractorById(id) {
        return base._base.fetchById(id)
    },

    fetchTractors() {
        return this.getAllTractors()
    },

    fetchTractorsWithDetails(regionCodes = null) {
        return base._base.fetchWithDetails(regionCodes)
    },

    getAllTractors() {
        return base._base.getAll()
    },

    /** Fetches change history for a tractor. Invoked dynamically via
     *  HISTORY_SERVICE_MAP in useHistoryDataFetchers. */
    getTractorHistory(tractorId, limit = null) {
        return base._base.getHistory(tractorId, limit)
    },

    getTractorsByOperator(operatorId) {
        return base._base.getByOperator(operatorId)
    },

    searchTractorsByVin(query) {
        return base._base.searchByVin(query)
    },

    /** VIN search with enrichment + safe count defaults for downstream consumers. */
    async searchTractorsByVinProcessed(query) {
        const rows = await this.searchTractorsByVin(query)
        return rows.map((t) => {
            t.isVerified = () => VerifiedUtility.isVerified(t.updatedLast, t.updatedAt, t.updatedBy)
            if (typeof t.openIssuesCount !== 'number') t.openIssuesCount = 0
            if (typeof t.commentsCount !== 'number') t.commentsCount = 0
            return t
        })
    },

    updateTractor(tractorId, tractor, userId, prevTractorState = null) {
        return base._base.update(tractorId, tractor, userId, prevTractorState)
    },

    verifyTractor(tractorId, userId) {
        return base._base.verify(tractorId, userId)
    }
}
