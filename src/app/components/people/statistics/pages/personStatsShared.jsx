/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { fmtInt } from '../../../../../utils/PlanStatisticsFormatUtility'

/** Highlight row used by the Overview snapshot card — mirrors the asset
 *  surface so the two products read as one. */
export function HighlightRow({ hint, icon, label, value }) {
    return (
        <div className="flex items-start gap-3 px-3 py-2.5 border-t border-border-light first:border-t-0">
            <i className={`fas ${icon} text-[11px] mt-1 w-4 text-center text-text-tertiary`} />
            <div className="flex-1 min-w-0">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-text-tertiary">{label}</div>
                <div className="font-semibold truncate text-text-primary" style={{ fontSize: 13.5 }}>
                    {value}
                </div>
                {hint && <div className="text-[11px] text-text-tertiary truncate">{hint}</div>}
            </div>
        </div>
    )
}

/** Launchpad tile — same affordance as the asset overview's tiles so the
 *  navigation pattern feels identical. */
export function LaunchpadTile({ accent, hint, icon, label, onSelect, section, value }) {
    return (
        <button type="button"
            onClick={() => onSelect?.(section)}
            className="flex flex-col gap-1 items-start rounded-lg border bg-bg-secondary border-border-light cursor-pointer p-3 text-left hover:border-current transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none text-text-secondary active:scale-[0.97]"
        >
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider">
                <i className={`fas ${icon} text-[11px] text-text-primary`} />
                {label}
            </span>
            <span className="font-mono tabular-nums font-bold leading-none text-text-primary" style={{ fontSize: 22 }}>
                {value}
            </span>
            {hint && <span className="text-[10.5px] text-text-tertiary">{hint}</span>}
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-text-primary">
                Open
                <i className="fas fa-arrow-right text-[9px]" />
            </span>
        </button>
    )
}

/** Date formatter for the Pending Starts table — short month/day/year so
 *  the table column stays tight. Returns "TBD" for null dates so the
 *  table never renders a blank cell. */
export const formatPendingDate = (iso) => {
    if (!iso) return 'TBD'
    const date = new Date(`${iso}T00:00:00`)
    if (!Number.isFinite(date.getTime())) return 'TBD'
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Formats a full ISO timestamp (e.g. `createdAt`, `statusChangedAt`) into
 *  the same short month/day/year style as `formatPendingDate`. Tolerates
 *  both timestamp and date-only inputs so the period-bound event tables
 *  render cleanly regardless of which field the row carries. */
export const formatEventDate = (iso) => {
    if (!iso) return '—'
    const value = typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) return '—'
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const daysUntilLabel = (days) => {
    if (days == null) return 'TBD'
    if (days === 0) return 'today'
    if (days < 0) return `${Math.abs(days)} d late`
    if (days === 1) return 'tomorrow'
    return `in ${days} d`
}

export const TIER_META = [
    { color: '#b91c1c', hint: 'role weight ≥ 70', id: 'admin', label: 'Admin' },
    { color: '#b45309', hint: 'role weight 40–69', id: 'lead', label: 'Lead' },
    { color: '#0ea5e9', hint: 'role weight 20–39', id: 'manager', label: 'Manager' },
    { color: '#64748b', hint: 'role weight < 20', id: 'viewer', label: 'Viewer' }
]

/** Role-tier tile — one per band, ordered by weight desc. The colored
 *  swatch + count combo reads as a balance check at a glance. */
export function TierTile({ color, count, hint, label, total }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0
    return (
        <div className="rounded-lg p-3 flex flex-col gap-1 bg-bg-secondary border border-border-light">
            <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary truncate">
                    {label}
                </span>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="font-mono tabular-nums font-bold text-text-primary" style={{ fontSize: 22 }}>
                    {fmtInt(count)}
                </span>
                {total > 0 && <span className="text-[11px] text-text-tertiary">{pct}%</span>}
            </div>
            <div className="text-[10.5px] text-text-tertiary">{hint}</div>
        </div>
    )
}
