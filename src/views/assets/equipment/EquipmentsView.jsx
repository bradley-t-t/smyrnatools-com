import React from 'react'

import AssetViewShell from '../../../app/components/assets/AssetViewShell'
import equipmentConfig from '../configs/equipmentConfig'

function EquipmentsView({
    title = 'Equipment Fleet',
    onSelectEquipment,
    embedded = false,
    initialSearch = '',
    exactMatch = false
}) {
    return (
        <AssetViewShell
            config={equipmentConfig}
            embedded={embedded}
            exactMatch={exactMatch}
            initialSearch={initialSearch}
            onSelectItem={onSelectEquipment}
            title={title}
        />
    )
}

export default EquipmentsView
