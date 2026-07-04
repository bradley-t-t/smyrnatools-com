/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { fmtInt } from '../../../../../utils/PlanStatisticsFormatUtility'
import Badge from '../../../common/Badge'
import { Panel, Stat, StatGroup } from '../../../ui/Panel'
import { TIER_META, TierTile } from './personStatsShared'

/**
 * Coverage & Risk — managers-only. Surfaces the four signals that
 * actually matter for a permission roster: plant coverage gaps,
 * single-point-of-failure plants, role-tier balance, and recent
 * additions. Each section is structured so the operations lead can scan
 * for "where am I exposed?" in under ten seconds.
 */
export function PersonCoveragePage({ accentColor, stats }) {
    const accent = accentColor || '#1e3a5f'
    const { managerCoverage, summary } = stats
    if (!managerCoverage) {
        return (
            <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-text-tertiary">
                <i className="fas fa-circle-info text-[14px]" />
                Coverage view is only available for managers.
            </div>
        )
    }

    const { domainBreakdown, loginHealth, recentAdditions, roleTiers, spofPlants, uncoveredPlants } = managerCoverage
    const totalTiered = roleTiers.admin + roleTiers.lead + roleTiers.manager + roleTiers.viewer
    const totalManagers = summary.total

    return (
        <div className="flex flex-col gap-4">
            <StatGroup columns={4}>
                <Stat
                    label="Uncovered plants"
                    value={fmtInt(uncoveredPlants.length)}
                    hint={uncoveredPlants.length > 0 ? 'no managers assigned' : 'every plant covered'}
                />
                <Stat
                    label="Single-point-of-failure"
                    value={fmtInt(spofPlants.length)}
                    hint={spofPlants.length > 0 ? 'plants with only 1 manager' : 'all plants have backup'}
                />
                <Stat label="Recent additions" value={fmtInt(recentAdditions.length)} hint="added in last 30 d" />
                <Stat
                    label="Stale accounts"
                    value={fmtInt(loginHealth.stale + loginHealth.never)}
                    hint={`${fmtInt(loginHealth.stale)} > 90 d · ${fmtInt(loginHealth.never)} never`}
                />
            </StatGroup>

            <Panel title="Role-tier balance" innerClassName="p-3">
                <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                    {TIER_META.map((tier) => (
                        <TierTile
                            key={tier.id}
                            color={tier.color}
                            count={roleTiers[tier.id]}
                            hint={tier.hint}
                            label={tier.label}
                            total={totalTiered}
                        />
                    ))}
                </div>
                <div className="mt-2 text-[11px] text-text-tertiary">
                    Tiers come from <span className="font-semibold">roleWeight</span> — the same weight the rest of the
                    app uses to gate permissions, so the mix here matches who actually has what access.
                </div>
            </Panel>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Panel
                    title="Plants with no manager coverage"
                    innerClassName="p-0"
                    right={
                        <span className="text-[11px] text-text-tertiary">
                            {uncoveredPlants.length > 0
                                ? `${uncoveredPlants.length} plant${uncoveredPlants.length === 1 ? '' : 's'}`
                                : 'Coverage complete'}
                        </span>
                    }
                >
                    {uncoveredPlants.length === 0 ? (
                        <div className="text-[12px] py-4 text-center text-text-tertiary">
                            Every plant in scope has at least one manager.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12px] border-collapse">
                                <thead>
                                    <tr className="text-text-tertiary">
                                        <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                            Plant
                                        </th>
                                        <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {uncoveredPlants.map((row) => (
                                        <tr key={row.code} className="border-t border-border-light">
                                            <td className="px-3 py-2">
                                                <span className="font-mono tabular-nums font-semibold text-text-primary">
                                                    {row.code}
                                                </span>
                                                {row.name !== row.code && (
                                                    <span className="ml-2 text-text-secondary">{row.name}</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <Badge tone="danger" size="sm" uppercase={false} weight="semibold">
                                                    No managers
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
                <Panel
                    title="Single-point-of-failure plants"
                    innerClassName="p-0"
                    right={
                        <span className="text-[11px] text-text-tertiary">
                            {spofPlants.length > 0
                                ? `${spofPlants.length} plant${spofPlants.length === 1 ? '' : 's'}`
                                : 'All have backup'}
                        </span>
                    }
                >
                    {spofPlants.length === 0 ? (
                        <div className="text-[12px] py-4 text-center text-text-tertiary">
                            Every covered plant has at least two managers — no SPOF risk.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12px] border-collapse">
                                <thead>
                                    <tr className="text-text-tertiary">
                                        <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                            Plant
                                        </th>
                                        <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                            Managers
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {spofPlants.map((row) => (
                                        <tr key={row.code} className="border-t border-border-light">
                                            <td className="px-3 py-2">
                                                <span className="font-mono tabular-nums font-semibold text-text-primary">
                                                    {row.code}
                                                </span>
                                                {row.name !== row.code && (
                                                    <span className="ml-2 text-text-secondary">{row.name}</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">
                                                {row.count}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
            </div>

            <Panel
                title="Recent additions (last 30 days)"
                innerClassName="p-0"
                right={
                    <span className="text-[11px] text-text-tertiary">
                        {recentAdditions.length > 0 ? `${recentAdditions.length} new` : 'No new managers'}
                    </span>
                }
            >
                {recentAdditions.length === 0 ? (
                    <div className="text-[12px] py-4 text-center text-text-tertiary">
                        Nobody added in the last 30 days. Roster is stable.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px] border-collapse">
                            <thead>
                                <tr className="text-text-tertiary">
                                    <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                        Name
                                    </th>
                                    <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                        Plant
                                    </th>
                                    <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                        Role
                                    </th>
                                    <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                        Added
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentAdditions.map((row) => (
                                    <tr key={row.id} className="border-t border-border-light">
                                        <td className="px-3 py-2">
                                            <div className="font-semibold text-text-primary">{row.name}</div>
                                            {row.email && (
                                                <div className="text-[10.5px] text-text-tertiary truncate">
                                                    {row.email}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 font-mono tabular-nums text-text-secondary">
                                            {row.plant}
                                        </td>
                                        <td className="px-2 py-2 text-text-secondary">{row.role}</td>
                                        <td className="px-3 py-2 text-right font-mono tabular-nums text-text-primary">
                                            {row.daysSince === 0
                                                ? 'today'
                                                : row.daysSince === 1
                                                  ? 'yesterday'
                                                  : `${fmtInt(row.daysSince)} d ago`}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>

            {domainBreakdown.length > 0 && (
                <Panel title="Email domain mix" innerClassName="p-3">
                    <div className="flex flex-col gap-1.5">
                        {domainBreakdown.slice(0, 8).map((row) => {
                            const max = domainBreakdown[0].count
                            const pct = max > 0 ? (row.count / max) * 100 : 0
                            return (
                                <div key={row.label} className="flex items-center gap-2 text-[12px]">
                                    <span className="flex-1 min-w-0 truncate text-text-primary">{row.label}</span>
                                    <div className="h-4 rounded-sm overflow-hidden relative shrink-0 bg-bg-tertiary w-32">
                                        <div className="h-full" style={{ background: accent, width: `${pct}%` }} />
                                    </div>
                                    <span className="font-mono tabular-nums font-semibold w-12 text-right shrink-0 text-text-primary">
                                        {fmtInt(row.count)}
                                    </span>
                                    <span className="font-mono tabular-nums w-12 text-right shrink-0 text-text-tertiary">
                                        {totalManagers > 0 ? `${Math.round((row.count / totalManagers) * 100)}%` : '—'}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                    {domainBreakdown.length > 8 && (
                        <div className="mt-2 text-[11px] text-text-tertiary">
                            {`+ ${domainBreakdown.length - 8} more domain${domainBreakdown.length - 8 === 1 ? '' : 's'}`}
                        </div>
                    )}
                </Panel>
            )}
        </div>
    )
}
