import { createAssetComment } from '../comment/createAssetComment'

/** Mixer comment record with snake_case API mapping. */
export const MixerComment = createAssetComment({
    foreignKey: 'mixerId',
    foreignKeyColumn: 'mixer_id'
})
