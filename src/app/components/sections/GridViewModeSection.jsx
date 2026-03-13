import React from 'react'

import { useIsMobile } from '../../hooks/useIsMobile'
/**
 * Grid-based view mode rendering asset cards with staggered fade-in animation.
 * Resolves operator, plant, and tractor references for each item.
 * @param {Object} props
 * @param {Array} props.filteredItems - Items to render as cards.
 * @param {React.ComponentType} props.cardComponent - Card component to render for each item.
 * @param {string} props.itemPropName - Prop name for passing the item to the card.
 * @param {Function} [props.getCardProps] - Returns additional props for each card.
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
        <div className="block m-0 mb-6 max-h-[calc(100vh-250px)] max-w-[100vw] overflow-auto overflow-x-hidden overscroll-none p-0 w-full bg-transparent">
            <div
                className={`grid ${isMobile ? 'gap-3 p-3' : 'gap-4 p-4'} ${gridClassName || ''}`}
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
