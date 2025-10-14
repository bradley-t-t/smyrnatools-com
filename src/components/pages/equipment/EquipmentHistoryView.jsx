import React from 'react';
import HistoryViewSection from '../../sections/HistoryViewSection';

function EquipmentHistoryView({equipment, onClose}) {
    return <HistoryViewSection item={equipment} type="equipment" onClose={onClose}/>;
}

export default EquipmentHistoryView;
