import React from 'react'

import HistoryViewSection from '../../app/components/sections/HistoryViewSection'

function TractorHistoryView({ tractor, onClose }) {
    return <HistoryViewSection item={tractor} type="tractor" onClose={onClose} />
}

export default TractorHistoryView
