import React from 'react';
import CommentModalSection from '../../components/sections/CommentModalSection';
import {TrailerService} from '../../services/TrailerService';

function TrailerCommentModal({trailerId, trailerNumber, onClose}) {
    return (
        <CommentModalSection
            itemId={trailerId}
            itemNumber={trailerNumber}
            itemType="Trailer"
            onClose={onClose}
            service={TrailerService}
        />
    );
}

export default TrailerCommentModal;