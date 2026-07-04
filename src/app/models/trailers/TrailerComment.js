import { createAssetComment } from '../comment/createAssetComment'

/** Trailer comment record with snake_case API mapping. */
export const TrailerComment = createAssetComment({
    foreignKey: 'trailerId',
    foreignKeyColumn: 'trailer_id'
})
