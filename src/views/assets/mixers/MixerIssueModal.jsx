import React from 'react'

import IssueModalSection from '../../../app/components/sections/IssueModalSection'
import { MixerService } from '../../../services/MixerService'
/** Thin wrapper connecting the shared IssueModalSection to MixerService. */
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
