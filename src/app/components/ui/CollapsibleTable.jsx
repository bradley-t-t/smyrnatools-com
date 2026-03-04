import React from 'react'

/**
 * Expandable/collapsible table with a toggle header.
 * Shows "None" placeholder when rows are empty and expanded.
 * @param {Object} props
 * @param {string} props.title - Header label with optional count.
 * @param {boolean} props.collapsed - Controls the collapsed state.
 * @param {Function} props.onToggle - Toggles collapse.
 * @param {boolean} props.disabled - Disables the toggle button.
 * @param {string[]} props.headers - Column header labels.
 * @param {Array} props.rows - Data rows to render.
 * @param {Function} props.renderRow - Returns an array of cell values for a row.
 * @param {string} [props.accentColor='#1e3a5f'] - Toggle button text color.
 */
export function CollapsibleTable({
    title,
    collapsed,
    onToggle,
    disabled,
    headers,
    rows,
    renderRow,
    accentColor = '#1e3a5f'
}) {
    return (
        <div className="border border-slate-200 rounded-lg mb-3 overflow-hidden">
            <div
                className={`flex items-center justify-between px-4 py-3.5 bg-slate-50 ${!collapsed ? 'border-b border-slate-200' : ''}`}
            >
                <span className="text-sm font-medium text-gray-700">{title}</span>
                <button
                    type="button"
                    onClick={onToggle}
                    disabled={disabled}
                    className={`text-sm font-medium ${disabled ? 'text-gray-400 cursor-default' : 'cursor-pointer'}`}
                    style={{ color: disabled ? '#9ca3af' : accentColor }}
                >
                    {collapsed ? 'Expand' : 'Collapse'}
                </button>
            </div>
            {!collapsed &&
                (rows.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-50">
                                    {headers.map((header, idx) => (
                                        <th
                                            key={idx}
                                            className="px-4 py-3 text-left font-medium text-slate-500 border-b border-slate-200"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, idx) => (
                                    <tr key={row.id || idx} className="border-b border-slate-100">
                                        {renderRow(row).map((cell, cellIdx) => (
                                            <td key={cellIdx} className="px-4 py-3 text-gray-700">
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-5 text-slate-400 text-sm">None</div>
                ))}
        </div>
    )
}
