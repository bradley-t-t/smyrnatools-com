import React from 'react'
/**
 * Fixed bottom-right toast notifying the user that a newer version is available.
 * @param {Object} props
 * @param {() => void} props.onDismiss
 */
function VersionUpdateBanner({ onDismiss }) {
    return (
        <div className="fixed bottom-5 right-5 z-[9999] w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-black flex items-center gap-2">
                <i className="fas fa-rotate text-white text-sm" />
                <span className="text-white text-sm font-semibold">Update Available</span>
            </div>
            <div className="px-4 py-3">
                <p className="text-sm text-slate-600 mb-3">
                    A newer version of this page is available. Refresh to get the latest updates.
                </p>
                <div className="flex items-center justify-end gap-2">
                    <button
                        className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        onClick={onDismiss}
                    >
                        Ignore
                    </button>
                    <button
                        className="px-3 py-1.5 text-xs font-medium bg-black text-white rounded-lg hover:opacity-90 transition-opacity"
                        onClick={() => window.location.reload()}
                    >
                        Refresh
                    </button>
                </div>
            </div>
        </div>
    )
}
export default VersionUpdateBanner
