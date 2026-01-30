import React from 'react'

import HistoryViewSection from '../../components/sections/HistoryViewSection'

function MixerHistoryView({ mixer, onClose }) {
    return <HistoryViewSection item={mixer} type="mixer" onClose={onClose} />
}

export default MixerHistoryView
