import React from 'react'

import { reportsSubmitViewStyles as styles } from '../styles/ReportsSubmitViewStyles'

const ManagerEditBanner = ({ editingUserName }) => (
    <div style={styles.managerEditBanner}>
        <i className="fas fa-edit" />
        {`Editing ${editingUserName}'s Report`}
    </div>
)

const StatusBadge = ({ isCompleted, readOnly }) => {
    const completed = isCompleted
    const bgColor = completed ? '#d1fae5' : '#fef3c7'
    const textColor = completed ? '#059669' : '#d97706'
    const icon = completed ? 'fa-check-circle' : 'fa-edit'
    const label = readOnly ? 'View Only' : completed ? 'Submitted' : 'Editing'

    return (
        <div style={{ ...styles.statusBadge, background: bgColor, color: textColor }}>
            <i className={`fas ${icon}`} />
            {label}
        </div>
    )
}

const ExportButton = ({ exporting, loadingPlants, onClick }) => {
    const label = loadingPlants ? 'Loading...' : exporting ? 'Exporting...' : 'Export'
    return (
        <button type="button" style={styles.exportBtn} onClick={onClick} disabled={exporting || loadingPlants}>
            <i className="fas fa-file-export" />
            {label}
        </button>
    )
}

const MetaItem = ({ icon, label, value }) => (
    <div style={styles.metaItem}>
        <i className={icon} style={styles.metaIcon} />
        <span>{label}</span>
        <strong style={styles.metaStrong}>{value}</strong>
    </div>
)

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
            {managerEditUser && <ManagerEditBanner editingUserName={editingUserName} />}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <button style={styles.backBtn} onClick={onBack} type="button">
                        <i className="fas fa-arrow-left" />
                    </button>
                    <div style={styles.titleSection}>
                        <h1 style={styles.title}>{report.title ?? ''}</h1>
                        <p style={styles.subtitle}>{weekVerbose}</p>
                    </div>
                </div>
                <div style={styles.headerRight}>
                    <StatusBadge isCompleted={isCompleted} readOnly={readOnly} />
                    {isGM && <ExportButton exporting={exporting} loadingPlants={loadingPlants} onClick={onExport} />}
                </div>
            </div>
            <div style={styles.metaBar}>
                {reportDateVerbose && (
                    <MetaItem icon="far fa-calendar-check" label="Report Date:" value={reportDateVerbose} />
                )}
                {report.name === 'plant_production' && formPlant && (
                    <MetaItem icon="fas fa-industry" label="Plant:" value={formPlant} />
                )}
            </div>
            {exportError && <div style={styles.error}>{exportError}</div>}
        </div>
    )
}

export default SubmitHeader
