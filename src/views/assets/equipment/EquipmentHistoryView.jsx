import React from 'react'

import HistoryViewSection from '../../../app/components/sections/HistoryViewSection'
/** Thin wrapper connecting the shared HistoryViewSection to equipment-type history. */
function EquipmentHistoryView({ equipment, onClose }) {
    return <HistoryViewSection item={equipment} type="equipment" onClose={onClose} />
}
export default EquipmentHistoryView
