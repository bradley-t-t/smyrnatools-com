import React from 'react'

import IssueModalSection from '../../app/components/sections/IssueModalSection'
import { EquipmentService } from '../../services/EquipmentService'

function EquipmentIssueModal({ equipmentId, equipmentNumber, onClose }) {
    return (
        <IssueModalSection
            itemId={equipmentId}
            itemNumber={equipmentNumber}
            itemType="Equipment"
            onClose={onClose}
            service={EquipmentService}
        />
    )
}

export default EquipmentIssueModal
