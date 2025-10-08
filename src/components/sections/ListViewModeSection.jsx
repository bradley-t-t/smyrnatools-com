import React from 'react';
import './styles/ListViewMode.css';

function ListViewModeSection({filteredItems, operators, plants, handleSelectItem, headerLabels, colWidths, containerClassName, tableClassName, renderRow, onShowCommentModal, onShowIssueModal}) {
    if (renderRow) {
        return (
            <div className={containerClassName || 'list-table-container'}>
                <table className={tableClassName || 'list-table'}>
                    <tbody>
                        {filteredItems && Array.isArray(filteredItems) && filteredItems.map(item => renderRow(item, handleSelectItem, onShowCommentModal, onShowIssueModal))}
                    </tbody>
                </table>
            </div>
        );
    }
    return (
        <div className={containerClassName || 'list-table-container'}>
            <table className={tableClassName || 'list-table'}>
                <tbody>
                    {filteredItems && Array.isArray(filteredItems) && filteredItems.map(item => {
                        const operator = operators.find(op => op.employeeId === item.assignedOperator);
                        const plant = plants.find(p => p.code === item.assignedPlant);
                        const number = item.identifyingNumber || item.truckNumber || item.trailerNumber || '';
                        return (
                            <tr key={item.id} onClick={() => handleSelectItem(item.id)} style={{cursor: 'pointer'}}>
                                <td>{plant?.name || item.assignedPlant}</td>
                                <td>{item.truckNumber || item.trailerNumber}</td>
                                <td>{item.status}</td>
                                <td>{operator?.name || 'Not Assigned'}</td>
                                <td>{item.cleanlinessRating ? '★'.repeat(item.cleanlinessRating) : 'Not Rated'}</td>
                                <td>{item.vinNumber || item.vin}</td>
                                <td>{item.isVerified() ? 'Yes' : 'No'}</td>
                                <td>
                                    <button onClick={(e) => { e.stopPropagation(); onShowCommentModal(item.id, number); }} title="Comments" style={{background: 'none', border: 'none', color: 'var(--text)', padding: '4px', cursor: 'pointer'}}>
                                        <i className="fas fa-comments" style={{fontSize: '1.2rem'}}></i>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); onShowIssueModal(item.id, number); }} title="Issues" style={{background: 'none', border: 'none', color: 'var(--text)', padding: '4px', cursor: 'pointer'}}>
                                        <i className="fas fa-tools" style={{fontSize: '1.2rem'}}></i>
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
