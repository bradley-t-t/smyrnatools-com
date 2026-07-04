import React from 'react'

import { fmtInt, fmtPct } from '../../../../../utils/PlanStatisticsFormatUtility'
import { Panel, Stat, StatGroup } from '../../../ui/Panel'
import { CategoricalBarChart } from '../AssetStatisticsCharts'
import { PlantScorecardTable } from '../AssetStatisticsTables'

/**
 * Plant Distribution — per-plant scorecard with totals, status split,
 * verification rate, and (when the asset type supports it) overdue service
 * and operator coverage. The chart on top gives a quick read on which
 * plants carry the heaviest share of the fleet.
 */
export function AssetStatisticsPlantDistributionPage({ accentColor, config, stats }) {
    const accent = accentColor || '#1e3a5f'
    const { perPlant, summary } = stats
    const total = summary.total
    const topPlants = perPlant.slice(0, 12).map((row) => ({ count: row.total, label: row.code }))
    const fleetSpread = perPlant.length
    const topShare = perPlant[0] && total > 0 ? (perPlant[0].total / total) * 100 : 0

    return (
        <div className="flex flex-col gap-4">
            <StatGroup columns={4}>
                <Stat label="Plants with fleet" value={fmtInt(fleetSpread)} hint="non-empty assignments" />
                <Stat
                    label="Top plant share"
                    value={fmtPct(topShare)}
                    hint={perPlant[0] ? `${perPlant[0].code} · ${fmtInt(perPlant[0].total)} assets` : '—'}
                />
                <Stat
                    label="Avg per plant"
                    value={fleetSpread > 0 ? fmtInt(Math.round(total / fleetSpread)) : '—'}
                    hint="fleet ÷ plants"
                />
                <Stat label="Shop concentration" value={fmtInt(summary.shopCount)} hint="across all plants" />
            </StatGroup>

            <Panel title="Top plants by fleet count" innerClassName="p-3">
                <CategoricalBarChart accent={accent} data={topPlants} height={240} />
            </Panel>

            <Panel
                title="Per-plant scorecard"
                innerClassName="p-0"
                right={<span className="text-[11px] text-text-tertiary">{`Showing ${perPlant.length} plants`}</span>}
            >
                <PlantScorecardTable
                    accent={accent}
                    config={config}
                    hasService={summary.hasService}
                    rows={perPlant}
                    totalFleet={total}
                />
            </Panel>
        </div>
    )
}

export default AssetStatisticsPlantDistributionPage
