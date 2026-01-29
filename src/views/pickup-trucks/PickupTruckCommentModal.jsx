import React from 'react'
import CommentModalSection from '../../components/sections/CommentModalSection'
import { PickupTruckService } from '../../services/PickupTruckService'

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
