import React, { useState } from 'react'

import { useReviewData } from '../../app/hooks/useReviewData'
import { ReportService } from '../../services/ReportService'
import { exportGeneralManagerReport } from '../../utils/ExportUtility'
import { reportsReviewViewStyles } from './styles/ReportsReviewViewStyles'
import { DistrictManagerReviewPlugin } from './types/WeeklyDistrictManagerReport'
import { EfficiencyReviewPlugin } from './types/WeeklyEfficiencyReport'
import { GeneralManagerReviewPlugin } from './types/WeeklyGeneralManagerReport'
import { PlantManagerReviewPlugin } from './types/WeeklyPlantManagerReport'
import { ReadyMixInstructorReviewPlugin } from './types/WeeklyReadyMixInstructorReport'
import { SafetyManagerReviewPlugin } from './types/WeeklySafetyManagerReport'

const plugins = {
    district_manager: DistrictManagerReviewPlugin,
    general_manager: GeneralManagerReviewPlugin,
    plant_manager: PlantManagerReviewPlugin,
    plant_production: EfficiencyReviewPlugin,
    ready_mix_instructor: ReadyMixInstructorReviewPlugin,
    safety_manager: SafetyManagerReviewPlugin
}

function ReportsReviewView({ report, initialData, onBack, user, completedByUser, onManagerEdit }) {
    const styles = reportsReviewViewStyles

    const {
        assignedPlant,
        form,
        hasManagerEditPermission,
        isPlantShutdown,
        isSubmitted,
        loadingPlants,
        lost,
        lostGrade,
        lostLabel,
        maintenanceItems,
        operatorOptions,
        ownerName,
        plants,
        reportDateVerbose,
        showManagerEditButton,
        submittedAt,
        weekIso,
        weekVerbose,
        yph,
        yphGrade,
        yphLabel
    } = useReviewData({ completedByUser, initialData, report, user })

    const [summaryTab, setSummaryTab] = useState('summary')
    const [exporting, setExporting] = useState(false)
    const [exportError, setExportError] = useState('')

    ReportService.getYphColor(yphGrade.adjusted)
    ReportService.getYphColor(lostGrade)

    const PluginComponent = plugins[report.name]
    const reportTitle = report.title || 'Report Review'
    const statusText = isSubmitted ? 'Submitted' : 'Saved (Draft)'

    async function handleExport() {
        if (exporting || loadingPlants || plants.length === 0) return
        setExportError('')
        setExporting(true)
        try {
            await exportGeneralManagerReport({
                form,
                plants,
                weekIso
            })
        } catch (e) {
            setExportError(e?.message || 'Export failed')
        }
        setExporting(false)
    }

    return (
        <div style={styles.container}>
            <style>{`
                .rpts-sbmt-error { background: #fee2e2; color: #dc2626; padding: 1rem; border-radius: 8px; margin: 1rem 1.5rem; font-size: 0.875rem; font-weight: 500; }
                .rpts-plant-shutdown-notice { background: #fef3c7; color: #92400e; padding: 1rem 1.5rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; font-weight: 500; }
                .rpts-form-body-wide { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
                .rpts-form-fields-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.25rem; background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 1.5rem; margin-bottom: 1.5rem; }
                .rpts-form-field-wide { display: flex; flex-direction: column; gap: 0.5rem; }
                .rpts-form-field-wide label { font-size: 0.875rem; font-weight: 600; color: #374151; }
                .rpts-form-field-wide input, .rpts-form-field-wide select, .rpts-form-field-wide textarea { padding: 0.75rem 1rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem; color: #1e293b; background: #f8fafc; }
                .rpts-modal-required { color: #ef4444; margin-left: 0.25rem; }
                .pm-metrics-section { background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 1.5rem; margin-bottom: 1.5rem; }
                .pm-metrics-header { margin-bottom: 1.25rem; }
                .pm-metrics-title { display: flex; align-items: center; gap: 0.75rem; font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0; }
                .pm-metrics-subtitle { font-size: 0.875rem; color: #64748b; margin: 0.5rem 0 0 0; }
                .pm-production-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; }
                .pm-production-field { display: flex; flex-direction: column; gap: 0.5rem; }
                .pm-production-field-header { display: flex; align-items: center; gap: 0.5rem; }
                .pm-production-field-icon { color: #1e3a5f; font-size: 0.875rem; }
                .pm-production-field label { font-size: 0.875rem; font-weight: 600; color: #374151; }
                .pm-production-input { padding: 0.75rem 1rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem; color: #1e293b; background: #f8fafc; width: 100%; box-sizing: border-box; }
                .rpt-table-wrapper { background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; margin-bottom: 1.5rem; }
                .rpt-table { width: 100%; border-collapse: collapse; }
                .rpt-table th { background: #f8fafc; padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; }
                .rpt-table td { padding: 0.75rem 1rem; font-size: 0.9375rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
                .rpt-table tr:last-child td { border-bottom: none; }
                .rpt-card { background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 1.5rem; margin-bottom: 1.5rem; }
                .rpt-card-accent { border-left: 4px solid #1e3a5f; }
                .rpt-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem; }
                .rpt-card-title { font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0; }
                .rpt-form-row { display: flex; flex-direction: column; gap: 1rem; }
                .rpt-flex-col { flex-direction: column; }
                .rpt-plant-summary-table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
                .rpt-plant-summary-table th { background: #f8fafc; padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; }
                .rpt-plant-summary-table td { padding: 0.75rem 1rem; font-size: 0.9375rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; vertical-align: middle; background: white; }
                .rpt-plant-summary-table tr:last-child td { border-bottom: none; }
                .rpt-plant-summary-table tr:hover td { background: #f8fafc; }
                .rpt-agg-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; margin-top: 0; }
                .rpt-agg-table th { background: #f8fafc; padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; }
                .rpt-agg-table td { padding: 0.75rem 1rem; font-size: 0.9375rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
                .rpt-agg-table tr:last-child td { border-bottom: none; }
                .rpt-agg-table tr:hover td { background: #f8fafc; }
                .rpt-input { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.875rem; color: #1e293b; background: white; box-sizing: border-box; }
                .rpt-input:disabled { background: #f8fafc; color: #64748b; }
                .rpt-variance-cell { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.8125rem; font-weight: 600; padding: 0.25rem 0.5rem; border-radius: 4px; }
                .rpt-variance-positive { color: #059669; background: #d1fae5; }
                .rpt-variance-negative { color: #dc2626; background: #fee2e2; }
                .rpt-variance-neutral { color: #64748b; background: #f1f5f9; }
                .rpt-variance-symbol { font-size: 0.6875rem; }
                .rpt-empty { text-align: center; padding: 2rem; color: #64748b; font-size: 0.9375rem; background: #f8fafc; border-radius: 8px; }
            `}</style>
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <button style={styles.backBtn} onClick={onBack} type="button">
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div style={styles.titleSection}>
                        <h1 style={styles.title}>{reportTitle}</h1>
                        <p style={styles.subtitle}>{weekVerbose}</p>
                    </div>
                </div>
                <div style={styles.headerRight}>
                    <div
                        style={{
                            alignItems: 'center',
                            background: isSubmitted ? '#d1fae5' : '#fef3c7',
                            borderRadius: '8px',
                            color: isSubmitted ? '#059669' : '#d97706',
                            display: 'flex',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            gap: '0.5rem',
                            padding: '0.5rem 1rem'
                        }}
                    >
                        <i className={`fas ${isSubmitted ? 'fa-check-circle' : 'fa-save'}`}></i>
                        {statusText}
                    </div>
                    {report.name === 'general_manager' && (
                        <button type="button" style={styles.exportBtn} disabled={exporting} onClick={handleExport}>
                            <i className="fas fa-file-export"></i>
                            {exporting ? 'Exporting...' : 'Export'}
                        </button>
                    )}
                    {hasManagerEditPermission && showManagerEditButton && (
                        <button type="button" style={styles.editBtn} onClick={() => onManagerEdit(report, initialData)}>
                            <i className="fas fa-edit"></i>
                            Manager Edit
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
                {ownerName && (
                    <div style={styles.metaItem}>
                        <i className="fas fa-user" style={styles.metaIcon}></i>
                        <span>Submitted By:</span>
                        <strong style={styles.metaStrong}>{ownerName}</strong>
                    </div>
                )}
                {assignedPlant && (
                    <div style={styles.metaItem}>
                        <i className="fas fa-industry" style={styles.metaIcon}></i>
                        <span>Plant:</span>
                        <strong style={styles.metaStrong}>{assignedPlant}</strong>
                    </div>
                )}
                {submittedAt && (
                    <div style={styles.metaItem}>
                        <i className="far fa-clock" style={styles.metaIcon}></i>
                        <span>{isSubmitted ? 'Submitted:' : 'Saved:'}</span>
                        <strong style={styles.metaStrong}>{submittedAt}</strong>
                    </div>
                )}
            </div>
            {exportError && <div className="rpts-sbmt-error">{exportError}</div>}
            {isPlantShutdown && (
                <div className="rpts-plant-shutdown-notice">
                    <i className="fas fa-info-circle"></i>
                    <span>Plant was shut down on {reportDateVerbose || 'the reported date'}</span>
                </div>
            )}
            <div className="rpts-form-body-wide">
                <>
                    {report.name === 'plant_manager' ? (
                        <div className="pm-metrics-section pm-production-data-section">
                            <div className="pm-metrics-header">
                                <h3 className="pm-metrics-title">
                                    <i className="fas fa-clipboard-list"></i>
                                    Weekly Production Data
                                </h3>
                                <p className="pm-metrics-subtitle">Key production metrics for this reporting period</p>
                            </div>
                            <div className="pm-production-grid">
                                {report.fields.map((field) =>
                                    field.name === 'issues' || field.type === 'table' ? null : (
                                        <div key={field.name} className="pm-production-field">
                                            <div className="pm-production-field-header">
                                                <i
                                                    className={`fas ${field.name === 'yardage' ? 'fa-box' : field.name === 'total_hours' ? 'fa-clock' : field.name === 'total_yards_lost' ? 'fa-exclamation-triangle' : 'fa-recycle'} pm-production-field-icon`}
                                                ></i>
                                                <label>
                                                    {field.name === 'yardage' ? 'Total Yardage' : field.label}
                                                </label>
                                            </div>
                                            <input
                                                type={field.type}
                                                value={form[field.name] ?? ''}
                                                readOnly
                                                disabled
                                                className="pm-production-input"
                                            />
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    ) : report.name === 'plant_production' ||
                      report.name === 'general_manager' ||
                      report.name === 'aggregate_production' ||
                      report.name === 'district_manager' ||
                      report.name === 'ready_mix_instructor' ? null : (
                        <div className="rpts-form-fields-grid">
                            {report.fields.map((field) =>
                                (report.name === 'safety_manager' && field.name === 'issues') ||
                                field.type === 'table' ? null : (
                                    <div key={field.name} className="rpts-form-field-wide">
                                        <label>
                                            {field.name === 'yardage' ? 'Total Yardage' : field.label}
                                            {field.required && <span className="rpts-modal-required">*</span>}
                                        </label>
                                        {field.type === 'textarea' ||
                                        (typeof form[field.name] === 'string' && form[field.name].length > 80) ? (
                                            <textarea value={form[field.name] ?? ''} readOnly disabled />
                                        ) : field.type === 'select' ? (
                                            <select value={form[field.name] ?? ''} readOnly disabled>
                                                <option value="">Select...</option>
                                                {field.options?.map((opt) => (
                                                    <option key={opt} value={opt}>
                                                        {opt}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input type={field.type} value={form[field.name] ?? ''} readOnly disabled />
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    )}
                    {PluginComponent && (
                        <PluginComponent
                            form={form}
                            yph={yph}
                            yphGrade={yphGrade}
                            yphLabel={yphLabel}
                            lost={lost}
                            lostGrade={lostGrade}
                            lostLabel={lostLabel}
                            summaryTab={summaryTab}
                            setSummaryTab={setSummaryTab}
                            maintenanceItems={maintenanceItems}
                            operatorOptions={operatorOptions}
                            plants={plants}
                            weekIso={weekIso}
                            user={completedByUser || user}
                            assignedPlant={assignedPlant}
                            reportUserId={initialData?.user_id}
                        />
                    )}
                    {report.name === 'aggregate_production' && (
                        <div className="rpt-table-wrapper">
                            <table className="rpt-table">
                                <thead>
                                    <tr>
                                        <th>Material</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.fields.map((field) => (
                                        <tr key={field.name}>
                                            <td>{field.label}</td>
                                            <td>{form[field.name] || 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            </div>
        </div>
    )
}

export default ReportsReviewView
