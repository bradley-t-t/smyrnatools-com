import React from 'react'

import AssetView from '../AssetView'
import trailerConfig from '../configs/trailerConfig'

function TrailersView({
    title = 'Trailer Fleet',
    onSelectTrailer,
    embedded = false,
    initialSearch = '',
    exactMatch = false
}) {
    return (
        <AssetView
            config={trailerConfig}
            title={title}
            onSelectItem={onSelectTrailer}
            embedded={embedded}
            initialSearch={initialSearch}
            exactMatch={exactMatch}
        />
    )
}

export default TrailersView
