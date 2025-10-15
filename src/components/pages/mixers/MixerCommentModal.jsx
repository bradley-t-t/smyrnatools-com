import React from 'react';
import CommentModalSection from '../../sections/CommentModalSection';
import {MixerService} from '../../../services/MixerService';

function MixerCommentModal({mixerId, mixerNumber, onClose}) {
    return (
        <CommentModalSection
            itemId={mixerId}
            itemNumber={mixerNumber}
            itemType="Mixer"
            onClose={onClose}
            service={MixerService}
        />
    );
}

export default MixerCommentModal;