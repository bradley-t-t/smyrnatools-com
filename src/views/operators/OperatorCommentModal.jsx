import React from 'react'

import CommentModalSection from '../../app/components/sections/CommentModalSection'
import { OperatorService } from '../../services/OperatorService'

function OperatorCommentModal({ operatorId, operatorName, onClose }) {
    return (
        <CommentModalSection
            itemId={operatorId}
            itemNumber={operatorName}
            itemType="Operator"
            onClose={onClose}
            service={OperatorService}
        />
    )
}

export default OperatorCommentModal
