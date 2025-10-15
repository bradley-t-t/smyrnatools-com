import React from 'react';
import TrailerService from '../../../services/TrailerService';
import IssueModalSection from '../../sections/IssueModalSection';

function TrailerIssueModal({trailerId, trailerNumber, onClose}) {
    return (
        <IssueModalSection
            itemId={trailerId}
            itemNumber={trailerNumber}
            itemType="Trailer"
            onClose={onClose}
            service={TrailerService}
        />
    );
}

export default TrailerIssueModal;
