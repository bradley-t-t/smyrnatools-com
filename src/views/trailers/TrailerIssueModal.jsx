import React from 'react'

import IssueModalSection from '../../app/components/sections/IssueModalSection'
import TrailerService from '../../services/TrailerService'

function TrailerIssueModal({ trailerId, trailerNumber, onClose }) {
    return (
        <IssueModalSection
            itemId={trailerId}
            itemNumber={trailerNumber}
            itemType="Trailer"
            onClose={onClose}
            service={TrailerService}
        />
    )
}

export default TrailerIssueModal
