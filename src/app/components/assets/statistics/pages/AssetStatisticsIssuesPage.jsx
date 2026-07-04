import React, { useMemo } from 'react'

import { fmtInt } from '../../../../../utils/PlanStatisticsFormatUtility'
import { Panel, Stat, StatGroup } from '../../../ui/Panel'
import { AssetWatchlistTable } from '../AssetStatisticsTables'

/**
 * Issues — open issues counted per asset and rolled up per plant. Driven
 * by the `openIssuesCount` already attached to each item in
 * `useAssetData.loadDetailCounts`, so no extra fetch is needed.
 */
export function AssetStatisticsIssuesPage({ accentColor, onSelectAsset, stats }) {
    const accent = accentColor || '#1e3a5f'
    const { perPlant, summary, topIssueAssets } = stats

    const plantsWithIssues = useMemo(
        () => perPlant.filter((row) => row.openIssues > 0).sort((a, b) => b.openIssues - a.openIssues),
        [perPlant]
    )
    const avgIssuesPerAsset = summary.assetsWithOpenIssues > 0 ? summary.openIssues / summary.assetsWithOpenIssues : 0

    return (
        <div className="flex flex-col gap-4">
            <StatGroup columns={4}>
                <Stat label="Open issues" value={fmtInt(summary.openIssues)} hint="across all in-scope assets" />
                <Stat
                    label="Assets affected"
                    value={fmtInt(summary.assetsWithOpenIssues)}
                    hint={`${fmtInt(summary.total - summary.assetsWithOpenIssues)} clean`}
                />
                <Stat
                    label="Avg per affected"
                    value={avgIssuesPerAsset > 0 ? avgIssuesPerAsset.toFixed(1) : '—'}
                    hint="issues per impacted asset"
                />
                <Stat
                    label="Plants with issues"
                    value={fmtInt(plantsWithIssues.length)}
                    hint={`${fmtInt(perPlant.length)} total in scope`}
                />
            </StatGroup>

            <Panel
                title="Assets with the most open issues"
                innerClassName="p-0"
                right={<span className="text-[11px] text-text-tertiary">{`Showing ${topIssueAssets.length}`}</span>}
            >
                <AssetWatchlistTable
                    accent={accent}
                    headerLabel="Open issues"
                    onSelect={onSelectAsset}
                    rows={topIssueAssets}
                    valueAccessor={(row) => row.openIssues}
                    valueFormatter={(value) => fmtInt(value)}
                />
            </Panel>

            <Panel
                title="Issues by plant"
                innerClassName="p-0"
                right={<span className="text-[11px] text-text-tertiary">{`Showing ${plantsWithIssues.length}`}</span>}
            >
                {plantsWithIssues.length === 0 ? (
                    <div className="text-[12px] py-4 text-center text-text-tertiary">
                        No open issues on any plant in scope.
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
                                        Open issues
                                    </th>
                                    <th className="text-right font-semibold uppercase tracking-wider text-[10px] px-3 py-2">
                                        Fleet
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {plantsWithIssues.map((row) => (
                                    <tr key={row.code} className="border-t border-border-light">
                                        <td className="px-3 py-2">
                                            <span className="font-mono tabular-nums font-semibold text-text-primary">
                                                {row.code}
                                            </span>
                                            {row.name !== row.code && (
                                                <span className="ml-2 text-text-secondary">{row.name}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-text-primary">
                                            {fmtInt(row.openIssues)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">
                                            {fmtInt(row.total)}
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

export default AssetStatisticsIssuesPage
