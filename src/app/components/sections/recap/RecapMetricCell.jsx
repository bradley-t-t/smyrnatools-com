/* eslint-disable react/forbid-dom-props */
import React from 'react'

/**
 * Single metric tile inside the recap modal's net-change grid.
 * Colors the value green/red based on whether the change is positive or negative
 * for the metric type (e.g. more operators = good, more down trucks = bad).
 */
function RecapMetricCell({ value, label, icon, iconBg, iconFg, positive, last }) {
    const valueColor =
        value > 0
            ? positive
                ? '#16a34a'
                : '#dc2626'
            : value < 0
              ? positive
                  ? '#dc2626'
                  : '#16a34a'
              : 'var(--text-primary)'
    return (
        <div
            className="flex items-center gap-2 px-3 py-2 bg-bg-primary flex-1 min-w-0"
            style={{ borderRight: last ? 'none' : '1px solid var(--border-light)' }}
        >
            <div
                className="flex h-6 w-6 items-center justify-center rounded shrink-0"
                style={{ background: iconBg, color: iconFg }}
            >
                <i className={`fa-solid ${icon} text-[10px]`} />
            </div>
            <div className="flex flex-col min-w-0">
                <span
                    className="text-[14px] font-semibold leading-tight font-mono tabular-nums"
                    style={{ color: valueColor }}
                >
                    {value === 0 ? '0' : `${value > 0 ? '+' : ''}${value}`}
                </span>
                <span className="text-[9.5px] font-semibold uppercase tracking-wider leading-tight text-text-tertiary">
                    {label}
                </span>
            </div>
        </div>
    )
}

export default RecapMetricCell
