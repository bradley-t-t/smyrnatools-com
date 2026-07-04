/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { Panel } from '../ui/Panel'

/** Resolve allocation bar color via semantic status tokens. */
const allocationColorClass = (pct) =>
    pct >= 80 ? 'bg-status-active' : pct >= 50 ? 'bg-status-warning' : 'bg-status-danger'

/** Inline horizontal allocation bar — track + fill + percent text. The
 *  fixed minimums only kick in at `sm+`; on mobile the bar shrinks with
 *  the column so the table fits inside a phone viewport. */
function AllocationBar({ percent }) {
    const pct = Math.min(100, Math.max(0, percent || 0))
    return (
        <div className="flex items-center gap-1.5 sm:gap-2 sm:min-w-[120px]">
            <div
                className="flex-1 h-1.5 rounded-full overflow-hidden bg-bg-tertiary"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Allocation ${pct} percent`}
            >
                <div
                    className={`h-full rounded-full transition-[width] duration-500 ease-out ${allocationColorClass(pct)}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-[11px] sm:text-[11.5px] font-semibold font-mono tabular-nums sm:min-w-[36px] text-right text-text-primary">
                {pct}%
            </span>
        </div>
    )
}

/** Single row of the flat fleet table. The Spare / In shop / Stationary
 *  columns hide below `sm` so a phone-width screen renders the four
 *  essentials (asset type · total · active · allocation) without
 *  horizontal scroll. */
function FleetRow({ active, allocation, dotColor, isTotal, label, shop, spare, stationary, total }) {
    const rowClass = isTotal
        ? 'font-semibold bg-bg-secondary border-t border-border-medium'
        : 'transition-colors duration-150 hover:bg-bg-hover'
    return (
        <tr className={rowClass}>
            <td className="px-3 py-2 text-[12.5px] text-text-primary">
                <div className="flex items-center gap-2">
                    <span
                        className="w-2 h-2 rounded-sm flex-shrink-0"
                        style={{ background: dotColor }}
                        aria-hidden="true"
                    />
                    <span>{label}</span>
                </div>
            </td>
            <td className="px-3 py-2 text-right font-mono tabular-nums text-[12.5px] font-semibold text-text-primary">
                {total ?? '—'}
            </td>
            <td className="px-3 py-2 text-right font-mono tabular-nums text-[12.5px] font-semibold text-text-primary">
                {active ?? '—'}
            </td>
            <td
                className={`hidden sm:table-cell px-3 py-2 text-right font-mono tabular-nums text-[12.5px] font-semibold ${
                    spare != null ? 'text-text-primary' : 'text-text-tertiary'
                }`}
            >
                {spare ?? '—'}
            </td>
            <td className="hidden sm:table-cell px-3 py-2 text-right font-mono tabular-nums text-[12.5px] font-semibold text-text-primary">
                {shop ?? '—'}
            </td>
            <td
                className={`hidden md:table-cell px-3 py-2 text-right font-mono tabular-nums text-[12.5px] font-semibold ${
                    stationary != null ? 'text-text-primary' : 'text-text-tertiary'
                }`}
            >
                {stationary ?? '—'}
            </td>
            <td className="px-2 sm:px-3 py-2 sm:w-[220px]">
                <AllocationBar percent={allocation} />
            </td>
        </tr>
    )
}

/**
 * Flat fleet table — every asset type rendered as a single inline row
 * (dot · label · total · status counts · allocation bar) with a totals
 * row footer. Replaces the prior thick card-style layout to match the
 * Plan tab's table-friendly aesthetic.
 */
