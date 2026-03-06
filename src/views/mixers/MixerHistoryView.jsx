import React from 'react'

import HistoryViewSection from '../../app/components/sections/HistoryViewSection'
/** Thin wrapper connecting the shared HistoryViewSection to mixer-type history. */
function MixerHistoryView({ mixer, onClose }) {
    return <HistoryViewSection item={mixer} type="mixer" onClose={onClose} />
}
export default MixerHistoryView
