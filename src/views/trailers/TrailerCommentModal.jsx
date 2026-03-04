import React from 'react'

import CommentModalSection from '../../app/components/sections/CommentModalSection'
import { TrailerService } from '../../services/TrailerService'

/** Thin wrapper connecting the shared CommentModalSection to TrailerService. */
function TrailerCommentModal({ trailerId, trailerNumber, onClose }) {
    return (
        <CommentModalSection
            itemId={trailerId}
            itemNumber={trailerNumber}
            itemType="Trailer"
            onClose={onClose}
            service={TrailerService}
        />
    )
}

export default TrailerCommentModal
