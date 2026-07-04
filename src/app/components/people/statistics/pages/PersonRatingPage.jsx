import React from 'react'

import { fmtInt } from '../../../../../utils/PlanStatisticsFormatUtility'
import { CategoricalBarChart } from '../../../assets/statistics/AssetStatisticsCharts'
import StarRating from '../../../common/StarRating'
import { Panel, Stat, StatGroup } from '../../../ui/Panel'

export function PersonRatingPage({ accentColor, stats }) {
    const accent = accentColor || '#1e3a5f'
    const { lowestRatedOperators, ratingDistribution, summary } = stats
    return (
        <div className="flex flex-col gap-4">
            <StatGroup columns={4}>
                <Stat
                    label="Avg rating"
                    value={
                        summary.avgRating != null ? (
                            <StarRating
                                value={summary.avgRating}
                                size="sm"
                                tone="warning"
                                showValue
                                valueFormat="decimal"
                            />
                        ) : (
                            '—'
                        )
                    }
                    hint={`${fmtInt(summary.ratingSamples)} rated`}
                />
                <Stat
                    label={
                        <span className="inline-flex items-center gap-1">
                            At 5
                            <StarRating value={5} tone="warning" size="xs" />
                        </span>
                    }
                    value={fmtInt(ratingDistribution.find((r) => r.label === '5 ★')?.count || 0)}
                    hint="top performers"
                />
                <Stat
                    label={
                        <span className="inline-flex items-center gap-1">
                            At 1–2
                            <StarRating value={2} tone="warning" size="xs" />
                        </span>
                    }
                    value={fmtInt(
                        (ratingDistribution.find((r) => r.label === '1 ★')?.count || 0) +
                            (ratingDistribution.find((r) => r.label === '2 ★')?.count || 0)
                    )}
                    hint="needs attention"
                />
                <Stat
                    label="Unrated"
                    value={fmtInt(ratingDistribution.find((r) => r.label === 'Unrated')?.count || 0)}
                    hint="no rating recorded"
                />
            </StatGroup>
            <Panel title="Rating distribution" innerClassName="p-3">
                <CategoricalBarChart accent={accent} data={ratingDistribution} height={240} />
            </Panel>
            <Panel
                title="Operators that need attention"
                innerClassName="p-0"
                right={
                    <span className="text-[11px] text-text-tertiary">{`Showing ${lowestRatedOperators.length}`}</span>
                }
            >
                {lowestRatedOperators.length === 0 ? (
                    <div className="text-[12px] py-4 text-center text-text-tertiary">
                        No low-rated operators in scope. Roster is healthy.
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
                                        Position
                                    </th>
                                    <th className="text-left font-semibold uppercase tracking-wider text-[10px] px-2 py-2">
                                        Status
                                    </th>
                                    <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                        Rating
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {lowestRatedOperators.map((row) => (
                                    <tr key={row.id} className="border-t border-border-light">
                                        <td className="px-3 py-2 font-semibold text-text-primary">{row.name}</td>
                                        <td className="px-2 py-2 font-mono tabular-nums text-text-secondary">
                                            {row.plant}
                                        </td>
                                        <td className="px-2 py-2 text-text-secondary">{row.position}</td>
                                        <td className="px-2 py-2 text-text-secondary">{row.status}</td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="inline-flex items-center justify-end gap-1.5">
                                                <StarRating
                                                    value={row.rating}
                                                    size="sm"
                                                    tone="warning"
                                                    showValue
                                                    valueFormat="decimal"
                                                />
                                            </div>
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
