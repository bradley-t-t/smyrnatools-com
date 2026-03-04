import React from 'react'

import HistoryViewSection from '../../app/components/sections/HistoryViewSection'

/** Thin wrapper connecting the shared HistoryViewSection to pickup-truck-type history. */
function PickupTruckHistoryView({ pickupTruck, onClose }) {
    return <HistoryViewSection item={pickupTruck} type="pickup-truck" onClose={onClose} />
}

export default PickupTruckHistoryView
