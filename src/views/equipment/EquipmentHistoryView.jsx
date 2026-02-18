import React from 'react'

import HistoryViewSection from '../../app/components/sections/HistoryViewSection'

function EquipmentHistoryView({ equipment, onClose }) {
    return <HistoryViewSection item={equipment} type="equipment" onClose={onClose} />
}

export default EquipmentHistoryView
