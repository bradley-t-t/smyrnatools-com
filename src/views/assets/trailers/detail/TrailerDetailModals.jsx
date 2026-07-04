import React from 'react'

import PlantDropdownModal from '../../../../app/components/common/PlantDropdownModal'
import CommentModalSection from '../../../../app/components/sections/CommentModalSection'
import HistoryViewSection from '../../../../app/components/sections/HistoryViewSection'
import IssueModalSection from '../../../../app/components/sections/IssueModalSection'
import { TrailerService } from '../../../../services/TrailerService'
import TractorSelectModal from '../TractorSelectModal'

/**
 * Renders the stacked modal layer for the trailer detail view (comments,
 * issues, plant picker, tractor picker, history).
 */
export default function TrailerDetailModals({
    trailer,
    trailerId,
    showComments,
    onCloseComments,
    showIssues,
    onCloseIssues,
    showPlantModal,
    onClosePlantModal,
    filteredPlants,
    onSelectPlant,
    showTractorModal,
    onCloseTractorModal,
    onSelectTractor,
    assignedTractor,
    assignedPlant,
    trailers,
    canEditTrailer,
    tractorModalTractors,
    onRefreshTractorModal,
    showHistory,
    onCloseHistory
}) {
    return (
        <>
            {showComments && (
                <CommentModalSection
                    itemId={trailer.id}
                    itemNumber={trailer?.trailerNumber}
                    itemType="Trailer"
                    onClose={onCloseComments}
                    service={TrailerService}
                />
            )}
            {showIssues && (
                <IssueModalSection
                    itemId={trailer.id}
                    itemNumber={trailer?.trailerNumber}
                    itemType="Trailer"
                    onClose={onCloseIssues}
                    service={TrailerService}
                />
            )}
            {showPlantModal && (
                <PlantDropdownModal
                    isOpen={showPlantModal}
                    onClose={onClosePlantModal}
                    plants={filteredPlants}
                    onSelect={onSelectPlant}
                    searchPlaceholder="Search plants..."
                />
            )}
            {showTractorModal && (
                <TractorSelectModal
                    isOpen={showTractorModal}
                    onClose={onCloseTractorModal}
                    onSelect={onSelectTractor}
                    currentValue={assignedTractor}
                    trailers={trailers}
                    assignedPlant={assignedPlant}
                    readOnly={!canEditTrailer}
                    tractors={tractorModalTractors}
                    onRefresh={onRefreshTractorModal}
                    trailerId={trailerId}
                />
            )}
            {showHistory && <HistoryViewSection item={trailer} onClose={onCloseHistory} type="trailer" />}
        </>
    )
}
