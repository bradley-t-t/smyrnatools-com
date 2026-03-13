import React from 'react'

import AssetView from '../AssetView'
import pickupTruckConfig from '../configs/pickupTruckConfig'

function PickupTrucksView({ title = 'Pickup Trucks' }) {
    return <AssetView config={pickupTruckConfig} title={title} />
}

export default PickupTrucksView
