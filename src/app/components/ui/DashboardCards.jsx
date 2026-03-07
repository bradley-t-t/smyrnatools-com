import React from 'react'
/** Allocation percentage tier styling (high/medium/low). */
const ALLOCATION_STYLES = {
    high: { background: '#dcfce7', color: '#16a34a' },
    low: { background: '#fee2e2', color: '#dc2626' },
    medium: { background: '#fef9c3', color: '#ca8a04' }
}
const getAllocationStyle = (percent) => {
    if (percent >= 80) return ALLOCATION_STYLES.high
    if (percent >= 50) return ALLOCATION_STYLES.medium
    return ALLOCATION_STYLES.low
}
/** Small gray pill displaying an inline status label (e.g. "Active 5"). */
export function StatusPill({ children, className = '' }) {
    return (
        <span
            className={`inline-block rounded-2xl bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 mb-1.5 mr-1.5 ${className}`}
        >
            {children}
        </span>
    )
}
/** Color-coded pill showing allocation percentage (green >= 80, yellow >= 50, red < 50). */
export function AllocationPill({ percent }) {
    const style = getAllocationStyle(percent)
    return (
        <span className="inline-block rounded-2xl px-2.5 py-1 text-xs font-medium mb-1.5 mr-1.5" style={style}>
            {percent}% Allocated
        </span>
    )
}
/** Dashboard metric card with icon, label, value, optional subtitle, and child pills. */
export function MetricCard({
    label,
    value,
    subtitle,
    icon,
    iconBg,
    iconColor,
    children,
    highlight = false,
    accentColor
}) {
    return (
        <div
            className="rounded-xl p-4 md:p-5 transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5"
            style={{
                backgroundColor: '#f8fafc',
                border: highlight ? `2px solid ${accentColor}` : '1px solid #e2e8f0'
            }}
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="text-xs md:text-sm font-medium text-slate-500 mb-1">{label}</div>
                    <div className="text-2xl md:text-3xl font-bold text-slate-900">{value}</div>
                </div>
                {icon && (
                    <div className="rounded-lg p-2" style={{ backgroundColor: iconBg }}>
                        <i className={`fas ${icon}`} style={{ color: iconColor, fontSize: '20px' }}></i>
                    </div>
                )}
            </div>
            {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
            {children && <div className="flex flex-wrap gap-1">{children}</div>}
        </div>
    )
}
/** Shimmer skeleton placeholder for chart/card loading states. */
export function SkeletonCard() {
    return (
        <div className="rounded-xl p-6 shadow bg-white animate-pulse">
            <div className="h-4 rounded w-2/5 mb-3 bg-slate-200" />
            <div className="h-8 rounded w-3/5 mb-2 bg-slate-200" />
            <div className="h-3 rounded w-1/3 bg-slate-200" />
        </div>
    )
}
/** Shimmer skeleton placeholder for metric card loading states. */
export function SkeletonMetricCard() {
    return (
        <div className="rounded-xl p-4 md:p-5 bg-slate-50 border border-slate-200 animate-pulse">
            <div className="h-3.5 rounded w-3/5 mb-3 bg-slate-200" />
            <div className="h-8 rounded w-1/2 mb-2 bg-slate-200" />
            <div className="h-3 rounded w-2/5 bg-slate-200" />
        </div>
    )
}
/** Rounded white card container for dashboard sections. */
export function DashboardCard({ children, className = '' }) {
    return (
        <div
            className={`bg-white border border-gray-200 rounded-2xl p-4 md:p-6 shadow-sm transition-shadow duration-200 hover:shadow-md ${className}`}
        >
            {children}
        </div>
    )
}
/** Section heading used inside dashboard cards. */
export function SectionTitle({ children }) {
    return <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-4 md:mb-5">{children}</h3>
}
/** Grid of active/spare/shop counts per freight type (Cement, Aggregate, Dump Truck). */
export function FreightTypeBreakdown({ freightData, isMobile }) {
    const types = ['Cement', 'Aggregate', 'Dump Truck'].filter(
        (type) => freightData[type] && freightData[type].total > 0
    )
    if (types.length === 0) return null
    const icons = {
        Aggregate: 'fa-mountain',
        Cement: 'fa-industry',
        'Dump Truck': 'fa-truck-loading'
    }
    return (
        <div className="border-t border-gray-200 mt-3 pt-3">
            <div className={`grid gap-1.5 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {types.map((type) => {
                    const data = freightData[type]
                    return (
                        <div key={type} className="bg-slate-50 rounded-lg p-2 text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <i className={`fas ${icons[type]} text-slate-500`} style={{ fontSize: '10px' }} />
                                <span className="text-slate-500 text-xs font-semibold">
                                    {type === 'Dump Truck' ? 'Dump' : type}
                                </span>
                            </div>
                            <div className="flex justify-center gap-1">
                                <span className="bg-green-100 text-green-600 rounded px-1.5 py-0.5 text-xs font-semibold">
                                    {data.active}
                                </span>
                                <span className="bg-purple-100 text-purple-600 rounded px-1.5 py-0.5 text-xs font-semibold">
                                    {data.spare}
                                </span>
                                <span className="bg-orange-100 text-orange-600 rounded px-1.5 py-0.5 text-xs font-semibold">
                                    {data.shop}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
/** Grid of active/spare/shop counts per trailer type (Cement, End Dump). */
export function TrailerTypeBreakdown({ trailerTypeData, isMobile }) {
    const types = ['Cement', 'End Dump'].filter((type) => trailerTypeData[type] && trailerTypeData[type].total > 0)
    if (types.length === 0) return null
    const icons = {
        Cement: 'fa-industry',
        'End Dump': 'fa-truck-loading'
    }
    return (
        <div className="border-t border-gray-200 mt-3 pt-3">
            <div className={`grid gap-1.5 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {types.map((type) => {
                    const data = trailerTypeData[type]
                    return (
                        <div key={type} className="bg-slate-50 rounded-lg p-2 text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <i className={`fas ${icons[type]} text-slate-500`} style={{ fontSize: '10px' }} />
                                <span className="text-slate-500 text-xs font-semibold">{type}</span>
                            </div>
                            <div className="flex justify-center gap-1">
                                <span className="bg-green-100 text-green-600 rounded px-1.5 py-0.5 text-xs font-semibold">
                                    {data.active}
                                </span>
                                <span className="bg-purple-100 text-purple-600 rounded px-1.5 py-0.5 text-xs font-semibold">
                                    {data.spare}
                                </span>
                                <span className="bg-orange-100 text-orange-600 rounded px-1.5 py-0.5 text-xs font-semibold">
                                    {data.shop}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
