import React from 'react'

import IssueModalSection from '../../components/sections/IssueModalSection'
import { MixerService } from '../../services/MixerService'

function MixerIssueModal({ mixerId, mixerNumber, onClose }) {
    return (
        <IssueModalSection
            itemId={mixerId}
            itemNumber={mixerNumber}
            itemType="Mixer"
            onClose={onClose}
            service={MixerService}
        />
    )
}

export default MixerIssueModal
