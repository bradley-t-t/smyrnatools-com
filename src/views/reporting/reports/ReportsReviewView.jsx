import React, { useEffect, useRef, useState } from 'react'

import { OPERATOR_EXCLUSION_REASONS } from '../../../app/constants/reportConstants'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { useReviewData } from '../../../app/hooks/useReviewData'
import { exportGeneralManagerReport } from '../../../utils/ExportUtility'
import { DistrictManagerReviewPlugin } from './types/WeeklyDistrictManagerReport'
import { EfficiencyReviewPlugin } from './types/WeeklyEfficiencyReport'
import { GeneralManagerReviewPlugin } from './types/WeeklyGeneralManagerReport'
import { PlantManagerReviewPlugin } from './types/WeeklyPlantManagerReport'
import { QualityControlManagerReviewPlugin } from './types/WeeklyQualityControlManagerReport'
import { ReadyMixInstructorReviewPlugin } from './types/WeeklyReadyMixInstructorReport'
import { SafetyManagerReviewPlugin } from './types/WeeklySafetyManagerReport'
/** Maps report type keys to their review-mode plugin components. */
const PLUGINS = {
    district_manager: DistrictManagerReviewPlugin,
    general_manager: GeneralManagerReviewPlugin,
    plant_manager: PlantManagerReviewPlugin,
    plant_production: EfficiencyReviewPlugin,
    quality_control_manager: QualityControlManagerReviewPlugin,
    ready_mix_instructor: ReadyMixInstructorReviewPlugin,
    safety_environmental_rep: SafetyManagerReviewPlugin,
    safety_manager: SafetyManagerReviewPlugin
}
const PLUGIN_ONLY_REPORTS = [
    'plant_production',
    'general_manager',
    'aggregate_production',
    'district_manager',
    'quality_control_manager',
    'ready_mix_instructor'
]
const getFieldIcon = (fieldName) => {
    const iconMap = { total_hours: 'fa-clock', yardage: 'fa-box' }
    return iconMap[fieldName] || 'fa-recycle'
}
const getFieldLabel = (field) => (field.name === 'yardage' ? 'Total Yardage' : field.label)
const StatusBadge = ({ isSubmitted }) => (
    <div
        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold ${isSubmitted ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}
    >
        <i className={`fas ${isSubmitted ? 'fa-check-circle' : 'fa-save'}`}></i>
        <span className="hidden xs:inline">{isSubmitted ? 'Submitted' : 'Draft'}</span>
    </div>
)
const MetaItem = ({ icon, label, value }) => (
    <div className="flex items-center gap-2 text-sm text-slate-500">
        <i className={`${icon} text-slate-400`}></i>
        <span>{label}</span>
        <strong className="text-slate-800 font-semibold">{value}</strong>
    </div>
)
/**
 * Read-only review view for a submitted report. Delegates rendering to a
 * type-specific review plugin (e.g. GeneralManagerReviewPlugin). Shows
 * computed metrics (YPH, grades), submission metadata, and a "Manager Edit"
 * button for users with that permission. Supports GM report export.
 */
