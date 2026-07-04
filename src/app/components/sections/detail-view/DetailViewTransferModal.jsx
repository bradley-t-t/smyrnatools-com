/* eslint-disable react/forbid-dom-props */
import React from 'react'
import ReactDOM from 'react-dom'

const SELECT_BG =
    "var(--bg-secondary) url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\") right 10px center/18px no-repeat"

export default function DetailViewTransferModal({
    accent,
    assetType,
    closeTransfer,
    currentRegion,
    doTransfer,
    plants,
    regions,
    setTargetPlant,
    setTargetRegion,
    show,
    targetPlant,
    targetRegion,
    transferErr,
    transferring
}) {
    if (!show) return null
    return ReactDOM.createPortal(
        <div
            onClick={(e) => e.target === e.currentTarget && closeTransfer()}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-5"
        >
            <div className="flex w-full max-w-[400px] max-h-[85vh] flex-col overflow-hidden rounded bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ background: accent }}>
                    <span className="flex items-center gap-2.5 text-[15px] font-semibold text-white">
                        <i className="fas fa-exchange-alt"></i> Transfer Region
                    </span>
                    <button type="button"
                        onClick={closeTransfer}
                        aria-label="Close"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border-none bg-white/15 text-sm text-white cursor-pointer hover:bg-white/25 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                    <div className="mb-4 rounded-[10px] bg-slate-100 p-3.5">
                        <div className="mb-0.5 text-[11px] font-semibold text-slate-500">CURRENT REGION</div>
                        <div className="text-sm font-semibold text-slate-800">{currentRegion || 'Unknown'}</div>
                    </div>
                    <div className="mb-3.5">
                        <label
                            htmlFor="transfer-target-region"
                            className="mb-1.5 block text-xs font-semibold text-slate-500"
                        >
                            Target Region
                        </label>
                        <select
                            id="transfer-target-region"
                            aria-label="Target region"
                            className="dv-input w-full cursor-pointer appearance-none rounded-[10px] border-[1.5px] border-border-light text-sm text-slate-800 outline-none transition-colors duration-150 hover:border-border-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            value={targetRegion}
                            onChange={(e) => setTargetRegion(e.target.value)}
                            disabled={transferring}
                            style={{
                                background: SELECT_BG,
                                padding: '10px 40px 10px 14px'
                            }}
                        >
                            <option value="">Select region...</option>
                            {regions
                                .filter(
                                    (r) =>
                                        r.regionCode !== currentRegion &&
                                        r.type !== 'Office' &&
                                        !(assetType === 'mixer' && r.type === 'Aggregate')
                                )
                                .map((r) => (
                                    <option key={r.regionCode} value={r.regionCode}>
                                        {r.regionName}
                                    </option>
                                ))}
                        </select>
                    </div>
                    {targetRegion && (
                        <div className="mb-3.5">
                            <label
                                htmlFor="transfer-target-plant"
                                className="mb-1.5 block text-xs font-semibold text-slate-500"
                            >
                                Target Plant
                            </label>
                            <select
                                id="transfer-target-plant"
                                aria-label="Target plant"
                                className="dv-input w-full cursor-pointer appearance-none rounded-[10px] border-[1.5px] border-border-light text-sm text-slate-800 outline-none transition-colors duration-150 hover:border-border-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                value={targetPlant}
                                onChange={(e) => setTargetPlant(e.target.value)}
                                disabled={transferring || !plants.length}
                                style={{
                                    background: SELECT_BG,
                                    padding: '10px 40px 10px 14px'
                                }}
                            >
                                <option value="">Select plant...</option>
                                {plants.map((p) => (
                                    <option key={p.plantCode || p.plant_code} value={p.plantCode || p.plant_code}>
                                        {p.plantName || p.plant_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {transferErr && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-text-primary">
                            <i className="fas fa-exclamation-circle"></i>
                            {transferErr}
                        </div>
                    )}
                </div>
                <div className="flex gap-2.5 border-t border-border-light bg-slate-50 px-5 py-3.5">
                    <button type="button"
                        className="dv-btn flex-1 rounded-[10px] border-none bg-slate-100 px-4 py-2.5 text-[13px] font-semibold text-slate-600 cursor-pointer"
                        onClick={closeTransfer}
                        disabled={transferring}
                    >
                        Cancel
                    </button>
                    <button type="button"
                        className="dv-btn flex-1 flex items-center justify-center gap-2 rounded-[10px] border-none px-4 py-2.5 text-[13px] font-semibold text-white"
                        onClick={doTransfer}
                        disabled={transferring || !targetRegion || !targetPlant}
                        style={{
                            background: accent,
                            cursor: transferring || !targetRegion || !targetPlant ? 'not-allowed' : 'pointer',
                            opacity: transferring || !targetRegion || !targetPlant ? 0.5 : 1
                        }}
                    >
                        {transferring ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i> Transferring...
                            </>
                        ) : (
                            'Confirm'
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
