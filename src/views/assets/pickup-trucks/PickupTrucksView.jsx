import React from 'react'

import AssetViewShell from '../../../app/components/assets/AssetViewShell'
import pickupTruckConfig from '../configs/pickupTruckConfig'

function PickupTrucksView({ title = 'Pickup Trucks' }) {
    return <AssetViewShell config={pickupTruckConfig} title={title} />
}

export default PickupTrucksView
