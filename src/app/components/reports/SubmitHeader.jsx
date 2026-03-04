import React from 'react'

/** Amber banner shown when a manager is editing another user's report. */
const ManagerEditBanner = ({ editingUserName }) => (
    <div className="flex items-center gap-2 px-4 py-3 bg-amber-100 text-amber-800 font-medium text-sm">
        <i className="fas fa-edit" />
        {`Editing ${editingUserName}'s Report`}
    </div>
)

const StatusBadge = ({ isCompleted, readOnly }) => {
    const completed = isCompleted
    const bgClass = completed ? 'bg-emerald-100' : 'bg-amber-100'
    const textClass = completed ? 'text-emerald-700' : 'text-amber-700'
    const icon = completed ? 'fa-check-circle' : 'fa-edit'
    const label = readOnly ? 'View Only' : completed ? 'Submitted' : 'Editing'

    return (
        <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold ${bgClass} ${textClass}`}
        >
            <i className={`fas ${icon}`} />
            {label}
        </div>
    )
}

const ExportButton = ({ exporting, loadingPlants, onClick }) => {
    const label = loadingPlants ? 'Loading...' : exporting ? 'Exporting...' : 'Export'
    return (
        <button
            type="button"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50"
            onClick={onClick}
            disabled={exporting || loadingPlants}
        >
            <i className="fas fa-file-export" />
            <span className="hidden sm:inline">{label}</span>
        </button>
    )
}

const MetaItem = ({ icon, label, value }) => (
    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
        <i className={`${icon} text-slate-400`} />
        <span className="hidden sm:inline">{label}</span>
        <strong className="text-slate-800 font-semibold">{value}</strong>
    </div>
)

/** Sticky header bar for the report submission form with title, status, export, and metadata. */
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
            <div className="flex items-center justify-between gap-3 flex-wrap px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <button
                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                        onClick={onBack}
                        type="button"
                    >
                        <i className="fas fa-arrow-left text-sm" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800 m-0 truncate max-w-[200px] sm:max-w-none">
                            {report.title ?? ''}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 m-0">{weekVerbose}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <StatusBadge isCompleted={isCompleted} readOnly={readOnly} />
                    {isGM && <ExportButton exporting={exporting} loadingPlants={loadingPlants} onClick={onExport} />}
                </div>
            </div>
            <div className="flex items-center flex-wrap gap-3 sm:gap-6 px-4 sm:px-6 py-3 bg-slate-50 border-b border-gray-200">
                {reportDateVerbose && (
                    <MetaItem icon="far fa-calendar-check" label="Report Date:" value={reportDateVerbose} />
                )}
                {report.name === 'plant_production' && formPlant && (
                    <MetaItem icon="fas fa-industry" label="Plant:" value={formPlant} />
                )}
            </div>
            {exportError && (
                <div className="mx-4 sm:mx-6 mt-3 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{exportError}</div>
            )}
        </div>
    )
}

export default SubmitHeader
