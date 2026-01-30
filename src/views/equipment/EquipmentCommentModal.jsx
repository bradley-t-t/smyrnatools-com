import React from 'react'

import CommentModalSection from '../../components/sections/CommentModalSection'
import { EquipmentService } from '../../services/EquipmentService'

function EquipmentCommentModal({ equipmentId, equipmentNumber, onClose }) {
    return (
        <CommentModalSection
            itemId={equipmentId}
            itemNumber={equipmentNumber}
            itemType="Equipment"
            onClose={onClose}
            service={EquipmentService}
        />
    )
}

export default EquipmentCommentModal
