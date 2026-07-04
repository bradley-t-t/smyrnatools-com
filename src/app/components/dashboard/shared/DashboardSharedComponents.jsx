/* eslint-disable react/forbid-dom-props */
import React from 'react'

/** Maps asset type labels to their corresponding embedded view route keys. */
export const getAssetViewType = (assetType) => {
    const viewMap = { Equipment: 'equipment', Mixer: 'mixers', Tractor: 'tractors', Trailer: 'trailers' }
    return viewMap[assetType] || 'equipment'
}

/** Skeleton pulse block — generic loading placeholder. Honors
 *  `prefers-reduced-motion` so the shimmer disables for users who opt
 *  out of decorative motion. `style` stays available for callers that
 *  need to set arbitrary width/height values. */
export const Skeleton = ({ className = '', style }) => (
    <div
        className={`bg-bg-tertiary rounded-md animate-pulse motion-reduce:animate-none ${className}`}
        style={style}
        aria-hidden="true"
    />
)
