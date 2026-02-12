import React from 'react'

import { reportsSubmitViewStyles } from '../styles/ReportsSubmitViewStyles'

const styles = reportsSubmitViewStyles

function SubmitHeader({
    report,
    weekVerbose,
    reportDateVerbose,
    isCompleted,
    readOnly,
    isGM,
    exporting,
    loadingPlants,
    exportError,
    managerEditUser,
    editingUserName,
    formPlant,
    onBack,
    onExport
}) {
    return (
        <div>
            {managerEditUser && (
                <div
                    style={{
                        alignItems: 'center',
                        background: '#fef3c7',
                        color: '#92400e',
                        display: 'flex',
                        fontWeight: 500,
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem'
                    }}
                >
                    <i className="fas fa-edit"></i>
                    {`Editing ${editingUserName}'s Report`}
                </div>
            )}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <button style={styles.backBtn} onClick={onBack} type="button">
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div style={styles.titleSection}>
                        <h1 style={styles.title}>{report.title || ''}</h1>
                        <p style={styles.subtitle}>{weekVerbose}</p>
                    </div>
                </div>
                <div style={styles.headerRight}>
                    <div
                        style={{
                            alignItems: 'center',
                            background: isCompleted ? '#d1fae5' : '#fef3c7',
                            borderRadius: '8px',
                            color: isCompleted ? '#059669' : '#d97706',
                            display: 'flex',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            gap: '0.5rem',
                            padding: '0.5rem 1rem'
                        }}
                    >
                        <i className={`fas ${isCompleted ? 'fa-check-circle' : 'fa-edit'}`}></i>
                        {readOnly ? 'View Only' : isCompleted ? 'Submitted' : 'Editing'}
                    </div>
                    {isGM && (
                        <button
                            type="button"
                            style={styles.exportBtn}
                            onClick={onExport}
                            disabled={exporting || loadingPlants}
                        >
                            <i className="fas fa-file-export"></i>
                            {loadingPlants ? 'Loading...' : exporting ? 'Exporting...' : 'Export'}
                        </button>
                    )}
                </div>
            </div>
            <div style={styles.metaBar}>
                {reportDateVerbose && (
                    <div style={styles.metaItem}>
                        <i className="far fa-calendar-check" style={styles.metaIcon}></i>
                        <span>Report Date:</span>
                        <strong style={styles.metaStrong}>{reportDateVerbose}</strong>
                    </div>
                )}
                {report.name === 'plant_production' && formPlant && (
                    <div style={styles.metaItem}>
                        <i className="fas fa-industry" style={styles.metaIcon}></i>
                        <span>Plant:</span>
                        <strong style={styles.metaStrong}>{formPlant}</strong>
                    </div>
                )}
            </div>
            {exportError && <div style={styles.error}>{exportError}</div>}
        </div>
    )
}

export default SubmitHeader
