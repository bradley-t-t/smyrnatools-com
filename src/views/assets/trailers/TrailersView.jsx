import React from 'react'

import AssetViewShell from '../../../app/components/assets/AssetViewShell'
import trailerConfig from '../configs/trailerConfig'

function TrailersView({
    title = 'Trailer Fleet',
    onSelectTrailer,
    embedded = false,
    initialSearch = '',
    exactMatch = false
}) {
    return (
        <AssetViewShell
            config={trailerConfig}
            embedded={embedded}
            exactMatch={exactMatch}
            initialSearch={initialSearch}
            onSelectItem={onSelectTrailer}
            title={title}
        />
    )
}

export default TrailersView
