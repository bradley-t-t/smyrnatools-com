import React from 'react'

import { fmtInt } from '../../../../../utils/PlanStatisticsFormatUtility'
import { Panel, Stat, StatGroup } from '../../../ui/Panel'
import { CategoricalBarChart, StatusPieChart } from '../AssetStatisticsCharts'
import { AssetWatchlistTable } from '../AssetStatisticsTables'

/**
 * Fleet Status — status mix + tenure histogram + "stuck" watchlist. The mix
 * splits In-Shop into its sub-statuses (Down In Yard, Waiting For Shop,
 * etc.) so the operations team sees exactly where shop time is spent.
 */
export function AssetStatisticsFleetStatusPage({ accentColor, onSelectAsset, stats }) {
    const accent = accentColor || '#1e3a5f'
    const { longestInStatus, statusDistribution, summary, tenureBuckets } = stats

    return (
        <div className="flex flex-col gap-4">
            <StatGroup columns={4}>
                <Stat label="Active" value={fmtInt(summary.activeCount)} hint="ready to roll" />
                <Stat label="Spare" value={fmtInt(summary.spareCount)} hint="parked + available" />
                <Stat label="In Shop" value={fmtInt(summary.shopCount)} hint="not in production" />
                <Stat label="Retired" value={fmtInt(summary.retiredCount)} hint="out of fleet" />
            </StatGroup>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Panel title="Status mix" innerClassName="p-3">
                    <StatusPieChart data={statusDistribution} />
                </Panel>
                <Panel title="Days in current status" innerClassName="p-3">
                    <CategoricalBarChart accent={accent} data={tenureBuckets} />
                    <div className="mt-2 text-[11px] text-text-tertiary">
                        Tenure measured from <span className="font-semibold">statusChangedAt</span> (falls back to
                        createdAt). Useful for spotting shop tails or spares that have been parked too long.
                    </div>
                </Panel>
            </div>

            <Panel
                title="Longest in current status"
                innerClassName="p-0"
                right={
                    <span className="text-[11px] text-text-tertiary">{`Showing ${longestInStatus.length} assets`}</span>
                }
            >
                <AssetWatchlistTable
                    accent={accent}
                    headerLabel="Days in status"
                    onSelect={onSelectAsset}
                    rows={longestInStatus}
                    valueAccessor={(row) => row.days}
                    valueFormatter={(value) => `${fmtInt(value)}d`}
                />
            </Panel>
        </div>
    )
}

export default AssetStatisticsFleetStatusPage
