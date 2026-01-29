import React from 'react'
import { EquipmentService } from '../../services/EquipmentService'
import IssueModalSection from '../../components/sections/IssueModalSection'

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
