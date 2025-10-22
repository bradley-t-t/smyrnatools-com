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
        <div className={gridClassName || 'grid'}>
            {filteredItems && Array.isArray(filteredItems) && filteredItems.map((item, index) => {
                const operator = operators.find(op => op.employeeId === item.assignedOperator);
                const plant = plants.find(p => p.code === item.assignedPlant);
                const tractor = tractors.find(t => t.id === item.assignedTractor);
                const Card = cardComponent;
                const number = item.identifyingNumber || item.truckNumber || item.trailerNumber || '';
                const shouldAnimate = index < 30;
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
                
                if (shouldAnimate) {
                    return (
                        <div 
                            key={item.id}
                            className="grid-card-animated"
                            style={{animationDelay: `${index * 80}ms`}}
                        >
                            {cardElement}
                        </div>
                    );
                } else {
                    return cardElement;
                }
            })}
        </div>
    );
}

export default GridViewModeSection;
