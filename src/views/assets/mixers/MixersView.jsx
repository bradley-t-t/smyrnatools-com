import React from 'react'

import AssetViewShell from '../../../app/components/assets/AssetViewShell'
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
        <AssetViewShell
            config={mixerConfig}
            embedded={embedded}
            exactMatch={exactMatch}
            initialSearch={initialSearch}
            onSelectItem={onSelectMixer}
            setSelectedView={setSelectedView}
            title={title}
        />
    )
}

export default MixersView
