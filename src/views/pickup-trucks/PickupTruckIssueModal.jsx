import React from 'react';
import {PickupTruckService} from '../../services/PickupTruckService';
import IssueModalSection from '../../components/sections/IssueModalSection';

function PickupTruckIssueModal({pickupId, pickupNumber, onClose}) {
    return (
        <IssueModalSection
            itemId={pickupId}
            itemNumber={pickupNumber}
            itemType="Pickup Truck"
            onClose={onClose}
            service={PickupTruckService}
        />
    );
}

export default PickupTruckIssueModal;

