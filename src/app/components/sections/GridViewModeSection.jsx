import React from 'react'

/**
 * Grid-based view mode rendering asset cards with staggered slide-in animation.
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

    const styles = {
        cardWrapper: {
            animationFillMode: 'both'
        },
        container: {
            background: 'transparent',
            display: 'block',
            margin: 0,
            marginBottom: '24px',
            maxHeight: 'calc(100vh - 250px)',
            maxWidth: '100vw',
            overflow: 'auto',
            overflowX: 'hidden',
            overscrollBehavior: 'none',
            padding: 0,
            width: '100%'
        },
        grid: {
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            padding: '1rem'
        }
    }

    return (
        <div style={styles.container}>
            <style>{`
                @keyframes slideInFromLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                .grid-card-animated {
                    animation: slideInFromLeft 0.4s ease-out;
                    animation-fill-mode: both;
                }
            `}</style>
            <div style={styles.grid} className={gridClassName}>
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
                                className="grid-card-animated"
                                style={{ ...styles.cardWrapper, animationDelay: `${index * delay}ms` }}
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
