import React from 'react'

import { fmtFloat, fmtInt, fmtPct } from '../../../../../utils/PlanStatisticsFormatUtility'
import StarRating from '../../../common/StarRating'
import { Panel, Stat, StatGroup } from '../../../ui/Panel'
import { CategoricalBarChart } from '../AssetStatisticsCharts'
import { AssetWatchlistTable, CleanlinessPlantList } from '../AssetStatisticsTables'

/** Inline star strip — five amber stars matching the rest of the app. */
function StarStrip({ rating }) {
    return <StarRating value={rating} tone="warning" size="sm" />
}

/**
 * Cleanliness — only mounted for asset types that record a cleanliness
 * rating (mixers, tractors, trailers, equipment). Shows the 1–5
 * distribution, the per-plant rollup, and the dirty watchlist.
 */
export function AssetStatisticsCleanlinessPage({ accentColor, onSelectAsset, stats }) {
    const accent = accentColor || '#1e3a5f'
    const { cleanlinessByPlant, cleanlinessDistribution, dirtyAssets, summary } = stats

    const distribution = cleanlinessDistribution.map((row) => ({
        count: row.count,
        label: `${row.rating}★`,
        rating: row.rating
    }))
    const dirtyRatePct = summary.total > 0 ? (summary.dirtyCount / summary.total) * 100 : 0

    return (
        <div className="flex flex-col gap-4">
            <StatGroup columns={4}>
                <Stat
                    label="Avg rating"
                    value={summary.cleanlinessAvg != null ? `${fmtFloat(summary.cleanlinessAvg)} ★` : '—'}
                    hint={`across ${fmtInt(summary.cleanlinessSamples)} rated assets`}
                />
                <Stat
                    label="Dirty assets"
                    value={fmtInt(summary.dirtyCount)}
                    hint={`${fmtPct(dirtyRatePct)} of fleet`}
                />
                <Stat
                    label="Not yet rated"
                    value={fmtInt(summary.total - summary.cleanlinessSamples)}
                    hint="no cleanliness signal"
                />
                <Stat label="Plants rated" value={fmtInt(cleanlinessByPlant.length)} hint="have at least one rating" />
            </StatGroup>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Panel title="Cleanliness distribution" innerClassName="p-3">
                    <CategoricalBarChart accent={accent} data={distribution} height={220} />
                    <div className="mt-2 text-[11px] text-text-tertiary">
                        Below 3★ counts as &quot;dirty&quot; — that&apos;s the threshold the list view uses for its
                        warning chip.
                    </div>
                </Panel>
                <Panel title="Average rating by plant" innerClassName="p-3">
                    <CleanlinessPlantList accent={accent} rows={cleanlinessByPlant} />
                </Panel>
            </div>

            <Panel
                title="Dirty fleet"
                innerClassName="p-0"
                right={<span className="text-[11px] text-text-tertiary">{`Showing ${dirtyAssets.length}`}</span>}
            >
                <AssetWatchlistTable
                    accent={accent}
                    headerLabel="Rating"
                    onSelect={onSelectAsset}
                    rows={dirtyAssets}
                    valueAccessor={(row) => row.rating}
                    valueFormatter={(value) => <StarStrip rating={value} />}
                />
            </Panel>
        </div>
    )
}

export default AssetStatisticsCleanlinessPage
