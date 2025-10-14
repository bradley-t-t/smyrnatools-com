import React from 'react';
import HistoryViewSection from '../../sections/HistoryViewSection';

function TrailerHistoryView({trailer, onClose}) {
    return <HistoryViewSection item={trailer} type="trailer" onClose={onClose}/>;
}

export default TrailerHistoryView;
