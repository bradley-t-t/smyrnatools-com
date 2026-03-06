import React from 'react'

const VARIANCE_STYLES = {
    negative: 'text-red-600 bg-red-100',
    neutral: 'text-slate-500 bg-slate-100',
    positive: 'text-emerald-600 bg-emerald-100'
}

function getVarianceInfo(varianceStr) {
    const n = parseFloat(varianceStr)
    if (!isFinite(n)) return { className: VARIANCE_STYLES.neutral, symbol: '' }
    if (n > 0) return { className: VARIANCE_STYLES.positive, symbol: '▲' }
    if (n < 0) return { className: VARIANCE_STYLES.negative, symbol: '▼' }
    return { className: VARIANCE_STYLES.neutral, symbol: '' }
}

/** Renders a colored variance indicator cell with up/down arrow and percentage value. */
export function VarianceCell({ varianceStr }) {
    if (!varianceStr) {
        return (
            <div className="inline-flex items-center gap-1 rounded px-2 py-1 text-[0.8125rem] font-semibold text-slate-500 bg-slate-100">
                —
            </div>
        )
    }

    const { className, symbol } = getVarianceInfo(varianceStr)

    return (
        <div className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[0.8125rem] font-semibold ${className}`}>
            {symbol && <span className="text-[0.6875rem]">{symbol}</span>}
            <span>{varianceStr}</span>
        </div>
    )
}

const RPT_INPUT =
    'w-full rounded-md border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 box-border disabled:bg-slate-50 disabled:text-slate-500 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10'
const RPT_TEXTAREA = `${RPT_INPUT} min-h-[60px] resize-y`
const TH_STYLE =
    'bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-gray-200'
const TD_STYLE =
    'px-4 py-3 text-[0.9375rem] text-slate-800 border-b border-slate-100 align-middle bg-white last:border-b-0'

/** Table row showing last week's value (disabled), current week's editable input, and a variance cell. */
export function ComparisonTableRow({
    label,
    lastWeekValue,
    currentValue,
    onChange,
    disabled,
    varianceStr,
    inputType = 'number',
    isTextArea = false
}) {
    return (
        <tr className="hover:[&>td]:bg-slate-50">
            <td className={TD_STYLE}>{label}</td>
            <td className={TD_STYLE}>
                {isTextArea ? (
                    <textarea value={String(lastWeekValue)} disabled className={RPT_TEXTAREA} />
                ) : (
                    <input type="text" value={String(lastWeekValue)} disabled className={RPT_INPUT} />
                )}
            </td>
            <td className={TD_STYLE}>
                {isTextArea ? (
                    <textarea
                        value={currentValue ?? ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        className={RPT_TEXTAREA}
                    />
                ) : (
                    <input
                        type={inputType}
                        value={currentValue ?? ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        className={RPT_INPUT}
                    />
                )}
            </td>
            {varianceStr !== undefined && (
                <td className={TD_STYLE}>
                    <VarianceCell varianceStr={varianceStr} />
                </td>
            )}
        </tr>
    )
}

/** Styled table wrapper for week-over-week comparison grids used by report plugins. */
export function ComparisonTable({ headers, children }) {
    return (
        <table className="w-full border-collapse mt-3 rounded-lg overflow-hidden border border-gray-200 bg-white">
            <thead>
                <tr>
                    {headers.map((h, i) => (
                        <th key={i} className={TH_STYLE}>
                            {h}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>{children}</tbody>
        </table>
    )
}

/** Styled card container used as a section wrapper in report plugins. Supports accent border and header actions. */
export function ReportCard({ title, accent, badge, actions, children, className = '' }) {
    return (
        <div
            className={`rounded-xl border border-gray-200 bg-white p-6 mb-6 ${accent ? 'border-l-4 border-l-accent' : ''} ${className}`}
        >
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="text-lg font-semibold text-slate-800 m-0">{title}</div>
                {badge && (
                    <span className="inline-flex rounded-md bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                        {badge}
                    </span>
                )}
                {actions && <div className="flex gap-2">{actions}</div>}
            </div>
            {children}
        </div>
    )
}

export function EmptyState({ icon = 'fa-inbox', title, subtitle, success = false }) {
    return (
        <div
            className={`text-center p-8 rounded-lg text-[0.9375rem] text-slate-500 ${success ? 'bg-green-50' : 'bg-slate-50'}`}
        >
            {icon && (
                <i className={`fas ${icon} text-4xl mb-3 block ${success ? 'text-green-500' : 'text-slate-300'}`}></i>
            )}
            {title && <h4>{title}</h4>}
            {subtitle && <p>{subtitle}</p>}
        </div>
    )
}

export function StatsCard({ label, value }) {
    return (
        <div className="text-center rounded-lg border border-gray-200 bg-slate-50 p-3.5">
            <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</div>
            <div className="text-lg font-bold text-accent">{value}</div>
        </div>
    )
}

export function StatsBar({ items }) {
    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-3 mt-5 mb-4">
            {items.map((item, i) => (
                <StatsCard key={i} label={item.label} value={item.value} />
            ))}
        </div>
    )
}

export function LoadingSpinner({ text = 'Loading...' }) {
    return (
        <div className="flex items-center justify-center gap-3 p-8 text-slate-500">
            <i className="fas fa-circle-notch fa-spin text-xl"></i>
            <span>{text}</span>
        </div>
    )
}

/** Card displaying an AI-generated analysis summary with loading state, error handling, and regenerate action. */
export function AIAnalysisCard({ analysis, loading, error, onRegenerate, plantCount }) {
    if (loading) {
        return (
            <div className="rounded-xl bg-gradient-to-br from-accent to-accent/70 p-5 mb-6 text-white">
                <div className="flex items-center justify-center gap-2 p-4 text-sm opacity-80">
                    <i className="fas fa-circle-notch fa-spin"></i>
                    <span>Generating AI Analysis...</span>
                </div>
            </div>
        )
    }

    if (error && !loading) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 mb-6">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                Failed to generate AI analysis.
                <button
                    onClick={onRegenerate}
                    className="ml-2 cursor-pointer underline bg-transparent border-none text-inherit"
                >
                    Try again
                </button>
            </div>
        )
    }

    if (!analysis) return null

    return (
        <div className="rounded-xl bg-gradient-to-br from-accent to-accent/70 p-5 mb-6 text-white">
            <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-base">
                    <i className="fas fa-robot"></i>
                </div>
                <div>
                    <div className="font-semibold text-[0.9375rem] m-0">AI Regional Analysis</div>
                    <div className="text-xs opacity-80 m-0">
                        Based on report data for {plantCount} plant{plantCount !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>
            <div className="text-sm leading-relaxed opacity-95 whitespace-pre-wrap">{analysis}</div>
            <button
                className="mt-3 rounded-md border border-white/30 bg-white/15 px-3 py-1.5 text-xs text-white cursor-pointer hover:bg-white/25"
                onClick={onRegenerate}
            >
                <i className="fas fa-sync-alt mr-1.5"></i>
                Regenerate Analysis
            </button>
        </div>
    )
}

export function SectionHeader({ icon, title, subtitle }) {
    return (
        <div className="flex items-start gap-3 mb-5">
            {icon && (
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-sky-100 text-sky-700 text-base">
                    <i className={`fas ${icon}`}></i>
                </div>
            )}
            <div>
                <h3 className="text-lg font-semibold text-slate-800 m-0">{title}</h3>
                {subtitle && <p className="text-sm text-slate-500 mt-1 mb-0">{subtitle}</p>}
            </div>
        </div>
    )
}

export { RPT_INPUT, RPT_TEXTAREA, TD_STYLE, TH_STYLE }
