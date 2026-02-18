import React from 'react'

import HistoryViewSection from '../../app/components/sections/HistoryViewSection'

function OperatorHistoryView({ operator, onClose }) {
    if (!operator || !operator.employeeId) return null
    return <HistoryViewSection item={operator} type="operator" onClose={onClose} />
}

export default OperatorHistoryView
