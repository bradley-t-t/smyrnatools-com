import React from 'react'

export function VarianceCell({ varianceStr }) {
    const n = parseFloat(varianceStr)
    let varClass = 'rpt-variance-neutral'
    let symbol = ''

    if (isFinite(n)) {
        if (n > 0) {
            varClass = 'rpt-variance-positive'
            symbol = '▲'
        } else if (n < 0) {
            varClass = 'rpt-variance-negative'
            symbol = '▼'
        }
    }

    if (!varianceStr) {
        return <div className="rpt-variance-cell rpt-variance-neutral">—</div>
    }

    return (
        <div className={`rpt-variance-cell ${varClass}`}>
            {symbol && <span className="rpt-variance-symbol">{symbol}</span>}
            <span className="rpt-variance-value">{varianceStr}</span>
        </div>
    )
}

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
        <tr>
            <td>{label}</td>
            <td>
                {isTextArea ? (
                    <textarea value={String(lastWeekValue)} disabled className="rpt-input rpt-textarea-notes" />
                ) : (
                    <input type="text" value={String(lastWeekValue)} disabled className="rpt-input" />
                )}
            </td>
            <td>
                {isTextArea ? (
                    <textarea
                        value={currentValue ?? ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        className="rpt-input rpt-textarea-notes"
                    />
                ) : (
                    <input
                        type={inputType}
                        value={currentValue ?? ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        className="rpt-input"
                    />
                )}
            </td>
            {varianceStr !== undefined && (
                <td>
                    <VarianceCell varianceStr={varianceStr} />
                </td>
            )}
        </tr>
    )
}

export function ComparisonTable({ headers, children }) {
    return (
        <table className="rpt-plant-summary-table">
            <thead>
                <tr>
                    {headers.map((h, i) => (
                        <th key={i}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>{children}</tbody>
        </table>
    )
}

export function ReportCard({ title, accent, badge, actions, children, className = '' }) {
    return (
        <div className={`rpt-card ${accent ? 'rpt-card-accent' : ''} ${className}`}>
            <div className="rpt-card-header">
                <div className="rpt-card-title">{title}</div>
                {badge && <span className="rpt-badge">{badge}</span>}
                {actions && <div className="rpt-card-actions">{actions}</div>}
            </div>
            {children}
        </div>
    )
}

export function EmptyState({ icon = 'fa-inbox', title, subtitle, success = false }) {
    return (
        <div className={`rpt-empty ${success ? 'rpt-empty-success' : ''}`}>
            {icon && <i className={`fas ${icon} rpt-empty-icon`}></i>}
            {title && <h4>{title}</h4>}
            {subtitle && <p>{subtitle}</p>}
        </div>
    )
}

export function StatsCard({ label, value }) {
    return (
        <div className="rpt-stat-card">
            <div className="rpt-stat-label">{label}</div>
            <div className="rpt-stat-value">{value}</div>
        </div>
    )
}

export function StatsBar({ items }) {
    return (
        <div className="rpt-stats">
            {items.map((item, i) => (
                <StatsCard key={i} label={item.label} value={item.value} />
            ))}
        </div>
    )
}

export function LoadingSpinner({ text = 'Loading...' }) {
    return (
        <div className="rpt-loading">
            <i className="fas fa-circle-notch fa-spin"></i>
            <span>{text}</span>
        </div>
    )
}

export function AIAnalysisCard({ analysis, loading, error, onRegenerate, plantCount }) {
    if (loading) {
        return (
            <div className="rpt-ai-analysis">
                <div className="rpt-ai-loading">
                    <i className="fas fa-circle-notch fa-spin"></i>
                    <span>Generating AI Analysis...</span>
                </div>
            </div>
        )
    }

    if (error && !loading) {
        return (
            <div className="rpt-ai-error">
                <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
                Failed to generate AI analysis.
                <button
                    onClick={onRegenerate}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        marginLeft: '0.5rem',
                        textDecoration: 'underline'
                    }}
                >
                    Try again
                </button>
            </div>
        )
    }

    if (!analysis) return null

    return (
        <div className="rpt-ai-analysis">
            <div className="rpt-ai-header">
                <div className="rpt-ai-icon">
                    <i className="fas fa-robot"></i>
                </div>
                <div>
                    <div className="rpt-ai-title">AI Regional Analysis</div>
                    <div className="rpt-ai-subtitle">
                        Based on report data for {plantCount} plant{plantCount !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>
            <div className="rpt-ai-content">{analysis}</div>
            <button className="rpt-ai-regenerate" onClick={onRegenerate}>
                <i className="fas fa-sync-alt" style={{ marginRight: '0.375rem' }}></i>
                Regenerate Analysis
            </button>
        </div>
    )
}

export function SectionHeader({ icon, title, subtitle }) {
    return (
        <div className="rpt-section-header">
            {icon && (
                <div className="rpt-section-icon">
                    <i className={`fas ${icon}`}></i>
                </div>
            )}
            <div>
                <h3 className="rpt-section-title">{title}</h3>
                {subtitle && <p className="rpt-section-subtitle">{subtitle}</p>}
            </div>
        </div>
    )
}
