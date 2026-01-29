import React from 'react'
import HistoryViewSection from '../../components/sections/HistoryViewSection'

function TrailerHistoryView({ trailer, onClose }) {
    return <HistoryViewSection item={trailer} type="trailer" onClose={onClose} />
}

export default TrailerHistoryView
