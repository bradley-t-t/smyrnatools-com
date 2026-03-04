import React from 'react'

import IssueModalSection from '../../app/components/sections/IssueModalSection'
import { TractorService } from '../../services/TractorService'

/** Thin wrapper connecting the shared IssueModalSection to TractorService. */
function TractorIssueModal({ tractorId, tractorNumber, onClose }) {
    return (
        <IssueModalSection
            itemId={tractorId}
            itemNumber={tractorNumber}
            itemType="Tractor"
            onClose={onClose}
            service={TractorService}
        />
    )
}

export default TractorIssueModal