export default function FleetOverviewSection({ accentColor: _accentColor, displayStats, isAggregate, stats }) {
    const m = displayStats.mixers || {}
    const t = displayStats.tractors || {}
    const tr = displayStats.trailers || {}
    const e = displayStats.equipment || {}
    const p = stats.pickups || {}

    const sumActive = (record) => Number(record?.activeOperators ?? record?.active ?? 0)
    const totals = {
        active: (isAggregate ? 0 : sumActive(m)) + sumActive(t) + sumActive(tr) + sumActive(e) + Number(p.active || 0),
        shop:
            (isAggregate ? 0 : Number(m.shop || 0)) +
            Number(t.shop || 0) +
            Number(tr.shop || 0) +
            Number(e.shop || 0) +
            Number(p.shop || 0),
        spare:
            (isAggregate ? 0 : Number(m.spare || 0)) +
            Number(t.spare || 0) +
            Number(tr.spare || 0) +
            Number(e.spare || 0),
        stationary: Number(p.stationary || 0),
        total:
            (isAggregate ? 0 : Number(m.total || 0)) +
            Number(t.total || 0) +
            Number(tr.total || 0) +
            Number(e.total || 0) +
            Number(p.total || 0)
    }
    const totalAllocation = totals.total > 0 ? Math.round((totals.active / totals.total) * 100) : 0

    return (
        <Panel
            id="fleet"
            title="Fleet"
            innerClassName=""
            right={<span className="text-[11px] text-text-tertiary">Active, spare, in-shop by asset type</span>}
        >
            {/* `overflow-x-auto` is the last-line-of-defense for any future
                column or fixed-width inside the table that would otherwise
                push past the viewport. The Spare / In shop / Stationary
                columns are display:none under sm/md so a phone-width
                screen already fits without scrolling. */}
            <div className="overflow-x-auto -mx-px">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-bg-secondary">
                            <th className="px-3 py-2 text-left text-[11px] font-semibold text-text-secondary border-b border-border-light">
                                Asset type
                            </th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold text-text-secondary border-b border-border-light">
                                Total
                            </th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold text-text-secondary border-b border-border-light">
                                Active
                            </th>
                            <th className="hidden sm:table-cell px-3 py-2 text-right text-[11px] font-semibold text-text-secondary border-b border-border-light">
                                Spare
                            </th>
                            <th className="hidden sm:table-cell px-3 py-2 text-right text-[11px] font-semibold text-text-secondary border-b border-border-light">
                                In shop
                            </th>
                            <th className="hidden md:table-cell px-3 py-2 text-right text-[11px] font-semibold text-text-secondary border-b border-border-light">
                                Stationary
                            </th>
                            <th className="px-2 sm:px-3 py-2 text-left text-[11px] font-semibold text-text-secondary border-b border-border-light">
                                Allocation
                            </th>
                        </tr>
                    </thead>
                    <tbody className="border-border-light">
                        {!isAggregate && (
                            <FleetRow
                                active={m.activeOperators ?? m.active}
                                allocation={m.allocationPercent}
                                dotColor="#1e40af"
                                label="Mixers"
                                shop={m.shop}
                                spare={m.spare}
                                total={m.total}
                            />
                        )}
                        <FleetRow
                            active={t.activeOperators ?? t.active}
                            allocation={t.allocationPercent}
                            dotColor="#16a34a"
                            label="Tractors"
                            shop={t.shop}
                            spare={t.spare}
                            total={t.total}
                        />
                        <FleetRow
                            active={tr.active}
                            allocation={tr.allocationPercent}
                            dotColor="#d97706"
                            label="Trailers"
                            shop={tr.shop}
                            spare={tr.spare}
                            total={tr.total}
                        />
                        <FleetRow
                            active={e.active}
                            allocation={e.allocationPercent}
                            dotColor="#9333ea"
                            label="Equipment"
                            shop={e.shop}
                            spare={e.spare}
                            total={e.total}
                        />
                        <FleetRow
                            active={p.active}
                            allocation={p.total > 0 ? Math.round((p.active / p.total) * 100) : 0}
                            dotColor="#db2777"
                            label="Pickup trucks"
                            shop={p.shop}
                            stationary={p.stationary}
                            total={p.total}
                        />
                        <FleetRow
                            active={totals.active}
                            allocation={totalAllocation}
                            dotColor="var(--accent)"
                            isTotal
                            label="Total"
                            shop={totals.shop}
                            spare={totals.spare}
                            stationary={totals.stationary || null}
                            total={totals.total}
                        />
                    </tbody>
                </table>
            </div>
        </Panel>
    )
}
