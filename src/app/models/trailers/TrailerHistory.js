import { createAssetHistory } from '../history/createAssetHistory'

/** Trailer field-change history entry with snake_case API mapping. */
export const TrailerHistory = createAssetHistory({
    foreignKey: 'trailerId',
    foreignKeyColumn: 'trailer_id'
})
