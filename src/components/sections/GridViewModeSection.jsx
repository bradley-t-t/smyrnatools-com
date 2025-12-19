import React from 'react';
import './styles/GridViewMode.css';

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
                                 onShowIssueModal
                             }) {
    operators = operators || [];
    plants = plants || [];
    tractors = tractors || [];
    return (
        <div className="grid-container">
            <div className={gridClassName || 'grid'}>
                {filteredItems && Array.isArray(filteredItems) && filteredItems.map((item, index) => {
                    const operator = operators.find(op => op.employeeId === item.assignedOperator);
                    const plant = plants.find(p => p.code === item.assignedPlant);
                    const tractor = tractors.find(t => t.id === item.assignedTractor);
                    const Card = cardComponent;
                    const number = item.identifyingNumber || item.truckNumber || item.trailerNumber || '';
                    const baseDelay = 80;
                    const minDelay = baseDelay / 2;
                    const delayDecrement = Math.max(0, (baseDelay - minDelay) / filteredItems.length);
                    const delay = Math.max(minDelay, baseDelay - (delayDecrement * index));
                    const cardElement = (
                        <Card
                            key={item.id}
                            {...{[itemPropName]: item}}
                            operatorName={operator?.name}
                            tractorName={tractor?.truckNumber}
                            plantName={plant?.name || item.assignedPlant}
                            showOperatorWarning={false}
                            showTractorWarning={false}
                            onSelect={handleSelectItem}
                            onShowCommentModal={() => onShowCommentModal(item.id, number)}
                            onShowIssueModal={() => onShowIssueModal(item.id, number)}
                        />
                    );

                    return (
                        <div
                            key={item.id}
                            className="grid-card-animated"
                            style={{animationDelay: `${index * delay}ms`}}
                        >
                            {cardElement}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default GridViewModeSection;
