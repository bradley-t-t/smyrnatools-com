import React from 'react'

export default function TimelineItem({ dotColor, dotClassName, isLast, children }) {
    return (
        <div className="flex gap-3 py-2">
            <div className="flex flex-col items-center w-5 flex-shrink-0">
                <div
                    className={`w-3 h-3 rounded-full border-2 border-white shadow-[0_0_0_2px_#e5e7eb] z-[1] ${dotClassName ?? ''}`}
                    style={dotColor ? { background: dotColor } : undefined}
                />
                {!isLast && <div className="w-0.5 flex-1 bg-gray-200 -mt-0.5" />}
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-lg p-3">{children}</div>
        </div>
    )
}

export function TimelineHeader({ label, isCurrent, badge }) {
    return (
        <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-semibold text-slate-800">{label}</span>
            {isCurrent && (
                <span className="text-[10px] font-bold text-white bg-green-600 px-1.5 py-0.5 rounded uppercase">
                    Current
                </span>
            )}
            {badge}
        </div>
    )
}

export function TimelineMeta({ children }) {
    return <div className="flex items-center gap-3 flex-wrap">{children}</div>
}

export function TimelineDate({ date }) {
    return <span className="text-xs text-slate-500">{date}</span>
}

export function TimelineDuration({ text }) {
    return <span className="text-xs text-[#1e3a5f] font-semibold">{text}</span>
}

export function TimelineSectionTitle({ title }) {
    return (
        <h3 className="m-0 mb-2.5 text-xs font-bold text-slate-800 uppercase tracking-wide pb-1.5 border-b border-gray-200">
            {title}
        </h3>
    )
}
