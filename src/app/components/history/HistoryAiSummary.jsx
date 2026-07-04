/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { ASSET_TYPES_WITH_OPERATORS } from '../../constants/historyConstants'

/** Single stat cell rendered inside the analysis stats grid. */
function StatCell({ label, value }) {
    return (
        <div className="px-3 py-2.5 flex flex-col gap-0.5 border-r border-border-light">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">{label}</span>
            <span className="text-[18px] font-semibold leading-tight font-mono tabular-nums text-text-primary">
                {value}
            </span>
        </div>
    )
}

/**
 * Right-hand analysis panel for the timeline tab — handles loading, error, empty,
 * and ready states for the AI summary, plus the typed text and aggregate stats grid.
 */
export default function HistoryAiSummary({
    aiDisplayText,
    aiSummary,
    aiSummaryError,
    aiSummaryLoading,
    handleRegenerateAISummary,
    history,
    issues,
    isTypingComplete,
    operatorData,
    statusData,
    type
}) {
    if (aiSummaryLoading) {
        return (
            <div className="flex flex-col items-center justify-center gap-1.5 py-10 px-4 text-text-tertiary">
                <i className="fas fa-robot text-[20px] animate-pulse text-text-secondary" />
                <p className="m-0 text-[12.5px] font-semibold text-text-primary">Analyzing history…</p>
                <p className="m-0 text-[11px]">This may take a moment.</p>
            </div>
        )
    }
    if (aiSummaryError) {
        return (
            <div className="flex flex-col items-center justify-center gap-1.5 py-10 px-4 text-text-tertiary">
                <i className="fas fa-exclamation-triangle text-[20px] text-text-primary" />
                <p className="m-0 text-[12.5px] font-semibold text-text-primary">Failed to generate analysis.</p>
                <button type="button"
                    onClick={handleRegenerateAISummary}
                    className="mt-1 inline-flex items-center gap-1.5 rounded text-[10.5px] font-bold uppercase tracking-wider text-white px-2.5 py-1.5 cursor-pointer border-none bg-[var(--accent, #1e3a5f)] active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none"
                >
                    <i className="fas fa-sync-alt text-[10px]" />
                    Try Again
                </button>
            </div>
        )
    }
    if (!aiSummary) {
        return (
            <div className="flex flex-col items-center justify-center gap-1.5 py-10 px-4 text-text-tertiary">
                <i className="fas fa-robot text-[20px]" />
                <p className="m-0 text-[12px]">No analysis available.</p>
            </div>
        )
    }
    const showOperatorStats = ASSET_TYPES_WITH_OPERATORS.includes(type)
    return (
        <div className="flex flex-col gap-3">
            <div className="rounded p-3 bg-bg-primary border border-border-light">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded flex items-center justify-center bg-bg-tertiary text-text-secondary">
                        <i className="fas fa-robot text-[12px]" />
                    </div>
                    <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                            Analysis · {history.length} entries
                        </div>
                    </div>
                </div>
                <div className="text-[12px] leading-relaxed whitespace-pre-wrap text-text-secondary">
                    {aiDisplayText}
                    {!isTypingComplete && (
                        <span className="inline-block w-0.5 h-3 ml-0.5 animate-pulse align-text-bottom bg-[var(--text-tertiary)]" />
                    )}
                </div>
            </div>
            {isTypingComplete && (
                <div
                    className="grid rounded overflow-hidden bg-bg-primary border border-border-light"
                    style={{
                        gridTemplateColumns: showOperatorStats
                            ? 'repeat(4, minmax(0, 1fr))'
                            : 'repeat(3, minmax(0, 1fr))'
                    }}
                >
                    <StatCell value={history.length} label="Total Changes" />
                    <StatCell value={statusData.length} label="Status Changes" />
                    {showOperatorStats && <StatCell value={operatorData.length} label="Operator Changes" />}
                    <StatCell value={issues.length} label="Total Issues" />
                </div>
            )}
            {isTypingComplete && (
                <button type="button"
                    onClick={handleRegenerateAISummary}
                    className="w-full py-1.5 rounded text-[10.5px] font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none bg-bg-secondary border border-border-light text-text-primary active:scale-[0.97]"
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                >
                    <i className="fas fa-sync-alt text-[10px]" />
                    Regenerate Analysis
                </button>
            )}
        </div>
    )
}
