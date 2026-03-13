import React from 'react'

import AssetView from '../AssetView'
import equipmentConfig from '../configs/equipmentConfig'

function EquipmentsView({
    title = 'Equipment Fleet',
    onSelectEquipment,
    embedded = false,
    initialSearch = '',
    exactMatch = false
}) {
    return (
        <AssetView
            config={equipmentConfig}
            title={title}
            onSelectItem={onSelectEquipment}
            embedded={embedded}
            initialSearch={initialSearch}
            exactMatch={exactMatch}
        />
    )
}

export default EquipmentsView
