import React from 'react'

import HistoryViewSection from '../../app/components/sections/HistoryViewSection'

function PickupTruckHistoryView({ pickupTruck, onClose }) {
    return <HistoryViewSection item={pickupTruck} type="pickup-truck" onClose={onClose} />
}

export default PickupTruckHistoryView
