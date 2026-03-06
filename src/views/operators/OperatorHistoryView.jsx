import React from 'react'

import HistoryViewSection from '../../app/components/sections/HistoryViewSection'
/** Thin wrapper connecting the shared HistoryViewSection to operator-type history. */
function OperatorHistoryView({ operator, onClose }) {
    if (!operator || !operator.employeeId) return null
    return <HistoryViewSection item={operator} type="operator" onClose={onClose} />
}
export default OperatorHistoryView
