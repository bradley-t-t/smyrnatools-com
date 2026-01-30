import React from 'react'

import IssueModalSection from '../../components/sections/IssueModalSection'
import { TractorService } from '../../services/TractorService'

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
