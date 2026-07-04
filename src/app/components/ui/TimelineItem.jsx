/* eslint-disable react/forbid-dom-props */
import React from 'react'

import Badge from '../common/Badge'

/** Timeline entry — colored dot rail + card body. Theme-aware ring + line. */
export default function TimelineItem({ dotColor, dotClassName, isLast, children }) {
    return (
        <div className="flex gap-2.5 py-1.5">
            <div className="flex flex-col items-center w-5 flex-shrink-0">
                <div
                    className={`w-2.5 h-2.5 rounded-full z-[1] ${dotClassName ?? ''}`}
                    style={{
                        background: dotColor || 'var(--accent)',
                        boxShadow: '0 0 0 2px var(--bg-primary), 0 0 0 3px var(--border-light)'
                    }}
                    aria-hidden="true"
                />
                {!isLast && <div className="w-px flex-1 -mt-0.5 bg-border-light" />}
            </div>
            <div className="flex-1 rounded-card p-2.5 bg-bg-secondary border border-border-light">{children}</div>
        </div>
    )
}

/** Timeline entry header — label + optional "Current" badge + custom badge. */
export function TimelineHeader({ label, isCurrent, badge }) {
    return (
        <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[12.5px] font-semibold leading-tight text-text-primary">{label}</span>
            {isCurrent && (
                <Badge tone="success" size="md" shape="rounded-md">
                    Current
                </Badge>
            )}
            {badge}
        </div>
    )
}

/** Flex row container for timeline metadata items. */
export function TimelineMeta({ children }) {
    return <div className="flex items-center gap-2.5 flex-wrap">{children}</div>
}

/** Muted date label for timeline entries. */
export function TimelineDate({ date }) {
    return <span className="text-[11px] tabular-nums text-text-tertiary">{date}</span>
}

/** Accent-colored duration label for timeline entries. */
export function TimelineDuration({ text }) {
    return <span className="text-[11px] font-semibold text-accent">{text}</span>
}

/** Section heading inside a timeline tab. */
export function TimelineSectionTitle({ title }) {
    return <h3 className="m-0 mb-1 text-[9.5px] font-bold uppercase tracking-wider text-text-secondary">{title}</h3>
}
