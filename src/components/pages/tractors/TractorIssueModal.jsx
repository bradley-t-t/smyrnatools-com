import React from 'react';
import {TractorService} from '../../../services/TractorService';
import IssueModalSection from '../../sections/IssueModalSection';

function TractorIssueModal({tractorId, tractorNumber, onClose}) {
    return (
        <IssueModalSection
            itemId={tractorId}
            itemNumber={tractorNumber}
            itemType="Tractor"
            onClose={onClose}
            service={TractorService}
        />
    );
}

export default TractorIssueModal;
