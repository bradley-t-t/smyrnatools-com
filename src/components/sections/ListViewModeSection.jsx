import React from 'react'

function ListViewModeSection({
                                 filteredItems,
                                 operators,
                                 plants,
                                 handleSelectItem,
                                 renderRow,
                                 onShowCommentModal,
                                 onShowIssueModal,
                                 onShowHistoryModal,
                                 onVerify
                             }) {
    const styles = {
        wrapper: {
            marginLeft: '24px',
            marginRight: '24px',
            marginBottom: '24px',
            marginTop: '30px',
            boxSizing: 'border-box'
        },
        container: {
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '0',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            boxSizing: 'border-box'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse'
        },
        row: {
            backgroundColor: 'white',
            borderBottom: '1px solid #e2e8f0',
            cursor: 'pointer'
        },
        cell: {
            padding: '20px 24px',
            fontSize: '15px',
            color: '#1e293b',
            fontWeight: 500,
            textAlign: 'left',
            verticalAlign: 'middle'
        },
        cellSecondary: {
            padding: '20px 24px',
            fontSize: '14px',
            color: '#475569',
            textAlign: 'left',
            verticalAlign: 'middle'
        },
        cellHighlight: {
            padding: '20px 24px',
            fontSize: '16px',
            color: '#1e3a5f',
            fontWeight: 700,
            textAlign: 'left',
            verticalAlign: 'middle'
        },
        statusBadge: (status) => {
            let bg = '#f1f5f9'
            let textColor = '#475569'
            if (status === 'Active') { bg = '#dcfce7'; textColor = '#166534' }
            else if (status === 'Spare') { bg = '#dbeafe'; textColor = '#1e40af' }
            else if (status === 'In Shop') { bg = '#fef3c7'; textColor = '#92400e' }
            else if (status === 'Retired') { bg = '#f1f5f9'; textColor = '#64748b' }
            return {
                display: 'inline-block',
                padding: '8px 16px',
                borderRadius: '24px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: bg,
                color: textColor
            }
        },
        verifyBtn: (isVerified) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            border: 'none',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isVerified ? 'default' : 'pointer',
            backgroundColor: isVerified ? '#dcfce7' : '#fef3c7',
            color: isVerified ? '#166534' : '#92400e'
        }),
        verifyNA: {
            display: 'inline-block',
            padding: '10px 18px',
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600
        },
        actionsContainer: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        },
        actionBtn: {
            width: '42px',
            height: '42px',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            backgroundColor: 'white',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px'
        },
        starsContainer: {
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
        },
        starFilled: {
            color: '#f59e0b',
            fontSize: '16px'
        },
        starEmpty: {
            color: '#e2e8f0',
            fontSize: '16px'
        },
        notRated: {
            color: '#94a3b8',
            fontSize: '14px',
            fontStyle: 'italic'
        },
        vinText: {
            fontFamily: 'ui-monospace, monospace',
            fontSize: '13px',
            color: '#64748b',
            backgroundColor: '#f8fafc',
            padding: '6px 10px',
            borderRadius: '6px'
        },
        emptyState: {
            padding: '80px 40px',
            textAlign: 'center',
            backgroundColor: 'white'
        },
        emptyIcon: {
            fontSize: '56px',
            color: '#cbd5e1',
            marginBottom: '20px'
        },
        emptyText: {
            margin: 0,
            fontSize: '18px',
            color: '#64748b',
            fontWeight: 500
        }
    }

    if (!filteredItems || filteredItems.length === 0) {
        return (
            <div style={styles.container}>
                <div style={styles.emptyState}>
                    <i className="fas fa-inbox" style={styles.emptyIcon}></i>
                    <p style={styles.emptyText}>No items to display</p>
                </div>
            </div>
        )
    }

    if (renderRow) {
        return (
            <div style={styles.container}>
                <table style={styles.table}>
                    <tbody>
                    {filteredItems.map((item, index) => {
                        const row = renderRow(item, handleSelectItem, onShowCommentModal, onShowIssueModal, onVerify, onShowHistoryModal)
                        const alternatingBg = index % 2 === 0 ? 'white' : '#f8fafc'
                        return React.cloneElement(row, {
                            key: row.key || item.id,
                            style: {
                                ...styles.row,
                                backgroundColor: alternatingBg,
                                ...row.props.style
                            }
                        })
                    })}
                    </tbody>
                </table>
            </div>
        )
    }

    const renderStars = (rating) => {
        if (!rating) return <span style={styles.notRated}>Not Rated</span>
        const stars = []
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <i 
                    key={i} 
                    className="fas fa-star" 
                    style={i <= rating ? styles.starFilled : styles.starEmpty}
                ></i>
            )
        }
        return <div style={styles.starsContainer}>{stars}</div>
    }

    return (
        <div style={styles.wrapper}>
            <div style={styles.container}>
                <table style={styles.table}>
                    <tbody>
                    {filteredItems.map((item, index) => {
                        const operator = operators?.find(op => op.employeeId === item.assignedOperator)
                        const plant = plants?.find(p => p.code === item.assignedPlant)
                        const number = item.identifyingNumber || item.truckNumber || item.trailerNumber || ''
                        const isVerified = typeof item.isVerified === 'function' ? item.isVerified() : item.verified
                        const alternatingBg = index % 2 === 0 ? 'white' : '#f8fafc'
                        
                        return (
                            <tr
                                key={item.id}
                                style={{...styles.row, backgroundColor: alternatingBg}}
                            onClick={() => handleSelectItem(item.id)}
                            onMouseEnter={(e) => {
                                const cells = e.currentTarget.querySelectorAll('td')
                                cells.forEach(cell => cell.style.backgroundColor = '#e0f2fe')
                            }}
                            onMouseLeave={(e) => {
                                const cells = e.currentTarget.querySelectorAll('td')
                                cells.forEach(cell => cell.style.backgroundColor = '')
                            }}
                        >
                            <td style={styles.cell}>
                                {plant?.name || item.assignedPlant || '-'}
                            </td>
                            <td style={styles.cellHighlight}>
                                {item.truckNumber || item.trailerNumber || '-'}
                            </td>
                            <td style={styles.cellSecondary}>
                                <span style={styles.statusBadge(item.status)}>{item.status}</span>
                            </td>
                            <td style={styles.cellSecondary}>
                                {operator?.name || <span style={{color: '#94a3b8', fontStyle: 'italic'}}>Not Assigned</span>}
                            </td>
                            <td style={styles.cellSecondary}>
                                {renderStars(item.cleanlinessRating)}
                            </td>
                            <td style={styles.cellSecondary}>
                                {item.vinNumber || item.vin ? (
                                    <span style={styles.vinText}>{item.vinNumber || item.vin}</span>
                                ) : (
                                    <span style={{color: '#94a3b8'}}>-</span>
                                )}
                            </td>
                            <td style={styles.cellSecondary}>
                                {item.status === 'Retired' ? (
                                    <span style={styles.verifyNA}>N/A</span>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (!isVerified && onVerify) {
                                                onVerify(item.id, number)
                                            }
                                        }}
                                        title={isVerified ? 'Verified' : 'Click to verify'}
                                        style={styles.verifyBtn(isVerified)}
                                        disabled={isVerified}
                                    >
                                        <i className={`fas ${isVerified ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{color: isVerified ? '#166534' : '#92400e'}}></i>
                                        <span style={{color: isVerified ? '#166534' : '#92400e'}}>{isVerified ? 'Verified' : 'Verify'}</span>
                                    </button>
                                )}
                            </td>
                            <td style={styles.cellSecondary}>
                                <div style={styles.actionsContainer}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onShowCommentModal && onShowCommentModal(item.id, number)
                                        }}
                                        title="Comments"
                                        style={styles.actionBtn}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#1e3a5f'
                                            e.currentTarget.style.color = 'white'
                                            e.currentTarget.style.borderColor = '#1e3a5f'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'white'
                                            e.currentTarget.style.color = '#64748b'
                                            e.currentTarget.style.borderColor = '#e2e8f0'
                                        }}
                                    >
                                        <i className="fas fa-comment"></i>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onShowIssueModal && onShowIssueModal(item.id, number)
                                        }}
                                        title="Issues"
                                        style={styles.actionBtn}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#1e3a5f'
                                            e.currentTarget.style.color = 'white'
                                            e.currentTarget.style.borderColor = '#1e3a5f'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'white'
                                            e.currentTarget.style.color = '#64748b'
                                            e.currentTarget.style.borderColor = '#e2e8f0'
                                        }}
                                    >
                                        <i className="fas fa-wrench"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )
                })}
                </tbody>
                </table>
            </div>
        </div>
    )
}

export default ListViewModeSection