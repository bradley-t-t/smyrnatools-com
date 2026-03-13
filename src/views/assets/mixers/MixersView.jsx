import React from 'react'

import AssetView from '../AssetView'
import mixerConfig from '../configs/mixerConfig'

function MixersView({
    title = 'Mixer Fleet',
    onSelectMixer,
    setSelectedView,
    embedded = false,
    initialSearch = '',
    exactMatch = false
}) {
    return (
        <AssetView
            config={mixerConfig}
            title={title}
            onSelectItem={onSelectMixer}
            setSelectedView={setSelectedView}
            embedded={embedded}
            initialSearch={initialSearch}
            exactMatch={exactMatch}
        />
    )
}

export default MixersView
