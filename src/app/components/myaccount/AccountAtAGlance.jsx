import React from 'react'

import { formatJoinedDate, formatRelativeTime } from '../../constants/myAccountConstants'

/** Right-rail snapshot. Hidden under xl breakpoint where the stat strip
 *  already covers the same ground. */
export default function AccountAtAGlance({
    additionalPlants,
    email,
    joinedAt,
    plantCode,
    regionName,
    sessions,
    userRole
}) {
    const currentSession = sessions.find((s) => s.isCurrent) || sessions[0]
    const rows = [
        { label: 'Email', mono: false, value: email || '—' },
        { label: 'Joined', value: formatJoinedDate(joinedAt) },
        {
            hint: currentSession ? `${currentSession.browser || ''} · ${currentSession.os || ''}`.trim() : null,
            label: 'Last sign-in',
            value: currentSession ? formatRelativeTime(currentSession.lastActive) : '—'
        },
        {
            hint: regionName ? null : 'No region selected',
            label: 'Region',
            value: regionName || '—'
        },
        {
            hint: additionalPlants.length > 0 ? `+ ${additionalPlants.join(' · ')}` : null,
            label: 'Home plant',
            value: plantCode || '—'
        },
        { label: 'Sessions', value: sessions.length.toString() },
        { label: 'Role', value: userRole || '—' }
    ]
    return (
        <aside className="hidden xl:block sticky top-0 self-start py-5 pl-4 w-60">
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] px-2 pb-2 text-text-tertiary">
                At a glance
            </div>
            <div className="rounded p-3 flex flex-col bg-bg-primary border border-border-light">
                {rows.map((row, idx) => (
                    <div
                        key={row.label}
                        className="flex flex-col py-2"
                        style={{
                            borderBottom: idx < rows.length - 1 ? '1px dashed var(--border-light)' : 'none'
                        }}
                    >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-text-tertiary">
                            {row.label}
                        </span>
                        <span
                            className={`font-semibold text-[13px] text-text-primary ${row.mono === false ? '' : 'font-mono tabular-nums'} truncate`}
                            title={row.value}
                        >
                            {row.value}
                        </span>
                        {row.hint && (
                            <span className="text-[11px] truncate text-text-secondary" title={row.hint}>
                                {row.hint}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </aside>
    )
}
