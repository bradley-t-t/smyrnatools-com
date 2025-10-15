import React from 'react';
import {EquipmentService} from '../../../services/EquipmentService';
import ErrorBoundary from '../../common/ErrorBoundary';
import IssueModalSection from '../../sections/IssueModalSection';

function EquipmentIssueModal({equipmentId, equipmentNumber, onClose}) {
    return (
        <IssueModalSection
            itemId={equipmentId}
            itemNumber={equipmentNumber}
            itemType="Equipment"
            onClose={onClose}
            service={EquipmentService}
        />
    );
}

function EquipmentIssueModalWithErrorBoundary(props) {
    return (
        <ErrorBoundary>
            <EquipmentIssueModal {...props} />
        </ErrorBoundary>
    );
}

export default EquipmentIssueModalWithErrorBoundary;
