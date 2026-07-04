import React from 'react'

import { fmtInt } from '../../../../../utils/PlanStatisticsFormatUtility'
import { CategoricalBarChart } from '../../../assets/statistics/AssetStatisticsCharts'
import { Panel, Stat, StatGroup } from '../../../ui/Panel'

export function PersonActivityPage({ accentColor, stats }) {
    const accent = accentColor || '#1e3a5f'
    const { lastLoginDistribution, staleManagers, summary } = stats
    return (
        <div className="flex flex-col gap-4">
            <StatGroup columns={4}>
                <Stat
                    label="Avg recency"
                    value={summary.avgLastLoginDays != null ? `${fmtInt(summary.avgLastLoginDays)} d` : '—'}
                    hint="days since last login"
                />
                <Stat
                    label="Recent (≤ 7d)"
                    value={fmtInt(lastLoginDistribution.find((r) => r.label === '< 7 d')?.count || 0)}
                    hint="signed in this week"
                />
                <Stat
                    label="Stale (> 90d)"
                    value={fmtInt(
                        (lastLoginDistribution.find((r) => r.label === '91–180 d')?.count || 0) +
                            (lastLoginDistribution.find((r) => r.label === '> 180 d')?.count || 0)
                    )}
                    hint="long inactive"
                />
                <Stat label="Never" value={fmtInt(summary.neverLoggedIn)} hint="never logged in" />
            </StatGroup>
            <Panel title="Login recency" innerClassName="p-3">
                <CategoricalBarChart accent={accent} data={lastLoginDistribution} height={240} />
            </Panel>
            <Panel
                title="Stale accounts"
                innerClassName="p-0"
                right={<span className="text-[11px] text-text-tertiary">{`Top ${staleManagers.length}`}</span>}
            >
                {staleManagers.length === 0 ? (
                    <div className="text-[12px] py-4 text-center text-text-tertiary">All managers are current.</div>
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
                                        Last login
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {staleManagers.map((row) => (
                                    <tr key={row.id} className="border-t border-border-light">
                                        <td className="px-3 py-2 font-semibold text-text-primary">{row.name}</td>
                                        <td className="px-2 py-2 font-mono tabular-nums text-text-secondary">
                                            {row.plant}
                                        </td>
                                        <td className="px-2 py-2 text-text-secondary">{row.role}</td>
                                        <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">
                                            {row.daysSince == null ? 'Never' : `${fmtInt(row.daysSince)} d`}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>
        </div>
    )
}
