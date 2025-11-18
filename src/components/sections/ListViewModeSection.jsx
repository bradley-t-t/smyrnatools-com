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
                                 onShowIssueModal,
                                 onVerify
                             }) {
    if (renderRow) {
        return (
            <div className={containerClassName || 'list-table-container'}>
                <table className={tableClassName || 'list-table'}>
                    <tbody>
                    {filteredItems && Array.isArray(filteredItems) && filteredItems.map((item, index) => {
                        const row = renderRow(item, handleSelectItem, onShowCommentModal, onShowIssueModal, onVerify);
                        const baseDelay = 80;
                        const minDelay = baseDelay / 2;
                        const delayDecrement = Math.max(0, (baseDelay - minDelay) / filteredItems.length);
                        const delay = Math.max(minDelay, baseDelay - (delayDecrement * index));
                        return React.cloneElement(row, {
                            key: row.key || item.id,
                            style: {
                                ...row.props.style,
                                animationDelay: `${index * delay}ms`
                            },
                            className: `${row.props.className || ''} list-row-animated`.trim()
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
                    const baseDelay = 80;
                    const minDelay = baseDelay / 2;
                    const delayDecrement = Math.max(0, (baseDelay - minDelay) / filteredItems.length);
                    const delay = Math.max(minDelay, baseDelay - (delayDecrement * index));
                    return (
                        <tr
                            key={item.id}
                            onClick={() => handleSelectItem(item.id)}
                            style={{
                                cursor: 'pointer',
                                animationDelay: `${index * delay}ms`
                            }}
                            className='list-row-animated'
                        >
                            <td>{plant?.name || item.assignedPlant}</td>
                            <td>{item.truckNumber || item.trailerNumber}</td>
                            <td>{item.status}</td>
                            <td>{operator?.name || 'Not Assigned'}</td>
                            <td>{item.cleanlinessRating ? '★'.repeat(item.cleanlinessRating) : 'Not Rated'}</td>
                            <td>{item.vinNumber || item.vin}</td>
                            <td>
                                {item.status === 'Retired' ? (
                                    <span className="list-verify-status list-verify-na">N/A</span>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!item.isVerified() && onVerify) {
                                                onVerify(item.id, number);
                                            }
                                        }}
                                        title={item.isVerified() ? 'Verified' : 'Click to verify'}
                                        className={`list-verify-btn ${item.isVerified() ? 'verified' : 'not-verified'}`}
                                        disabled={item.isVerified()}
                                    >
                                        <i className={`fas ${item.isVerified() ? 'fa-check' : 'fa-flag'}`}></i>
                                        <span>{item.isVerified() ? 'Verified' : 'Not Verified'}</span>
                                    </button>
                                )}
                            </td>
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