function ReportsReviewView({ report, initialData, onBack, user, completedByUser, onManagerEdit }) {
    const containerRef = useRef(null)
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        let scrollable = el.parentElement
        while (scrollable && scrollable.scrollHeight <= scrollable.clientHeight) {
            scrollable = scrollable.parentElement
        }
        const target = scrollable || window
        target.scrollTo(0, 0)
    }, [])
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
        operatorExclusionReason,
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
    const { preferences } = usePreferences()
    const accentColor = preferences.accentColor || '#1e3a5f'
    const [summaryTab, setSummaryTab] = useState('summary')
    const [exporting, setExporting] = useState(false)
    const [exportError, setExportError] = useState('')
    const PluginComponent = PLUGINS[report.name]
    const handleExport = async () => {
        if (exporting || loadingPlants || !plants.length) return
        setExportError('')
        setExporting(true)
        try {
            await exportGeneralManagerReport({ form, plants, weekIso })
        } catch (e) {
            setExportError(e?.message || 'Export failed')
        }
        setExporting(false)
    }
    const renderPlantManagerForm = () => (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="mb-5">
                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800 m-0">
                    <i className="fas fa-clipboard-list"></i>Weekly Production Data
                </h3>
                <p className="text-sm text-slate-500 mt-2 mb-0">Key production metrics for this reporting period</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {report.fields
                    .filter((f) => f.name !== 'issues' && f.type !== 'table')
                    .map((field) => (
                        <div key={field.name} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <i
                                    className={`fas ${getFieldIcon(field.name)} text-sm`}
                                    style={{ color: accentColor }}
                                ></i>
                                <label className="text-sm font-semibold text-gray-700">{getFieldLabel(field)}</label>
                            </div>
                            <input
                                type={field.type}
                                value={form[field.name] ?? ''}
                                readOnly
                                disabled
                                className="px-4 py-3 border border-gray-200 rounded-lg text-sm text-slate-800 bg-slate-50 w-full"
                            />
                        </div>
                    ))}
            </div>
        </div>
    )
    const renderDefaultForm = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-white rounded-xl border border-gray-200 p-6 mb-6">
            {report.fields
                .filter(
                    (f) =>
                        !(
                            ['safety_manager', 'safety_environmental_rep'].includes(report.name) && f.name === 'issues'
                        ) && f.type !== 'table'
                )
                .map((field) => (
                    <div key={field.name} className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-gray-700">
                            {getFieldLabel(field)}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {field.type === 'textarea' ||
                        (typeof form[field.name] === 'string' && form[field.name].length > 80) ? (
                            <textarea
                                value={form[field.name] ?? ''}
                                readOnly
                                disabled
                                className="px-4 py-3 border border-gray-200 rounded-lg text-sm text-slate-800 bg-slate-50 min-h-[100px] resize-y"
                            />
                        ) : field.type === 'select' ? (
                            <select
                                value={form[field.name] ?? ''}
                                readOnly
                                disabled
                                className="px-4 py-3 border border-gray-200 rounded-lg text-sm text-slate-800 bg-slate-50"
                            >
                                <option value="">Select...</option>
                                {field.options?.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type={field.type}
                                value={form[field.name] ?? ''}
                                readOnly
                                disabled
                                className="px-4 py-3 border border-gray-200 rounded-lg text-sm text-slate-800 bg-slate-50"
                            />
                        )}
                    </div>
                ))}
        </div>
    )
    const renderAggregateTable = () => (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-gray-200">
                            Material
                        </th>
                        <th className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-gray-200">
                            Amount
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {report.fields.map((field) => (
                        <tr key={field.name} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm text-slate-800 border-b border-slate-100">
                                {field.label}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-800 border-b border-slate-100">
                                {form[field.name] || 0}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
    return (
        <div ref={containerRef} className="bg-slate-50 min-h-screen w-full">
            <div className="flex items-center justify-between flex-wrap gap-4 bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <button
                        className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                        onClick={onBack}
                        type="button"
                    >
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 m-0">{report.title || 'Report Review'}</h1>
                        <p className="text-sm text-slate-500 m-0">{weekVerbose}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge isSubmitted={isSubmitted} />
                    {report.name === 'general_manager' && (
                        <button
                            type="button"
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors"
                            disabled={exporting}
                            onClick={handleExport}
                        >
                            <i className="fas fa-file-export"></i>
                            {exporting ? 'Exporting...' : 'Export'}
                        </button>
                    )}
                    {hasManagerEditPermission && showManagerEditButton && (
                        <button
                            type="button"
                            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-semibold transition-colors"
                            style={{ background: accentColor }}
                            onClick={() => onManagerEdit(report, initialData)}
                        >
                            <i className="fas fa-edit"></i>Manager Edit
                        </button>
                    )}
                </div>
            </div>
            <div className="flex items-center flex-wrap gap-6 bg-slate-50 border-b border-gray-200 px-6 py-4">
                {reportDateVerbose && (
                    <MetaItem icon="far fa-calendar-check" label="Report Date:" value={reportDateVerbose} />
                )}
                {ownerName && <MetaItem icon="fas fa-user" label="Submitted By:" value={ownerName} />}
                {assignedPlant && <MetaItem icon="fas fa-industry" label="Plant:" value={assignedPlant} />}
                {submittedAt && (
                    <MetaItem icon="far fa-clock" label={isSubmitted ? 'Submitted:' : 'Saved:'} value={submittedAt} />
                )}
            </div>
            {exportError && (
                <div className="bg-red-100 text-red-600 p-4 mx-6 my-4 rounded-lg text-sm font-medium">
                    {exportError}
                </div>
            )}
            {isPlantShutdown && (
                <div className="mx-6 mt-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/50 p-5">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-200/60 flex items-center justify-center flex-shrink-0">
                            <i
                                className={`fas ${operatorExclusionReason === 'operators_sent_to_other_location' ? 'fa-truck-loading' : 'fa-industry'} text-amber-700 text-sm`}
                            ></i>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                                All Operators Excluded
                            </span>
                            <span className="text-sm font-semibold text-amber-900">
                                {OPERATOR_EXCLUSION_REASONS[operatorExclusionReason] || 'Plant was shut down'}
                            </span>
                            {reportDateVerbose && (
                                <span className="text-xs text-amber-700/70">{reportDateVerbose}</span>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {!isPlantShutdown && (
                <div className="p-6 max-w-5xl mx-auto">
                    {report.name === 'plant_manager' && renderPlantManagerForm()}
                    {!PLUGIN_ONLY_REPORTS.includes(report.name) &&
                        report.name !== 'plant_manager' &&
                        renderDefaultForm()}
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
                    {report.name === 'aggregate_production' && renderAggregateTable()}
                </div>
            )}
        </div>
    )
}
export default ReportsReviewView
