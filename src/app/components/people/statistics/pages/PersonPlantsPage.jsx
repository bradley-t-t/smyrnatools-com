import React from 'react'

import { fmtInt } from '../../../../../utils/PlanStatisticsFormatUtility'
import { CategoricalBarChart } from '../../../assets/statistics/AssetStatisticsCharts'
import { Panel, Stat, StatGroup } from '../../../ui/Panel'

export function PersonPlantsPage({ accentColor, kind, stats }) {
    const accent = accentColor || '#1e3a5f'
    const isOperators = kind === 'operators'
    const { perPlant, summary } = stats
    const topPlants = perPlant.slice(0, 12).map((row) => ({ count: row.active, label: row.code }))
    return (
        <div className="flex flex-col gap-4">
            <StatGroup columns={4}>
                <Stat label="Plants in scope" value={fmtInt(perPlant.length)} hint="have at least one person" />
                <Stat
                    label="Most populated"
                    value={perPlant[0] ? fmtInt(perPlant[0].active) : '—'}
                    hint={perPlant[0] ? `${perPlant[0].code} · ${perPlant[0].name}` : '—'}
                />
                <Stat
                    label="Avg per plant"
                    value={perPlant.length > 0 ? fmtInt(Math.round(summary.activeCount / perPlant.length)) : '—'}
                    hint="active ÷ plants"
                />
                {isOperators ? (
                    <Stat
                        label="Trainers spread"
                        value={fmtInt(perPlant.filter((p) => p.trainers > 0).length)}
                        hint={`${fmtInt(summary.trainerCount)} trainers total`}
                    />
                ) : (
                    <Stat label="Missing plant" value={fmtInt(summary.missingPlant)} hint="managers without plant" />
                )}
            </StatGroup>
            <Panel title="Top plants by active roster" innerClassName="p-3">
                <CategoricalBarChart accent={accent} data={topPlants} height={240} />
            </Panel>
            <Panel
                title="Per-plant scorecard"
                innerClassName="p-0"
                right={<span className="text-[11px] text-text-tertiary">{`Showing ${perPlant.length} plants`}</span>}
            >
                {perPlant.length === 0 ? (
                    <div className="text-[12px] py-4 text-center text-text-tertiary">No plants in scope.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px] border-collapse">
                            <thead>
                                <tr className="text-text-tertiary">
                                    <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                        Plant
                                    </th>
                                    <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                        Total
                                    </th>
                                    <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                        Active
                                    </th>
                                    {isOperators && (
                                        <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                            Trainers
                                        </th>
                                    )}
                                    <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                        Share
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {perPlant.map((row) => {
                                    const share = summary.activeCount > 0 ? (row.active / summary.activeCount) * 100 : 0
                                    return (
                                        <tr key={row.code} className="border-t border-border-light">
                                            <td className="px-3 py-2">
                                                <span className="font-mono tabular-nums font-semibold text-text-primary">
                                                    {row.code}
                                                </span>
                                                {row.name !== row.code && (
                                                    <span className="ml-2 text-text-secondary">{row.name}</span>
                                                )}
                                            </td>
                                            <td className="px-2 py-2 text-right font-mono tabular-nums font-semibold text-text-primary">
                                                {fmtInt(row.total)}
                                            </td>
                                            <td className="px-2 py-2 text-right font-mono tabular-nums text-text-primary">
                                                {fmtInt(row.active)}
                                            </td>
                                            {isOperators && (
                                                <td className="px-2 py-2 text-right font-mono tabular-nums text-text-secondary">
                                                    {fmtInt(row.trainers)}
                                                </td>
                                            )}
                                            <td className="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">
                                                {share.toFixed(1)}%
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>
        </div>
    )
}
