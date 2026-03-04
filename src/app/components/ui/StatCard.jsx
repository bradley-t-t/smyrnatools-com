import React from 'react'

/** Compact stat card with uppercase label, bold value, and optional sublabel. */
export default function StatCard({ label, value, sublabel, className = '' }) {
    return (
        <div className={`bg-slate-50 border border-gray-200 rounded-md px-2.5 py-2 text-center ${className}`}>
            <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">{label}</div>
            <div className="text-base font-bold text-slate-800">{value}</div>
            {sublabel && <div className="text-[10px] text-slate-500">{sublabel}</div>}
        </div>
    )
}
