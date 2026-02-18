import React from 'react'

import CommentModalSection from '../../app/components/sections/CommentModalSection'
import { TractorService } from '../../services/TractorService'

function TractorCommentModal({ tractorId, tractorNumber, onClose }) {
    return (
        <CommentModalSection
            itemId={tractorId}
            itemNumber={tractorNumber}
            itemType="Tractor"
            onClose={onClose}
            service={TractorService}
        />
    )
}

export default TractorCommentModal
