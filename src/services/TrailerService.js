import Trailer from '../app/models/trailers/Trailer'
import { TrailerComment } from '../app/models/trailers/TrailerComment'
import { TrailerHistory } from '../app/models/trailers/TrailerHistory'
import { createAssetService } from './BaseAssetService'

const base = createAssetService({
    commentModelFn: TrailerComment.fromRow,
    commentsTable: 'trailers_comments',
    entityIdParam: 'trailerId',
    entityKey: 'trailer',
    entityName: 'Trailer',
    historyTable: 'trailers_history',
    idColumn: 'trailer_id',
    issuesTable: 'trailers_maintenance',
    parseHistoryRow: TrailerHistory.fromApiFormat,
    parseRow: (row) => (row ? Trailer.fromApiFormat(row) : null),
    servicePrefix: '/trailer-service'
})

/** Trailer CRUD, comments, issues, and history service. */
export const TrailerService = {
    ...base,

    createTrailer(trailer, userId) {
        return base._base.create(trailer, userId)
    },

    deleteTrailer(id) {
        return base._base.delete(id)
    },
    /** Fetches a single trailer by ID. Accepts string IDs or `{ id }` / `{ trailerId }` objects. */
    fetchTrailerById(trailerId) {
        if (!trailerId) throw new Error('Trailer ID is required')
        const resolved = typeof trailerId === 'object' ? trailerId.id || trailerId.trailerId || '' : trailerId
        return base._base.fetchById(resolved)
    },

    fetchTrailers() {
        return base._base.getAll()
    },

    fetchTrailersWithDetails(regionCodes = null) {
        return base._base.fetchWithDetails(regionCodes)
    },
    /** Fetches change history for a trailer. Invoked dynamically via
     *  HISTORY_SERVICE_MAP in useHistoryDataFetchers. */
    getTrailerHistory(trailerId, limit = null) {
        return base._base.getHistory(trailerId, limit)
    },
    /** Updates a trailer record. Coerces plain objects to Trailer instances for serialization. */
    updateTrailer(trailerId, updatedTrailer, userId, _oldTrailer) {
        const trailer = updatedTrailer instanceof Trailer ? updatedTrailer : Trailer.ensureInstance(updatedTrailer)
        return base._base.update(trailerId, trailer, userId)
    }
}
