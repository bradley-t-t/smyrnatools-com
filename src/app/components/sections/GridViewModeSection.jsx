/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { useIsMobile } from '../../hooks/useIsMobile'

/**
 * Grid view mode for assets — flat container, no shadow, padding tuned to
 * match the Plan-tab rhythm. Cards arrange in a responsive auto-fill grid.
 */
function GridViewModeSection({
    filteredItems,
    operators,
    plants,
    tractors,
    handleSelectItem,
    gridClassName,
    cardComponent,
    itemPropName,
    onShowCommentModal,
    onShowIssueModal,
    getCardProps
}) {
    operators = operators || []
    plants = plants || []
    tractors = tractors || []
    const isMobile = useIsMobile()
    return (
        <div className="block max-h-[calc(100vh-250px)] max-w-[100vw] overflow-auto overflow-x-hidden overscroll-none w-full">
            <div
                className={`grid ${isMobile ? 'gap-2.5 px-3 py-3' : 'gap-3 px-4 lg:px-6 py-4'} ${gridClassName || ''}`}
                style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '260px' : '300px'}, 1fr))`
                }}
            >
                {filteredItems &&
                    Array.isArray(filteredItems) &&
                    filteredItems.map((item, index) => {
                        const operator = operators.find((op) => op.employeeId === item.assignedOperator)
                        const plant = plants.find((p) => p.code === item.assignedPlant)
                        const tractor = tractors.find((t) => t.id === item.assignedTractor)
                        const Card = cardComponent
                        const number = item.identifyingNumber || item.truckNumber || item.trailerNumber || ''
                        const baseDelay = 80
                        const minDelay = baseDelay / 2
                        const delayDecrement = Math.max(0, (baseDelay - minDelay) / filteredItems.length)
                        const delay = Math.max(minDelay, baseDelay - delayDecrement * index)
                        const additionalProps = getCardProps ? getCardProps(item) : {}
                        const cardElement = (
                            <Card
                                key={item.id}
                                {...{ [itemPropName]: item }}
                                operatorName={operator?.name}
                                tractorName={tractor?.truckNumber}
                                plantName={plant?.name || item.assignedPlant}
                                showOperatorWarning={false}
                                showTractorWarning={false}
                                onSelect={handleSelectItem}
                                onShowCommentModal={() => onShowCommentModal && onShowCommentModal(item.id, number)}
                                onShowIssueModal={() => onShowIssueModal && onShowIssueModal(item.id, number)}
                                {...additionalProps}
                            />
                        )
                        return (
                            <div
                                key={item.id}
                                className="animate-fade-in-up"
                                style={{ animationDelay: `${index * delay}ms` }}
                            >
                                {cardElement}
                            </div>
                        )
                    })}
            </div>
        </div>
    )
}

export default GridViewModeSection
