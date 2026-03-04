import React from 'react'

import HistoryViewSection from '../../app/components/sections/HistoryViewSection'

/** Thin wrapper connecting the shared HistoryViewSection to tractor-type history. */
function TractorHistoryView({ tractor, onClose }) {
    return <HistoryViewSection item={tractor} type="tractor" onClose={onClose} />
}

export default TractorHistoryView
