import React from 'react'

import HistoryViewSection from '../../app/components/sections/HistoryViewSection'
/** Thin wrapper connecting the shared HistoryViewSection to trailer-type history. */
function TrailerHistoryView({ trailer, onClose }) {
    return <HistoryViewSection item={trailer} type="trailer" onClose={onClose} />
}
export default TrailerHistoryView
