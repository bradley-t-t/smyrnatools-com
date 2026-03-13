import React from 'react'

import CommentModalSection from '../../../app/components/sections/CommentModalSection'
import { PickupTruckService } from '../../../services/PickupTruckService'
/** Thin wrapper connecting the shared CommentModalSection to PickupTruckService. */
function PickupTruckCommentModal({ pickupId, pickupNumber, onClose }) {
    return (
        <CommentModalSection
            itemId={pickupId}
            itemNumber={pickupNumber}
            itemType="Pickup Truck"
            onClose={onClose}
            service={PickupTruckService}
        />
    )
}
export default PickupTruckCommentModal
