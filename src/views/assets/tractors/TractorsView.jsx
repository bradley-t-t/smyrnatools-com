import React from 'react'

import AssetViewShell from '../../../app/components/assets/AssetViewShell'
import tractorConfig from '../configs/tractorConfig'

function TractorsView({
    title = 'Tractor Fleet',
    setSelectedView,
    embedded = false,
    initialSearch = '',
    exactMatch = false
}) {
    return (
        <AssetViewShell
            config={tractorConfig}
            embedded={embedded}
            exactMatch={exactMatch}
            initialSearch={initialSearch}
            setSelectedView={setSelectedView}
            title={title}
        />
    )
}

export default TractorsView
