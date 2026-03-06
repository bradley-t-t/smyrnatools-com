import React from 'react'

/**
 * Year dropdown selector with light/dark variant styling.
 * Generates options from `startYear` through the current year.
 * @param {Object} props
 * @param {number} props.selectedYear - Currently selected year.
 * @param {Function} props.onYearChange - Called with the new year value.
 * @param {number} [props.startYear=2025] - First year in the dropdown.
 * @param {string} [props.label='YTD'] - Label shown next to the selector.
 * @param {'light'|'dark'} [props.variant='light'] - Visual variant.
 */
export default function YearSelector({
    selectedYear,
    onYearChange,
    startYear = 2025,
    label = 'YTD',
    variant = 'light'
}) {
    const currentYear = new Date().getFullYear()
    const yearOptions = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i)
    const isDark = variant === 'dark'

    const labelClasses = isDark ? 'text-white/60' : 'text-gray-500'

    const selectClasses = isDark
        ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 focus:border-white/40 focus:ring-white/20'
        : 'bg-white border-gray-200 text-accent focus:border-accent focus:ring-accent/10'

    return (
        <div className="flex items-center gap-3">
            {label && <span className={`text-sm font-semibold uppercase tracking-wide ${labelClasses}`}>{label}</span>}
            <select
                value={selectedYear}
                onChange={(e) => onYearChange(parseInt(e.target.value))}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-[0.9375rem] font-semibold outline-none transition-all focus:ring-2 ${selectClasses}`}
            >
                {yearOptions.map((year) => (
                    <option key={year} value={year} className="bg-white text-slate-900">
                        {year}
                    </option>
                ))}
            </select>
        </div>
    )
}
