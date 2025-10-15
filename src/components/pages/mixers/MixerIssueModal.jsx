import React from 'react';
import {MixerService} from '../../../services/MixerService';
import IssueModalSection from '../../sections/IssueModalSection';

function MixerIssueModal({mixerId, mixerNumber, onClose}) {
    return (
        <IssueModalSection
            itemId={mixerId}
            itemNumber={mixerNumber}
            itemType="Mixer"
            onClose={onClose}
            service={MixerService}
        />
    );
}

export default MixerIssueModal;
