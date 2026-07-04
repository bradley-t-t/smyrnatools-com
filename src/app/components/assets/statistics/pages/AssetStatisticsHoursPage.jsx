/* eslint-disable react/forbid-dom-props */
import React from 'react'

import { fmtFloat, fmtInt } from '../../../../../utils/PlanStatisticsFormatUtility'
import { Panel, Stat, StatGroup } from '../../../ui/Panel'
import { CategoricalBarChart } from '../AssetStatisticsCharts'
import { AssetWatchlistTable } from '../AssetStatisticsTables'

/** Per-plant hours leaderboard — bar gauges scaled against the highest-avg
 *  plant so the visual ordering matches the underlying numbers. */
function HoursPlantList({ accent, rows }) {
    if (!rows.length) {
        return (
            <div className="text-[12px] py-4 text-center text-text-tertiary">No hours recorded against any plant.</div>
        )
    }
    const max = rows[0]?.avg || 0
    return (
        <div className="flex flex-col gap-1.5">
            {rows.map((row) => {
                const pct = max > 0 ? (row.avg / max) * 100 : 0
                return (
                    <div key={row.code} className="flex items-center gap-2 text-[12px]">
                        <span className="font-mono tabular-nums w-12 shrink-0 text-text-primary">{row.code}</span>
                        <span className="flex-1 min-w-0 truncate text-text-secondary">{row.name}</span>
                        <div className="h-4 rounded-sm overflow-hidden relative shrink-0 bg-bg-tertiary w-28">
                            <div className="h-full" style={{ background: accent, width: `${pct}%` }} />
                        </div>
                        <span className="font-mono tabular-nums font-semibold w-20 text-right shrink-0 text-text-primary">
                            {fmtInt(Math.round(row.avg))}h
                        </span>
                        <span className="font-mono tabular-nums w-16 text-right shrink-0 text-text-tertiary">
                            {row.samples} rec
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

/**
 * Hours & Utilization — only mounted for asset types that track hours
 * (mixers, tractors, equipment). The page answers two adjacent questions:
 * "how heavily is the fleet running?" (totals + distribution + per-plant)
 * and "which assets are the highest-wear?" (top-by-hours + hours-per-year
 * leaderboard).
 *
 * Replacement decisions usually weight hours-per-year (utilization rate)
 * over raw hours — a 4-year-old asset with 12k hours has worked twice as
 * hard as a 10-year-old one with the same number — so both surfaces are
 * shown side by side.
 */
export function AssetStatisticsHoursPage({ accentColor, onSelectAsset, stats }) {
    const accent = accentColor || '#1e3a5f'
    const { hoursStats } = stats
    const {
        avgHours,
        avgHoursPerYear,
        hoursByPlant,
        hoursDistribution,
        hoursPerYearTopList,
        hoursRecorded,
        hoursTotal,
        hoursUnrecorded,
        medianHours,
        topByHours
    } = hoursStats

    if (hoursRecorded === 0) {
        return (
            <div className="flex flex-col gap-4">
                <StatGroup columns={4}>
                    <Stat label="Hours recorded" value="0" hint="no hours data yet" />
                    <Stat label="Avg hours" value="—" hint="—" />
                    <Stat label="Median hours" value="—" hint="—" />
                    <Stat label="Missing data" value={fmtInt(hoursUnrecorded)} hint="assets with no hours" />
                </StatGroup>
                <Panel title="No hours data in scope" innerClassName="p-6">
                    <div className="flex items-center justify-center gap-2 py-4 text-[12.5px] text-text-secondary">
                        <i className="fas fa-circle-info text-[18px]" />
                        Add hours readings on individual asset detail views to start populating this page.
                    </div>
                </Panel>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <StatGroup columns={4}>
                <Stat
                    label="Fleet hours"
                    value={fmtInt(Math.round(hoursTotal))}
                    hint={`${fmtInt(hoursRecorded)} assets reporting`}
                />
                <Stat
                    label="Avg hours"
                    value={avgHours != null ? `${fmtInt(Math.round(avgHours))}h` : '—'}
                    hint={medianHours != null ? `median ${fmtInt(Math.round(medianHours))}h` : 'no median'}
                />
                <Stat
                    label="Avg / year"
                    value={avgHoursPerYear != null ? `${fmtInt(Math.round(avgHoursPerYear))}h` : '—'}
                    hint="hours ÷ age, recorded"
                />
                <Stat label="Missing data" value={fmtInt(hoursUnrecorded)} hint="assets with no hours" />
            </StatGroup>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Panel title="Hours distribution" innerClassName="p-3">
                    <CategoricalBarChart accent={accent} data={hoursDistribution} height={220} />
                    <div className="mt-2 text-[11px] text-text-tertiary">
                        Buckets are intentionally narrow at the front (catches new arrivals or stale telemetry) and
                        wider at the tail (where replacement candidates live).
                    </div>
                </Panel>
                <Panel title="Average hours by plant" innerClassName="p-3">
                    <HoursPlantList accent={accent} rows={hoursByPlant} />
                </Panel>
            </div>

            <Panel
                title="Highest-hour assets"
                innerClassName="p-0"
                right={<span className="text-[11px] text-text-tertiary">{`Top ${topByHours.length}`}</span>}
            >
                <AssetWatchlistTable
                    accent={accent}
                    headerLabel="Hours"
                    onSelect={onSelectAsset}
                    rows={topByHours}
                    valueAccessor={(row) => row.hours}
                    valueFormatter={(value, row) =>
                        row.age != null
                            ? `${fmtInt(Math.round(value))}h · ${row.age}yr`
                            : `${fmtInt(Math.round(value))}h`
                    }
                />
            </Panel>

            <Panel
                title="Hardest-working fleet (hours per year)"
                innerClassName="p-0"
                right={<span className="text-[11px] text-text-tertiary">{`Top ${hoursPerYearTopList.length}`}</span>}
            >
                <AssetWatchlistTable
                    accent={accent}
                    headerLabel="Hrs / yr"
                    onSelect={onSelectAsset}
                    rows={hoursPerYearTopList}
                    valueAccessor={(row) => row.hoursPerYear}
                    valueFormatter={(value, row) =>
                        `${fmtFloat(value, 0)}h/yr · ${fmtInt(Math.round(row.hours))}h total`
                    }
                />
            </Panel>
        </div>
    )
}

export default AssetStatisticsHoursPage
