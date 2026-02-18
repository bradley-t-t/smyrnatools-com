import React from 'react'

import IssueModalSection from '../../app/components/sections/IssueModalSection'
import { PickupTruckService } from '../../services/PickupTruckService'

function PickupTruckIssueModal({ pickupId, pickupNumber, onClose }) {
    return (
        <IssueModalSection
            itemId={pickupId}
            itemNumber={pickupNumber}
            itemType="Pickup Truck"
            onClose={onClose}
            service={PickupTruckService}
        />
    )
}

export default PickupTruckIssueModal
