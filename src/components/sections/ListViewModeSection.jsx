import React from 'react';
import './styles/ListViewMode.css';

function ListViewModeSection({
                                 filteredItems,
                                 operators,
                                 plants,
                                 handleSelectItem,
                                 headerLabels,
                                 colWidths,
                                 containerClassName,
                                 tableClassName,
                                 renderRow,
                                 onShowCommentModal,
                                 onShowIssueModal
                             }) {
    if (renderRow) {
        return (
            <div className={containerClassName || 'list-table-container'}>
                <table className={tableClassName || 'list-table'}>
                    <tbody>
                    {filteredItems && Array.isArray(filteredItems) && filteredItems.map((item, index) => {
                        const row = renderRow(item, handleSelectItem, onShowCommentModal, onShowIssueModal);
                        const shouldAnimate = index < 20;
                        return React.cloneElement(row, {
                            key: row.key || item.id,
                            style: {
                                ...row.props.style,
                                animationDelay: shouldAnimate ? `${index * 80}ms` : '0ms'
                            },
                            className: shouldAnimate ? `${row.props.className || ''} list-row-animated`.trim() : row.props.className
                        });
                    })}
                    </tbody>
                </table>
            </div>
        );
    }
    return (
        <div className={containerClassName || 'list-table-container'}>
            <table className={tableClassName || 'list-table'}>
                <tbody>
                {filteredItems && Array.isArray(filteredItems) && filteredItems.map((item, index) => {
                    const operator = operators.find(op => op.employeeId === item.assignedOperator);
                    const plant = plants.find(p => p.code === item.assignedPlant);
                    const number = item.identifyingNumber || item.truckNumber || item.trailerNumber || '';
                    const shouldAnimate = index < 30;
                    return (
                        <tr 
                            key={item.id} 
                            onClick={() => handleSelectItem(item.id)} 
                            style={{
                                cursor: 'pointer',
                                animationDelay: shouldAnimate ? `${index * 80}ms` : '0ms'
                            }}
                            className={shouldAnimate ? 'list-row-animated' : ''}
                        >
                            <td>{plant?.name || item.assignedPlant}</td>
                            <td>{item.truckNumber || item.trailerNumber}</td>
                            <td>{item.status}</td>
                            <td>{operator?.name || 'Not Assigned'}</td>
                            <td>{item.cleanlinessRating ? '★'.repeat(item.cleanlinessRating) : 'Not Rated'}</td>
                            <td>{item.vinNumber || item.vin}</td>
                            <td>{item.isVerified() ? 'Yes' : 'No'}</td>
                            <td className="list-actions-cell">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShowCommentModal(item.id, number);
                                    }} 
                                    title="Comments"
                                    className="list-action-btn"
                                >
                                    <i className="fas fa-comments"></i>
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShowIssueModal(item.id, number);
                                    }} 
                                    title="Issues"
                                    className="list-action-btn"
                                >
                                    <i className="fas fa-tools"></i>
                                </button>
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
    );
}

export default ListViewModeSection;
