import React from 'react'

import CommentModalSection from '../../app/components/sections/CommentModalSection'
import { MixerService } from '../../services/MixerService'

/** Thin wrapper connecting the shared CommentModalSection to MixerService. */
function MixerCommentModal({ mixerId, mixerNumber, onClose }) {
    return (
        <CommentModalSection
            itemId={mixerId}
            itemNumber={mixerNumber}
            itemType="Mixer"
            onClose={onClose}
            service={MixerService}
        />
    )
}

export default MixerCommentModal
